-- ============================================================
-- Consolidated BoltTokens migration
-- Applies all pending changes in one shot:
--   1. Add cycleStartDate column (personalized refresh)
--   2. Update tokenCount default 5 → 7
--   3. Replace get_or_create_bolt_tokens (personalized cycle + 7 tokens)
--   4. Replace consume_bolt_token (personalized cycle + 7 tokens)
--   5. Replace refund_bolt_token (cap at 7)
--   6. Create user_free_tokens table + get/consume functions
-- ============================================================

-- ============================================================
-- STEP 1: Add cycleStartDate column and update tokenCount default
-- ============================================================

ALTER TABLE "BoltTokens"
ADD COLUMN IF NOT EXISTS "cycleStartDate" DATE;

-- Backfill existing rows with their record creation date
UPDATE "BoltTokens"
SET "cycleStartDate" = DATE("createdAt")
WHERE "cycleStartDate" IS NULL;

CREATE INDEX IF NOT EXISTS idx_bolt_tokens_cycle_start ON "BoltTokens"("cycleStartDate");

ALTER TABLE "BoltTokens" ALTER COLUMN "tokenCount" SET DEFAULT 7;

COMMENT ON COLUMN "BoltTokens"."cycleStartDate" IS 'The date when this user''s token refresh cycle started (their subscription start date)';

-- ============================================================
-- STEP 2: get_or_create_bolt_tokens (personalized cycle + 7 tokens)
-- ============================================================

DROP FUNCTION IF EXISTS get_or_create_bolt_tokens(UUID);

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

GRANT EXECUTE ON FUNCTION get_or_create_bolt_tokens(UUID) TO authenticated;

-- ============================================================
-- STEP 3: consume_bolt_token (personalized cycle + 7 tokens)
-- ============================================================

DROP FUNCTION IF EXISTS consume_bolt_token(UUID, VARCHAR, VARCHAR);

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

GRANT EXECUTE ON FUNCTION consume_bolt_token(UUID, VARCHAR, VARCHAR) TO authenticated;

-- ============================================================
-- STEP 4: refund_bolt_token (cap at 7)
-- ============================================================

DROP FUNCTION IF EXISTS refund_bolt_token(UUID);

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

GRANT EXECUTE ON FUNCTION refund_bolt_token(UUID) TO authenticated;

-- ============================================================
-- STEP 5: user_free_tokens table + functions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_free_tokens (
    user_id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_generation_at TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_free_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_free_tokens' AND policyname = 'Users manage own free tokens'
  ) THEN
    CREATE POLICY "Users manage own free tokens"
      ON public.user_free_tokens
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_free_token_status(p_user_id UUID)
RETURNS TABLE(
    available          BOOLEAN,
    last_generation_at TIMESTAMPTZ,
    days_until_reset   INT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_last_gen TIMESTAMPTZ;
BEGIN
    SELECT uft.last_generation_at INTO v_last_gen
    FROM public.user_free_tokens uft
    WHERE uft.user_id = p_user_id;

    RETURN QUERY
    SELECT
        CASE
            WHEN v_last_gen IS NULL THEN TRUE
            WHEN (NOW() - v_last_gen) >= INTERVAL '7 days' THEN TRUE
            ELSE FALSE
        END,
        v_last_gen,
        CASE
            WHEN v_last_gen IS NULL THEN 0
            WHEN (NOW() - v_last_gen) >= INTERVAL '7 days' THEN 0
            ELSE 7 - EXTRACT(DAY FROM (NOW() - v_last_gen))::INT
        END;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_free_bolt_token(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_free_tokens (user_id, last_generation_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
        SET last_generation_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_free_token_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_free_bolt_token(UUID) TO authenticated;
