-- ============================================================
-- Top Cities Monthly Cron Job Setup
-- Pre-seeds top 50 cities with plans monthly
-- ============================================================

-- This migration documents the pg_cron setup for the top-cities-cron function.
-- To enable, run these commands in the Supabase SQL Editor after deploying the function.

-- ============================================================
-- STEP 1: Ensure extensions are enabled
-- ============================================================
-- Dashboard > Settings > Database > Extensions
-- - Enable pg_cron
-- - Enable pg_net

-- ============================================================
-- STEP 2: Schedule the monthly cron job
-- ============================================================

-- Schedule: '0 22 1 * *' = 22:00 (10pm UTC) on the 1st of every month

/*
-- Run this in Supabase SQL Editor:

SELECT cron.schedule(
  'top-cities-monthly-refresh',
  '0 22 1 * *',  -- 1st of every month at 10pm UTC
  $$
  SELECT net.http_post(
    url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/top-cities-cron',
    headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{"limit": 50, "dryRun": false}'::jsonb
  )
  $$
);
*/

-- ============================================================
-- PRIORITY-BASED STAGGERED SCHEDULING (Optional)
-- ============================================================
-- For large-scale operations, consider staggering by priority tier:

/*
-- Tier 1 cities (Top 10 global) - 1st of month at 10pm UTC
SELECT cron.schedule(
  'top-cities-tier1-refresh',
  '0 22 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/top-cities-cron',
    headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{"limit": 10, "priorityFilter": 1}'::jsonb
  )
  $$
);

-- Tier 2 cities - 2nd of month at 10pm UTC
SELECT cron.schedule(
  'top-cities-tier2-refresh',
  '0 22 2 * *',
  $$
  SELECT net.http_post(
    url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/top-cities-cron',
    headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{"limit": 10, "priorityFilter": 2}'::jsonb
  )
  $$
);

-- Continue for tiers 3, 4, 5...
*/

-- ============================================================
-- MONITORING COMMANDS
-- ============================================================

-- View all scheduled jobs:
-- SELECT * FROM cron.job WHERE jobname LIKE 'top-cities%';

-- View job run history:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'top-cities%')
-- ORDER BY start_time DESC LIMIT 20;

-- ============================================================
-- MANUAL TRIGGER (for testing)
-- ============================================================

-- Test with dry run (no actual API calls):
-- curl -X POST "https://clktdigankjszupvrsqt.supabase.co/functions/v1/top-cities-cron" \
--   -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
--   -H "Content-Type: application/json" \
--   -d '{"limit": 5, "dryRun": true}'

-- Test with actual processing (limited to 2 cities):
-- curl -X POST "https://clktdigankjszupvrsqt.supabase.co/functions/v1/top-cities-cron" \
--   -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
--   -H "Content-Type: application/json" \
--   -d '{"limit": 2, "dryRun": false}'

-- ============================================================
-- ROLLBACK / DISABLE
-- ============================================================

-- To unschedule the cron job:
-- SELECT cron.unschedule('top-cities-monthly-refresh');

-- Or if using priority tiers:
-- SELECT cron.unschedule('top-cities-tier1-refresh');
-- SELECT cron.unschedule('top-cities-tier2-refresh');
-- etc.
