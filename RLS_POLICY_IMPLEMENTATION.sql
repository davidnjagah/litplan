-- ============================================================================
-- Litplan RLS Policy Implementation Script
-- ============================================================================
-- This script enables Row-Level Security (RLS) on Litplan tables
-- and creates the necessary policies for data access control.
--
-- Prerequisites:
--   - Supabase project with PostgreSQL database
--   - Existing tables: User, Subscription, City, Plan, GroupFlow, etc.
--   - Supabase Auth configured with JWT tokens
--
-- Usage:
--   1. Review each section carefully
--   2. Test in development environment first
--   3. Apply in production with appropriate backup strategy
--   4. Monitor logs for RLS violations
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTIONS
-- ============================================================================

-- Function to get the current user's database ID from their Supabase Auth ID
-- This maps auth.uid() (Supabase Auth ID) to the User.id (database ID)
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS TEXT LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM "User"
  WHERE supabaseUserId = auth.uid()::text
  LIMIT 1
$$;

-- Function to check if current user is an admin
-- Requires custom JWT claim or user_role table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (auth.jwt()->>'role') = 'admin',
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = get_user_id_from_auth()
      AND displayName LIKE '%admin%'  -- Temporary fallback
    )
  )
$$;

-- Function to check if current user is a service account
-- Used for cron jobs and webhooks
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT auth.role() = 'service_role'
$$;

-- Function to get the current authenticated user's record
CREATE OR REPLACE FUNCTION current_user_data()
RETURNS "User" LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM "User"
  WHERE id = get_user_id_from_auth()
$$;


-- ============================================================================
-- SECTION 2: USER TABLE RLS
-- ============================================================================

-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read their own user record
CREATE POLICY "user_read_own" ON "User"
  FOR SELECT
  USING (auth.uid()::text = supabaseUserId);

-- Policy: Authenticated users can update their own profile
CREATE POLICY "user_update_own" ON "User"
  FOR UPDATE
  USING (auth.uid()::text = supabaseUserId)
  WITH CHECK (auth.uid()::text = supabaseUserId);

-- Policy: Admins can read all user records
CREATE POLICY "user_read_admin" ON "User"
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can update any user record
CREATE POLICY "user_update_admin" ON "User"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy: Only service role can insert new users (from auth webhooks)
CREATE POLICY "user_insert_service" ON "User"
  FOR INSERT
  WITH CHECK (is_service_role());

-- Policy: Service role can update users
CREATE POLICY "user_update_service" ON "User"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());


-- ============================================================================
-- SECTION 3: SUBSCRIPTION TABLE RLS
-- ============================================================================

-- Enable RLS on Subscription table
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read their own subscription
CREATE POLICY "subscription_read_own" ON "Subscription"
  FOR SELECT
  USING (
    supabaseUserId = auth.uid()::text
  );

-- Policy: Service role can update subscriptions (for Apple IAP webhooks)
CREATE POLICY "subscription_update_service" ON "Subscription"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Policy: Service role can insert subscriptions
CREATE POLICY "subscription_insert_service" ON "Subscription"
  FOR INSERT
  WITH CHECK (is_service_role());

-- Policy: Admins can read all subscriptions
CREATE POLICY "subscription_read_admin" ON "Subscription"
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can update subscriptions (for manual adjustments)
CREATE POLICY "subscription_update_admin" ON "Subscription"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());


-- ============================================================================
-- SECTION 4: USER ACTIVITY TABLES RLS
-- ============================================================================

-- Enable RLS on SavedCity table
ALTER TABLE "SavedCity" ENABLE ROW LEVEL SECURITY;

-- Policies for SavedCity (users can only access their own saved cities)
CREATE POLICY "saved_city_read_own" ON "SavedCity"
  FOR SELECT
  USING (userId = get_user_id_from_auth());

CREATE POLICY "saved_city_insert_own" ON "SavedCity"
  FOR INSERT
  WITH CHECK (userId = get_user_id_from_auth());

CREATE POLICY "saved_city_update_own" ON "SavedCity"
  FOR UPDATE
  USING (userId = get_user_id_from_auth())
  WITH CHECK (userId = get_user_id_from_auth());

CREATE POLICY "saved_city_delete_own" ON "SavedCity"
  FOR DELETE
  USING (userId = get_user_id_from_auth());

-- Admin can read all saved cities for analytics
CREATE POLICY "saved_city_read_admin" ON "SavedCity"
  FOR SELECT
  USING (is_admin());


-- Enable RLS on ViewedCity table
ALTER TABLE "ViewedCity" ENABLE ROW LEVEL SECURITY;

-- Policies for ViewedCity (users can only access their own viewed cities)
CREATE POLICY "viewed_city_read_own" ON "ViewedCity"
  FOR SELECT
  USING (userId = get_user_id_from_auth());

CREATE POLICY "viewed_city_insert_own" ON "ViewedCity"
  FOR INSERT
  WITH CHECK (userId = get_user_id_from_auth());

CREATE POLICY "viewed_city_update_own" ON "ViewedCity"
  FOR UPDATE
  USING (userId = get_user_id_from_auth())
  WITH CHECK (userId = get_user_id_from_auth());

CREATE POLICY "viewed_city_delete_own" ON "ViewedCity"
  FOR DELETE
  USING (userId = get_user_id_from_auth());

-- Admin can read all viewed cities for analytics
CREATE POLICY "viewed_city_read_admin" ON "ViewedCity"
  FOR SELECT
  USING (is_admin());


-- Enable RLS on SearchedCity table
ALTER TABLE "SearchedCity" ENABLE ROW LEVEL SECURITY;

-- Policies for SearchedCity (users can only access their own search history)
CREATE POLICY "searched_city_read_own" ON "SearchedCity"
  FOR SELECT
  USING (userId = get_user_id_from_auth());

CREATE POLICY "searched_city_insert_own" ON "SearchedCity"
  FOR INSERT
  WITH CHECK (userId = get_user_id_from_auth());

-- Admin can read all search data for analytics
CREATE POLICY "searched_city_read_admin" ON "SearchedCity"
  FOR SELECT
  USING (is_admin());

-- Service role can bulk insert search data
CREATE POLICY "searched_city_insert_service" ON "SearchedCity"
  FOR INSERT
  WITH CHECK (is_service_role());


-- ============================================================================
-- SECTION 5: PUBLIC CONTENT TABLES RLS
-- ============================================================================

-- Enable RLS on City table (public read, admin write)
ALTER TABLE "City" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "city_read_public" ON "City"
  FOR SELECT
  USING (true);

CREATE POLICY "city_insert_admin" ON "City"
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "city_update_admin" ON "City"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "city_delete_admin" ON "City"
  FOR DELETE
  USING (is_admin());

-- Service role can write for bulk operations
CREATE POLICY "city_write_service" ON "City"
  FOR INSERT
  WITH CHECK (is_service_role());

CREATE POLICY "city_update_service" ON "City"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());


-- Enable RLS on Plan table (public read, admin write)
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_read_public" ON "Plan"
  FOR SELECT
  USING (true);

CREATE POLICY "plan_insert_admin" ON "Plan"
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "plan_update_admin" ON "Plan"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "plan_delete_admin" ON "Plan"
  FOR DELETE
  USING (is_admin());

-- Service role can write for bulk operations and AI generation
CREATE POLICY "plan_write_service" ON "Plan"
  FOR INSERT
  WITH CHECK (is_service_role());

CREATE POLICY "plan_update_service" ON "Plan"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());


-- Enable RLS on GroupFlow table (public read, admin write)
ALTER TABLE "GroupFlow" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_flow_read_public" ON "GroupFlow"
  FOR SELECT
  USING (true);

CREATE POLICY "group_flow_insert_admin" ON "GroupFlow"
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "group_flow_update_admin" ON "GroupFlow"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "group_flow_delete_admin" ON "GroupFlow"
  FOR DELETE
  USING (is_admin());

-- Service role can write for bulk operations
CREATE POLICY "group_flow_write_service" ON "GroupFlow"
  FOR INSERT
  WITH CHECK (is_service_role());

CREATE POLICY "group_flow_update_service" ON "GroupFlow"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());


-- Enable RLS on GroupFlowStep table (public read, admin write)
ALTER TABLE "GroupFlowStep" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_flow_step_read_public" ON "GroupFlowStep"
  FOR SELECT
  USING (true);

CREATE POLICY "group_flow_step_write_admin" ON "GroupFlowStep"
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "group_flow_step_update_admin" ON "GroupFlowStep"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role can write
CREATE POLICY "group_flow_step_write_service" ON "GroupFlowStep"
  FOR INSERT
  WITH CHECK (is_service_role());


-- ============================================================================
-- SECTION 6: SYSTEM/CONFIG TABLES RLS
-- ============================================================================

-- Enable RLS on AppConfig table (public read, admin write)
ALTER TABLE "AppConfig" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_read_public" ON "AppConfig"
  FOR SELECT
  USING (true);

CREATE POLICY "app_config_update_admin" ON "AppConfig"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "app_config_update_service" ON "AppConfig"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());


-- Enable RLS on WeeklyRefreshLog table (admin/service only)
ALTER TABLE "WeeklyRefreshLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_refresh_log_read_admin" ON "WeeklyRefreshLog"
  FOR SELECT
  USING (is_admin());

CREATE POLICY "weekly_refresh_log_insert_service" ON "WeeklyRefreshLog"
  FOR INSERT
  WITH CHECK (is_service_role());

CREATE POLICY "weekly_refresh_log_update_service" ON "WeeklyRefreshLog"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());


-- Enable RLS on AIAgentLog table (admin/service only)
ALTER TABLE "AIAgentLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agent_log_read_admin" ON "AIAgentLog"
  FOR SELECT
  USING (is_admin());

CREATE POLICY "ai_agent_log_insert_service" ON "AIAgentLog"
  FOR INSERT
  WITH CHECK (is_service_role());


-- Enable RLS on DailyRefreshLog table (admin/service only)
ALTER TABLE "DailyRefreshLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_refresh_log_read_admin" ON "DailyRefreshLog"
  FOR SELECT
  USING (is_admin());

CREATE POLICY "daily_refresh_log_insert_service" ON "DailyRefreshLog"
  FOR INSERT
  WITH CHECK (is_service_role());

CREATE POLICY "daily_refresh_log_update_service" ON "DailyRefreshLog"
  FOR UPDATE
  USING (is_service_role())
  WITH CHECK (is_service_role());


-- ============================================================================
-- SECTION 7: PERFORMANCE INDEXES
-- ============================================================================

-- Create indexes to support RLS policy filtering

-- User table - support auth lookups
CREATE INDEX IF NOT EXISTS idx_user_supabase_id
  ON "User"(supabaseUserId)
  WHERE supabaseUserId IS NOT NULL;

-- SavedCity - support user filtering
CREATE INDEX IF NOT EXISTS idx_saved_city_user_id
  ON "SavedCity"(userId);

CREATE INDEX IF NOT EXISTS idx_saved_city_user_city
  ON "SavedCity"(userId, cityId);

-- ViewedCity - support user filtering and sorting
CREATE INDEX IF NOT EXISTS idx_viewed_city_user_id
  ON "ViewedCity"(userId);

CREATE INDEX IF NOT EXISTS idx_viewed_city_user_last_viewed
  ON "ViewedCity"(userId, lastViewedAt DESC);

-- SearchedCity - support user filtering and analytics
CREATE INDEX IF NOT EXISTS idx_searched_city_user_id
  ON "SearchedCity"(userId);

CREATE INDEX IF NOT EXISTS idx_searched_city_user_date
  ON "SearchedCity"(userId, searchedAt DESC);

-- Subscription - support auth lookups
CREATE INDEX IF NOT EXISTS idx_subscription_supabase_id
  ON "Subscription"(supabaseUserId)
  WHERE supabaseUserId IS NOT NULL;


-- ============================================================================
-- SECTION 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "User" TO authenticated;
GRANT SELECT, UPDATE ON "Subscription" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "SavedCity" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ViewedCity" TO authenticated;
GRANT SELECT, INSERT ON "SearchedCity" TO authenticated;
GRANT SELECT ON "City" TO authenticated;
GRANT SELECT ON "Plan" TO authenticated;
GRANT SELECT ON "GroupFlow" TO authenticated;
GRANT SELECT ON "GroupFlowStep" TO authenticated;
GRANT SELECT ON "AppConfig" TO authenticated;

-- Grant permissions to anonymous (public) users
GRANT SELECT ON "City" TO anon;
GRANT SELECT ON "Plan" TO anon;
GRANT SELECT ON "GroupFlow" TO anon;
GRANT SELECT ON "GroupFlowStep" TO anon;
GRANT SELECT ON "AppConfig" TO anon;

-- Grant permissions to service role (for webhooks, cron jobs)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;


-- ============================================================================
-- SECTION 9: TESTING & VERIFICATION
-- ============================================================================

-- Test queries to verify RLS is working correctly

-- Test 1: Verify current_user_data() function works
-- SELECT current_user_data();

-- Test 2: Verify is_admin() function works
-- SELECT is_admin();

-- Test 3: Verify SavedCity policy (should only see own cities)
-- SELECT * FROM "SavedCity";

-- Test 4: Verify ViewedCity policy (should only see own history)
-- SELECT * FROM "ViewedCity";

-- Test 5: Verify City is publicly readable
-- SELECT * FROM "City" LIMIT 1;

-- Test 6: Check RLS policies are enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = true;

-- Test 7: List all policies
-- SELECT * FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;


-- ============================================================================
-- SECTION 10: MONITORING & DEBUGGING
-- ============================================================================

-- Query to find RLS violations in logs
-- SELECT * FROM postgres_logs
-- WHERE message LIKE '%new row violates row-level security policy%'
-- ORDER BY timestamp DESC
-- LIMIT 100;

-- Query to check policy performance
-- EXPLAIN ANALYZE SELECT * FROM "SavedCity";

-- Query to view policy definitions
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;


-- ============================================================================
-- SECTION 11: ADMIN ROLE SETUP (MANUAL)
-- ============================================================================

-- These steps are manual and depend on your authentication setup

-- Option 1: Set custom JWT claim in Supabase Auth
-- Use Supabase Dashboard → Authentication → User Management
-- Edit user and add custom claim: { "role": "admin" }

-- Option 2: Create user_role table if needed
-- CREATE TABLE user_roles (
--   user_id UUID PRIMARY KEY REFERENCES "User"(supabaseUserId),
--   role TEXT NOT NULL DEFAULT 'user'
-- );
--
-- Then modify is_admin() function to check this table instead

-- Option 3: Update user metadata via API
-- const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
--   userId,
--   { user_metadata: { role: 'admin' } }
-- );


-- ============================================================================
-- SECTION 12: ROLLBACK SCRIPT
-- ============================================================================

-- If you need to disable RLS (for debugging or reverting):
--
-- ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Subscription" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "SavedCity" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "ViewedCity" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "SearchedCity" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "City" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Plan" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "GroupFlow" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "GroupFlowStep" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "AppConfig" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "WeeklyRefreshLog" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "AIAgentLog" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "DailyRefreshLog" DISABLE ROW LEVEL SECURITY;


-- ============================================================================
-- END OF RLS POLICY IMPLEMENTATION SCRIPT
-- ============================================================================

-- Document Version: 1.0
-- Created: 2026-01-05
-- Status: Ready for deployment

-- IMPORTANT NOTES:
-- 1. Test this script in a development environment first
-- 2. Back up your database before applying in production
-- 3. Monitor application logs for RLS violations after deployment
-- 4. The backend middleware will still enforce authorization during transition
-- 5. RLS adds a small performance overhead - monitor query times
-- 6. Custom JWT claims must be set up in Supabase for admin role detection
-- 7. Consider using PostgREST API for direct database access from mobile clients
