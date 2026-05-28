# Changelog

---

## 2026-05-27 — Vibez UX + tokens build (Phases 0–4)

Pre-release batch (client-only; ships in the next build). Each phase was build-gated.

- **Foundations:** added `GroupFlow.theme` (Vibez theme tag) and per-item `savedAt` tracking
  in `SavedItemsManager` (`savedAtById`, populated from server rows + local saves).
- **Parallax (Phase 1):** disabled gyroscope/device-tilt on the 3D card (`MotionManager.tiltEnabled = false`,
  `startMotionUpdates()` now a no-op) — the card responds to **touch drag only**. Saves battery.
- **Card UX (Phase 2):** replaced the faint "Tap to explore" with a prominent, gently pulsing
  **"Tap to view your plan"** CTA (Reduce-Motion aware). On generation success the card plays a
  one-shot **new-plan attention effect** — pulsing glow border + NEW badge + success haptic,
  settling after ~4.5s (driven by `BoltView.showNewPlanHighlight`, card re-keyed by `groupFlow.id`).
- **Tokens/Sub (Phase 3):** added a **"Refresh tokens"** button under the Vibez counter
  (`BoltTokenManager.loadTokensAsync` + free-state reload); changed the Profile "Subscription
  Management" row to **Restore Purchases**; shipped the earlier token-guard fix.
- **Theme tag + dates (Phase 4):** generated plans are tagged with their theme on the hero card,
  the detail view, and the generated-Vibez list. Added date-section headers (Today / Yesterday /
  This Week / This Month / Earlier) to Generated Vibez (`generatedAt`) and Saved items (`savedAt`),
  via a shared `DateSectionGrouper`.

Not included (deferred): push notifications (Phase 5) — needs an APNs key + capability.

## 2026-05-27

### Fix: Pro tokens showing 0 after upgrade + BoltTokens de-duplication

A newly-upgraded Pro user saw 0 Vibez tokens even though the server had granted them.
Root cause: the "fresh-upgrade guard" in `BoltTokenManager.loadTokensAsync` kept the local
token count whenever the local subscription-start date was newer than the server row's
`cycleStartDate`. For any pre-existing user that condition is permanently true after upgrading
(their server cycle predates the upgrade), so the app ignored the server's real balance and
could stay stuck at 0.

- **iOS fix (B):** the guard now keeps the local count ONLY when local actually has MORE tokens
  than the server (protecting freshly-granted upgrade tokens the server hasn't applied yet);
  otherwise the server count is authoritative. Ships in the next build.
- **Immediate server unblock (A):** for the affected live account, set the active token row's
  cycle anchor to the purchase date and tokens to 7, so the *current* installed app stops
  overriding the server. Verified via the RPC.
- **Data hygiene (C, migration `20260527_bolt_tokens_dedupe_unique_userid.sql`):** the old design
  created one `BoltTokens` row per (userId, weekStartDate); long-lived users had up to 10 rows
  (34 rows / 13 users). Consolidated to one row per user (lifetime `totalGenerations` summed onto
  the kept row), swapped the unique key to `UNIQUE(userId)`, and made `get_or_create_bolt_tokens`
  / `consume_bolt_token` upsert on `userId` (race-safe) so duplicates can't reappear. Applied live.

## 2026-05-26

### Fix: App Store subscriptions / trials now persist to the database

Purchases were never reaching the `Subscription` table — Pro status lived only in
the StoreKit + UserDefaults cache, so it vanished on relaunch (tokens with it). The
`subscription/verify` edge function had drifted from the live schema and failed in
five independent ways (any one fatal):

1. iOS sent **snake_case** keys (`transaction_id`, `product_id`, `expires_date`…) but
   the function read **camelCase** → `400 Missing required fields` (the active blocker).
2. Upserted column `expiresAt`, which doesn't exist (table has `expiresDate`/`expiryDate`).
3. Wrote lowercase `status:'active'`, `tier:'pro'`; live enums are UPPERCASE
   `SubscriptionStatus{FREE,PRO,TRIAL,…}` / `SubscriptionTier{FREE,PRO}` (`'active'` invalid).
4. `onConflict:'userId'` with no unique constraint on `userId`.
5. `id` NOT NULL with no default, and `supabaseUserId` NOT NULL never set.

iOS also **swallowed** the verify failure ("non-blocking"), so the dead endpoint was invisible.

**Server (live, via Management API + edge deploys):**
- `Subscription`: `id` default `gen_random_uuid()::text`, `updatedAt` default `now()`, added `UNIQUE("userId")`.
- Rewrote `verifySubscription` + `restorePurchases` (`functions/subscription`): accept snake_case
  (tolerate camelCase), real columns, valid enums (`PRO`/`TRIAL`, tier `PRO`), write expiry to
  both `expiresDate`+`expiryDate`, populate `supabaseUserId`, omit `id`. Fixed `getSubscriptionStatus`
  and `isPremiumUser` (`_shared/auth.ts`, also used by `group-flows`) to read real columns/enums.
- New `functions/subscription-notifications` (deployed `--no-verify-jwt`): App Store Server
  Notifications V2 webhook — verifies Apple's JWS (x5c leaf, ES256) and updates the row by
  `originalTransactionId` on RENEW/EXPIRE/GRACE/REFUND/REVOKE.

**iOS (`SubscriptionManager.swift`):**
- Sends `is_trial` (from the StoreKit introductory offer) so trials persist as `TRIAL`.
- Verify failures are no longer swallowed — they're queued (`pendingSubscriptionVerify`) and
  retried on launch/foreground (`flushPendingVerify`).
- Durable Pro fallback (`reconcileWithBackendStatus`): if StoreKit shows no active entitlement
  but the backend `Subscription` record is active+unexpired, grant Pro (upgrade-only, never revoke)
  and reload tokens — so reopening no longer drops Pro/tokens when the StoreKit cache lapses.

**Hardening (done same day):**
- iOS `purchase()` now sets `appAccountToken` = Supabase user id. The webhook prefers it
  (match by `userId`), falling back to `originalTransactionId` for pre-existing purchases.
- Webhook now does **full x5c chain verification + Apple Root CA G3 pinning** (`jsrsasign`):
  every cert must be signed by the next, and the root must match the pinned Apple G3
  fingerprint. Fail-closed; break-glass `ASSN_REQUIRE_CHAIN=false` (and `ASSN_PINNED_ROOTS`
  override) available. Forged self-signed chains are rejected (verified); a genuine
  Apple-signed chain can only be validated by a real sandbox notification — the 400 `detail`
  field reports exactly where verification fails.

**Lifecycle notes:** free-trial users land in the SAME `Subscription` table with `status='TRIAL'`
(`tier='PRO'`); treated as active. On cancel/lapse the row is NOT deleted — `status` →
`EXPIRED`/`CANCELLED` via the webhook, and access is denied either way by the read-side
`expiresDate > now()` guard.

**Hygiene cron (added):** `expire_stale_subscriptions()` + pg_cron job `expire-stale-subscriptions`
(nightly 03:05 UTC, migration `20260526_expire_stale_subscriptions.sql`) flips lapsed `PRO`/`TRIAL`
rows to `EXPIRED` so the stored status stays truthful for analytics. Safety net only (the webhook
is the primary event-driven updater); skips `GRACE_PERIOD` (webhook-managed) and uses a 1-hour
buffer to avoid renewal-boundary flapping. Verified: lapsed PRO/TRIAL → EXPIRED; active /
within-buffer / grace rows untouched.

### Paywall: free-trial copy is now eligibility-gated + data-driven (both plans)

Previously `PaywallView` hardcoded "Start Free Trial" / "7-day free trial, then $39.99/year"
for the **yearly** plan only, unconditionally — so a returning user who'd already used their
trial saw a trial promise but was charged in full (misleading; App Review/refund risk), and the
**monthly** plan showed no trial messaging at all.

Now (`PaywallView.swift`): trial copy is derived from each product's StoreKit
`introductoryOffer` and gated on `subscription.isEligibleForIntroOffer` (per subscription group):
- CTA button shows "Start Free Trial" only when the selected plan is actually trial-eligible, else "Subscribe Now".
- Legal line and a per-card badge ("7-day free trial") render for **whichever plan** is eligible — so monthly shows its trial too. Period is formatted from the real offer (weeks normalised to days).
- Eligibility is computed async after products load (`refreshTrialEligibility`).

StoreKit test configs aligned: both `ios-app/Configuration.storekit` and
`ios-app/Litplan/Configuration/Subscriptions.storekit` now put both products in one "Litplan Pro"
group with a `free P1W` (7-day) intro offer (was 3-day / inconsistent / monthly missing).

**Note:** the monthly trial badge only appears in production if the monthly product has a 7-day
introductory offer configured in **App Store Connect** (Subscriptions → product → Introductory
Offers). The `.storekit` change only affects local/sandbox testing.

**Manual follow-ups remaining:** (1) set the ASSN Production + Sandbox URLs in App Store Connect
(App Information → App Store Server Notifications, V2) to
`https://clktdigankjszupvrsqt.supabase.co/functions/v1/subscription-notifications`;
(2) ship the iOS build (server changes are live; iOS changes are not yet released).

## 2026-05-11

### App Structure — Simplify to 3-Tab Layout

Removed the Explore and Search screens to reduce costs and focus the app on Vibez as the core feature.

**Tab bar** (`ContentView.swift`):
- Removed Explore (HomeView) and Search (SearchView) tabs
- New tab order: `0=Vibez`, `1=Saved`, `2=Profile`
- City deep link handler (`DeepLinkHandler.swift`) updated to post `navigateToVibezWithCity` instead of the now-dead `navigateToDiscoveredCity`
- Empty state CTA in `MyPlansView` now navigates to Vibez tab via notification

**Onboarding** — restructured to 5-page Vibez-first flow:
1. Welcome (unchanged)
2. Vibez Mode — "Pick a Vibe, Build Your Night" (was page 3, moved to 2)
3. Your Plans, Saved — new page introducing the Save/heart tab (replaced Group Flows page)
4. Pro Benefits — updated description and comparison cards
5. Get Started — Vibez-focused CTA copy

**Paywall** (`PaywallView.swift`, `PaywallTrigger.swift`):
- Replaced 7 Explore-era benefits with 5 Vibez-focused ones: Unlimited Vibez, All 100+ cities, All 26 vibe themes, Save unlimited plans, Group flow experiences
- `groupFlow` trigger (fired by BoltView) reframed as "Unlock Unlimited Vibez" with city-specific copy
- `cityDiscovery` trigger updated to Vibez limit messaging

**Backend** (`weeklyPlanRefresh.ts`):
- Disabled monthly plan generation cron — saves ~$130/month
- Re-enable by changing `const` back to `export const` on line 156

**Code cleanup** (Sprint 6):
- Deleted `HomeView.swift` and `SearchView.swift` (1,666 lines removed)
- Deleted `CityPreloadService.swift` — only consumed by SearchView
- Removed all pbxproj references for deleted files
- Removed `navigateToDiscoveredCity` dead notification name from `PushNotificationManager`
- Updated stale accessibility hints referencing "50 nightlife plans"
- `CitySearchManager` kept — still used by `BoltCitySelector` and `CitySearchSelector`

---

## 2026-05-07

### Password Reset Flow

- Audited the full password reset flow end-to-end (iOS app, web, Supabase Auth, email templates)
- Confirmed both paths work: iOS deep link (`com.litplanz.app://auth-callback`) and browser (`/auth/reset-password`)
- Documented flow in `docs/email-templates.md`

### Password Reset Success Email

- Added `generatePasswordResetSuccessEmail()` template to the `send-notification` edge function
  - Branded dark-themed email with green success icon
  - Includes "Wasn't you?" security warning with `support@litplanz.com` contact
- Fixed `FROM_EMAIL` in `send-notification` from `hello@notify.litplanz.com` → `noreply@litplanz.com` (verified Resend domain)
- **iOS** (`AuthenticationManager.swift`): fires success email after `auth.update(password:)` succeeds, before signing out. Uses active session for email + access token
- **Web** (`website/auth/reset-password.html`): fires success email after `auth.updateUser()` succeeds, non-blocking
- Deployed `send-notification` edge function to production (`clktdigankjszupvrsqt`)

### Secrets & SMTP

- `RESEND_API_KEY` rotated and updated in two places:
  - Supabase Dashboard → Settings → Edge Functions (for `send-notification`)
  - Supabase Dashboard → Authentication → SMTP Settings (for Supabase Auth emails)

> **Important:** Both locations must always use the same Resend API key. Rotating the key in one place without updating the other will break either transactional emails or auth emails.

### Free Trial — 7 Days

- Updated App Store Connect: yearly subscription introductory offer changed from 3 days → 1 week (7 days)
  - Located at: Subscriptions → [Group] → subscription → Subscription Prices → Introductory Offers
- Updated `PaywallView.swift` display copy from "3-day free trial" → "7-day free trial"

### Free Weekly Vibez Generation (Email Users)

- Free users who signed in via email now receive **1 Vibez generation per week**
- Token resets 7 days after last use; non-email free users (Apple/Google) see the paywall
- **`BoltTokenManager.swift`** changes:
  - Added `freeTokenUsedDateKey` (`bolt_free_token_used_date`) UserDefaults key
  - Added `@Published var freeTokenAvailable: Bool`
  - Added `isEmailUser` — reads provider from `appMetadata` / `userMetadata`
  - Added `canFreeEmailUserGenerate` — non-Pro + email user + token available
  - Added `loadFreeTokenState()` — called on init and every foreground resume
  - Added `consumeFreeToken()` — stamps date, sets `freeTokenAvailable = false`
  - Added `daysUntilFreeTokenRefresh` — for toast countdown messaging
  - Hooked `loadFreeTokenState()` into `setupWeeklyRefreshCheck()` foreground observer
- **`BoltView.swift`** changes:
  - `canGenerate` now returns true for free email users with available token
  - `generationDisabledReason` shows countdown instead of paywall prompt for email users
  - `handleBoltTap()` routes correctly: Pro → Pro tokens, free email → free token, free non-email → paywall
  - `generateGroupFlow(useFreeToken:)` consumes the correct token type on success only

### Onboarding Copy

- **Vibez screen** (`OnboardingPage.swift`): description updated to mention free weekly Vibez for email members
- **Pro comparison screen** (`ProComparisonPageView.swift`):
  - Free card: "Basic vibes" → "1 Vibez/week (email)"
  - Pro card: "All vibes" → "Unlimited Vibez"

### Documentation

- Created `docs/email-templates.md` — all email templates, reset flow, secrets reference
- Created `docs/free-tier.md` — free tier feature breakdown, weekly Vibez logic, free trial details
- Created `docs/changelog.md` — this file
