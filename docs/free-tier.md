# LitPlanz Free Tier

## Overview

Free accounts have access to a limited but meaningful set of features. The goal is to give users a genuine taste of the product before upgrading to Pro.

---

## Free Tier Features

| Feature | Free | Pro |
|---|---|---|
| Cities | 3 cities | 100+ cities |
| Plans per week | 5 plans/week | Unlimited |
| Vibez generation | 1 per week (email sign-in only) | Unlimited |
| Priority support | ✗ | ✓ |
| Early access | ✗ | ✓ |

---

## Free Weekly Vibez Generation

Email sign-in users receive **1 free Vibez generation per week**. This does not apply to users who signed in via Apple or Google.

### How it works

- Token resets **7 days** after the last generation (not on a fixed calendar day)
- Token state is stored in `UserDefaults` under the key `bolt_free_token_used_date`
- State is re-evaluated every time the app comes to the foreground (`willEnterForegroundNotification`)
- Token is consumed **only after a successful generation** — failures return the token to the user

### Sign-in method detection

Provider is read from `SupabaseUser.appMetadata["provider"]` and `SupabaseUser.userMetadata?.provider`. Email users have provider `"email"`. Apple and Google users have provider `"apple"` and `"google"` respectively.

### Key files

| File | Role |
|---|---|
| `ios-app/Litplan/Services/BoltTokenManager.swift` | Token state, `canFreeEmailUserGenerate`, `consumeFreeToken()`, `loadFreeTokenState()` |
| `ios-app/Litplan/Views/BoltView.swift` | Generation gating, UI routing, token consumption on success |

### User-facing messaging

- **Onboarding (Vibez screen):** "Email members get one complimentary Vibez every week — no subscription needed."
- **Free vs Pro comparison card:** "1 Vibez/week (email)" vs "Unlimited Vibez"
- **Toast when token is spent:** "Free generation resets in X day(s)"
- **Non-email free users:** Paywall shown immediately

---

## Free Trial

New users are offered a **7-day free trial** of Pro on the yearly plan.

- Configured in App Store Connect under **Subscriptions → [Group] → Introductory Offers**
- Type: Free Trial, Duration: 1 Week
- UI copy lives in `ios-app/Litplan/Views/PaywallView.swift`
- The "Start Free Trial" button is shown for the yearly plan; "Subscribe Now" for monthly

> If the free trial duration is ever changed in App Store Connect, update the display text in `PaywallView.swift` to match.
