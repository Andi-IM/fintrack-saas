-- Migration: Backfill user_id for all existing rows.
-- This is safe for a single-user application: the single authorized user
-- in auth.users is assigned as the owner of all existing data.
--
-- IMPORTANT: This migration temporarily disables the auto_fill trigger
-- (Migration 3) since auth.uid() is not available during raw SQL migration
-- execution. The backfill sets user_id directly from auth.users.
--
-- Run this AFTER migration 20260627000002 (enforce_user_rls_policies)
-- and BEFORE making user_id NOT NULL.

DO $$
DECLARE
  v_user_id UUID;
  v_cash_flow_count INTEGER;
  v_statements_count INTEGER;
  v_receipts_count INTEGER;
BEGIN
  -- Retrieve the single authorized user from auth.users
  -- This app enforces a single authorized email via AUTHORIZED_EMAIL env var.
  SELECT id INTO v_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Backfill aborted: no user found in auth.users. '
      'Ensure the authorized user has logged in at least once before running this migration.';
  END IF;

  RAISE NOTICE 'Backfilling with user_id: %', v_user_id;

  -- Backfill cash_flow
  UPDATE public.cash_flow
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  GET DIAGNOSTICS v_cash_flow_count = ROW_COUNT;

  -- Backfill bank_statements
  UPDATE public.bank_statements
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  GET DIAGNOSTICS v_statements_count = ROW_COUNT;

  -- Backfill receipts
  UPDATE public.receipts
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  GET DIAGNOSTICS v_receipts_count = ROW_COUNT;

  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  cash_flow rows updated: %', v_cash_flow_count;
  RAISE NOTICE '  bank_statements rows updated: %', v_statements_count;
  RAISE NOTICE '  receipts rows updated: %', v_receipts_count;
END;
$$;

-- After backfill, enforce NOT NULL to prevent future orphaned rows
ALTER TABLE public.cash_flow ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.bank_statements ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN user_id SET NOT NULL;
