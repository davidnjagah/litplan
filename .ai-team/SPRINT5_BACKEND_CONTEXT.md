# Sprint 5: Backend Engineer Context - Prisma + Clerk Migration

## Your Mission
Migrate the Litplan backend from Firebase/Firestore to Prisma ORM with Clerk authentication. This is a significant architectural change requiring careful planning and execution.

## Current State
- **Database**: Firestore (NoSQL, serverless)
- **Auth**: Custom Sign in with Apple / iCloud
- **Payments**: StoreKit 2 (server-side validation)
- **Backend**: Firebase Cloud Functions (TypeScript)

## Target State
- **Database**: Prisma ORM + PostgreSQL (local) / PlanetScale (production)
- **Auth**: Clerk (Google, Apple, Email/Password)
- **Payments**: StoreKit 2 linked to Clerk account IDs
- **Backend**: Node.js/Express or Cloud Functions with Prisma

---

## Phase 1: Prisma Setup (Days 1-2)

### Task 1.1: Initialize Prisma
```bash
cd backend/functions
npm install prisma @prisma/client
npx prisma init
```

### Task 1.2: Configure Environment
Create `.env` file:
```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/litplan_dev"

# PlanetScale (production - configure later)
# DATABASE_URL="mysql://..."
```

### Task 1.3: Set up Local PostgreSQL
Create `docker-compose.yml` in project root:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: litplan_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Task 1.4: Implement Prisma Schema
Copy the full schema from `SPRINT_5_PRISMA_CLERK_MIGRATION.md` to `prisma/schema.prisma`

Key models:
- `User` - with `clerkUserId` field
- `Subscription` - linked to User via `clerkUserId`
- `City`, `Plan`, `GroupFlow` - migrated from Firestore
- `UserActivity`, `SavedCity`, `ViewedCity` - user data

### Task 1.5: Run Initial Migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Phase 2: Service Layer (Days 3-4)

### Task 2.1: Create Prisma Client Singleton
Create `backend/functions/src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

### Task 2.2: Create Service Layer
Create services directory: `backend/functions/src/services/`

**userService.ts**:
```typescript
import { prisma } from '../lib/prisma';
import { User, Subscription } from '@prisma/client';

export const UserService = {
  async findByClerkId(clerkUserId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { clerkUserId },
      include: { subscription: true }
    });
  },

  async create(data: {
    clerkUserId: string;
    email?: string;
    displayName?: string;
    imageUrl?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        subscription: {
          create: {
            clerkUserId: data.clerkUserId,
            status: 'FREE',
            tier: 'FREE',
            maxCitiesPerWeek: 1,
            maxPlansPerCity: 10,
            weekendAccess: false,
            groupPlansAccess: false,
            savedCitiesAccess: false,
          }
        }
      },
      include: { subscription: true }
    });
  },

  async updateSubscription(clerkUserId: string, subscriptionData: Partial<Subscription>) {
    return prisma.subscription.update({
      where: { clerkUserId },
      data: subscriptionData
    });
  }
};
```

**cityService.ts**, **planService.ts**, **subscriptionService.ts** - similar pattern

---

## Phase 3: Clerk Integration (Days 5-6)

### Task 3.1: Install Clerk SDK
```bash
npm install @clerk/clerk-sdk-node
```

### Task 3.2: Create Clerk Middleware
Create `backend/functions/src/middleware/clerkAuth.ts`:
```typescript
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' }
      });
    }

    // Verify the session token with Clerk
    const session = await clerkClient.sessions.verifySession(
      req.headers['x-clerk-session-id'] as string,
      sessionToken
    );

    // Attach user info to request
    req.auth = {
      userId: session.userId,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }
};
```

### Task 3.3: Create Clerk Webhook Handler
Create `backend/functions/src/webhooks/clerk.ts`:
```typescript
import { Webhook } from 'svix';
import { UserService } from '../services/userService';

export const handleClerkWebhook = async (req: Request, res: Response) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  // Verify webhook signature
  const wh = new Webhook(webhookSecret);
  const payload = wh.verify(
    JSON.stringify(req.body),
    req.headers as Record<string, string>
  );

  const { type, data } = payload;

  switch (type) {
    case 'user.created':
      await UserService.create({
        clerkUserId: data.id,
        email: data.email_addresses[0]?.email_address,
        displayName: `${data.first_name} ${data.last_name}`.trim(),
        imageUrl: data.image_url,
      });
      break;

    case 'user.updated':
      await UserService.update(data.id, {
        email: data.email_addresses[0]?.email_address,
        displayName: `${data.first_name} ${data.last_name}`.trim(),
        imageUrl: data.image_url,
      });
      break;

    case 'user.deleted':
      await UserService.softDelete(data.id);
      break;
  }

  res.status(200).json({ received: true });
};
```

---

## Phase 4: API Migration (Days 7-8)

### Task 4.1: Update API Endpoints
Migrate each endpoint from Firestore to Prisma:

| Old (Firestore) | New (Prisma) |
|-----------------|--------------|
| `usersCollection.doc(userId).get()` | `prisma.user.findUnique({ where: { clerkUserId } })` |
| `citiesCollection.orderBy('rank').get()` | `prisma.city.findMany({ orderBy: { rank: 'asc' } })` |
| `getPlansCollection(cityId).limit(10).get()` | `prisma.plan.findMany({ where: { cityId }, take: 10 })` |

### Task 4.2: Maintain Response Format Compatibility
Keep the same response format for iOS compatibility:
```typescript
// Cities endpoint
app.get('/cities', requireAuth, async (req, res) => {
  const cities = await prisma.city.findMany({
    orderBy: { rank: 'asc' },
    take: 100
  });

  // Transform to match existing iOS expectations
  res.json({
    success: true,
    cities: cities.map(city => ({
      cityId: city.cityId,  // Use legacy ID format
      name: city.name,
      country: city.country,
      rank: city.rank,
      displayAssets: {
        heroImage: city.heroImage,
        cardImage: city.cardImage,
        accentColor: city.accentColor
      },
      metadata: {
        totalPlansThisWeek: city.totalPlansThisWeek,
        featured: city.featured
      }
    })),
    total: cities.length
  });
});
```

### Task 4.3: Update Subscription Validation
Link StoreKit transactions to Clerk userId:
```typescript
app.post('/subscription/validate', requireAuth, async (req, res) => {
  const { transactionId, productId, receiptData } = req.body;
  const clerkUserId = req.auth.userId;

  // Validate with Apple
  const validationResult = await validateAppleReceipt(receiptData);

  if (validationResult.isValid) {
    // Update subscription in database
    await prisma.subscription.update({
      where: { clerkUserId },
      data: {
        status: 'PRO',
        tier: 'PRO',
        transactionId,
        productId,
        expiryDate: validationResult.expiryDate,
        autoRenew: validationResult.autoRenew,
        maxCitiesPerWeek: 100,
        maxPlansPerCity: 50,
        weekendAccess: true,
        groupPlansAccess: true,
        savedCitiesAccess: true,
      }
    });

    res.json({ success: true, subscription: { status: 'pro', tier: 'pro' } });
  } else {
    res.status(400).json({
      success: false,
      error: { code: 'SUBSCRIPTION_INVALID', message: 'Receipt validation failed' }
    });
  }
});
```

---

## Phase 5: Data Migration (Day 9)

### Task 5.1: Create Migration Script
Create `backend/functions/src/scripts/migrateFromFirestore.ts`:
```typescript
import { db } from '../config/firestore';
import { prisma } from '../lib/prisma';

async function migrateUsers() {
  const usersSnapshot = await db.collection('users').get();

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();

    // Create user in Prisma (will need Clerk ID mapping)
    await prisma.user.create({
      data: {
        clerkUserId: `migrate_${doc.id}`, // Temporary - will be updated when user signs in with Clerk
        email: userData.email,
        displayName: userData.displayName,
        subscription: {
          create: {
            clerkUserId: `migrate_${doc.id}`,
            status: userData.subscription.status.toUpperCase(),
            tier: userData.subscription.tier.toUpperCase(),
            transactionId: userData.subscription.transactionId,
            productId: userData.subscription.productId,
            // ... map other fields
          }
        }
      }
    });
  }
}

async function migrateCities() {
  const citiesSnapshot = await db.collection('cities').get();

  for (const doc of citiesSnapshot.docs) {
    const cityData = doc.data();

    await prisma.city.create({
      data: {
        cityId: doc.id,
        name: cityData.name,
        country: cityData.country,
        countryCode: cityData.countryCode,
        rank: cityData.rank,
        timezone: cityData.timezone,
        heroImage: cityData.displayAssets?.heroImage,
        cardImage: cityData.displayAssets?.cardImage,
        accentColor: cityData.displayAssets?.accentColor,
        latitude: cityData.coordinates?.latitude,
        longitude: cityData.coordinates?.longitude,
        totalPlansThisWeek: cityData.metadata?.totalPlansThisWeek || 0,
        featured: cityData.metadata?.featured || false,
      }
    });
  }
}

async function migratePlans() {
  // Migrate all plans from all cities
  const citiesSnapshot = await db.collection('cities').get();

  for (const cityDoc of citiesSnapshot.docs) {
    const plansSnapshot = await cityDoc.ref.collection('plans').get();

    for (const planDoc of plansSnapshot.docs) {
      const planData = planDoc.data();
      const city = await prisma.city.findUnique({ where: { cityId: cityDoc.id } });

      await prisma.plan.create({
        data: {
          planId: planDoc.id,
          cityId: city.id,
          rank: planData.rank,
          title: planData.title,
          venueName: planData.venueName,
          description: planData.description,
          category: planData.category,
          type: planData.type?.toUpperCase() || 'BAR',
          // ... map all fields
        }
      });
    }
  }
}

// Run migration
async function main() {
  console.log('Starting migration...');
  await migrateCities();
  await migratePlans();
  await migrateUsers();
  console.log('Migration complete!');
}

main().catch(console.error);
```

---

## Testing Checklist

### Phase 1: Infrastructure
- [ ] PostgreSQL running locally via Docker
- [ ] Prisma schema compiles without errors
- [ ] Initial migration runs successfully
- [ ] Prisma Client generates correctly

### Phase 2: Services
- [ ] UserService CRUD operations work
- [ ] CityService queries return correct data
- [ ] SubscriptionService updates work

### Phase 3: Clerk
- [ ] Clerk middleware authenticates requests
- [ ] Webhook handler creates users on `user.created`
- [ ] Webhook handler updates users on `user.updated`

### Phase 4: API
- [ ] All endpoints return same format as before
- [ ] Authentication works with Clerk tokens
- [ ] Subscription validation links to Clerk userId

### Phase 5: Migration
- [ ] All Firestore data exported
- [ ] Data transforms correctly
- [ ] All data imported to PostgreSQL
- [ ] Data integrity verified

---

## Files to Create/Modify

### New Files:
```
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docker-compose.yml
├── functions/src/
│   ├── lib/
│   │   └── prisma.ts
│   ├── services/
│   │   ├── userService.ts
│   │   ├── cityService.ts
│   │   ├── planService.ts
│   │   ├── subscriptionService.ts
│   │   └── index.ts
│   ├── middleware/
│   │   └── clerkAuth.ts
│   ├── webhooks/
│   │   └── clerk.ts
│   └── scripts/
│       └── migrateFromFirestore.ts
```

### Modified Files:
- `backend/functions/src/index.ts` - Add new routes
- `backend/functions/src/api/*.ts` - Update to use Prisma
- `backend/functions/package.json` - Add Prisma dependencies

---

## Daily Log Template

```markdown
### Backend Engineer (Sprint 5 - Prisma/Clerk Migration)
- **Date**: [Date]
- **Phase**: [1-5]

#### Tasks Completed:
-

#### Files Created/Modified:
-

#### Technical Decisions:
-

#### Blockers:
-

#### Next Steps:
-
```

---

## Important Notes

1. **Backward Compatibility**: Maintain iOS API response formats during migration
2. **Zero Downtime**: Plan for parallel running of old and new systems
3. **Data Integrity**: Verify all data after migration
4. **Clerk User Mapping**: Handle mapping old iCloud users to new Clerk users
5. **Subscription Continuity**: Ensure existing Pro users retain access

---

**Reference Documents**:
- Full migration plan: `SPRINT_5_PRISMA_CLERK_MIGRATION.md`
- Original backend specs: `backend-specs.md`
- Prisma docs: https://www.prisma.io/docs
- Clerk docs: https://clerk.com/docs
- PlanetScale docs: https://planetscale.com/docs

Good luck! This is a significant undertaking, but the result will be a more maintainable and scalable system.
