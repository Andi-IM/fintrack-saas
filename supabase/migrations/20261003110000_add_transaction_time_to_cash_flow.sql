-- ==============================================================================
-- Migration: 20261003110000_add_transaction_time_to_cash_flow.sql
-- Description:
--   1. Drop dependent view dashboard_cash_flow_entries so column type can be altered.
--   2. Alter public.cash_flow.date type to TIMESTAMPTZ.
--   3. Recreate dashboard_cash_flow_entries view with security_invoker = true.
--   4. Add transaction_time TIMESTAMPTZ column to preserve full time precision
--      (hours, minutes, seconds) for transactions instead of midnight truncation.
--   5. Bidirectionally synchronize date and transaction_time via trigger so
--      both existing frontend code and new MCP tooling work seamlessly.
--   6. Validate transaction_time <= now() + 1 day via trigger.
--   7. Backfill existing rows having midnight times using created_at.
--   8. Create composite index on (user_id, transaction_time DESC).
-- ==============================================================================

-- 1. Temporarily drop dependent view so column type can be altered
DROP VIEW IF EXISTS public.dashboard_cash_flow_entries;

-- 2. Alter column type to TIMESTAMPTZ
ALTER TABLE public.cash_flow
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date::TIMESTAMPTZ;

-- 3. Recreate the dashboard view with security_invoker
CREATE OR REPLACE VIEW public.dashboard_cash_flow_entries
WITH (security_invoker = true)
AS
SELECT
  id,
  date,
  main_category,
  description,
  income,
  expense,
  payment_method
FROM public.cash_flow;

REVOKE ALL ON public.dashboard_cash_flow_entries FROM anon;
REVOKE ALL ON public.dashboard_cash_flow_entries FROM authenticated;
GRANT SELECT ON public.dashboard_cash_flow_entries TO authenticated, service_role;

-- 4. Add transaction_time column
ALTER TABLE public.cash_flow
  ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMPTZ;

-- 5. Backfill transaction_time from date initially
UPDATE public.cash_flow
SET transaction_time = date
WHERE transaction_time IS NULL;

-- 6. Backfill existing midnight transactions from created_at
-- If date was truncated to 00:00:00 UTC or 00:00:00 / 07:00:00 WIB, restore time from created_at
UPDATE public.cash_flow
SET
  transaction_time = created_at,
  date = created_at
WHERE
  created_at IS NOT NULL
  AND (
    (date AT TIME ZONE 'UTC')::time = '00:00:00'
    OR (date AT TIME ZONE 'Asia/Jakarta')::time = '00:00:00'
    OR (date AT TIME ZONE 'Asia/Jakarta')::time = '07:00:00'
  );

-- 7. Create trigger function to synchronize transaction_time & date and validate future dates
CREATE OR REPLACE FUNCTION private.sync_cash_flow_transaction_time()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Synchronize transaction_time and date bidirectionally
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_time IS NOT NULL AND NEW.date IS NULL THEN
      NEW.date := NEW.transaction_time;
    ELSIF NEW.date IS NOT NULL AND NEW.transaction_time IS NULL THEN
      NEW.transaction_time := NEW.date;
    ELSIF NEW.transaction_time IS NOT NULL AND NEW.date IS NOT NULL THEN
      -- Both provided: prefer exact transaction_time if date has midnight/date-only truncation
      IF ((NEW.date AT TIME ZONE 'UTC')::time = '00:00:00' OR NEW.date::date = NEW.transaction_time::date) THEN
        NEW.date := NEW.transaction_time;
      ELSE
        NEW.transaction_time := NEW.date;
      END IF;
    ELSE
      NEW.transaction_time := now();
      NEW.date := NEW.transaction_time;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.transaction_time IS DISTINCT FROM OLD.transaction_time AND NEW.date IS NOT DISTINCT FROM OLD.date THEN
      NEW.date := NEW.transaction_time;
    ELSIF NEW.date IS DISTINCT FROM OLD.date AND NEW.transaction_time IS NOT DISTINCT FROM OLD.transaction_time THEN
      NEW.transaction_time := NEW.date;
    ELSIF NEW.transaction_time IS DISTINCT FROM OLD.transaction_time AND NEW.date IS DISTINCT FROM OLD.date THEN
      NEW.date := NEW.transaction_time;
    END IF;
  END IF;

  -- 2. Validate transaction_time cannot be more than 1 day in the future
  IF NEW.transaction_time > (now() + INTERVAL '1 day') THEN
    RAISE EXCEPTION 'transaction_time cannot be more than 1 day in the future: %', NEW.transaction_time;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cash_flow_transaction_time ON public.cash_flow;
CREATE TRIGGER trg_sync_cash_flow_transaction_time
  BEFORE INSERT OR UPDATE ON public.cash_flow
  FOR EACH ROW EXECUTE FUNCTION private.sync_cash_flow_transaction_time();

-- 8. Add performance index on (user_id, transaction_time DESC)
CREATE INDEX IF NOT EXISTS idx_cash_flow_user_transaction_time
  ON public.cash_flow(user_id, transaction_time DESC);
