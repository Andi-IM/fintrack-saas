-- ==============================================================================
-- Migration: 20261003110000_add_transaction_time_to_cash_flow.sql
-- Description:
--   1. Ensure public.cash_flow.date is TIMESTAMPTZ.
--   2. Add transaction_time TIMESTAMPTZ column to preserve full time precision
--      (hours, minutes, seconds) for transactions instead of midnight truncation.
--   3. Bidirectionally synchronize date and transaction_time via trigger so
--      both existing frontend code and new MCP tooling work seamlessly.
--   4. Validate transaction_time <= now() + 1 day via trigger.
--   5. Backfill existing rows having midnight times using created_at.
--   6. Create composite index on (user_id, transaction_time DESC).
-- ==============================================================================

-- 1. Ensure date is TIMESTAMPTZ
ALTER TABLE public.cash_flow
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date::TIMESTAMPTZ;

-- 2. Add transaction_time column with default now()
ALTER TABLE public.cash_flow
  ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMPTZ DEFAULT now();

-- 3. Backfill transaction_time from date initially
UPDATE public.cash_flow
SET transaction_time = date
WHERE transaction_time IS NULL;

-- 4. Backfill existing midnight transactions from created_at
-- If date was truncated to 00:00:00 UTC or 00:00:00 / 07:00:00 WIB, restore time from created_at
UPDATE public.cash_flow
SET
  transaction_time = created_at,
  date = created_at
WHERE
  created_at IS NOT NULL
  AND (
    date::time = '00:00:00'
    OR (date AT TIME ZONE 'Asia/Jakarta')::time = '00:00:00'
    OR (date AT TIME ZONE 'Asia/Jakarta')::time = '07:00:00'
  );

-- 5. Create trigger function to synchronize transaction_time & date and validate future dates
CREATE OR REPLACE FUNCTION private.sync_cash_flow_transaction_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate transaction_time cannot be more than 1 day in the future
  IF NEW.transaction_time > (now() + INTERVAL '1 day') THEN
    RAISE EXCEPTION 'transaction_time cannot be more than 1 day in the future: %', NEW.transaction_time;
  END IF;

  -- Bidirectional synchronization
  IF NEW.transaction_time IS NOT NULL AND (NEW.date IS NULL OR NEW.transaction_time IS DISTINCT FROM OLD.transaction_time) THEN
    NEW.date := NEW.transaction_time;
  ELSIF NEW.date IS NOT NULL AND (NEW.transaction_time IS NULL OR NEW.date IS DISTINCT FROM OLD.date) THEN
    NEW.transaction_time := NEW.date;
  ELSIF NEW.transaction_time IS NULL AND NEW.date IS NULL THEN
    NEW.transaction_time := now();
    NEW.date := NEW.transaction_time;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cash_flow_transaction_time ON public.cash_flow;
CREATE TRIGGER trg_sync_cash_flow_transaction_time
  BEFORE INSERT OR UPDATE ON public.cash_flow
  FOR EACH ROW EXECUTE FUNCTION private.sync_cash_flow_transaction_time();

-- 6. Add performance index on (user_id, transaction_time DESC)
CREATE INDEX IF NOT EXISTS idx_cash_flow_user_transaction_time
  ON public.cash_flow(user_id, transaction_time DESC);
