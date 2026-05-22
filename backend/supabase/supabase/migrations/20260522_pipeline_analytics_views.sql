-- ════════════════════════════════════════════════════════════════════════════
-- Pipeline Analytics Views
-- ════════════════════════════════════════════════════════════════════════════
-- Read-only views over PipelineJob + vibez_cache. Query via Supabase Dashboard
-- → SQL Editor. Each view is bookmarkable and reusable.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Recent failures with error code + message ───────────────────────────
-- Most useful: "what's been failing and why"
CREATE OR REPLACE VIEW pipeline_failures_recent AS
SELECT
  id AS job_id,
  city,
  theme,
  "userId" AS user_id,
  result->>'errorCode'    AS error_code,
  result->>'error'        AS error_message,
  CASE
    WHEN "startedAt" IS NOT NULL AND "completedAt" IS NOT NULL
    THEN ROUND(EXTRACT(EPOCH FROM ("completedAt" - "startedAt"))::numeric, 1)
    ELSE NULL
  END AS duration_seconds,
  "createdAt" AS created_at,
  "completedAt" AS completed_at
FROM "PipelineJob"
WHERE status = 'failed'
ORDER BY "createdAt" DESC;

-- ─── 2. Queue events — when concurrency limiter was hit ─────────────────────
-- Surfaces every job that spent >1s in 'queued' / 'pending' before starting,
-- which is the signal that the semaphore was at capacity.
CREATE OR REPLACE VIEW pipeline_queue_events AS
SELECT
  id AS job_id,
  city,
  theme,
  status AS current_status,
  ROUND(EXTRACT(EPOCH FROM ("startedAt" - "createdAt"))::numeric, 1) AS queue_seconds,
  "createdAt" AS created_at,
  "startedAt" AS started_at
FROM "PipelineJob"
WHERE "startedAt" IS NOT NULL
  AND EXTRACT(EPOCH FROM ("startedAt" - "createdAt")) > 1.0
ORDER BY "createdAt" DESC;

-- ─── 3. Daily summary — counts by status + error code ───────────────────────
-- One row per (day, status, error_code). Gives you trend data at a glance.
CREATE OR REPLACE VIEW pipeline_daily_summary AS
SELECT
  date_trunc('day', "createdAt") AS day,
  status,
  result->>'errorCode' AS error_code,
  COUNT(*) AS job_count,
  ROUND(AVG(
    CASE
      WHEN "startedAt" IS NOT NULL AND "completedAt" IS NOT NULL
      THEN EXTRACT(EPOCH FROM ("completedAt" - "startedAt"))
      ELSE NULL
    END
  )::numeric, 1) AS avg_duration_seconds
FROM "PipelineJob"
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

-- ─── 4. Currently in-flight jobs (real-time snapshot) ───────────────────────
-- What's actively running right now. Useful when you suspect something is stuck.
CREATE OR REPLACE VIEW pipeline_active_jobs AS
SELECT
  id AS job_id,
  city,
  theme,
  status,
  "userId" AS user_id,
  ROUND(EXTRACT(EPOCH FROM (NOW() - "createdAt"))::numeric, 1) AS age_seconds,
  "createdAt" AS created_at,
  "startedAt" AS started_at
FROM "PipelineJob"
WHERE status IN ('pending', 'queued', 'processing')
ORDER BY "createdAt" DESC;

-- ─── 5. Failure breakdown by error code (last 7 days) ───────────────────────
-- "Which errors are dominating my failures?" — for prioritising fixes.
CREATE OR REPLACE VIEW pipeline_failure_breakdown_7d AS
SELECT
  COALESCE(result->>'errorCode', 'UNKNOWN') AS error_code,
  COUNT(*) AS failure_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS percent_of_failures,
  MAX("createdAt") AS most_recent_at,
  array_agg(DISTINCT city ORDER BY city) AS cities_affected
FROM "PipelineJob"
WHERE status = 'failed'
  AND "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY failure_count DESC;

-- ─── 6. Cache effectiveness ─────────────────────────────────────────────────
-- Hit rate, top cached combos, freshness.
CREATE OR REPLACE VIEW pipeline_cache_stats AS
SELECT
  cache_key,
  city,
  theme,
  hit_count,
  CASE
    WHEN hit_count >= 5 THEN 'hot'
    WHEN hit_count >= 2 THEN 'warm'
    ELSE 'cold'
  END AS temperature,
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))::numeric / 3600, 1) AS hours_since_first_cached,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW()))::numeric / 3600, 1) AS hours_until_expiry,
  created_at,
  expires_at
FROM vibez_cache
WHERE expires_at > NOW()
ORDER BY hit_count DESC, created_at DESC;

-- ─── 7. Overall health snapshot (single-row summary) ────────────────────────
-- The "is everything OK?" view. Run this first when checking on the system.
CREATE OR REPLACE VIEW pipeline_health_snapshot AS
SELECT
  COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours') AS jobs_last_24h,
  COUNT(*) FILTER (WHERE status = 'completed' AND "createdAt" > NOW() - INTERVAL '24 hours') AS completed_last_24h,
  COUNT(*) FILTER (WHERE status = 'failed' AND "createdAt" > NOW() - INTERVAL '24 hours') AS failed_last_24h,
  COUNT(*) FILTER (WHERE status IN ('pending', 'queued', 'processing')) AS currently_in_flight,
  COUNT(*) FILTER (WHERE status = 'queued') AS currently_queued,
  ROUND(AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt"))) FILTER (
    WHERE status = 'completed' AND "createdAt" > NOW() - INTERVAL '24 hours'
  )::numeric, 1) AS avg_duration_seconds_last_24h,
  (SELECT SUM(hit_count) FROM vibez_cache WHERE expires_at > NOW()) AS total_cache_hits_active
FROM "PipelineJob";
