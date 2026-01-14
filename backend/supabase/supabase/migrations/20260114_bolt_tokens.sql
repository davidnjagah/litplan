-- ============================================================
-- Bolt Token System Database Schema
-- Migration for tracking Pro user token usage
-- ============================================================

-- Create BoltTokens table for tracking user token balances
CREATE TABLE IF NOT EXISTS "BoltTokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tokenCount" INTEGER NOT NULL DEFAULT 5,
  "weekStartDate" DATE NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE)::date),
  "totalGenerations" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("userId", "weekStartDate")
);

-- Create BoltTokenUsage table for detailed usage tracking/analytics
CREATE TABLE IF NOT EXISTS "BoltTokenUsage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "cityName" VARCHAR(255),
  "themeName" VARCHAR(100),
  "success" BOOLEAN NOT NULL DEFAULT true,
  "refunded" BOOLEAN NOT NULL DEFAULT false,
  "groupFlowId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bolt_tokens_user_id ON "BoltTokens"("userId");
CREATE INDEX IF NOT EXISTS idx_bolt_tokens_week_start ON "BoltTokens"("weekStartDate");
CREATE INDEX IF NOT EXISTS idx_bolt_tokens_user_week ON "BoltTokens"("userId", "weekStartDate");
CREATE INDEX IF NOT EXISTS idx_bolt_usage_user_id ON "BoltTokenUsage"("userId");
CREATE INDEX IF NOT EXISTS idx_bolt_usage_created_at ON "BoltTokenUsage"("createdAt");

-- Enable RLS
ALTER TABLE "BoltTokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BoltTokenUsage" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for BoltTokens
-- Users can only read their own token balance
CREATE POLICY "Users can read own tokens" ON "BoltTokens"
  FOR SELECT USING (auth.uid() = "userId");

-- Users can update their own token balance
CREATE POLICY "Users can update own tokens" ON "BoltTokens"
  FOR UPDATE USING (auth.uid() = "userId");

-- Users can insert their own token record
CREATE POLICY "Users can insert own tokens" ON "BoltTokens"
  FOR INSERT WITH CHECK (auth.uid() = "userId");

-- RLS Policies for BoltTokenUsage
-- Users can only read their own usage history
CREATE POLICY "Users can read own usage" ON "BoltTokenUsage"
  FOR SELECT USING (auth.uid() = "userId");

-- Users can insert their own usage records
CREATE POLICY "Users can insert own usage" ON "BoltTokenUsage"
  FOR INSERT WITH CHECK (auth.uid() = "userId");

-- Service role has full access
GRANT ALL ON "BoltTokens" TO service_role;
GRANT ALL ON "BoltTokenUsage" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "BoltTokens" TO authenticated;
GRANT SELECT, INSERT ON "BoltTokenUsage" TO authenticated;

-- Function to get or create weekly token record
CREATE OR REPLACE FUNCTION get_or_create_bolt_tokens(p_user_id UUID)
RETURNS TABLE (
  token_count INTEGER,
  week_start_date DATE,
  total_generations INTEGER
) AS $$
DECLARE
  v_current_week DATE := (date_trunc('week', CURRENT_DATE)::date);
  v_record "BoltTokens"%ROWTYPE;
BEGIN
  -- Try to get existing record for current week
  SELECT * INTO v_record
  FROM "BoltTokens"
  WHERE "userId" = p_user_id AND "weekStartDate" = v_current_week;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" ("userId", "tokenCount", "weekStartDate", "totalGenerations")
    VALUES (p_user_id, 5, v_current_week, 0)
    RETURNING * INTO v_record;
  END IF;

  RETURN QUERY SELECT v_record."tokenCount", v_record."weekStartDate", v_record."totalGenerations";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume a token
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
  v_current_week DATE := (date_trunc('week', CURRENT_DATE)::date);
  v_token_count INTEGER;
BEGIN
  -- Get current token count
  SELECT "tokenCount" INTO v_token_count
  FROM "BoltTokens"
  WHERE "userId" = p_user_id AND "weekStartDate" = v_current_week
  FOR UPDATE;

  -- If no record, create one
  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" ("userId", "tokenCount", "weekStartDate", "totalGenerations")
    VALUES (p_user_id, 5, v_current_week, 0);
    v_token_count := 5;
  END IF;

  -- Check if tokens available
  IF v_token_count <= 0 THEN
    RETURN QUERY SELECT false, 0, 'No tokens remaining this week'::TEXT;
    RETURN;
  END IF;

  -- Consume token
  UPDATE "BoltTokens"
  SET
    "tokenCount" = "tokenCount" - 1,
    "totalGenerations" = "totalGenerations" + 1,
    "lastUsedAt" = NOW(),
    "updatedAt" = NOW()
  WHERE "userId" = p_user_id AND "weekStartDate" = v_current_week
  RETURNING "tokenCount" INTO v_token_count;

  -- Log usage
  INSERT INTO "BoltTokenUsage" ("userId", "cityName", "themeName", "success")
  VALUES (p_user_id, p_city_name, p_theme_name, true);

  RETURN QUERY SELECT true, v_token_count, 'Token consumed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund a token
CREATE OR REPLACE FUNCTION refund_bolt_token(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  remaining_tokens INTEGER
) AS $$
DECLARE
  v_current_week DATE := (date_trunc('week', CURRENT_DATE)::date);
  v_token_count INTEGER;
BEGIN
  -- Refund token (max 5)
  UPDATE "BoltTokens"
  SET
    "tokenCount" = LEAST("tokenCount" + 1, 5),
    "totalGenerations" = GREATEST("totalGenerations" - 1, 0),
    "updatedAt" = NOW()
  WHERE "userId" = p_user_id AND "weekStartDate" = v_current_week
  RETURNING "tokenCount" INTO v_token_count;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

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

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_or_create_bolt_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_bolt_token(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_bolt_token(UUID) TO authenticated;

-- Comments
COMMENT ON TABLE "BoltTokens" IS 'Tracks weekly token balances for Pro users in the Bolt feature';
COMMENT ON TABLE "BoltTokenUsage" IS 'Detailed log of each token consumption for analytics';
COMMENT ON FUNCTION get_or_create_bolt_tokens IS 'Gets or creates a token record for the current week';
COMMENT ON FUNCTION consume_bolt_token IS 'Consumes a token and logs the usage';
COMMENT ON FUNCTION refund_bolt_token IS 'Refunds a token if generation failed';
