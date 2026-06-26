-- Migration: Auto-fill user_id on INSERT via BEFORE trigger.
-- This avoids requiring the application to explicitly send user_id on every insert.
-- The trigger reads auth.uid() from the current Supabase session context.
--
-- Note: Function is placed in the 'private' schema to prevent exposure
-- via the Supabase Data API (REST). SECURITY DEFINER functions must never
-- live in an exposed schema (public).

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set user_id if not already provided by the caller
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Fail loudly if user is not authenticated (prevents orphaned rows)
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null: no authenticated user found in session context';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to all root tables
CREATE TRIGGER trg_set_user_id_cash_flow
  BEFORE INSERT ON public.cash_flow
  FOR EACH ROW EXECUTE FUNCTION private.set_user_id();

CREATE TRIGGER trg_set_user_id_bank_statements
  BEFORE INSERT ON public.bank_statements
  FOR EACH ROW EXECUTE FUNCTION private.set_user_id();

CREATE TRIGGER trg_set_user_id_receipts
  BEFORE INSERT ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION private.set_user_id();
