# RLS Implementation Guide for Litplan

## Quick Reference

### Tables Requiring RLS

| Table | RLS Status | Policy Type | Key Field |
|-------|-----------|-------------|-----------|
| User | CRITICAL | User + Admin | supabaseUserId |
| Subscription | CRITICAL | User + Service | supabaseUserId |
| SavedCity | CRITICAL | User only | userId |
| ViewedCity | CRITICAL | User only | userId |
| SearchedCity | IMPORTANT | User + Admin | userId |
| City | LOW | Public read | N/A |
| Plan | LOW | Public read | N/A |
| GroupFlow | LOW | Public read | N/A |

---

## Implementation Steps

### Step 1: Enable RLS with Safety Checks

```sql
-- Check current RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS incrementally, starting with non-critical tables
ALTER TABLE "AppConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "City" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;

-- Then move to critical tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedCity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ViewedCity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SearchedCity" ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create Helper Functions

```sql
-- Primary helper: Map auth.uid() to database user ID
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS TEXT LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM "User"
  WHERE supabaseUserId = auth.uid()::text
  LIMIT 1
$$;

-- Test the function
SELECT get_user_id_from_auth() AS current_user_id;
```

### Step 3: Deploy with Gradual Rollout

#### Phase 1: Public Tables (Low Risk)
```sql
-- These have public read policies and no user filtering
ALTER TABLE "City" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city_read_public" ON "City"
  FOR SELECT USING (true);
CREATE POLICY "city_write_admin" ON "City"
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

#### Phase 2: User Activity Tables (Medium Risk)
```sql
-- These require user isolation
ALTER TABLE "SavedCity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_city_read_own" ON "SavedCity"
  FOR SELECT USING (userId = get_user_id_from_auth());
```

#### Phase 3: Critical Auth Tables (High Risk)
```sql
-- These affect user authentication and subscription
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

-- Deploy with backend still enforcing auth
-- Then gradually move enforcement to database
```

---

## Testing RLS Policies

### Test 1: Anonymous Access

```sql
-- Simulate anonymous user (no auth context)
-- This should fail to read private data

-- Expected: Error or empty result
SELECT * FROM "SavedCity" LIMIT 1;

-- Expected: Success
SELECT * FROM "City" LIMIT 1;
```

### Test 2: Authenticated User Access

```sql
-- Set test JWT token in header
-- Authorization: Bearer <test-jwt-token>

-- Using Supabase JavaScript client:
const { data, error } = await supabase
  .from('SavedCity')
  .select('*')
  .eq('userId', currentUserId);

// Expected: Only gets user's own saved cities
```

### Test 3: Cross-User Isolation

```sql
-- User A tries to access User B's data
-- Should be blocked by RLS policy

-- Query with User A's JWT:
SELECT * FROM "SavedCity"
WHERE userId = 'user-b-id';  -- Different user

-- Expected: Returns 0 rows (RLS blocks it)
```

### Test 4: Admin Access

```sql
-- Admin user with admin JWT claim
-- Should see all data

-- In Supabase Dashboard:
-- 1. Edit user profile
-- 2. Add custom claim: { "role": "admin" }
-- 3. Test query with that user's JWT

SELECT * FROM "SavedCity";  -- Should return all rows
```

### Test 5: Service Role (Cron/Webhooks)

```sql
-- Using service_role key (not user JWT)
-- Should have full access

-- In backend code:
const result = await supabaseAdmin
  .from('WeeklyRefreshLog')
  .insert({ yearWeek: '2026-W01', status: 'RUNNING' });

// Expected: Success
```

---

## Debugging RLS Issues

### Common Problems & Solutions

#### Problem 1: "Row-level security policy was violated"

**Cause:** Policy logic error or wrong user context

**Debug:**
```sql
-- Check if user exists
SELECT id, supabaseUserId FROM "User"
WHERE supabaseUserId = auth.uid()::text;

-- Check get_user_id_from_auth() returns value
SELECT get_user_id_from_auth();

-- Enable query logging
SET log_statement = 'all';
SELECT * FROM "SavedCity";
-- Check logs for policy evaluation
```

**Solution:**
```sql
-- Verify policy logic
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'SavedCity';

-- Test policy condition manually
SELECT userId = 'expected-user-id' AS policy_result
FROM "SavedCity" LIMIT 1;
```

#### Problem 2: Slow Queries

**Cause:** RLS filter is not using indexes

**Debug:**
```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM "SavedCity"
WHERE userId = get_user_id_from_auth();

-- Look for "Seq Scan" instead of "Index Scan"
```

**Solution:**
```sql
-- Create better indexes
CREATE INDEX idx_saved_city_user_id ON "SavedCity"(userId);

-- Or use BRIN indexes for large tables
CREATE INDEX idx_saved_city_user_brin
  ON "SavedCity" USING BRIN (userId);
```

#### Problem 3: Service Role Can't Write

**Cause:** Service role policy missing or incorrect

**Debug:**
```sql
-- Verify service_role can write
SET ROLE service_role;
INSERT INTO "WeeklyRefreshLog" (...) VALUES (...);

-- Check if policy exists
SELECT policyname FROM pg_policies
WHERE tablename = 'WeeklyRefreshLog'
AND policyname LIKE '%service%';
```

**Solution:**
```sql
-- Add service role policy
CREATE POLICY "weekly_refresh_write_service"
  ON "WeeklyRefreshLog"
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

---

## Migration from Application-Level to Database-Level Enforcement

### Current Architecture
```
Client → Backend (Express) → Prisma → PostgreSQL
                ↓
         Application checks req.user.id
         Adds WHERE userId = req.user.id
         Enforces authorization
```

### After RLS
```
Client → Supabase Client → PostgreSQL (RLS enforces)
         or
Client → Backend → Prisma → PostgreSQL (RLS enforces)
```

### Migration Plan

#### Step 1: Parallel Enforcement (Week 1)
- Enable RLS policies
- Keep backend authorization checks
- Monitor logs for violations
- Test with small user group

#### Step 2: Gradual Migration (Week 2-3)
- Update backend to remove redundant checks
- Move critical operations to RLS-enforced queries
- Test authentication flows thoroughly

#### Step 3: Remove Application Enforcement (Week 4)
- Verify no user reports issues
- Simplify backend code
- Update API documentation
- Monitor database performance

---

## Backend Integration

### How Backend Should Change

**Before RLS:**
```typescript
// Backend enforces user isolation
const viewedCities = await prisma.viewedCity.findMany({
  where: {
    userId: req.user.id,  // Application-level filter
  },
  orderBy: { lastViewedAt: 'desc' }
});
```

**After RLS:**
```typescript
// Database enforces user isolation
const viewedCities = await prisma.viewedCity.findMany({
  where: {
    // No userId filter needed - RLS handles it
  },
  orderBy: { lastViewedAt: 'desc' }
});
```

### Supabase Client Integration

For mobile/web direct database access:
```typescript
// iOS/Web client using Supabase client
const { data, error } = await supabase
  .from('ViewedCity')
  .select('*,city:City(*)')
  .order('lastViewedAt', { ascending: false });

// RLS automatically filters to current user
// Returns only their viewed cities
```

---

## Performance Considerations

### RLS Overhead

- **Average overhead**: 1-5% slower due to policy evaluation
- **Worst case**: 10-20% slower with complex policies
- **Index usage**: Critical for maintaining performance

### Optimization Techniques

#### 1. Use Indexes on Policy Fields
```sql
-- These indexes support the RLS filters
CREATE INDEX idx_user_activity_user_id
  ON "SavedCity"(userId);

CREATE INDEX idx_user_activity_user_timestamp
  ON "ViewedCity"(userId, lastViewedAt DESC);
```

#### 2. Avoid Subqueries in Policies
```sql
-- Slow: Subquery in policy
CREATE POLICY bad_policy ON "SavedCity"
  FOR SELECT
  USING (userId IN (SELECT id FROM "User" WHERE id = auth.uid()::text));

-- Fast: Direct function call
CREATE POLICY good_policy ON "SavedCity"
  FOR SELECT
  USING (userId = get_user_id_from_auth());
```

#### 3. Use STABLE Functions
```sql
-- Mark functions as STABLE for query optimization
CREATE FUNCTION get_user_id_from_auth()
RETURNS TEXT LANGUAGE sql STABLE ...;

-- Allow Postgres to cache results within a query
```

#### 4. Separate Policies by Operation
```sql
-- Instead of one complex policy
CREATE POLICY read_write ON "SavedCity"
  FOR SELECT USING (userId = get_user_id_from_auth())
  WITH CHECK (userId = get_user_id_from_auth());

-- Use specific policies
CREATE POLICY read_own ON "SavedCity" FOR SELECT USING (...);
CREATE POLICY write_own ON "SavedCity" FOR INSERT WITH CHECK (...);
```

---

## Security Checklist

- [ ] All user-specific tables have RLS enabled
- [ ] Public tables have explicit public read policies
- [ ] User IDs cannot be modified via UPDATE
- [ ] Service role policies are correctly scoped
- [ ] Admin role is securely managed (via JWT claims)
- [ ] Helper functions are SECURITY DEFINER
- [ ] Policies are tested with multiple user contexts
- [ ] Performance has been benchmarked
- [ ] Error logs are monitored for violations
- [ ] Documentation is up to date
- [ ] Team members are trained on RLS

---

## Monitoring & Alerts

### Recommended Monitoring

```sql
-- Create view for policy violations
CREATE OR REPLACE VIEW rls_violations AS
SELECT
  timestamp,
  client_query,
  error_message,
  error_code
FROM postgres_logs
WHERE error_message LIKE '%violates row-level security%'
ORDER BY timestamp DESC;

-- Query for suspicious activity
SELECT * FROM rls_violations
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

### Performance Monitoring

```sql
-- Check slow RLS queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%SavedCity%'
ORDER BY mean_exec_time DESC;
```

---

## Team Communication

### Announcement Template

> **Database Security Update: RLS Implementation**
>
> We're implementing Row-Level Security (RLS) policies to strengthen data isolation and enable direct database access from client applications.
>
> **Timeline:**
> - Phase 1 (Week 1): Deploy RLS with parallel enforcement
> - Phase 2 (Week 2-3): Gradual migration
> - Phase 3 (Week 4): Remove application-level checks
>
> **What changes:**
> - User data is now protected at the database level
> - Private tables (SavedCity, ViewedCity, etc.) require authentication
> - Admin operations require admin role
>
> **No action required** - This is transparent to end users
>
> **For developers:**
> - See [RLS_IMPLEMENTATION_GUIDE.md](RLS_IMPLEMENTATION_GUIDE.md)
> - Test with personal test account
> - Report any authorization errors

---

## Rollback Plan

If RLS causes critical issues:

```sql
-- Disable RLS on all tables
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedCity" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ViewedCity" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SearchedCity" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "City" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" DISABLE ROW LEVEL SECURITY;

-- Application-level authorization will take over
-- Verify all endpoints work correctly
```

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Reference](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Litplan Database Schema](DATABASE_SCHEMA_AND_RLS_ANALYSIS.md)
- [RLS Implementation SQL](RLS_POLICY_IMPLEMENTATION.sql)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Status**: Ready for implementation
