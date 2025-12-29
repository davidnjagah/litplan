# Day 8 Testing Guide - Subscription Endpoints

## Overview
This guide provides comprehensive testing instructions for the subscription endpoints implemented on Sprint 2, Day 8.

**Endpoints Implemented:**
1. POST /subscription/validate - Validate StoreKit transaction and upgrade user
2. GET /subscription/status - Check current subscription status
3. POST /subscription/restore - Restore previous purchases

**Helper Function:**
- validateAppleReceipt(transactionId, productId, receiptData) - Mock validation for Day 8

---

## Important Notes

### Mock Implementation (Day 8)
- All endpoints use **mock validation** for Day 8
- `validateAppleReceipt` returns success for ANY transactionId/productId
- Full Apple server validation will be implemented in Sprint 3, Days 11-12
- This allows frontend development and testing without Apple credentials

### Prerequisites
1. Backend server running (Firebase emulators or deployed)
2. Firebase authenticated user token
3. Test users seeded (free and pro users)

---

## Test Scenarios

### Scenario 1: Validate Subscription (Free → Pro Upgrade)

**Endpoint:** POST /subscription/validate

**Description:** User purchases Pro subscription, backend validates and upgrades their tier.

**Request:**
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/validate \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "2000000123456789",
    "productId": "litplan_pro_monthly",
    "receiptData": "base64_encoded_receipt_mock"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2026-12-27T...",
    "autoRenew": true
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

**Validations:**
- ✅ Response contains `success: true`
- ✅ Subscription tier is `"pro"`
- ✅ Subscription status is `"pro"`
- ✅ expiryDate is ~1 year from now
- ✅ autoRenew is `true`
- ✅ All Pro entitlements are enabled (100 cities, 50 plans, weekend, group flows, saved cities)

**Firestore Verification:**
```javascript
// Check users/{userId} document
{
  subscription: {
    status: "pro",
    tier: "pro",
    startDate: <Timestamp>,
    expiryDate: <Timestamp +1 year>,
    autoRenew: true,
    transactionId: "2000000123456789",
    productId: "litplan_pro_monthly"
  },
  entitlements: {
    maxCitiesPerWeek: 100,
    maxPlansPerCity: 50,
    weekendAccess: true,
    groupPlansAccess: true,
    savedCitiesAccess: true
  }
}
```

---

### Scenario 2: Validate Subscription - Missing transactionId

**Endpoint:** POST /subscription/validate

**Description:** Request missing required `transactionId` field.

**Request:**
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/validate \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "litplan_pro_monthly"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "transactionId and productId are required"
  }
}
```

**Validations:**
- ✅ Status code is 400
- ✅ Error code is `"INVALID_REQUEST"`
- ✅ Error message mentions missing fields

---

### Scenario 3: Validate Subscription - Unauthenticated

**Endpoint:** POST /subscription/validate

**Description:** Request without authentication token.

**Request:**
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/validate \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "2000000123456789",
    "productId": "litplan_pro_monthly",
    "receiptData": "mock_receipt"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Missing or invalid authorization header"
  }
}
```

**Validations:**
- ✅ Status code is 401
- ✅ Error code is `"AUTH_FAILED"`
- ✅ Middleware rejected unauthenticated request

---

### Scenario 4: Get Subscription Status - Pro User

**Endpoint:** GET /subscription/status

**Description:** Pro user checks their subscription status.

**Request:**
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/subscription/status \
  -H "Authorization: Bearer <pro_user_firebase_token>"
```

**Expected Response (200):**
```json
{
  "success": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2026-12-27T...",
    "autoRenew": true
  }
}
```

**Validations:**
- ✅ Response contains `success: true`
- ✅ Status and tier are both `"pro"`
- ✅ expiryDate is a valid future timestamp
- ✅ autoRenew is boolean

---

### Scenario 5: Get Subscription Status - Free User

**Endpoint:** GET /subscription/status

**Description:** Free user (never subscribed) checks their status.

**Request:**
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/subscription/status \
  -H "Authorization: Bearer <free_user_firebase_token>"
```

**Expected Response (200):**
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

**Validations:**
- ✅ Response contains `success: true`
- ✅ Status and tier are both `"free"`
- ✅ expiryDate is `null`
- ✅ autoRenew is `false`

---

### Scenario 6: Get Subscription Status - Expired Pro User

**Endpoint:** GET /subscription/status

**Description:** User whose Pro subscription has expired.

**Setup:**
1. Create test user with expired subscription:
```javascript
await db.collection('users').doc('expired-user-id').set({
  subscription: {
    tier: 'pro',
    expiryDate: admin.firestore.Timestamp.fromDate(new Date('2024-01-01')), // Past date
    autoRenew: false
  }
});
```

**Request:**
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/subscription/status \
  -H "Authorization: Bearer <expired_user_firebase_token>"
```

**Expected Response (200):**
```json
{
  "success": true,
  "subscription": {
    "status": "expired",
    "tier": "pro",
    "expiryDate": "2024-01-01T...",
    "autoRenew": false
  }
}
```

**Validations:**
- ✅ Status is `"expired"` (detected by comparing expiryDate to now)
- ✅ Tier is still `"pro"` (shows original tier)
- ✅ expiryDate is in the past

---

### Scenario 7: Restore Purchases - Pro User with Active Subscription

**Endpoint:** POST /subscription/restore

**Description:** Pro user with valid subscription attempts to restore.

**Request:**
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/restore \
  -H "Authorization: Bearer <pro_user_firebase_token>" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "restored": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2026-12-27T...",
    "autoRenew": true
  }
}
```

**Validations:**
- ✅ `restored` is `true`
- ✅ Subscription details returned
- ✅ Subscription is still valid (expiryDate in future)

---

### Scenario 8: Restore Purchases - Free User (No Previous Purchase)

**Endpoint:** POST /subscription/restore

**Description:** Free user with no purchase history attempts to restore.

**Request:**
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/restore \
  -H "Authorization: Bearer <free_user_firebase_token>" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "restored": false,
  "subscription": null
}
```

**Validations:**
- ✅ `restored` is `false`
- ✅ `subscription` is `null`
- ✅ No errors returned (restore is valid operation even when nothing to restore)

---

### Scenario 9: Restore Purchases - User with Expired Subscription

**Endpoint:** POST /subscription/restore

**Description:** User with expired Pro subscription attempts to restore.

**Request:**
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/restore \
  -H "Authorization: Bearer <expired_user_firebase_token>" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "restored": false,
  "subscription": null
}
```

**Validations:**
- ✅ `restored` is `false` (subscription expired, cannot restore)
- ✅ `subscription` is `null`
- ✅ Note: In Sprint 2 Day 10, this will query Apple's servers for actual restoration

---

## Integration Testing

### End-to-End Flow: Free User → Pro Upgrade

1. **Create Free User**
```bash
# Seed free user (already exists from Day 4)
npm run seed:users
```

2. **Verify Free Tier**
```bash
# Check initial status
GET /subscription/status
# Expected: tier = "free"
```

3. **Simulate Purchase**
```bash
# User purchases in iOS app, sends transactionId
POST /subscription/validate
{
  "transactionId": "2000000999999999",
  "productId": "litplan_pro_monthly",
  "receiptData": "mock_receipt"
}
# Expected: tier upgraded to "pro"
```

4. **Verify Pro Access**
```bash
# Check updated status
GET /subscription/status
# Expected: tier = "pro", expiryDate ~1 year from now

# Test Pro-only endpoints
GET /cities/:cityId/groupFlows
# Expected: 200 success, returns group flows

GET /user/savedCities
# Expected: 200 success (no longer 403 paywall)
```

5. **Test Restore**
```bash
# User reinstalls app, restores purchases
POST /subscription/restore
# Expected: restored = true, subscription returned
```

---

## Postman Collection Structure

Create a Postman collection with folders:

### Folder 1: Subscription - Validate
- Validate Subscription (Success)
- Validate Subscription (Missing transactionId)
- Validate Subscription (Missing productId)
- Validate Subscription (Unauthenticated)
- Validate Subscription (Invalid Token)

### Folder 2: Subscription - Status
- Get Status (Pro User)
- Get Status (Free User)
- Get Status (Expired User)
- Get Status (Unauthenticated)

### Folder 3: Subscription - Restore
- Restore (Pro User with Active Sub)
- Restore (Free User, No History)
- Restore (Expired User)
- Restore (Unauthenticated)

### Environment Variables
```
base_url: http://localhost:5001/litplan-dev/us-central1/api
free_user_token: <firebase_token_for_free_user>
pro_user_token: <firebase_token_for_pro_user>
expired_user_token: <firebase_token_for_expired_user>
```

---

## Performance Benchmarks

### Expected Response Times
- POST /subscription/validate: < 500ms (mock validation)
- GET /subscription/status: < 200ms (Firestore read)
- POST /subscription/restore: < 300ms (Firestore read)

### Load Testing (Optional)
```bash
# Use Apache Bench for simple load test
ab -n 100 -c 10 -H "Authorization: Bearer <token>" \
  http://localhost:5001/litplan-dev/us-central1/api/subscription/status

# Expected: 100% success rate, avg response < 300ms
```

---

## Known Limitations (Day 8)

1. **Mock Validation**: `validateAppleReceipt` always returns success
   - Any transactionId/productId combination is accepted
   - No actual communication with Apple servers
   - Will be implemented fully in Sprint 3

2. **Restore Logic**: Basic implementation
   - Only checks Firestore for existing subscription
   - Does not query Apple's transaction history
   - Full restore will be implemented in Sprint 2, Day 10

3. **Receipt Format**: receiptData is optional
   - Not validated or parsed
   - In production, must be base64-encoded Apple receipt

4. **Error Handling**: Basic error responses
   - Production will include more detailed error codes
   - Will handle Apple-specific errors (21000-21010)

---

## Security Considerations

### Day 8 Implementation
- ✅ Authentication required on all endpoints
- ✅ User can only validate/check their own subscription
- ✅ Firestore rules enforce user data access
- ✅ transactionId stored for audit trail

### Production (Sprint 3)
- 🔄 Validate receipts with Apple's servers (not mocked)
- 🔄 Rate limiting on validation endpoint (prevent abuse)
- 🔄 Detect fraudulent receipts (duplicate transactionIds)
- 🔄 Log all validation attempts for monitoring
- 🔄 Encrypt sensitive data (private keys in Firebase Secrets)

---

## Troubleshooting

### Issue: "User not found" error
- **Cause**: userId from token doesn't exist in Firestore
- **Solution**: Ensure user created via POST /auth/login first

### Issue: Subscription not updating in Firestore
- **Cause**: Firestore permissions or user document missing
- **Solution**: Check Firestore security rules, verify user document exists

### Issue: TypeScript compilation errors
- **Cause**: AuthenticatedRequest interface not imported
- **Solution**: Import from `../utils/middleware`

### Issue: 401 Unauthorized
- **Cause**: Missing or invalid Firebase token
- **Solution**: Generate fresh token via POST /auth/login

---

## Next Steps

### Sprint 2, Day 9-10
- Connect iOS app to subscription endpoints
- Implement full POST /subscription/restore logic
- Add subscription status checks to all Pro-only endpoints

### Sprint 3, Day 11-12
- Implement real Apple server validation in `validateAppleReceipt`
- Add App Store Server API credentials
- Test with StoreKit sandbox
- Handle all Apple receipt statuses (21000-21010)
- Implement subscription renewal detection
- Add subscription cancellation handling

---

## API Summary

| Endpoint | Method | Auth | Purpose | Status |
|----------|--------|------|---------|--------|
| /subscription/validate | POST | Required | Validate receipt, upgrade user to Pro | ✅ Implemented (mock) |
| /subscription/status | GET | Required | Check current subscription status | ✅ Implemented |
| /subscription/restore | POST | Required | Restore previous purchases | ⚠️ Basic (Day 10 full) |

---

**Created**: Sprint 2, Day 8 (December 27, 2025)
**Owner**: Backend Engineer
**Status**: Ready for QA Testing
**TypeScript Compilation**: ✅ 22 files, 0 errors
