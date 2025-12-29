# Sprint 5: Prisma + Clerk Migration Plan

## Overview

This sprint encompasses a major architectural overhaul of the Litplan backend:
1. **Database Migration**: Firestore → Prisma ORM (local PostgreSQL, production PlanetScale)
2. **Authentication Migration**: Custom iCloud/Apple Sign-In → Clerk (Google, Apple, Email/Password)
3. **Subscription Tracking**: Link subscriptions to Clerk account IDs

---

## Sprint Structure

### Phase 1: Infrastructure Setup (Sprint 5.1)
**Duration: 2-3 days**

#### Backend Engineer Tasks:
1. **Initialize Prisma in the project**
   - Install Prisma CLI and client
   - Configure `prisma/schema.prisma` with PostgreSQL provider
   - Set up environment variables for local PostgreSQL and PlanetScale

2. **Design Prisma Schema**
   - Migrate User model with Clerk integration fields
   - Migrate City model
   - Migrate Plan model (with city relations)
   - Migrate GroupFlow model (with city and plan relations)
   - Add UserActivity model
   - Add SavedCity model
   - Add Subscription model (linked to Clerk userId)

3. **Local Development Setup**
   - Configure local PostgreSQL database
   - Create Docker Compose for local development
   - Set up Prisma migrations workflow

4. **PlanetScale Configuration**
   - Create PlanetScale database
   - Configure connection strings for production
   - Set up branch-based development workflow

#### QA Tester Tasks:
- Verify local development environment setup
- Test database connectivity

---

### Phase 2: Prisma Schema Implementation (Sprint 5.2)
**Duration: 2-3 days**

#### Prisma Schema Design:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma" // Required for PlanetScale
}

// ==================== USER & AUTH ====================

model User {
  id                String    @id @default(cuid())
  clerkUserId       String    @unique // Clerk's user ID
  email             String?   @unique
  displayName       String?
  imageUrl          String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  subscription      Subscription?
  activities        UserActivity[]
  savedCities       SavedCity[]
  viewedCities      ViewedCity[]

  @@index([clerkUserId])
  @@index([email])
}

model Subscription {
  id                String    @id @default(cuid())
  userId            String    @unique
  clerkUserId       String    @unique // Clerk ID for easy lookup

  status            SubscriptionStatus @default(FREE)
  tier              SubscriptionTier   @default(FREE)

  startDate         DateTime?
  expiryDate        DateTime?
  autoRenew         Boolean   @default(false)

  // StoreKit fields
  transactionId     String?
  productId         String?
  originalTransactionId String?

  // Entitlements (denormalized for quick access)
  maxCitiesPerWeek  Int       @default(1)
  maxPlansPerCity   Int       @default(10)
  weekendAccess     Boolean   @default(false)
  groupPlansAccess  Boolean   @default(false)
  savedCitiesAccess Boolean   @default(false)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([clerkUserId])
  @@index([transactionId])
  @@index([status])
}

enum SubscriptionStatus {
  FREE
  PRO
  TRIAL
  EXPIRED
  CANCELLED
}

enum SubscriptionTier {
  FREE
  PRO
}

// ==================== CITIES ====================

model City {
  id                String    @id @default(cuid())
  cityId            String    @unique // Legacy ID for compatibility (e.g., 'nyc-001')
  name              String
  country           String
  countryCode       String
  rank              Int
  timezone          String

  // Display assets
  heroImage         String?
  cardImage         String?
  accentColor       String?   @default("#00D9FF")

  // Metadata
  totalPlansThisWeek Int      @default(0)
  featured          Boolean   @default(false)

  // Coordinates
  latitude          Float
  longitude         Float

  lastUpdated       DateTime  @default(now())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  plans             Plan[]
  groupFlows        GroupFlow[]
  savedByUsers      SavedCity[]
  viewedByUsers     ViewedCity[]

  @@index([rank])
  @@index([featured])
  @@index([name])
}

// ==================== PLANS ====================

model Plan {
  id                String    @id @default(cuid())
  planId            String    @unique // Legacy ID (e.g., 'nyc-plan-001')
  cityId            String
  rank              Int

  title             String
  venueName         String
  description       String?
  category          String    // e.g., 'Rooftop Bar', 'Live Music'
  type              PlanType

  // Images
  heroImage         String?
  thumbnailImage    String?
  galleryImages     String[]  @default([])

  // Location
  address           String?
  neighborhood      String?
  googleMapsUrl     String?
  latitude          Float?
  longitude         Float?

  // Schedule
  date              String?   // ISO date string
  startTime         String?
  endTime           String?
  isWeekend         Boolean   @default(false)
  weekday           String?

  // Pricing
  entryFee          Int?      // In cents
  currency          String    @default("USD")
  priceRange        String?   // e.g., '$$'
  freeEntry         Boolean   @default(true)

  // AI Tags
  genres            String[]  @default([])
  vibes             String[]  @default([])
  eventType         String?

  // Flags
  isIndividual      Boolean   @default(true)
  isGroup           Boolean   @default(false)
  isFeatured        Boolean   @default(false)

  // Reviews
  averageRating     Float?
  totalReviews      Int       @default(0)
  reviewSource      String?

  // Metadata
  source            String    @default("AI-generated")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  city              City      @relation(fields: [cityId], references: [id], onDelete: Cascade)
  flowSteps         GroupFlowStep[]

  @@index([cityId])
  @@index([rank])
  @@index([isWeekend])
  @@index([type])
}

enum PlanType {
  BAR
  CLUB
  EVENT
  RESTAURANT
}

// ==================== GROUP FLOWS ====================

model GroupFlow {
  id                String    @id @default(cuid())
  flowId            String    @unique // Legacy ID (e.g., 'nyc-flow-001')
  cityId            String
  rank              Int

  title             String
  description       String?

  // Duration
  totalHours        Float
  startTime         String?
  endTime           String?

  // Pricing
  totalEstimate     Int?      // In cents
  currency          String    @default("USD")

  // Flags
  isWeekend         Boolean   @default(false)
  proOnly           Boolean   @default(true)
  aiGenerated       Boolean   @default(true)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  city              City      @relation(fields: [cityId], references: [id], onDelete: Cascade)
  steps             GroupFlowStep[]

  @@index([cityId])
  @@index([rank])
}

model GroupFlowStep {
  id                String    @id @default(cuid())
  flowId            String
  planId            String
  stepNumber        Int

  title             String
  venueName         String
  duration          Int       // In minutes
  thumbnail         String?

  // Relations
  flow              GroupFlow @relation(fields: [flowId], references: [id], onDelete: Cascade)
  plan              Plan      @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@unique([flowId, stepNumber])
  @@index([flowId])
  @@index([planId])
}

// ==================== USER ACTIVITY ====================

model UserActivity {
  id                String    @id @default(cuid())
  userId            String

  type              ActivityType
  cityId            String?
  planId            String?
  flowId            String?

  source            String?   // e.g., 'explore_tab', 'search'
  sessionId         String?

  createdAt         DateTime  @default(now())

  // Relations
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@index([type])
}

enum ActivityType {
  VIEWED_CITY
  VIEWED_PLAN
  VIEWED_FLOW
  SAVED_CITY
  UNSAVED_CITY
  SEARCH
}

model SavedCity {
  id                String    @id @default(cuid())
  userId            String
  cityId            String

  notes             String?
  savedAt           DateTime  @default(now())

  // Relations
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  city              City      @relation(fields: [cityId], references: [id], onDelete: Cascade)

  @@unique([userId, cityId])
  @@index([userId])
  @@index([cityId])
}

model ViewedCity {
  id                String    @id @default(cuid())
  userId            String
  cityId            String

  viewedAt          DateTime  @default(now())
  viewCount         Int       @default(1)

  // Relations
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  city              City      @relation(fields: [cityId], references: [id], onDelete: Cascade)

  @@unique([userId, cityId])
  @@index([userId])
  @@index([viewedAt])
}

// ==================== APP CONFIG ====================

model AppConfig {
  id                String    @id @default("app")
  currentWeek       String    // e.g., '2025-W03'
  weekStartDate     DateTime
  weekEndDate       DateTime

  // Free tier config
  freeMaxCities     Int       @default(1)
  freeMaxPlans      Int       @default(10)
  freeWeekendAccess Boolean   @default(false)

  // Pro tier config
  proMaxCities      Int       @default(100)
  proMaxPlans       Int       @default(50)
  proWeekendAccess  Boolean   @default(true)

  updatedAt         DateTime  @updatedAt
}
```

#### Backend Engineer Tasks:
1. Implement the Prisma schema above
2. Create initial migration
3. Set up seed scripts for development data
4. Create Prisma Client utility functions

#### QA Tester Tasks:
- Validate schema relationships
- Test seed data integrity

---

### Phase 3: Clerk Integration (Sprint 5.3)
**Duration: 2-3 days**

#### Backend Engineer Tasks:

1. **Install Clerk SDK**
   ```bash
   npm install @clerk/clerk-sdk-node @clerk/nextjs
   ```

2. **Configure Clerk Environment Variables**
   ```env
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

3. **Implement Clerk Middleware**
   - Create authentication middleware for API routes
   - Extract Clerk userId from session
   - Map Clerk userId to internal User model

4. **Clerk Webhook Handler**
   - Handle `user.created` webhook → Create User + Subscription records
   - Handle `user.updated` webhook → Update user profile
   - Handle `user.deleted` webhook → Soft delete user data

5. **Auth API Endpoints**
   - `GET /api/auth/me` - Get current user with subscription
   - `POST /api/auth/sync` - Sync Clerk user with database
   - `POST /api/subscription/update` - Update subscription from StoreKit

#### UI Designer Tasks:

1. **Create Authentication Screen**
   - Implement Clerk's pre-built `<SignIn />` component
   - Configure social providers (Google, Apple)
   - Add email/password option
   - Style components to match Litplan dark theme

2. **Auth Flow Screens**
   - Splash/Loading screen during auth check
   - Sign Up screen with onboarding flow
   - Forgot Password screen

3. **Update App Entry Point**
   - Wrap app in `<ClerkProvider>`
   - Implement auth state check
   - Route to auth or main app based on session

#### QA Tester Tasks:
- Test Google Sign-In flow
- Test Apple Sign-In flow
- Test Email/Password sign-up and sign-in
- Test password reset flow
- Verify webhook processing

---

### Phase 4: API Migration (Sprint 5.4)
**Duration: 3-4 days**

#### Backend Engineer Tasks:

1. **Create Prisma Service Layer**
   - `UserService` - CRUD operations for users
   - `CityService` - City queries with caching
   - `PlanService` - Plan queries with filtering
   - `GroupFlowService` - Group flow queries
   - `SubscriptionService` - Subscription management

2. **Migrate API Endpoints**
   - Convert all Firestore queries to Prisma
   - Maintain existing response formats for iOS compatibility
   - Add Clerk authentication to all protected routes

3. **Subscription Integration**
   - Link StoreKit transactions to Clerk userId
   - Update `POST /subscription/validate` to use Prisma
   - Update `GET /subscription/status` to query Prisma

4. **Data Migration Script**
   - Export data from Firestore
   - Transform to Prisma format
   - Import to PostgreSQL/PlanetScale

#### QA Tester Tasks:
- API regression testing
- Subscription flow testing
- Data integrity verification

---

### Phase 5: iOS App Updates (Sprint 5.5)
**Duration: 2-3 days**

#### UI Designer Tasks:

1. **Integrate Clerk iOS SDK**
   - Add Clerk iOS package
   - Configure with API keys
   - Implement session management

2. **Update Authentication Flow**
   - Remove iCloud/Apple Sign-In custom implementation
   - Implement Clerk sign-in components
   - Handle auth state changes

3. **Update API Calls**
   - Add Clerk session tokens to API requests
   - Handle 401 responses with re-authentication

4. **Profile Screen Updates**
   - Show Clerk user info (name, email, photo)
   - Add sign-out functionality via Clerk
   - Show subscription status linked to Clerk account

#### Backend Engineer Tasks:
- Support iOS SDK authentication flow
- Provide API documentation for iOS team

#### QA Tester Tasks:
- End-to-end testing on iOS
- Test auth persistence
- Test subscription status across app reinstalls

---

### Phase 6: Production Deployment (Sprint 5.6)
**Duration: 1-2 days**

#### Backend Engineer Tasks:

1. **PlanetScale Production Setup**
   - Create production branch
   - Run migrations
   - Migrate data from development

2. **Environment Configuration**
   - Set production Clerk keys
   - Configure production database URLs
   - Set up monitoring

3. **Deploy Backend**
   - Deploy to production environment
   - Verify all endpoints
   - Monitor for errors

#### QA Tester Tasks:
- Production smoke testing
- Subscription flow verification
- Performance testing

---

## Key Files to Create/Modify

### New Files:
```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts               # Seed data script
├── functions/src/
│   ├── lib/
│   │   └── prisma.ts         # Prisma client instance
│   ├── services/
│   │   ├── userService.ts    # User operations
│   │   ├── cityService.ts    # City operations
│   │   ├── planService.ts    # Plan operations
│   │   ├── subscriptionService.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── clerkAuth.ts      # Clerk authentication
│   │   └── index.ts
│   └── webhooks/
│       └── clerk.ts          # Clerk webhook handlers
```

### iOS App Updates:
```
ios-app/Litplan/
├── Auth/
│   ├── AuthView.swift        # Clerk sign-in screen
│   ├── ClerkManager.swift    # Clerk SDK wrapper
│   └── AuthState.swift       # Auth state management
├── Services/
│   └── APIService.swift      # Update with Clerk tokens
```

---

## Environment Variables Required

### Backend (.env):
```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For PlanetScale

# Clerk
CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Apple StoreKit (existing)
APPLE_SHARED_SECRET="..."
```

### iOS App:
```swift
// ClerkConfig.swift
let clerkPublishableKey = "pk_..."
```

---

## Risk Mitigation

1. **Data Loss Prevention**
   - Full Firestore backup before migration
   - Parallel running during transition
   - Rollback plan documented

2. **Authentication Disruption**
   - Gradual rollout with feature flags
   - Fallback to existing auth if needed
   - Clear user communication

3. **Subscription Continuity**
   - Map existing transactions to new system
   - Verify entitlements post-migration
   - Customer support protocol for issues

---

## Success Criteria

- [ ] All existing data migrated to Prisma/PlanetScale
- [ ] Clerk authentication working for Google, Apple, Email
- [ ] Existing subscriptions recognized under Clerk accounts
- [ ] All API endpoints functional with Prisma
- [ ] iOS app authenticating via Clerk
- [ ] No data loss during migration
- [ ] Performance equal or better than Firestore
- [ ] All existing tests passing

---

## Team Assignments

| Role | Primary Focus |
|------|---------------|
| Backend Engineer | Prisma schema, API migration, Clerk webhooks |
| UI Designer | Auth screens, iOS Clerk integration |
| QA Tester | Testing all phases, regression testing |
| PM (Claude) | Coordination, documentation, progress tracking |

---

**Sprint Start Date**: December 29, 2024
**Estimated Completion**: January 10-12, 2025

---

**Status**: Ready to Begin
**Approved By**: [Pending User Approval]
