-- ============================================================
-- Remove City Discovery Feature Tables
-- This migration removes the discovery flow tables that are no longer needed
-- ============================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_discovery_complete ON "CityDiscoveryJob";
DROP FUNCTION IF EXISTS notify_discovery_complete();

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own discovery jobs" ON "CityDiscoveryJob";
DROP POLICY IF EXISTS "Service role full access to discovery jobs" ON "CityDiscoveryJob";
DROP POLICY IF EXISTS "Users can view own subscriptions" ON "CityDiscoverySubscriber";
DROP POLICY IF EXISTS "Users can create own subscriptions" ON "CityDiscoverySubscriber";
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON "CityDiscoverySubscriber";
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON "CityDiscoverySubscriber";

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS "CityDiscoverySubscriber" CASCADE;
DROP TABLE IF EXISTS "CityDiscoveryJob" CASCADE;

-- Remove planStatus column from City table
ALTER TABLE "City" DROP COLUMN IF EXISTS "planStatus";

-- Drop indexes
DROP INDEX IF EXISTS idx_city_plan_status;
DROP INDEX IF EXISTS idx_city_discovery_job_status;
DROP INDEX IF EXISTS idx_city_discovery_job_city;
DROP INDEX IF EXISTS idx_city_discovery_job_requested_by;
DROP INDEX IF EXISTS idx_city_discovery_job_created;
DROP INDEX IF EXISTS idx_city_discovery_job_active;
DROP INDEX IF EXISTS idx_city_discovery_subscriber_job;
DROP INDEX IF EXISTS idx_city_discovery_subscriber_user;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'City discovery tables removed successfully';
END $$;
