-- Weekly Plan System Migration
-- Converts from daily plan generation to weekly-based system
-- Date: 2026-01-08

-- ============================================
-- STEP 1: Add Weekly Tracking Columns to Plan
-- ============================================

-- Week tracking columns
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "yearWeek" VARCHAR(10);  -- Format: "2026-W01"
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "weekStartDate" DATE;

-- Event vs permanent venue distinction
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isEvent" BOOLEAN DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "eventDate" DATE;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN DEFAULT true;

-- Change detection for smart updates
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "contentHash" VARCHAR(64);
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "sourceUrl" VARCHAR(500);

-- Indexes for weekly queries
CREATE INDEX IF NOT EXISTS "Plan_yearWeek_idx" ON "Plan"("yearWeek");
CREATE INDEX IF NOT EXISTS "Plan_yearWeek_cityId_idx" ON "Plan"("yearWeek", "cityId");
CREATE INDEX IF NOT EXISTS "Plan_isEvent_idx" ON "Plan"("isEvent");
CREATE INDEX IF NOT EXISTS "Plan_weekStartDate_idx" ON "Plan"("weekStartDate");

-- ============================================
-- STEP 2: Create WeeklyRefreshLog Table
-- ============================================

CREATE TABLE IF NOT EXISTS "WeeklyRefreshLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "yearWeek" VARCHAR(10) NOT NULL,  -- "2026-W01"
  "weekNumber" INTEGER NOT NULL,
  "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "status" VARCHAR(50) DEFAULT 'running',  -- 'running', 'completed', 'completed_with_errors', 'failed'
  "citiesProcessed" INTEGER DEFAULT 0,
  "plansCreated" INTEGER DEFAULT 0,
  "plansUpdated" INTEGER DEFAULT 0,
  "plansUnchanged" INTEGER DEFAULT 0,
  "eventsFound" INTEGER DEFAULT 0,
  "groupFlowsGenerated" INTEGER DEFAULT 0,
  "errors" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for weekly refresh log queries
CREATE INDEX IF NOT EXISTS "WeeklyRefreshLog_yearWeek_idx" ON "WeeklyRefreshLog"("yearWeek");
CREATE INDEX IF NOT EXISTS "WeeklyRefreshLog_status_idx" ON "WeeklyRefreshLog"("status");

-- ============================================
-- STEP 3: Add Search Count to City for Analytics
-- ============================================

ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "searchCount" INTEGER DEFAULT 0;
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "lastRefreshedAt" TIMESTAMP WITH TIME ZONE;

-- Index for popular cities
CREATE INDEX IF NOT EXISTS "City_searchCount_idx" ON "City"("searchCount" DESC);

-- ============================================
-- STEP 4: Function to Calculate ISO Week
-- ============================================

CREATE OR REPLACE FUNCTION get_iso_week(p_date DATE)
RETURNS TABLE(year_week VARCHAR(10), week_number INTEGER, week_start DATE, week_end DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(p_date, 'IYYY-"W"IW')::VARCHAR(10) as year_week,
    EXTRACT(WEEK FROM p_date)::INTEGER as week_number,
    DATE_TRUNC('week', p_date)::DATE as week_start,
    (DATE_TRUNC('week', p_date) + INTERVAL '6 days')::DATE as week_end;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Function to Get Current Week Plans
-- ============================================

CREATE OR REPLACE FUNCTION get_current_week_plans(p_city_id TEXT)
RETURNS SETOF "Plan" AS $$
DECLARE
  v_year_week VARCHAR(10);
BEGIN
  SELECT TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW') INTO v_year_week;

  RETURN QUERY
  SELECT * FROM "Plan"
  WHERE "cityId" = p_city_id
    AND "yearWeek" = v_year_week
  ORDER BY
    CASE WHEN "isEvent" = true THEN 0 ELSE 1 END,  -- Events first
    "schedule"->>'dayOfWeek',
    "schedule"->>'startTime';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Backfill yearWeek for Existing Plans
-- ============================================

UPDATE "Plan"
SET
  "yearWeek" = TO_CHAR(("schedule"->>'date')::DATE, 'IYYY-"W"IW'),
  "weekNumber" = EXTRACT(WEEK FROM ("schedule"->>'date')::DATE)::INTEGER,
  "weekStartDate" = DATE_TRUNC('week', ("schedule"->>'date')::DATE)::DATE,
  "isEvent" = false,
  "isRecurring" = true
WHERE "yearWeek" IS NULL
  AND "schedule"->>'date' IS NOT NULL;

-- ============================================
-- STEP 7: Update pg_cron Schedule (if exists)
-- ============================================

-- Note: This will be handled by the cron setup script
-- The daily job will be replaced with a weekly job:
-- Schedule: Every Sunday at 10pm UTC (11pm CET)
-- '0 22 * * 0' -> At 22:00 on Sunday

-- Comment out or update existing daily cron job
-- SELECT cron.unschedule('daily-plan-refresh');

-- ============================================
-- STEP 8: Add Composite Indexes for Performance
-- ============================================

-- Compound index for weekly city queries (most common query pattern)
CREATE INDEX IF NOT EXISTS "Plan_cityId_yearWeek_isEvent_idx"
  ON "Plan"("cityId", "yearWeek", "isEvent");

-- Index for weekend vs weekday filtering
CREATE INDEX IF NOT EXISTS "Plan_schedule_isWeekend_idx"
  ON "Plan"((("schedule"->>'isWeekend')::BOOLEAN));

-- ============================================
-- DONE: Weekly Plan System Schema Ready
-- ============================================
