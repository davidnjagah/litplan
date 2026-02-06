-- PipelineJob table for tracking async pipeline processing
CREATE TABLE IF NOT EXISTS "PipelineJob" (
  "id" TEXT PRIMARY KEY,
  "city" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  "error" TEXT,
  "result" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "startedAt" TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE
);

-- Index for querying by city and status
CREATE INDEX IF NOT EXISTS idx_pipeline_job_city ON "PipelineJob" ("city");
CREATE INDEX IF NOT EXISTS idx_pipeline_job_status ON "PipelineJob" ("status");
CREATE INDEX IF NOT EXISTS idx_pipeline_job_created ON "PipelineJob" ("createdAt" DESC);
