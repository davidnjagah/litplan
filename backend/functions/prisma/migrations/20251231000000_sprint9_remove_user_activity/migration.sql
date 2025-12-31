-- Sprint 9: Remove UserActivity model and ActivityType enum
-- Activity tracking is now simplified to use ViewedCity and SavedCity tables only

-- Step 1: Drop the UserActivity table
DROP TABLE IF EXISTS "UserActivity";

-- Step 2: Drop the ActivityType enum
DROP TYPE IF EXISTS "ActivityType";
