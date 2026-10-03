-- ==============================================================================
-- Migration: 20261003100000_fix_mcp_statement_sync_and_cash_flow_rpc.sql
-- Description:
--   1. Fix bank statement sync trigger under service_role:
--      Retrieve user_id from parent bank_statements and explicitly pass it
--      to cash_flow INSERT, preventing 'user_id cannot be null' trigger errors
--      when auth.uid() is null (e.g. service_role / background jobs).
--   2. Add public.get_cash_flow_summary() RPC:
--      Database-level aggregation returning total_income, total_expense,
--      net_balance, and transaction_count without row transfer or PostgREST 1000-row limits.
--   3. Add public.get_financial_analytics() RPC:
--      Database-level aggregation returning financial totals along with
--      category and payment method breakdowns.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fix private.sync_bank_statement_item_to_cash_flow()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.sync_bank_statement_item_to_cash_flow()
RETURNS TRIGGER AS $$
DECLARE
  v_bank_name TEXT;
  v_user_id UUID;
  v_cash_flow_id UUID;
  v_income NUMERIC;
  v_expense NUMERIC;
BEGIN
  -- Retrieve parent bank statement info (both bank_name and owning user_id)
  SELECT bank_name, user_id
  INTO v_bank_name, v_user_id
  FROM public.bank_statements
  WHERE id = COALESCE(NEW.statement_id, OLD.statement_id);

  -- Fallback to session auth.uid() if user_id was not on bank_statement
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot sync statement item to cash flow: user_id is missing from parent bank_statement and no auth context';
    END IF;

    IF NEW.type = 'income' THEN
      v_income := NEW.amount;
      v_expense := 0;
    ELSE
      v_income := 0;
      v_expense := NEW.amount;
    END IF;

    -- Explicitly pass user_id so private.set_user_id() trigger does not fail
    -- when called from service_role where auth.uid() is null.
    INSERT INTO public.cash_flow (
      user_id,
      date,
      income,
      expense,
      main_category,
      sub_category,
      description,
      payment_method,
      source_item_id
    ) VALUES (
      v_user_id,
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

-- ------------------------------------------------------------------------------
-- 2. Add public.get_cash_flow_summary() RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cash_flow_summary(
  p_user_id UUID,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expense NUMERIC,
  net_balance NUMERIC,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_uid UUID;
BEGIN
  -- Security check: service_role can query any user; authenticated can only query self
  SELECT auth.role(), auth.uid() INTO v_caller_role, v_caller_uid;
  IF v_caller_role IS DISTINCT FROM 'service_role' AND (v_caller_uid IS NULL OR v_caller_uid <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied: cannot access cash flow data for another user';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(cf.income), 0)::NUMERIC AS total_income,
    COALESCE(SUM(cf.expense), 0)::NUMERIC AS total_expense,
    (COALESCE(SUM(cf.income), 0) - COALESCE(SUM(cf.expense), 0))::NUMERIC AS net_balance,
    COUNT(*)::BIGINT AS transaction_count
  FROM public.cash_flow cf
  WHERE cf.user_id = p_user_id
    AND (
      p_date_from IS NULL
      OR (CASE WHEN p_date_from ~ 'T' THEN cf.date >= p_date_from::TIMESTAMPTZ ELSE cf.date >= p_date_from::DATE END)
    )
    AND (
      p_date_to IS NULL
      OR (CASE WHEN p_date_to ~ 'T' THEN cf.date <= p_date_to::TIMESTAMPTZ ELSE cf.date < (p_date_to::DATE + INTERVAL '1 day') END)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Add public.get_financial_analytics() RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_financial_analytics(
  p_user_id UUID,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_uid UUID;
  v_result JSONB;
BEGIN
  -- Security check: service_role can query any user; authenticated can only query self
  SELECT auth.role(), auth.uid() INTO v_caller_role, v_caller_uid;
  IF v_caller_role IS DISTINCT FROM 'service_role' AND (v_caller_uid IS NULL OR v_caller_uid <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied: cannot access financial analytics for another user';
  END IF;

  WITH filtered AS (
    SELECT
      cf.income,
      cf.expense,
      COALESCE(NULLIF(cf.main_category, ''), 'Uncategorized') AS category,
      COALESCE(NULLIF(cf.payment_method, ''), 'Unknown') AS payment_method
    FROM public.cash_flow cf
    WHERE cf.user_id = p_user_id
      AND (
        p_date_from IS NULL
        OR (CASE WHEN p_date_from ~ 'T' THEN cf.date >= p_date_from::TIMESTAMPTZ ELSE cf.date >= p_date_from::DATE END)
      )
      AND (
        p_date_to IS NULL
        OR (CASE WHEN p_date_to ~ 'T' THEN cf.date <= p_date_to::TIMESTAMPTZ ELSE cf.date < (p_date_to::DATE + INTERVAL '1 day') END)
      )
  ),
  totals AS (
    SELECT
      COALESCE(SUM(income), 0)::NUMERIC AS total_income,
      COALESCE(SUM(expense), 0)::NUMERIC AS total_expense,
      COUNT(*)::BIGINT AS transaction_count
    FROM filtered
  ),
  cat_agg AS (
    SELECT
      category,
      SUM(income)::NUMERIC AS inc,
      SUM(expense)::NUMERIC AS exp
    FROM filtered
    GROUP BY category
  ),
  pm_agg AS (
    SELECT
      payment_method,
      SUM(income + expense)::NUMERIC AS total_vol
    FROM filtered
    GROUP BY payment_method
  )
  SELECT jsonb_build_object(
    'total_income', (SELECT total_income FROM totals),
    'total_expense', (SELECT total_expense FROM totals),
    'net_savings', (SELECT total_income - total_expense FROM totals),
    'transaction_count', (SELECT transaction_count FROM totals),
    'category_breakdown', COALESCE((
      SELECT jsonb_object_agg(category, jsonb_build_object('income', inc, 'expense', exp))
      FROM cat_agg
    ), '{}'::JSONB),
    'payment_method_breakdown', COALESCE((
      SELECT jsonb_object_agg(payment_method, total_vol)
      FROM pm_agg
    ), '{}'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_cash_flow_summary(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_analytics(UUID, TEXT, TEXT) TO authenticated, service_role;
