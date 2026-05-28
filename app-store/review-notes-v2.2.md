# App Review Notes — LitPlanz v2.2 (Build 7)

**Submission type:** Update (previously approved as v2.1)
**Platform:** iOS 17.0+
**Submitted:** 2026-05-28

---

## What's new in v2.2

A follow-on release after v2.1 focused on the Vibez card UX, two behind-the-scenes reliability fixes (subscription persistence + token sync), and a new in-app update notice. **No new permissions** have been added since v2.0 — please note this for the review checklist.

Highlights:

1. **Vibez card UX overhaul** — animated "tap here" hint in the centre of the card, glow pulse when a freshly generated plan lands, end-time pill (e.g. "Ends 2:30 AM"), and the Vibez theme shown as a tag on every card.
2. **Date-grouped history** — Generated Vibez and Saved items are now grouped into Today / Yesterday / This Week / This Month / Earlier sections.
3. **"Refresh tokens" button** under the Vibez weekly counter (force-syncs the count with our backend).
4. **"Restore Purchases"** is now a row in **Profile → Settings** (was previously only reachable from the paywall footer).
5. **Subscription verification** now reliably persists trials + paid purchases to our backend. Previously the verify call was silently failing for some users, so the iOS app correctly granted Pro from StoreKit but our server didn't record it. **All Pro entitlement decisions on-device still come from StoreKit** — this change only affects our internal database accuracy and analytics.
6. **In-app "Update Available" prompt** — driven server-side via our `/health` endpoint. Currently shows nothing for reviewers (see "Known nuances" below).
7. **Recent-cities history** in the Vibez city search bar (top 10, newest first).
8. **Paywall trial copy** is now eligibility-gated — only advertises a free trial when the user is actually eligible for one (per `Product.SubscriptionInfo.isEligibleForIntroOffer`).

---

## Recommended testing flow (6–8 minutes)

### 1. Sign in (30s)
1. Launch the app.
2. Tap **Sign In with Email**.
3. Enter the demo credentials provided in the metadata.
4. You'll land on the **Vibez** tab.

### 2. Test the Vibez card UX (2 minutes)
1. On the Vibez tab you'll see the **sample card**. The new tap hint (a hand emoji that performs a double-tap motion) loops in the centre of the card with a small "Tap here" label.
2. Tap the card to open the detail sheet. The tap hint stops the moment you tap.
3. Close the detail sheet — the card is now still (no pulsing).
4. Tap **Select City**, search e.g. `Nairobi`, pick `Nairobi, Kenya`. Tap **Select Vibe**, pick `Rooftop`.
5. Tap the **bolt button** to generate a fresh plan.
6. **You should see:** the snake-path loading from v2.1 (~20–25 seconds), then a new plan card with:
   - A green/purple/pink **glow border pulse + breathing zoom** (the "new plan" attention effect)
   - A `NEW` badge next to `FEATURED PLAN`
   - The Vibez **theme name** as a tag (e.g. `Rooftop`)
   - At the bottom: `X hrs · $XX-XX` + a moon-icon pill `Ends X AM`
   - The tap-hint animation looping in the centre
7. Tap the card. The pulse and tap-hint stop. The `NEW` badge persists.

### 3. Test the date-grouped history (1 minute)
1. From the **Profile** tab, tap **Generated Vibez**.
2. Your generations are grouped by date headers (Today / Yesterday / etc.) with each plan's **theme** shown as a small chip on its row.

### 4. Test the new Settings actions (1 minute)
1. From the **Profile** tab, scroll to **Settings**.
2. Tap **Restore Purchases**. (If a sandbox subscription is active, this will sync it; otherwise an alert says "No active subscription found".)
3. Back on the **Vibez** tab, tap the **Refresh tokens** button under the weekly counter — the count icon spins briefly and a toast confirms it re-synced.

### 5. Test the city-search history (30s)
1. Tap **Select City** on the Vibez tab.
2. With the search bar empty, you should see a **"Recent searches"** list with `Nairobi, Kenya` from the earlier test at the top.
3. Tapping a recent city re-selects it instantly (no typing).

### 6. Paywall trial-eligibility check (optional, 1 minute)
1. Sign out (Profile → Sign Out).
2. Sign up with a fresh email.
3. Open the paywall (tap an upgrade entry point).
4. The yearly plan card and CTA show the trial copy ("Start Free Trial / 7-day free trial").
5. After a free-trial purchase, opening the paywall again on the same Apple ID shows **Subscribe Now** and **no trial copy** (because the user is no longer eligible).

---

## AI-generated content disclosure

Unchanged from v2.1. All plans are generated using OpenAI's GPT models; **venue addresses, ratings, and opening hours are then verified against Google Places API** before being shown to the user, so even if the model hallucinates a venue, it's filtered out before display. Plans are descriptive only (text, no AI-generated images). The app does not generate or modify any media.

---

## External services the app communicates with

Unchanged from v2.1:

| Domain | What it's for |
|---|---|
| `auth.litplanz.com` | Our Supabase project — authentication, plans database, edge functions |
| `litplan-production.up.railway.app` | Our Railway worker — runs the AI generation pipeline |
| `clktdigankjszupvrsqt.supabase.co` | Same Supabase project (default subdomain) |
| `*.openai.com` | OpenAI for plan generation (only from our server) |
| `maps.googleapis.com` | Google Places verification (only from our server) |
| `router.project-osrm.org` | OpenStreetMap routing for the embedded route polylines |
| `www.google.com/maps/dir/` | Google Maps Universal URL for the multi-stop directions button |
| `maps.apple.com` | Apple Maps deep link for individual venue pins |
| `apps.apple.com` / `itms-apps://` | Opened by the new in-app update prompt's "Update Now" button |

No analytics, advertising, or tracking SDKs are present in the app.

---

## Permissions

**No new permissions are introduced in v2.2.** The set is unchanged since v2.0: camera (QR codes for group activities), location-when-in-use (nearby venues), and photo library (save / share). All have user-friendly `INFOPLIST_KEY_NS…UsageDescription` strings configured.

---

## Known nuances worth flagging

- **The in-app update prompt won't show during review.** It's driven by a server-side config (`AppVersionConfig.latestAppVersion`) currently set to `2.1` — i.e. the previously-approved version. Reviewers running v2.2 will see no prompt (correct, because v2.2 *is* the latest). After v2.2 reaches users, we'll bump the server value to `2.2`, at which point v2.1-and-older users will see the prompt; v2.2 users still won't.
- **Subscription persistence** in v2.2 fixes a silent backend-side bug from v2.1 where trial / Pro purchases failed to record in our database (despite StoreKit correctly granting access on-device). **Pro entitlement on-device is unchanged — still authoritative via StoreKit.** This change only improves our server-side record keeping.
- The new **breathing zoom** on a freshly generated card is capped at 3% scale, so it never reaches the screen edges, and is disabled under Reduce Motion. The continuous tap-hint animation is also disabled under Reduce Motion (the static hand + label remain visible).
- **First generation in a fresh city can take 25–35 seconds** (carried over from v2.1's pipeline — unchanged).
- **Repeat generations of the same city + theme combination return instantly (<1s)** thanks to the 7-day result cache (unchanged from v2.1).

---

Thank you for reviewing LitPlanz v2.2. If anything in the app behaves unexpectedly or you'd like clarification on any feature, please reach out before rejecting — happy to record a quick walkthrough video or jump on a call.

— The LitPlanz team
