# Litplan iOS App Testing Checklist

**Sprint 6 Phase 7 - iOS Testing Documentation**
**Date:** 2024-12-29

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Auth Flow Test Cases](#auth-flow-test-cases)
3. [Subscription Test Cases](#subscription-test-cases)
4. [Offline Mode Test Cases](#offline-mode-test-cases)
5. [UI Test Cases](#ui-test-cases)
6. [Performance Test Cases](#performance-test-cases)
7. [Error Handling Test Cases](#error-handling-test-cases)

---

## Prerequisites

### Required Setup

- [ ] Xcode 15.0 or later installed
- [ ] iOS 17.0+ simulator or device
- [ ] Supabase Swift SDK installed via SPM
- [ ] Backend server running (local or production)
- [ ] StoreKit sandbox account configured

### SDK Installation

1. Open `ios-app/Litplan.xcodeproj` in Xcode
2. File > Add Packages...
3. Enter: `https://github.com/supabase/supabase-swift.git`
4. Select version `2.0.0` or later
5. Add package to Litplan target

### Configuration Check

Verify `Config.swift` contains:
```swift
static let supabaseURL = "https://[your-project].supabase.co"
static let supabaseAnonKey = "your-anon-key"
static let apiBaseURL = "http://localhost:3001/api/v2" // or production URL
```

---

## Auth Flow Test Cases

### TC-AUTH-001: Sign In with Apple

**Preconditions:**
- Signed out of app
- Apple ID configured on device

**Steps:**
1. Launch app
2. Tap "Sign in with Apple" button
3. Authenticate with Face ID/Touch ID/Password
4. Verify redirect back to app

**Expected Results:**
- [ ] Apple Sign In sheet appears
- [ ] Authentication completes without error
- [ ] User is redirected to Home view
- [ ] User profile shows in Profile tab
- [ ] Backend receives user sync request

---

### TC-AUTH-002: Sign In with Email

**Preconditions:**
- Signed out of app
- Valid test account exists

**Steps:**
1. Launch app
2. Tap "Sign in with Email"
3. Enter email and password
4. Tap "Sign In"

**Expected Results:**
- [ ] Email/password form appears
- [ ] Validation shows for empty fields
- [ ] Sign in succeeds with valid credentials
- [ ] Error message for invalid credentials
- [ ] User redirected to Home view

---

### TC-AUTH-003: Sign Up with Email

**Preconditions:**
- Signed out of app

**Steps:**
1. Launch app
2. Tap "Sign in with Email"
3. Tap "Sign Up" toggle
4. Enter email, password, confirm password
5. Tap "Sign Up"

**Expected Results:**
- [ ] Sign up form shows password requirements
- [ ] Password minimum 8 characters enforced
- [ ] Password confirmation must match
- [ ] Success message shows (if email confirmation required)
- [ ] Or direct sign in (if no confirmation)

---

### TC-AUTH-004: Password Reset

**Preconditions:**
- Signed out of app
- Existing account

**Steps:**
1. Launch app
2. Tap "Sign in with Email"
3. Tap "Forgot Password?"
4. Enter email
5. Tap "Reset Password"

**Expected Results:**
- [ ] Password reset form appears
- [ ] Success message confirms email sent
- [ ] User can sign in with new password after reset

---

### TC-AUTH-005: Guest Mode

**Preconditions:**
- Signed out of app

**Steps:**
1. Launch app
2. Tap "Continue as Guest"
3. Navigate to various features

**Expected Results:**
- [ ] Guest mode enabled
- [ ] Cities list visible
- [ ] Pro features show paywall
- [ ] Saved cities not available
- [ ] Profile shows "Guest" status

---

### TC-AUTH-006: Sign Out

**Preconditions:**
- Signed in to app

**Steps:**
1. Navigate to Profile tab
2. Scroll to bottom
3. Tap "Sign Out"
4. Confirm action

**Expected Results:**
- [ ] Confirmation alert appears
- [ ] User signed out
- [ ] Returned to Login screen
- [ ] Auth state cleared
- [ ] Cached data cleared

---

### TC-AUTH-007: Session Persistence

**Preconditions:**
- Signed in to app

**Steps:**
1. Close app completely
2. Wait 30 seconds
3. Reopen app

**Expected Results:**
- [ ] App launches to Home view
- [ ] User still authenticated
- [ ] No re-login required
- [ ] Session refreshed if needed

---

### TC-AUTH-008: Token Refresh

**Preconditions:**
- Signed in with token about to expire

**Steps:**
1. Use app normally
2. Wait for token expiry time
3. Make authenticated API call

**Expected Results:**
- [ ] Token auto-refreshes
- [ ] No user interruption
- [ ] API call succeeds
- [ ] Or graceful re-auth prompt

---

## Subscription Test Cases

### TC-SUB-001: View Subscription Status (Free)

**Preconditions:**
- Signed in as free user

**Steps:**
1. Navigate to Profile tab
2. View subscription section

**Expected Results:**
- [ ] Shows "Free" tier
- [ ] Shows current limits (1 city/week, 10 plans)
- [ ] "Upgrade to Pro" button visible

---

### TC-SUB-002: View Subscription Status (Pro)

**Preconditions:**
- Signed in as Pro subscriber

**Steps:**
1. Navigate to Profile tab
2. View subscription section

**Expected Results:**
- [ ] Shows "Pro" tier
- [ ] Shows entitlements (unlimited cities, 50 plans, etc.)
- [ ] Expiry date shown
- [ ] "Manage Subscription" button visible

---

### TC-SUB-003: Purchase Monthly Subscription

**Preconditions:**
- Signed in as free user
- Sandbox account configured

**Steps:**
1. Trigger paywall (try to access 2nd city)
2. View paywall
3. Select "Monthly" option
4. Tap "Subscribe"
5. Authenticate purchase

**Expected Results:**
- [ ] Paywall shows pricing
- [ ] Price matches App Store Connect
- [ ] Purchase dialog appears
- [ ] Transaction completes
- [ ] Backend validation succeeds
- [ ] Pro features unlock immediately

---

### TC-SUB-004: Purchase Annual Subscription

**Preconditions:**
- Signed in as free user
- Sandbox account configured

**Steps:**
1. Trigger paywall
2. Select "Annual" option
3. Tap "Subscribe"
4. Authenticate purchase

**Expected Results:**
- [ ] Annual price shown (with savings)
- [ ] Purchase completes
- [ ] Subscription valid for 1 year
- [ ] Pro features unlock

---

### TC-SUB-005: Restore Purchases

**Preconditions:**
- Previously purchased subscription
- Fresh app install

**Steps:**
1. Sign in with same account
2. Navigate to Profile or Paywall
3. Tap "Restore Purchases"

**Expected Results:**
- [ ] Previous purchases restored
- [ ] Pro status activated
- [ ] No additional charge
- [ ] Backend synced

---

### TC-SUB-006: Subscription Expiry

**Preconditions:**
- Sandbox accelerated expiry
- Active Pro subscription

**Steps:**
1. Wait for subscription to expire
2. Open app after expiry
3. Check subscription status

**Expected Results:**
- [ ] Status shows "Expired" or "Free"
- [ ] Pro features locked
- [ ] Renewal prompt shown
- [ ] Data preserved (viewed cities, etc.)

---

### TC-SUB-007: Paywall Trigger - City Limit

**Preconditions:**
- Free user who viewed 1 city this week

**Steps:**
1. Navigate to Cities list
2. Tap on a different city
3. Try to view plans

**Expected Results:**
- [ ] Paywall appears
- [ ] Shows "Weekly limit reached"
- [ ] Current usage displayed
- [ ] Upgrade options shown

---

### TC-SUB-008: Paywall Trigger - Pro Feature

**Preconditions:**
- Free user

**Steps:**
1. Navigate to a city
2. Try to access Group Flows
3. Or try to save a city

**Expected Results:**
- [ ] Paywall appears
- [ ] Shows "Pro feature"
- [ ] Feature benefit explained
- [ ] Upgrade options shown

---

## Offline Mode Test Cases

### TC-OFF-001: Offline Launch

**Preconditions:**
- App previously used while online
- Device in airplane mode

**Steps:**
1. Enable airplane mode
2. Launch app

**Expected Results:**
- [ ] App launches successfully
- [ ] Cached cities visible
- [ ] Network error banner shown
- [ ] Core navigation works

---

### TC-OFF-002: Offline City Browsing

**Preconditions:**
- Cities cached from previous session
- Device offline

**Steps:**
1. Navigate to Cities tab
2. Browse cached cities
3. View city details

**Expected Results:**
- [ ] Cached cities display
- [ ] City images load from cache
- [ ] City details visible
- [ ] Network status indicator shown

---

### TC-OFF-003: Offline to Online Transition

**Preconditions:**
- App running in offline mode

**Steps:**
1. Re-enable network
2. Continue using app
3. Perform action requiring network

**Expected Results:**
- [ ] Network status updates
- [ ] Data refreshes automatically
- [ ] Pending actions complete
- [ ] Fresh data loads

---

### TC-OFF-004: Offline Feature Access

**Preconditions:**
- Device offline
- Free user

**Steps:**
1. Try to access authenticated feature
2. Try to make purchase

**Expected Results:**
- [ ] Appropriate error shown
- [ ] No crashes
- [ ] Clear message about offline state
- [ ] Retry option available

---

## UI Test Cases

### TC-UI-001: Home Screen Layout

**Steps:**
1. Launch app (signed in)
2. View Home screen

**Expected Results:**
- [ ] Featured cities carousel visible
- [ ] Search bar accessible
- [ ] Tab bar visible (Home, Search, Profile)
- [ ] Pull to refresh works
- [ ] City cards display correctly

---

### TC-UI-002: City Card Display

**Steps:**
1. Navigate to Cities
2. View city cards

**Expected Results:**
- [ ] City image loads
- [ ] City name visible
- [ ] Country displayed
- [ ] Plan count shown
- [ ] Card tappable

---

### TC-UI-003: City Details View

**Steps:**
1. Tap on a city card
2. View city details

**Expected Results:**
- [ ] Hero image displays
- [ ] City name prominent
- [ ] Plans list visible
- [ ] Group flows section (Pro)
- [ ] Back navigation works

---

### TC-UI-004: Plan Card Display

**Steps:**
1. Navigate to city
2. View plan cards

**Expected Results:**
- [ ] Plan image loads
- [ ] Venue name shown
- [ ] Category displayed
- [ ] Date/time visible
- [ ] Price shown
- [ ] Weekend tag (if applicable)

---

### TC-UI-005: Search Functionality

**Steps:**
1. Navigate to Search tab
2. Enter city name
3. View results

**Expected Results:**
- [ ] Search field focused
- [ ] Results filter as typing
- [ ] No results message when empty
- [ ] Results tappable
- [ ] Recent searches shown

---

### TC-UI-006: Profile View

**Steps:**
1. Navigate to Profile tab
2. View all sections

**Expected Results:**
- [ ] User name/email displayed
- [ ] Subscription status shown
- [ ] Viewed cities history
- [ ] Settings accessible
- [ ] Sign out option visible

---

### TC-UI-007: Dark Mode Support

**Steps:**
1. Enable dark mode in Settings
2. Return to app

**Expected Results:**
- [ ] UI adapts to dark mode
- [ ] All text readable
- [ ] Images display correctly
- [ ] No color contrast issues

---

### TC-UI-008: Dynamic Type Support

**Steps:**
1. Change text size in Settings
2. Return to app

**Expected Results:**
- [ ] Text scales appropriately
- [ ] Layout adjusts
- [ ] No text truncation issues
- [ ] Buttons remain accessible

---

### TC-UI-009: iPad Layout (if supported)

**Steps:**
1. Run app on iPad
2. Test all views

**Expected Results:**
- [ ] Layout uses space effectively
- [ ] Split view support (if implemented)
- [ ] No stretched UI elements
- [ ] Touch targets appropriately sized

---

### TC-UI-010: Orientation Changes

**Steps:**
1. Use app in portrait
2. Rotate to landscape
3. Navigate between screens

**Expected Results:**
- [ ] Smooth rotation animation
- [ ] Layout adapts correctly
- [ ] No content cut off
- [ ] State preserved

---

## Performance Test Cases

### TC-PERF-001: App Launch Time

**Steps:**
1. Force quit app
2. Cold launch app
3. Measure time to Home screen

**Expected Results:**
- [ ] Launch < 2 seconds
- [ ] Content visible < 3 seconds
- [ ] No splash screen hang

---

### TC-PERF-002: Image Loading

**Steps:**
1. Navigate to Cities
2. Scroll through list
3. Observe image loading

**Expected Results:**
- [ ] Placeholder shown while loading
- [ ] Images load progressively
- [ ] No flickering
- [ ] Scrolling remains smooth

---

### TC-PERF-003: Scroll Performance

**Steps:**
1. Navigate to long list (plans)
2. Scroll rapidly up and down
3. Monitor for jank

**Expected Results:**
- [ ] 60 FPS maintained
- [ ] No dropped frames
- [ ] Smooth deceleration
- [ ] Memory stable

---

### TC-PERF-004: Memory Usage

**Steps:**
1. Use app extensively
2. Navigate many screens
3. Monitor memory in Xcode

**Expected Results:**
- [ ] Memory stays reasonable
- [ ] No memory leaks
- [ ] Images released when off-screen
- [ ] No crash from memory pressure

---

## Error Handling Test Cases

### TC-ERR-001: Network Error Display

**Preconditions:**
- Unstable network connection

**Steps:**
1. Trigger API call
2. Simulate network failure

**Expected Results:**
- [ ] Error message displayed
- [ ] User-friendly message
- [ ] Retry option available
- [ ] No crash

---

### TC-ERR-002: API Error Handling

**Preconditions:**
- Backend returning errors

**Steps:**
1. Trigger various API errors (401, 403, 500)
2. Observe app behavior

**Expected Results:**
- [ ] 401: Redirect to login
- [ ] 403: Show paywall or feature gate
- [ ] 500: Show error with retry
- [ ] All errors logged

---

### TC-ERR-003: Invalid Data Handling

**Steps:**
1. Backend returns malformed data
2. App tries to parse

**Expected Results:**
- [ ] Graceful fallback
- [ ] Error logged
- [ ] No crash
- [ ] User shown appropriate message

---

### TC-ERR-004: StoreKit Error Handling

**Steps:**
1. Cancel purchase mid-flow
2. Network failure during purchase
3. Invalid product ID

**Expected Results:**
- [ ] Cancellation handled gracefully
- [ ] Network error shows retry
- [ ] Invalid product shows error
- [ ] No money charged on failure

---

## Test Environment Checklist

### Simulators to Test

- [ ] iPhone 15 Pro (latest)
- [ ] iPhone SE (smallest)
- [ ] iPhone 15 Pro Max (largest)
- [ ] iPad Pro 12.9" (if iPad supported)

### iOS Versions

- [ ] iOS 17.0 (minimum)
- [ ] iOS 17.x (latest)

### Network Conditions

- [ ] WiFi (fast)
- [ ] Cellular (variable)
- [ ] Offline
- [ ] Poor connection (Network Link Conditioner)

---

## Regression Test Suite

Before each release, run:

1. [ ] All Auth tests
2. [ ] All Subscription tests
3. [ ] TC-UI-001 through TC-UI-006
4. [ ] TC-PERF-001 and TC-PERF-003
5. [ ] TC-ERR-001 through TC-ERR-003

---

## Notes

1. **Sandbox Testing**: Always use sandbox environment for subscription tests
2. **Real Device**: Test Sign in with Apple on real device
3. **Clean Install**: Test fresh install for each major release
4. **Data Migration**: Test upgrade from previous version if applicable
