-- Rename clerkUserId to supabaseUserId in User table
-- This is a data-preserving migration (rename instead of drop/add)

-- Step 1: Drop existing indexes on clerkUserId
DROP INDEX IF EXISTS "User_clerkUserId_key";
DROP INDEX IF EXISTS "User_clerkUserId_idx";
DROP INDEX IF EXISTS "Subscription_clerkUserId_key";
DROP INDEX IF EXISTS "Subscription_clerkUserId_idx";

-- Step 2: Rename columns
ALTER TABLE "User" RENAME COLUMN "clerkUserId" TO "supabaseUserId";
ALTER TABLE "Subscription" RENAME COLUMN "clerkUserId" TO "supabaseUserId";

-- Step 3: Create new indexes with new column names
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");
CREATE INDEX "User_supabaseUserId_idx" ON "User"("supabaseUserId");
CREATE UNIQUE INDEX "Subscription_supabaseUserId_key" ON "Subscription"("supabaseUserId");
CREATE INDEX "Subscription_supabaseUserId_idx" ON "Subscription"("supabaseUserId");
