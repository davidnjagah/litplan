# Sprint 6: Supabase Migration Plan

## Overview

Migrate Litplan from Firebase/Clerk to Supabase while **keeping StoreKit 2** for iOS payments.

### Migration Scope

| Component | From | To | Effort |
|-----------|------|-----|--------|
| Database | PostgreSQL (Prisma) | Supabase Postgres (keep Prisma) | Low |
| Auth | Clerk | Supabase Auth | Medium |
| Storage | Firebase Storage | Supabase Storage | Low |
| Backend | Firebase Cloud Functions | Supabase Edge Functions | Medium-High |
| Payments | StoreKit 2 | **Keep StoreKit 2** | None |

### What Stays the Same
- ✅ Prisma ORM and schema
- ✅ StoreKit 2 payment integration
- ✅ Subscription validation logic
- ✅ iOS payment UI
- ✅ Database models (User, Subscription, City, Plan, etc.)

### What Changes
- 🔄 Auth provider (Clerk → Supabase Auth)
- 🔄 Auth middleware
- 🔄 User ID references (`clerkUserId` → `supabaseUserId`)
- 🔄 Image storage URLs
- 🔄 Backend deployment (Cloud Functions → Edge Functions)

---

## Phase 1: Supabase Project Setup (Day 1-2)

### 1.1 Create Supabase Project
- [ ] Create new Supabase project at supabase.com
- [ ] Note down project URL and anon/service keys
- [ ] Enable required auth providers (Apple, Google, Email)

### 1.2 Database Setup
- [ ] Get Supabase Postgres connection string
- [ ] Update `.env` with new `DATABASE_URL`
- [ ] Run Prisma migrations against Supabase Postgres
- [ ] Verify tables created correctly
- [ ] Run seed script to populate test data

### 1.3 Update Prisma Schema
```prisma
// Update User model
model User {
  id              String    @id @default(cuid())
  supabaseUserId  String    @unique  // Changed from clerkUserId
  email           String?   @unique
  displayName     String?
  imageUrl        String?
  // ... rest stays the same
}

model Subscription {
  // ...
  supabaseUserId  String    @unique  // Changed from clerkUserId
  // StoreKit fields STAY THE SAME
  transactionId         String?
  productId             String?
  originalTransactionId String?
  // ...
}
```

### 1.4 Storage Setup
- [ ] Create Supabase Storage bucket: `city-images`
- [ ] Create bucket: `plan-images`
- [ ] Set up public access policies
- [ ] Note bucket URLs for image migration

### 1.5 Environment Variables
```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database (Supabase Postgres)
DATABASE_URL=postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres

# Keep existing
NODE_ENV=development
```

### Deliverables
- [ ] Supabase project created and configured
- [ ] Database connected and migrated
- [ ] Storage buckets created
- [ ] Environment variables documented

---

## Phase 2: Supabase Auth Integration (Day 3-5)

### 2.1 Install Supabase SDK
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-express
```

### 2.2 Create Supabase Config
**File: `src/config/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Client for verifying user tokens
export const supabaseAuth = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY!
);

export { supabaseUrl };
```

### 2.3 Create Auth Middleware
**File: `src/middleware/supabaseAuth.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { UserService, SubscriptionService } from '../services/prisma';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;      // Supabase user ID
    email?: string;
  };
  user?: {
    id: string;          // Database user ID
    supabaseUserId: string;
    email?: string;
    subscription?: any;
  };
}

// Verify Supabase JWT token
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
    }

    req.auth = {
      userId: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
    });
  }
};

// Load user from database (create if first login)
export const loadUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
    }

    // Try to get existing user
    let user = await UserService.getUserBySupabaseId(req.auth.userId);

    // Create user on first login
    if (!user) {
      user = await UserService.createUser({
        supabaseUserId: req.auth.userId,
        email: req.auth.email,
      });
    }

    // Load subscription
    const subscription = await SubscriptionService.getSubscriptionByUserId(user.id);

    req.user = {
      ...user,
      subscription,
    };

    next();
  } catch (error) {
    console.error('Load user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'USER_LOAD_ERROR', message: 'Failed to load user' },
    });
  }
};

// Combined middleware
export const requireAuthWithUser = [requireAuth, loadUser];

// Pro tier check
export const requireProTier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.subscription || req.user.subscription.tier !== 'PRO') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PRO_FEATURE_REQUIRED',
        message: 'This feature requires a Pro subscription',
      },
    });
  }
  next();
};

export const requireProWithUser = [...requireAuthWithUser, requireProTier];
```

### 2.4 Update UserService
**File: `src/services/prisma/UserService.ts`** (modifications)
```typescript
// Rename clerkUserId methods to supabaseUserId

static async getUserBySupabaseId(supabaseUserId: string) {
  return prisma.user.findUnique({
    where: { supabaseUserId },
  });
}

static async createUser(data: {
  supabaseUserId: string;
  email?: string;
  displayName?: string;
  imageUrl?: string;
}) {
  // Create user
  const user = await prisma.user.create({
    data: {
      supabaseUserId: data.supabaseUserId,
      email: data.email,
      displayName: data.displayName || data.email?.split('@')[0],
      imageUrl: data.imageUrl,
    },
  });

  // Create free subscription
  await prisma.subscription.create({
    data: {
      userId: user.id,
      supabaseUserId: data.supabaseUserId,
      status: 'FREE',
      tier: 'FREE',
      maxCitiesPerWeek: 1,
      maxPlansPerCity: 10,
      weekendAccess: false,
      groupPlansAccess: false,
      savedCitiesAccess: false,
    },
  });

  return user;
}
```

### 2.5 Create Auth Routes
**File: `src/api/routes/v2/auth.ts`** (update)
```typescript
import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth, loadUser } from '../../../middleware/supabaseAuth';
import { UserService, SubscriptionService } from '../../../services/prisma';

const router = Router();

// POST /api/v2/auth/sync - Sync Supabase user to database
router.post('/sync', requireAuth, loadUser, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      message: 'User synced successfully',
    },
  });
});

// GET /api/v2/auth/me - Get current user
router.get('/me', requireAuth, loadUser, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

// DELETE /api/v2/auth/account - Delete account
router.delete('/account', requireAuth, loadUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await UserService.deleteUser(req.user!.id);
    res.json({
      success: true,
      data: { message: 'Account deleted successfully' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to delete account' },
    });
  }
});

export default router;
```

### 2.6 Update All Route Files
Replace Clerk middleware imports with Supabase middleware:
```typescript
// Before
import { requireAuthWithUser, requireProWithUser } from '../../../middleware/clerkAuth';

// After
import { requireAuthWithUser, requireProWithUser } from '../../../middleware/supabaseAuth';
```

**Files to update:**
- `src/api/routes/v2/cities.ts`
- `src/api/routes/v2/plans.ts`
- `src/api/routes/v2/groupFlows.ts`
- `src/api/routes/v2/user.ts`
- `src/api/routes/v2/subscription.ts`

### Deliverables
- [ ] Supabase SDK installed
- [ ] Supabase config created
- [ ] Auth middleware created
- [ ] UserService updated for Supabase IDs
- [ ] All routes updated to use Supabase auth
- [ ] Auth routes working

---

## Phase 3: Database Migration (Day 6-7)

### 3.1 Update Prisma Schema
**File: `prisma/schema.prisma`**
```prisma
model User {
  id              String    @id @default(cuid())
  supabaseUserId  String    @unique  // CHANGED from clerkUserId
  email           String?   @unique
  displayName     String?
  imageUrl        String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  subscription  Subscription?
  activities    UserActivity[]
  savedCities   SavedCity[]
  viewedCities  ViewedCity[]

  @@index([supabaseUserId])
  @@index([email])
}

model Subscription {
  id                    String             @id @default(cuid())
  userId                String             @unique
  supabaseUserId        String             @unique  // CHANGED from clerkUserId

  status                SubscriptionStatus @default(FREE)
  tier                  SubscriptionTier   @default(FREE)

  startDate             DateTime?
  expiryDate            DateTime?
  autoRenew             Boolean            @default(false)

  // StoreKit fields - UNCHANGED
  transactionId         String?
  productId             String?
  originalTransactionId String?

  // Entitlements - UNCHANGED
  maxCitiesPerWeek      Int                @default(1)
  maxPlansPerCity       Int                @default(10)
  weekendAccess         Boolean            @default(false)
  groupPlansAccess      Boolean            @default(false)
  savedCitiesAccess     Boolean            @default(false)

  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([supabaseUserId])
  @@index([transactionId])
  @@index([status])
}

// All other models UNCHANGED
```

### 3.2 Create Migration
```bash
# Create migration for field rename
npx prisma migrate dev --name rename_clerk_to_supabase

# Generate client
npx prisma generate
```

### 3.3 Update Seed Script
**File: `prisma/seed.ts`** - Update user creation:
```typescript
// Free user
const freeUser = await prisma.user.create({
  data: {
    supabaseUserId: 'test-free-user-supabase',  // Changed
    email: 'free@test.litplan.app',
    displayName: 'Free Test User',
  },
});

// Pro user
const proUser = await prisma.user.create({
  data: {
    supabaseUserId: 'test-pro-user-supabase',  // Changed
    email: 'pro@test.litplan.app',
    displayName: 'Pro Test User',
  },
});
```

### 3.4 Run Migration on Supabase
```bash
# Point to Supabase database
export DATABASE_URL="postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres"

# Run migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

### Deliverables
- [ ] Schema updated with `supabaseUserId`
- [ ] Migration created and applied
- [ ] Seed script updated
- [ ] Database seeded on Supabase

---

## Phase 4: Storage Migration (Day 8-9)

### 4.1 Create Storage Service
**File: `src/services/supabase/StorageService.ts`**
```typescript
import { supabaseAdmin } from '../../config/supabase';

export class StorageService {
  private static CITY_BUCKET = 'city-images';
  private static PLAN_BUCKET = 'plan-images';

  static async uploadCityImage(
    cityId: string,
    file: Buffer,
    filename: string
  ): Promise<string> {
    const path = `${cityId}/${filename}`;

    const { data, error } = await supabaseAdmin.storage
      .from(this.CITY_BUCKET)
      .upload(path, file, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(this.CITY_BUCKET)
      .getPublicUrl(path);

    return publicUrl;
  }

  static async uploadPlanImage(
    planId: string,
    file: Buffer,
    filename: string
  ): Promise<string> {
    const path = `${planId}/${filename}`;

    const { data, error } = await supabaseAdmin.storage
      .from(this.PLAN_BUCKET)
      .upload(path, file, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(this.PLAN_BUCKET)
      .getPublicUrl(path);

    return publicUrl;
  }

  static getPublicUrl(bucket: string, path: string): string {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);
    return publicUrl;
  }
}
```

### 4.2 Image Migration Script
**File: `scripts/migrateImages.ts`**
```typescript
// Script to migrate existing images from Unsplash URLs
// to Supabase Storage (optional - can keep Unsplash URLs)

import prisma from '../src/lib/prisma';
import { StorageService } from '../src/services/supabase/StorageService';

async function migrateImages() {
  console.log('Image migration not required - using Unsplash URLs');
  console.log('If you want to host images on Supabase, implement this script');

  // For now, Unsplash URLs work fine
  // Only migrate if you want to self-host images
}

migrateImages();
```

### 4.3 Storage Bucket Policies (Supabase Dashboard)
```sql
-- City images: Public read access
CREATE POLICY "Public read access for city images"
ON storage.objects FOR SELECT
USING (bucket_id = 'city-images');

-- Plan images: Public read access
CREATE POLICY "Public read access for plan images"
ON storage.objects FOR SELECT
USING (bucket_id = 'plan-images');
```

### Deliverables
- [ ] Storage service created
- [ ] Buckets created with policies
- [ ] Image URLs working (keeping Unsplash for now)

---

## Phase 5: Edge Functions Migration (Day 10-13)

### Option A: Keep Express (Recommended for Speed)
Deploy Express backend to:
- **Vercel** (serverless)
- **Railway** (containers)
- **Render** (containers)
- **Supabase Edge Functions** (requires Deno rewrite)

### Option B: Convert to Edge Functions (Deno)

### 5.1 Project Structure for Edge Functions
```
supabase/
├── functions/
│   ├── cities/
│   │   └── index.ts
│   ├── plans/
│   │   └── index.ts
│   ├── user/
│   │   └── index.ts
│   ├── subscription/
│   │   └── index.ts
│   ├── config/
│   │   └── index.ts
│   └── _shared/
│       ├── supabase.ts
│       ├── prisma.ts
│       └── cors.ts
```

### 5.2 Example Edge Function
**File: `supabase/functions/cities/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname;

    // GET /cities
    if (req.method === 'GET' && path === '/cities') {
      const { data: cities, error } = await supabase
        .from('City')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: { cities } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /cities/featured
    if (req.method === 'GET' && path === '/cities/featured') {
      const { data: cities, error } = await supabase
        .from('City')
        .select('*')
        .eq('featured', true)
        .order('rank', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: { cities } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 5.3 Scheduled Functions (Supabase Cron)
**Weekly Plan Refresh:**
```sql
-- In Supabase Dashboard > Database > Extensions
-- Enable pg_cron

-- Schedule weekly refresh
SELECT cron.schedule(
  'weekly-plan-refresh',
  '0 0 * * 1', -- Every Monday at midnight
  $$
  SELECT net.http_post(
    url := 'https://xxxx.supabase.co/functions/v1/weekly-refresh',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);
```

### 5.4 Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref xxxx

# Deploy functions
supabase functions deploy cities
supabase functions deploy plans
supabase functions deploy user
supabase functions deploy subscription
supabase functions deploy config
```

### Deliverables
- [ ] Edge functions created (or Express deployed elsewhere)
- [ ] All API endpoints working
- [ ] Scheduled functions configured
- [ ] Functions deployed

---

## Phase 6: iOS App Updates (Day 14-17)

### 6.1 Install Supabase Swift SDK
**File: `Package.swift` or SPM**
```swift
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0")
]
```

### 6.2 Create Supabase Client
**File: `Services/SupabaseManager.swift`**
```swift
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: URL(string: "https://xxxx.supabase.co")!,
            supabaseKey: "your-anon-key"
        )
    }

    // Get current session
    var currentSession: Session? {
        get async {
            try? await client.auth.session
        }
    }

    // Get access token for API calls
    var accessToken: String? {
        get async {
            try? await client.auth.session?.accessToken
        }
    }
}
```

### 6.3 Update AuthenticationManager
**File: `Services/AuthenticationManager.swift`**
```swift
import Supabase
import AuthenticationServices

class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?

    private let supabase = SupabaseManager.shared.client

    init() {
        Task {
            await checkSession()
        }
    }

    func checkSession() async {
        do {
            let session = try await supabase.auth.session
            await MainActor.run {
                self.isAuthenticated = session != nil
            }
            if session != nil {
                await syncUserToBackend()
            }
        } catch {
            await MainActor.run {
                self.isAuthenticated = false
            }
        }
    }

    // Sign in with Apple
    func signInWithApple(credential: ASAuthorizationAppleIDCredential) async throws {
        guard let identityToken = credential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8) else {
            throw AuthError.invalidCredential
        }

        try await supabase.auth.signInWithIdToken(
            credentials: .init(
                provider: .apple,
                idToken: tokenString
            )
        )

        await MainActor.run {
            self.isAuthenticated = true
        }

        await syncUserToBackend()
    }

    // Sign in with Google
    func signInWithGoogle() async throws {
        // Use Supabase OAuth flow
        try await supabase.auth.signInWithOAuth(provider: .google)
    }

    // Sign in with Email
    func signInWithEmail(email: String, password: String) async throws {
        try await supabase.auth.signIn(email: email, password: password)
        await MainActor.run {
            self.isAuthenticated = true
        }
        await syncUserToBackend()
    }

    // Sign up with Email
    func signUpWithEmail(email: String, password: String) async throws {
        try await supabase.auth.signUp(email: email, password: password)
    }

    // Sign out
    func signOut() async throws {
        try await supabase.auth.signOut()
        await MainActor.run {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }

    // Sync user to backend database
    private func syncUserToBackend() async {
        guard let token = await SupabaseManager.shared.accessToken else { return }

        do {
            let user = try await APIService.shared.syncUser(token: token)
            await MainActor.run {
                self.currentUser = user
            }
        } catch {
            print("Failed to sync user: \(error)")
        }
    }
}
```

### 6.4 Update APIService
**File: `Services/APIService.swift`**
```swift
class APIService {
    static let shared = APIService()

    private let baseURL = "https://xxxx.supabase.co/functions/v1"
    // Or if using external hosting:
    // private let baseURL = "https://api.litplan.app/api/v2"

    private func getAuthHeaders() async -> [String: String] {
        var headers = ["Content-Type": "application/json"]
        if let token = await SupabaseManager.shared.accessToken {
            headers["Authorization"] = "Bearer \(token)"
        }
        return headers
    }

    // Sync user to backend
    func syncUser(token: String) async throws -> User {
        let url = URL(string: "\(baseURL)/auth/sync")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(APIResponse<UserData>.self, from: data)
        return response.data.user
    }

    // Get cities
    func getCities() async throws -> [City] {
        let url = URL(string: "\(baseURL)/cities")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(APIResponse<CitiesData>.self, from: data)
        return response.data.cities
    }

    // Get plans (authenticated)
    func getPlans(cityId: String) async throws -> [Plan] {
        let url = URL(string: "\(baseURL)/cities/\(cityId)/plans")!
        var request = URLRequest(url: url)
        request.allHTTPHeaderFields = await getAuthHeaders()

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(APIResponse<PlansData>.self, from: data)
        return response.data.plans
    }

    // ... other API methods stay similar, just update base URL
}
```

### 6.5 SubscriptionManager - Keep StoreKit 2
**File: `Services/SubscriptionManager.swift`** - MINIMAL CHANGES
```swift
// StoreKit 2 code stays the same!
// Only change: Update backend validation endpoint URL

func validateWithBackend(transaction: Transaction) async throws {
    // Same StoreKit validation, just different URL
    let url = URL(string: "\(APIService.shared.baseURL)/subscription/validate")!

    // Rest of validation logic stays the same
    // transactionId, productId, originalTransactionId all stay the same
}
```

### Deliverables
- [ ] Supabase Swift SDK installed
- [ ] SupabaseManager created
- [ ] AuthenticationManager updated
- [ ] APIService updated with new URLs
- [ ] SubscriptionManager unchanged (StoreKit 2 stays)
- [ ] All auth flows working

---

## Phase 7: Testing & Deployment (Day 18-20)

### 7.1 Backend Testing
```bash
# Test health
curl https://xxxx.supabase.co/functions/v1/health

# Test cities (public)
curl https://xxxx.supabase.co/functions/v1/cities

# Test auth (with token)
curl -H "Authorization: Bearer $TOKEN" \
  https://xxxx.supabase.co/functions/v1/user/profile
```

### 7.2 iOS Testing Checklist
- [ ] Sign in with Apple works
- [ ] Sign in with Google works
- [ ] Sign in with Email works
- [ ] Sign out works
- [ ] Cities load correctly
- [ ] Plans load with auth
- [ ] StoreKit purchase flow works
- [ ] Subscription status reflects correctly
- [ ] Pro features unlock properly

### 7.3 StoreKit Testing
- [ ] Sandbox purchases work
- [ ] Receipt validation succeeds
- [ ] Subscription upgrade works
- [ ] Subscription restore works
- [ ] Entitlements update correctly

### 7.4 Production Deployment
- [ ] Enable production Supabase project
- [ ] Update iOS app with production URLs
- [ ] Submit to App Store
- [ ] Monitor for issues

### Deliverables
- [ ] All tests passing
- [ ] Production deployed
- [ ] App Store submission ready

---

## Summary

### Timeline
| Phase | Days | Description |
|-------|------|-------------|
| Phase 1 | 1-2 | Supabase project setup |
| Phase 2 | 3-5 | Auth integration |
| Phase 3 | 6-7 | Database migration |
| Phase 4 | 8-9 | Storage migration |
| Phase 5 | 10-13 | Edge functions / backend |
| Phase 6 | 14-17 | iOS app updates |
| Phase 7 | 18-20 | Testing & deployment |
| **Total** | **20 days** | ~4 weeks |

### Risk Assessment
| Risk | Level | Mitigation |
|------|-------|------------|
| Auth migration | Medium | Test thoroughly, support both during transition |
| Edge Functions (Deno) | Medium | Option to keep Express on Vercel/Railway |
| StoreKit validation | Low | No changes needed |
| Data migration | Low | Same PostgreSQL, just different host |

### What's NOT Changing
- ✅ Prisma ORM
- ✅ Database schema (except user ID field name)
- ✅ StoreKit 2 payments
- ✅ Subscription logic
- ✅ iOS payment UI
- ✅ Entitlement system

### Team Assignments
- **Backend Engineer**: Phases 1-5 (Auth, Database, Edge Functions)
- **UI Designer**: Phase 6 (iOS Auth UI updates)
- **QA Tester**: Phase 7 (Full testing)
- **PM**: Coordination, App Store submission

---

## Quick Start Commands

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login and link
supabase login
supabase link --project-ref your-project-ref

# 3. Update database URL
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# 4. Run migrations
npx prisma migrate deploy
npx prisma db seed

# 5. Deploy functions
supabase functions deploy --all

# 6. Test
curl https://xxx.supabase.co/functions/v1/cities
```
