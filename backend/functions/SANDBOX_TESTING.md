# StoreKit Sandbox Testing Guide

## Overview

This document provides comprehensive instructions for testing Apple StoreKit subscriptions using the sandbox environment. The sandbox allows you to test the entire subscription lifecycle without real transactions.

## Table of Contents

- [Sandbox Environment Overview](#sandbox-environment-overview)
- [Creating Sandbox Test Accounts](#creating-sandbox-test-accounts)
- [Sandbox vs Production Differences](#sandbox-vs-production-differences)
- [Testing Monthly and Yearly Subscriptions](#testing-monthly-and-yearly-subscriptions)
- [Expected Apple verifyReceipt Responses](#expected-apple-verifyreceipt-responses)
- [Testing Scenarios](#testing-scenarios)
- [Common Sandbox Issues and Solutions](#common-sandbox-issues-and-solutions)
- [Testing Checklist for QA](#testing-checklist-for-qa)

---

## Sandbox Environment Overview

The StoreKit sandbox is a test environment provided by Apple that simulates the App Store for in-app purchase testing. Key characteristics:

- **No Real Money**: All transactions are simulated; no actual charges occur
- **Accelerated Time**: Subscription renewals happen much faster than in production
- **Separate Environment**: Uses different Apple servers from production
- **Test Accounts**: Requires special sandbox Apple IDs for testing

### Accelerated Subscription Renewal Times

In sandbox, subscriptions renew at accelerated rates to facilitate testing:

| Production Duration | Sandbox Duration |
|---------------------|------------------|
| 1 week              | 3 minutes        |
| 1 month             | 5 minutes        |
| 2 months            | 10 minutes       |
| 3 months            | 15 minutes       |
| 6 months            | 30 minutes       |
| 1 year              | 1 hour           |

**Important**: After 6 renewals, sandbox subscriptions automatically expire to test expiration scenarios.

---

## Creating Sandbox Test Accounts

### Step 1: Access App Store Connect

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access**
3. Click on **Sandbox** tab
4. Click the **+** button to add a new sandbox tester

### Step 2: Create Sandbox Account

Fill in the required information:

- **First Name**: Test user first name
- **Last Name**: Test user last name
- **Email**: A **unique** email address (can be fake, but must be unique)
  - Example: `litplan.test1@example.com`
  - **Note**: You cannot use an email associated with a real Apple ID
- **Password**: Password for the test account (must meet Apple's requirements)
- **Country/Region**: Select the App Store region to test (e.g., United States)
- **App Store Territory**: Will auto-populate based on country

### Step 3: Save and Record Credentials

- Click **Save**
- **Important**: Record the email and password in a secure location (e.g., password manager)
- You will need these credentials to sign in on test devices

### Multiple Test Accounts

It's recommended to create multiple test accounts for different testing scenarios:

- **litplan.test.monthly@example.com**: For testing monthly subscriptions
- **litplan.test.yearly@example.com**: For testing yearly subscriptions
- **litplan.test.restore@example.com**: For testing restore purchases
- **litplan.test.renewal@example.com**: For testing auto-renewal scenarios

---

## Sandbox vs Production Differences

### Receipt Validation Endpoints

- **Production**: `https://buy.itunes.apple.com/verifyReceipt`
- **Sandbox**: `https://sandbox.itunes.apple.com/verifyReceipt`

### Status Code 21007 and 21008

Our backend automatically handles environment mismatch:

- **Status 21007**: Receipt is from sandbox but sent to production
  - Backend automatically retries with sandbox endpoint
- **Status 21008**: Receipt is from production but sent to sandbox
  - Returns error (should not happen in normal testing)

### Transaction IDs

Sandbox transaction IDs follow the format `1000000XXXXXXXXX` (13 digits starting with 1000000).

---

## Testing Monthly and Yearly Subscriptions

### Litplan Product IDs

Ensure your backend and iOS app use these product IDs:

- **Monthly**: `com.litplan.pro.monthly`
- **Yearly**: `com.litplan.pro.yearly`

### Testing Monthly Subscription

1. **Sign out** of production Apple ID on test device (Settings > Apple ID)
2. Launch Litplan app
3. Navigate to subscription paywall
4. Tap "Subscribe Monthly"
5. When prompted, sign in with sandbox test account
6. Complete purchase (no payment required in sandbox)
7. **Verify**:
   - Subscription status updates to "Pro"
   - User entitlements are updated
   - Receipt is validated by backend

### Testing Yearly Subscription

Follow the same process as monthly, but select "Subscribe Yearly" option.

### Accelerated Renewal Testing

After initial purchase:

- **Monthly subscription**: Renews every 5 minutes (6 times max)
- **Yearly subscription**: Renews every 1 hour (6 times max)

**To observe renewals**:

1. Purchase subscription in app
2. Keep app open or check subscription status periodically
3. After 5 minutes (monthly) or 1 hour (yearly), check that:
   - `expiryDate` is extended
   - `autoRenew` status is still `true`
   - Backend receives updated receipt

---

## Expected Apple verifyReceipt Responses

### Successful Validation (Status 0)

```json
{
  "status": 0,
  "environment": "Sandbox",
  "latest_receipt_info": [
    {
      "transaction_id": "1000000123456789",
      "original_transaction_id": "1000000123456789",
      "product_id": "com.litplan.pro.monthly",
      "purchase_date_ms": "1703779200000",
      "expires_date_ms": "1703779500000",
      "is_trial_period": "false",
      "is_in_intro_offer_period": "false"
    }
  ],
  "pending_renewal_info": [
    {
      "auto_renew_status": "1",
      "product_id": "com.litplan.pro.monthly",
      "original_transaction_id": "1000000123456789"
    }
  ]
}
```

### Expired Subscription (Status 21006)

```json
{
  "status": 21006,
  "environment": "Sandbox",
  "latest_receipt_info": [
    {
      "transaction_id": "1000000123456789",
      "original_transaction_id": "1000000123456789",
      "product_id": "com.litplan.pro.monthly",
      "purchase_date_ms": "1703779200000",
      "expires_date_ms": "1703779500000",
      "is_trial_period": "false",
      "is_in_intro_offer_period": "false"
    }
  ],
  "pending_renewal_info": [
    {
      "auto_renew_status": "0",
      "product_id": "com.litplan.pro.monthly",
      "original_transaction_id": "1000000123456789",
      "expiration_intent": "1"
    }
  ]
}
```

**Note**: Status 21006 means the receipt is valid but the subscription has expired.

### Sandbox Environment Mismatch (Status 21007)

```json
{
  "status": 21007
}
```

Our backend automatically handles this by retrying with the sandbox endpoint.

### Invalid Receipt (Status 21003)

```json
{
  "status": 21003
}
```

This indicates the receipt data is invalid or cannot be authenticated.

---

## Testing Scenarios

### 1. New Subscription Purchase

**Objective**: Test the complete flow from free to Pro tier.

**Steps**:

1. Create new user in app (or use existing free tier user)
2. Navigate to subscription screen
3. Purchase monthly or yearly subscription
4. Verify:
   - User is upgraded to Pro tier in Firestore
   - `subscription.tier` = `"pro"`
   - `subscription.expiryDate` is set (5 minutes or 1 hour from now)
   - `subscription.autoRenew` = `true`
   - `subscription.transactionId` matches StoreKit transaction
   - `subscription.productId` matches selected product
   - All 5 entitlements are updated:
     - `maxCitiesPerWeek` = 100
     - `maxPlansPerCity` = 50
     - `weekendAccess` = true
     - `groupPlansAccess` = true
     - `savedCitiesAccess` = true

**Expected Backend Logs**:

```
Validating subscription for user abc123: { transactionId: '1000000123456789', productId: 'com.litplan.pro.monthly' }
Validating Apple receipt with Apple servers
Receipt validated successfully: { transactionId: '1000000123456789', expiryDate: '2025-12-28T15:30:00.000Z', autoRenew: true }
User abc123 entitlements updated to pro tier
User abc123 upgraded to Pro successfully
```

---

### 2. Subscription Renewal (Accelerated Time)

**Objective**: Test auto-renewal functionality in sandbox.

**Steps**:

1. Purchase monthly subscription
2. Wait 5 minutes (sandbox renewal time)
3. Call `GET /subscription/status` or check Firestore
4. Verify:
   - `expiryDate` is extended by another 5 minutes
   - `autoRenew` is still `true`
   - User remains on Pro tier

**Expected Behavior**:

- Subscription renews automatically 6 times
- After 6th renewal, subscription expires (sandbox limitation)

**Backend Monitoring**:

Monitor logs for automatic receipt updates from Apple's server notifications (if implemented).

---

### 3. Subscription Expiration

**Objective**: Test what happens when a subscription expires.

**Steps**:

1. Purchase monthly subscription in sandbox
2. Wait for 6 renewals (approximately 30 minutes)
3. After 6th renewal, subscription will not renew
4. Wait for expiry date to pass
5. Verify:
   - User should be downgraded to free tier by `syncSubscriptionStatus` scheduled job
   - All entitlements reset to free tier values

**Manual Testing**:

You can also test expiration by:

1. Disabling auto-renewal in sandbox (go to Settings > Apple ID > Subscriptions on test device)
2. Cancel the subscription
3. Wait for expiry date to pass

**Verify Downgrade**:

- `subscription.tier` = `"free"`
- `subscription.status` = `"free"`
- `subscription.expiryDate` = `null`
- `subscription.autoRenew` = `false`
- All entitlements reset:
  - `maxCitiesPerWeek` = 1
  - `maxPlansPerCity` = 10
  - `weekendAccess` = false
  - `groupPlansAccess` = false
  - `savedCitiesAccess` = false

---

### 4. Restore Purchases

**Objective**: Test the restore purchases functionality.

**Steps**:

1. Purchase subscription on Device A with sandbox account A
2. Install app on Device B (or delete and reinstall on same device)
3. Sign in with the same user account (Firebase Auth)
4. Tap "Restore Purchases"
5. Sign in with the same sandbox Apple ID when prompted
6. Verify:
   - Subscription is restored
   - User is upgraded to Pro tier
   - All entitlements are restored

**Backend Endpoint**:

```
POST /subscription/restore
Authorization: Bearer <user_token>
```

**Expected Response** (if subscription found):

```json
{
  "success": true,
  "restored": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2025-12-28T15:30:00.000Z",
    "autoRenew": true
  }
}
```

---

### 5. Receipt Validation Failures

**Objective**: Test how backend handles invalid receipts.

#### Test Case 5A: Invalid Receipt Data

**Steps**:

1. Call `POST /subscription/validate` with malformed receipt data
2. Verify backend returns appropriate error

**Request**:

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/validate \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "1000000123456789",
    "productId": "com.litplan.pro.monthly",
    "receiptData": "INVALID_BASE64"
  }'
```

**Expected Response**:

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "The receipt could not be authenticated"
  }
}
```

#### Test Case 5B: Expired Receipt

**Steps**:

1. Use receipt from expired sandbox subscription
2. Verify backend rejects it

**Expected Response**:

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "Subscription has expired"
  }
}
```

#### Test Case 5C: Missing Receipt Data

**Steps**:

1. Call `POST /subscription/validate` without `receiptData`

**Expected Response**:

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "Receipt data is required for validation"
  }
}
```

---

### 6. Sandbox vs Production Mismatch

**Objective**: Verify backend handles environment mismatch gracefully.

**Steps**:

1. Use sandbox receipt but send to production endpoint (backend should auto-handle this)
2. Verify backend detects status 21007 and retries with sandbox endpoint
3. Subscription should validate successfully

**Backend Logs to Verify**:

```
Receipt is from sandbox environment, retrying with sandbox endpoint
Receipt validated successfully
```

---

## Common Sandbox Issues and Solutions

### Issue 1: "Cannot connect to iTunes Store"

**Symptoms**: App shows error when trying to purchase in sandbox.

**Solutions**:

- Ensure you're signed out of production Apple ID
- Sign in with sandbox account in app (not in Settings)
- Check device has internet connection
- Restart app and try again

---

### Issue 2: Sandbox account not working

**Symptoms**: Sandbox credentials rejected during purchase.

**Solutions**:

- Verify email and password are correct
- Ensure email is not associated with a real Apple ID
- Create a new sandbox account if needed
- Check that sandbox account is active in App Store Connect

---

### Issue 3: Subscription not renewing

**Symptoms**: Subscription doesn't renew after 5 minutes.

**Solutions**:

- Remember: Sandbox subscriptions only renew 6 times max
- Check if subscription has already reached max renewals
- Verify `autoRenew` status is `true` in Firestore
- Purchase a new subscription to reset renewal counter

---

### Issue 4: Receipt validation returns 21007

**Symptoms**: Backend logs show status 21007.

**Solutions**:

- This is expected behavior in sandbox
- Backend should automatically retry with sandbox endpoint
- Verify `APPLE_SHARED_SECRET` environment variable is set
- Check backend logs to ensure retry is successful

---

### Issue 5: Duplicate transactions

**Symptoms**: Same transaction ID appears multiple times.

**Solutions**:

- Implement transaction ID deduplication in backend
- Store processed transaction IDs in Firestore
- Check for existing transaction before processing

---

### Issue 6: Wrong expiry date

**Symptoms**: Expiry date is incorrect (not 5 minutes or 1 hour from purchase).

**Solutions**:

- Verify you're parsing `expires_date_ms` correctly (milliseconds since epoch)
- Check timezone conversions
- Ensure backend is using sandbox renewal times, not production

---

## Testing Checklist for QA

Use this checklist to ensure comprehensive testing coverage:

### Pre-Testing Setup

- [ ] Sandbox test accounts created in App Store Connect
- [ ] Backend has `APPLE_SHARED_SECRET` environment variable set
- [ ] iOS app is configured to use sandbox environment
- [ ] Product IDs match between app and backend
- [ ] Test device signed out of production Apple ID

### Functional Testing

- [ ] **New Purchase**: Free user can purchase monthly subscription
- [ ] **New Purchase**: Free user can purchase yearly subscription
- [ ] **Validation**: Receipt is validated with Apple servers
- [ ] **Entitlements**: User is upgraded to Pro tier with correct limits
- [ ] **Firestore**: All subscription fields are correctly saved
- [ ] **Renewal**: Monthly subscription renews after 5 minutes
- [ ] **Renewal**: Yearly subscription renews after 1 hour
- [ ] **Expiration**: Subscription expires after 6 renewals
- [ ] **Downgrade**: User is downgraded to free tier after expiration
- [ ] **Restore**: User can restore purchases on new device
- [ ] **Restore**: Restored subscription updates user entitlements

### Error Handling

- [ ] **Invalid Receipt**: Backend rejects malformed receipt data
- [ ] **Expired Receipt**: Backend rejects expired subscriptions
- [ ] **Missing Fields**: Backend validates all required fields
- [ ] **Network Error**: App handles network failures gracefully
- [ ] **User Not Found**: Backend returns appropriate error for invalid user

### Security Testing

- [ ] **Authentication**: All endpoints require valid Firebase Auth token
- [ ] **Authorization**: Users cannot validate receipts for other users
- [ ] **Receipt Validation**: All receipts are verified with Apple servers
- [ ] **Transaction IDs**: Duplicate transactions are detected and rejected

### Performance Testing

- [ ] **Response Time**: Receipt validation completes within 5 seconds
- [ ] **Concurrent Users**: Backend handles multiple validation requests
- [ ] **Scheduled Job**: `syncSubscriptionStatus` processes 1000+ users efficiently

### Edge Cases

- [ ] **Multiple Devices**: Same subscription works on multiple devices
- [ ] **App Reinstall**: Subscription persists after app reinstall
- [ ] **Network Loss**: App handles network loss during purchase
- [ ] **Cancel Subscription**: User can cancel auto-renewal in Settings
- [ ] **Resubscribe**: User can resubscribe after cancellation

---

## Additional Resources

- [Apple StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Server API Documentation](https://developer.apple.com/documentation/appstoreserverapi)
- [Testing In-App Purchases](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases)
- [Sandbox Tester Accounts](https://help.apple.com/app-store-connect/#/dev8b997bee1)

---

## Support

For questions or issues related to sandbox testing:

1. Check backend logs for detailed error messages
2. Review Apple's status codes in `APPLE_STATUS_CODES` mapping
3. Consult `SUBSCRIPTION_TESTING_GUIDE.md` for API testing examples
4. Contact backend team for assistance with receipt validation

---

**Document Version**: 1.0
**Last Updated**: 2025-12-28
**Sprint**: Sprint 3 - Monetization & Growth
**Day**: 12 (StoreKit Integration)
