# Litplan Backend Testing Checklist

**Sprint 6 Phase 7 - QA Testing Documentation**
**Date:** 2024-12-29
**Environment:** Local Development (http://localhost:3001)

---

## Table of Contents

1. [API Endpoint Test Checklist](#api-endpoint-test-checklist)
2. [Auth Flow Test Cases](#auth-flow-test-cases)
3. [Storage Test Cases](#storage-test-cases)
4. [Error Handling Test Cases](#error-handling-test-cases)
5. [Testing Commands](#testing-commands)

---

## API Endpoint Test Checklist

### Health & Status Endpoints

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/health` | GET | No | 200 | `{ status: "healthy", database: "connected" }` |
| `/api/health` | GET | No | 200 | `{ status: "healthy", database: "connected" }` |
| `/` | GET | No | 200 | API info with version and endpoints |
| `/api/v2` | GET | No | 200 | API v2 documentation |

### Cities Endpoints (Public)

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/api/v2/cities` | GET | No | 200 | `{ success: true, data: { cities: [...], count: N } }` |
| `/api/v2/cities/featured` | GET | No | 200 | `{ success: true, data: { cities: [...] } }` |
| `/api/v2/cities/featured?limit=3` | GET | No | 200 | Returns max 3 featured cities |
| `/api/v2/cities/search?q=Paris` | GET | No | 200 | Cities matching "Paris" |
| `/api/v2/cities/search` | GET | No | 400 | Validation error - query required |
| `/api/v2/cities/:cityId` | GET | No | 200 | Single city details |
| `/api/v2/cities/invalid-id` | GET | No | 404 | City not found error |

### Cities Endpoints (Authenticated)

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/api/v2/cities/:cityId/plans` | GET | Yes | 200 | Plans for city with tier limits |
| `/api/v2/cities/:cityId/plans` | GET | No | 401 | Authentication required |
| `/api/v2/cities/:cityId/group-flows` | GET | Pro | 200 | Group flows for city |
| `/api/v2/cities/:cityId/group-flows` | GET | Free | 403 | Pro feature required |

### Plans Endpoints

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/api/v2/plans/:planId` | GET | Yes | 200 | Plan details |
| `/api/v2/plans/:planId` | GET | No | 401 | Authentication required |
| `/api/v2/plans/featured/:cityId` | GET | No | 200 | Featured plans for city |

### User Endpoints

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/api/v2/user/profile` | GET | Yes | 200 | User profile with subscription |
| `/api/v2/user/profile` | PATCH | Yes | 200 | Updated profile |
| `/api/v2/user/viewed-cities` | GET | Yes | 200 | User's viewed cities |
| `/api/v2/user/viewed-cities/:cityId` | POST | Yes | 200 | Record city view |
| `/api/v2/user/saved-cities` | GET | Pro | 200 | User's saved cities |
| `/api/v2/user/saved-cities/:cityId` | POST | Pro | 200 | Save city |
| `/api/v2/user/saved-cities/:cityId` | DELETE | Pro | 200 | Unsave city |
| `/api/v2/user/activity` | GET | Yes | 200 | User activity feed |

### Subscription Endpoints

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/api/v2/subscription` | GET | Yes | 200 | Subscription status |
| `/api/v2/subscription/entitlements` | GET | Yes | 200 | User entitlements |
| `/api/v2/subscription/validate` | POST | Yes | 200 | Validate StoreKit receipt |
| `/api/v2/subscription/restore` | POST | Yes | 200 | Restore purchases |

### Config Endpoints

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/api/v2/config` | GET | No | 200 | App configuration |
| `/api/v2/config/tier-limits` | GET | No | 200 | Tier limits (free/pro) |

### Storage Endpoints

| Endpoint | Method | Auth | Expected Status | Expected Response |
|----------|--------|------|-----------------|-------------------|
| `/api/v2/storage/info` | GET | No | 200 | Storage bucket info |
| `/api/v2/storage/city/:cityId` | GET | No | 200 | List city images |
| `/api/v2/storage/plan/:planId` | GET | No | 200 | List plan images |
| `/api/v2/storage/city/:cityId` | POST | Yes | 200 | Upload city image |
| `/api/v2/storage/plan/:planId` | POST | Yes | 200 | Upload plan image |
| `/api/v2/storage/avatar` | POST | Pro | 200 | Upload avatar |
| `/api/v2/storage/avatar` | DELETE | Pro | 200 | Delete avatar |

---

## Auth Flow Test Cases

### TC-AUTH-001: Supabase Auth Sync
**Preconditions:** Valid Supabase JWT token
**Steps:**
1. POST to `/api/v2/auth/supabase/sync` with Bearer token
2. Verify user created/updated in database
3. Check subscription record created

**Expected Result:** User synced, subscription initialized

### TC-AUTH-002: Invalid Token
**Preconditions:** Invalid or expired JWT
**Steps:**
1. Call authenticated endpoint with invalid token
2. Verify 401 response

**Expected Result:** `{ success: false, error: { code: "INVALID_TOKEN" } }`

### TC-AUTH-003: Missing Token
**Preconditions:** No Authorization header
**Steps:**
1. Call authenticated endpoint without token
2. Verify 401 response

**Expected Result:** `{ success: false, error: { code: "AUTH_REQUIRED" } }`

### TC-AUTH-004: Token Expiry
**Preconditions:** Expired JWT token
**Steps:**
1. Call authenticated endpoint with expired token
2. Verify 401 response with appropriate message

**Expected Result:** Token rejection with clear error

### TC-AUTH-005: Get Current User
**Preconditions:** Valid authenticated session
**Steps:**
1. GET `/api/v2/auth/supabase/me`
2. Verify user details returned

**Expected Result:** User profile with subscription data

### TC-AUTH-006: Delete Account
**Preconditions:** Authenticated user
**Steps:**
1. DELETE `/api/v2/auth/supabase/account`
2. Verify user and related data deleted

**Expected Result:** Account deleted, data cascade removed

---

## Storage Test Cases

### TC-STOR-001: Get Storage Info
**Steps:**
1. GET `/api/v2/storage/info`
2. Verify bucket configuration returned

**Expected Result:** List of buckets with public URLs

### TC-STOR-002: List City Images
**Steps:**
1. GET `/api/v2/storage/city/:cityId`
2. Verify images listed

**Expected Result:** Array of image URLs

### TC-STOR-003: Upload City Image (Authenticated)
**Preconditions:** Authenticated user
**Steps:**
1. POST multipart form to `/api/v2/storage/city/:cityId`
2. Include image file
3. Verify upload success

**Expected Result:** Public URL returned

### TC-STOR-004: Upload Avatar (Pro Only)
**Preconditions:** Pro subscription
**Steps:**
1. POST multipart form to `/api/v2/storage/avatar`
2. Include image file
3. Verify upload success

**Expected Result:** Avatar URL returned

### TC-STOR-005: Avatar Upload Rejected for Free User
**Preconditions:** Free tier user
**Steps:**
1. Attempt avatar upload
2. Verify 403 response

**Expected Result:** Pro feature required error

---

## Error Handling Test Cases

### TC-ERR-001: 404 Not Found
**Steps:**
1. GET `/api/v2/nonexistent-endpoint`
2. Verify 404 response

**Expected Result:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested endpoint does not exist"
  }
}
```

### TC-ERR-002: Database Connection Error
**Steps:**
1. Simulate database disconnect
2. Hit database endpoint
3. Verify graceful error handling

**Expected Result:** 500 with database error message

### TC-ERR-003: Invalid Request Body
**Steps:**
1. POST with malformed JSON
2. Verify error response

**Expected Result:** 400 Bad Request with parse error

### TC-ERR-004: Rate Limiting (if implemented)
**Steps:**
1. Make rapid successive requests
2. Verify rate limit response

**Expected Result:** 429 Too Many Requests

### TC-ERR-005: Paywall Limit Reached
**Preconditions:** Free user who has viewed max cities this week
**Steps:**
1. Attempt to access new city plans
2. Verify paywall response

**Expected Result:**
```json
{
  "success": false,
  "error": {
    "code": "PAYWALL_LIMIT_REACHED",
    "message": "You have reached your weekly city limit...",
    "details": {
      "currentLimit": 1,
      "used": 1,
      "tier": "FREE"
    }
  }
}
```

### TC-ERR-006: Validation Errors
**Steps:**
1. Call search without query param
2. Verify validation error

**Expected Result:** 400 with validation error code

---

## Testing Commands

### Quick Health Check
```bash
curl http://localhost:3001/health
```

### Test Public Endpoints
```bash
# Cities list
curl http://localhost:3001/api/v2/cities

# Featured cities
curl http://localhost:3001/api/v2/cities/featured

# City search
curl "http://localhost:3001/api/v2/cities/search?q=New%20York"

# City details
curl http://localhost:3001/api/v2/cities/nyc-001

# Config
curl http://localhost:3001/api/v2/config

# Tier limits
curl http://localhost:3001/api/v2/config/tier-limits

# Storage info
curl http://localhost:3001/api/v2/storage/info
```

### Test Authenticated Endpoints
```bash
# Replace $TOKEN with valid Supabase JWT

# Sync user
curl -X POST http://localhost:3001/api/v2/auth/supabase/sync \
  -H "Authorization: Bearer $TOKEN"

# Get current user
curl http://localhost:3001/api/v2/auth/supabase/me \
  -H "Authorization: Bearer $TOKEN"

# Get subscription
curl http://localhost:3001/api/v2/subscription \
  -H "Authorization: Bearer $TOKEN"

# Get city plans
curl http://localhost:3001/api/v2/cities/nyc-001/plans \
  -H "Authorization: Bearer $TOKEN"
```

---

## Test Coverage Summary

| Category | Total Tests | Priority |
|----------|-------------|----------|
| Health/Status | 4 | High |
| Cities Public | 7 | High |
| Cities Auth | 4 | High |
| Plans | 3 | Medium |
| User | 8 | High |
| Subscription | 4 | Critical |
| Config | 2 | Low |
| Storage | 7 | Medium |
| Auth Flow | 6 | Critical |
| Error Handling | 6 | High |
| **Total** | **51** | - |

---

## Notes

1. **Database Seeding Required:** Ensure database is seeded with test data before running tests
2. **Supabase SDK Required for iOS:** iOS testing requires Supabase Swift SDK installation
3. **StoreKit Testing:** Use StoreKit sandbox for subscription tests
4. **Rate Limiting:** Not yet implemented - tests will pass without limits
