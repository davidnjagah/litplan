-- ════════════════════════════════════════════════════════════════════════════
-- Hygiene cron — expire lapsed subscriptions
-- ════════════════════════════════════════════════════════════════════════════
-- Nightly job that flips lapsed PRO/TRIAL rows to EXPIRED so the stored `status`
-- column stays truthful for analytics/admin views.
--
-- This is purely cosmetic for access control: the read paths (getSubscriptionStatus
-- / isPremiumUser) already deny access via the `expiresDate > now()` guard, so a
-- lapsed-but-still-labelled-PRO row never grants Pro. The App Store Server
-- Notifications webhook is the primary, event-driven updater; this cron is the
-- safety net for cases where no notification arrives (or the URL wasn't configured).
--
-- Design choices:
--   • Only PRO/TRIAL are swept. GRACE_PERIOD is left to the webhook
--     (GRACE_PERIOD_EXPIRED) so legitimate billing-retry windows aren't revoked.
--   • A 1-hour buffer avoids flapping at the renewal boundary (DID_RENEW can lag
--     slightly behind the previous period's expiry).
--   • COALESCE(expiresDate, expiryDate) covers both the new and legacy expiry columns.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.expire_stale_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE "Subscription"
  SET "status" = 'EXPIRED', "updatedAt" = NOW()
  WHERE "status" IN ('PRO', 'TRIAL')
    AND COALESCE("expiresDate", "expiryDate") IS NOT NULL
    AND COALESCE("expiresDate", "expiryDate") < (NOW() - INTERVAL '1 hour');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Run nightly at 03:05 UTC (just after the vibez_cache prune at 03:00).
-- cron.schedule with a job name is idempotent: re-running updates the existing job.
SELECT cron.schedule(
  'expire-stale-subscriptions',
  '5 3 * * *',
  $$SELECT public.expire_stale_subscriptions();$$
);
