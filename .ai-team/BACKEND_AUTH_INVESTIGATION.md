# Backend Auth Investigation Report

**Date:** December 30, 2025
**Sprint:** 8 - Authentication Fix
**Agent:** Backend Engineer

---

## Investigation Summary

### Scope
- Apple Sign In not working
- Google Sign In needs to be configured
- Backend auth routes and webhook handlers

---

## Findings

### 1. iOS App Authentication Code

#### AuthenticationManager.swift
**Status:** Implementation is CORRECT

The `handleSignInWithAppleCompletion` method properly:
- Extracts the identity token from Apple's credential
- Calls Supabase's `signInWithIdToken` with provider `.apple`
- Updates the session and user state
- Syncs with backend

**Key Code (Lines 161-167):**
```swift
let session = try await supabaseManager.client.auth.signInWithIdToken(
    credentials: .init(
        provider: .apple,
        idToken: tokenString
    )
)
```

#### SupabaseManager.swift
**Status:** Implementation is CORRECT

- Properly initializes SupabaseClient with URL and anon key
- Session management is correctly implemented
- Auth state change listener is properly configured

---

### 2. Configuration Issues Found

#### Issue #1: Placeholder Supabase Anon Key (FIXED)
**File:** `/ios-app/Litplan/Services/Config.swift`
**Problem:** The anon key was a placeholder: `"YOUR_SUPABASE_ANON_KEY_HERE"`
**Resolution:** Updated to actual key from backend `.env` file

#### Issue #2: Missing Entitlements File (FIXED)
**Problem:** No `.entitlements` file existed for Sign in with Apple capability
**Resolution:** Created `/ios-app/Litplan/Litplan.entitlements` with:
```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

#### Issue #3: Missing Google Sign In Method
**File:** `/ios-app/Litplan/Views/LoginView.swift`
**Problem:** UI calls `authManager.signInWithGoogle()` but method doesn't exist in AuthenticationManager
**Resolution:** Documented in SUPABASE_AUTH_SETUP.md for UI Designer to implement

---

### 3. Backend Auth Routes

#### Supabase Auth Routes (`/api/routes/v2/supabaseAuth.ts`)
**Status:** CORRECT - No changes needed

Endpoints available:
- `POST /api/v2/auth/supabase/sync` - Sync user after login
- `GET /api/v2/auth/supabase/me` - Get current user with subscription
- `PATCH /api/v2/auth/supabase/me` - Update user profile
- `DELETE /api/v2/auth/supabase/account` - Delete account
- `GET /api/v2/auth/supabase/status` - Auth status check

#### Supabase Webhook Handler (`/api/webhooks/supabase.ts`)
**Status:** CORRECT - No changes needed

Handles:
- `INSERT` - New user created (logs, defers to loadUser middleware)
- `UPDATE` - User updated (syncs email, displayName, imageUrl)
- `DELETE` - User deleted (removes from our DB)

---

### 4. Xcode Project Analysis

**File:** `Litplan.xcodeproj/project.pbxproj`

Observations:
- Bundle ID: `com.litplan.app`
- Development Team: `4885SH3U5Y`
- Uses `GENERATE_INFOPLIST_FILE = YES` (auto-generated Info.plist)
- No custom entitlements file reference (needs to be added in Xcode)
- Supabase Swift SDK: version 2.5.1+

**Action Required:** User must open Xcode and add "Sign in with Apple" capability which will:
1. Reference the new entitlements file
2. Update the project settings
3. Enable the capability in Apple Developer Portal

---

### 5. Supabase Dashboard (Requires User Action)

The following must be configured manually in the Supabase Dashboard:

#### Apple Provider
- Service ID: `com.litplan.app.service`
- Team ID: `4885SH3U5Y`
- Key ID: [From Apple Developer Portal]
- Private Key: [.p8 file contents]

#### Google Provider
- Client ID: [From Google Cloud Console]
- Client Secret: [From Google Cloud Console]

See `SUPABASE_AUTH_SETUP.md` for detailed instructions.

---

## Files Created/Modified

### Created
1. `/ios-app/Litplan/Litplan.entitlements` - Sign in with Apple entitlement
2. `/.ai-team/SUPABASE_AUTH_SETUP.md` - Comprehensive setup guide

### Modified
1. `/ios-app/Litplan/Services/Config.swift` - Fixed Supabase anon key

---

## Root Cause Analysis

### Why Apple Sign In Isn't Working

The Apple Sign In is failing because of a combination of issues:

1. **Immediate Cause:** The Supabase anon key in `Config.swift` was a placeholder, so the iOS app couldn't authenticate with Supabase at all.

2. **Secondary Cause:** The iOS app likely doesn't have the "Sign in with Apple" capability enabled in Xcode, which is required for the ASAuthorizationController to work properly.

3. **Tertiary Cause:** The Supabase Dashboard may not have the Apple provider configured with the correct credentials from Apple Developer Portal.

### Resolution Steps

1. **DONE:** Fixed the Supabase anon key in Config.swift
2. **DONE:** Created the entitlements file
3. **USER ACTION:** Add "Sign in with Apple" capability in Xcode
4. **USER ACTION:** Configure Apple provider in Supabase Dashboard
5. **USER ACTION:** Configure Google provider in Supabase Dashboard

---

## Recommendations

### For UI Designer Agent
1. Implement `signInWithGoogle()` method in AuthenticationManager.swift
2. Create `GoogleLogoView` component for the button
3. Add OAuth callback handler in LitplanApp.swift

### For QA Tester Agent
1. Test Apple Sign In on real device after configuration
2. Test Google Sign In flow end-to-end
3. Verify session persistence after app restart
4. Test sign out for both providers

### For User
1. Open Xcode and add "Sign in with Apple" capability
2. Configure providers in Supabase Dashboard
3. Create Apple Service ID and Key in Apple Developer Portal
4. Create Google OAuth credentials in Google Cloud Console

---

## Backend Webhook Verification

The backend is ready to handle auth events:

```typescript
// Webhook endpoint: POST /webhooks/supabase
// Handles: INSERT, UPDATE, DELETE for auth.users table
```

No additional backend changes are required for authentication to work.

---

## Conclusion

The authentication implementation in the iOS app is sound. The issues were:
1. Configuration (fixed anon key)
2. Missing entitlement file (created)
3. Missing Supabase Dashboard configuration (documented)

After the user completes the Supabase Dashboard configuration and enables the capability in Xcode, Apple Sign In should work. Google Sign In will also work once the UI Designer implements the OAuth flow.
