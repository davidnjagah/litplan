# Litplan Production Deployment Checklist

**Sprint 6 Phase 7 - Production Deployment Guide**
**Date:** 2024-12-29

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables](#environment-variables)
3. [Vercel Deployment Steps](#vercel-deployment-steps)
4. [iOS App Store Submission](#ios-app-store-submission)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring Setup](#monitoring-setup)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All E2E tests passing locally (`npm run test:endpoints`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] All dependencies up to date
- [ ] No security vulnerabilities (`npm audit`)

### Database

- [ ] Supabase production project created
- [ ] Database schema migrated (`npx prisma migrate deploy`)
- [ ] Seed data NOT applied to production (or selectively applied)
- [ ] Connection pooling configured for serverless
- [ ] Row Level Security (RLS) policies reviewed

### Storage

- [ ] Production storage buckets created
- [ ] Public access policies configured
- [ ] Bucket URLs verified

### Authentication

- [ ] Apple Sign In configured in Supabase
- [ ] Google OAuth configured (if used)
- [ ] Email templates customized
- [ ] Redirect URLs configured for production

### API

- [ ] All endpoints tested locally
- [ ] Rate limiting considered
- [ ] CORS configured for production domains
- [ ] Error handling comprehensive

---

## Environment Variables

### Required for Vercel

Create these in Vercel Dashboard > Project Settings > Environment Variables:

```bash
# Database (Supabase Postgres)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# App Configuration
NODE_ENV="production"
```

### Variable Sources

| Variable | Where to Find |
|----------|---------------|
| DATABASE_URL | Supabase Dashboard > Settings > Database > Connection String (Pooler) |
| DIRECT_URL | Supabase Dashboard > Settings > Database > Connection String (Direct) |
| SUPABASE_URL | Supabase Dashboard > Settings > API > Project URL |
| SUPABASE_ANON_KEY | Supabase Dashboard > Settings > API > anon key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Dashboard > Settings > API > service_role key |

### Security Notes

- NEVER commit environment variables to git
- Use Vercel's encrypted environment variables
- Rotate service role key if exposed
- Use different keys for staging vs production

---

## Vercel Deployment Steps

### Initial Setup

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link Project**
   ```bash
   cd backend/functions
   vercel link
   ```

4. **Configure Environment Variables**
   - Go to Vercel Dashboard > [Project] > Settings > Environment Variables
   - Add all required variables for Production environment
   - Optionally add for Preview/Development

### Deploy to Production

1. **Preview Deployment** (recommended first)
   ```bash
   vercel
   ```
   - Test the preview URL thoroughly
   - Run E2E tests against preview

2. **Production Deployment**
   ```bash
   vercel --prod
   ```

3. **Verify Deployment**
   ```bash
   # Test health endpoint
   curl https://your-project.vercel.app/health

   # Test cities endpoint
   curl https://your-project.vercel.app/api/v2/cities
   ```

### Vercel Configuration

The `vercel.json` is already configured:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

### Domain Configuration

1. Go to Vercel Dashboard > [Project] > Settings > Domains
2. Add custom domain (e.g., `api.litplan.app`)
3. Configure DNS according to Vercel instructions
4. Enable SSL (automatic)

---

## iOS App Store Submission

### Pre-Submission Checklist

- [ ] Supabase Swift SDK installed via SPM
- [ ] Production API URL configured
- [ ] App icons and screenshots ready
- [ ] App Store Connect account set up
- [ ] Privacy policy URL available
- [ ] Terms of service URL available

### SDK Installation

1. Open Xcode project
2. File > Add Packages...
3. Enter URL: `https://github.com/supabase/supabase-swift.git`
4. Select version `2.0.0` or later
5. Add to Litplan target

### Update Configuration

Update `Config.swift` with production values:
```swift
static let supabaseURL = "https://[project-ref].supabase.co"
static let supabaseAnonKey = "eyJhbGc..."
static let apiBaseURL = "https://api.litplan.app/api/v2"
```

### StoreKit Configuration

1. Configure products in App Store Connect
2. Test sandbox purchases
3. Verify subscription validation endpoint
4. Test restore purchases

### Submission Steps

1. Archive app in Xcode (Product > Archive)
2. Upload to App Store Connect
3. Fill in app metadata
4. Add screenshots and previews
5. Submit for review

### App Review Notes

Include for Apple reviewers:
- Demo account credentials (if applicable)
- Steps to test subscription features
- Note about sandbox vs production

---

## Post-Deployment Verification

### API Endpoints

Run the E2E test against production:
```bash
TEST_BASE_URL=https://api.litplan.app npm run test:endpoints
```

### Manual Verification

| Check | Command/Action | Expected Result |
|-------|----------------|-----------------|
| Health | `curl https://api.litplan.app/health` | `{ status: "healthy" }` |
| Cities List | `curl https://api.litplan.app/api/v2/cities` | List of cities |
| Config | `curl https://api.litplan.app/api/v2/config` | App config |
| Auth Required | `curl https://api.litplan.app/api/v2/subscription` | 401 error |

### iOS App Verification

- [ ] App launches successfully
- [ ] Sign in with Apple works
- [ ] Cities load and display
- [ ] Navigation works correctly
- [ ] Paywall displays for free users
- [ ] Subscription purchase works (sandbox)
- [ ] Pro features unlock after purchase

### Database Verification

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check city count
SELECT COUNT(*) FROM "City";

-- Check plan count
SELECT COUNT(*) FROM "Plan";
```

---

## Rollback Procedures

### Vercel Rollback

1. **Instant Rollback via Dashboard**
   - Go to Vercel Dashboard > [Project] > Deployments
   - Find previous working deployment
   - Click "..." > "Promote to Production"

2. **CLI Rollback**
   ```bash
   # List deployments
   vercel ls

   # Rollback to specific deployment
   vercel alias [deployment-url] [production-domain]
   ```

### Database Rollback

1. **Restore from Backup**
   - Supabase provides daily backups
   - Go to Supabase Dashboard > Database > Backups
   - Restore to specific point in time

2. **Migration Rollback**
   ```bash
   # Rollback last migration (if possible)
   npx prisma migrate rollback
   ```

### iOS Rollback

1. If app approved: Submit new version with fix
2. If in review: Cancel submission, fix, resubmit
3. Emergency: Contact Apple for expedited review

---

## Monitoring Setup

### Vercel Analytics

1. Enable Analytics in Vercel Dashboard
2. Monitor:
   - Request count
   - Error rate
   - Response times
   - Serverless function duration

### Supabase Monitoring

1. Dashboard > Database > Query Performance
2. Dashboard > Auth > User Management
3. Dashboard > Storage > Usage

### Recommended Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% | Investigate immediately |
| Response Time | > 2s avg | Check database/function |
| Database Connections | > 80% pool | Increase pool size |
| Storage Usage | > 80% quota | Upgrade plan or cleanup |

### Logging

```typescript
// Recommended logging format
console.log(JSON.stringify({
  level: 'error',
  message: 'Failed to fetch cities',
  error: error.message,
  timestamp: new Date().toISOString(),
  requestId: req.headers['x-vercel-id'],
}));
```

### Health Check Endpoint

The `/health` endpoint provides:
- Server status
- Database connectivity
- Response latency

Use for uptime monitoring services (Pingdom, UptimeRobot, etc.)

---

## Quick Reference

### Commands

```bash
# Build
npm run build

# Test locally
npm run dev
npm run test:endpoints

# Deploy preview
vercel

# Deploy production
vercel --prod

# Check logs
vercel logs [deployment-url]
```

### Important URLs

| Service | URL |
|---------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase Dashboard | https://app.supabase.com |
| App Store Connect | https://appstoreconnect.apple.com |

### Emergency Contacts

- Vercel Status: https://www.vercel-status.com/
- Supabase Status: https://status.supabase.com/
- Apple Developer: https://developer.apple.com/support/

---

## Final Checklist

Before considering deployment complete:

- [ ] Production API is live and responding
- [ ] All E2E tests pass against production
- [ ] iOS app connects to production API
- [ ] Authentication flows work end-to-end
- [ ] Subscription purchases work in sandbox
- [ ] Monitoring is configured
- [ ] Rollback procedure tested
- [ ] Team notified of deployment
