-- pg_cron Setup for Weekly Plan Refresh (Sprint 14)
-- Runs every Sunday at 10pm UTC (11pm CET)
-- Replaces the daily-plan-refresh job

-- ============================================
-- STEP 1: Remove old daily cron job (if exists)
-- ============================================

-- Unschedule the old daily job first
-- SELECT cron.unschedule('daily-plan-refresh');

-- ============================================
-- STEP 2: Schedule Weekly Refresh Job
-- ============================================

-- Schedule: '0 22 * * 0' = 22:00 (10pm UTC) on Sunday
-- This equals 11pm CET (Central European Time)

/*
SELECT cron.schedule(
  'weekly-plan-refresh',
  '0 22 * * 0',  -- Every Sunday at 10pm UTC (11pm CET)
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

-- First, unschedule old daily job if it exists:
-- SELECT cron.unschedule('daily-plan-refresh');

-- Then schedule the new weekly job:
-- SELECT cron.schedule(
--   'weekly-plan-refresh',
--   '0 22 * * 0',
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

-- Check if weekly job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'weekly-plan-refresh';

-- ============================================
-- MANUAL TRIGGER (for testing)
-- ============================================

-- To manually trigger the weekly refresh:
-- curl -X POST "https://clktdigankjszupvrsqt.supabase.co/functions/v1/weekly-plan-refresh" \
--   -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
--   -H "Content-Type: application/json" \
--   -d '{"cityLimit": 5, "skipQA": true}'

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To disable weekly and restore daily:
-- SELECT cron.unschedule('weekly-plan-refresh');
-- SELECT cron.schedule(
--   'daily-plan-refresh',
--   '0 0 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://clktdigankjszupvrsqt.supabase.co/functions/v1/daily-plan-refresh',
--     headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]", "Content-Type": "application/json"}'::jsonb,
--     body := '{"cityLimit": 100, "plansPerCity": 3}'::jsonb
--   )
--   $$
-- );
