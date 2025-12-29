# Subscription Testing Guide

## Overview

This guide provides comprehensive testing instructions for all subscription-related endpoints and the scheduled `syncSubscriptionStatus` function. Use this guide to test locally with the Firebase emulator suite and in production with StoreKit sandbox.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Testing POST /subscription/validate](#testing-post-subscriptionvalidate)
- [Testing GET /subscription/status](#testing-get-subscriptionstatus)
- [Testing POST /subscription/restore](#testing-post-subscriptionrestore)
- [Testing syncSubscriptionStatus (Scheduled Function)](#testing-syncsubscriptionstatus-scheduled-function)
- [Verifying Firestore Updates](#verifying-firestore-updates)
- [Testing Edge Cases](#testing-edge-cases)
- [Sample Test Data](#sample-test-data)

---

## Prerequisites

### Required Tools

- **Node.js**: v16 or higher
- **Firebase CLI**: `npm install -g firebase-tools`
- **curl**: For API testing
- **jq**: (Optional) For pretty-printing JSON responses

### Firebase Emulator Setup

1. Install Firebase emulators:

```bash
firebase init emulators
```

Select:
- Functions emulator
- Firestore emulator
- Authentication emulator

2. Start emulators:

```bash
cd /Users/davidnjagah/Documents/GitHub/litplanAI/backend/functions
firebase emulators:start
```

The emulators will start on:
- **Functions**: http://localhost:5001
- **Firestore**: http://localhost:8080
- **Auth**: http://localhost:9099

### Environment Variables

Ensure `.env` file exists in `/backend/functions/.env`:

```bash
APPLE_SHARED_SECRET=your_apple_shared_secret_here
```

To get your Apple Shared Secret:

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** > Select your app
3. Go to **App Information** > **App-Specific Shared Secret**
4. Generate or copy the shared secret

---

## Environment Setup

### 1. Create Test User

Create a test user in Firebase Auth:

```bash
# Using Firebase CLI
firebase auth:import test_users.json --project YOUR_PROJECT_ID
```

Or manually create via Firebase Console, then get the user's ID token:

```bash
# Get ID token for testing
curl -X POST 'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=test' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "CUSTOM_TOKEN",
    "returnSecureToken": true
  }'
```

For simplicity, we'll use `TEST_USER_TOKEN` as a placeholder in examples below.

### 2. Create Test User Document in Firestore

Ensure your test user has a document in Firestore:

```json
{
  "userId": "test-user-123",
  "email": "test@litplan.com",
  "subscription": {
    "tier": "free",
    "status": "free"
  },
  "entitlements": {
    "maxCitiesPerWeek": 1,
    "maxPlansPerCity": 10,
    "weekendAccess": false,
    "groupPlansAccess": false,
    "savedCitiesAccess": false
  },
  "createdAt": "2025-12-28T00:00:00.000Z",
  "updatedAt": "2025-12-28T00:00:00.000Z"
}
```

---

## Testing POST /subscription/validate

### Endpoint

```
POST /subscription/validate
```

### Purpose

Validates an Apple receipt and upgrades the user to Pro tier if valid.

### Request Headers

- `Authorization: Bearer <USER_TOKEN>`
- `Content-Type: application/json`

### Request Body

```json
{
  "transactionId": "1000000123456789",
  "productId": "com.litplan.pro.monthly",
  "receiptData": "BASE64_ENCODED_RECEIPT_DATA"
}
```

### Test Case 1: Valid Monthly Subscription (Sandbox)

**Description**: Test successful validation of a monthly subscription receipt.

**curl Command**:

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/validate \
  -H "Authorization: Bearer TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "1000000123456789",
    "productId": "com.litplan.pro.monthly",
    "receiptData": "MIIT0QYJKoZIhvcNAQcCoIITwjCCE74CAQExCzAJBgUrDgMCGgUAMIID..."
  }'
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "status": "pro",
    "expiryDate": "2025-12-28T15:30:00.000Z",
    "autoRenew": true,
    "transactionId": "1000000123456789",
    "productId": "com.litplan.pro.monthly"
  },
  "entitlements": {
    "maxCitiesPerWeek": 100,
    "maxPlansPerCity": 50,
    "weekendAccess": true,
    "groupPlansAccess": true,
    "savedCitiesAccess": true
  }
}
```

**Verify in Firestore**:

- User document updated with Pro tier
- `subscription.expiryDate` is set to future date
- All 5 entitlements are updated to Pro values

---

### Test Case 2: Valid Yearly Subscription (Sandbox)

**Description**: Test successful validation of a yearly subscription receipt.

**curl Command**:

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/validate \
  -H "Authorization: Bearer TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "1000000987654321",
    "productId": "com.litplan.pro.yearly",
    "receiptData": "MIIT0QYJKoZIhvcNAQcCoIITwjCCE74CAQExCzAJBgUrDgMCGgUAMIID..."
  }'
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "status": "pro",
    "expiryDate": "2026-12-28T15:30:00.000Z",
    "autoRenew": true,
    "transactionId": "1000000987654321",
    "productId": "com.litplan.pro.yearly"
  },
  "entitlements": {
    "maxCitiesPerWeek": 100,
    "maxPlansPerCity": 50,
    "weekendAccess": true,
    "groupPlansAccess": true,
    "savedCitiesAccess": true
  }
}
```

---

### Test Case 3: Missing Required Fields

**Description**: Test validation fails when required fields are missing.

**curl Command** (missing `productId`):

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/validate \
  -H "Authorization: Bearer TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "1000000123456789",
    "receiptData": "BASE64_DATA"
  }'
```

**Expected Response** (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "transactionId and productId are required"
  }
}
```

---

### Test Case 4: Invalid Receipt Data

**Description**: Test backend rejects invalid receipt data.

**curl Command**:

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/validate \
  -H "Authorization: Bearer TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "1000000123456789",
    "productId": "com.litplan.pro.monthly",
    "receiptData": "INVALID_BASE64_DATA"
  }'
```

**Expected Response** (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "The receipt could not be authenticated"
  }
}
```

---

### Test Case 5: Expired Receipt

**Description**: Test backend rejects expired subscription receipts.

**Note**: To test this, use a receipt from a sandbox subscription that has already expired (after 6 renewals).

**Expected Response** (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "Subscription has expired"
  }
}
```

---

## Testing GET /subscription/status

### Endpoint

```
GET /subscription/status
```

### Purpose

Retrieves the current subscription status for the authenticated user.

### Request Headers

- `Authorization: Bearer <USER_TOKEN>`

### Test Case 1: Free Tier User

**Description**: Check status for a user with no subscription.

**curl Command**:

```bash
curl -X GET http://localhost:5001/PROJECT_ID/us-central1/api/subscription/status \
  -H "Authorization: Bearer TEST_USER_TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "subscription": {
    "status": "free",
    "tier": "free",
    "expiryDate": null,
    "autoRenew": false
  }
}
```

---

### Test Case 2: Active Pro Subscription

**Description**: Check status for a user with active Pro subscription.

**Setup**: First, validate a subscription (see Test Case 1 above), then check status.

**curl Command**:

```bash
curl -X GET http://localhost:5001/PROJECT_ID/us-central1/api/subscription/status \
  -H "Authorization: Bearer TEST_USER_TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2025-12-28T15:30:00.000Z",
    "autoRenew": true
  }
}
```

---

### Test Case 3: Expired Pro Subscription

**Description**: Check status for a user whose subscription has expired.

**Setup**: Manually update user's `subscription.expiryDate` to a past date in Firestore.

**Expected Response** (200 OK):

```json
{
  "success": true,
  "subscription": {
    "status": "expired",
    "tier": "pro",
    "expiryDate": "2025-12-20T00:00:00.000Z",
    "autoRenew": false
  }
}
```

**Note**: The `status` field will be "expired" even though `tier` is still "pro". The scheduled `syncSubscriptionStatus` job will downgrade the user to free tier.

---

### Test Case 4: User Not Found

**Description**: Test error handling when user doesn't exist.

**curl Command** (use invalid token or non-existent user):

```bash
curl -X GET http://localhost:5001/PROJECT_ID/us-central1/api/subscription/status \
  -H "Authorization: Bearer INVALID_TOKEN"
```

**Expected Response** (401 Unauthorized or 404 Not Found):

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

---

## Testing POST /subscription/restore

### Endpoint

```
POST /subscription/restore
```

### Purpose

Restores a user's previous subscription purchases.

### Request Headers

- `Authorization: Bearer <USER_TOKEN>`

### Test Case 1: User Has Active Subscription

**Description**: Restore purchases for a user with an existing active Pro subscription.

**Setup**: Ensure user has a valid Pro subscription in Firestore.

**curl Command**:

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/restore \
  -H "Authorization: Bearer TEST_USER_TOKEN"
```

**Expected Response** (200 OK):

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

### Test Case 2: User Has No Subscription

**Description**: Restore purchases for a free tier user with no previous subscription.

**Setup**: Ensure user has `subscription.tier = "free"` in Firestore.

**curl Command**:

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/restore \
  -H "Authorization: Bearer TEST_USER_TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "restored": false,
  "subscription": null
}
```

---

### Test Case 3: User Has Expired Subscription

**Description**: Restore purchases for a user whose subscription has expired.

**Setup**: Manually set `subscription.expiryDate` to a past date.

**Expected Response** (200 OK):

```json
{
  "success": true,
  "restored": false,
  "subscription": null
}
```

**Note**: In the current implementation (Day 8), the restore endpoint only checks Firestore. In a future Sprint, it will query Apple's server for transaction history.

---

## Testing syncSubscriptionStatus (Scheduled Function)

### Overview

The `syncSubscriptionStatus` function is a scheduled job that runs daily at 2 AM UTC to check all Pro users and downgrade expired subscriptions.

### Testing Locally with Emulator

#### Method 1: Manual Invocation via Admin API

The easiest way to test locally is to manually trigger the function:

1. Start Firebase emulators:

```bash
cd /Users/davidnjagah/Documents/GitHub/litplanAI/backend/functions
firebase emulators:start
```

2. In a separate terminal, invoke the function using the Firebase Admin API:

```bash
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/syncSubscriptionStatus
```

**Note**: Cloud Scheduler functions can be tricky to test locally. The above method simulates the function invocation.

---

#### Method 2: Direct Function Call (For Unit Testing)

You can also test the function logic directly by importing and calling it in a test script.

Create `backend/functions/src/scripts/testSyncSubscription.ts`:

```typescript
import * as admin from 'firebase-admin';
import { syncSubscriptionStatus } from '../scheduled/syncSubscriptionStatus';

// Initialize Firebase Admin
admin.initializeApp();

// Simulate a scheduled function context
const context = {
  eventId: 'test-event-id',
  timestamp: new Date().toISOString(),
  eventType: 'google.pubsub.topic.publish',
  resource: 'projects/PROJECT_ID/topics/firebase-schedule-syncSubscriptionStatus-us-central1'
};

// Run the function
syncSubscriptionStatus.run(context)
  .then(result => {
    console.log('Sync job completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Sync job failed:', error);
    process.exit(1);
  });
```

Run the script:

```bash
npx ts-node src/scripts/testSyncSubscription.ts
```

---

### Test Scenarios

#### Scenario 1: No Pro Users

**Setup**: Ensure no users have `subscription.tier = "pro"` in Firestore.

**Expected Logs**:

```
Starting subscription sync job
Timestamp: 2025-12-28T02:00:00.000Z
Querying all Pro users...
Found 0 Pro users to check
No Pro users found. Job completed.
```

**Expected Result**:

```json
{
  "success": true,
  "totalChecked": 0,
  "totalDowngraded": 0,
  "errors": 0,
  "timestamp": "2025-12-28T02:00:00.000Z"
}
```

---

#### Scenario 2: All Pro Users Have Active Subscriptions

**Setup**: Create 5 Pro users in Firestore, all with future `expiryDate`.

**Expected Logs**:

```
Found 5 Pro users to check
Processing 5 users in 1 batches
User user-1 subscription is active until 2025-12-30T00:00:00.000Z
User user-2 subscription is active until 2025-12-30T00:00:00.000Z
...
Subscription sync job completed
Total checked: 5
Total downgraded: 0
Total errors: 0
```

---

#### Scenario 3: Some Pro Users Have Expired Subscriptions

**Setup**: Create 10 Pro users:
- 7 with future `expiryDate`
- 3 with past `expiryDate`

**Expected Logs**:

```
Found 10 Pro users to check
Processing 10 users in 1 batches
User user-1 subscription is active until 2025-12-30T00:00:00.000Z
User user-8 subscription expired at 2025-12-20T00:00:00.000Z. Downgrading to free tier...
Successfully downgraded user user-8 to free tier
...
Subscription sync job completed
Total checked: 10
Total downgraded: 3
Total errors: 0
```

**Verify in Firestore**:

For each downgraded user:
- `subscription.tier` = `"free"`
- `subscription.status` = `"free"`
- `subscription.expiryDate` = `null`
- `subscription.autoRenew` = `false`
- All entitlements reset to free tier values

---

#### Scenario 4: Batch Processing (1000+ Users)

**Setup**: Create 1500 Pro users with mixed expiry dates.

**Expected Logs**:

```
Found 1500 Pro users to check
Processing 1500 users in 15 batches
Processing batch 1/15 (100 users)
Batch 1 completed: 12 downgrades, 0 errors
Processing batch 2/15 (100 users)
...
Subscription sync job completed
Total checked: 1500
Total downgraded: 237
Total errors: 0
Execution time: 45.32s
```

---

#### Scenario 5: Error Handling (Some Users Fail)

**Setup**: Create a Pro user with invalid data (e.g., missing `subscription` field).

**Expected Logs**:

```
Found 5 Pro users to check
User user-3 has Pro tier but no expiry date. Skipping.
Subscription sync job completed
Total checked: 5
Total downgraded: 2
Total errors: 1
```

**Note**: The job continues processing other users even if one fails.

---

## Verifying Firestore Updates

After testing any subscription endpoint or the sync job, always verify the Firestore updates.

### Using Firebase Console

1. Open Firebase Console: https://console.firebase.google.com
2. Navigate to **Firestore Database**
3. Find the user document: `users/{userId}`
4. Verify fields:
   - `subscription.tier`
   - `subscription.status`
   - `subscription.expiryDate`
   - `subscription.autoRenew`
   - `subscription.transactionId`
   - `subscription.productId`
   - `entitlements.maxCitiesPerWeek`
   - `entitlements.maxPlansPerCity`
   - `entitlements.weekendAccess`
   - `entitlements.groupPlansAccess`
   - `entitlements.savedCitiesAccess`

### Using Firebase Emulator UI

When running emulators locally:

1. Open http://localhost:4000 in browser
2. Click **Firestore** tab
3. Navigate to `users/{userId}`
4. Verify all fields are correct

### Using Firebase CLI

```bash
firebase firestore:get users/USER_ID --project PROJECT_ID
```

---

## Testing Edge Cases

### Edge Case 1: Duplicate Transaction Validation

**Scenario**: User tries to validate the same transaction twice.

**Setup**:
1. Validate a receipt successfully
2. Call validate endpoint again with the same `transactionId`

**Expected Behavior**:
- Currently: Validation succeeds, user subscription is updated again
- Future: Should detect duplicate transaction and reject

**Recommendation**: Implement transaction ID deduplication in Sprint 3, Day 13.

---

### Edge Case 2: Sandbox vs Production Mismatch

**Scenario**: Sandbox receipt sent to production environment (or vice versa).

**Setup**: Use a sandbox receipt in production backend.

**Expected Behavior**:
- Backend detects status 21007
- Automatically retries with sandbox endpoint
- Validation succeeds

**Verify Logs**:
```
Receipt is from sandbox environment, retrying with sandbox endpoint
Receipt validated successfully
```

---

### Edge Case 3: Missing APPLE_SHARED_SECRET

**Scenario**: Backend tries to validate receipt without configured shared secret.

**Setup**: Remove `APPLE_SHARED_SECRET` from environment variables.

**Expected Response** (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "Apple shared secret not configured. Please set APPLE_SHARED_SECRET in environment variables."
  }
}
```

---

### Edge Case 4: User Not Found During Validation

**Scenario**: Token is valid but user document doesn't exist in Firestore.

**Setup**: Use a valid Firebase Auth token for a user that doesn't have a Firestore document.

**Expected Response** (500 Internal Server Error):

```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Failed to update user entitlements"
  }
}
```

---

### Edge Case 5: Concurrent Validation Requests

**Scenario**: User sends multiple validation requests simultaneously.

**Setup**: Send 5 validation requests in parallel for the same user.

**Expected Behavior**:
- All requests should complete without race conditions
- User should end up with correct subscription status
- Only one transaction should be recorded

**Test with**:

```bash
for i in {1..5}; do
  curl -X POST http://localhost:5001/PROJECT_ID/us-central1/api/subscription/validate \
    -H "Authorization: Bearer TEST_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "transactionId": "1000000123456789",
      "productId": "com.litplan.pro.monthly",
      "receiptData": "BASE64_DATA"
    }' &
done
wait
```

---

## Sample Test Data

### Sample Base64 Receipt (Sandbox)

**Note**: This is a mock example. In real testing, use actual receipts from StoreKit sandbox.

```
MIIT0QYJKoZIhvcNAQcCoIITwjCCE74CAQExCzAJBgUrDgMCGgUAMIIDVwYJKoZIhvcNAQcBoIIDSASCA0QxggNAMAoCAQgCAQEEAhYAMAoCARQCAQEEAgwAMAsCAQECAQEEAwIBADALAgEDAgEBBAMMATEwCwIBCwIBAQQDAgEAMAsCAQ4CAQEEAwIBNTALAgEPAgEBBAMCAQAwCwIBEAIBAQQDAgEAMAsCARkCAQEEAwIBAzAMAgEKAgEBBAQWAjQrMA0CAQ0CAQEEBQIDAddfMA0CARMCAQEEBQwDMS4wMA4CAQkCAQEEBgIEUDI1MjAYAgEEAgECBBAxNjc3NzIwMDAwMDAwMDAwMBsCAQACAQEEEwwRUHJvZHVjdGlvbiAwODowNTAbAgECAgEBBBMMEWNvbS5saXRwbGFuLnByby55ZWFybHkwHAIBBQIBAQQUDBJZb3VyIFN1YnNjcmlwdGlvbjAeAgEMAgEBBBYWFDIwMjUtMTItMjhUMTU6MzA6MDBaMB4CAR0CAQEEFgQURGVtbyBSZWNlaXB0IERhdGEwOgIBBwIBAQQy...
```

### Sample Transaction IDs

Sandbox transaction IDs always start with `1000000`:

- Monthly: `1000000123456789`
- Yearly: `1000000987654321`
- Restored: `1000000555555555`

### Sample Product IDs

- Monthly: `com.litplan.pro.monthly`
- Yearly: `com.litplan.pro.yearly`

---

## Debugging Tips

### Enable Verbose Logging

Add more detailed logs to track request flow:

```typescript
console.log('Request body:', JSON.stringify(req.body, null, 2));
console.log('User ID:', userId);
console.log('Validation result:', validation);
```

### Check Function Logs

When running in production:

```bash
firebase functions:log --project PROJECT_ID
```

### Monitor Apple API Responses

Log the full Apple response for debugging:

```typescript
console.log('Apple response:', JSON.stringify(appleResponse, null, 2));
```

### Test with Different Product IDs

Ensure both monthly and yearly products are tested:

```bash
# Test monthly
curl ... -d '{"productId": "com.litplan.pro.monthly", ...}'

# Test yearly
curl ... -d '{"productId": "com.litplan.pro.yearly", ...}'
```

---

## Production Testing Checklist

Before deploying to production:

- [ ] All unit tests pass
- [ ] Integration tests with sandbox receipts succeed
- [ ] Scheduled function runs successfully in emulator
- [ ] Error handling works for all edge cases
- [ ] Firestore updates are atomic and consistent
- [ ] Logging is comprehensive for monitoring
- [ ] Environment variables are configured
- [ ] Rate limiting is implemented (if applicable)
- [ ] Security rules are in place
- [ ] Documentation is complete

---

## Additional Resources

- [Firebase Functions Testing Guide](https://firebase.google.com/docs/functions/local-emulator)
- [Apple Receipt Validation Guide](https://developer.apple.com/documentation/appstorereceipts/verifyreceipt)
- [StoreKit Sandbox Testing](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-28
**Sprint**: Sprint 3 - Monetization & Growth
**Day**: 12 (StoreKit Integration)
