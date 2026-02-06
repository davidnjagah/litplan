-- ============================================================
-- City Discovery Feature Migration
-- Enables Pro users to discover new cities not yet in the system
-- ============================================================

-- Add planStatus to City table to track if plans are available
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "planStatus" VARCHAR(20) DEFAULT 'none';
-- Values: 'none' (no plans), 'generating' (in progress), 'available' (plans exist)

-- Index for plan status queries
CREATE INDEX IF NOT EXISTS idx_city_plan_status ON "City" ("planStatus");

-- ============================================================
-- CityDiscoveryJob - Tracks discovery requests in progress
-- ============================================================
CREATE TABLE IF NOT EXISTS "CityDiscoveryJob" (
  "id" TEXT PRIMARY KEY,
  "cityName" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending, processing, completed, failed
  "error" TEXT,
  "result" JSONB,
  "plansGenerated" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "startedAt" TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE
);

-- Add foreign key separately (User.id is TEXT)
ALTER TABLE "CityDiscoveryJob"
  ADD CONSTRAINT "CityDiscoveryJob_requestedBy_fkey"
  FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE;

-- Indexes for CityDiscoveryJob
CREATE INDEX IF NOT EXISTS idx_city_discovery_job_status ON "CityDiscoveryJob" ("status");
CREATE INDEX IF NOT EXISTS idx_city_discovery_job_city ON "CityDiscoveryJob" ("cityName", "country");
CREATE INDEX IF NOT EXISTS idx_city_discovery_job_requested_by ON "CityDiscoveryJob" ("requestedBy");
CREATE INDEX IF NOT EXISTS idx_city_discovery_job_created ON "CityDiscoveryJob" ("createdAt" DESC);

-- Unique constraint to prevent duplicate jobs for same city
CREATE UNIQUE INDEX IF NOT EXISTS idx_city_discovery_job_active
  ON "CityDiscoveryJob" ("cityName", "country")
  WHERE "status" IN ('pending', 'processing');

-- ============================================================
-- CityDiscoverySubscriber - Users waiting for a city discovery
-- ============================================================
CREATE TABLE IF NOT EXISTS "CityDiscoverySubscriber" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notifyPush" BOOLEAN DEFAULT true,
  "notifyEmail" BOOLEAN DEFAULT true,
  "subscribedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("jobId", "userId")
);

-- Add foreign keys separately
ALTER TABLE "CityDiscoverySubscriber"
  ADD CONSTRAINT "CityDiscoverySubscriber_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "CityDiscoveryJob"("id") ON DELETE CASCADE;

ALTER TABLE "CityDiscoverySubscriber"
  ADD CONSTRAINT "CityDiscoverySubscriber_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Indexes for CityDiscoverySubscriber
CREATE INDEX IF NOT EXISTS idx_city_discovery_subscriber_job ON "CityDiscoverySubscriber" ("jobId");
CREATE INDEX IF NOT EXISTS idx_city_discovery_subscriber_user ON "CityDiscoverySubscriber" ("userId");

-- ============================================================
-- DeviceToken - APNs device tokens for push notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS "DeviceToken" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'ios',
  -- Platform: ios, android
  "isActive" BOOLEAN DEFAULT true,
  "appVersion" TEXT,
  "deviceModel" TEXT,
  "osVersion" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "lastUsedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key separately
ALTER TABLE "DeviceToken"
  ADD CONSTRAINT "DeviceToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Indexes for DeviceToken
CREATE INDEX IF NOT EXISTS idx_device_token_user ON "DeviceToken" ("userId");
CREATE INDEX IF NOT EXISTS idx_device_token_active ON "DeviceToken" ("isActive") WHERE "isActive" = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_token_unique ON "DeviceToken" ("token");

-- ============================================================
-- RLS Policies
-- ============================================================

-- CityDiscoveryJob RLS
ALTER TABLE "CityDiscoveryJob" ENABLE ROW LEVEL SECURITY;

-- Users can see their own discovery jobs
CREATE POLICY "Users can view own discovery jobs" ON "CityDiscoveryJob"
  FOR SELECT USING (auth.uid()::text = "requestedBy");

-- Service role can do anything
CREATE POLICY "Service role full access to discovery jobs" ON "CityDiscoveryJob"
  FOR ALL USING (true);

-- CityDiscoverySubscriber RLS
ALTER TABLE "CityDiscoverySubscriber" ENABLE ROW LEVEL SECURITY;

-- Users can see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON "CityDiscoverySubscriber"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions" ON "CityDiscoverySubscriber"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions" ON "CityDiscoverySubscriber"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Service role can do anything
CREATE POLICY "Service role full access to subscriptions" ON "CityDiscoverySubscriber"
  FOR ALL USING (true);

-- DeviceToken RLS
ALTER TABLE "DeviceToken" ENABLE ROW LEVEL SECURITY;

-- Users can see their own device tokens
CREATE POLICY "Users can view own device tokens" ON "DeviceToken"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Users can create their own device tokens
CREATE POLICY "Users can create own device tokens" ON "DeviceToken"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own device tokens
CREATE POLICY "Users can update own device tokens" ON "DeviceToken"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- Users can delete their own device tokens
CREATE POLICY "Users can delete own device tokens" ON "DeviceToken"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Service role can do anything
CREATE POLICY "Service role full access to device tokens" ON "DeviceToken"
  FOR ALL USING (true);

-- ============================================================
-- Grants
-- ============================================================
GRANT ALL ON "CityDiscoveryJob" TO service_role;
GRANT SELECT ON "CityDiscoveryJob" TO authenticated;

GRANT ALL ON "CityDiscoverySubscriber" TO service_role;
GRANT SELECT, INSERT, DELETE ON "CityDiscoverySubscriber" TO authenticated;

GRANT ALL ON "DeviceToken" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "DeviceToken" TO authenticated;

-- ============================================================
-- Function to notify subscribers when discovery completes
-- ============================================================
CREATE OR REPLACE FUNCTION notify_discovery_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'completed' or 'failed'
  IF (OLD."status" IS DISTINCT FROM NEW."status") AND
     (NEW."status" = 'completed' OR NEW."status" = 'failed') THEN
    -- Use pg_notify to signal the Edge Function
    PERFORM pg_notify('discovery_complete', json_build_object(
      'jobId', NEW."id",
      'cityName', NEW."cityName",
      'country', NEW."country",
      'status', NEW."status",
      'plansGenerated', NEW."plansGenerated"
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for discovery completion
DROP TRIGGER IF EXISTS trigger_discovery_complete ON "CityDiscoveryJob";
CREATE TRIGGER trigger_discovery_complete
  AFTER UPDATE ON "CityDiscoveryJob"
  FOR EACH ROW
  EXECUTE FUNCTION notify_discovery_complete();

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE "CityDiscoveryJob" IS 'Tracks city discovery requests initiated by Pro users';
COMMENT ON TABLE "CityDiscoverySubscriber" IS 'Users subscribed to be notified when a city discovery completes';
COMMENT ON TABLE "DeviceToken" IS 'APNs device tokens for push notifications';
COMMENT ON COLUMN "City"."planStatus" IS 'Plan availability status: none, generating, available';
