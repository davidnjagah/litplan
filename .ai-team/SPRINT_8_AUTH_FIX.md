# Sprint 8: Fix Apple Authentication + Add Google Sign In

## Date: December 30, 2025
## Goal: Fix Apple Sign In and add Google Sign In to the Litplan iOS app

---

## Current State Analysis

### Apple Authentication Issue
- **Status**: Not working
- **Root Cause Investigation Required**:
  1. Supabase Apple provider configuration
  2. Apple Developer portal setup (Sign in with Apple capability)
  3. Callback URL configuration
  4. Bundle ID matching

### Files Involved
| File | Purpose |
|------|---------|
| `AuthenticationManager.swift` | Handles Apple Sign In with `signInWithIdToken` |
| `SupabaseManager.swift` | Supabase client initialization |
| `LoginView.swift` | UI with Sign in with Apple button |
| `Config.swift` | Supabase URL and keys |

---

## Sprint Tasks

### Phase 1: Backend Engineer - Investigate & Configure

**Task 1.1: Verify Supabase Apple Provider**
- Check Supabase Dashboard > Authentication > Providers > Apple
- Ensure Apple provider is enabled
- Verify Service ID, Team ID, Key ID, Private Key are configured
- Confirm callback URL matches: `https://[project-ref].supabase.co/auth/v1/callback`

**Task 1.2: Configure Google Provider in Supabase**
- Enable Google provider in Supabase Dashboard
- Configure OAuth 2.0 credentials from Google Cloud Console
- Set authorized redirect URI
- Test OAuth flow

**Task 1.3: Backend Auth Routes**
- Verify `/api/v2/auth` routes support both providers
- Add any necessary webhook handlers

---

### Phase 2: UI Designer - Add Google Sign In

**Task 2.1: Update LoginView.swift**
- Add "Sign in with Google" button below Apple Sign In
- Match design language (white button, same height)
- Add proper icon (Google logo)

**Task 2.2: AuthenticationManager.swift**
- Add `signInWithGoogle()` method using Supabase OAuth
- Handle Google OAuth redirect/callback
- Store session on success

**Task 2.3: Update Info.plist**
- Add URL scheme for Google OAuth callback
- Configure CFBundleURLTypes if needed

---

### Phase 3: QA Tester - Verify Authentication

**Task 3.1: Apple Sign In Tests**
- Test fresh sign in with Apple
- Test returning user sign in
- Test session persistence across app restarts
- Test sign out

**Task 3.2: Google Sign In Tests**
- Test fresh sign in with Google
- Test returning user sign in
- Test session persistence
- Test sign out

**Task 3.3: Edge Cases**
- Test cancellation handling
- Test network error handling
- Test switching between providers
- Test guest mode conversion

---

## Agent Assignments

| Agent | Branch | Tasks |
|-------|--------|-------|
| Backend Engineer | `backend/auth-fix-google-2024-12-30` | Phase 1 |
| UI Designer | `ui/google-signin-2024-12-30` | Phase 2 |
| QA Tester | `qa/auth-testing-2024-12-30` | Phase 3 |

---

## Supabase Configuration Requirements

### Apple Provider
```
Service ID: com.litplan.app.service
Team ID: [Your Apple Team ID]
Key ID: [Your Apple Key ID]
Private Key: [P8 file contents]
```

### Google Provider
```
Client ID: [Google OAuth Client ID]
Client Secret: [Google OAuth Client Secret]
Authorized redirect: https://[project-ref].supabase.co/auth/v1/callback
```

---

## Success Criteria

1. Apple Sign In works end-to-end
2. Google Sign In button appears in LoginView
3. Google Sign In works end-to-end
4. Session persists across app restarts
5. Sign out clears session for both providers
6. Error handling shows appropriate messages

---

## Notes for Agents

- **Backend Engineer**: Focus on Supabase configuration. Document any manual steps required in the Supabase Dashboard.
- **UI Designer**: Follow existing design system. The Google button should match the Apple button styling.
- **QA Tester**: Wait for UI and Backend work before testing. Document all test cases.

---

## PM Review Checklist

- [ ] All agent branches pushed
- [ ] No merge conflicts
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Ready for merge
