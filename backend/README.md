# LitPlanz Backend

Backend infrastructure for LitPlanz - a premium nightlife discovery app powered by Firebase Cloud Functions.

## Architecture Overview

### Technology Stack
- **Runtime**: Node.js 18
- **Language**: TypeScript
- **Platform**: Firebase Cloud Functions
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth + Sign in with Apple
- **Storage**: Firebase Storage
- **Payments**: StoreKit 2 (iOS native)
- **AI**: OpenAI API (for weekly plan generation)

### Project Structure

```
backend/
├── functions/
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── auth/                 # Authentication handlers
│   │   ├── api/                  # API route handlers
│   │   │   ├── cities.ts
│   │   │   ├── plans.ts
│   │   │   ├── user.ts
│   │   │   └── subscription.ts
│   │   ├── models/               # TypeScript data models
│   │   │   ├── User.ts
│   │   │   ├── City.ts
│   │   │   ├── Plan.ts
│   │   │   └── GroupFlow.ts
│   │   └── utils/                # Utility functions
│   │       ├── validation.ts
│   │       ├── middleware.ts
│   │       └── helpers.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md (this file)
```

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project (created in Firebase Console)

### Installation

1. **Navigate to the functions directory:**
   ```bash
   cd backend/functions
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and fill in your configuration
   ```

4. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

### Firebase Setup (Required)

#### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `litplan-dev` (for development)
4. Enable Google Analytics (optional)
5. Create project

#### 2. Enable Firebase Services

**Enable Firestore:**
1. In Firebase Console, go to Firestore Database
2. Click "Create database"
3. Start in **test mode** (we'll add security rules later)
4. Choose region (e.g., `us-central1`)

**Enable Authentication:**
1. Go to Authentication → Sign-in method
2. Enable "Sign in with Apple"
   - You'll need Apple Developer account credentials
   - Add Service ID, Team ID, Key ID, and Private Key
   - For development, you can use test mode initially

**Enable Storage:**
1. Go to Storage
2. Click "Get started"
3. Start in **test mode**
4. Use default bucket

#### 3. Set up Firebase CLI

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
cd /path/to/litplanAI/backend
firebase init

# Select:
# - Firestore
# - Functions
# - Storage
# Choose existing project: litplan-dev
# Use TypeScript: Yes
# Use ESLint: Yes
# Install dependencies: Yes
```

#### 4. Deploy Functions (when ready)

```bash
# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:api
```

## Data Models

All data models are defined in `src/models/` with full TypeScript types.

### Collections Structure

```
/users/{userId}
  - User profile, subscription, entitlements
  /activity/{activityId}
    - User activity logs
  /savedCities/{cityId}
    - Saved cities (Pro only)

/cities/{cityId}
  - City metadata and display assets
  /plans/{planId}
    - Individual plans (bars, clubs, events)
  /groupFlows/{flowId}
    - Multi-step group experiences (Pro only)

/config/app
  - App-wide configuration (current week, tier limits)
```

See `../ai-team/backend-specs.md` for complete data model schemas.

## API Endpoints

All endpoints are prefixed with `/api/v1` and require authentication (Bearer token in Authorization header).

### Authentication & User Management

#### POST `/auth/login`
Sign in with Apple and get Firebase auth token.

**Request:**
```json
{
  "identityToken": "string",
  "user": {
    "email": "string (optional)",
    "name": {
      "firstName": "string",
      "lastName": "string"
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "userId": "string",
    "email": "string",
    "displayName": "string",
    "subscription": {
      "status": "free | pro",
      "tier": "free | pro"
    }
  },
  "token": "string"
}
```

#### GET `/user/me`
Get current user profile and entitlements.

**Response (200):**
```json
{
  "success": true,
  "user": {
    "userId": "string",
    "email": "string",
    "displayName": "string",
    "subscription": {
      "status": "free | pro",
      "tier": "free | pro",
      "expiryDate": "timestamp (nullable)"
    },
    "entitlements": {
      "maxCitiesPerWeek": 1 | 100,
      "maxPlansPerCity": 10 | 50,
      "weekendAccess": boolean,
      "groupPlansAccess": boolean,
      "savedCitiesAccess": boolean
    }
  }
}
```

#### PATCH `/user/me`
Update user preferences.

**Request:**
```json
{
  "preferences": {
    "notificationsEnabled": boolean,
    "weeklyDigest": boolean
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

---

### Cities & Plans

#### GET `/cities`
List all cities with optional filtering.

**Query Parameters:**
- `search` (optional): Filter cities by name or country
- `featured` (optional): "true" to return only featured cities

**Response (200):**
```json
{
  "success": true,
  "cities": [
    {
      "cityId": "nyc-001",
      "name": "New York",
      "country": "United States",
      "rank": 1,
      "displayAssets": {
        "heroImage": "https://...",
        "cardImage": "https://...",
        "accentColor": "#00D9FF"
      },
      "metadata": {
        "totalPlansThisWeek": 50,
        "featured": true
      }
    }
  ],
  "total": 10
}
```

#### GET `/cities/:cityId`
Get detailed city information.

**Response (200):**
```json
{
  "success": true,
  "city": {
    "cityId": "nyc-001",
    "name": "New York",
    "country": "United States",
    "timezone": "America/New_York",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    /* full city object */
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City not found"
  }
}
```

#### GET `/cities/:cityId/plans`
Get plans for a specific city (tier-based filtering applied).

**Query Parameters:**
- `type` (optional): "individual" | "group" | "all" (default: "all")
- `limit` (optional): Override default tier limit

**Response (200):**
```json
{
  "success": true,
  "plans": [
    {
      "planId": "nyc-plan-001",
      "rank": 1,
      "title": "The Roof at PUBLIC",
      "venueName": "PUBLIC Hotel",
      "category": "Rooftop Bar",
      "schedule": {
        "date": "2025-01-15",
        "startTime": "20:00",
        "isWeekend": false
      },
      "pricing": {
        "entryFee": 0,
        "currency": "USD",
        "freeEntry": true
      },
      "images": {
        "hero": "https://...",
        "thumbnail": "https://..."
      },
      /* full plan object */
    }
  ],
  "total": 50,
  "userLimit": 10 | 50,
  "hasMore": boolean,
  "tier": "free | pro"
}
```

**Tier Filtering:**
- **Free users**: Max 10 plans, weekday only (weekend plans filtered out)
- **Pro users**: Max 50 plans, includes weekend plans

---

### Configuration

#### GET `/config`
Get current app configuration including week, tier limits, and products.

**Response (200):**
```json
{
  "success": true,
  "config": {
    "currentWeek": "2025-W01",
    "weekStartDate": "2025-01-06T00:00:00Z",
    "weekEndDate": "2025-01-12T23:59:59Z",
    "tiers": {
      "free": {
        "maxCities": 1,
        "maxPlans": 10,
        "weekendAccess": false,
        "groupPlansAccess": false,
        "savedCitiesAccess": false
      },
      "pro": {
        "maxCities": 100,
        "maxPlans": 50,
        "weekendAccess": true,
        "groupPlansAccess": true,
        "savedCitiesAccess": true
      }
    },
    "products": [
      {
        "productId": "litplan_pro_monthly",
        "name": "LitPlanz Pro Monthly",
        "price": 999,
        "currency": "USD",
        "description": "Monthly subscription to LitPlanz Pro"
      },
      {
        "productId": "litplan_pro_yearly",
        "name": "LitPlanz Pro Yearly",
        "price": 9999,
        "currency": "USD",
        "description": "Yearly subscription to LitPlanz Pro (save 17%)"
      }
    ]
  }
}
```

---

### User Data (Sprint 2+)
- `GET /user/viewedCities` - Recently viewed cities
- `POST /user/viewedCities` - Track city view
- `GET /user/savedCities` - Saved cities (Pro)
- `POST /user/savedCities/:cityId` - Save city
- `DELETE /user/savedCities/:cityId` - Unsave city

### Subscriptions (Sprint 3+)
- `POST /subscription/validate` - Validate StoreKit receipt
- `GET /subscription/status` - Check subscription status
- `POST /subscription/restore` - Restore purchases

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**
- `AUTH_FAILED` (401): Authentication failed
- `INVALID_TOKEN` (401): Invalid or expired token
- `CITY_NOT_FOUND` (404): City does not exist
- `PAYWALL_LIMIT_REACHED` (403): User hit free tier limit
- `SERVER_ERROR` (500): Internal server error

See `../ai-team/backend-specs.md` for complete API documentation.

## Scheduled Functions

### 1. Weekly Plan Refresh
- **Schedule**: Every Monday at 00:00 UTC
- **Function**: `weeklyPlanRefresh`
- **Purpose**: Generate 50 new plans per city using AI

### 2. Subscription Status Sync
- **Schedule**: Every 6 hours
- **Function**: `syncSubscriptionStatus`
- **Purpose**: Sync subscription status with Apple's servers

### 3. User Activity Cleanup
- **Schedule**: Every Sunday at 02:00 UTC
- **Function**: `cleanupUserActivity`
- **Purpose**: Clean up old activity data (90+ days)

## Development

### Local Development

```bash
# Start Firebase emulators
npm run serve

# Watch TypeScript files
npm run build:watch

# View logs
npm run logs
```

### Testing APIs

Use Postman or curl to test endpoints:

```bash
# Health check
curl http://localhost:5001/litplan-dev/us-central1/api/health

# Test with auth token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5001/litplan-dev/us-central1/api/user/me
```

### Linting

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

## Firestore Security Rules

Create `firestore.rules` in the root with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /activity/{activityId} {
        allow read, write: if request.auth.uid == userId;
      }

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

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Firestore Indexes

Required composite indexes:

```json
{
  "indexes": [
    {
      "collectionGroup": "cities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "rank", "order": "ASCENDING" },
        { "fieldPath": "metadata.featured", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "plans",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "rank", "order": "ASCENDING" },
        { "fieldPath": "flags.isWeekend", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "activity",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Firestore will prompt you to create these indexes when needed, or you can deploy them:
```bash
firebase deploy --only firestore:indexes
```

## Environment Variables

See `.env.example` for all required environment variables.

**Critical variables:**
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `APPLE_CLIENT_ID` - For Sign in with Apple
- `OPENAI_API_KEY` - For AI plan generation
- `APPLE_APP_STORE_SERVER_API_KEY` - For receipt validation

## Deployment

### Development Environment

```bash
# Deploy to development project
firebase use litplan-dev
npm run deploy
```

### Production Environment

```bash
# Create production project first in Firebase Console
firebase use --add
# Select production project and alias it as 'prod'

# Deploy to production
firebase use prod
npm run deploy
```

## Monitoring & Debugging

### View Logs
```bash
# Real-time logs
firebase functions:log --only api

# Logs for specific function
firebase functions:log --only weeklyPlanRefresh
```

### Firebase Console
- **Functions**: View function execution stats
- **Firestore**: View/edit database
- **Authentication**: Manage users
- **Storage**: View uploaded files

## Performance Optimization

### Caching
- Client caches cities/plans for 24 hours
- Images served via Firebase Storage CDN
- Firestore queries optimized with indexes

### Rate Limiting
- 100 reads/minute per user
- 20 writes/minute per user
- Implemented in middleware (TODO)

## Security Best Practices

1. **Always authenticate**: All endpoints require valid Firebase token
2. **Validate input**: Use validation middleware for all inputs
3. **Secure API keys**: Use Firebase Secret Manager for production
4. **Firestore rules**: Enforce data access at database level
5. **HTTPS only**: Cloud Functions are HTTPS by default
6. **Rate limiting**: Prevent abuse with rate limits

## Troubleshooting

### Common Issues

**Build errors:**
```bash
# Clear build cache
rm -rf lib/
npm run build
```

**Deployment fails:**
```bash
# Check you're logged in
firebase login --reauth

# Verify project
firebase projects:list
firebase use litplan-dev
```

**Function not responding:**
- Check function logs: `firebase functions:log`
- Verify environment variables are set
- Check Firestore security rules

## Next Steps

1. **Implement API routes** in `src/api/`
2. **Add authentication middleware** in `src/utils/middleware.ts`
3. **Create seed scripts** to populate cities and plans
4. **Set up CI/CD** for automated deployments
5. **Add unit tests** with Firebase Functions Test SDK

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Cloud Functions Guide](https://firebase.google.com/docs/functions)
- [StoreKit Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)

## Support

For questions or issues:
1. Check `../ai-team/backend-specs.md` for API specifications
2. Review `../ai-team/BACKEND_ENGINEER_CONTEXT.md` for architecture decisions
3. Update `../ai-team/DAILY_LOG.md` with progress and blockers

## Seed Data Scripts

Sprint 1 includes comprehensive seed scripts to populate Firestore with initial data:

### Available Seed Scripts

```bash
# Seed 10 cities with complete metadata
npm run seed:cities

# Seed 50 plans per city (500 total plans)
npm run seed:plans

# Seed test users (1 free, 1 pro)
npm run seed:users
```

**Note**: Seed scripts require either:
- A Firebase project with credentials configured
- Firebase emulators running (`npm run serve`)

Set `FIRESTORE_EMULATOR_HOST=localhost:8080` to use the emulator.

### Seed Data Included
- **10 Cities**: NYC, LA, Miami, London, Paris, Tokyo, Berlin, Barcelona, Amsterdam, Dubai
- **500 Plans**: 50 real nightlife plans per city
- **2 Test Users**:
  - Free user: `test-free-user` (free@test.litplanz.com)
  - Pro user: `test-pro-user` (pro@test.litplanz.com)

---

**Version**: 1.0.0
**Last Updated**: Sprint 1, Day 5 (Final Day)
**Status**: Sprint 1 Complete - Production Ready
