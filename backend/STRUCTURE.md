# Backend Structure Reference

## Directory Tree

```
backend/
├── README.md                          # Comprehensive setup and usage guide
├── FIREBASE_SETUP.md                  # Step-by-step Firebase configuration
├── DAY1_SUMMARY.md                    # Day 1 completion report
├── STRUCTURE.md                       # This file
└── functions/                         # Cloud Functions directory
    ├── package.json                   # Node.js dependencies
    ├── tsconfig.json                  # TypeScript configuration
    ├── .env.example                   # Environment variables template
    ├── .gitignore                     # Git ignore rules
    ├── .eslintrc.js                   # ESLint configuration
    └── src/                           # Source code
        ├── index.ts                   # Main entry point (exports Cloud Functions)
        ├── auth/                      # Authentication module
        │   └── index.ts              # Sign in with Apple handlers
        ├── models/                    # TypeScript data models
        │   ├── index.ts              # Models export
        │   ├── User.ts               # User, Subscription, Entitlements
        │   ├── City.ts               # City with display assets
        │   ├── Plan.ts               # Individual plans
        │   └── GroupFlow.ts          # Multi-step group flows
        ├── api/                       # API route handlers (to be implemented)
        │   └── README.md             # API implementation guide
        └── utils/                     # Utility functions
            ├── index.ts              # Utils export
            ├── validation.ts         # Input validation functions
            ├── middleware.ts         # Express middleware (auth, rate limit)
            └── helpers.ts            # Helper functions (dates, entitlements)
```

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main entry point, exports Cloud Functions |
| `src/models/User.ts` | User data model with tier entitlements |
| `src/models/City.ts` | City metadata and display assets |
| `src/models/Plan.ts` | Individual nightlife plans |
| `src/models/GroupFlow.ts` | Multi-step group experiences |
| `src/utils/middleware.ts` | Authentication & rate limiting |
| `src/utils/helpers.ts` | Entitlements, dates, responses |
| `src/utils/validation.ts` | Input validation utilities |
| `src/auth/index.ts` | Sign in with Apple handler |

### Key Interfaces

| Interface | Location | Description |
|-----------|----------|-------------|
| `User` | models/User.ts | User profile with subscription |
| `UserEntitlements` | models/User.ts | Tier-based access limits |
| `City` | models/City.ts | City with hero image & metadata |
| `Plan` | models/Plan.ts | Individual plan with venue details |
| `GroupFlow` | models/GroupFlow.ts | Multi-step flow with pricing |

### Tier Entitlements

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Cities per week | 1 | 100 |
| Plans per city | 10 | 50 |
| Weekend access | ❌ | ✅ |
| Group flows | ❌ | ✅ |
| Saved cities | ❌ | ✅ |

### Cloud Functions

| Function | Schedule | Purpose |
|----------|----------|---------|
| `api` | HTTP | Main API endpoint |
| `weeklyPlanRefresh` | Mon 00:00 UTC | Generate new plans |
| `syncSubscriptionStatus` | Every 6 hours | Sync with Apple |
| `cleanupUserActivity` | Sun 02:00 UTC | Clean old data |

### Middleware Pipeline

```
Request
  ↓
authenticate() - Verify Firebase token
  ↓
rateLimit() - Check rate limits
  ↓
validateBody() - Validate required fields
  ↓
Route Handler
  ↓
errorHandler() - Catch errors
  ↓
Response
```

### Response Format

**Success:**
```typescript
{
  success: true,
  data: { /* response data */ }
}
```

**Error:**
```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details: { /* optional */ }
  }
}
```

### Common Error Codes

- `AUTH_FAILED` - Authentication failed
- `INVALID_TOKEN` - Invalid/expired token
- `PAYWALL_LIMIT_REACHED` - Free tier limit hit
- `PRO_FEATURE_REQUIRED` - Pro subscription needed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVER_ERROR` - Internal error

### Environment Variables

See `.env.example` for complete list:

- `FIREBASE_PROJECT_ID` - Firebase project
- `APPLE_CLIENT_ID` - Sign in with Apple
- `OPENAI_API_KEY` - AI plan generation
- `APPLE_APP_STORE_SERVER_API_KEY` - Receipt validation

### Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run build:watch

# Start emulators
npm run serve

# Deploy to Firebase
npm run deploy

# View logs
npm run logs
```

### Testing

```bash
# Health check
curl http://localhost:5001/PROJECT_ID/us-central1/api/health

# Authenticated request
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5001/PROJECT_ID/us-central1/api/user/me
```

---

**Last Updated**: Sprint 1, Day 1
**Status**: ✅ Structure complete, ready for implementation
