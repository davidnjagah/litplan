# Day 6 Testing Guide - User Activity Tracking

## Overview
This guide provides comprehensive testing instructions for the Sprint 2, Day 6 deliverables: user activity tracking endpoints and saved cities functionality.

## New Endpoints Implemented

### 1. POST /user/viewedCities
Track that a user viewed a city

### 2. GET /user/viewedCities
Get user's recently viewed cities

### 3. GET /user/savedCities (Pro only)
Get user's saved cities

### 4. POST /user/savedCities/:cityId (Pro only)
Save a city to favorites

### 5. DELETE /user/savedCities/:cityId
Remove city from saved list

## Cloud Function Implemented

### updateUserActivity
Firestore trigger that automatically fires when new activity is created. Logs analytics and can be extended for personalized recommendations.

---

## Test Scenarios

### Scenario 1: Track City View (Free User)

**Endpoint**: POST /user/viewedCities

**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "nyc-001",
    "source": "explore_tab"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "City view recorded"
}
```

**Validation**:
- ✅ Activity record created in Firestore: `users/<userId>/activity/<activityId>`
- ✅ Activity type is "viewed_city"
- ✅ viewCount is 1 (first view)
- ✅ timestamp is current time
- ✅ updateUserActivity Cloud Function triggered and logged

---

### Scenario 2: Track Second City View (Free User - Paywall)

**Endpoint**: POST /user/viewedCities

**Request**:
```bash
# First view city 1
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cityId": "nyc-001", "source": "explore_tab"}'

# Then view city 2 (should trigger paywall)
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cityId": "la-001", "source": "search"}'
```

**Expected Response** (403):
```json
{
  "success": false,
  "error": {
    "code": "PAYWALL_LIMIT_REACHED",
    "message": "Upgrade to Pro to access more than 1 city per week",
    "paywallType": "city_limit"
  }
}
```

**Validation**:
- ✅ Free user limited to 1 city per week
- ✅ Paywall error returned when attempting 2nd city
- ✅ View is still recorded (for analytics) but paywall shown

---

### Scenario 3: Increment View Count (Same City, Same Week)

**Endpoint**: POST /user/viewedCities

**Request**:
```bash
# View NYC first time
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cityId": "nyc-001", "source": "explore_tab"}'

# View NYC again (same week)
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cityId": "nyc-001", "source": "search"}'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "City view recorded"
}
```

**Validation**:
- ✅ viewCount incremented to 2 (not creating duplicate records)
- ✅ timestamp updated to latest view
- ✅ metadata.lastSource updated to "search"

---

### Scenario 4: Get Viewed Cities (Free User)

**Endpoint**: GET /user/viewedCities

**Request**:
```bash
curl -X GET "http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities?limit=20" \
  -H "Authorization: Bearer <FREE_USER_TOKEN>"
```

**Expected Response** (200):
```json
{
  "success": true,
  "viewedCities": [
    {
      "cityId": "nyc-001",
      "name": "New York",
      "country": "United States",
      "viewedAt": {
        "_seconds": 1735300800,
        "_nanoseconds": 0
      },
      "viewCount": 2,
      "displayAssets": {
        "heroImage": "https://images.unsplash.com/...",
        "cardImage": "https://images.unsplash.com/...",
        "accentColor": "#00D9FF"
      }
    }
  ]
}
```

**Validation**:
- ✅ Returns cities ordered by most recent view
- ✅ Includes city name, country, displayAssets
- ✅ Includes viewedAt timestamp and viewCount
- ✅ Limit parameter works (default 20)

---

### Scenario 5: Get Viewed Cities (Empty State)

**Endpoint**: GET /user/viewedCities

**Request**:
```bash
curl -X GET "http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities" \
  -H "Authorization: Bearer <NEW_USER_TOKEN>"
```

**Expected Response** (200):
```json
{
  "success": true,
  "viewedCities": []
}
```

**Validation**:
- ✅ Returns empty array if no cities viewed
- ✅ Does not error

---

### Scenario 6: Save City (Free User - Paywall)

**Endpoint**: POST /user/savedCities/:cityId

**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <FREE_USER_TOKEN>"
```

**Expected Response** (403):
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

**Validation**:
- ✅ Free users cannot save cities
- ✅ Paywall error returned

---

### Scenario 7: Save City (Pro User)

**Endpoint**: POST /user/savedCities/:cityId

**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <PRO_USER_TOKEN>"
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "City saved successfully"
}
```

**Validation**:
- ✅ Saved city document created in `users/<userId>/savedCities/<cityId>`
- ✅ savedAt timestamp is current time
- ✅ notes field is empty string (for future feature)

---

### Scenario 8: Get Saved Cities (Pro User)

**Endpoint**: GET /user/savedCities

**Request**:
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/user/savedCities \
  -H "Authorization: Bearer <PRO_USER_TOKEN>"
```

**Expected Response** (200):
```json
{
  "success": true,
  "savedCities": [
    {
      "cityId": "nyc-001",
      "name": "New York",
      "country": "United States",
      "savedAt": {
        "_seconds": 1735300800,
        "_nanoseconds": 0
      },
      "displayAssets": {
        "heroImage": "https://images.unsplash.com/...",
        "cardImage": "https://images.unsplash.com/...",
        "accentColor": "#00D9FF"
      }
    }
  ]
}
```

**Validation**:
- ✅ Returns saved cities ordered by most recent save
- ✅ Includes city name, country, displayAssets
- ✅ Includes savedAt timestamp

---

### Scenario 9: Get Saved Cities (Free User - Paywall)

**Endpoint**: GET /user/savedCities

**Request**:
```bash
curl -X GET http://localhost:5001/litplan-dev/us-central1/api/user/savedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>"
```

**Expected Response** (403):
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

**Validation**:
- ✅ Free users cannot access saved cities

---

### Scenario 10: Unsave City (Pro User)

**Endpoint**: DELETE /user/savedCities/:cityId

**Request**:
```bash
curl -X DELETE http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer <PRO_USER_TOKEN>"
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "City removed from saved list"
}
```

**Validation**:
- ✅ Saved city document deleted from Firestore
- ✅ Subsequent GET /user/savedCities does not include this city

---

### Scenario 11: Unsave City (Not Saved)

**Endpoint**: DELETE /user/savedCities/:cityId

**Request**:
```bash
curl -X DELETE http://localhost:5001/litplan-dev/us-central1/api/user/savedCities/tokyo-001 \
  -H "Authorization: Bearer <PRO_USER_TOKEN>"
```

**Expected Response** (404):
```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_SAVED",
    "message": "City is not in your saved list"
  }
}
```

**Validation**:
- ✅ Returns 404 if city not in saved list

---

### Scenario 12: Invalid City ID

**Endpoint**: POST /user/viewedCities

**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cityId": "invalid-city-999", "source": "explore_tab"}'
```

**Expected Response** (404):
```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City invalid-city-999 not found"
  }
}
```

**Validation**:
- ✅ Returns 404 for non-existent cities
- ✅ Does not create activity record for invalid cities

---

### Scenario 13: Missing cityId in Request Body

**Endpoint**: POST /user/viewedCities

**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Authorization: Bearer <FREE_USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"source": "explore_tab"}'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "cityId is required"
  }
}
```

**Validation**:
- ✅ Returns 400 for missing cityId
- ✅ Clear error message

---

### Scenario 14: Unauthenticated Request

**Endpoint**: POST /user/viewedCities

**Request**:
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/user/viewedCities \
  -H "Content-Type: application/json" \
  -d '{"cityId": "nyc-001", "source": "explore_tab"}'
```

**Expected Response** (401):
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Authentication required"
  }
}
```

**Validation**:
- ✅ Returns 401 for unauthenticated requests
- ✅ authenticateUser middleware working

---

## Testing Checklist

### Functionality Tests
- [ ] POST /user/viewedCities creates activity record
- [ ] POST /user/viewedCities increments viewCount on repeat views
- [ ] POST /user/viewedCities enforces 1 city/week limit for free users
- [ ] POST /user/viewedCities allows unlimited cities for pro users
- [ ] GET /user/viewedCities returns sorted list of viewed cities
- [ ] GET /user/viewedCities returns empty array for new users
- [ ] GET /user/savedCities blocks free users (paywall)
- [ ] POST /user/savedCities/:cityId blocks free users (paywall)
- [ ] POST /user/savedCities/:cityId saves city for pro users
- [ ] GET /user/savedCities returns saved cities for pro users
- [ ] DELETE /user/savedCities/:cityId removes saved city
- [ ] updateUserActivity Cloud Function triggers on new activity

### Error Handling Tests
- [ ] Returns 404 for invalid cityId
- [ ] Returns 400 for missing cityId
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 403 for tier-restricted endpoints
- [ ] Returns 404 when unsaving non-saved city

### Edge Cases
- [ ] Viewing same city multiple times in same week
- [ ] Weekly boundary testing (Monday rollover)
- [ ] Pro user can save unlimited cities
- [ ] Limit parameter works correctly (default 20)
- [ ] Empty states return gracefully

### Performance Tests
- [ ] Response time < 300ms for all endpoints
- [ ] Firestore queries optimized (proper indexes)
- [ ] Batch operations efficient

---

## Known Limitations

1. **Week Calculation**: Uses simple ISO week calculation. May need adjustment for edge cases (year boundaries).

2. **Concurrent Requests**: If user views same city twice simultaneously, may create duplicate activity records. Consider implementing transaction-based updates if this becomes an issue.

3. **Analytics Integration**: updateUserActivity currently only logs to console. Future enhancement: integrate with Mixpanel, Amplitude, or Firebase Analytics.

4. **Activity Cleanup**: cleanupUserActivity scheduled function not yet implemented. Old activity data will accumulate.

---

## Next Steps (Sprint 2, Day 7)

1. Implement Group Flows seed script
2. Implement GET /cities/:cityId/groupFlows endpoint
3. Test Group Flows API with free vs pro users
4. QA testing of all Day 6 endpoints

---

## Postman Collection Structure

**Folder**: User Activity Tracking

1. POST /user/viewedCities (Free User)
2. POST /user/viewedCities (Pro User)
3. GET /user/viewedCities
4. POST /user/viewedCities (2nd city - paywall)
5. GET /user/savedCities (Free - paywall)
6. GET /user/savedCities (Pro)
7. POST /user/savedCities/:cityId (Free - paywall)
8. POST /user/savedCities/:cityId (Pro)
9. DELETE /user/savedCities/:cityId
10. POST /user/viewedCities (invalid city)
11. POST /user/viewedCities (missing cityId)
12. POST /user/viewedCities (unauthenticated)

---

**Created**: Sprint 2, Day 6 (Monday, December 27, 2025)
**Author**: Backend Engineer Agent
**Status**: Ready for Testing
