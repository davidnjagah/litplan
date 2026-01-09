-- AI Agent Tables Migration
-- Add support for AI-generated plans and agent logging

-- Add AI-related columns to Plan table
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "aiGenerated" BOOLEAN DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "lastVerifiedAt" TIMESTAMP WITH TIME ZONE;

-- AI Agent execution logs
CREATE TABLE IF NOT EXISTS "AIAgentLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agentType" TEXT NOT NULL,  -- 'generator', 'qa-accuracy', 'qa-quality'
  "cityId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "plansGenerated" INTEGER DEFAULT 0,
  "plansApproved" INTEGER DEFAULT 0,
  "plansRejected" INTEGER DEFAULT 0,
  "executionTimeMs" INTEGER,
  "errors" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily refresh job logs
CREATE TABLE IF NOT EXISTS "DailyRefreshLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "runDate" DATE NOT NULL,
  "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "status" TEXT NOT NULL,  -- 'running', 'completed', 'failed'
  "citiesProcessed" INTEGER DEFAULT 0,
  "plansGenerated" INTEGER DEFAULT 0,
  "plansApproved" INTEGER DEFAULT 0,
  "errors" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date-based plan queries
CREATE INDEX IF NOT EXISTS "Plan_schedule_date_idx" ON "Plan"(("schedule"->>'date'));

-- Index for AI-generated plans
CREATE INDEX IF NOT EXISTS "Plan_aiGenerated_idx" ON "Plan"("aiGenerated");

-- Index for quality score filtering
CREATE INDEX IF NOT EXISTS "Plan_qualityScore_idx" ON "Plan"("qualityScore");

-- RPC function for incrementing city view count
CREATE OR REPLACE FUNCTION increment_city_view(p_user_id UUID, p_city_id TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO "ViewedCity" ("userId", "cityId", "viewCount", "lastViewedAt")
  VALUES (p_user_id, p_city_id, 1, NOW())
  ON CONFLICT ("userId", "cityId")
  DO UPDATE SET
    "viewCount" = "ViewedCity"."viewCount" + 1,
    "lastViewedAt" = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create ViewedCity table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ViewedCity" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "cityId" TEXT NOT NULL REFERENCES "City"("id") ON DELETE CASCADE,
  "viewCount" INTEGER DEFAULT 1,
  "lastViewedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("userId", "cityId")
);

-- Index for viewed cities queries
CREATE INDEX IF NOT EXISTS "ViewedCity_userId_idx" ON "ViewedCity"("userId");
CREATE INDEX IF NOT EXISTS "ViewedCity_lastViewedAt_idx" ON "ViewedCity"("lastViewedAt");

-- GroupFlowPlan join table for ordered plans in group flows
CREATE TABLE IF NOT EXISTS "GroupFlowPlan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupFlowId" TEXT NOT NULL REFERENCES "GroupFlow"("id") ON DELETE CASCADE,
  "planId" TEXT NOT NULL REFERENCES "Plan"("id") ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("groupFlowId", "planId")
);

-- Index for group flow plan ordering
CREATE INDEX IF NOT EXISTS "GroupFlowPlan_groupFlowId_idx" ON "GroupFlowPlan"("groupFlowId");
