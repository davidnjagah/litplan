# Litplan Database Schema & RLS Policy Analysis

## Executive Summary

This document provides a comprehensive analysis of the Litplan database schema and API data access patterns to inform Row-Level Security (RLS) policy implementation. The system uses PostgreSQL with Prisma ORM, authenticated via Supabase Auth with JWT tokens.

---

## 1. Database Schema Overview

### 1.1 Table Summary

| Table | Type | User-Specific | Public Access | Key Relations |
|-------|------|---------------|---------------|----------------|
| **User** | Auth | ✓ | ✗ | Subscription, SavedCity, ViewedCity, SearchedCity |
| **Subscription** | Auth | ✓ | ✗ | User (1:1) |
| **City** | Content | ✗ | ✓ | Plan, GroupFlow, SavedCity, ViewedCity, SearchedCity |
| **Plan** | Content | ✗ | ✓ | City, GroupFlowStep |
| **GroupFlow** | Content | ✗ | ✓ | City, GroupFlowStep |
| **GroupFlowStep** | Content | ✗ | ✓ | GroupFlow, Plan |
| **SavedCity** | User Activity | ✓ | ✗ | User, City |
| **ViewedCity** | User Activity | ✓ | ✗ | User, City |
| **SearchedCity** | User Activity | ✓ | ✗ | User, City |
| **AppConfig** | System | ✗ | ✓ | N/A |
| **WeeklyRefreshLog** | System | ✗ | ✓ | N/A |
| **AIAgentLog** | System | ✗ | ✓ | N/A |
| **DailyRefreshLog** | System | ✗ | ✓ | N/A |

---

## 2. Detailed Table Structure & Relationships

### 2.1 User & Authentication Tables

#### **User Table**
```
id (CUID, PK)              - Primary database ID
supabaseUserId (UUID)      - Supabase Auth user ID (UNIQUE, indexed)
email (VARCHAR, nullable)  - User email (UNIQUE, indexed)
displayName (VARCHAR)      - User display name
imageUrl (VARCHAR)         - Avatar URL
createdAt (TIMESTAMP)      - Account creation
updatedAt (TIMESTAMP)      - Last update
```

**Relations:**
- 1:1 → Subscription (cascade delete)
- 1:N → SavedCity (cascade delete)
- 1:N → ViewedCity (cascade delete)
- 1:N → SearchedCity (cascade delete)

**RLS Requirements:**
- Users can only read/write their own records
- `supabaseUserId` is the bridge between Supabase Auth and database User

#### **Subscription Table**
```
id (CUID, PK)
userId (FK → User.id)          - Internal user reference
supabaseUserId (UUID, UNIQUE)  - Supabase user reference (for fast lookups)
status (ENUM)                  - FREE, PRO, TRIAL, EXPIRED, CANCELLED
tier (ENUM)                    - FREE or PRO
startDate (TIMESTAMP)          - Subscription start
expiryDate (TIMESTAMP)         - Subscription expiration
autoRenew (BOOLEAN)            - Auto-renewal flag

StoreKit 2 Fields (Apple IAP):
  transactionId (VARCHAR)      - Current transaction ID
  originalTransactionId (VARCHAR) - Original transaction ID (for restore)
  productId (VARCHAR)          - litplan_pro_monthly, litplan_pro_yearly
  purchaseDate (TIMESTAMP)     - Purchase date
  expiresDate (TIMESTAMP)      - Expiration date
  environment (VARCHAR)        - sandbox or production

Entitlements:
  maxCitiesPerWeek (INT)      - Default: 1 (free), 100 (pro)
  maxPlansPerCity (INT)       - Default: 10 (both tiers)
  weekendAccess (BOOLEAN)     - Default: false (free), true (pro)
  groupPlansAccess (BOOLEAN)  - Default: false (free), true (pro)
  savedCitiesAccess (BOOLEAN) - Default: false (free), true (pro)

createdAt, updatedAt (TIMESTAMP)
```

**RLS Requirements:**
- Users can only view their own subscription
- System admins can view all subscriptions
- Subscription status directly affects feature access

---

### 2.2 Content Tables (Public)

#### **City Table**
```
id (CUID, PK)              - Primary ID
cityId (VARCHAR, UNIQUE)   - Legacy ID (nyc-001, lax-002, etc.)
name (VARCHAR)             - City name
country (VARCHAR)          - Country name
countryCode (VARCHAR)      - ISO country code
rank (INT, indexed)        - Display rank
timezone (VARCHAR)         - IANA timezone
heroImage (VARCHAR)        - Hero image URL
cardImage (VARCHAR)        - Card image URL
accentColor (VARCHAR)      - Brand color (#00D9FF default)
totalPlansThisWeek (INT)   - Weekly plan count cache
featured (BOOLEAN)         - Feature flag
searchCount (INT)          - Global search analytics
latitude, longitude (FLOAT)
lastUpdated (TIMESTAMP)
createdAt, updatedAt (TIMESTAMP)
```

**Relations:**
- 1:N ← Plan
- 1:N ← GroupFlow
- 1:N ← SavedCity
- 1:N ← ViewedCity
- 1:N ← SearchedCity

**RLS Requirements:**
- PUBLIC READ - All users and anonymous can view city data
- AUTHENTICATED WRITE - Admin users only
- Used extensively in searches and featured lists

#### **Plan Table**
```
id (CUID, PK)
planId (VARCHAR, UNIQUE)   - Legacy ID (nyc-plan-001, etc.)
cityId (FK → City.id)      - Parent city
rank (INT)                 - Display rank within city
title, venueName (VARCHAR) - Plan title and venue
description (TEXT)         - Plan description
category (VARCHAR)         - Venue category (Rooftop Bar, Live Music, etc.)
type (ENUM)                - BAR, CLUB, EVENT, RESTAURANT

Media:
  heroImage, thumbnailImage (VARCHAR)
  galleryImages (TEXT[])   - Array of image URLs

Location:
  address, neighborhood (VARCHAR)
  googleMapsUrl (VARCHAR)
  latitude, longitude (FLOAT)

Scheduling:
  date, startTime, endTime (VARCHAR) - ISO format
  isWeekend (BOOLEAN)
  weekday (VARCHAR)
  weekNumber (INT)           - Week 1-52
  yearWeek (VARCHAR)         - 2026-W01 format
  weekStartDate (TIMESTAMP)  - Week boundary

Event vs Permanent:
  isEvent (BOOLEAN)          - True for weekly events
  eventDate (TIMESTAMP)      - Specific event date
  isRecurring (BOOLEAN)      - True for permanent venues

Content Tracking:
  contentHash (VARCHAR)      - For change detection
  sourceUrl (VARCHAR)
  aiGenerated (BOOLEAN)
  qualityScore (INT)         - AI quality rating
  generatedAt (TIMESTAMP)
  lastVerifiedAt (TIMESTAMP)

Pricing:
  entryFee (INT)             - In cents
  currency (VARCHAR)         - USD default
  priceRange (VARCHAR)       - $$
  freeEntry (BOOLEAN)

Tags:
  genres (TEXT[])            - Musical/food genres
  vibes (TEXT[])             - Atmosphere tags
  eventType (VARCHAR)

Ratings:
  averageRating (FLOAT)
  totalReviews (INT)
  reviewSource (VARCHAR)

Flags:
  isIndividual, isGroup, isFeatured (BOOLEAN)
  source (VARCHAR)           - Data source

createdAt, updatedAt (TIMESTAMP)
```

**Indexes:**
- cityId (FK)
- rank, isWeekend, type
- yearWeek + cityId (composite for weekly queries)
- isEvent, aiGenerated, qualityScore (for filtering)

**RLS Requirements:**
- PUBLIC READ
- AUTHENTICATED WRITE - Admin only
- Weekend plans hidden from free tier (application-level enforcement)

#### **GroupFlow Table**
```
id (CUID, PK)
flowId (VARCHAR, UNIQUE)   - Legacy ID (nyc-flow-001, etc.)
cityId (FK → City.id)
rank (INT)
title, description (VARCHAR)
totalHours (FLOAT)
startTime, endTime (VARCHAR) - ISO format
totalEstimate (INT)        - In cents
currency (VARCHAR)

Flags:
  isWeekend (BOOLEAN)
  proOnly (BOOLEAN)         - Pro users only
  aiGenerated (BOOLEAN)

Event vs Permanent:
  isTemporary (BOOLEAN)      - Event-based flows that expire
  eventDate (TIMESTAMP)
  expiresAt (TIMESTAMP)      - Expiration date
  theme (VARCHAR)            - rooftop, comedy, jazz, etc.

Content Tracking:
  contentHash (VARCHAR)
  lastRefreshed (TIMESTAMP)

difficulty (VARCHAR)       - easy, moderate, intense
createdAt, updatedAt (TIMESTAMP)
```

**RLS Requirements:**
- PUBLIC READ (but proOnly flag enforced at application level)
- AUTHENTICATED WRITE - Admin only

#### **GroupFlowStep Table**
```
id (CUID, PK)
flowId (FK → GroupFlow.id)
planId (FK → Plan.id)
stepNumber (INT)
title, venueName (VARCHAR)
duration (INT)             - In minutes
thumbnail (VARCHAR)

Unique: (flowId, stepNumber)
```

**RLS Requirements:**
- PUBLIC READ
- AUTHENTICATED WRITE - Admin only

---

### 2.3 User Activity Tables (Private)

#### **SavedCity Table**
```
id (CUID, PK)
userId (FK → User.id)      - User who saved
cityId (FK → City.id)      - City saved
notes (TEXT)               - Optional user notes
savedAt (TIMESTAMP)

Unique: (userId, cityId)
Indexes: userId, cityId
```

**RLS Requirements:**
- Users can only read/write their own SavedCity records
- `userId` MUST match authenticated user

#### **ViewedCity Table**
```
id (CUID, PK)
userId (FK → User.id)      - User who viewed
cityId (FK → City.id)      - City viewed
viewedAt (TIMESTAMP)       - First view
lastViewedAt (TIMESTAMP)   - Most recent view (for sorting)
viewCount (INT)            - Number of views

Unique: (userId, cityId)
Indexes: userId, lastViewedAt, (userId, lastViewedAt) composite
```

**RLS Requirements:**
- Users can only read/write their own ViewedCity records
- `userId` MUST match authenticated user

#### **SearchedCity Table**
```
id (CUID, PK)
userId (FK → User.id)      - User who searched
cityId (FK → City.id)      - City searched
searchQuery (VARCHAR)      - Search term entered
searchedAt (TIMESTAMP)

Indexes: userId, searchedAt, (userId, searchedAt) composite
```

**RLS Requirements:**
- Users can only read/write their own SearchedCity records
- `userId` MUST match authenticated user

---

### 2.4 System Tables (Admin/Read-Only)

#### **AppConfig Table**
```
id (VARCHAR, PK)           - Always "app" (singleton)
currentWeek (VARCHAR)      - 2026-W01 format
weekStartDate, weekEndDate (TIMESTAMP)

Free Tier Config:
  freeMaxCities (INT)      - Default: 10
  freeMaxPlans (INT)       - Default: 10
  freeWeekendAccess (BOOLEAN) - Default: false

Pro Tier Config:
  proMaxCities (INT)       - Default: 100
  proMaxPlans (INT)        - Default: 50
  proWeekendAccess (BOOLEAN) - Default: true

updatedAt (TIMESTAMP)
```

**RLS Requirements:**
- PUBLIC READ (configuration for client)
- AUTHENTICATED WRITE - Admin only

#### **WeeklyRefreshLog Table**
```
id (CUID, PK)
yearWeek (VARCHAR)         - 2026-W01
startedAt, completedAt (TIMESTAMP)
status (VARCHAR)           - RUNNING, COMPLETED, FAILED, PARTIAL
citiesProcessed, plansCreated, plansUpdated (INT)
plansUnchanged, groupFlowsGenerated (INT)
errors (JSONB)
createdAt (TIMESTAMP)

Indexes: yearWeek, status, startedAt
```

**RLS Requirements:**
- AUTHENTICATED READ - Admin only
- AUTHENTICATED WRITE - Service/Cron job only

#### **AIAgentLog Table**
```
id (UUID, PK)
agentType (VARCHAR)        - generator, qa-accuracy, qa-quality
cityId (TEXT)
date (DATE)
plansGenerated, plansApproved, plansRejected (INT)
executionTimeMs (INT)
errors (JSONB)
createdAt (TIMESTAMP)
```

**RLS Requirements:**
- AUTHENTICATED READ - Admin only
- AUTHENTICATED WRITE - Service/AI agents only

#### **DailyRefreshLog Table**
```
id (UUID, PK)
runDate (DATE)
startedAt, completedAt (TIMESTAMP)
status (VARCHAR)
citiesProcessed, plansGenerated, plansApproved (INT)
errors (JSONB)
createdAt (TIMESTAMP)
```

**RLS Requirements:**
- AUTHENTICATED READ - Admin only
- AUTHENTICATED WRITE - Service/Cron only

---

## 3. API Data Access Patterns

### 3.1 Authentication Flow

```
iOS Client
    ↓ (Supabase Auth)
Supabase Auth Service (generates JWT)
    ↓ (Bearer token in Authorization header)
Express Backend
    ↓ (requireAuth middleware)
Verify JWT with supabaseAdmin.auth.getUser(token)
    ↓ (Verify userId in JWT)
Extract userId (Supabase Auth ID)
    ↓
loadUser middleware
    ↓
UserService.getUserBySupabaseId(supabaseUserId)
    ↓
req.user = { id, supabaseUserId, email, displayName, subscription }
    ↓
Route handler receives req.user
```

**JWT Token Claims:**
- `sub`: Supabase user ID (UUID)
- `email`: User email
- `aud`: Audience
- `exp`: Expiration time
- `iat`: Issued at

### 3.2 Public Data Access (No Auth Required)

#### GET /api/v2/cities
- **Data**: All cities (name, rank, images, etc.)
- **Auth**: None
- **Purpose**: City list/search
- **Response**: Array of City objects

#### GET /api/v2/cities/featured
- **Data**: Featured cities
- **Auth**: None
- **Purpose**: Featured cities display
- **Response**: Array of City objects

#### GET /api/v2/cities/search?q=query
- **Data**: Cities matching search query
- **Auth**: None
- **Purpose**: City search
- **Response**: Array of City objects

#### GET /api/v2/cities/:cityId
- **Data**: Single city details
- **Auth**: None
- **Purpose**: City detail page
- **Response**: City object

#### GET /api/v2/plans/featured/:cityId
- **Data**: Featured plans for a city
- **Auth**: None
- **Purpose**: Featured plans display
- **Response**: Array of Plan objects

### 3.3 Authenticated Data Access

#### GET /api/v2/cities/:cityId/plans
- **Auth**: requireAuthWithUser
- **Data**: Plans for city (paginated, tier-limited)
- **Entitlements**:
  - Check maxPlansPerCity from Subscription
  - Check weekendAccess (hide weekend plans if false)
  - Check maxCitiesPerWeek (limit unique cities viewed this week)
- **Activity**: Records ViewedCity
- **Response**: Array of Plan objects + metadata

#### GET /api/v2/cities/:cityId/group-flows
- **Auth**: requireProWithUser
- **Data**: Group flows with steps for city
- **Entitlements**: Pro tier required
- **Activity**: Records ViewedCity
- **Response**: Array of GroupFlow objects with steps

#### GET /api/v2/plans/:planId
- **Auth**: requireAuthWithUser
- **Data**: Single plan details
- **Entitlements**:
  - Check weekendAccess (hide if weekend plan and no access)
- **Response**: Plan object

### 3.4 User Profile & Activity Access

#### GET /api/v2/user/profile
- **Auth**: requireAuthWithUser
- **Data**: User profile + subscription + entitlements
- **Query**: `UserService.getUserWithSubscription(req.user.id)`
- **Constraint**: `WHERE id = req.user.id`
- **Response**: User object with subscription

#### PATCH /api/v2/user/profile
- **Auth**: requireAuthWithUser
- **Data**: Update displayName, email
- **Query**: `UserService.updateUser(req.user.id, data)`
- **Constraint**: `WHERE id = req.user.id`

#### GET /api/v2/user/viewed-cities
- **Auth**: requireAuthWithUser
- **Data**: Paginated viewed cities (limit, offset)
- **Query**: `UserActivityService.getViewedCities(req.user.id, limit, offset)`
- **Constraint**: `WHERE userId = req.user.id`
- **Pagination**: orderBy lastViewedAt DESC
- **Response**: Array of ViewedCity + pagination metadata

#### POST /api/v2/user/viewed-cities/:cityId
- **Auth**: requireAuthWithUser
- **Data**: Record city view
- **Query**: `UserActivityService.recordCityView(req.user.id, cityId)`
- **Constraint**: Upsert on `(userId, cityId) = (req.user.id, cityId)`

#### GET /api/v2/user/saved-cities
- **Auth**: requireProWithUser
- **Data**: User's saved cities
- **Query**: `UserActivityService.getSavedCities(req.user.id)`
- **Constraint**: `WHERE userId = req.user.id`
- **Response**: Array of SavedCity objects

#### POST /api/v2/user/saved-cities/:cityId
- **Auth**: requireProWithUser
- **Data**: Save city with optional notes
- **Query**: `UserActivityService.saveCity(req.user.id, cityId, notes)`
- **Constraint**: Upsert on `(userId, cityId) = (req.user.id, cityId)`

#### DELETE /api/v2/user/saved-cities/:cityId
- **Auth**: requireProWithUser
- **Data**: Unsave city
- **Query**: `UserActivityService.unsaveCity(req.user.id, cityId)`
- **Constraint**: `WHERE userId = req.user.id AND cityId = cityId`

#### POST /api/v2/user/searched-cities
- **Auth**: requireAuthWithUser
- **Data**: Record city search
- **Query**: `UserActivityService.recordCitySearch(req.user.id, cityId, searchQuery)`
- **Constraint**: Insert with userId = req.user.id

#### GET /api/v2/user/searched-cities
- **Auth**: requireAuthWithUser
- **Data**: User's search history
- **Query**: `UserActivityService.getSearchHistory(req.user.id, limit)`
- **Constraint**: `WHERE userId = req.user.id`

### 3.5 Subscription Access

#### GET /api/v2/subscription
- **Auth**: requireAuthWithUser
- **Data**: Detailed subscription status
- **Query**: `SubscriptionService.getDetailedSubscriptionStatus(req.user.id)`
- **Constraint**: `WHERE userId = req.user.id`

#### POST /api/v2/subscription/verify-transaction
- **Auth**: requireAuthWithUser
- **Data**: Apple IAP StoreKit 2 transaction
- **Query**: `SubscriptionService.verifyAndUpsertTransaction(req.user.id, transactionData)`
- **Constraint**: Update userId = req.user.id only

---

## 4. RLS Policy Requirements Matrix

### 4.1 Table Access Control Summary

| Table | Anonymous | Auth Read | Auth Write | Admin | Notes |
|-------|-----------|-----------|-----------|-------|-------|
| User | ✗ | Self only | Self only | ✓ | No anonymous access |
| Subscription | ✗ | Self only | Self/system | ✓ | Pro upgrades via webhook |
| City | ✓ | ✓ | ✗ (admin) | ✓ | Public read, admin write |
| Plan | ✓ | ✓ | ✗ (admin) | ✓ | Public read, admin write |
| GroupFlow | ✓ | ✓ | ✗ (admin) | ✓ | Public read, admin write |
| GroupFlowStep | ✓ | ✓ | ✗ (admin) | ✓ | Public read, admin write |
| SavedCity | ✗ | Self only | Self only | ✓ | Private activity |
| ViewedCity | ✗ | Self only | Self only | ✓ | Private activity |
| SearchedCity | ✗ | Self only | Self only | ✓ | Private activity |
| AppConfig | ✓ | ✓ | ✗ (admin) | ✓ | Public read |
| WeeklyRefreshLog | ✗ | Admin only | ✗ (service) | ✓ | Admin monitoring |
| AIAgentLog | ✗ | Admin only | ✗ (service) | ✓ | Admin monitoring |
| DailyRefreshLog | ✗ | Admin only | ✗ (service) | ✓ | Admin monitoring |

### 4.2 RLS Policy Specifications

#### **User Table Policies**

```sql
-- Authenticated users can read their own user record
CREATE POLICY user_read_own ON "User"
  FOR SELECT
  USING (auth.uid()::text = supabaseUserId);

-- Users can update their own profile
CREATE POLICY user_update_own ON "User"
  FOR UPDATE
  USING (auth.uid()::text = supabaseUserId)
  WITH CHECK (auth.uid()::text = supabaseUserId);

-- Admins can read all users (requires custom claim)
CREATE POLICY user_read_admin ON "User"
  FOR SELECT
  USING (current_setting('app.user_role', true) = 'admin');

-- Admins can update any user
CREATE POLICY user_update_admin ON "User"
  FOR UPDATE
  USING (current_setting('app.user_role', true) = 'admin');
```

**Notes:**
- `auth.uid()` returns UUID of authenticated user
- Requires casting to TEXT for supabaseUserId comparison
- Custom role claim set via `current_setting('app.user_role')`

#### **Subscription Table Policies**

```sql
-- Authenticated users can read their own subscription
CREATE POLICY subscription_read_own ON "Subscription"
  FOR SELECT
  USING (auth.uid()::text = supabaseUserId);

-- System can update subscriptions (via webhook)
CREATE POLICY subscription_update_system ON "Subscription"
  FOR UPDATE
  USING (current_setting('app.user_role', true) = 'service')
  WITH CHECK (current_setting('app.user_role', true) = 'service');

-- Admins can read all subscriptions
CREATE POLICY subscription_read_admin ON "Subscription"
  FOR SELECT
  USING (current_setting('app.user_role', true) = 'admin');
```

#### **SavedCity Table Policies**

```sql
-- Authenticated users can read their own saved cities
CREATE POLICY saved_city_read_own ON "SavedCity"
  FOR SELECT
  USING (
    userId IN (
      SELECT id FROM "User"
      WHERE supabaseUserId = auth.uid()::text
    )
  );

-- Users can insert their own saved cities
CREATE POLICY saved_city_insert_own ON "SavedCity"
  FOR INSERT
  WITH CHECK (
    userId IN (
      SELECT id FROM "User"
      WHERE supabaseUserId = auth.uid()::text
    )
  );

-- Users can update their own saved cities
CREATE POLICY saved_city_update_own ON "SavedCity"
  FOR UPDATE
  USING (
    userId IN (
      SELECT id FROM "User"
      WHERE supabaseUserId = auth.uid()::text
    )
  );

-- Users can delete their own saved cities
CREATE POLICY saved_city_delete_own ON "SavedCity"
  FOR DELETE
  USING (
    userId IN (
      SELECT id FROM "User"
      WHERE supabaseUserId = auth.uid()::text
    )
  );
```

**Optimization:** Consider caching user ID mapping to avoid subquery:

```sql
-- Alternative: Use function for cleaner policy
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS TEXT AS $$
  SELECT id FROM "User"
  WHERE supabaseUserId = auth.uid()::text
  LIMIT 1
$$ LANGUAGE sql STABLE;

CREATE POLICY saved_city_read_own ON "SavedCity"
  FOR SELECT
  USING (userId = get_user_id_from_auth());
```

#### **ViewedCity Table Policies**

```sql
-- Same as SavedCity but for ViewedCity
CREATE POLICY viewed_city_read_own ON "ViewedCity"
  FOR SELECT
  USING (userId = get_user_id_from_auth());

CREATE POLICY viewed_city_insert_own ON "ViewedCity"
  FOR INSERT
  WITH CHECK (userId = get_user_id_from_auth());

CREATE POLICY viewed_city_update_own ON "ViewedCity"
  FOR UPDATE
  USING (userId = get_user_id_from_auth());

CREATE POLICY viewed_city_delete_own ON "ViewedCity"
  FOR DELETE
  USING (userId = get_user_id_from_auth());
```

#### **SearchedCity Table Policies**

```sql
-- Same as SavedCity but for SearchedCity
CREATE POLICY searched_city_read_own ON "SearchedCity"
  FOR SELECT
  USING (userId = get_user_id_from_auth());

CREATE POLICY searched_city_insert_own ON "SearchedCity"
  FOR INSERT
  WITH CHECK (userId = get_user_id_from_auth());

-- Admins can read all search data (for analytics)
CREATE POLICY searched_city_read_admin ON "SearchedCity"
  FOR SELECT
  USING (current_setting('app.user_role', true) = 'admin');
```

#### **City Table Policies**

```sql
-- Everyone can read cities (public data)
CREATE POLICY city_read_public ON "City"
  FOR SELECT
  USING (true);

-- Only admins can write cities
CREATE POLICY city_write_admin ON "City"
  FOR INSERT
  WITH CHECK (current_setting('app.user_role', true) = 'admin');

CREATE POLICY city_update_admin ON "City"
  FOR UPDATE
  USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY city_delete_admin ON "City"
  FOR DELETE
  USING (current_setting('app.user_role', true) = 'admin');
```

#### **Plan Table Policies**

```sql
-- Everyone can read plans (public data)
CREATE POLICY plan_read_public ON "Plan"
  FOR SELECT
  USING (true);

-- Only admins can write plans
CREATE POLICY plan_write_admin ON "Plan"
  FOR INSERT
  WITH CHECK (current_setting('app.user_role', true) = 'admin');

CREATE POLICY plan_update_admin ON "Plan"
  FOR UPDATE
  USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY plan_delete_admin ON "Plan"
  FOR DELETE
  USING (current_setting('app.user_role', true) = 'admin');
```

#### **GroupFlow & GroupFlowStep Policies**

```sql
-- Same as Plan - public read, admin write
CREATE POLICY group_flow_read_public ON "GroupFlow"
  FOR SELECT
  USING (true);

CREATE POLICY group_flow_write_admin ON "GroupFlow"
  FOR INSERT
  WITH CHECK (current_setting('app.user_role', true) = 'admin');

-- Similar for GroupFlowStep
```

#### **System Tables (Admin Only)**

```sql
-- WeeklyRefreshLog
CREATE POLICY weekly_refresh_read_admin ON "WeeklyRefreshLog"
  FOR SELECT
  USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY weekly_refresh_write_service ON "WeeklyRefreshLog"
  FOR INSERT
  WITH CHECK (current_setting('app.user_role', true) = 'service');

-- AIAgentLog
CREATE POLICY ai_agent_read_admin ON "AIAgentLog"
  FOR SELECT
  USING (current_setting('app.user_role', true) = 'admin');

-- DailyRefreshLog
CREATE POLICY daily_refresh_read_admin ON "DailyRefreshLog"
  FOR SELECT
  USING (current_setting('app.user_role', true) = 'admin');
```

---

## 5. Implementation Considerations

### 5.1 Authentication Context

**Current Architecture:**
- Backend validates JWT with Supabase Admin SDK (server-to-server)
- Backend loads User from database using supabaseUserId
- Backend enforces authorization logic in middleware

**For RLS Implementation:**
- Supabase client needs to send Bearer token in requests
- Database RLS policies check auth.uid() from JWT
- Custom claims (admin role) set via custom JWT claim or custom table

### 5.2 Role Management

**Option 1: Custom JWT Claims (Recommended)**
```typescript
// In user creation/update webhook
const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
  user_metadata: {
    role: 'admin' // or 'user', 'service'
  }
})

// In JWT claims, this becomes auth.jwt()->custom_claims
// Access via: current_setting('request.jwt.claims', true)
```

**Option 2: User Metadata Table**
```sql
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL -- admin, service, user
);

-- In policy
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
```

**Option 3: Service Account**
```sql
-- For cron jobs and webhooks using service role
CREATE POLICY service_role_only ON "WeeklyRefreshLog"
  FOR INSERT
  USING (auth.role() = 'service_role');
```

### 5.3 Token Structure

Supabase JWT contains:
```json
{
  "sub": "uuid-format-supabase-id",
  "email": "user@example.com",
  "email_verified": true,
  "phone_verified": false,
  "aud": "authenticated",
  "role": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490
}
```

Accessed in RLS via:
- `auth.uid()` - Returns SUB claim as UUID
- `auth.email()` - Returns email claim
- `auth.jwt()` - Returns full JWT object
- `current_setting('request.jwt.claims', true)` - Parsed JWT claims JSON

### 5.4 Performance Considerations

**Subquery Performance:**
```sql
-- Slow - subquery in USING clause
WHERE userId IN (SELECT id FROM "User" WHERE supabaseUserId = auth.uid()::text)

-- Better - function with index
WHERE userId = get_user_id_from_auth()
```

**Function Definition:**
```sql
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS TEXT LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM "User"
  WHERE supabaseUserId = auth.uid()::text
  LIMIT 1
$$;

-- Create index to support this lookup
CREATE INDEX idx_user_supabase_id ON "User"(supabaseUserId);
```

### 5.5 Current Backend Architecture

**Middleware Chain:**
1. `requireAuth` - Verifies JWT with Supabase Admin SDK
2. `loadUser` - Queries User by supabaseUserId
3. `req.user` - Contains database user object
4. Route handlers - Use req.user.id for database queries

**Backend Already Filters:**
```typescript
// Example from UserActivityService
const viewedCities = await prisma.viewedCity.findMany({
  where: { userId: req.user.id },  // Application-level filtering
  orderBy: { lastViewedAt: 'desc' }
});
```

**With RLS:**
- Remove application-level userId checks (RLS handles it)
- Simplify queries - RLS automatically filters rows
- Enable direct client-to-database queries (RealtimeDB, PostgREST API)

### 5.6 Migration Path

**Phase 1: Planning & Testing**
- Create RLS policies in development database
- Test with Supabase SDK directly
- Verify policy enforcement

**Phase 2: Gradual Rollout**
- Enable RLS on non-critical tables first (City, Plan, GroupFlow)
- Test via PostgREST API (Supabase JavaScript client)
- Verify backward compatibility with backend

**Phase 3: User Activity Tables**
- Enable RLS on SavedCity, ViewedCity, SearchedCity
- Update backend to use authenticated clients
- Test end-to-end

**Phase 4: System Tables**
- Enable RLS on logs and config tables
- Ensure service role can still write logs
- Admin dashboard testing

---

## 6. Key Access Patterns Summary

| Pattern | Tables | Auth | Constraint | Use Case |
|---------|--------|------|-----------|----------|
| **User Profile** | User, Subscription | Required | userId = auth user | Profile view/edit |
| **City Browse** | City | Optional | none | City list/search |
| **City Details** | City, Plan, GroupFlow | Optional | none | City page |
| **My Saved Cities** | SavedCity, City | Required | userId = auth user | Saved list |
| **My View History** | ViewedCity, City | Required | userId = auth user | History page |
| **Admin Write** | City, Plan, GroupFlow | Required | role = admin | Content management |
| **Search Analytics** | SearchedCity | Required for user, admin for all | userId = auth user OR role = admin | Analytics dashboard |
| **Subscription Updates** | Subscription | Service role | N/A | Apple IAP webhook |

---

## 7. Technology Stack

- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth (JWT-based)
- **Backend**: Express.js with Supabase Admin SDK
- **Client**: Supabase JavaScript SDK (for RLS support)

---

## 8. Recommendations

1. **Enable RLS on all user-specific tables** (SavedCity, ViewedCity, SearchedCity, User, Subscription)
2. **Implement get_user_id_from_auth() function** for efficient row filtering
3. **Use custom JWT claims** for role management (simpler than role table)
4. **Keep public data tables accessible** (City, Plan, GroupFlow, AppConfig)
5. **Test RLS policies thoroughly** before production rollout
6. **Consider PostgREST API** for mobile app direct database access
7. **Maintain backend enforcement** during transition period
8. **Document all policies** for future maintenance

---

## Appendix: SQL Setup Script Template

```sql
-- Enable RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedCity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ViewedCity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SearchedCity" ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS TEXT LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM "User"
  WHERE supabaseUserId = auth.uid()::text
  LIMIT 1
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_supabase_id ON "User"(supabaseUserId);
CREATE INDEX IF NOT EXISTS idx_saved_city_user_id ON "SavedCity"(userId);
CREATE INDEX IF NOT EXISTS idx_viewed_city_user_id ON "ViewedCity"(userId);
CREATE INDEX IF NOT EXISTS idx_searched_city_user_id ON "SearchedCity"(userId);

-- Policies (see section 4.2 for complete definitions)
-- ... Create all policies as specified above ...

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "SavedCity" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ViewedCity" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "SearchedCity" TO authenticated;
GRANT SELECT, UPDATE ON "User" TO authenticated;
GRANT SELECT ON "Subscription" TO authenticated;

-- For service role (cron jobs, webhooks)
GRANT INSERT ON "WeeklyRefreshLog" TO service_role;
GRANT INSERT ON "AIAgentLog" TO service_role;
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Author**: Claude Code Analysis
**Status**: Ready for RLS Policy Implementation
