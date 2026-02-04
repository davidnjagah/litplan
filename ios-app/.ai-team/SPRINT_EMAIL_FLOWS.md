# Sprint Plan: Email Authentication Flow Pages

## Executive Summary

This sprint implements four email-based authentication flow screens for the LitPlanz iOS app:
1. **Email Verification** - Handle email confirmation after signup
2. **Password Reset** - Allow users to set a new password from recovery email
3. **Magic Link Login** - Passwordless sign-in via email link
4. **Invite Accept** - New user onboarding from invitation email

**Estimated Duration:** 5-7 days
**Priority:** High - Critical for complete authentication experience
**Sprint Start:** February 3, 2026

---

## Technical Context

### Current Architecture
- **URL Scheme:** `com.litplanz.app` (configured in Info.plist)
- **URL Handler:** `LitplanApp.swift` - `handleOAuthCallback(url:)` method
- **Auth Manager:** `AuthenticationManager.swift` - singleton pattern, `@MainActor`
- **Supabase Manager:** `SupabaseManager.swift` - handles session and auth state changes
- **Domain:** `litplanz.com`

### Supabase Email Token Types
Supabase sends emails with URLs containing different `type` parameters:
- `type=signup` - Email verification (confirmation)
- `type=recovery` - Password reset
- `type=magiclink` - Magic link login
- `type=invite` - User invitation

---

## New Files Required

### Models
| File | Purpose |
|------|---------|
| `DeepLinkType.swift` | Enum for all deep link types with URL parsing |

### Services
| File | Purpose |
|------|---------|
| `DeepLinkHandler.swift` | Centralized deep link routing and processing |

### Views (Auth folder)
| File | Purpose |
|------|---------|
| `EmailVerificationView.swift` | Success screen after email verification |
| `PasswordResetView.swift` | Form for setting new password |
| `MagicLinkVerifyView.swift` | Loading screen during magic link verification |
| `InviteAcceptView.swift` | Welcome screen for invited users |
| `AuthFlowContainerView.swift` | Container that routes to appropriate auth view |

---

## File Modifications Required

| File | Changes |
|------|---------|
| `LitplanApp.swift` | Expand URL handler, add fullScreenCover for auth flows |
| `AuthenticationManager.swift` | Add verifyEmail, resetPassword, verifyMagicLink, acceptInvite methods |
| `SupabaseManager.swift` | Handle passwordRecovery event |

---

## Implementation Tasks

### Day 1: Foundation ✅ COMPLETED
- [x] Create `DeepLinkType.swift` enum
- [x] Create `DeepLinkHandler.swift` service
- [x] Update `LitplanApp.swift` URL handling
- [x] Create `AuthFlowContainerView.swift`

### Day 2: Email Verification Flow ✅ COMPLETED
- [x] Create `EmailVerificationView.swift`
- [x] Add `verifyEmail(tokenHash:)` to AuthenticationManager
- [ ] Test verification flow

### Day 3: Password Reset Flow ✅ COMPLETED
- [x] Create `PasswordResetView.swift`
- [x] Add `resetPassword(tokenHash:newPassword:)` to AuthenticationManager
- [x] Add password validation
- [ ] Test reset flow

### Day 4: Magic Link Flow ✅ COMPLETED
- [x] Create `MagicLinkVerifyView.swift`
- [x] Add `verifyMagicLink(tokenHash:)` to AuthenticationManager
- [ ] Test magic link flow

### Day 5: Invite Accept Flow ✅ COMPLETED
- [x] Create `InviteAcceptView.swift`
- [x] Add `acceptInvite(tokenHash:)` to AuthenticationManager
- [ ] Test invite flow

### Day 6: Polish & Integration
- [x] Add haptic feedback (included in views)
- [x] Add accessibility labels (included in views)
- [x] Handle edge cases (expired tokens, network errors) - error handling included
- [ ] Update Supabase redirect URLs in dashboard

### Day 7: QA & Documentation
- [ ] Full integration testing
- [x] Update documentation
- [ ] Code review

---

## Supabase Configuration Required

### Redirect URLs (add in Supabase Dashboard)
- `com.litplanz.app://auth-callback`
- `com.litplanz.app://email-verified`
- `com.litplanz.app://password-reset`
- `com.litplanz.app://magic-link`
- `com.litplanz.app://invite-accept`

---

## UI Design Specifications

### Color Palette
- Background: `Color.appBackground`
- Primary Surface: `Color.surfacePrimary`
- Accent: `Color.accentPrimary`
- Success: `Color.success`
- Error: `Color.error`

### Component Patterns
- Use `PrimaryButton` for main CTAs
- Use `SecondaryButton` for secondary actions
- Use `LitplanTextFieldStyle` for text inputs
- Use `HapticManager` for feedback

---

## Error Handling

| Error | Message | Action |
|-------|---------|--------|
| Expired Token | "This link has expired" | Request new link |
| Invalid Token | "Invalid or already used" | Return to login |
| Network Error | "Check your connection" | Retry button |
| Server Error | "Something went wrong" | Retry button |

---

## Testing Checklist

- [ ] Email verification with real email
- [ ] Password reset with real email
- [ ] Magic link login with real email
- [ ] Invite acceptance with real email
- [ ] Test on physical device
- [ ] Test error states
- [ ] Test accessibility

---

**Status:** In Progress
**Last Updated:** February 3, 2026
