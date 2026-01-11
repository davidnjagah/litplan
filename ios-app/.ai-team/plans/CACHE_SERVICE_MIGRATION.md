# Cache Service Migration Plan

## Overview
Replace MockDataService with a CacheService that stores real API responses locally for offline support.

**Goal**: Remove dependency on hardcoded mock data and instead cache actual API responses for a seamless offline experience.

**Current State**: App falls back to MockDataService (hardcoded fake data) when offline or API fails.

**Target State**: App caches real API data locally and uses cached data when offline.

---

## Sprint Breakdown

### Sprint 1: Foundation (CacheService Creation)
**Assigned to**: Backend Engineer Agent
**Duration**: 1 session
**Status**: Partially Complete (CacheService.swift created)

#### Tasks:
1. ✅ Create `CacheService.swift` with:
   - File-based caching using FileManager
   - Cache cities, plans, and group flows
   - Cache expiration (24 hours)
   - Cache size management

2. ⏳ Add CacheService to Xcode project (verify it compiles)

#### Deliverables:
- `Litplan/Services/CacheService.swift`

---

### Sprint 2: APIService Integration
**Assigned to**: Backend Engineer Agent
**Duration**: 1 session

#### Tasks:
1. Update `fetchCitiesWithFallback()`:
   - On successful API call → Cache the response
   - On offline/error → Return cached data (not MockDataService)
   - If no cache exists → Return empty array

2. Update `fetchPlansWithFallback()`:
   - On successful API call → Cache plans for that city
   - On offline/error → Return cached plans
   - If no cache exists → Return empty array

3. Update `fetchGroupFlowsWithFallback()`:
   - On successful API call → Cache group flows for that city
   - On offline/error → Return cached group flows
   - If no cache exists → Return empty array

4. Remove MockDataService extension at bottom of APIService.swift

#### Files Modified:
- `Litplan/Services/APIService.swift`

---

### Sprint 3: View Layer Updates
**Assigned to**: UI Designer Agent
**Duration**: 1 session

#### Tasks:
1. Update `HomeView.swift`:
   - Remove direct MockDataService.shared.cities usage
   - Handle empty state when no cached data exists
   - Show "No data available" message for first-time offline users

2. Update `CityDetailsView.swift`:
   - Already uses fetchPlansWithFallback (no changes needed)
   - Ensure empty states display properly

3. Update `SearchView.swift`:
   - Check if CityPreloadService uses MockDataService
   - Update to use CacheService if needed

#### Files Modified:
- `Litplan/Views/HomeView.swift`
- `Litplan/Views/SearchView.swift` (if needed)

---

### Sprint 4: App Initialization & Cleanup
**Assigned to**: Backend Engineer Agent
**Duration**: 1 session

#### Tasks:
1. Update `LitplanApp.swift`:
   - Remove MockDataService pre-warming
   - Add CacheService initialization (optional pre-load)

2. Update `CityPreloadService.swift`:
   - Remove MockDataService references
   - Use CacheService for local city lookup

3. Deprecate/Remove `MockDataService.swift`:
   - Option A: Delete entirely
   - Option B: Keep for DEBUG builds only with `#if DEBUG`

#### Files Modified:
- `Litplan/LitplanApp.swift`
- `Litplan/Services/CityPreloadService.swift`
- `Litplan/Services/MockDataService.swift` (delete or deprecate)

---

### Sprint 5: Testing & QA
**Assigned to**: QA Tester Agent
**Duration**: 1 session

#### Test Cases:

| Scenario | Expected Behavior |
|----------|-------------------|
| First launch (online) | Fetches from API, caches data |
| Second launch (online) | Fetches fresh data, updates cache |
| Launch (offline, has cache) | Shows cached data |
| Launch (offline, no cache) | Shows empty state with message |
| City tap (online) | Fetches plans, caches them |
| City tap (offline, cached) | Shows cached plans |
| City tap (offline, no cache) | Shows "No plans available" |
| Pull-to-refresh (online) | Refreshes data, updates cache |
| Pull-to-refresh (offline) | Shows offline message |

#### Edge Cases:
- Cache expiration (data older than 24 hours)
- Partial cache (cities cached, but not plans for specific city)
- Cache corruption recovery
- Low storage scenarios

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Views                                 │
│  (HomeView, CityDetailsView, SearchView)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      APIService                              │
│  fetchCitiesWithFallback()                                  │
│  fetchPlansWithFallback()                                   │
│  fetchGroupFlowsWithFallback()                              │
└─────────────────────────────────────────────────────────────┘
                    │                   │
          (online)  │                   │  (offline/error)
                    ▼                   ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Supabase API       │    │    CacheService      │
│   (Real data)        │    │    (Local cache)     │
└──────────────────────┘    └──────────────────────┘
          │                           ▲
          │      (cache response)     │
          └───────────────────────────┘
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| First-time users see empty app | Medium | High | Show helpful onboarding message |
| Cache grows too large | Low | Medium | Implement cache size limits |
| Stale data shown | Medium | Low | 24-hour expiration + pull-to-refresh |
| Migration breaks existing functionality | Medium | High | Thorough testing, keep MockDataService as fallback initially |

---

## Rollback Plan

If issues arise:
1. Revert APIService changes to use MockDataService again
2. Keep CacheService but don't use it
3. Gradually migrate one endpoint at a time

---

## Success Criteria

- [ ] App works offline with previously loaded data
- [ ] No references to MockDataService in production code
- [ ] Cache is populated after first successful API call
- [ ] Empty states shown for first-time offline users
- [ ] Build succeeds with no warnings
- [ ] All existing functionality preserved

---

## Estimated Timeline

| Sprint | Duration | Cumulative |
|--------|----------|------------|
| Sprint 1 | Complete | Done |
| Sprint 2 | 1 session | 1 session |
| Sprint 3 | 1 session | 2 sessions |
| Sprint 4 | 1 session | 3 sessions |
| Sprint 5 | 1 session | 4 sessions |

**Total**: ~4 working sessions after Sprint 1
