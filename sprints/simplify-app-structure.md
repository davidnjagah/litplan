# Sprint Plan: Simplify App Structure
**Objective:** Remove Explore and Search screens to reduce running costs, make Vibez the default landing screen, and realign onboarding and paywall copy to match the new structure.

**Date Created:** 2026-05-11
**Status:** Awaiting Approval

---

## Full Impact Analysis

### What's Being Removed
- **Explore tab (HomeView)** — `ios-app/Litplan/Views/HomeView.swift` (1,005 lines)
  - Trending cities, recommended group plans, weekend plans sections
  - Calls `APIService.fetchCitiesWithFallback()` and `GroupFlow.sampleGroupFlows`
- **Search tab (SearchView)** — `ios-app/Litplan/Views/SearchView.swift` (661 lines)
  - City search via MapKit, trending cities grid
  - Uses `CitySearchManager` and `CityPreloadService`
- **Monthly plan generation job** — `backend/functions/src/scheduled/weeklyPlanRefresh.ts`
  - Runs 1st of every month, generates 50 plans + 10 group flows per city via Claude AI
  - Costs ~$130/month — no users benefit from this without the Explore screen

### What's Staying (Unchanged)
- **Vibez / Bolt screen** — becomes the new home
- **Save / My Plans screen** — fully intact
- **Profile / Settings screen** — fully intact
- **`syncSubscriptionStatus` scheduled job** — keep, it manages Pro user entitlements
- **`SearchedCitiesView`** in Profile — different from the Search tab, keep it
- **Deep link city routing** — routes city deep links into Vibez with city pre-selected
- **`CityDetailsView`** — still accessible from saved cities

### Files Changed (Not Deleted) in This Plan
| File | Change |
|---|---|
| `ios-app/Litplan/ContentView.swift` | Remove 2 tabs, renumber, set Vibez as default (tab 0) |
| `ios-app/Litplan/Views/Onboarding/OnboardingPage.swift` | Restructure 6 pages into new 5-page flow |
| `ios-app/Litplan/Views/Onboarding/ProComparisonPageView.swift` | Update free/pro feature comparison |
| `ios-app/Litplan/Views/PaywallView.swift` | Remove Explore-specific benefits, reframe around Vibez |
| `ios-app/Litplan/Views/MyPlansView.swift` | Remove `onSwitchToExplore` callback |
| `backend/functions/src/scheduled/weeklyPlanRefresh.ts` | Disable the cron schedule |

### Files to Delete
| File | Reason |
|---|---|
| `ios-app/Litplan/Views/HomeView.swift` | Explore screen — fully removed |
| `ios-app/Litplan/Views/SearchView.swift` | Search screen — fully removed |

### Navigation Index Changes
Current tabs: `0=Explore, 1=Search, 2=Vibez, 3=Saved, 4=Profile`
New tabs: `0=Vibez, 1=Saved, 2=Profile`

The `navigateToVibezWithCity` notification handler in `ContentView.swift` sets `selectedTab = 2` — this must change to `selectedTab = 0`.

---

## Sprint 1 — Tab Bar & Core Navigation

**Goal:** Remove Explore and Search from the tab bar, make Vibez the default screen, fix all navigation references.

### Tasks

**1.1 — Remove Explore and Search tabs from ContentView**
- File: `ContentView.swift`
- Remove the `HomeView` tab block (lines 59–68)
- Remove the `SearchView` tab block (lines 70–75)
- Remove the `onNavigateToSearch` callback passed to HomeView
- Remove the `pendingVibezCity` / `onNavigateToSearch` state vars if only used by those two views
- Change `@State private var selectedTab = 0` to remain 0 — Vibez will now be tab 0

**1.2 — Reorder remaining tabs**
- File: `ContentView.swift`
- New order: `.tag(0)` = Vibez, `.tag(1)` = Saved, `.tag(2)` = Profile
- Update all `.tag()` values accordingly

**1.3 — Fix navigateToVibezWithCity notification handler**
- File: `ContentView.swift` lines 108–116
- Change `selectedTab = 2` → `selectedTab = 0` (Vibez is now tab 0)

**1.4 — Remove onNavigateToSearch from HomeView**
- File: `HomeView.swift`
- Remove `onNavigateToSearch` property and all call sites (line 13, line 269)
- This file will be deleted in Sprint 6 but clean it up here so no compile errors block earlier sprints

**1.5 — Remove MyPlansView explore callback**
- File: `MyPlansView.swift` line 99
- Remove `onSwitchToExplore` callback reference (already commented out per analysis — confirm and clean up)

---

## Sprint 2 — App Launch & Default Screen

**Goal:** Ensure the app opens to Vibez on every launch and all entry points route correctly.

### Tasks

**2.1 — Confirm default tab is Vibez**
- File: `ContentView.swift`
- Verify `@State private var selectedTab = 0` maps to the Vibez tab after Sprint 1 reordering
- Test cold launch, background resume, and deep link entry

**2.2 — Update Vibez tab icon and label**
- File: `ContentView.swift`
- Review whether the Vibez tab label and icon are appropriate as the primary/home tab
- Consider using a home-like label or keeping "Vibez" — confirm with product preference

**2.3 — Update city deep link routing**
- File: `DeepLinkHandler.swift` / `ContentView.swift`
- When a `.city(name:)` deep link is received, it should navigate to Vibez (tab 0) with the city pre-selected
- Confirm `navigateToVibezWithCity` notification still works correctly after tab renumbering

---

## Sprint 3 — Onboarding Restructure

**Goal:** Rebuild the onboarding flow around Vibez as the core feature. Remove the "100+ Cities" explore page. Add context for Save and Settings. Reorder so Vibez is the first feature screen after Welcome.

### Current Flow (6 pages)
1. Welcome
2. 100+ Cities Worldwide ← **REMOVE**
3. Vibez Mode ← **MOVE TO PAGE 2**
4. Group Flows ← **KEEP, MOVE TO PAGE 3**
5. Pro Benefits ← **UPDATE, MOVE TO PAGE 4**
6. Get Started ← **KEEP, BECOMES PAGE 5**

### New Flow (5 pages)
1. **Welcome** — unchanged
2. **Vibez Mode** — lead with the main feature
3. **Your Plans** — introduce the Save screen (my plans)
4. **Pro Benefits** — updated to reflect new feature set
5. **Get Started** — updated CTA copy

### Tasks

**3.1 — Remove "100+ Cities" page**
- File: `OnboardingPage.swift`
- Delete the Page 2 entry (`Explore Anywhere / 100+ Cities Worldwide`) entirely
- Shift all subsequent pages up by one index

**3.2 — Move Vibez Mode to Page 2 (first feature screen)**
- File: `OnboardingPage.swift`
- Vibez page becomes page at index 1
- Update description to reflect it's the core of the app, not just a feature:
  - **New subtitle:** "Your Night Starts Here"
  - **New title:** "Pick a Vibe, Build Your Night"
  - **New description:** "Choose a city, pick a mood — AI builds your perfect night out. From rooftop drinks to late-night dancing, your night is one tap away. Email members get one free Vibez every week."

**3.3 — Replace Group Flows page with "Your Plans" page**
- File: `OnboardingPage.swift`
- Repurpose Page 4 into a "Save & Come Back" page that introduces MyPlansView
- **Subtitle:** "Save Everything"
- **Title:** "Your Plans, Saved"
- **Description:** "Every Vibez you generate can be saved to your plans. Cities, itineraries, group flows — all in one place, ready when you are."
- **Icon:** `heart.fill` (matches the Saved tab icon)
- **Accent:** keep green from Group Flows or use a warm colour

**3.4 — Update Pro Comparison page**
- File: `ProComparisonPageView.swift`
- Remove references to cities count and weekly plan updates from the comparison cards
- **Updated Free card:**
  - "1 Vibez/week (email)" ✓
  - "3 cities" ✓
  - "Save up to 10 plans" ✓
  - "Unlimited Vibez" ✗
  - "All cities" ✗
- **Updated Pro card:**
  - "Unlimited Vibez" ✓
  - "All 100+ cities" ✓
  - "Unlimited saves" ✓
  - "Priority support" ✓
  - "Early access" ✓
- Update `benefitsList` ("Why Go Pro?") to remove "Generate unlimited plans anytime" and replace with Vibez-focused benefits:
  - "Unlimited Vibez — generate as many as you want"
  - "Access all 100+ cities for Vibez"
  - "Unlock all 26 vibe themes"
  - "Get early access to new features"

**3.5 — Update Get Started page**
- File: `OnboardingPage.swift`
- **New description:** "Your first Vibez is waiting. Pick a city, choose your mood, and let AI plan your night."
- Change button label from generic to action-oriented (check `OnboardingView.swift` for button copy)

---

## Sprint 4 — Paywall & Marketing Copy

**Goal:** Update PaywallView to remove Explore-dependent benefits and reframe the value proposition around Vibez.

### Current Benefits (7 items)
1. "100+ cities worldwide — Explore nightlife in cities across the globe" ← **REFRAME**
2. "Up to 50 plans per city — Access the full catalog of curated experiences" ← **REMOVE** (pre-generated content being retired)
3. "Plans updated every week — Fresh recommendations with new venues and events" ← **REMOVE** (generation paused)
4. "Weekend plans included — Never miss the hottest weekend events" ← **REMOVE** (pre-generated content)
5. "Save favorite cities — Quick access to your most-visited destinations" ← **KEEP**
6. "Group flow experiences — Full-night itineraries with multiple venues" ← **KEEP**
7. "Vibez custom plans — Generate personalized plans for any vibe and city" ← **KEEP, make first**

### New Benefits (5 items — quality over quantity)
1. "Unlimited Vibez — Generate as many custom plans as you want, any time"
2. "All 100+ cities — Access every city worldwide for your Vibez generations"
3. "All 26 vibe themes — Unlock every mood from Jazz Night to Wild Night Out"
4. "Save unlimited plans — Keep all your generated itineraries in one place"
5. "Group flow experiences — Full multi-stop nights planned from dinner to dancing"

### Tasks

**4.1 — Rewrite PaywallView benefits list**
- File: `PaywallView.swift` lines 222–264
- Replace all 7 current benefit rows with the 5 new ones above
- Update icons to match new content

**4.2 — Update PaywallView headline copy**
- File: `PaywallView.swift` line 185
- Review "Get unlimited access to the best nightlife experiences worldwide" — this is fine, keep or refine slightly

**4.3 — Update PaywallTrigger copy**
- File: `PaywallTrigger.swift`
- Review the `cityDiscovery` trigger description — currently tied to exploring/discovering cities
- Update messaging shown when paywall is triggered by hitting the free Vibez limit

**4.4 — Update 7-day trial copy context**
- File: `PaywallView.swift` line 403
- "7-day free trial, then $39.99/year" — still accurate, keep as-is

---

## Sprint 5 — Background Jobs & Cost Reduction

**Goal:** Disable the monthly plan generation job to eliminate the ~$130/month AI generation cost.

### Tasks

**5.1 — Disable weeklyPlanRefresh cron schedule**
- File: `backend/functions/src/scheduled/weeklyPlanRefresh.ts` line 153
- Comment out or remove the cron schedule registration: `0 0 1 * *`
- Add a clear comment explaining why it was disabled and when to re-enable:
  ```
  // Disabled 2026-05-11: Explore screen removed to reduce costs.
  // Re-enable when Explore screen is reintroduced or user count justifies generation.
  ```
- Do NOT delete the file — re-enabling should be a one-line change

**5.2 — Confirm Railway cron is also disabled**
- Check Railway dashboard to confirm the job is not scheduled independently there
- The job is likely registered via Railway's cron configuration — disable or remove the schedule entry
- Keep the code, just remove the trigger

**5.3 — Verify syncSubscriptionStatus is unaffected**
- File: `backend/functions/src/scheduled/syncSubscriptionStatus.ts`
- Confirm it runs independently of Explore content — it does (manages user entitlements only)
- No changes needed, document explicitly that this job stays active

---

## Sprint 6 — Code Cleanup

**Goal:** Delete dead files, remove unused services, and clean up all remaining references to Explore and Search.

### Tasks

**6.1 — Delete HomeView.swift**
- File: `ios-app/Litplan/Views/HomeView.swift`
- Confirm no remaining references before deleting
- Remove from Xcode project file (`Litplan.xcodeproj/project.pbxproj`)

**6.2 — Delete SearchView.swift**
- File: `ios-app/Litplan/Views/SearchView.swift`
- Confirm no remaining references before deleting
- Remove from Xcode project file

**6.3 — Review CityPreloadService**
- File: `ios-app/Litplan/Services/CityPreloadService.swift`
- Check if this service is used anywhere outside SearchView
- If only used by SearchView, delete it
- If used elsewhere (e.g. BoltView city selector), keep it

**6.4 — Review CitySearchManager**
- Check if used anywhere outside SearchView (e.g. BoltView's CitySearchSelector)
- If only used by SearchView, delete it
- If used by BoltView city search, keep it

**6.5 — Audit remaining "explore" / "search" references**
- Run a project-wide search for "Explore", "Search", "HomeView", "SearchView"
- Clean up any stray comments, labels, or copy that references the removed screens
- Update app's README or internal docs if they reference these screens

**6.6 — Update docs/changelog.md and memory**
- Add entry to `docs/changelog.md` for this structural change
- Update Claude memory files to reflect new app structure

---

## Summary Table

| Sprint | Focus | Files Affected | Est. Effort |
|---|---|---|---|
| 1 | Tab bar & navigation | `ContentView.swift`, `HomeView.swift`, `MyPlansView.swift` | Medium |
| 2 | App launch & deep links | `ContentView.swift`, `DeepLinkHandler.swift` | Small |
| 3 | Onboarding restructure | `OnboardingPage.swift`, `ProComparisonPageView.swift`, `OnboardingView.swift` | Medium |
| 4 | Paywall & copy | `PaywallView.swift`, `PaywallTrigger.swift` | Small |
| 5 | Background jobs | `weeklyPlanRefresh.ts`, Railway dashboard | Small |
| 6 | Code cleanup & deletion | `HomeView.swift`, `SearchView.swift`, project file, service files | Medium |

---

## Sequencing Notes

- **Sprint 1 must come first** — all other sprints depend on the tab structure being correct
- **Sprint 5 can run in parallel with any sprint** — it's purely backend, independent of iOS changes
- **Sprint 6 should be last** — confirms no other sprint reintroduced a dependency on deleted files
- **Sprints 2, 3, 4 can run in any order** after Sprint 1 is complete

---

## What We Are NOT Doing

- Not deleting the existing plan/city data in the database — it stays, just not shown
- Not removing `CityDetailsView` — still accessible from saved cities
- Not removing `SearchedCitiesView` in Profile — different feature, search history only
- Not touching the Vibez token system — fully intact
- Not changing the subscription system or StoreKit integration
