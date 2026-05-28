-- ════════════════════════════════════════════════════════════════════════════
-- BoltTokens hygiene — one row per user
-- ════════════════════════════════════════════════════════════════════════════
-- The original token design created one BoltTokens row per (userId, weekStartDate),
-- so long-lived users accumulated many rows (one had 10). The consolidated RPCs
-- already operate on the latest row per user, so the duplicates were invisible but
-- messy and confusing when debugging balances.
--
-- This migration: (1) sums lifetime totalGenerations onto each user's latest row,
-- (2) deletes the older duplicate rows, (3) replaces the (userId, weekStartDate)
-- unique key with a UNIQUE(userId) key, and (4) makes get_or_create / consume upsert
-- on userId so duplicates can never reappear (race-safe first-call).
-- Applied live via the Management API (see project rule).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Preserve lifetime generations on the row we keep (latest by createdAt).
WITH agg AS (
  SELECT "userId", SUM("totalGenerations") AS g, MAX("createdAt") AS keep
  FROM "BoltTokens" GROUP BY "userId"
)
UPDATE "BoltTokens" b
SET "totalGenerations" = agg.g
FROM agg
WHERE b."userId" = agg."userId" AND b."createdAt" = agg.keep;

-- 2) Delete the older duplicate rows.
DELETE FROM "BoltTokens" b
USING (SELECT "userId", MAX("createdAt") AS keep FROM "BoltTokens" GROUP BY "userId") k
WHERE b."userId" = k."userId" AND b."createdAt" < k.keep;

-- 3) One row per user from now on.
ALTER TABLE "BoltTokens" DROP CONSTRAINT IF EXISTS "BoltTokens_userId_weekStartDate_key";
ALTER TABLE "BoltTokens" ADD CONSTRAINT "BoltTokens_userId_key" UNIQUE ("userId");

-- 4) Make the RPCs upsert on userId (race-safe; no new duplicates).
CREATE OR REPLACE FUNCTION public.get_or_create_bolt_tokens(p_user_id uuid)
RETURNS TABLE(token_count integer, week_start_date date, total_generations integer, cycle_start_date date)
LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_record "BoltTokens"%ROWTYPE;
  v_cycle_start DATE;
  v_days_since_start INTEGER;
  v_current_cycle INTEGER;
  v_last_refresh_cycle INTEGER;
  v_needs_refresh BOOLEAN := false;
BEGIN
  SELECT * INTO v_record FROM "BoltTokens" WHERE "userId" = p_user_id ORDER BY "createdAt" DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" ("userId","tokenCount","weekStartDate","totalGenerations","cycleStartDate")
    VALUES (p_user_id, 7, CURRENT_DATE, 0, CURRENT_DATE)
    ON CONFLICT ("userId") DO UPDATE SET "updatedAt" = NOW()
    RETURNING * INTO v_record;
    RETURN QUERY SELECT v_record."tokenCount", v_record."weekStartDate", v_record."totalGenerations", v_record."cycleStartDate";
    RETURN;
  END IF;
  v_cycle_start := COALESCE(v_record."cycleStartDate", DATE(v_record."createdAt"));
  v_days_since_start := CURRENT_DATE - v_cycle_start;
  v_current_cycle := v_days_since_start / 7;
  v_last_refresh_cycle := (v_record."weekStartDate" - v_cycle_start) / 7;
  IF v_current_cycle > v_last_refresh_cycle THEN v_needs_refresh := true; END IF;
  IF v_needs_refresh THEN
    UPDATE "BoltTokens" SET "tokenCount" = 7, "weekStartDate" = CURRENT_DATE, "updatedAt" = NOW() WHERE "id" = v_record."id" RETURNING * INTO v_record;
  END IF;
  RETURN QUERY SELECT v_record."tokenCount", v_record."weekStartDate", v_record."totalGenerations", v_cycle_start;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_bolt_token(p_user_id uuid, p_city_name character varying DEFAULT NULL::character varying, p_theme_name character varying DEFAULT NULL::character varying)
RETURNS TABLE(success boolean, remaining_tokens integer, message text)
LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_record "BoltTokens"%ROWTYPE;
  v_cycle_start DATE;
  v_days_since_start INTEGER;
  v_current_cycle INTEGER;
  v_last_refresh_cycle INTEGER;
  v_token_count INTEGER;
BEGIN
  SELECT * INTO v_record FROM "BoltTokens" WHERE "userId" = p_user_id ORDER BY "createdAt" DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO "BoltTokens" ("userId","tokenCount","weekStartDate","totalGenerations","cycleStartDate")
    VALUES (p_user_id, 7, CURRENT_DATE, 0, CURRENT_DATE)
    ON CONFLICT ("userId") DO UPDATE SET "updatedAt" = NOW()
    RETURNING * INTO v_record;
  END IF;
  v_cycle_start := COALESCE(v_record."cycleStartDate", DATE(v_record."createdAt"));
  v_days_since_start := CURRENT_DATE - v_cycle_start;
  v_current_cycle := v_days_since_start / 7;
  v_last_refresh_cycle := (v_record."weekStartDate" - v_cycle_start) / 7;
  IF v_current_cycle > v_last_refresh_cycle THEN
    UPDATE "BoltTokens" SET "tokenCount" = 7, "weekStartDate" = CURRENT_DATE, "updatedAt" = NOW() WHERE "id" = v_record."id" RETURNING "tokenCount" INTO v_token_count;
  ELSE
    v_token_count := v_record."tokenCount";
  END IF;
  IF v_token_count <= 0 THEN
    RETURN QUERY SELECT false, 0, 'No tokens remaining this cycle'::TEXT;
    RETURN;
  END IF;
  UPDATE "BoltTokens" SET "tokenCount" = "tokenCount" - 1, "totalGenerations" = "totalGenerations" + 1, "lastUsedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = v_record."id" RETURNING "tokenCount" INTO v_token_count;
  INSERT INTO "BoltTokenUsage" ("userId","cityName","themeName","success") VALUES (p_user_id, p_city_name, p_theme_name, true);
  RETURN QUERY SELECT true, v_token_count, 'Token consumed successfully'::TEXT;
END;
$function$;
