-- pg_cron Setup for Monthly Plan Refresh
-- Changed from weekly to monthly to reduce AI API costs by 75%
-- Runs on the 1st of every month at 10pm UTC (11pm CET)
--
-- Cost Impact:
-- - Weekly: ~$520/month (12,000 API calls)
-- - Monthly: ~$130/month (3,000 API calls)
-- - Savings: $390/month (75% reduction)

-- ============================================
-- STEP 1: Remove old weekly cron job
-- ============================================

-- Unschedule the weekly job first
-- SELECT cron.unschedule('weekly-plan-refresh');

-- ============================================
-- STEP 2: Schedule Monthly Refresh Job
-- ============================================

-- Schedule: '0 22 1 * *' = 22:00 (10pm UTC) on the 1st of every month
-- This equals 11pm CET (Central European Time)

/*
SELECT cron.schedule(
  'monthly-plan-refresh',
  '0 22 1 * *',  -- 1st of every month at 10pm UTC (11pm CET)
  $$
  SELECT net.http_post(
    url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/weekly-plan-refresh',
    headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{"cityLimit": 100, "skipQA": false}'::jsonb
  )
  $$
);
*/

-- ============================================
-- INSTRUCTIONS TO ENABLE
-- ============================================

-- 1. Enable extensions in Supabase Dashboard:
--    Dashboard > Settings > Database > Extensions
--    - Enable pg_cron
--    - Enable pg_net

-- 2. Run in Supabase SQL Editor:

-- First, unschedule old weekly job if it exists:
-- SELECT cron.unschedule('weekly-plan-refresh');

-- Then schedule the new monthly job:
-- SELECT cron.schedule(
--   'monthly-plan-refresh',
--   '0 22 1 * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/weekly-plan-refresh',
--     headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxNjQzNywiZXhwIjoyMDgyNTkyNDM3fQ.MpZ0c4A1M58ih0Tdij7zcnzyoziI1plDwFwzN-FVCKs", "Content-Type": "application/json"}'::jsonb,
--     body := '{"cityLimit": 100, "skipQA": false}'::jsonb
--   )
--   $$
-- );

-- ============================================
-- MONITORING COMMANDS
-- ============================================

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

-- View job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Check if monthly job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'monthly-plan-refresh';

-- ============================================
-- MANUAL TRIGGER (for testing)
-- ============================================

-- To manually trigger the monthly refresh:
-- curl -X POST "https://clktdigankjszupvrsqt.supabase.co/functions/v1/weekly-plan-refresh" \
--   -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
--   -H "Content-Type: application/json" \
--   -d '{"cityLimit": 5, "skipQA": true}'

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To disable monthly and restore weekly:
-- SELECT cron.unschedule('monthly-plan-refresh');
-- SELECT cron.schedule(
--   'weekly-plan-refresh',
--   '0 22 * * 0',
--   $$
--   SELECT net.http_post(
--     url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/weekly-plan-refresh',
--     headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
--     body := '{"cityLimit": 100, "skipQA": false}'::jsonb
--   )
--   $$
-- );
