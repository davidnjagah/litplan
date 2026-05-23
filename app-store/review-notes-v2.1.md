# App Review Notes — LitPlanz v2.1 (Build 6)

**Submission type:** Update (previously approved as v2.0)
**Platform:** iOS 17.0+
**Submitted:** 2026-05-23

---

## What's new in v2.1

This update is mostly an under-the-hood infrastructure release plus three user-visible improvements. **No new permissions** have been added since v2.0 — please note this for the review checklist.

1. **New loading animation** during plan generation (snake-path tracing)
2. **Updated map embed** — the "Open in Maps" button on each plan now opens the full multi-stop route in Google Maps; tapping an individual pin opens that single venue in Apple Maps
3. **Saved tab now sorts newest-first**

The remaining changes are backend (AI pipeline migration to async processing — invisible to the user except plans now generate faster for popular city/theme combinations).

---


## Recommended testing flow (5–7 minutes)

### 1. Sign in (30s)
1. Launch the app
2. Tap "Sign In with Email"
3. Enter the demo credentials above
4. You'll land on the **Bolt** tab (the Vibez generation screen)

### 2. Test the new loading animation (1 minute)
1. The screen shows a city selector and theme tags
2. Tap a city — e.g. `Nairobi, Kenya` — then tap the theme `Rooftop`
3. Tap the **bolt button** to generate
4. **You should see:** a serpentine path animation tracing from top to bottom with 3 location pins popping in. This is the new generation loading state — typically 20–25 seconds end-to-end.
5. After completion, a plan card appears with 3 verified venues

### 3. Test the new map behaviour (2 minutes)
1. Scroll down on the plan card until you see the embedded route map
2. **Tap the map icon button at the top-right of the embed** — Google Maps app (or Safari falling back to Google Maps web) opens with all 3 venues connected as a multi-stop driving route, with no prompt for your current location
3. Return to LitPlanz (app switcher)
4. **Tap any individual pin on the embedded map** — Apple Maps opens with that single venue and driving directions ready

### 4. Test newest-first saved tab (1 minute)
1. In LitPlanz, tap the heart icon on the current plan card to save it
2. Tap the **Saved** tab in the bottom nav
3. Tap **Vibez** section — the plan you just saved should be **at the top of the list**, above any older plans

### 5. Free-tier testing (optional, 2 minutes)
If you want to verify free-user behaviour:
1. Sign out (Profile → Sign Out)
2. Sign up with a fresh email
3. You get **1 free generation per week** and 3 free saves per category
4. After 1 generation, the bolt button shows the paywall

---

## AI-generated content disclosure

All plans are generated using OpenAI's GPT models. **Venue addresses, ratings, and opening hours are then verified against Google Places API** before being shown to the user — so even if the AI hallucinates a venue, it's filtered out before display.

Plans are descriptive only (text, no AI-generated images). The app does not generate or modify any media.

---

## External services the app communicates with

If your network inspection notices traffic to non-Apple domains during testing, these are all owned and operated by us:

| Domain | What it's for |
|---|---|
| `auth.litplanz.com` | Our Supabase project — authentication, plans database, edge functions |
| `litplan-production.up.railway.app` | Our Railway worker — runs the AI generation pipeline (background processing for plans) |
| `clktdigankjszupvrsqt.supabase.co` | Same Supabase project (default subdomain) |
| `*.openai.com` | OpenAI for plan generation (only from our server, not the iOS app directly) |
| `maps.googleapis.com` | Google Places verification (only from our server) |
| `router.project-osrm.org` | OpenStreetMap routing service for the embedded route polylines |
| `www.google.com/maps/dir/` | Google Maps Universal URL for the multi-stop directions button |
| `maps.apple.com` | Apple Maps deep link for individual venue pins |

No analytics, advertising, or tracking SDKs are present in the app.

---

No new permissions are introduced in v2.1.

---

## Known nuances worth flagging

- **First generation in a fresh city can take 25–35 seconds.** This is expected — the app pings multiple AI models and verifies every suggested venue against Google Places. The new snake-path animation is designed to make the wait feel intentional rather than frozen.
- **Repeat generations of the same city+theme combination return instantly (<1s)** thanks to a 7-day cache layer. This may look unusual after a slow first generation — it's the intended behaviour.
- **Map embed routes follow real streets globally** — even in cities where Apple Maps' own routing has limited coverage. We use OSRM (OpenStreetMap routing) on the embedded preview map so the route line always traces real roads.

---

Thank you for reviewing LitPlanz v2.1. If anything in the app behaves unexpectedly or you'd like clarification on any feature, please reach out before rejecting — happy to record a quick walkthrough video or jump on a call.

— The LitPlanz team
