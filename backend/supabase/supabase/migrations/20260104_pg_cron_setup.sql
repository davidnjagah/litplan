-- pg_cron Setup for Daily Plan Refresh
-- Runs at 1am CET (midnight UTC)

-- Enable pg_cron extension (requires superuser, usually done in Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: The pg_net extension is required for HTTP calls from pg_cron
-- This should be enabled in Supabase dashboard

-- Schedule daily job at midnight UTC (1am CET)
-- This will call the daily-plan-refresh Edge Function
-- Replace [project-ref] and [service-role-key] with actual values

/*
SELECT cron.schedule(
  'daily-plan-refresh',
  '0 0 * * *',  -- Midnight UTC = 1am CET
  $$
  SELECT net.http_post(
    url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/daily-plan-refresh',
    headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{"cityLimit": 100, "plansPerCity": 3}'::jsonb
  )
  $$
);
*/

-- To enable the cron job, run this in Supabase SQL Editor:
-- 1. First enable the extensions in Dashboard > Settings > Database > Extensions
-- 2. Then run the cron.schedule command above with your actual service role key

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Unschedule a job
-- SELECT cron.unschedule('daily-plan-refresh');
