# LitPlanz Backend - API Documentation

Complete reference for all LitPlanz backend API endpoints.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Common Headers](#common-headers)
5. [Error Responses](#error-responses)
6. [Rate Limiting](#rate-limiting)
7. [Endpoints](#endpoints)
   - [Health & Info](#health--info)
   - [Authentication](#authentication-endpoints)
   - [User Management](#user-management)
   - [Cities](#cities)
   - [Plans](#plans)
   - [Subscriptions](#subscriptions)
   - [Configuration](#configuration)
8. [Tier Limits](#tier-limits)
9. [Code Examples](#code-examples)

---

## Overview

The LitPlanz backend provides a RESTful API for managing users, cities, plans, and subscriptions. All endpoints (except health and root) require Firebase Authentication.

**API Version**: 1.0.0
**Last Updated**: 2025-12-28

---

## Authentication

All API requests (except `/health` and `/`) require a valid Firebase ID token in the Authorization header.

### Getting a Firebase ID Token

```javascript
// Using Firebase SDK
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
const token = await user.getIdToken();
```

### Using the Token in Requests

```bash
curl -X GET https://your-api.com/user/me \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

---

## Base URL

### Development
```
http://localhost:5001/<project-id>/us-central1/api
```

### Production
```
https://us-central1-<project-id>.cloudfunctions.net/api
```

---

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes (most endpoints) | Bearer token with Firebase ID token |
| `Content-Type` | Yes (POST/PUT/PATCH) | `application/json` |

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2025-12-28T10:00:00.000Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INVALID_TOKEN` | 401 | Invalid Firebase token |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_INPUT` | 400 | Invalid request parameters |
| `MISSING_REQUIRED_FIELD` | 400 | Required field missing |
| `TIER_LIMIT_REACHED` | 403 | User reached tier limit |
| `PRO_TIER_REQUIRED` | 403 | Feature requires Pro tier |
| `SUBSCRIPTION_EXPIRED` | 403 | Subscription expired |
| `WEEKEND_ACCESS_RESTRICTED` | 403 | Weekend plans require Pro |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INVALID_RECEIPT` | 400 | Invalid App Store receipt |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Rate limits vary by endpoint:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 30 req/min | Per user |
| City listing | 60 req/min | Per user |
| City details | 30 req/min | Per user |
| Plan details | 30 req/min | Per user |
| Subscription | 10 req/min | Per user |
| Config | 60 req/min | Per user |

When rate limit is exceeded, the API returns:
- HTTP Status: `429 Too Many Requests`
- Header: `Retry-After: <seconds>`

---

## Endpoints

### Health & Info

#### GET /health
Health check endpoint (no authentication required).

**Response**: 200 OK
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-28T10:00:00.000Z"
}
```

#### GET /
API information and endpoint listing (no authentication required).

**Response**: 200 OK
```json
{
  "message": "LitPlanz Backend API",
  "version": "1.0.0",
  "endpoints": { ... },
  "tierLimits": { ... }
}
```

---

### Authentication Endpoints

#### POST /auth/login
Authenticate user and create/update user document.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Request Body**: None

**Response**: 200 OK
```json
{
  "user": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://...",
    "tier": "free",
    "createdAt": "2025-12-28T10:00:00.000Z",
    "lastLogin": "2025-12-28T10:00:00.000Z"
  }
}
```

**Rate Limit**: 30 requests/minute

---

### User Management

#### GET /user/me
Get current user profile.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Response**: 200 OK
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "tier": "pro",
  "subscriptionStatus": "active",
  "subscriptionExpiry": "2026-01-28T10:00:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastLogin": "2025-12-28T10:00:00.000Z"
}
```

**Rate Limit**: 60 requests/minute

---

#### PATCH /user/me
Update user preferences.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)
- `Content-Type: application/json` (required)

**Request Body**:
```json
{
  "displayName": "Jane Doe",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Response**: 200 OK
```json
{
  "uid": "firebase-user-id",
  "displayName": "Jane Doe",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Rate Limit**: 30 requests/minute

---

#### GET /user/viewedCities
Get user's viewed cities history.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Query Parameters**:
- `limit` (optional): Number of results (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response**: 200 OK
```json
{
  "viewedCities": [
    {
      "cityId": "miami-fl-us",
      "cityName": "Miami",
      "viewedAt": "2025-12-28T10:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**Rate Limit**: 60 requests/minute

---

#### POST /user/viewedCities
Track a city view (internal use - called automatically).

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)
- `Content-Type: application/json` (required)

**Request Body**:
```json
{
  "cityId": "miami-fl-us"
}
```

**Response**: 201 Created
```json
{
  "success": true,
  "cityId": "miami-fl-us",
  "timestamp": "2025-12-28T10:00:00.000Z"
}
```

**Rate Limit**: 30 requests/minute

---

#### GET /user/savedCities
Get user's saved cities (Pro only).

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Response**: 200 OK (Pro users only)
```json
{
  "savedCities": [
    {
      "cityId": "miami-fl-us",
      "cityName": "Miami",
      "state": "FL",
      "country": "US",
      "savedAt": "2025-12-28T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

**Error**: 403 Forbidden (Free users)
```json
{
  "error": {
    "code": "PRO_TIER_REQUIRED",
    "message": "Pro tier required to access saved cities"
  }
}
```

**Rate Limit**: 60 requests/minute

---

#### POST /user/savedCities/:cityId
Save a city (Pro only).

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**URL Parameters**:
- `cityId`: City ID (e.g., "miami-fl-us")

**Response**: 201 Created
```json
{
  "success": true,
  "cityId": "miami-fl-us",
  "savedAt": "2025-12-28T10:00:00.000Z"
}
```

**Rate Limit**: 30 requests/minute

---

#### DELETE /user/savedCities/:cityId
Remove a saved city.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**URL Parameters**:
- `cityId`: City ID (e.g., "miami-fl-us")

**Response**: 200 OK
```json
{
  "success": true,
  "cityId": "miami-fl-us"
}
```

**Rate Limit**: 30 requests/minute

---

### Cities

#### GET /cities
Get list of all cities.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Query Parameters**:
- `limit` (optional): Number of results (1-100, default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**: 200 OK
```json
{
  "cities": [
    {
      "id": "miami-fl-us",
      "name": "Miami",
      "state": "FL",
      "country": "US",
      "latitude": 25.7617,
      "longitude": -80.1918,
      "population": 467963,
      "vibeScore": 95,
      "tags": ["beach", "nightlife", "art"],
      "featuredImageUrl": "https://...",
      "currentWeek": 1
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

**Rate Limit**: 60 requests/minute

---

#### GET /cities/:cityId
Get city details and track city view.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**URL Parameters**:
- `cityId`: City ID (e.g., "miami-fl-us")

**Response**: 200 OK
```json
{
  "id": "miami-fl-us",
  "name": "Miami",
  "state": "FL",
  "country": "US",
  "latitude": 25.7617,
  "longitude": -80.1918,
  "population": 467963,
  "vibeScore": 95,
  "tags": ["beach", "nightlife", "art"],
  "description": "Vibrant coastal city...",
  "featuredImageUrl": "https://...",
  "currentWeek": 1,
  "weeklyPlanCount": 50,
  "groupFlowCount": 10
}
```

**Weekly City Limit**:
- Free users: 1 city per week
- Pro users: 100 cities per week

**Error**: 403 Forbidden (Free users who exceeded limit)
```json
{
  "error": {
    "code": "TIER_LIMIT_REACHED",
    "message": "Weekly city limit reached. Maximum allowed: 1"
  }
}
```

**Rate Limit**: 30 requests/minute

---

#### GET /cities/:cityId/plans
Get plans for a specific city.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**URL Parameters**:
- `cityId`: City ID (e.g., "miami-fl-us")

**Query Parameters**:
- `type` (optional): Plan type ("individual" or "group", default: "individual")
- `limit` (optional): Number of results (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response**: 200 OK
```json
{
  "plans": [
    {
      "id": "plan-001",
      "cityId": "miami-fl-us",
      "cityName": "Miami",
      "type": "individual",
      "title": "Art Deco Weekend",
      "description": "Explore Miami's iconic Art Deco district",
      "dayOfWeek": "Friday",
      "timeOfDay": "evening",
      "duration": 180,
      "vibe": ["cultural", "photography"],
      "activities": [
        {
          "name": "Art Deco Walking Tour",
          "location": "Ocean Drive",
          "duration": 90,
          "cost": 25
        }
      ],
      "totalCost": 75,
      "weekNumber": 1
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0,
  "cityLimits": {
    "viewsThisWeek": 1,
    "maxCitiesPerWeek": 1,
    "remainingCities": 0
  }
}
```

**Group Plans (Pro Only)**:
- Free users cannot access group plans
- Query parameter `type=group` requires Pro tier

**Rate Limit**: 30 requests/minute

---

#### GET /cities/saved
Get user's saved cities (Pro only - alternative endpoint).

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Response**: Same as GET /user/savedCities

**Rate Limit**: 60 requests/minute

---

#### POST /cities/save
Save a city (Pro only - alternative endpoint).

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)
- `Content-Type: application/json` (required)

**Request Body**:
```json
{
  "cityId": "miami-fl-us"
}
```

**Response**: Same as POST /user/savedCities/:cityId

**Rate Limit**: 30 requests/minute

---

#### DELETE /cities/save/:cityId
Remove a saved city (alternative endpoint).

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**URL Parameters**:
- `cityId`: City ID (e.g., "miami-fl-us")

**Response**: Same as DELETE /user/savedCities/:cityId

**Rate Limit**: 30 requests/minute

---

### Plans

#### GET /plans/:planId
Get detailed plan information.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**URL Parameters**:
- `planId`: Plan ID (e.g., "plan-001")

**Response**: 200 OK
```json
{
  "id": "plan-001",
  "cityId": "miami-fl-us",
  "cityName": "Miami",
  "type": "individual",
  "title": "Art Deco Weekend",
  "description": "Explore Miami's iconic Art Deco district",
  "dayOfWeek": "Friday",
  "timeOfDay": "evening",
  "duration": 180,
  "vibe": ["cultural", "photography"],
  "activities": [
    {
      "name": "Art Deco Walking Tour",
      "location": "Ocean Drive",
      "duration": 90,
      "cost": 25,
      "description": "Guided tour of historic Art Deco buildings"
    }
  ],
  "totalCost": 75,
  "weekNumber": 1,
  "isWeekendPlan": true
}
```

**Plan View Limits**:
- Free users: 10 plans per city
- Pro users: 50 plans per city

**Weekend Access**:
- Free users: Cannot access Friday/Saturday/Sunday plans
- Pro users: Full weekend access

**Error**: 403 Forbidden (Free users who exceeded limit)
```json
{
  "error": {
    "code": "TIER_LIMIT_REACHED",
    "message": "Plan view limit reached for this city. Maximum allowed: 10"
  }
}
```

**Error**: 403 Forbidden (Free users accessing weekend plans)
```json
{
  "error": {
    "code": "WEEKEND_ACCESS_RESTRICTED",
    "message": "Weekend plans are only available to Pro users"
  }
}
```

**Rate Limit**: 30 requests/minute

---

### Subscriptions

#### POST /subscription/validate
Validate App Store receipt and activate Pro subscription.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)
- `Content-Type: application/json` (required)

**Request Body**:
```json
{
  "receiptData": "base64-encoded-receipt-data",
  "transactionId": "1000000123456789"
}
```

**Response**: 200 OK
```json
{
  "success": true,
  "tier": "pro",
  "subscriptionStatus": "active",
  "expiresDate": "2026-01-28T10:00:00.000Z",
  "productId": "com.litplan.pro.monthly",
  "transactionId": "1000000123456789"
}
```

**Error**: 400 Bad Request (Invalid receipt)
```json
{
  "error": {
    "code": "INVALID_RECEIPT",
    "message": "Invalid receipt: Receipt validation failed"
  }
}
```

**Rate Limit**: 10 requests/minute

---

#### GET /subscription/status
Get current subscription status.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Response**: 200 OK
```json
{
  "tier": "pro",
  "subscriptionStatus": "active",
  "expiresDate": "2026-01-28T10:00:00.000Z",
  "productId": "com.litplan.pro.monthly",
  "transactionId": "1000000123456789",
  "autoRenewing": true
}
```

**Rate Limit**: 10 requests/minute

---

#### POST /subscription/restore
Restore purchases from previous App Store transactions.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)
- `Content-Type: application/json` (required)

**Request Body**:
```json
{
  "receiptData": "base64-encoded-receipt-data"
}
```

**Response**: 200 OK
```json
{
  "success": true,
  "restored": true,
  "tier": "pro",
  "subscriptionStatus": "active",
  "expiresDate": "2026-01-28T10:00:00.000Z"
}
```

**Rate Limit**: 10 requests/minute

---

### Configuration

#### GET /config
Get app configuration and feature flags.

**Headers**:
- `Authorization: Bearer <firebase-id-token>` (required)

**Response**: 200 OK
```json
{
  "currentWeek": 1,
  "features": {
    "groupPlans": true,
    "savedCities": true,
    "weekendPlans": true
  },
  "tierLimits": {
    "free": {
      "maxCitiesPerWeek": 1,
      "maxPlansPerCity": 10,
      "weekendAccess": false,
      "groupPlansAccess": false,
      "savedCitiesAccess": false
    },
    "pro": {
      "maxCitiesPerWeek": 100,
      "maxPlansPerCity": 50,
      "weekendAccess": true,
      "groupPlansAccess": true,
      "savedCitiesAccess": true
    }
  },
  "subscriptionProducts": {
    "monthly": "com.litplan.pro.monthly",
    "annual": "com.litplan.pro.annual"
  }
}
```

**Rate Limit**: 60 requests/minute

---

## Tier Limits

### Free Tier
- **Weekly City Limit**: 1 city per week
- **Plan View Limit**: 10 plans per city
- **Weekend Access**: No (Monday-Thursday only)
- **Group Plans**: No
- **Saved Cities**: No

### Pro Tier
- **Weekly City Limit**: 100 cities per week
- **Plan View Limit**: 50 plans per city
- **Weekend Access**: Yes (all days)
- **Group Plans**: Yes
- **Saved Cities**: Yes (unlimited)

---

## Code Examples

### JavaScript/TypeScript (Firebase SDK)

```typescript
import { getAuth } from 'firebase/auth';

const API_BASE_URL = 'https://us-central1-your-project.cloudfunctions.net/api';

// Get Firebase ID token
const auth = getAuth();
const user = auth.currentUser;
const token = await user.getIdToken();

// Get current user
const getUserProfile = async () => {
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Get cities
const getCities = async () => {
  const response = await fetch(`${API_BASE_URL}/cities?limit=50`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Get city details
const getCityDetails = async (cityId: string) => {
  const response = await fetch(`${API_BASE_URL}/cities/${cityId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Get plans for city
const getCityPlans = async (cityId: string, type: 'individual' | 'group' = 'individual') => {
  const response = await fetch(
    `${API_BASE_URL}/cities/${cityId}/plans?type=${type}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
};

// Validate subscription
const validateSubscription = async (receiptData: string, transactionId: string) => {
  const response = await fetch(`${API_BASE_URL}/subscription/validate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ receiptData, transactionId })
  });
  return response.json();
};
```

### Swift (iOS)

```swift
import FirebaseAuth

let apiBaseURL = "https://us-central1-your-project.cloudfunctions.net/api"

// Get Firebase ID token
func getIdToken() async throws -> String {
    guard let user = Auth.auth().currentUser else {
        throw NSError(domain: "Auth", code: 401, userInfo: nil)
    }
    return try await user.getIDToken()
}

// Get current user
func getUserProfile() async throws -> User {
    let token = try await getIdToken()
    let url = URL(string: "\(apiBaseURL)/user/me")!

    var request = URLRequest(url: url)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(User.self, from: data)
}

// Get cities
func getCities() async throws -> CitiesResponse {
    let token = try await getIdToken()
    let url = URL(string: "\(apiBaseURL)/cities?limit=50")!

    var request = URLRequest(url: url)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(CitiesResponse.self, from: data)
}

// Validate subscription
func validateSubscription(receiptData: String, transactionId: String) async throws -> SubscriptionResponse {
    let token = try await getIdToken()
    let url = URL(string: "\(apiBaseURL)/subscription/validate")!

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body = ["receiptData": receiptData, "transactionId": transactionId]
    request.httpBody = try JSONEncoder().encode(body)

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(SubscriptionResponse.self, from: data)
}
```

---

## Versioning

The API currently uses version 1.0.0. Future versions will be released with:
- **Minor versions** (1.1.0) for backward-compatible changes
- **Major versions** (2.0.0) for breaking changes

Version will be included in response headers:
```
X-API-Version: 1.0.0
```

---

## Support

For API issues or questions:
- Check logs: `firebase functions:log`
- Review security checklist: SECURITY_CHECKLIST.md
- Review deployment guide: DEPLOYMENT_GUIDE.md
- Contact: backend@litplan.com

---

**Last Updated**: 2025-12-28
**API Version**: 1.0.0
**Maintained By**: Backend Engineering Team
