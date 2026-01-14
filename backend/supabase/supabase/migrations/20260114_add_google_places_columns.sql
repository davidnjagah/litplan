-- ============================================================
-- Add Google Places Columns to Plan Table
-- ============================================================
-- These columns store verified venue data from Google Places API
-- for accurate addresses and easy map navigation.
-- ============================================================

-- Add Google Place ID column
ALTER TABLE "Plan"
ADD COLUMN IF NOT EXISTS "googlePlaceId" VARCHAR(255);

-- Add Google Maps URL column
ALTER TABLE "Plan"
ADD COLUMN IF NOT EXISTS "googleMapsUrl" TEXT;

-- Create index on googlePlaceId for potential future queries
CREATE INDEX IF NOT EXISTS idx_plan_google_place_id ON "Plan"("googlePlaceId")
WHERE "googlePlaceId" IS NOT NULL;

-- Comments
COMMENT ON COLUMN "Plan"."googlePlaceId" IS 'Google Places API place_id for verified venues';
COMMENT ON COLUMN "Plan"."googleMapsUrl" IS 'Direct Google Maps URL for navigation to the venue';
