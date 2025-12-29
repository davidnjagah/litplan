# Sprint 2, Day 9 - Testing Guide
## Saved Cities APIs Implementation

**Date**: Thursday, December 28, 2025
**Sprint**: Sprint 2, Day 9
**Engineer**: Backend Engineer (Claude Code)

---

## Overview

This guide provides comprehensive testing instructions for the Saved Cities APIs implemented for Sprint 2, Day 9. These endpoints enable Pro users to save/unsave cities and retrieve their saved cities list.

---

## Implemented Endpoints

### 1. GET /user/savedCities
**Description**: Get user's saved cities (Pro only)

**Authentication**: Required (Bearer token)

**Access Control**: Pro tier only

**Response Format**:
```json
{
  "success": true,
  "savedCities": [
    {
      "cityId": "nyc-001",
      "name": "New York",
      "country": "United States",
      "savedAt": "2025-12-28T10:30:00.000Z",
      "displayAssets": {
        "heroImage": "https://...",
        "cardImage": "https://...",
        "accentColor": "#00D9FF"
      }
    }
  ]
}
```

**Error Cases**:
- 401: Missing/invalid authentication token
- 403: Free user attempting to access (PAYWALL_LIMIT_REACHED)

---

### 2. POST /user/savedCities/:cityId
**Description**: Save a city to favorites (Pro only)

**Authentication**: Required (Bearer token)

**Access Control**: Pro tier only

**Parameters**:
- `cityId` (path parameter): City ID to save

**Response Format**:
```json
{
  "success": true,
  "message": "City saved successfully"
}
```

**Error Cases**:
- 400: Invalid request (missing cityId)
- 401: Missing/invalid authentication token
- 403: Free user attempting to save (PAYWALL_LIMIT_REACHED)
- 404: City not found

**Idempotent**: If city is already saved, returns success (no duplicate)

---

### 3. DELETE /user/savedCities/:cityId
**Description**: Remove city from saved list

**Authentication**: Required (Bearer token)

**Access Control**: Any authenticated user (but only Pro users can save cities)

**Parameters**:
- `cityId` (path parameter): City ID to remove

**Response Format**:
```json
{
  "success": true,
  "message": "City removed from saved list"
}
```

**Error Cases**:
- 401: Missing/invalid authentication token
- 404: City not in saved list

---

## Testing Instructions

### Prerequisites

1. **Start Firebase Emulators**:
```bash
cd /Users/davidnjagah/Documents/GitHub/litplanAI/backend/functions
npm run serve
```

2. **Ensure Test Users Exist**:
   - Free user: `test-free-user@litplan.app`
   - Pro user: `test-pro-user@litplan.app`

3. **Ensure Cities are Seeded**:
```bash
npm run seed:cities
```

---

### Test Suite 1: GET /user/savedCities

#### Test 1.1: Pro User with No Saved Cities
**Request**:
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/user/savedCities \
  -H "Authorization: Bearer <pro-user-token>"
```

**Expected Response**:
```json
{
  "success": true,
  "savedCities": []
}
```

**Status Code**: 200

---

#### Test 1.2: Pro User with Saved Cities
**Setup**: First save a city (see Test 2.1)

**Request**:
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/user/savedCities \
  -H "Authorization: Bearer <pro-user-token>"
```

**Expected Response**:
```json
{
  "success": true,
  "savedCities": [
    {
      "cityId": "nyc-001",
      "name": "New York",
      "country": "United States",
      "savedAt": "...",
      "displayAssets": { ... }
    }
  ]
}
```

**Status Code**: 200

**Verification**:
- Saved cities ordered by `savedAt` DESC (most recent first)
- All city details included (name, country, displayAssets)
- Timestamp is valid ISO format

---

#### Test 1.3: Free User Attempting Access (Paywall)
**Request**:
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/user/savedCities \
  -H "Authorization: Bearer <free-user-token>"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "PAYWALL_LIMIT_REACHED",
    "message": "Saving cities is a Pro feature",
    "paywallType": "saved_cities"
  }
}
```

**Status Code**: 403

---

#### Test 1.4: Unauthenticated Request
**Request**:
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/user/savedCities
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "No authorization token provided"
  }
}
```

**Status Code**: 401

---

### Test Suite 2: POST /user/savedCities/:cityId

#### Test 2.1: Pro User Saves City (First Time)
**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <pro-user-token>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "City saved successfully"
}
```

**Status Code**: 200

**Verification**:
- Check Firestore: `users/{userId}/savedCities/nyc-001` exists
- Document contains: `cityId`, `savedAt`, `notes`
- `savedAt` timestamp is recent (within last minute)

---

#### Test 2.2: Pro User Saves Same City Again (Idempotent)
**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <pro-user-token>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "City already saved"
}
```

**Status Code**: 200

**Verification**:
- No duplicate created in Firestore
- Original `savedAt` timestamp unchanged

---

#### Test 2.3: Pro User Saves Multiple Cities
**Request**:
```bash
# Save NYC
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <pro-user-token>"

# Save LA
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/la-001 \
  -H "Authorization: Bearer <pro-user-token>"

# Save London
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/london-001 \
  -H "Authorization: Bearer <pro-user-token>"
```

**Expected Response**: All return 200 with success

**Verification**:
- GET /user/savedCities returns all 3 cities
- Cities ordered by `savedAt` DESC (London, LA, NYC)

---

#### Test 2.4: Free User Attempts to Save City (Paywall)
**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <free-user-token>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "PAYWALL_LIMIT_REACHED",
    "message": "Saving cities is a Pro feature",
    "paywallType": "saved_cities"
  }
}
```

**Status Code**: 403

---

#### Test 2.5: Save Non-Existent City
**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/invalid-city-999 \
  -H "Authorization: Bearer <pro-user-token>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City invalid-city-999 not found"
  }
}
```

**Status Code**: 404

---

### Test Suite 3: DELETE /user/savedCities/:cityId

#### Test 3.1: Pro User Removes Saved City
**Setup**: First save a city

**Request**:
```bash
curl -X DELETE http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <pro-user-token>"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "City removed from saved list"
}
```

**Status Code**: 200

**Verification**:
- Check Firestore: `users/{userId}/savedCities/nyc-001` deleted
- GET /user/savedCities no longer includes the city

---

#### Test 3.2: Remove Non-Saved City
**Request**:
```bash
curl -X DELETE http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/paris-001 \
  -H "Authorization: Bearer <pro-user-token>"
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_SAVED",
    "message": "City is not in your saved list"
  }
}
```

**Status Code**: 404

---

#### Test 3.3: Unauthenticated Delete Request
**Request**:
```bash
curl -X DELETE http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "No authorization token provided"
  }
}
```

**Status Code**: 401

---

## Integration Testing

### Scenario 1: Complete Save/View/Delete Flow
**Steps**:
1. Pro user saves NYC, LA, London (3 cities)
2. GET /user/savedCities → Returns 3 cities
3. Delete LA
4. GET /user/savedCities → Returns 2 cities (NYC, London)
5. Save Tokyo
6. GET /user/savedCities → Returns 3 cities (Tokyo, NYC, London)

**Expected**: All operations succeed, list updates correctly

---

### Scenario 2: Free User Upgrade Flow
**Steps**:
1. Free user attempts to save NYC → 403 Paywall
2. User upgrades to Pro (POST /subscription/validate)
3. Pro user saves NYC → 200 Success
4. GET /user/savedCities → Returns NYC

**Expected**: Paywall enforced before upgrade, access granted after

---

### Scenario 3: Viewed Cities vs Saved Cities
**Steps**:
1. Pro user views NYC (POST /user/viewedCities)
2. Pro user views LA (POST /user/viewedCities)
3. Pro user saves LA (POST /user/savedCities/la-001)
4. GET /user/viewedCities → Returns NYC, LA
5. GET /user/savedCities → Returns LA only

**Expected**: Viewed and saved lists are independent

---

## Performance Testing

### Test P1: Response Time
**Request**: GET /user/savedCities with 10 saved cities

**Expected**: Response time < 300ms (p95)

**Measurement**:
```bash
curl -w "\nTime: %{time_total}s\n" \
  -X GET http://localhost:5001/litplan-dev/us-central1/api/user/savedCities \
  -H "Authorization: Bearer <pro-user-token>"
```

---

### Test P2: Concurrent Saves
**Scenario**: Save 5 cities simultaneously

**Expected**: All succeed, no race conditions, no duplicates

**Test**:
```bash
# Run 5 curl requests in parallel
for cityId in nyc-001 la-001 miami-001 london-001 paris-001; do
  curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/$cityId \
    -H "Authorization: Bearer <pro-user-token>" &
done
wait
```

---

## Security Testing

### Test S1: Token Validation
**Test**: Send request with invalid/expired token

**Expected**: 401 Unauthorized

---

### Test S2: Cross-User Access
**Test**: User A tries to access User B's saved cities

**Expected**: Only sees own saved cities (enforced by authentication)

---

### Test S3: SQL Injection (Firestore)
**Test**: Try to save city with malicious ID

**Request**:
```bash
curl -X POST "http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/%27%20OR%20%271%27%3D%271" \
  -H "Authorization: Bearer <pro-user-token>"
```

**Expected**: 404 City not found (no code execution)

---

## Firestore Data Validation

### Expected Firestore Structure

**Collection Path**: `users/{userId}/savedCities/{cityId}`

**Document Schema**:
```javascript
{
  cityId: "nyc-001",                          // String
  savedAt: Timestamp(2025-12-28 10:30:00),    // Firestore Timestamp
  notes: ""                                    // String (empty for now, future feature)
}
```

**Indexes Required**:
- Collection: `users/{userId}/savedCities`
- Field: `savedAt` (Descending)
- Purpose: Order saved cities by most recent first

---

## Error Handling Checklist

- [x] Missing authentication token → 401
- [x] Invalid/expired token → 401
- [x] Free user accessing Pro feature → 403 with paywall error
- [x] Non-existent city → 404
- [x] City not in saved list (DELETE) → 404
- [x] Server error → 500 with error details
- [x] Invalid request body → 400
- [x] All errors follow standard error format

---

## Compliance with backend-specs.md

### GET /user/savedCities (Line 555-571)
- ✅ Authentication required
- ✅ Pro-only access control
- ✅ Returns saved cities with displayAssets
- ✅ Ordered by savedAt DESC
- ✅ Error response matches spec (403 for free users)

### POST /user/savedCities/:cityId (Line 573-594)
- ✅ Authentication required
- ✅ Pro-only access control
- ✅ Verifies city exists (404 if not found)
- ✅ Idempotent (duplicate save returns success)
- ✅ Error response matches spec (403 for free users)

### DELETE /user/savedCities/:cityId (Line 596-605)
- ✅ Authentication required
- ✅ Verifies city is saved (404 if not)
- ✅ Deletes from Firestore subcollection
- ✅ Returns success message

---

## Build Verification

### TypeScript Compilation
```bash
cd /Users/davidnjagah/Documents/GitHub/litplanAI/backend/functions
npm run build
```

**Expected**: 0 errors, all .ts files compile to .js

**Verification**:
```bash
ls -la lib/api/user.js
```

**Output**: File exists, ~14KB, compiled successfully

---

## Postman Collection

### Import Instructions
1. Open Postman
2. Import: `/Users/davidnjagah/Documents/GitHub/litplanAI/backend/Litplan-API-Tests.postman_collection.json`
3. Navigate to "User APIs" folder
4. Run "Saved Cities" test suite

### Test Cases in Postman
- GET /user/savedCities (Pro user)
- GET /user/savedCities (Free user - Paywall)
- POST /user/savedCities/:cityId (Save NYC)
- POST /user/savedCities/:cityId (Duplicate save)
- DELETE /user/savedCities/:cityId (Remove saved city)

---

## Manual Testing Checklist

### Before Testing
- [ ] Firebase emulators running (`npm run serve`)
- [ ] Cities seeded (`npm run seed:cities`)
- [ ] Test users created (free + pro)
- [ ] TypeScript compiled (`npm run build`)

### GET /user/savedCities
- [ ] Pro user with no saved cities → Empty array
- [ ] Pro user with saved cities → Returns list
- [ ] Free user → 403 Paywall
- [ ] Unauthenticated → 401

### POST /user/savedCities/:cityId
- [ ] Pro user saves city → Success
- [ ] Pro user saves same city again → Idempotent
- [ ] Free user saves city → 403 Paywall
- [ ] Invalid city ID → 404
- [ ] Unauthenticated → 401

### DELETE /user/savedCities/:cityId
- [ ] Pro user removes saved city → Success
- [ ] Remove non-saved city → 404
- [ ] Unauthenticated → 401

### Integration
- [ ] Save → View → Delete flow works end-to-end
- [ ] Saved cities independent from viewed cities
- [ ] Firestore documents created/deleted correctly

### Performance
- [ ] Response time < 300ms (p95)
- [ ] Concurrent saves handled correctly

---

## Known Issues

**None** - All Day 9 tasks completed successfully during Day 6 implementation.

---

## Next Steps (Day 10)

1. **Profile Tab Implementation** (UI Designer)
   - User info section
   - Subscription badge
   - Settings sections

2. **PATCH /user/me Enhancement** (Backend Engineer)
   - Already implemented in Day 2
   - No additional work needed

3. **Sprint 2 Review** (All Agents)
   - Full regression testing
   - Sprint 2 summary report

---

## Support

**Issues or Questions?**
- Check Firestore Console for data verification
- Review logs: `firebase emulators:start --inspect-functions`
- Consult backend-specs.md for API contract details

**Contact**: Backend Engineer (Claude Code)

**Last Updated**: December 28, 2025 (Sprint 2, Day 9)
