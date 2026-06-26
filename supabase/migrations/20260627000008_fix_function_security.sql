-- Fix 1: Set fixed search_path on SECURITY DEFINER functions.
-- Without a fixed search_path, a superuser or privileged role could manipulate
-- the search_path to redirect function calls to malicious objects.
-- Setting search_path = '' forces all object references to be fully-qualified.

-- Fix private.set_user_id
CREATE OR REPLACE FUNCTION private.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null: no authenticated user found in session context';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- Fix private.sync_bank_statement_item_to_cash_flow
CREATE OR REPLACE FUNCTION private.sync_bank_statement_item_to_cash_flow()
RETURNS TRIGGER AS $$
DECLARE
  v_bank_name TEXT;
  v_cash_flow_id UUID;
  v_income NUMERIC;
  v_expense NUMERIC;
BEGIN
  SELECT bank_name INTO v_bank_name
  FROM public.bank_statements
  WHERE id = COALESCE(NEW.statement_id, OLD.statement_id);

  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      v_income := NEW.amount;
      v_expense := 0;
    ELSE
      v_income := 0;
      v_expense := NEW.amount;
    END IF;

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

    NEW.cash_flow_id := v_cash_flow_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.date IS DISTINCT FROM NEW.date OR
        OLD.amount IS DISTINCT FROM NEW.amount OR
        OLD.type IS DISTINCT FROM NEW.type OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.category IS DISTINCT FROM NEW.category) THEN

      IF NEW.type = 'income' THEN
        v_income := NEW.amount;
        v_expense := 0;
      ELSE
        v_income := 0;
        v_expense := NEW.amount;
      END IF;

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
    IF OLD.cash_flow_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.cash_flow
        WHERE id = OLD.cash_flow_id AND receipt_id IS NOT NULL
      ) THEN
        UPDATE public.cash_flow
        SET source_item_id = NULL
        WHERE id = OLD.cash_flow_id;
      ELSE
        DELETE FROM public.cash_flow WHERE id = OLD.cash_flow_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- =============================================
-- Fix 2: Revoke public execute access from rls_auto_enable().
-- This function exists in the public schema with SECURITY DEFINER,
-- making it callable by anon/authenticated roles via PostgREST RPC.
-- Since this function is an internal utility (not a public API),
-- we revoke execute from public roles.
-- =============================================
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
