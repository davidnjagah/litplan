-- Sprint 10: Scalable User City Tracking
-- This migration adds SearchedCity model and optimizes ViewedCity for scale

-- Add lastViewedAt column to ViewedCity (for efficient sorting on each view)
ALTER TABLE "ViewedCity" ADD COLUMN "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create composite index for efficient paginated user history queries
CREATE INDEX "ViewedCity_userId_lastViewedAt_idx" ON "ViewedCity"("userId", "lastViewedAt");

-- Create SearchedCity table for tracking city searches
CREATE TABLE "SearchedCity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchedCity_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SearchedCity
CREATE INDEX "SearchedCity_userId_idx" ON "SearchedCity"("userId");
CREATE INDEX "SearchedCity_searchedAt_idx" ON "SearchedCity"("searchedAt");
CREATE INDEX "SearchedCity_userId_searchedAt_idx" ON "SearchedCity"("userId", "searchedAt");
