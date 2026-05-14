-- Migration: increase Pro token limit from 5 → 7
-- Updates get_or_create_bolt_tokens, consume_bolt_token, and refund_bolt_token
-- to use the new weekly limit and adjusts the BoltTokens default.

ALTER TABLE "BoltTokens" ALTER COLUMN "tokenCount" SET DEFAULT 7;

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
  SELECT * INTO v_record
  FROM "BoltTokens"
  WHERE "userId" = p_user_id
  ORDER BY "createdAt" DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" (
      "userId", "tokenCount", "weekStartDate", "totalGenerations", "cycleStartDate"
    )
    VALUES (p_user_id, 7, CURRENT_DATE, 0, CURRENT_DATE)
    RETURNING * INTO v_record;

    RETURN QUERY SELECT
      v_record."tokenCount",
      v_record."weekStartDate",
      v_record."totalGenerations",
      v_record."cycleStartDate";
    RETURN;
  END IF;

  v_cycle_start := COALESCE(v_record."cycleStartDate", DATE(v_record."createdAt"));
  v_days_since_start := CURRENT_DATE - v_cycle_start;
  v_current_cycle := v_days_since_start / 7;
  v_last_refresh_cycle := (v_record."weekStartDate" - v_cycle_start) / 7;

  IF v_current_cycle > v_last_refresh_cycle THEN
    v_needs_refresh := true;
  END IF;

  IF v_needs_refresh THEN
    UPDATE "BoltTokens"
    SET "tokenCount" = 7, "weekStartDate" = CURRENT_DATE, "updatedAt" = NOW()
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
  SELECT * INTO v_record
  FROM "BoltTokens"
  WHERE "userId" = p_user_id
  ORDER BY "createdAt" DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" (
      "userId", "tokenCount", "weekStartDate", "totalGenerations", "cycleStartDate"
    )
    VALUES (p_user_id, 7, CURRENT_DATE, 0, CURRENT_DATE)
    RETURNING * INTO v_record;
  END IF;

  v_cycle_start := COALESCE(v_record."cycleStartDate", DATE(v_record."createdAt"));
  v_days_since_start := CURRENT_DATE - v_cycle_start;
  v_current_cycle := v_days_since_start / 7;
  v_last_refresh_cycle := (v_record."weekStartDate" - v_cycle_start) / 7;

  IF v_current_cycle > v_last_refresh_cycle THEN
    UPDATE "BoltTokens"
    SET "tokenCount" = 7, "weekStartDate" = CURRENT_DATE, "updatedAt" = NOW()
    WHERE "id" = v_record."id"
    RETURNING "tokenCount" INTO v_token_count;
  ELSE
    v_token_count := v_record."tokenCount";
  END IF;

  IF v_token_count <= 0 THEN
    RETURN QUERY SELECT false, 0, 'No tokens remaining this cycle'::TEXT;
    RETURN;
  END IF;

  UPDATE "BoltTokens"
  SET
    "tokenCount" = "tokenCount" - 1,
    "totalGenerations" = "totalGenerations" + 1,
    "lastUsedAt" = NOW(),
    "updatedAt" = NOW()
  WHERE "id" = v_record."id"
  RETURNING "tokenCount" INTO v_token_count;

  INSERT INTO "BoltTokenUsage" ("userId", "cityName", "themeName", "success")
  VALUES (p_user_id, p_city_name, p_theme_name, true);

  RETURN QUERY SELECT true, v_token_count, 'Token consumed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refund_bolt_token(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  remaining_tokens INTEGER
) AS $$
DECLARE
  v_record "BoltTokens"%ROWTYPE;
  v_token_count INTEGER;
BEGIN
  SELECT * INTO v_record
  FROM "BoltTokens"
  WHERE "userId" = p_user_id
  ORDER BY "createdAt" DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  UPDATE "BoltTokens"
  SET
    "tokenCount" = LEAST("tokenCount" + 1, 7),
    "totalGenerations" = GREATEST("totalGenerations" - 1, 0),
    "updatedAt" = NOW()
  WHERE "id" = v_record."id"
  RETURNING "tokenCount" INTO v_token_count;

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
