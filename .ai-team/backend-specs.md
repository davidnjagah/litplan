# Litplan - Backend Specifications & API Contracts

## Architecture Overview

### Technology Stack
- **Backend**: Firebase (Firestore + Cloud Functions) OR Node.js/Express with Firestore
- **Database**: Cloud Firestore (NoSQL, real-time, scalable)
- **Authentication**: Sign in with Apple / iCloud (CloudKit integration)
- **Payments**: StoreKit 2 (iOS native, server-side validation)
- **Storage**: Firebase Storage or Cloud Storage for images
- **AI Jobs**: Cloud Functions scheduled jobs (weekly data refresh)
- **Hosting**: Firebase Hosting or Cloud Run

### Why This Stack
- **Low overhead**: Managed services, minimal DevOps
- **Scalable**: Handles growth without infrastructure changes
- **Cost-effective**: Pay-as-you-go, free tier covers early usage
- **Real-time**: Firestore supports live updates (future chat, notifications)
- **iOS-first**: StoreKit 2 is native, simple integration

---

## Data Models

### 1. Users Collection
**Path**: `/users/{userId}`

```json
{
  "userId": "string (iCloud ID or UUID)",
  "email": "string (optional from iCloud)",
  "displayName": "string (optional from iCloud)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",

  "subscription": {
    "status": "free | pro | trial",
    "tier": "free | pro",
    "startDate": "timestamp (nullable)",
    "expiryDate": "timestamp (nullable)",
    "autoRenew": "boolean",
    "transactionId": "string (StoreKit transaction ID)",
    "productId": "string (e.g., 'litplan_pro_monthly')"
  },

  "entitlements": {
    "maxCitiesPerWeek": "number (1 for free, 100 for pro)",
    "maxPlansPerCity": "number (10 for free, 50 for pro)",
    "weekendAccess": "boolean (false for free, true for pro)",
    "groupPlansAccess": "boolean (false for free, true for pro)",
    "savedCitiesAccess": "boolean (false for free, true for pro)"
  },

  "preferences": {
    "notificationsEnabled": "boolean",
    "weeklyDigest": "boolean"
  }
}
```

### 2. Cities Collection
**Path**: `/cities/{cityId}`

```json
{
  "cityId": "string (e.g., 'nyc-001')",
  "name": "string (e.g., 'New York')",
  "country": "string (e.g., 'United States')",
  "countryCode": "string (e.g., 'US')",
  "rank": "number (1-100, for ordering)",
  "timezone": "string (e.g., 'America/New_York')",

  "displayAssets": {
    "heroImage": "string (URL to city hero image)",
    "cardImage": "string (URL to card thumbnail)",
    "accentColor": "string (hex color for city theme, e.g., '#00D9FF')"
  },

  "metadata": {
    "totalPlansThisWeek": "number",
    "lastUpdated": "timestamp (when plans were refreshed)",
    "featured": "boolean (for trending/featured sections)"
  },

  "coordinates": {
    "latitude": "number",
    "longitude": "number"
  }
}
```

### 3. Plans Collection (Subcollection under Cities)
**Path**: `/cities/{cityId}/plans/{planId}`

```json
{
  "planId": "string (e.g., 'nyc-plan-001')",
  "cityId": "string (parent city reference)",
  "rank": "number (1-50, ordering within city)",

  "title": "string (e.g., 'The Roof at PUBLIC')",
  "venueName": "string (e.g., 'PUBLIC Hotel')",
  "description": "string (short description)",

  "category": "string (e.g., 'Rooftop Bar', 'Live Music', 'Nightclub')",
  "type": "string (e.g., 'bar', 'club', 'event', 'restaurant')",

  "images": {
    "hero": "string (URL to main image)",
    "thumbnail": "string (URL to card thumbnail)",
    "gallery": ["array of image URLs"]
  },

  "location": {
    "address": "string",
    "neighborhood": "string (e.g., 'Lower East Side')",
    "googleMapsUrl": "string (deep link)",
    "coordinates": {
      "latitude": "number",
      "longitude": "number"
    }
  },

  "schedule": {
    "date": "timestamp or string (e.g., '2025-01-15')",
    "startTime": "string (e.g., '20:00')",
    "endTime": "string (nullable)",
    "isWeekend": "boolean",
    "weekday": "string (e.g., 'Friday')"
  },

  "pricing": {
    "entryFee": "number (nullable, in cents)",
    "currency": "string (e.g., 'USD')",
    "priceRange": "string (e.g., '$$', '$$$')",
    "freeEntry": "boolean"
  },

  "aiTags": {
    "genre": ["array of strings, e.g., 'Electronic', 'House'"],
    "vibe": ["array of strings, e.g., 'Upbeat', 'Chill', 'Exclusive'"],
    "eventType": "string (e.g., 'DJ Night', 'Live Band', 'Open Mic')"
  },

  "flags": {
    "isIndividual": "boolean (true if suitable for solo/small groups)",
    "isGroup": "boolean (true if part of group flow)",
    "isWeekend": "boolean",
    "isFeatured": "boolean"
  },

  "reviews": {
    "averageRating": "number (1-5)",
    "totalReviews": "number",
    "source": "string (e.g., 'Google', 'Yelp')"
  },

  "metadata": {
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "source": "string (e.g., 'AI-generated', 'Manual')"
  }
}
```

### 4. Group Flows Collection (Subcollection under Cities)
**Path**: `/cities/{cityId}/groupFlows/{flowId}`

```json
{
  "flowId": "string (e.g., 'nyc-flow-001')",
  "cityId": "string",
  "rank": "number (ordering)",

  "title": "string (e.g., 'Ultimate NYC Night Out')",
  "description": "string (e.g., 'Pre-game → Brooklyn Nets Game → Rooftop After-Party')",

  "duration": {
    "totalHours": "number (e.g., 5)",
    "startTime": "string (e.g., '18:00')",
    "endTime": "string (e.g., '23:00')"
  },

  "steps": [
    {
      "stepNumber": "number (1, 2, 3)",
      "planId": "string (reference to plan in plans collection)",
      "title": "string (e.g., 'Pre-Game Drinks')",
      "venueName": "string",
      "duration": "number (minutes)",
      "thumbnail": "string (URL)"
    }
  ],

  "pricing": {
    "totalEstimate": "number (in cents)",
    "currency": "string"
  },

  "flags": {
    "isWeekend": "boolean",
    "proOnly": "boolean (true)"
  },

  "metadata": {
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "aiGenerated": "boolean"
  }
}
```

### 5. User Activity Collection (Subcollection under Users)
**Path**: `/users/{userId}/activity/{activityId}`

```json
{
  "activityId": "string",
  "userId": "string",

  "type": "string (e.g., 'viewed_city', 'viewed_plan', 'saved_city')",

  "cityId": "string (nullable)",
  "planId": "string (nullable)",

  "timestamp": "timestamp",

  "metadata": {
    "source": "string (e.g., 'explore_tab', 'search')",
    "sessionId": "string (for analytics)"
  }
}
```

### 6. Saved Cities Collection (Subcollection under Users - Pro Only)
**Path**: `/users/{userId}/savedCities/{cityId}`

```json
{
  "cityId": "string",
  "savedAt": "timestamp",
  "notes": "string (optional, for future feature)"
}
```

### 7. App Configuration (Global)
**Path**: `/config/app`

```json
{
  "currentWeek": "string (e.g., '2025-W03' for week 3 of 2025)",
  "weekStartDate": "timestamp",
  "weekEndDate": "timestamp",

  "freeTier": {
    "maxCities": 1,
    "maxPlans": 10,
    "weekendAccess": false
  },

  "proTier": {
    "maxCities": 100,
    "maxPlans": 50,
    "weekendAccess": true
  },

  "products": {
    "pro_monthly": {
      "productId": "litplan_pro_monthly",
      "price": 999,
      "currency": "USD"
    },
    "pro_yearly": {
      "productId": "litplan_pro_yearly",
      "price": 9999,
      "currency": "USD"
    }
  }
}
```

---

## API Endpoints

### Base URL
- **Development**: `https://litplan-dev.firebaseapp.com/api/v1`
- **Production**: `https://api.litplan.app/v1`

### Authentication
All requests include `Authorization: Bearer <iCloudToken>` or custom Firebase auth token.

---

### 1. Authentication & User Management

#### POST `/auth/login`
**Description**: Authenticate user with iCloud/Sign in with Apple

**Request Body**:
```json
{
  "identityToken": "string (from Sign in with Apple)",
  "authorizationCode": "string",
  "user": {
    "email": "string (optional)",
    "name": {
      "firstName": "string",
      "lastName": "string"
    }
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "user": {
    "userId": "string",
    "email": "string",
    "displayName": "string",
    "subscription": {
      "status": "free | pro | trial",
      "tier": "free | pro"
    }
  },
  "token": "string (custom Firebase token for subsequent requests)"
}
```

#### GET `/user/me`
**Description**: Get current user profile and subscription status

**Response** (200):
```json
{
  "success": true,
  "user": {
    "userId": "string",
    "email": "string",
    "displayName": "string",
    "subscription": { /* full subscription object */ },
    "entitlements": { /* full entitlements */ }
  }
}
```

#### PATCH `/user/me`
**Description**: Update user preferences

**Request Body**:
```json
{
  "preferences": {
    "notificationsEnabled": true,
    "weeklyDigest": false
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

---

### 2. Cities

#### GET `/cities`
**Description**: Get list of all available cities (top 100)

**Query Parameters**:
- `search` (optional): Search query string
- `limit` (optional): Number of results (default 100)
- `featured` (optional): Boolean, return only featured cities

**Response** (200):
```json
{
  "success": true,
  "cities": [
    {
      "cityId": "string",
      "name": "string",
      "country": "string",
      "rank": "number",
      "displayAssets": { /* assets */ },
      "metadata": {
        "totalPlansThisWeek": "number",
        "featured": "boolean"
      }
    }
  ],
  "total": "number"
}
```

#### GET `/cities/:cityId`
**Description**: Get detailed city information

**Response** (200):
```json
{
  "success": true,
  "city": {
    "cityId": "string",
    "name": "string",
    "country": "string",
    /* full city object */
  }
}
```

---

### 3. Plans

#### GET `/cities/:cityId/plans`
**Description**: Get plans for a specific city

**Query Parameters**:
- `type` (optional): "individual" | "group" | "all" (default "all")
- `weekend` (optional): Boolean, filter weekend plans
- `limit` (optional): Number of plans (default respects user tier: 10 or 50)

**Response** (200):
```json
{
  "success": true,
  "plans": [
    {
      "planId": "string",
      "rank": "number",
      "title": "string",
      "venueName": "string",
      /* full plan object */
    }
  ],
  "total": "number",
  "userLimit": "number (10 or 50 based on subscription)",
  "hasMore": "boolean (true if more plans available for pro users)"
}
```

**Error Response** (403) - Paywall Trigger:
```json
{
  "success": false,
  "error": {
    "code": "PAYWALL_LIMIT_REACHED",
    "message": "Upgrade to Pro to access more plans",
    "paywallType": "plan_limit | weekend_access | city_limit"
  }
}
```

#### GET `/cities/:cityId/plans/:planId`
**Description**: Get detailed plan information

**Response** (200):
```json
{
  "success": true,
  "plan": { /* full plan object */ }
}
```

---

### 4. Group Flows

#### GET `/cities/:cityId/groupFlows`
**Description**: Get group flow experiences for a city (Pro only)

**Query Parameters**:
- `limit` (optional): Number of flows (default 10)

**Response** (200):
```json
{
  "success": true,
  "groupFlows": [
    {
      "flowId": "string",
      "title": "string",
      "description": "string",
      "steps": [ /* array of steps */ ],
      "duration": { /* duration object */ }
    }
  ]
}
```

**Error Response** (403) - Free User:
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

---

### 5. User Activity & History

#### GET `/user/viewedCities`
**Description**: Get user's recently viewed cities

**Query Parameters**:
- `limit` (optional): Number of cities (default 20)

**Response** (200):
```json
{
  "success": true,
  "viewedCities": [
    {
      "cityId": "string",
      "name": "string",
      "viewedAt": "timestamp",
      "displayAssets": { /* assets */ }
    }
  ]
}
```

#### POST `/user/viewedCities`
**Description**: Track that user viewed a city

**Request Body**:
```json
{
  "cityId": "string",
  "source": "string (e.g., 'explore_tab', 'search')"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "City view recorded"
}
```

#### GET `/user/savedCities`
**Description**: Get user's saved cities (Pro only)

**Response** (200):
```json
{
  "success": true,
  "savedCities": [
    {
      "cityId": "string",
      "name": "string",
      "savedAt": "timestamp",
      "displayAssets": { /* assets */ }
    }
  ]
}
```

#### POST `/user/savedCities/:cityId`
**Description**: Save a city to favorites (Pro only)

**Response** (200):
```json
{
  "success": true,
  "message": "City saved successfully"
}
```

**Error Response** (403):
```json
{
  "success": false,
  "error": {
    "code": "PRO_FEATURE_REQUIRED",
    "message": "Saving cities is a Pro feature",
    "paywallType": "saved_cities"
  }
}
```

#### DELETE `/user/savedCities/:cityId`
**Description**: Remove city from saved list

**Response** (200):
```json
{
  "success": true,
  "message": "City removed from saved list"
}
```

---

### 6. Subscription & Payments

#### POST `/subscription/validate`
**Description**: Validate StoreKit 2 transaction and update user subscription

**Request Body**:
```json
{
  "transactionId": "string (from StoreKit)",
  "productId": "string (e.g., 'litplan_pro_monthly')",
  "receiptData": "string (base64 encoded receipt)"
}
```

**Response** (200):
```json
{
  "success": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "timestamp",
    "autoRenew": "boolean"
  },
  "entitlements": { /* updated entitlements */ }
}
```

#### GET `/subscription/status`
**Description**: Check current subscription status (calls Apple's server)

**Response** (200):
```json
{
  "success": true,
  "subscription": {
    "status": "active | expired | cancelled | trial",
    "tier": "free | pro",
    "expiryDate": "timestamp",
    "autoRenew": "boolean"
  }
}
```

#### POST `/subscription/restore`
**Description**: Restore previous purchases

**Response** (200):
```json
{
  "success": true,
  "restored": "boolean",
  "subscription": { /* subscription object if found */ }
}
```

---

### 7. App Configuration

#### GET `/config`
**Description**: Get current app configuration (current week, tier limits, etc.)

**Response** (200):
```json
{
  "success": true,
  "config": {
    "currentWeek": "string",
    "weekStartDate": "timestamp",
    "weekEndDate": "timestamp",
    "tiers": {
      "free": { /* free tier config */ },
      "pro": { /* pro tier config */ }
    },
    "products": [ /* array of available products */ ]
  }
}
```

---

## Cloud Functions (Scheduled Jobs)

### 1. Weekly Plan Refresh
**Function**: `weeklyPlanRefresh`
**Schedule**: Every Monday at 00:00 UTC
**Description**: AI job that generates new plans for all 100 cities

**Process**:
1. Increment current week in `/config/app`
2. For each city in `/cities`:
   - Call AI service to generate 50 new plans
   - Store in `/cities/{cityId}/plans/` collection
   - Generate 10 group flows, store in `/cities/{cityId}/groupFlows/`
   - Update `city.metadata.lastUpdated`
3. Archive previous week's plans (optional, for analytics)
4. Send push notification to Pro users: "New plans available for this week!"

**AI Prompt Template**:
```
Generate 50 nightlife and social plans for {cityName}, {country} for the week of {weekStart}.
Include: bars, clubs, live music, events, restaurants, rooftop venues, comedy shows.
Provide: title, venue, date, time, category, price, description, and suggested vibes/tags.
Format as JSON array.
```

### 2. Subscription Status Sync
**Function**: `syncSubscriptionStatus`
**Schedule**: Every 6 hours
**Description**: Sync subscription status with Apple's servers for all Pro users

**Process**:
1. Query all users with `subscription.status === 'pro'`
2. For each user, call Apple's server to verify receipt
3. Update `subscription.status` if expired or cancelled
4. Downgrade entitlements if subscription lapsed

### 3. User Activity Cleanup
**Function**: `cleanupUserActivity`
**Schedule**: Every Sunday at 02:00 UTC
**Description**: Clean up old activity data to reduce storage costs

**Process**:
1. Delete activity records older than 90 days
2. For free users, keep only current week's viewed cities

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional context */ }
  }
}
```

### Error Codes
- `AUTH_FAILED`: Authentication failed
- `INVALID_TOKEN`: Invalid or expired token
- `USER_NOT_FOUND`: User does not exist
- `CITY_NOT_FOUND`: City does not exist
- `PLAN_NOT_FOUND`: Plan does not exist
- `PAYWALL_LIMIT_REACHED`: User hit free tier limit
- `PRO_FEATURE_REQUIRED`: Feature requires Pro subscription
- `SUBSCRIPTION_INVALID`: Subscription validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

---

## Security & Privacy

### Data Access Rules (Firestore Security Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // User activity subcollection
      match /activity/{activityId} {
        allow read, write: if request.auth.uid == userId;
      }

      // Saved cities (Pro only, enforced in function)
      match /savedCities/{cityId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId
                     && get(/databases/$(database)/documents/users/$(userId)).data.subscription.tier == 'pro';
      }
    }

    // Cities and plans are read-only for clients
    match /cities/{cityId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write

      match /plans/{planId} {
        allow read: if request.auth != null;
        allow write: if false;
      }

      match /groupFlows/{flowId} {
        allow read: if request.auth != null;
        allow write: if false;
      }
    }

    // Config is read-only for clients
    match /config/{doc} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

### Privacy Considerations
- No personal data stored beyond email and name (from iCloud)
- User activity is anonymous (no PII in activity logs)
- Subscription status encrypted in transit
- GDPR compliance: Users can request data deletion via profile settings

---

## Performance Optimization

### Caching Strategy
- **Client-side**: Cache cities and plans for 24 hours (refresh weekly)
- **CDN**: Serve images via Firebase Storage with CDN caching
- **Firestore Indexes**: Create composite indexes for common queries

### Required Firestore Indexes
```
Collection: cities
Fields: rank ASC, metadata.featured DESC

Collection: cities/{cityId}/plans
Fields: rank ASC, flags.isWeekend ASC

Collection: users/{userId}/activity
Fields: timestamp DESC, type ASC
```

### Rate Limiting
- 100 requests per minute per user for read operations
- 20 requests per minute for write operations
- Enforced via Cloud Functions middleware

---

## Testing & Monitoring

### Health Check Endpoint
#### GET `/health`
**Response** (200):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "timestamp"
}
```

### Monitoring Metrics
- API response times (target: p95 < 300ms)
- Error rates (target: < 0.1%)
- Active users count
- Subscription conversion rate
- Weekly plan refresh success rate

---

## Mock Data Requirements

For development and testing, provide:
- **10 cities** with full metadata and images
- **50 plans per city** (500 total)
- **10 group flows per city** (100 total)
- **Sample user accounts**: 1 free user, 1 pro user

Mock data sources:
- City images: Unsplash, Pexels (high-quality nightlife photos)
- Venue data: Scrape from Google Places, Yelp, or manual curation

---

## API Versioning

- Current version: `v1`
- Breaking changes require new version (`v2`)
- Deprecated endpoints supported for 6 months with warnings

---

## Next Steps for Backend Engineer

1. Set up Firebase project (dev and prod environments)
2. Implement Firestore data models
3. Create Cloud Functions for API endpoints
4. Implement StoreKit 2 server-side validation
5. Set up weekly AI job for plan generation
6. Create seed script for mock data (10 cities × 50 plans)
7. Write integration tests for all endpoints
8. Deploy to Firebase and test with iOS app

---

**Last Updated**: Sprint Day 1
**Owner**: Backend Engineer Agent
**Status**: Specifications Complete - Ready for Implementation
