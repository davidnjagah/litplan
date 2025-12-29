# Day 4 - Tier-Based Filtering Testing Guide

## Overview
This document provides instructions for testing the tier-based access control and paywall logic implemented on Day 4.

## Prerequisites
1. Backend compiled successfully (`npm run build`)
2. Firebase emulator running (`npm run serve`)
3. Cities and plans seeded in Firestore
4. Test users created (1 free, 1 pro)

## Setup Test Users

### 1. Seed Test Users
```bash
cd backend/functions
npm run seed:users
```

This creates two test users:
- **Free User**: `test-free-user` (email: free@test.litplan.app)
- **Pro User**: `test-pro-user` (email: pro@test.litplan.app)

### 2. Create Firebase Custom Tokens

For testing with Firebase emulators, you'll need to create custom tokens for these users. You can use the Firebase Admin SDK or create a simple script:

```javascript
// createTestTokens.js
const admin = require('firebase-admin');
admin.initializeApp();

async function createTokens() {
  const freeToken = await admin.auth().createCustomToken('test-free-user');
  const proToken = await admin.auth().createCustomToken('test-pro-user');

  console.log('Free User Token:', freeToken);
  console.log('Pro User Token:', proToken);
}

createTokens();
```

## Test Scenarios

### Test 1: Free User - Plan Limit (Max 10 Plans)

**Request:**
```bash
GET /cities/nyc-001/plans
Authorization: Bearer <FREE_USER_TOKEN>
```

**Expected Response:**
```json
{
  "success": true,
  "plans": [...], // Array of 10 plans max
  "total": 10,
  "userLimit": 10,
  "hasMore": true,
  "tier": "free"
}
```

**Validation:**
- ✅ Returns exactly 10 plans (even if city has 50)
- ✅ `hasMore` is `true` (indicating more plans available for Pro)
- ✅ `userLimit` is `10`
- ✅ `tier` is `"free"`

---

### Test 2: Pro User - Plan Limit (Max 50 Plans)

**Request:**
```bash
GET /cities/nyc-001/plans
Authorization: Bearer <PRO_USER_TOKEN>
```

**Expected Response:**
```json
{
  "success": true,
  "plans": [...], // Array of up to 50 plans
  "total": 50,
  "userLimit": 50,
  "hasMore": false,
  "tier": "pro"
}
```

**Validation:**
- ✅ Returns up to 50 plans
- ✅ `hasMore` is `false` (no more plans available)
- ✅ `userLimit` is `50`
- ✅ `tier` is `"pro"`

---

### Test 3: Free User - Weekend Filtering

**Request:**
```bash
GET /cities/nyc-001/plans
Authorization: Bearer <FREE_USER_TOKEN>
```

**Expected Behavior:**
- ✅ All returned plans have `flags.isWeekend` set to `false`
- ✅ Weekend plans are filtered out before the 10-plan limit is applied
- ✅ Free user sees only weekday plans (Monday-Friday)

**Manual Check:**
```javascript
// Check each plan in response
response.plans.forEach(plan => {
  console.assert(plan.flags.isWeekend === false, 'Free user should not see weekend plans');
});
```

---

### Test 4: Pro User - Weekend Access

**Request:**
```bash
GET /cities/nyc-001/plans
Authorization: Bearer <PRO_USER_TOKEN>
```

**Expected Behavior:**
- ✅ Response includes both weekday and weekend plans
- ✅ Some plans have `flags.isWeekend` set to `true`
- ✅ Pro user sees all plans regardless of day of week

**Manual Check:**
```javascript
// Check that weekend plans are included
const hasWeekendPlans = response.plans.some(plan => plan.flags.isWeekend === true);
console.assert(hasWeekendPlans, 'Pro user should see weekend plans');
```

---

### Test 5: Type Filtering - Individual Plans

**Request:**
```bash
GET /cities/nyc-001/plans?type=individual
Authorization: Bearer <FREE_USER_TOKEN>
```

**Expected Response:**
- ✅ All returned plans have `flags.isIndividual` set to `true`
- ✅ Still respects free tier limits (max 10, weekday only)

---

### Test 6: Type Filtering - Group Plans

**Request:**
```bash
GET /cities/nyc-001/plans?type=group
Authorization: Bearer <FREE_USER_TOKEN>
```

**Expected Response:**
- ✅ All returned plans have `flags.isGroup` set to `true`
- ✅ Still respects free tier limits (max 10, weekday only)

---

### Test 7: Invalid/Missing Authentication

**Request:**
```bash
GET /cities/nyc-001/plans
Authorization: Bearer invalid_token_here
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired authentication token"
  }
}
```

**Status Code:** `401 Unauthorized`

---

### Test 8: Non-existent City

**Request:**
```bash
GET /cities/invalid-city-id/plans
Authorization: Bearer <FREE_USER_TOKEN>
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City with ID 'invalid-city-id' not found"
  }
}
```

**Status Code:** `404 Not Found`

---

## Paywall Error Responses

While the current implementation doesn't explicitly trigger paywall errors in the GET endpoint (it silently filters), the paywall error format is ready for future use in other scenarios:

### Example Paywall Error Format

```json
{
  "success": false,
  "error": {
    "code": "PAYWALL_LIMIT_REACHED",
    "message": "Upgrade to Pro to access more than 10 plans per city",
    "paywallType": "plan_limit"
  }
}
```

**Paywall Types:**
- `plan_limit` - User trying to access more than tier limit
- `weekend_access` - Free user trying to access weekend plans
- `city_limit` - Free user trying to access 2nd city in same week
- `group_flows` - Free user trying to access group flows
- `saved_cities` - Free user trying to save a city

---

## Helper Function Tests

### checkUserEntitlements()

**Test Free User:**
```javascript
const result = await checkUserEntitlements('test-free-user', 'plan_count');
// Expected:
{
  canAccess: true,
  entitlements: {
    tier: 'free',
    maxPlansPerCity: 10,
    weekendAccess: false,
    maxCitiesPerWeek: 1
  }
}
```

**Test Pro User:**
```javascript
const result = await checkUserEntitlements('test-pro-user', 'plan_count');
// Expected:
{
  canAccess: true,
  entitlements: {
    tier: 'pro',
    maxPlansPerCity: 50,
    weekendAccess: true,
    maxCitiesPerWeek: 100
  }
}
```

**Test Non-existent User:**
```javascript
const result = await checkUserEntitlements('invalid-user-id', 'plan_count');
// Expected:
{
  canAccess: false,
  reason: 'User not found'
}
```

---

## Postman Collection

You can import this into Postman for easier testing:

### Collection Structure
```
Litplan API - Day 4 Tests
├── Auth
│   └── POST /auth/login (Get test tokens)
├── Free User Tests
│   ├── GET /cities/:cityId/plans (Max 10, weekday only)
│   ├── GET /cities/:cityId/plans?type=individual
│   └── GET /cities/:cityId/plans?type=group
└── Pro User Tests
    ├── GET /cities/:cityId/plans (Max 50, all days)
    ├── GET /cities/:cityId/plans?type=individual
    └── GET /cities/:cityId/plans?type=group
```

### Pre-request Script (Set Token)
```javascript
// Set this in Postman environment
pm.environment.set("free_user_token", "<YOUR_FREE_USER_TOKEN>");
pm.environment.set("pro_user_token", "<YOUR_PRO_USER_TOKEN>");
```

---

## Checklist

Use this checklist to verify all Day 4 functionality:

- [ ] ✅ Backend compiles successfully (`npm run build`)
- [ ] ✅ Test users seeded (`npm run seed:users`)
- [ ] ✅ Free user gets max 10 plans
- [ ] ✅ Pro user gets max 50 plans
- [ ] ✅ Free user sees only weekday plans
- [ ] ✅ Pro user sees weekday + weekend plans
- [ ] ✅ `?type=individual` filter works
- [ ] ✅ `?type=group` filter works
- [ ] ✅ Authentication required (401 without token)
- [ ] ✅ 404 for non-existent cities
- [ ] ✅ `checkUserEntitlements()` helper works correctly
- [ ] ✅ `paywallError()` helper returns correct format
- [ ] ✅ API documentation updated in index.ts
- [ ] ✅ TypeScript compilation has 0 errors

---

## Known Limitations

1. **No Actual Paywall Trigger**: The current implementation silently filters plans instead of returning 403 errors when limits are exceeded. This is by design for the GET endpoint. Future endpoints (e.g., saving cities, accessing group flows) will use explicit paywall errors.

2. **Weekend Detection**: Weekend plans are identified by the `flags.isWeekend` field in the database. Ensure seed scripts properly set this flag.

3. **No City Limit Tracking**: The `maxCitiesPerWeek` entitlement is defined but not yet enforced. This will be implemented when user activity tracking is added.

---

## Next Steps (Day 5+)

- [ ] Implement city view tracking (for `maxCitiesPerWeek` enforcement)
- [ ] Add group flows endpoint with Pro-only access
- [ ] Add saved cities endpoints with Pro-only access
- [ ] Implement explicit paywall triggers for iOS app
- [ ] Add analytics for paywall conversion tracking

---

**Last Updated:** Day 4, Sprint 1
**Author:** Backend Engineer
**Status:** ✅ Complete
