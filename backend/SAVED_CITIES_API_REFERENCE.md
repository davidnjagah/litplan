# Saved Cities API - Quick Reference
**Sprint 2, Day 9** | **Backend Engineer** | **December 28, 2025**

---

## Overview
The Saved Cities API allows Pro users to save their favorite cities for quick access. Free users receive a paywall error when attempting to use this feature.

---

## Base URL
```
Development: http://localhost:5001/litplan-dev/us-central1/api
Production:  https://api.litplan.app/v1
```

---

## Authentication
All requests require a Firebase Bearer token:
```
Authorization: Bearer <firebase-token>
```

---

## Endpoints

### 1. GET /user/savedCities
Retrieve user's saved cities (Pro only)

**Request**:
```bash
curl -X GET {BASE_URL}/user/savedCities \
  -H "Authorization: Bearer {token}"
```

**Response** (200):
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

**Errors**:
- 401: Not authenticated
- 403: Free user (paywall)

---

### 2. POST /user/savedCities/:cityId
Save a city (Pro only)

**Request**:
```bash
curl -X POST {BASE_URL}/user/savedCities/nyc-001 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Response** (200):
```json
{
  "success": true,
  "message": "City saved successfully"
}
```

**Errors**:
- 401: Not authenticated
- 403: Free user (paywall)
- 404: City not found

---

### 3. DELETE /user/savedCities/:cityId
Remove saved city

**Request**:
```bash
curl -X DELETE {BASE_URL}/user/savedCities/nyc-001 \
  -H "Authorization: Bearer {token}"
```

**Response** (200):
```json
{
  "success": true,
  "message": "City removed from saved list"
}
```

**Errors**:
- 401: Not authenticated
- 404: City not saved

---

## Paywall Error Format

**Response** (403):
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

---

## Access Control

| Tier | GET | POST | DELETE |
|------|-----|------|--------|
| Free | ❌ 403 | ❌ 403 | ✅ 200* |
| Pro  | ✅ 200 | ✅ 200 | ✅ 200 |

*Free users can delete if they previously had Pro

---

## Implementation Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/api/user.ts` | 244-308 | GET /user/savedCities |
| `src/api/user.ts` | 320-383 | POST /user/savedCities/:cityId |
| `src/api/user.ts` | 395-429 | DELETE /user/savedCities/:cityId |
| `src/utils/helpers.ts` | 216-233 | paywallError() helper |
| `src/utils/middleware.ts` | - | authenticateUser middleware |

---

## Firestore Structure

**Collection**: `users/{userId}/savedCities/{cityId}`

**Document**:
```javascript
{
  cityId: "nyc-001",
  savedAt: Timestamp,
  notes: ""
}
```

**Index**: `savedAt` (Descending)

---

## Testing

**Test Guide**: `/backend/DAY9_TESTING_GUIDE.md`
**Postman Collection**: `/backend/Litplan-API-Tests.postman_collection.json`

**Quick Test**:
```bash
# 1. Start emulators
npm run serve

# 2. Get saved cities (empty)
curl http://localhost:5001/.../api/user/savedCities \
  -H "Authorization: Bearer {token}"

# 3. Save a city
curl -X POST http://localhost:5001/.../api/user/savedCities/nyc-001 \
  -H "Authorization: Bearer {token}"

# 4. Verify saved
curl http://localhost:5001/.../api/user/savedCities \
  -H "Authorization: Bearer {token}"
```

---

## Common Issues

**Q: Getting 403 even though user is Pro?**
A: Check `subscription.tier` in Firestore users collection

**Q: City not appearing in list?**
A: Verify city exists in cities collection

**Q: Duplicate saves creating multiple documents?**
A: Endpoint is idempotent - duplicate saves return success without creating duplicates

---

## Related Endpoints

- POST /user/viewedCities - Track city views (any tier)
- GET /user/viewedCities - Get viewed cities (any tier)
- POST /subscription/validate - Upgrade to Pro
- GET /subscription/status - Check subscription tier

---

**Status**: ✅ Production Ready
**Compliance**: 100% backend-specs.md
**Build**: 0 errors
**Documentation**: Complete
