-- ════════════════════════════════════════════════════════════════════════════
-- Async Bolt Pipeline — schema extensions
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the columns the new async architecture needs on PipelineJob, plus the
-- vibez_cache table for result caching with a 7-day TTL.
-- See: scaling/railway-async-architecture.md
-- ════════════════════════════════════════════════════════════════════════════

-- ─── PipelineJob extensions ─────────────────────────────────────────────────
-- New columns:
--   theme    — bolt theme name (Rooftop, Nightlife, etc.)
--   userId   — generator user id (for per-user lookups + auditing)
--   flowId   — the resulting GroupFlow id, populated on successful completion
ALTER TABLE "PipelineJob"
  ADD COLUMN IF NOT EXISTS "theme"  TEXT,
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "flowId" TEXT;

-- Index for per-user job lookups (history, debugging)
CREATE INDEX IF NOT EXISTS idx_pipeline_job_user
  ON "PipelineJob" ("userId");

-- Index for per-theme analytics + stale-row sweeps by status+createdAt
CREATE INDEX IF NOT EXISTS idx_pipeline_job_status_created
  ON "PipelineJob" ("status", "createdAt" DESC);

-- ─── vibez_cache ────────────────────────────────────────────────────────────
-- Caches successful pipeline results keyed by lowercased "{city}:{theme}".
-- TTL 7 days. Cache hits return instantly from the Supabase trigger.
CREATE TABLE IF NOT EXISTS public.vibez_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key   TEXT        NOT NULL UNIQUE,
  city        TEXT        NOT NULL,
  theme       TEXT        NOT NULL,
  result      JSONB       NOT NULL,
  hit_count   INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_vibez_cache_key
  ON public.vibez_cache (cache_key);

CREATE INDEX IF NOT EXISTS idx_vibez_cache_expires
  ON public.vibez_cache (expires_at);

-- Helper: prune expired cache rows (called opportunistically, no cron needed)
CREATE OR REPLACE FUNCTION public.prune_expired_vibez_cache()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.vibez_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
