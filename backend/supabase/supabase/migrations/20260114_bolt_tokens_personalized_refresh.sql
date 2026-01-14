-- ============================================================
-- Personalized Token Refresh System
-- Tokens refresh based on user's subscription start date, not calendar weeks
-- ============================================================

-- Add cycleStartDate column to track when each user's refresh cycle started
ALTER TABLE "BoltTokens"
ADD COLUMN IF NOT EXISTS "cycleStartDate" DATE;

-- Update existing records to use their createdAt date as cycle start
UPDATE "BoltTokens"
SET "cycleStartDate" = DATE("createdAt")
WHERE "cycleStartDate" IS NULL;

-- Create index for cycle start date queries
CREATE INDEX IF NOT EXISTS idx_bolt_tokens_cycle_start ON "BoltTokens"("cycleStartDate");

-- Drop old function
DROP FUNCTION IF EXISTS get_or_create_bolt_tokens(UUID);

-- Create updated function that uses personalized refresh cycles
CREATE OR REPLACE FUNCTION get_or_create_bolt_tokens(p_user_id UUID)
RETURNS TABLE (
  token_count INTEGER,
  week_start_date DATE,
  total_generations INTEGER,
  cycle_start_date DATE
) AS $$
DECLARE
  v_record "BoltTokens"%ROWTYPE;
  v_cycle_start DATE;
  v_days_since_start INTEGER;
  v_current_cycle INTEGER;
  v_last_refresh_cycle INTEGER;
  v_needs_refresh BOOLEAN := false;
BEGIN
  -- Get the most recent record for this user
  SELECT * INTO v_record
  FROM "BoltTokens"
  WHERE "userId" = p_user_id
  ORDER BY "createdAt" DESC
  LIMIT 1;

  -- If no record exists, create one with today as cycle start
  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" (
      "userId",
      "tokenCount",
      "weekStartDate",
      "totalGenerations",
      "cycleStartDate"
    )
    VALUES (
      p_user_id,
      5,
      CURRENT_DATE,
      0,
      CURRENT_DATE
    )
    RETURNING * INTO v_record;

    RETURN QUERY SELECT
      v_record."tokenCount",
      v_record."weekStartDate",
      v_record."totalGenerations",
      v_record."cycleStartDate";
    RETURN;
  END IF;

  -- Get the cycle start date (use createdAt if cycleStartDate is null for backwards compatibility)
  v_cycle_start := COALESCE(v_record."cycleStartDate", DATE(v_record."createdAt"));

  -- Calculate days since cycle start
  v_days_since_start := CURRENT_DATE - v_cycle_start;

  -- Calculate current cycle number (0, 1, 2, ...)
  v_current_cycle := v_days_since_start / 7;

  -- Calculate which cycle the last refresh (weekStartDate) was in
  v_last_refresh_cycle := (v_record."weekStartDate" - v_cycle_start) / 7;

  -- Check if we need to refresh (new cycle)
  IF v_current_cycle > v_last_refresh_cycle THEN
    v_needs_refresh := true;
  END IF;

  -- If we need to refresh, update the record
  IF v_needs_refresh THEN
    UPDATE "BoltTokens"
    SET
      "tokenCount" = 5,
      "weekStartDate" = CURRENT_DATE,
      "updatedAt" = NOW()
    WHERE "id" = v_record."id"
    RETURNING * INTO v_record;
  END IF;

  RETURN QUERY SELECT
    v_record."tokenCount",
    v_record."weekStartDate",
    v_record."totalGenerations",
    v_cycle_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old consume function
DROP FUNCTION IF EXISTS consume_bolt_token(UUID, VARCHAR, VARCHAR);

-- Create updated consume function that uses personalized cycles
CREATE OR REPLACE FUNCTION consume_bolt_token(
  p_user_id UUID,
  p_city_name VARCHAR DEFAULT NULL,
  p_theme_name VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  remaining_tokens INTEGER,
  message TEXT
) AS $$
DECLARE
  v_record "BoltTokens"%ROWTYPE;
  v_cycle_start DATE;
  v_days_since_start INTEGER;
  v_current_cycle INTEGER;
  v_last_refresh_cycle INTEGER;
  v_token_count INTEGER;
BEGIN
  -- Get the most recent record for this user
  SELECT * INTO v_record
  FROM "BoltTokens"
  WHERE "userId" = p_user_id
  ORDER BY "createdAt" DESC
  LIMIT 1
  FOR UPDATE;

  -- If no record, create one
  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" (
      "userId",
      "tokenCount",
      "weekStartDate",
      "totalGenerations",
      "cycleStartDate"
    )
    VALUES (p_user_id, 5, CURRENT_DATE, 0, CURRENT_DATE)
    RETURNING * INTO v_record;
  END IF;

  -- Get cycle start date
  v_cycle_start := COALESCE(v_record."cycleStartDate", DATE(v_record."createdAt"));

  -- Calculate cycles
  v_days_since_start := CURRENT_DATE - v_cycle_start;
  v_current_cycle := v_days_since_start / 7;
  v_last_refresh_cycle := (v_record."weekStartDate" - v_cycle_start) / 7;

  -- Refresh tokens if in new cycle
  IF v_current_cycle > v_last_refresh_cycle THEN
    UPDATE "BoltTokens"
    SET
      "tokenCount" = 5,
      "weekStartDate" = CURRENT_DATE,
      "updatedAt" = NOW()
    WHERE "id" = v_record."id"
    RETURNING "tokenCount" INTO v_token_count;
  ELSE
    v_token_count := v_record."tokenCount";
  END IF;

  -- Check if tokens available
  IF v_token_count <= 0 THEN
    RETURN QUERY SELECT false, 0, 'No tokens remaining this cycle'::TEXT;
    RETURN;
  END IF;

  -- Consume token
  UPDATE "BoltTokens"
  SET
    "tokenCount" = "tokenCount" - 1,
    "totalGenerations" = "totalGenerations" + 1,
    "lastUsedAt" = NOW(),
    "updatedAt" = NOW()
  WHERE "id" = v_record."id"
  RETURNING "tokenCount" INTO v_token_count;

  -- Log usage
  INSERT INTO "BoltTokenUsage" ("userId", "cityName", "themeName", "success")
  VALUES (p_user_id, p_city_name, p_theme_name, true);

  RETURN QUERY SELECT true, v_token_count, 'Token consumed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old refund function
DROP FUNCTION IF EXISTS refund_bolt_token(UUID);

-- Create updated refund function
CREATE OR REPLACE FUNCTION refund_bolt_token(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  remaining_tokens INTEGER
) AS $$
DECLARE
  v_record "BoltTokens"%ROWTYPE;
  v_token_count INTEGER;
BEGIN
  -- Get the most recent record for this user
  SELECT * INTO v_record
  FROM "BoltTokens"
  WHERE "userId" = p_user_id
  ORDER BY "createdAt" DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Refund token (max 5)
  UPDATE "BoltTokens"
  SET
    "tokenCount" = LEAST("tokenCount" + 1, 5),
    "totalGenerations" = GREATEST("totalGenerations" - 1, 0),
    "updatedAt" = NOW()
  WHERE "id" = v_record."id"
  RETURNING "tokenCount" INTO v_token_count;

  -- Mark last usage as refunded
  UPDATE "BoltTokenUsage"
  SET "refunded" = true
  WHERE "id" = (
    SELECT "id" FROM "BoltTokenUsage"
    WHERE "userId" = p_user_id AND "refunded" = false
    ORDER BY "createdAt" DESC
    LIMIT 1
  );

  RETURN QUERY SELECT true, v_token_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on updated functions
GRANT EXECUTE ON FUNCTION get_or_create_bolt_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_bolt_token(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_bolt_token(UUID) TO authenticated;

-- Comments
COMMENT ON COLUMN "BoltTokens"."cycleStartDate" IS 'The date when this user''s token refresh cycle started (their subscription start date)';
COMMENT ON FUNCTION get_or_create_bolt_tokens IS 'Gets or creates a token record using personalized 7-day refresh cycles based on subscription start date';
COMMENT ON FUNCTION consume_bolt_token IS 'Consumes a token with automatic refresh if user is in a new cycle';
COMMENT ON FUNCTION refund_bolt_token IS 'Refunds a token if generation failed';
