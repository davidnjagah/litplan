# Sprint 7: Connect Litplan iOS to Supabase Live

## Date: December 30, 2025
## Goal: Replace all mock data with live Supabase connection (except Paywall/StoreKit)

---

## Current State Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase SDK | Integrated | v2.39.0, builds successfully |
| SupabaseManager | Ready | Client init, session management implemented |
| AuthenticationManager | Ready | Apple Sign In, Email/Password, Guest mode |
| APIService | Ready | Endpoints defined, fallback to mock |
| **Supabase Anon Key** | **CONFIGURED** | Real key added from .env |
| Views (HomeView, etc.) | **CONNECTED** | Now using APIService with fallback |

## Implementation Status: COMPLETED

| Task | Status | Date |
|------|--------|------|
| Add Supabase anon key to Config.swift | DONE | Dec 30, 2025 |
| Start auth listener in LitplanApp | DONE | Dec 30, 2025 |
| Update HomeView to use APIService | DONE | Dec 30, 2025 |
| Update CityDetailsView to use APIService | DONE | Dec 30, 2025 |
| Update SearchView to use APIService | DONE | Dec 30, 2025 |
| Build verification | **BUILD SUCCEEDED** | Dec 30, 2025 |
| Fix API response wrapper parsing | DONE | Dec 30, 2025 |
| Update Config.Endpoints for V2 API | DONE | Dec 30, 2025 |
| Add APICity/APIPlan transformers | DONE | Dec 30, 2025 |
| Backend health check verified | DONE | Dec 30, 2025 |

---

## Sprint Tasks

### Phase 1: Configuration & Keys (Critical)

**Task 1.1: Add Real Supabase Anon Key**
- File: `Config.swift`
- Replace `"YOUR_SUPABASE_ANON_KEY_HERE"` with actual key from Supabase Dashboard
- Location: Project Settings > API > anon/public key

**Task 1.2: Start Auth State Listener**
- File: `LitplanApp.swift`
- Call `SupabaseManager.shared.listenForAuthChanges()` at app startup

---

### Phase 2: Database Connection

**Task 2.1: Update HomeView to Use APIService**
- Replace `MockDataService.shared.cities` with `APIService.shared.fetchCitiesWithFallback()`
- Add loading states
- Handle errors gracefully

**Task 2.2: Update CityDetailsView to Use APIService**
- Replace `MockDataService.shared.getPlans(for:)` with `APIService.shared.fetchPlansWithFallback(cityId:)`
- Update group flows to use API when available

**Task 2.3: Update SearchView to Use APIService**
- Replace mock search with `APIService.shared.searchCities(query:)`

**Task 2.4: Update ViewedCitiesView**
- Store viewed cities in Supabase user profile
- Sync across devices

---

### Phase 3: Authentication Testing

**Task 3.1: Test Apple Sign In Flow**
- Verify identity token exchange with Supabase
- Test session persistence
- Test sign out flow

**Task 3.2: Test Email/Password Flow**
- Test sign up with email confirmation
- Test sign in
- Test password reset

**Task 3.3: Test Guest Mode**
- Verify limited functionality in guest mode
- Test upgrade from guest to authenticated

---

### Phase 4: Storage Connection (Optional for MVP)

**Task 4.1: Connect City Images to Supabase Storage**
- Update image URLs to use Supabase Storage public URLs
- Fallback to placeholder images

**Task 4.2: User Avatar Upload**
- Enable profile photo upload to Supabase Storage

---

### Phase 5: Profile & Sync

**Task 5.1: User Profile Management**
- `fetchUserProfile()` on auth state change
- `updateUserProfile()` for settings changes

**Task 5.2: Viewed Cities Sync**
- Store viewed cities in user profile
- Sync on app launch

---

## Files to Modify

| File | Changes |
|------|---------|
| `Config.swift` | Add real Supabase anon key |
| `LitplanApp.swift` | Start auth listener, initialize with API data |
| `HomeView.swift` | Replace MockDataService with APIService |
| `CityDetailsView.swift` | Replace MockDataService with APIService |
| `SearchView.swift` | Use real search API |
| `ViewedCitiesView.swift` | Sync with user profile |
| `ProfileView.swift` | Load/update from Supabase |

---

## Testing Checklist

### Authentication
- [ ] Apple Sign In works
- [ ] Email/Password sign up works
- [ ] Email/Password sign in works
- [ ] Password reset sends email
- [ ] Sign out clears session
- [ ] Guest mode works with limited features

### Data Loading
- [ ] Cities load from Supabase
- [ ] Plans load for each city
- [ ] Search returns results from API
- [ ] Offline fallback to cached/mock data works

### Profile
- [ ] Profile loads after auth
- [ ] Profile updates save to Supabase
- [ ] Viewed cities persist

---

## Excluded from Sprint (Paywall)

The following remain with StoreKit 2 only (no Supabase):
- Subscription purchase
- Subscription validation (local StoreKit)
- Paywall triggers
- Premium feature gates

---

## Success Criteria

1. App launches and loads cities from Supabase
2. User can sign in with Apple or Email
3. Tapping a city shows plans from Supabase
4. Search works against Supabase data
5. Profile syncs with Supabase
6. Offline mode falls back gracefully
