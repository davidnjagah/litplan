# Supabase Authentication Setup Guide

**Date:** December 30, 2025
**Sprint:** 8 - Authentication Fix
**Author:** Backend Engineer Agent

---

## Overview

This document provides step-by-step instructions for configuring Apple Sign In and Google Sign In authentication providers in the Supabase Dashboard. These configurations cannot be automated and require manual setup.

---

## Current Investigation Findings

### Apple Sign In Issue Analysis

After investigating the codebase, the following findings were identified:

#### 1. iOS App Code Status: CORRECT
- **File:** `/ios-app/Litplan/Services/AuthenticationManager.swift`
- The `handleSignInWithAppleCompletion` method correctly uses `signInWithIdToken`:
  ```swift
  let session = try await supabaseManager.client.auth.signInWithIdToken(
      credentials: .init(
          provider: .apple,
          idToken: tokenString
      )
  )
  ```
- The implementation follows Supabase iOS SDK best practices.

#### 2. Supabase Client Initialization: CORRECT
- **File:** `/ios-app/Litplan/Services/SupabaseManager.swift`
- Client is properly initialized with URL and anon key from Config.swift.

#### 3. Missing Configuration: CRITICAL ISSUES FOUND

**Issue A: Placeholder Supabase Anon Key**
- **File:** `/ios-app/Litplan/Services/Config.swift`
- Line 32 contains: `static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY_HERE"`
- This placeholder needs to be replaced with the actual anon key from Supabase.
- The correct key is in backend `.env`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Issue B: Missing iOS Entitlements**
- No `.entitlements` file found in the project.
- Sign in with Apple requires the `com.apple.developer.applesignin` entitlement.
- The Xcode project uses `GENERATE_INFOPLIST_FILE = YES` without custom entitlements.

**Issue C: Missing URL Schemes**
- No custom URL schemes configured for OAuth callbacks.
- Required for Google Sign In OAuth flow.

**Issue D: Supabase Dashboard Configuration Unknown**
- Apple provider may not be enabled in Supabase Dashboard.
- Apple OAuth credentials (Service ID, Team ID, Key ID, Private Key) may be missing.

---

## Part 1: Supabase Dashboard - Apple Provider Setup

### Prerequisites
- Apple Developer Account with paid membership
- Access to Apple Developer Portal (developer.apple.com)
- Your Supabase project URL: `https://clktdigankjszupvrsqt.supabase.co`

### Step 1: Configure Apple Developer Portal

1. Go to https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**

#### Create/Verify App ID
1. Go to **Identifiers** > **App IDs**
2. Find or create App ID: `com.litplan.app`
3. Enable **Sign in with Apple** capability:
   - Check the box for "Sign in with Apple"
   - Click "Configure" next to it
   - Select "Enable as a primary App ID"
   - Save

#### Create a Service ID
1. Go to **Identifiers** > **Services IDs**
2. Click "+" to register a new Services ID
3. Fill in:
   - Description: `Litplan Web Auth`
   - Identifier: `com.litplan.app.service`
4. Enable "Sign in with Apple"
5. Click "Configure" and add:
   - **Primary App ID:** `com.litplan.app`
   - **Website URLs - Domains:** `clktdigankjszupvrsqt.supabase.co`
   - **Return URLs:** `https://clktdigankjszupvrsqt.supabase.co/auth/v1/callback`
6. Save

#### Create a Private Key
1. Go to **Keys**
2. Click "+" to create a new key
3. Name: `Litplan Auth Key`
4. Enable "Sign in with Apple"
5. Configure and select your App ID
6. Register and download the `.p8` file
7. **IMPORTANT:** Note down the Key ID (shown after creation)

### Step 2: Configure Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project (clktdigankjszupvrsqt)
3. Navigate to **Authentication** > **Providers**
4. Find and enable **Apple**

#### Enter Apple Credentials:

| Field | Value | Notes |
|-------|-------|-------|
| **Service ID** | `com.litplan.app.service` | Your Services ID from Apple |
| **Team ID** | `4885SH3U5Y` | From Xcode project or developer portal |
| **Key ID** | `[Your Key ID]` | From the key you created |
| **Private Key** | `[Contents of .p8 file]` | Paste the entire file contents |

5. Click **Save**

### Step 3: Verify Callback URL

Ensure the callback URL in Apple Developer Portal matches exactly:
```
https://clktdigankjszupvrsqt.supabase.co/auth/v1/callback
```

---

## Part 2: Supabase Dashboard - Google Provider Setup

### Prerequisites
- Google Cloud Console account
- Access to https://console.cloud.google.com

### Step 1: Create Google Cloud OAuth Credentials

1. Go to https://console.cloud.google.com
2. Select or create a project for Litplan
3. Navigate to **APIs & Services** > **Credentials**

#### Create OAuth 2.0 Client ID

1. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
2. If prompted, configure the OAuth consent screen first:
   - App name: `Litplan`
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `email`, `profile`, `openid`
   - Test users: Add your test email addresses

3. For the OAuth Client ID:
   - Application type: **iOS**
   - Name: `Litplan iOS`
   - Bundle ID: `com.litplan.app`
   - Click Create

4. Create another client for Web (needed for Supabase):
   - Application type: **Web application**
   - Name: `Litplan Web Auth`
   - Authorized redirect URIs:
     ```
     https://clktdigankjszupvrsqt.supabase.co/auth/v1/callback
     ```
   - Click Create

5. Note the **Client ID** and **Client Secret** for the Web client

### Step 2: Configure Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find and enable **Google**

#### Enter Google Credentials:

| Field | Value |
|-------|-------|
| **Client ID** | `[Your Google Web Client ID]` |
| **Client Secret** | `[Your Google Web Client Secret]` |

5. Click **Save**

---

## Part 3: iOS App Configuration Required

### 3.1 Fix Config.swift Anon Key

Update `/ios-app/Litplan/Services/Config.swift`:

```swift
// Replace line 32
static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTY0MzcsImV4cCI6MjA4MjU5MjQzN30.lxRTafWUnKoQ4DBDTQEC9oioxYDejqtkT3apMC2Ervk"
```

### 3.2 Add Entitlements File (Required for Apple Sign In)

Create a new file: `/ios-app/Litplan/Litplan.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
</dict>
</plist>
```

Then add to Xcode project:
1. Open Litplan.xcodeproj in Xcode
2. Select the Litplan target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Sign in with Apple**
6. This will automatically create and configure the entitlements file

### 3.3 Add URL Scheme for Google OAuth

In Xcode (or add to Info.plist if one exists):

1. Select the Litplan target
2. Go to **Info** tab
3. Expand **URL Types**
4. Add a new URL Type:
   - **Identifier:** `com.litplan.app`
   - **URL Schemes:** `com.googleusercontent.apps.[YOUR_IOS_CLIENT_ID]`

Replace `[YOUR_IOS_CLIENT_ID]` with your Google iOS Client ID (reversed).

### 3.4 Implement signInWithGoogle Method

The `LoginView.swift` calls `authManager.signInWithGoogle()` but this method is not implemented in `AuthenticationManager.swift`. The UI Designer agent should add:

```swift
// In AuthenticationManager.swift

/// Sign in with Google using Supabase OAuth
func signInWithGoogle() async {
    isLoading = true
    errorMessage = nil

    do {
        // Use Supabase OAuth flow for Google
        let url = try await supabaseManager.client.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: URL(string: "com.litplan.app://auth/callback")
        )

        // Open in system browser or ASWebAuthenticationSession
        await MainActor.run {
            UIApplication.shared.open(url)
        }
    } catch {
        self.errorMessage = "Google Sign In failed: \(error.localizedDescription)"
        if Config.enableDebugLogging {
            print("[AuthenticationManager] Google Sign In error: \(error)")
        }
    }

    isLoading = false
}
```

### 3.5 Handle OAuth Callback

Add to `LitplanApp.swift`:

```swift
.onOpenURL { url in
    Task {
        do {
            try await SupabaseManager.shared.client.auth.session(from: url)
        } catch {
            print("OAuth callback error: \(error)")
        }
    }
}
```

---

## Part 4: Testing Checklist

### Apple Sign In
- [ ] Supabase Apple provider is enabled
- [ ] Apple credentials are correctly entered in Supabase
- [ ] iOS app has Sign in with Apple entitlement
- [ ] Config.swift has correct anon key
- [ ] Test on real device (simulator has limitations)

### Google Sign In
- [ ] Supabase Google provider is enabled
- [ ] Google OAuth credentials are correctly entered
- [ ] URL scheme is configured for OAuth callback
- [ ] `signInWithGoogle()` method is implemented
- [ ] OAuth callback handler is in place

---

## Common Issues and Solutions

### Issue: "Invalid token" error from Apple Sign In
**Cause:** Supabase Apple provider not configured or misconfigured.
**Solution:** Verify all Apple credentials in Supabase Dashboard.

### Issue: "Authentication failed" with no details
**Cause:** Missing or incorrect Supabase anon key.
**Solution:** Ensure Config.swift has the correct anon key from Supabase.

### Issue: Apple Sign In button does nothing
**Cause:** Missing Sign in with Apple capability.
**Solution:** Add the capability in Xcode Signing & Capabilities.

### Issue: Google Sign In opens browser but doesn't return
**Cause:** Missing or incorrect URL scheme.
**Solution:** Add the correct URL scheme matching your Google iOS Client ID.

### Issue: Session not persisted after Google Sign In
**Cause:** OAuth callback not handled.
**Solution:** Add `.onOpenURL` handler in LitplanApp.swift.

---

## Environment Variables Summary

### Backend `.env` (already configured)
```
SUPABASE_URL=https://clktdigankjszupvrsqt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### iOS App Config.swift (needs update)
```swift
static let supabaseURL = "https://clktdigankjszupvrsqt.supabase.co"
static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // UPDATE THIS
static let bundleIdentifier = "com.litplan.app"
```

---

## Team ID Reference

From the Xcode project file:
- **Development Team ID:** `4885SH3U5Y`

This is the Apple Developer Team ID that should be used in Supabase Apple provider configuration.

---

## Next Steps

1. **User Action Required:** Configure Apple provider in Supabase Dashboard
2. **User Action Required:** Configure Google provider in Supabase Dashboard
3. **User Action Required:** Add Sign in with Apple capability in Xcode
4. **UI Designer Agent:** Implement `signInWithGoogle()` method
5. **UI Designer Agent:** Add Google logo component (`GoogleLogoView`)
6. **QA Tester Agent:** Verify both authentication flows work end-to-end

---

## References

- [Supabase Apple Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase Google Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple Sign In for iOS](https://developer.apple.com/sign-in-with-apple/)
- [Google OAuth for iOS](https://developers.google.com/identity/sign-in/ios/start)
