-- ==============================================================================
-- Migration: 20261003120000_add_create_bank_statement_rpc.sql
-- Description:
--   Add public.create_bank_statement_with_items() RPC function to allow
--   transactional creation of a bank statement header together with its mutation
--   line items, returning the statement_id and all items with their auto-generated
--   cash_flow_id values.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_bank_statement_with_items(
  p_user_id uuid,
  p_bank_name text,
  p_statement_period date,
  p_opening_balance numeric DEFAULT 0,
  p_closing_balance numeric DEFAULT 0,
  p_total_items int DEFAULT NULL,
  p_file_path text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role text;
  v_caller_uid uuid;
  v_stmt_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_cash_flow_id uuid;
  v_items_array jsonb := '[]'::jsonb;
  v_total int;
  v_file_path text;
BEGIN
  -- Security check: service_role can create for any user, authenticated only for self
  SELECT auth.role(), auth.uid() INTO v_caller_role, v_caller_uid;
  IF v_caller_role IS DISTINCT FROM 'service_role' AND (v_caller_uid IS NULL OR v_caller_uid <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied: cannot create bank statement for another user';
  END IF;

  v_total := COALESCE(p_total_items, jsonb_array_length(COALESCE(p_items, '[]'::jsonb)));
  v_file_path := COALESCE(
    p_file_path,
    'statements/' || p_user_id || '/' || lower(regexp_replace(p_bank_name, '[^a-zA-Z0-9]+', '-', 'g')) || '_' || p_statement_period::text || '.pdf'
  );

  -- 1. Insert parent bank statement
  INSERT INTO public.bank_statements (
    user_id,
    bank_name,
    statement_period,
    opening_balance,
    closing_balance,
    file_path,
    total_items
  ) VALUES (
    p_user_id,
    p_bank_name,
    p_statement_period,
    COALESCE(p_opening_balance, 0),
    COALESCE(p_closing_balance, 0),
    v_file_path,
    v_total
  ) RETURNING id INTO v_stmt_id;

  -- 2. Insert statement items
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.bank_statement_items (
        statement_id,
        date,
        description,
        amount,
        type,
        category,
        metadata,
        balance
      ) VALUES (
        v_stmt_id,
        COALESCE((v_item->>'date')::timestamptz, now()),
        COALESCE(v_item->>'description', 'Transaksi'),
        COALESCE((v_item->>'amount')::numeric, 0),
        CASE
          WHEN (v_item->>'type') IN ('income', 'CR') THEN 'income'
          ELSE 'expense'
        END,
        COALESCE(
          v_item->>'category',
          CASE WHEN (v_item->>'type') IN ('income', 'CR') THEN 'Pendapatan (Income)' ELSE 'Kebutuhan (Needs)' END
        ),
        CASE
          WHEN v_item ? 'metadata' AND jsonb_typeof(v_item->'metadata') = 'object' THEN v_item->'metadata'
          ELSE NULL
        END,
        CASE
          WHEN v_item ? 'balance' AND (v_item->>'balance') IS NOT NULL THEN (v_item->>'balance')::numeric
          ELSE NULL
        END
      ) RETURNING id, cash_flow_id INTO v_item_id, v_cash_flow_id;

      v_items_array := v_items_array || jsonb_build_object(
        'id', v_item_id,
        'statement_id', v_stmt_id,
        'date', (v_item->>'date'),
        'description', (v_item->>'description'),
        'amount', COALESCE((v_item->>'amount')::numeric, 0),
        'type', CASE WHEN (v_item->>'type') IN ('income', 'CR') THEN 'income' ELSE 'expense' END,
        'category', (v_item->>'category'),
        'balance', CASE WHEN v_item ? 'balance' AND (v_item->>'balance') IS NOT NULL THEN (v_item->>'balance')::numeric ELSE NULL END,
        'cash_flow_id', v_cash_flow_id
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'statement_id', v_stmt_id,
    'total_items', jsonb_array_length(v_items_array),
    'items', v_items_array
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_bank_statement_with_items(uuid, text, date, numeric, numeric, int, text, jsonb) TO authenticated, service_role;
