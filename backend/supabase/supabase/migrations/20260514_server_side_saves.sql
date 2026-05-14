-- Migration: server_side_saves
-- Adds SavedPlan and SavedGroupFlow tables, adds cityData/planData/flowData JSONB columns,
-- and standardises RLS across all three saved-item tables so the iOS app can sync.

-- ─── SavedCity: add cityData column + standard RLS policy ────────────────────

ALTER TABLE public."SavedCity"
    ADD COLUMN IF NOT EXISTS "cityData" JSONB;

-- Add standard auth.uid() policy alongside the existing custom-function one
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'SavedCity' AND policyname = 'savedcity_uid'
    ) THEN
        EXECUTE $pol$
            CREATE POLICY savedcity_uid
                ON public."SavedCity"
                FOR ALL
                USING (auth.uid()::text = "userId")
                WITH CHECK (auth.uid()::text = "userId");
        $pol$;
    END IF;
END $$;

-- ─── SavedPlan ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public."SavedPlan" (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"    TEXT        NOT NULL,
    "planId"    TEXT        NOT NULL,
    "planData"  JSONB       NOT NULL,
    "savedAt"   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT "SavedPlan_userId_planId_key" UNIQUE ("userId", "planId")
);

ALTER TABLE public."SavedPlan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_plan_own"
    ON public."SavedPlan"
    FOR ALL
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "saved_plan_service"
    ON public."SavedPlan"
    FOR ALL
    USING (auth.role() = 'service_role');

-- ─── SavedGroupFlow ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public."SavedGroupFlow" (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"    TEXT        NOT NULL,
    "flowId"    TEXT        NOT NULL,
    "flowData"  JSONB       NOT NULL,
    "savedAt"   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT "SavedGroupFlow_userId_flowId_key" UNIQUE ("userId", "flowId")
);

ALTER TABLE public."SavedGroupFlow" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_flow_own"
    ON public."SavedGroupFlow"
    FOR ALL
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "saved_flow_service"
    ON public."SavedGroupFlow"
    FOR ALL
    USING (auth.role() = 'service_role');
