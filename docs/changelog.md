# Changelog

---

## 2026-05-07

### Password Reset Flow

- Audited the full password reset flow end-to-end (iOS app, web, Supabase Auth, email templates)
- Confirmed both paths work: iOS deep link (`com.litplanz.app://auth-callback`) and browser (`/auth/reset-password`)
- Documented flow in `docs/email-templates.md`

### Password Reset Success Email

- Added `generatePasswordResetSuccessEmail()` template to the `send-notification` edge function
  - Branded dark-themed email with green success icon
  - Includes "Wasn't you?" security warning with `support@litplanz.com` contact
- Fixed `FROM_EMAIL` in `send-notification` from `hello@notify.litplanz.com` → `noreply@litplanz.com` (verified Resend domain)
- **iOS** (`AuthenticationManager.swift`): fires success email after `auth.update(password:)` succeeds, before signing out. Uses active session for email + access token
- **Web** (`website/auth/reset-password.html`): fires success email after `auth.updateUser()` succeeds, non-blocking
- Deployed `send-notification` edge function to production (`clktdigankjszupvrsqt`)

### Secrets & SMTP

- `RESEND_API_KEY` rotated and updated in two places:
  - Supabase Dashboard → Settings → Edge Functions (for `send-notification`)
  - Supabase Dashboard → Authentication → SMTP Settings (for Supabase Auth emails)

> **Important:** Both locations must always use the same Resend API key. Rotating the key in one place without updating the other will break either transactional emails or auth emails.

### Free Trial — 7 Days

- Updated App Store Connect: yearly subscription introductory offer changed from 3 days → 1 week (7 days)
  - Located at: Subscriptions → [Group] → subscription → Subscription Prices → Introductory Offers
- Updated `PaywallView.swift` display copy from "3-day free trial" → "7-day free trial"

### Free Weekly Vibez Generation (Email Users)

- Free users who signed in via email now receive **1 Vibez generation per week**
- Token resets 7 days after last use; non-email free users (Apple/Google) see the paywall
- **`BoltTokenManager.swift`** changes:
  - Added `freeTokenUsedDateKey` (`bolt_free_token_used_date`) UserDefaults key
  - Added `@Published var freeTokenAvailable: Bool`
  - Added `isEmailUser` — reads provider from `appMetadata` / `userMetadata`
  - Added `canFreeEmailUserGenerate` — non-Pro + email user + token available
  - Added `loadFreeTokenState()` — called on init and every foreground resume
  - Added `consumeFreeToken()` — stamps date, sets `freeTokenAvailable = false`
  - Added `daysUntilFreeTokenRefresh` — for toast countdown messaging
  - Hooked `loadFreeTokenState()` into `setupWeeklyRefreshCheck()` foreground observer
- **`BoltView.swift`** changes:
  - `canGenerate` now returns true for free email users with available token
  - `generationDisabledReason` shows countdown instead of paywall prompt for email users
  - `handleBoltTap()` routes correctly: Pro → Pro tokens, free email → free token, free non-email → paywall
  - `generateGroupFlow(useFreeToken:)` consumes the correct token type on success only

### Onboarding Copy

- **Vibez screen** (`OnboardingPage.swift`): description updated to mention free weekly Vibez for email members
- **Pro comparison screen** (`ProComparisonPageView.swift`):
  - Free card: "Basic vibes" → "1 Vibez/week (email)"
  - Pro card: "All vibes" → "Unlimited Vibez"

### Documentation

- Created `docs/email-templates.md` — all email templates, reset flow, secrets reference
- Created `docs/free-tier.md` — free tier feature breakdown, weekly Vibez logic, free trial details
- Created `docs/changelog.md` — this file
