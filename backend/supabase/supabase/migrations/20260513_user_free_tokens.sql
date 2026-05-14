-- Migration: user_free_tokens
-- Tracks the last free Vibez generation per user (all signed-in users, not just email).
-- Server is the source of truth; iOS falls back to UserDefaults when offline.

CREATE TABLE IF NOT EXISTS public.user_free_tokens (
    user_id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_generation_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_free_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own free tokens"
    ON public.user_free_tokens
    FOR ALL
    USING (auth.uid() = user_id);

-- Returns whether the free weekly token is available for the given user.
-- Resets automatically after 7 days from last use.
CREATE OR REPLACE FUNCTION public.get_free_token_status(p_user_id UUID)
RETURNS TABLE(
    available          BOOLEAN,
    last_generation_at TIMESTAMPTZ,
    days_until_reset   INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_gen TIMESTAMPTZ;
BEGIN
    SELECT uft.last_generation_at INTO v_last_gen
    FROM public.user_free_tokens uft
    WHERE uft.user_id = p_user_id;

    RETURN QUERY
    SELECT
        CASE
            WHEN v_last_gen IS NULL               THEN TRUE
            WHEN (NOW() - v_last_gen) >= INTERVAL '7 days' THEN TRUE
            ELSE FALSE
        END AS available,
        v_last_gen AS last_generation_at,
        CASE
            WHEN v_last_gen IS NULL               THEN 0
            WHEN (NOW() - v_last_gen) >= INTERVAL '7 days' THEN 0
            ELSE 7 - EXTRACT(DAY FROM (NOW() - v_last_gen))::INT
        END AS days_until_reset;
END;
$$;

-- Records that the user just used their free token (upsert on user_id).
CREATE OR REPLACE FUNCTION public.consume_free_bolt_token(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_free_tokens (user_id, last_generation_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
        SET last_generation_at = NOW();
END;
$$;
