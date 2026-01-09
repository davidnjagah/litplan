-- ============================================================
-- Group Plan Pipeline Database Schema
-- Migration for 5-agent AI pipeline
-- ============================================================

-- Add pipeline tracking columns to GroupFlow table
ALTER TABLE "GroupFlow" ADD COLUMN IF NOT EXISTS "pipelineStep" INTEGER DEFAULT 0;
ALTER TABLE "GroupFlow" ADD COLUMN IF NOT EXISTS "pipelineStatus" VARCHAR(50) DEFAULT 'pending';
ALTER TABLE "GroupFlow" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER DEFAULT 0;

-- Add detailed address fields to GroupFlowStep table
ALTER TABLE "GroupFlowStep" ADD COLUMN IF NOT EXISTS "address" VARCHAR(500);
ALTER TABLE "GroupFlowStep" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "GroupFlowStep" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "GroupFlowStep" ADD COLUMN IF NOT EXISTS "startTime" VARCHAR(10);
ALTER TABLE "GroupFlowStep" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "GroupFlowStep" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create PipelineLog table for tracking pipeline runs
CREATE TABLE IF NOT EXISTS "PipelineLog" (
  "id" TEXT PRIMARY KEY,
  "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "status" VARCHAR(50) DEFAULT 'running',
  "citiesCount" INTEGER DEFAULT 0,
  "targetPerCity" INTEGER DEFAULT 30,
  "plansGenerated" INTEGER DEFAULT 0,
  "plansApproved" INTEGER DEFAULT 0,
  "errors" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pipeline queries
CREATE INDEX IF NOT EXISTS idx_groupflow_pipeline_step ON "GroupFlow"("pipelineStep");
CREATE INDEX IF NOT EXISTS idx_groupflow_pipeline_status ON "GroupFlow"("pipelineStatus");
CREATE INDEX IF NOT EXISTS idx_groupflow_quality_score ON "GroupFlow"("qualityScore");
CREATE INDEX IF NOT EXISTS idx_pipelinelog_status ON "PipelineLog"("status");

-- Grant access to service role
GRANT ALL ON "PipelineLog" TO service_role;
GRANT SELECT ON "PipelineLog" TO anon;
GRANT SELECT ON "PipelineLog" TO authenticated;

-- Add RLS policies for PipelineLog
ALTER TABLE "PipelineLog" ENABLE ROW LEVEL SECURITY;

-- Allow read access to pipeline logs
CREATE POLICY "Allow read pipeline logs" ON "PipelineLog"
  FOR SELECT USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role can manage pipeline logs" ON "PipelineLog"
  FOR ALL USING (true);

-- Comment on pipeline columns
COMMENT ON COLUMN "GroupFlow"."pipelineStep" IS 'Pipeline stage: 0=pending, 1=generated, 2=details_validated, 3=addresses_validated, 4=descriptions_edited, 5=quality_gate';
COMMENT ON COLUMN "GroupFlow"."pipelineStatus" IS 'Pipeline status: pending, generated, details_validated, details_corrected, addresses_validated, descriptions_edited, approved, needs_revision, removed';
COMMENT ON COLUMN "GroupFlow"."qualityScore" IS 'Final quality score from quality gate agent (0-100)';

-- ============================================================
-- Update model for claude-client to use sonnet for quality work
-- ============================================================
-- Note: Update ANTHROPIC model in _shared/claude-client.ts to:
-- claude-3-5-sonnet-20241022 for better quality generation
