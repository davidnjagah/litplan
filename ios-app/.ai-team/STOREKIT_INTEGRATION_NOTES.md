# StoreKit Integration Notes - Day 12

**Date**: December 28, 2025
**Sprint**: Sprint 3, Day 12
**Status**: BLOCKED - WORK NOT STARTED

---

## Executive Summary

QA testing for Day 12 (StoreKit Integration & Subscription Sync) was **blocked** due to missing deliverables. This document outlines the findings, requirements, and recommendations for completing Day 12 work.

---

## Current State Analysis

### What Exists (Day 11 - COMPLETE)

#### iOS (UI Designer)
✅ **PaywallView.swift** - Full-screen subscription modal
- Location: `/Users/davidnjagah/Documents/GitHub/litplanAI/ios-app/Litplan/Views/PaywallView.swift`
- Status: Complete UI, but **StoreKit integration pending**
- Lines: 433
- Quality: 5/5 stars
- Features:
  - Crown icon with Electric Cyan accent
  - 5 benefits list with checkmark icons
  - Pricing cards (Monthly $9.99, Yearly $79.99)
  - "BEST VALUE" badge on yearly
  - Primary CTA button
  - "Maybe Later" dismissal
  - Legal text and restore link
  - Loading state (@State isProcessing)

**CRITICAL**: Contains TODO comments indicating StoreKit work needed:
```swift
// Line 232-238
private func handleSubscribe() {
    isProcessing = true
    // TODO: Integrate with StoreKit 2 in Sprint 3, Days 8-9
    // For now, simulate API call
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
        isProcessing = false
```

```swift
// Line 241-244
private func handleRestorePurchases() {
    // TODO: Implement restore purchases with StoreKit 2
    print("Restore purchases tapped")
}
```

#### Backend (Backend Engineer)
✅ **subscription.ts** - Apple receipt validation
- Location: `/Users/davidnjagah/Documents/GitHub/litplanAI/backend/functions/src/api/subscription.ts`
- Status: Complete with real Apple API integration
- Lines: 483
- Quality: 5/5 stars
- Features:
  - Real Apple verifyReceipt integration
  - Production endpoint: buy.itunes.apple.com
  - Sandbox endpoint: sandbox.itunes.apple.com
  - Automatic sandbox fallback (status 21007)
  - All status codes handled (0, 21000-21010)
  - POST /subscription/validate endpoint
  - GET /subscription/status endpoint
  - POST /subscription/restore endpoint (placeholder)
  - updateUserEntitlements integration
  - Expiry date extraction
  - Auto-renew status parsing

### What Is Missing (Day 12 - NOT STARTED)

#### iOS (UI Designer)
❌ **Products.plist** - StoreKit product configuration
- Expected path: `Litplan/StoreKit/Products.plist`
- Purpose: Define in-app purchase products
- Required contents:
  - Product 1: Monthly subscription
    - ID: com.litplan.pro.monthly
    - Type: auto_renewable_subscription
    - Price: $9.99
  - Product 2: Yearly subscription
    - ID: com.litplan.pro.yearly
    - Type: auto_renewable_subscription
    - Price: $79.99

❌ **SubscriptionManager.swift** - StoreKit 2 integration
- Expected path: `Litplan/StoreKit/SubscriptionManager.swift`
- Purpose: Manage StoreKit 2 interactions and backend validation
- Required functionality:
  - Singleton pattern (`static let shared`)
  - ObservableObject protocol
  - @Published properties:
    - `var availableProducts: [Product] = []`
    - `var purchasedProductIDs: Set<String> = []`
    - `var isProUser: Bool = false`
  - Functions:
    - `loadProducts() async throws` - Load products from App Store
    - `purchase(_ product: Product) async throws -> Transaction?` - Purchase flow
    - `restorePurchases() async throws` - Restore previous purchases
    - `validateWithBackend(_ transaction: Transaction) async throws` - Backend validation
    - `checkSubscriptionStatus() async` - Check Pro status
  - Error handling for all scenarios
  - Transaction verification with .checkVerified()
  - Backend integration (POST /subscription/validate)

❌ **PaywallView.swift Updates** - StoreKit integration
- Location: `Litplan/Views/PaywallView.swift` (existing file)
- Required changes:
  - Remove TODO comments (lines 232, 242)
  - Add `@StateObject var subscriptionManager = SubscriptionManager.shared`
  - Add `.onAppear { Task { try? await subscriptionManager.loadProducts() } }`
  - Update pricing display to use `subscriptionManager.availableProducts`
  - Update `handleSubscribe()`:
    ```swift
    private func handleSubscribe() {
        isProcessing = true
        Task {
            do {
                guard let product = subscriptionManager.availableProducts.first(where: {
                    $0.id == (selectedPlan == .yearly ? "com.litplan.pro.yearly" : "com.litplan.pro.monthly")
                }) else { return }

                let transaction = try await subscriptionManager.purchase(product)
                if transaction != nil {
                    dismiss() // Success
                }
                isProcessing = false
            } catch {
                // Show error alert
                isProcessing = false
            }
        }
    }
    ```
  - Update `handleRestorePurchases()`:
    ```swift
    private func handleRestorePurchases() {
        Task {
            do {
                try await subscriptionManager.restorePurchases()
                // Show success message or dismiss
            } catch {
                // Show error alert
            }
        }
    }
    ```
  - Add error alert state and presentation

#### Backend (Backend Engineer)
❌ **syncSubscriptionStatus.ts** - Scheduled subscription sync
- Expected path: `backend/functions/src/scheduled/syncSubscriptionStatus.ts`
- Purpose: Daily check for expired subscriptions
- Required functionality:
  - Scheduled function: `functions.pubsub.schedule('0 2 * * *')` (daily 2 AM UTC)
  - Logic:
    1. Query all users where `subscription.tier == 'pro'`
    2. For each user, check if `subscription.expiryDate < now`
    3. If expired, call `updateUserEntitlements(userId, 'free')`
    4. Batch processing (100 users per batch to avoid timeout)
    5. Use Promise.all for parallel processing within batches
    6. Error handling for individual user failures (continue on error)
    7. Logging: total checked, total downgraded, errors
    8. Return summary object
  - TypeScript strong typing
  - Import from firebase-functions
  - Import updateUserEntitlements from helpers

❌ **index.ts Updates** - Export scheduled function
- Location: `backend/functions/src/index.ts` (existing file)
- Required changes:
  - `import { syncSubscriptionStatus } from './scheduled/syncSubscriptionStatus';`
  - `export { syncSubscriptionStatus };`
  - Verify TypeScript compilation succeeds

❌ **SANDBOX_TESTING.md** - Sandbox testing guide
- Expected path: `backend/functions/docs/SANDBOX_TESTING.md`
- Purpose: Guide for testing StoreKit in sandbox mode
- Required contents:
  - Sandbox test account setup instructions
  - App Store Connect configuration steps
  - Accelerated subscription durations (1 month = 5 minutes, etc.)
  - Testing scenarios:
    - New purchase flow
    - Subscription renewal
    - Subscription expiration
    - Restore purchases
    - Refund/cancellation
  - Common issues and solutions
  - Testing checklist for QA

❌ **SUBSCRIPTION_TESTING_GUIDE.md** - API testing guide
- Expected path: `backend/functions/docs/SUBSCRIPTION_TESTING_GUIDE.md`
- Purpose: Guide for testing subscription API endpoints
- Required contents:
  - curl examples for POST /subscription/validate
  - curl examples for GET /subscription/status
  - curl examples for POST /subscription/restore
  - Expected responses for each endpoint
  - Edge cases:
    - Invalid receipt (status 21003)
    - Expired subscription (status 21006)
    - Product ID mismatch
    - Network errors
  - Authentication header examples
  - Test data examples

---

## Key Findings from Testing

### 1. No StoreKit Directory
- Searched entire iOS project: `find /Users/davidnjagah/Documents/GitHub/litplanAI/ios-app -type d -name "StoreKit"`
- Result: **No StoreKit directory found**
- Expected: `Litplan/StoreKit/` directory with Products.plist and SubscriptionManager.swift

### 2. No SubscriptionManager References
- Searched entire iOS project: `grep -r "SubscriptionManager" .`
- Result: **No references found**
- Expected: PaywallView.swift should reference `SubscriptionManager.shared`

### 3. TODO Comments Still Present
- PaywallView.swift line 232: "TODO: Integrate with StoreKit 2 in Sprint 3, Days 8-9"
- PaywallView.swift line 242: "TODO: Implement restore purchases with StoreKit 2"
- Mock implementation still in place (DispatchQueue.main.asyncAfter delay)

### 4. No Scheduled Functions
- Searched backend: `ls backend/functions/src/`
- Result: **No `scheduled/` directory found**
- Expected: `scheduled/syncSubscriptionStatus.ts`

### 5. No Documentation
- Searched backend: `ls backend/functions/docs/`
- Result: **No `docs/` directory found**
- Expected: SANDBOX_TESTING.md and SUBSCRIPTION_TESTING_GUIDE.md

---

## Recommendations for Day 12 Implementation

### Phase 1: iOS StoreKit Integration (UI Designer)

**Estimated Time**: 3-4 hours

**Tasks**:
1. Create `Litplan/StoreKit/` directory
2. Create `Products.plist` with product definitions
3. Create `SubscriptionManager.swift` with full StoreKit 2 integration
4. Update `PaywallView.swift` to use SubscriptionManager
5. Add to Xcode project and verify build
6. Test in Simulator (sandbox mode)

**Critical Requirements**:
- Use StoreKit 2 APIs (Product, Transaction, not deprecated StoreKit 1)
- Implement proper error handling for all purchase scenarios
- Call backend validation endpoint after successful purchase
- Handle .checkVerified() for transaction integrity
- Support both monthly and yearly products
- Implement restore purchases functionality

**Testing Checkpoints**:
- Products load successfully in .onAppear
- Purchase flow triggers StoreKit sheet
- Transaction verification works
- Backend validation called with correct data
- Error cases handled gracefully
- isProUser updates reactively

### Phase 2: Backend Scheduled Function (Backend Engineer)

**Estimated Time**: 2-3 hours

**Tasks**:
1. Create `backend/functions/src/scheduled/` directory
2. Create `syncSubscriptionStatus.ts` with daily cron job
3. Implement batch processing logic (100 users per batch)
4. Use `updateUserEntitlements` from helpers
5. Add comprehensive error handling and logging
6. Update `index.ts` to export function
7. Test TypeScript compilation
8. Test with sample data (manual trigger)

**Critical Requirements**:
- Schedule: `functions.pubsub.schedule('0 2 * * *').timeZone('UTC')`
- Query: `db.collection('users').where('subscription.tier', '==', 'pro').get()`
- Batch size: 100 users (avoid Cloud Functions timeout)
- Error handling: Individual user failures should not stop batch
- Logging: Console logs for monitoring (total checked, downgraded, errors)
- Return summary object with metrics

**Testing Checkpoints**:
- Function compiles without TypeScript errors
- Firestore query returns correct users
- Batch processing works (split into groups of 100)
- updateUserEntitlements called correctly
- Expired users downgraded to free tier
- Logs provide visibility into execution

### Phase 3: Documentation (Backend Engineer)

**Estimated Time**: 1-2 hours

**Tasks**:
1. Create `backend/functions/docs/` directory
2. Write `SANDBOX_TESTING.md` with sandbox setup and scenarios
3. Write `SUBSCRIPTION_TESTING_GUIDE.md` with API examples
4. Include curl commands for all endpoints
5. Document expected responses and edge cases
6. Add common troubleshooting tips

**Critical Requirements**:
- Clear step-by-step instructions
- Real curl examples (copy-paste ready)
- Expected JSON responses
- Edge case coverage
- Testing checklist for QA

---

## Edge Cases to Consider

### Purchase Flow Edge Cases

1. **User Cancels Purchase**
   - StoreKit returns `.userCancelled`
   - Should NOT show error alert
   - Should dismiss loading state silently

2. **Network Error During Backend Validation**
   - Purchase succeeded with Apple
   - Backend call fails (network error, 500 response)
   - Should retry backend validation or store transaction for later sync
   - DO NOT call Apple again (already purchased)

3. **Transaction Verification Fails**
   - `.checkVerified()` throws `.unverified` error
   - Should reject transaction as potentially fraudulent
   - Log error for monitoring
   - Do NOT grant Pro access

4. **Duplicate Transaction**
   - User already has active subscription
   - New purchase attempt
   - Should detect existing transaction
   - May need to restore instead of new purchase

5. **Product Not Found**
   - `availableProducts` is empty
   - Product ID doesn't match
   - Should show user-friendly error ("Products not available, please try again later")
   - Log error for debugging

### Restore Purchases Edge Cases

1. **No Previous Purchases**
   - `Transaction.currentEntitlements` is empty
   - Should show message "No previous purchases found"
   - Should NOT show error alert

2. **Multiple Active Subscriptions**
   - User has both monthly and yearly (edge case, but possible)
   - Should use most recent or highest tier
   - Log warning for investigation

3. **Expired Subscription Restored**
   - Transaction exists but expired
   - Should NOT grant Pro access
   - May offer re-subscribe option

### Scheduled Sync Edge Cases

1. **Large User Base (1000+ Pro users)**
   - Batch processing critical to avoid timeout
   - Use Promise.all within batches for speed
   - Monitor execution time

2. **Firestore Write Conflicts**
   - User upgraded while sync is running
   - Should use Firestore transactions or check timestamp
   - Avoid overwriting recent upgrade

3. **Auto-Renew Subscriptions**
   - Expiry date in past, but auto-renew scheduled
   - Should check with Apple before downgrading
   - May need to defer to Apple's renewal process

---

## Testing Strategy for Day 12 (Once Implemented)

### Unit Tests (QA Tester to Execute)

#### iOS Tests (70 total)
1. **Products.plist Validation** (10 tests)
   - File exists and is valid XML
   - Contains 2 products
   - Product IDs correct
   - Types correct (auto_renewable_subscription)
   - Prices correct

2. **SubscriptionManager Tests** (40 tests)
   - Imports correct
   - Singleton pattern implemented
   - Properties initialized correctly
   - loadProducts() function works
   - purchase() function handles all PurchaseResult cases
   - restorePurchases() iterates transactions
   - validateWithBackend() calls API correctly
   - Error handling comprehensive

3. **PaywallView Integration Tests** (15 tests)
   - @StateObject wired up
   - Products load on appear
   - Real prices displayed
   - Purchase button connected
   - Loading states work
   - Error alerts shown
   - Restore button connected

4. **Xcode Project Integration** (5 tests)
   - Files added to project.pbxproj
   - Build succeeds with 0 errors
   - No duplicate references

#### Backend Tests (40 total)
1. **syncSubscriptionStatus Tests** (25 tests)
   - Function setup correct
   - Schedule configured (daily 2 AM UTC)
   - Query logic correct
   - Batch processing works
   - updateUserEntitlements called
   - Error handling robust
   - Logging comprehensive

2. **index.ts Tests** (3 tests)
   - Import statement present
   - Export statement present
   - TypeScript compiles

3. **Documentation Tests** (12 tests)
   - Files exist
   - Content complete
   - Examples runnable
   - Edge cases covered

### Build Tests (10 total)
1. iOS build succeeds with xcodebuild
2. StoreKit framework linked
3. Products.plist in bundle
4. Backend TypeScript compiles
5. npm run build succeeds
6. No warnings or errors

### Integration Tests (15 total)
1. Full purchase flow (UI → StoreKit → Backend → Firestore)
2. Restore purchases flow
3. Error scenarios (network, invalid receipt, cancellation)
4. Scheduled function execution (manual trigger test)

---

## Performance Considerations

### iOS Performance
- **Product Loading**: Should be async, not block UI
- **Purchase Flow**: StoreKit sheet is native, performant
- **Backend Validation**: Should have timeout (5-10 seconds)
- **UI Updates**: @Published properties trigger SwiftUI updates efficiently

### Backend Performance
- **Scheduled Function Timeout**: Cloud Functions default 60s, may need 120s for large user base
- **Batch Size**: 100 users per batch recommended (adjust based on testing)
- **Parallel Processing**: Promise.all within batch speeds up execution
- **Firestore Reads**: Indexed query on `subscription.tier` is efficient

### Firestore Index Requirements
- Collection: `users`
- Field: `subscription.tier`
- Type: Ascending
- (Likely already indexed from Day 11 work)

---

## Security Considerations

### iOS Security
1. **Transaction Verification**: Always use `.checkVerified()` to validate signature
2. **Backend Validation**: Never trust client-side validation alone
3. **Shared Secret**: Stored securely in backend, not in iOS app
4. **Receipt Data**: Base64 encoded, transmitted over HTTPS

### Backend Security
1. **Authentication Required**: All endpoints use `authenticate` middleware
2. **Input Validation**: Check transactionId, productId, receiptData
3. **Apple Shared Secret**: Environment variable, never committed to repo
4. **Rate Limiting**: Consider adding to prevent abuse
5. **Fraud Detection**: Log duplicate transactions, verify user ownership

---

## Next Steps After Day 12 Implementation

### Day 13 (Planned)
- **Paywall Triggers**: Show paywall when users hit free tier limits
- **Pro Feature Gating**: Lock features for free users
- **Upgrade CTAs**: Add upgrade prompts throughout app

### Day 14-15 (Planned)
- **API Integration**: Replace MockDataService with live API
- **Firebase Authentication**: Login/signup flows

### Testing Timeline
- **Day 12 Implementation**: 4-6 hours (UI + Backend)
- **Day 12 QA Testing**: 2-3 hours (135 tests)
- **Day 12 Fixes (if needed)**: 1-2 hours
- **Day 12 Re-test**: 1 hour

---

## Conclusion

Day 12 work represents a **critical milestone** in the Litplan project: enabling real in-app purchases and subscription management. The backend foundation (Apple validation) is already excellent (5/5 stars from Day 11). The remaining work is primarily iOS StoreKit 2 integration and scheduled sync logic.

**Recommended Approach**:
1. UI Designer focuses on StoreKit integration (3-4 hours)
2. Backend Engineer creates scheduled function and docs (3-5 hours)
3. Both verify builds succeed
4. QA Tester executes full 135-test plan (2-3 hours)
5. Fix any issues found
6. Re-test and approve

**Success Criteria**:
- All 135 tests pass (100%)
- iOS build succeeds with 0 errors
- Backend build succeeds with 0 errors
- Purchase flow works end-to-end
- Restore purchases works
- Scheduled sync logic correct
- Documentation complete

**Risk Level**: MEDIUM
- StoreKit 2 integration is well-documented by Apple
- Backend logic is straightforward (cron job + query)
- Day 11 foundation is solid

**Estimated Total Time**: 8-12 hours (including QA)

---

**Document Created**: December 28, 2025
**Author**: QA Tester Agent
**Status**: Day 12 Blocked - Awaiting Implementation
**Next Review**: After Day 12 deliverables completed
