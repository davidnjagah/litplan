# App Review Notes — LitPlanz v2.3 (Build 8)

**Submission type:** Update (previously approved as v2.2)
**Platform:** iOS 17.0+
**Submitted:** 2026-05-29

---

## What's new in v2.3

A small follow-up release after v2.2 with two targeted fixes — one stability, one cosmetic. **No new permissions** have been added since v2.0.

1. **Pro subscription detection (server + client).** After v2.2 shipped, some users with active subscriptions were intermittently shown as Free. The root cause was a date-decoding mismatch between the iOS app and our backend: timestamps from a `timestamp without time zone` Postgres column came back without a `Z`, and the iOS `JSONDecoder` was configured for strict ISO8601. The `/subscription/status` response was therefore being thrown away, and the app fell back to StoreKit (which, on a fresh install with no receipt yet, returned nothing → Pro hidden). Fixed two ways:
   - iOS: lenient date decoder that accepts ISO8601 with or without a timezone designator.
   - Backend: `getSubscriptionStatus` / `verifySubscription` / `restorePurchases` now return all dates as proper ISO8601 with `Z`.
   - Pro is also explicitly bound to the signed-in app account via `appAccountToken`, so on a shared device the entitlement no longer "follows the Apple ID" into a different app account. Pre-v2.2 transactions without `appAccountToken` are still honoured for backwards compatibility and auto-bind on the next renewal or **Restore Purchases** tap.

2. **Sign in with Apple button width.** Pre-v2.3 the button was capped at 375 pt while the Google and Email buttons stretched to the parent's width, so they appeared slightly misaligned on phones larger than an iPhone SE. v2.3 makes all three buttons full-width with the same 50 pt height and corner radius.

Everything else is identical to v2.2.

---

## Recommended testing flow (~2 minutes)

### 1. Login layout (10 s)
On the launch screen, confirm **Sign in with Apple**, **Sign in with Google**, and **Continue with Email** sit in an aligned column — same width, same height.

### 2. Pro subscription is recognised (1 minute)
1. Tap **Sign In with Apple** (or Google / Email — the fix applies to all three providers).
2. Use the demo Pro account credentials in the metadata.
3. **Expected:** Profile → Subscription shows **Pro** immediately on landing.
4. Tap **Sign Out**.
5. Sign in as a different (non-Pro) account using the demo Free credentials.
6. **Expected:** Profile → Subscription shows **Free** — no Pro leakage from the previous account.
7. Sign out and sign back in as the Pro account.
8. **Expected:** Pro re-appears automatically. (If it doesn't, tap **Profile → Settings → Restore Purchases** — explained in "Known nuances" below.)

---

## AI-generated content disclosure
Unchanged from v2.2. All plans are generated using OpenAI's GPT models, then venue addresses, ratings, and opening hours are verified against the Google Places API before being shown to the user.

## External services the app communicates with
Unchanged from v2.2.

## Permissions
**No new permissions are introduced in v2.3.** Set is unchanged since v2.0: camera, location-when-in-use, photo library — all with user-friendly usage description strings.

---

## Known nuances worth flagging

- **Account-bound Pro detection.** v2.3 binds StoreKit entitlements to the signed-in app account using `appAccountToken`. Pre-v2.3 transactions without `appAccountToken` are still honoured and auto-bind on the next renewal or **Restore Purchases** tap. If reviewers see Pro temporarily disappear while switching across multiple accounts on the same device, Profile → Settings → **Restore Purchases** re-establishes the binding within a second.
- **In-app update prompt won't show during review.** It's driven by a server-side config (`AppVersionConfig.latestAppVersion`) that we'll only bump to `2.3` after this build is publicly live — so reviewers on v2.3 see no prompt (correct, because v2.3 *is* the latest).

---

Thank you for reviewing LitPlanz v2.3. If anything behaves unexpectedly, please reach out before rejecting — happy to record a walkthrough or jump on a call.

— The LitPlanz team
