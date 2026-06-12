-- Sync bank_statement_items to cash_flow automatically

-- 1. Create trigger function to handle sync
CREATE OR REPLACE FUNCTION public.sync_bank_statement_item_to_cash_flow()
RETURNS TRIGGER AS $$
DECLARE
  v_bank_name TEXT;
  v_cash_flow_id UUID;
  v_income NUMERIC;
  v_expense NUMERIC;
BEGIN
  -- Get the bank name from the parent statement
  SELECT bank_name INTO v_bank_name
  FROM public.bank_statements
  WHERE id = COALESCE(NEW.statement_id, OLD.statement_id);

  IF TG_OP = 'INSERT' THEN
    -- Calculate income and expense
    IF NEW.type = 'income' THEN
      v_income := NEW.amount;
      v_expense := 0;
    ELSE
      v_income := 0;
      v_expense := NEW.amount;
    END IF;

    -- Insert into cash_flow
    INSERT INTO public.cash_flow (
      date,
      income,
      expense,
      main_category,
      sub_category,
      description,
      payment_method,
      source_item_id
    ) VALUES (
      COALESCE(NEW.date::TIMESTAMPTZ, now()),
      v_income,
      v_expense,
      CASE WHEN NEW.type = 'income' THEN 'Pendapatan (Income)' ELSE 'Kebutuhan (Needs)' END,
      COALESCE(NEW.category, 'Lainnya'),
      NEW.description,
      COALESCE(v_bank_name, 'Bank'),
      NEW.id
    ) RETURNING id INTO v_cash_flow_id;

    -- Update the bank_statement_item with the cash_flow_id
    NEW.cash_flow_id := v_cash_flow_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only update if relevant fields changed to prevent infinite loops
    IF (OLD.date IS DISTINCT FROM NEW.date OR
        OLD.amount IS DISTINCT FROM NEW.amount OR
        OLD.type IS DISTINCT FROM NEW.type OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.category IS DISTINCT FROM NEW.category) THEN

      -- Calculate income and expense
      IF NEW.type = 'income' THEN
        v_income := NEW.amount;
        v_expense := 0;
      ELSE
        v_income := 0;
        v_expense := NEW.amount;
      END IF;

      -- Update the linked cash_flow row
      UPDATE public.cash_flow
      SET
        date = COALESCE(NEW.date::TIMESTAMPTZ, now()),
        income = v_income,
        expense = v_expense,
        description = NEW.description,
        sub_category = COALESCE(NEW.category, 'Lainnya'),
        payment_method = COALESCE(v_bank_name, 'Bank')
      WHERE id = NEW.cash_flow_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- If there's a linked cash_flow
    IF OLD.cash_flow_id IS NOT NULL THEN
      -- If the cash flow is also linked to a receipt, we keep it but unlink it from the bank statement item
      IF EXISTS (SELECT 1 FROM public.cash_flow WHERE id = OLD.cash_flow_id AND receipt_id IS NOT NULL) THEN
        UPDATE public.cash_flow
        SET source_item_id = NULL
        WHERE id = OLD.cash_flow_id;
      ELSE
        -- Otherwise, delete the cash flow
        DELETE FROM public.cash_flow WHERE id = OLD.cash_flow_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create triggers
DROP TRIGGER IF EXISTS trg_sync_bank_statement_item_insert ON public.bank_statement_items;
CREATE TRIGGER trg_sync_bank_statement_item_insert
BEFORE INSERT ON public.bank_statement_items
FOR EACH ROW EXECUTE FUNCTION public.sync_bank_statement_item_to_cash_flow();

DROP TRIGGER IF EXISTS trg_sync_bank_statement_item_update ON public.bank_statement_items;
CREATE TRIGGER trg_sync_bank_statement_item_update
BEFORE UPDATE ON public.bank_statement_items
FOR EACH ROW EXECUTE FUNCTION public.sync_bank_statement_item_to_cash_flow();

DROP TRIGGER IF EXISTS trg_sync_bank_statement_item_delete ON public.bank_statement_items;
CREATE TRIGGER trg_sync_bank_statement_item_delete
AFTER DELETE ON public.bank_statement_items
FOR EACH ROW EXECUTE FUNCTION public.sync_bank_statement_item_to_cash_flow();

-- 3. Populate existing unreconciled bank statement items (One-time sync)
DO $$
DECLARE
  r RECORD;
  v_bank_name TEXT;
  v_cash_flow_id UUID;
  v_income NUMERIC;
  v_expense NUMERIC;
BEGIN
  -- Disable the insert trigger temporarily so we don't trigger recursion during manual sync
  ALTER TABLE public.bank_statement_items DISABLE TRIGGER trg_sync_bank_statement_item_insert;

  FOR r IN 
    SELECT id, statement_id, date, description, amount, type, category 
    FROM public.bank_statement_items 
    WHERE cash_flow_id IS NULL
  LOOP
    -- Get bank name
    SELECT bank_name INTO v_bank_name
    FROM public.bank_statements
    WHERE id = r.statement_id;

    -- Calculate income and expense
    IF r.type = 'income' THEN
      v_income := r.amount;
      v_expense := 0;
    ELSE
      v_income := 0;
      v_expense := r.amount;
    END IF;

    -- Insert into cash_flow
    INSERT INTO public.cash_flow (
      date,
      income,
      expense,
      main_category,
      sub_category,
      description,
      payment_method,
      source_item_id
    ) VALUES (
      COALESCE(r.date::TIMESTAMPTZ, now()),
      v_income,
      v_expense,
      CASE WHEN r.type = 'income' THEN 'Pendapatan (Income)' ELSE 'Kebutuhan (Needs)' END,
      COALESCE(r.category, 'Lainnya'),
      r.description,
      COALESCE(v_bank_name, 'Bank'),
      r.id
    ) RETURNING id INTO v_cash_flow_id;

    -- Link back to bank_statement_item
    UPDATE public.bank_statement_items
    SET cash_flow_id = v_cash_flow_id
    WHERE id = r.id;
  END LOOP;

  -- Re-enable the trigger
  ALTER TABLE public.bank_statement_items ENABLE TRIGGER trg_sync_bank_statement_item_insert;
END;
$$;
