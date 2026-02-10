-- Add cost breakdown columns and tags to GroupFlow table
-- These store the AI-generated cost estimates and tags for each plan type

ALTER TABLE "GroupFlow"
ADD COLUMN IF NOT EXISTS "costMin" INTEGER,
ADD COLUMN IF NOT EXISTS "costMax" INTEGER,
ADD COLUMN IF NOT EXISTS "planType" TEXT,
ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN "GroupFlow"."costMin" IS 'AI-generated minimum cost estimate in local currency';
COMMENT ON COLUMN "GroupFlow"."costMax" IS 'AI-generated maximum cost estimate in local currency';
COMMENT ON COLUMN "GroupFlow"."planType" IS 'Plan category: couples, friend_groups, girls_trips, girls_night_out, boys_night_out, luxury, family, free_daytime, free_sunset, free_cultural, romantic';
COMMENT ON COLUMN "GroupFlow"."tags" IS 'AI-generated audience tags for the plan (e.g., romantic, couples, free, family_friendly)';
