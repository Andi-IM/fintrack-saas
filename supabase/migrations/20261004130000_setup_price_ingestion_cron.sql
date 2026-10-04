-- Enable pg_cron extension for scheduled jobs within Supabase
-- Run this migration to set up automated price ingestion and portfolio snapshots

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;  -- for HTTP calls to Edge Functions

-- Schedule: Refresh portfolio snapshots daily at 17:00 WIB (10:00 UTC)
SELECT cron.schedule(
  'refresh-portfolio-snapshots-daily',
  '0 10 * * 1-5',  -- Mon-Fri 10:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://untdclrirwhtuepulqaz.supabase.co/functions/v1/refresh-portfolio-snapshots',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Alternative: Direct SQL function to refresh all users' portfolio snapshots
-- (runs without Edge Function, more efficient)
CREATE OR REPLACE FUNCTION refresh_all_portfolio_snapshots()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM investment_holdings
  LOOP
    PERFORM refresh_portfolio_snapshot(user_record.user_id);
  END LOOP;
END;
$$;

-- Schedule daily portfolio refresh at 17:00 WIB (10:00 UTC)
SELECT cron.schedule(
  'refresh-all-portfolios-daily',
  '0 10 * * 1-5',  -- Mon-Fri 10:00 UTC
  'SELECT refresh_all_portfolio_snapshots();'
);

-- Note: For price ingestion (IDX, mutual funds, crypto, gold), 
-- we recommend using GitHub Actions to call Edge Functions since:
-- 1. They need external API calls (Yahoo Finance, CoinGecko, etc.)
-- 2. pg_net HTTP calls from pg_cron have timeout limits
-- 3. Edge Functions have better retry/error handling
--
-- If you prefer pg_cron, uncomment below and set up Edge Function URLs:

/*
-- Schedule IDX stocks every 15 min during trading hours (Mon-Fri 02:00-08:00 UTC)
SELECT cron.schedule(
  'ingest-idx-prices',
  '*/15 2-8 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://untdclrirwhtuepulqaz.supabase.co/functions/v1/price-ingestion-idx',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule mutual funds daily at 10:00 UTC (17:00 WIB)
SELECT cron.schedule(
  'ingest-mutual-fund-nav',
  '0 10 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://untdclrirwhtuepulqaz.supabase.co/functions/v1/price-ingestion-mutual-funds',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule crypto every 5 minutes
SELECT cron.schedule(
  'ingest-crypto-prices',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untdclrirwhtuepulqaz.supabase.co/functions/v1/price-ingestion-crypto',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule gold hourly
SELECT cron.schedule(
  'ingest-gold-prices',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untdclrirwhtuepulqaz.supabase.co/functions/v1/price-ingestion-gold',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- To unschedule: SELECT cron.unschedule('job-name');