# Litplan Backend - API Reference

Version: 1.0.0
Base URL: `https://us-central1-litplan-prod.cloudfunctions.net/api`
Last Updated: December 28, 2025

## Table of Contents

1. [Authentication](#authentication)
2. [Health Check Endpoints](#health-check-endpoints)
3. [Subscription Endpoints](#subscription-endpoints)
4. [User Endpoints](#user-endpoints)
5. [Cities Endpoints](#cities-endpoints)
6. [Plans Endpoints](#plans-endpoints)
7. [Error Codes](#error-codes)
8. [Rate Limits](#rate-limits)

---

## Authentication

All endpoints (except health checks) require authentication via Firebase ID token.

### Request Headers

```
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json
```

### Getting a Firebase ID Token

```swift
// iOS Swift example
Auth.auth().currentUser?.getIDToken { token, error in
    if let token = token {
        // Use token in Authorization header
    }
}
```

### Token Expiration

- Firebase ID tokens expire after **1 hour**
- Client must refresh token before expiration
- Expired tokens will return `401 Unauthorized`

---

## Health Check Endpoints

### GET /health

Comprehensive health check with all system dependencies.

**Authentication**: Not required
**Rate Limit**: 200 requests/minute

#### Response (200 OK)

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "firestore": {
      "healthy": true,
      "message": "Firestore is accessible",
      "latency": 45,
      "details": {
        "documentsChecked": 1,
        "responseTime": "45ms"
      }
    },
    "anthropic": {
      "healthy": true,
      "message": "Anthropic API is accessible",
      "latency": 1250,
      "details": {
        "model": "claude-3-5-sonnet-20241022",
        "responseTime": "1250ms"
      }
    },
    "apple": {
      "healthy": true,
      "message": "Apple shared secret is configured",
      "details": {
        "configured": true,
        "length": 32
      }
    },
    "environment": {
      "healthy": true,
      "message": "All required environment variables are set",
      "details": {
        "nodeEnv": "production",
        "requiredVars": ["ANTHROPIC_API_KEY", "APPLE_SHARED_SECRET"]
      }
    }
  }
}
```

#### Response (503 Service Unavailable)

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "status": "unhealthy",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "firestore": {
      "healthy": false,
      "message": "Firestore check failed: Connection timeout",
      "latency": 5000
    }
  }
}
```

---

### GET /health/liveness

Simple liveness probe (process is running).

**Authentication**: Not required
**Rate Limit**: 200 requests/minute

#### Response (200 OK)

```json
{
  "status": "alive",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### cURL Example

```bash
curl https://us-central1-litplan-prod.cloudfunctions.net/api/health/liveness
```

---

### GET /health/readiness

Readiness probe (can handle traffic).

**Authentication**: Not required
**Rate Limit**: 200 requests/minute

#### Response (200 OK)

```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "firestore": {
      "healthy": true,
      "message": "Firestore is accessible",
      "latency": 45
    }
  }
}
```

#### Response (503 Service Unavailable)

```json
{
  "status": "not_ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "firestore": {
      "healthy": false,
      "message": "Firestore check failed"
    }
  }
}
```

---

## Subscription Endpoints

### POST /subscription/validate

Validate Apple In-App Purchase receipt and upgrade user to Pro.

**Authentication**: Required
**Rate Limit**: 10 requests/minute

#### Request Body

```json
{
  "transactionId": "2000000123456789",
  "productId": "com.litplan.pro.monthly",
  "receiptData": "base64_encoded_receipt_data_here..."
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionId` | string | Yes | Apple transaction ID |
| `productId` | string | Yes | Product ID (must start with `com.litplan.`) |
| `receiptData` | string | Yes | Base64-encoded receipt from Apple |

#### Response (200 OK) - Success

```json
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "expiryDate": "2025-02-15T10:30:00.000Z",
    "autoRenew": true,
    "transactionId": "2000000123456789",
    "productId": "com.litplan.pro.monthly"
  },
  "entitlements": {
    "tier": "pro",
    "maxCitiesPerWeek": 100,
    "maxPlansPerCity": 50,
    "weekendAccess": true,
    "groupPlansAccess": true,
    "savedCitiesAccess": true
  }
}
```

#### Response (200 OK) - Already Processed (Idempotent)

```json
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "expiryDate": "2025-02-15T10:30:00.000Z"
  },
  "entitlements": {
    "tier": "pro"
  },
  "alreadyProcessed": true
}
```

#### Response (200 OK) - Already Active

```json
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "expiryDate": "2025-02-15T10:30:00.000Z"
  },
  "entitlements": {
    "tier": "pro"
  },
  "alreadyActive": true,
  "message": "You already have an active Pro subscription"
}
```

#### Response (400 Bad Request) - Invalid Receipt

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "Subscription has expired"
  }
}
```

#### Response (400 Bad Request) - Missing Fields

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "transactionId and productId are required"
  }
}
```

#### Response (400 Bad Request) - Invalid Product ID

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PRODUCT_ID",
    "message": "Product ID does not belong to this app"
  }
}
```

#### Response (409 Conflict) - Duplicate Transaction

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_TRANSACTION",
    "message": "This transaction has already been processed"
  }
}
```

#### Response (500 Internal Server Error)

```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Failed to validate subscription"
  }
}
```

#### cURL Example

```bash
curl -X POST https://us-central1-litplan-prod.cloudfunctions.net/api/subscription/validate \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "2000000123456789",
    "productId": "com.litplan.pro.monthly",
    "receiptData": "MIITtgYJKoZIhvcN..."
  }'
```

---

### GET /subscription/status

Get current subscription status from Firestore.

**Authentication**: Required
**Rate Limit**: 100 requests/minute

#### Response (200 OK) - Pro User

```json
{
  "success": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2025-02-15T10:30:00.000Z",
    "autoRenew": true
  }
}
```

#### Response (200 OK) - Free User

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

#### Response (200 OK) - Expired Subscription

```json
{
  "success": true,
  "subscription": {
    "status": "expired",
    "tier": "free",
    "expiryDate": "2025-01-01T00:00:00.000Z",
    "autoRenew": false
  }
}
```

#### Response (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

#### cURL Example

```bash
curl https://us-central1-litplan-prod.cloudfunctions.net/api/subscription/status \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### POST /subscription/restore

Restore previous purchases (currently reads from Firestore).

**Authentication**: Required
**Rate Limit**: 10 requests/minute

#### Response (200 OK) - Subscription Restored

```json
{
  "success": true,
  "restored": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2025-02-15T10:30:00.000Z",
    "autoRenew": true
  }
}
```

#### Response (200 OK) - No Subscription Found

```json
{
  "success": true,
  "restored": false,
  "subscription": null
}
```

#### cURL Example

```bash
curl -X POST https://us-central1-litplan-prod.cloudfunctions.net/api/subscription/restore \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## User Endpoints

### GET /user/me

Get current user profile.

**Authentication**: Required
**Rate Limit**: 200 requests/minute

#### Response (200 OK)

```json
{
  "success": true,
  "user": {
    "uid": "firebase_user_id_123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "subscription": {
      "tier": "pro",
      "expiryDate": "2025-02-15T10:30:00.000Z"
    },
    "entitlements": {
      "tier": "pro",
      "maxCitiesPerWeek": 100,
      "maxPlansPerCity": 50,
      "weekendAccess": true,
      "groupPlansAccess": true,
      "savedCitiesAccess": true
    }
  }
}
```

#### cURL Example

```bash
curl https://us-central1-litplan-prod.cloudfunctions.net/api/user/me \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## Cities Endpoints

### GET /cities

Get list of all cities.

**Authentication**: Required
**Rate Limit**: 200 requests/minute

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Filter cities by name or country (case-insensitive) |
| `featured` | boolean | No | Return only featured cities (`true`/`false`) |

#### Response (200 OK)

```json
{
  "success": true,
  "cities": [
    {
      "cityId": "new-york",
      "name": "New York",
      "country": "United States",
      "countryCode": "US",
      "rank": 1,
      "displayAssets": {
        "heroImage": "https://...",
        "thumbnailImage": "https://...",
        "coverImage": "https://..."
      },
      "metadata": {
        "totalPlansThisWeek": 50,
        "featured": true
      },
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    }
  ],
  "total": 50
}
```

#### cURL Examples

```bash
# Get all cities
curl https://us-central1-litplan-prod.cloudfunctions.net/api/cities \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Search for cities
curl "https://us-central1-litplan-prod.cloudfunctions.net/api/cities?search=new" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Get only featured cities
curl "https://us-central1-litplan-prod.cloudfunctions.net/api/cities?featured=true" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### GET /cities/:cityId

Get details for a specific city (tracks weekly city limit).

**Authentication**: Required
**Rate Limit**: 200 requests/minute
**Tier Enforcement**: Free users can view 1 unique city per week

#### Response (200 OK)

```json
{
  "success": true,
  "city": {
    "cityId": "new-york",
    "name": "New York",
    "country": "United States",
    "countryCode": "US",
    "rank": 1,
    "timezone": "America/New_York",
    "displayAssets": {
      "heroImage": "https://...",
      "thumbnailImage": "https://...",
      "coverImage": "https://..."
    },
    "metadata": {
      "totalPlansThisWeek": 50,
      "totalGroupFlows": 10,
      "featured": true,
      "description": "The city that never sleeps..."
    },
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

#### Response (403 Forbidden) - City Limit Reached

```json
{
  "success": false,
  "error": {
    "code": "CITY_LIMIT_REACHED",
    "message": "Free users can explore 1 city per week. Upgrade to Pro for unlimited cities.",
    "requiresUpgrade": true,
    "uniqueCitiesThisWeek": 1
  }
}
```

#### Response (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City with ID 'invalid-city' not found"
  }
}
```

#### cURL Example

```bash
curl https://us-central1-litplan-prod.cloudfunctions.net/api/cities/new-york \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### GET /cities/:cityId/plans

Get nightlife plans for a city with tier-based filtering.

**Authentication**: Required
**Rate Limit**: 200 requests/minute
**Tier Enforcement**:
- Free users: Max 10 plans, weekday only
- Pro users: Up to 50 plans, includes weekends

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter by type: `"individual"`, `"group"`, or `"all"` (default) |

#### Response (200 OK) - Pro User

```json
{
  "success": true,
  "plans": [
    {
      "planId": "plan-123",
      "cityId": "new-york",
      "rank": 1,
      "title": "Rooftop Bar Hopping in Manhattan",
      "venueName": "230 Fifth Rooftop",
      "description": "Experience the best rooftop bars in NYC...",
      "category": "upscale",
      "type": "individual",
      "images": {
        "hero": "https://...",
        "thumbnail": "https://..."
      },
      "location": {
        "address": "230 Fifth Avenue, New York, NY 10001",
        "coordinates": {
          "latitude": 40.7433,
          "longitude": -73.9883
        }
      },
      "schedule": {
        "bestTime": "9:00 PM - 2:00 AM",
        "duration": "3-4 hours",
        "daysAvailable": ["Thursday", "Friday", "Saturday"]
      },
      "pricing": {
        "range": "$$$",
        "estimatedCost": 80,
        "currency": "USD"
      },
      "aiTags": ["Rooftop", "Upscale", "Views", "Cocktails"],
      "flags": {
        "isWeekend": true,
        "isIndividual": true,
        "isGroup": false,
        "requiresReservation": true
      },
      "reviews": {
        "rating": 4.7,
        "count": 1250
      }
    }
  ],
  "total": 50,
  "userLimit": 50,
  "hasMore": false,
  "tier": "pro"
}
```

#### Response (200 OK) - Free User

```json
{
  "success": true,
  "plans": [
    {
      "planId": "plan-456",
      "title": "Jazz Night in Greenwich Village",
      "flags": {
        "isWeekend": false
      }
    }
  ],
  "total": 10,
  "userLimit": 10,
  "hasMore": true,
  "tier": "free"
}
```

#### Response (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City with ID 'invalid-city' not found"
  }
}
```

#### cURL Examples

```bash
# Get all plans for a city
curl "https://us-central1-litplan-prod.cloudfunctions.net/api/cities/new-york/plans" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Get only individual plans
curl "https://us-central1-litplan-prod.cloudfunctions.net/api/cities/new-york/plans?type=individual" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Get only group plans
curl "https://us-central1-litplan-prod.cloudfunctions.net/api/cities/new-york/plans?type=group" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### GET /cities/:cityId/groupFlows

Get group flow experiences for a city (Pro only).

**Authentication**: Required
**Rate Limit**: 200 requests/minute
**Tier Enforcement**: Pro users only

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Number of flows to return (default 10, max 10) |

#### Response (200 OK) - Pro User

```json
{
  "success": true,
  "groupFlows": [
    {
      "groupFlowId": "flow-123",
      "cityId": "new-york",
      "title": "Bachelor Party Weekend",
      "description": "Ultimate bachelor party experience...",
      "activities": [
        {
          "order": 1,
          "venueName": "Rooftop Bar",
          "duration": "2 hours",
          "estimatedCost": 50
        },
        {
          "order": 2,
          "venueName": "VIP Nightclub",
          "duration": "3 hours",
          "estimatedCost": 100
        }
      ],
      "totalDuration": "5-6 hours",
      "estimatedCost": {
        "min": 150,
        "max": 250,
        "currency": "USD"
      },
      "difficulty": "moderate",
      "bestFor": "8-15 people",
      "aiTags": ["Bachelor Party", "VIP", "Nightlife"],
      "createdAt": "2025-01-15T00:00:00.000Z",
      "updatedAt": "2025-01-15T00:00:00.000Z"
    }
  ],
  "total": 10
}
```

#### Response (403 Forbidden) - Free User

```json
{
  "success": false,
  "error": {
    "code": "PRO_FEATURE_REQUIRED",
    "message": "Group flows are available for Pro users only",
    "paywallType": "group_flows"
  }
}
```

#### Response (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City with ID 'invalid-city' not found"
  }
}
```

#### cURL Example

```bash
curl "https://us-central1-litplan-prod.cloudfunctions.net/api/cities/new-york/groupFlows?limit=10" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## Plans Endpoints

### GET /plans/:planId

Get details for a specific plan (tracks plan view limit and weekend access).

**Authentication**: Required
**Rate Limit**: 200 requests/minute
**Tier Enforcement**:
- Free users: 10 plans per city per week, no weekend plans
- Pro users: 50 plans per city per week, includes weekend plans

#### Response (200 OK)

```json
{
  "success": true,
  "plan": {
    "planId": "plan-123",
    "cityId": "new-york",
    "rank": 1,
    "title": "Rooftop Bar Hopping in Manhattan",
    "venueName": "230 Fifth Rooftop",
    "description": "Experience the best rooftop bars in NYC with stunning skyline views...",
    "category": "upscale",
    "type": "individual",
    "images": {
      "hero": "https://storage.googleapis.com/litplan-assets/plans/plan-123/hero.jpg",
      "thumbnail": "https://storage.googleapis.com/litplan-assets/plans/plan-123/thumb.jpg",
      "gallery": [
        "https://storage.googleapis.com/litplan-assets/plans/plan-123/img1.jpg"
      ]
    },
    "location": {
      "address": "230 Fifth Avenue, New York, NY 10001",
      "neighborhood": "Flatiron District",
      "coordinates": {
        "latitude": 40.7433,
        "longitude": -73.9883
      }
    },
    "schedule": {
      "bestTime": "9:00 PM - 2:00 AM",
      "duration": "3-4 hours",
      "daysAvailable": ["Thursday", "Friday", "Saturday"]
    },
    "pricing": {
      "range": "$$$",
      "estimatedCost": 80,
      "currency": "USD",
      "breakdown": "Includes 3-4 cocktails across multiple venues"
    },
    "aiTags": ["Rooftop", "Upscale", "Views", "Cocktails", "Manhattan"],
    "flags": {
      "isWeekend": true,
      "isIndividual": true,
      "isGroup": false,
      "requiresReservation": true,
      "dressCode": "Smart Casual"
    },
    "reviews": {
      "rating": 4.7,
      "count": 1250
    }
  }
}
```

#### Response (403 Forbidden) - Weekend Plan (Free User)

```json
{
  "success": false,
  "error": {
    "code": "WEEKEND_PLAN_PRO_ONLY",
    "message": "Weekend plans are exclusive to Pro members. Upgrade to access premium weekend experiences.",
    "requiresUpgrade": true,
    "plansViewedInCity": 5
  }
}
```

#### Response (403 Forbidden) - Plan Limit Reached

```json
{
  "success": false,
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "You've viewed 10 of your 10 free plans in this city. Upgrade to Pro to see up to 50 plans per city.",
    "requiresUpgrade": true,
    "plansViewedInCity": 10
  }
}
```

#### Response (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "PLAN_NOT_FOUND",
    "message": "Plan not found"
  }
}
```

#### Response (500 Internal Server Error) - Corrupted Data

```json
{
  "success": false,
  "error": {
    "code": "PLAN_DATA_CORRUPTED",
    "message": "Plan data is incomplete. Please try another plan."
  }
}
```

#### cURL Example

```bash
curl https://us-central1-litplan-prod.cloudfunctions.net/api/plans/plan-123 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## Error Codes

### Authentication Errors (401)

| Code | Message | Resolution |
|------|---------|------------|
| `AUTH_FAILED` | User not authenticated | Include valid Firebase ID token in Authorization header |
| `INVALID_TOKEN` | Invalid Firebase token | Refresh Firebase ID token |
| `TOKEN_EXPIRED` | Firebase token expired | Get new Firebase ID token |

### Authorization Errors (403)

| Code | Message | Resolution |
|------|---------|------------|
| `CITY_LIMIT_REACHED` | Free users can explore 1 city per week | Upgrade to Pro or wait until next week |
| `PLAN_LIMIT_REACHED` | Plan view limit reached | Upgrade to Pro for more plans |
| `WEEKEND_PLAN_PRO_ONLY` | Weekend plans require Pro | Upgrade to Pro |
| `PRO_FEATURE_REQUIRED` | Feature requires Pro subscription | Upgrade to Pro |

### Validation Errors (400)

| Code | Message | Resolution |
|------|---------|------------|
| `INVALID_REQUEST` | Missing required fields | Include all required fields in request |
| `INVALID_PRODUCT_ID` | Product ID does not belong to this app | Use correct product ID |
| `SUBSCRIPTION_INVALID` | Receipt validation failed | Provide valid Apple receipt |

### Resource Errors (404)

| Code | Message | Resolution |
|------|---------|------------|
| `USER_NOT_FOUND` | User not found | Ensure user is authenticated |
| `CITY_NOT_FOUND` | City not found | Use valid city ID |
| `PLAN_NOT_FOUND` | Plan not found | Use valid plan ID |

### Rate Limit Errors (429)

| Code | Message | Resolution |
|------|---------|------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before retrying (check `retryAfter` header) |

### Conflict Errors (409)

| Code | Message | Resolution |
|------|---------|------------|
| `DUPLICATE_TRANSACTION` | Transaction already processed | This is likely fraud; contact support |

### Server Errors (500)

| Code | Message | Resolution |
|------|---------|------------|
| `SERVER_ERROR` | Internal server error | Retry request; contact support if persists |
| `PLAN_DATA_CORRUPTED` | Plan data is incomplete | Try another plan; report issue |

### Service Unavailable (503)

| Code | Message | Resolution |
|------|---------|------------|
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | Retry after a few seconds |

---

## Rate Limits

### Rate Limit Configuration

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/subscription/validate` | 10 requests | 1 minute |
| `/subscription/restore` | 10 requests | 1 minute |
| `/subscription/status` | 100 requests | 1 minute |
| `/cities/*` | 200 requests | 1 minute |
| `/plans/*` | 200 requests | 1 minute |
| `/user/*` | 200 requests | 1 minute |
| `/health/*` | 200 requests | 1 minute |

### Rate Limit Response

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642252800
Retry-After: 60
```

### Best Practices

1. **Implement exponential backoff** when receiving 429 responses
2. **Respect the `Retry-After` header** before retrying
3. **Cache responses** where appropriate (city lists, plans)
4. **Batch requests** when possible
5. **Monitor rate limit headers** to avoid hitting limits

---

## Tier Limits

### Free Tier

| Feature | Limit |
|---------|-------|
| Cities per week | 1 unique city |
| Plans per city | 10 plans |
| Weekend access | Not allowed |
| Group plans | Not allowed |
| Saved cities | Not allowed |

### Pro Tier

| Feature | Limit |
|---------|-------|
| Cities per week | Unlimited |
| Plans per city | 50 plans |
| Weekend access | Full access |
| Group plans | Full access |
| Saved cities | Unlimited |

---

## Best Practices

### Error Handling

```swift
func handleAPIError(_ error: Error) {
    if let apiError = error as? APIError {
        switch apiError.code {
        case "CITY_LIMIT_REACHED", "PLAN_LIMIT_REACHED", "WEEKEND_PLAN_PRO_ONLY", "PRO_FEATURE_REQUIRED":
            // Show paywall
            showPaywall()
        case "RATE_LIMIT_EXCEEDED":
            // Wait and retry
            if let retryAfter = apiError.retryAfter {
                retryAfter(seconds: retryAfter)
            }
        case "AUTH_FAILED", "TOKEN_EXPIRED":
            // Refresh token
            refreshFirebaseToken()
        default:
            // Show generic error
            showError(apiError.message)
        }
    }
}
```

### Caching Strategy

```swift
// Cache city list for 1 hour
let citiesCacheDuration: TimeInterval = 3600

// Cache individual city for 24 hours
let cityCacheDuration: TimeInterval = 86400

// Cache plans for 7 days (refreshed weekly)
let plansCacheDuration: TimeInterval = 604800

// Always fetch fresh subscription status
// Do NOT cache subscription status
```

### Pagination

Currently, the API does not support pagination. Limits are enforced based on user tier:
- Free users: Automatically limited to 10 plans per city
- Pro users: Automatically limited to 50 plans per city

Future versions may add `offset` and `limit` query parameters.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-28 | Initial API release |

---

## Support

For API questions or issues:
- **Email**: support@litplan.app
- **Documentation**: https://docs.litplan.app
- **Status Page**: https://status.litplan.app

---

**End of API Reference**

For additional details, see:
- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)
- [Error Handling Guide](ERROR_HANDLING.md)
- [Security Checklist](SECURITY_CHECKLIST.md)
