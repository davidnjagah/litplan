-- ════════════════════════════════════════════════════════════════════════════
-- Pipeline Analytics Queries
-- ════════════════════════════════════════════════════════════════════════════
-- Bookmarkable queries for monitoring the async bolt pipeline. Paste into
-- Supabase Dashboard → SQL Editor.
--
-- View definitions live in:
--   backend/supabase/supabase/migrations/20260522_pipeline_analytics_views.sql
--
-- Architecture context:
--   scaling/railway-async-architecture.md
--   scaling/post-deploy-bottleneck-analysis.md
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 1. HEALTH SNAPSHOT ─────────────────────────────────────────────────────
-- The "is everything OK?" view. Run this first whenever you check on the system.
-- Returns 1 row with rolling 24-hour counts + in-flight state + cache hits.
SELECT * FROM pipeline_health_snapshot;


-- ─── 2. RECENT FAILURES ─────────────────────────────────────────────────────
-- What failed and why. Includes errorCode, error message, duration.
SELECT job_id, city, theme, error_code, error_message, duration_seconds, created_at
FROM pipeline_failures_recent
LIMIT 20;


-- ─── 3. FAILURE BREAKDOWN (last 7 days) ─────────────────────────────────────
-- Which errors dominate. Use this to prioritise fixes.
-- error_code = 'UNKNOWN' usually means the trigger itself failed (Railway
-- unreachable) rather than the pipeline running and returning a structured error.
SELECT * FROM pipeline_failure_breakdown_7d;


-- ─── 4. QUEUE EVENTS ────────────────────────────────────────────────────────
-- Every time a job waited >1s before processing started — i.e. the concurrency
-- limiter (60-cap semaphore) was at capacity. Empty under normal load.
SELECT * FROM pipeline_queue_events LIMIT 20;


-- ─── 5. ACTIVE JOBS (RIGHT NOW) ─────────────────────────────────────────────
-- What's currently running. Useful when you suspect something is stuck.
-- Anything with age_seconds > 90 deserves a closer look — the lazy watchdog
-- flips processing rows to 'failed' at 240s, but well before that point a
-- pipeline should already be finishing.
SELECT * FROM pipeline_active_jobs;


-- ─── 6. CACHE STATS ─────────────────────────────────────────────────────────
-- Hit count, freshness, hours until expiry. Hot/warm/cold labels for skim.
SELECT * FROM pipeline_cache_stats;


-- ─── 7. DAILY SUMMARY (last 7 days) ─────────────────────────────────────────
-- Trend data — counts by (day, status, errorCode) with average duration.
SELECT *
FROM pipeline_daily_summary
WHERE day > NOW() - INTERVAL '7 days'
ORDER BY day DESC, job_count DESC;


-- ════════════════════════════════════════════════════════════════════════════
-- AD-HOC QUERIES (not yet views — paste these directly)
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 8. THIN_COVERAGE failures only ─────────────────────────────────────────
-- Which cities/themes don't have enough verified venues. Worth checking before
-- adding new themes or expanding marketing in new cities.
SELECT city, theme, error_message, created_at
FROM pipeline_failures_recent
WHERE error_code = 'THIN_COVERAGE'
ORDER BY created_at DESC;


-- ─── 9. SLOWEST RECENT GENERATIONS ──────────────────────────────────────────
-- Find pipelines that took unusually long. Helps spot OpenAI slowdowns or
-- Google Places quota issues.
SELECT id AS job_id, city, theme, status,
       ROUND(EXTRACT(EPOCH FROM ("completedAt" - "startedAt"))::numeric, 1) AS duration_seconds,
       "createdAt"
FROM "PipelineJob"
WHERE status IN ('completed', 'failed')
  AND "completedAt" IS NOT NULL
  AND "startedAt" IS NOT NULL
ORDER BY duration_seconds DESC NULLS LAST
LIMIT 10;


-- ─── 10. PER-USER ACTIVITY ──────────────────────────────────────────────────
-- Who's generating the most. Replace 'some-user-id' to look at a specific user.
SELECT "userId" AS user_id,
       COUNT(*) AS total_jobs,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       MAX("createdAt") AS most_recent_at
FROM "PipelineJob"
WHERE "userId" IS NOT NULL
GROUP BY "userId"
ORDER BY total_jobs DESC
LIMIT 20;


-- ─── 11. PIPELINE DURATION HISTOGRAM (last 24h) ─────────────────────────────
-- Buckets pipeline durations to see if performance is normal. Healthy
-- distribution: most in 15-45s buckets, none above 90s.
SELECT
  CASE
    WHEN duration < 10 THEN '0-10s'
    WHEN duration < 20 THEN '10-20s'
    WHEN duration < 30 THEN '20-30s'
    WHEN duration < 45 THEN '30-45s'
    WHEN duration < 60 THEN '45-60s'
    WHEN duration < 90 THEN '60-90s'
    ELSE '90s+'
  END AS bucket,
  COUNT(*) AS jobs
FROM (
  SELECT EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) AS duration
  FROM "PipelineJob"
  WHERE status = 'completed'
    AND "createdAt" > NOW() - INTERVAL '24 hours'
    AND "completedAt" IS NOT NULL
    AND "startedAt" IS NOT NULL
) t
GROUP BY bucket
ORDER BY bucket;


-- ─── 12. CACHE HIT RATE (last 7 days) ───────────────────────────────────────
-- Approximate hit rate: (total cache hits served) / (total requests).
-- Cache hits don't create PipelineJob rows, so this estimates based on
-- (sum of hit_counts - number of cache rows) / (jobs + sum of hit_counts).
WITH cache_data AS (
  SELECT
    COALESCE(SUM(hit_count), 0) AS total_hits,
    COUNT(*) AS active_keys
  FROM vibez_cache
  WHERE created_at > NOW() - INTERVAL '7 days'
),
job_count AS (
  SELECT COUNT(*) AS jobs
  FROM "PipelineJob"
  WHERE "createdAt" > NOW() - INTERVAL '7 days'
)
SELECT
  cache_data.total_hits - cache_data.active_keys AS estimated_cache_hits,
  job_count.jobs AS pipeline_runs,
  CASE
    WHEN (cache_data.total_hits - cache_data.active_keys) + job_count.jobs > 0
    THEN ROUND(100.0 * (cache_data.total_hits - cache_data.active_keys)
              / NULLIF((cache_data.total_hits - cache_data.active_keys) + job_count.jobs, 0), 1)
    ELSE 0
  END AS cache_hit_rate_pct
FROM cache_data, job_count;
