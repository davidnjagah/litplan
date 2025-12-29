# Production Deployment Guide

**Litplan Backend - Firebase Cloud Functions**
**Sprint 4, Day 18 - Production Readiness**

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Firebase Project Configuration](#firebase-project-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring Setup](#monitoring-setup)
8. [Cost Management](#cost-management)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] All tests passing locally
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] All environment variables documented in `.env.example`
- [ ] Security audit completed (no exposed secrets)
- [ ] Code review completed and approved
- [ ] DAILY_LOG.md updated with latest changes
- [ ] API documentation up to date

### Infrastructure Readiness

- [ ] Firebase project created (production)
- [ ] Firestore database initialized
- [ ] Firebase Storage bucket configured
- [ ] Firebase Authentication enabled
- [ ] Billing account linked to Firebase project
- [ ] Budget alerts configured
- [ ] Cloud Monitoring dashboards created
- [ ] Alert policies configured

### External Services

- [ ] Anthropic API key generated (production)
- [ ] Apple shared secret obtained (production)
- [ ] All API keys verified and tested
- [ ] Rate limits understood and configured
- [ ] External service status pages bookmarked

### Security

- [ ] Firestore Security Rules reviewed and tested
- [ ] Environment variables secured (not in Git)
- [ ] CORS policy configured for production domains only
- [ ] Rate limiting enabled on all endpoints
- [ ] Security headers configured
- [ ] Authentication middleware on all protected routes

---

## Environment Setup

### 1. Production vs Staging Environments

We recommend maintaining at least two environments:

| Environment | Purpose | Firebase Project | Branch |
|-------------|---------|------------------|--------|
| **Staging** | Pre-production testing | `litplan-staging` | `develop` |
| **Production** | Live user traffic | `litplan-prod` | `main` |

### 2. Environment Variables

#### Required Environment Variables

Create a `.env` file (NOT committed to Git):

```bash
# Anthropic AI API
ANTHROPIC_API_KEY=your_production_api_key_here

# Apple In-App Purchase
APPLE_SHARED_SECRET=your_production_shared_secret_here

# Environment
NODE_ENV=production

# Weekly Refresh Configuration
WEEKLY_REFRESH_DRY_RUN=false

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn_here  # If using Sentry
```

#### Setting Environment Variables in Firebase

Use Firebase CLI to set environment config:

```bash
# Set Anthropic API key
firebase functions:config:set anthropic.api_key="YOUR_ANTHROPIC_API_KEY"

# Set Apple shared secret
firebase functions:config:set apple.shared_secret="YOUR_APPLE_SHARED_SECRET"

# Set environment
firebase functions:config:set env.mode="production"

# View current configuration
firebase functions:config:get

# Download configuration for local testing
firebase functions:config:get > .runtimeconfig.json
```

**IMPORTANT**: Never commit `.env`, `.runtimeconfig.json`, or actual API keys to Git!

### 3. Local Development Setup

```bash
# Install dependencies
npm install

# Set up local environment
cp .env.example .env
# Edit .env with your development keys

# Download Firebase config (if using emulators)
firebase functions:config:get > .runtimeconfig.json

# Build TypeScript
npm run build

# Run locally with emulators
npm run serve
```

---

## Firebase Project Configuration

### 1. Create Firebase Project

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select:
# - Functions
# - Firestore
# - Storage (optional)

# Choose existing project or create new one
# Select TypeScript
# Use ESLint: Yes
# Install dependencies: Yes
```

### 2. Configure Firestore

#### Firestore Indexes

Deploy required composite indexes from `firestore.indexes.json`:

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

**Required Indexes** (see `FIRESTORE_INDEXES.md`):

1. **users collection**:
   - `subscription.tier` (ASC) + `subscription.expiryDate` (ASC)
   - `subscription.transactionId` (ASC)

2. **nightlifePlans collection**:
   - `cityId` (ASC) + `flags.isWeekend` (ASC) + `rank` (ASC)
   - `cityId` (ASC) + `flags.isFeatured` (ASC)

3. **groupFlows collection**:
   - `cityId` (ASC) + `rank` (ASC)

4. **cities collection**:
   - `metadata.lastUpdated` (DESC)

#### Firestore Security Rules

Deploy security rules from `firestore.rules`:

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules
```

**Security Rules Summary**:
- Users can only read/write their own user document
- Plans and cities are read-only for authenticated users
- Group flows require Pro tier
- Admin service account has full access

### 3. Configure Cloud Functions

#### Function Runtime

Ensure `package.json` specifies Node.js 18:

```json
{
  "engines": {
    "node": "18"
  }
}
```

#### Function Memory and Timeout

Configure in `firebase.json`:

```json
{
  "functions": {
    "runtime": "nodejs18",
    "memory": "512MB",
    "timeoutSeconds": 540,
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  }
}
```

For scheduled functions (weeklyPlanRefresh), you may need higher limits:

```typescript
// In weeklyPlanRefresh.ts
export const weeklyPlanRefresh = functions
  .runWith({
    timeoutSeconds: 540,    // 9 minutes
    memory: '1GB'           // More memory for AI processing
  })
  .pubsub
  .schedule('0 0 * * 1')
  .timeZone('UTC')
  .onRun(async (context) => {
    // ...
  });
```

---

## Deployment Steps

### 1. Pre-Deployment Testing

```bash
# Build and run tests
npm run build
npm test  # When tests are added

# Run linting
npm run lint

# Test with emulators
npm run serve

# Test critical endpoints manually
curl http://localhost:5001/litplan-prod/us-central1/api/health
```

### 2. Deploy to Staging (Recommended)

```bash
# Switch to staging project
firebase use staging

# Deploy everything
firebase deploy

# Or deploy incrementally:
firebase deploy --only functions      # Deploy only Cloud Functions
firebase deploy --only firestore:rules  # Deploy only Firestore rules
firebase deploy --only firestore:indexes  # Deploy only indexes

# Test staging thoroughly
curl https://us-central1-litplan-staging.cloudfunctions.net/api/health
```

### 3. Deploy to Production

```bash
# Switch to production project
firebase use production

# Deploy with confirmation
firebase deploy

# Monitor deployment logs
firebase functions:log --only weeklyPlanRefresh
```

### 4. Deployment Commands Reference

```bash
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:api
firebase deploy --only functions:weeklyPlanRefresh

# Deploy with forced refresh
firebase deploy --force

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

---

## Post-Deployment Verification

### 1. Verify API Endpoints

```bash
# Health check
curl https://us-central1-litplan-prod.cloudfunctions.net/api/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "timestamp": "2025-01-18T00:00:00.000Z"
# }
```

### 2. Test Authentication

```bash
# Test login endpoint
curl -X POST https://us-central1-litplan-prod.cloudfunctions.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 3. Verify Scheduled Functions

```bash
# Check if scheduled function is deployed
firebase functions:list

# Expected output should include:
# - weeklyPlanRefresh
# - syncSubscriptionStatus
# - cleanupUserActivity

# Manually trigger weekly refresh (for testing)
gcloud functions call weeklyPlanRefresh --region=us-central1
```

### 4. Verify Firestore

```bash
# Check Firestore indexes status
firebase firestore:indexes

# Expected: All indexes showing "READY"

# Test Firestore security rules
# Try reading cities collection (should work)
# Try writing to users collection without auth (should fail)
```

### 5. Check Logs

```bash
# View recent logs
firebase functions:log

# View logs for specific function
firebase functions:log --only api

# Stream logs in real-time
firebase functions:log --follow

# View errors only
firebase functions:log --filter severity=ERROR
```

### 6. Performance Testing

Test critical endpoints for performance:

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://us-central1-litplan-prod.cloudfunctions.net/api/health

# Create curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_total:       %{time_total}\n
```

**Expected Response Times**:
- Health check: < 100ms
- Cities list: < 500ms
- Plans list: < 800ms
- Subscription validation: < 2000ms

---

## Rollback Procedures

### 1. Quick Rollback (Previous Version)

```bash
# List previous function versions
gcloud functions list --region=us-central1

# Rollback specific function to previous version
gcloud functions deploy api \
  --source=gs://gcf-sources-BUCKET/previous-version.zip \
  --region=us-central1

# Alternative: Redeploy from Git
git checkout <previous-commit>
npm run build
firebase deploy --only functions
git checkout main
```

### 2. Emergency Procedures

If production is severely broken:

1. **Disable Functions**:
   ```bash
   # Delete problematic function (users get 404)
   gcloud functions delete weeklyPlanRefresh --region=us-central1
   ```

2. **Revert Firestore Rules**:
   ```bash
   # Deploy previous rules
   git checkout HEAD~1 firestore.rules
   firebase deploy --only firestore:rules
   git checkout main
   ```

3. **Enable Maintenance Mode**:
   - Update health endpoint to return 503
   - Display maintenance message in iOS app

### 3. Database Rollback

Firestore doesn't support automatic rollback, but you can:

1. **Export data before deployment**:
   ```bash
   gcloud firestore export gs://litplan-backups/backup-$(date +%Y%m%d)
   ```

2. **Import previous data**:
   ```bash
   gcloud firestore import gs://litplan-backups/backup-20250117
   ```

---

## Monitoring Setup

### 1. Cloud Monitoring Dashboard

Create a custom dashboard in Google Cloud Console:

1. Go to **Monitoring** > **Dashboards**
2. Create new dashboard: "Litplan Production"
3. Add charts:
   - Function invocations (all functions)
   - Function execution times (p50, p95, p99)
   - Function error rates
   - Active instances
   - Network egress

### 2. Alert Policies

Configure alerts in Cloud Console:

```yaml
Alert Policies:
  - name: "High Error Rate"
    condition: error_rate > 5% for 5 minutes
    notification: email, PagerDuty

  - name: "Slow API Response"
    condition: p95_latency > 2000ms for 10 minutes
    notification: email

  - name: "Function Failed"
    condition: weeklyPlanRefresh fails
    notification: email, Slack

  - name: "High Memory Usage"
    condition: memory > 90% for 5 minutes
    notification: email

  - name: "Daily Active Users Drop"
    condition: DAU drops > 50% compared to yesterday
    notification: email, Slack
```

### 3. Log-Based Metrics

Create custom metrics from logs:

```bash
# Track subscription validations
gcloud logging metrics create subscription_validations \
  --description="Count of subscription validation attempts" \
  --log-filter='resource.type="cloud_function"
    AND textPayload:"Validating subscription"'

# Track Pro conversions
gcloud logging metrics create pro_conversions \
  --description="Count of successful Pro upgrades" \
  --log-filter='resource.type="cloud_function"
    AND textPayload:"upgraded to Pro successfully"'
```

### 4. Uptime Checks

Configure uptime monitoring:

1. Go to **Monitoring** > **Uptime Checks**
2. Create check for health endpoint
3. Set interval: 1 minute
4. Alert if down for > 5 minutes

---

## Cost Management

### 1. Estimated Monthly Costs

**Base Costs** (100-1000 active users):

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Cloud Functions | 1M invocations, 400k GB-sec | $10-20 |
| Firestore | 1M reads, 100k writes, 1GB storage | $5-10 |
| Cloud Storage | 5GB storage, 50GB egress | $2-5 |
| Anthropic API | 50 cities × 52 weeks × $0.20 | $520 |
| Cloud Monitoring | Standard tier | Free - $8 |
| **Total** | | **$540-565/month** |

**Scaling Costs** (10k users):

- Cloud Functions: $50-100
- Firestore: $50-80
- Anthropic API: $520 (same)
- Total: **$620-700/month**

### 2. Budget Alerts

Set up budget alerts:

```bash
# Create budget in Google Cloud Console:
# 1. Go to Billing > Budgets & Alerts
# 2. Set budget: $600/month
# 3. Set alerts at: 50%, 80%, 100%
# 4. Add email notifications
```

### 3. Cost Optimization Tips

1. **Cache aggressively**:
   - Use in-memory cache for user entitlements (5 min TTL)
   - Cache city data in iOS app (24 hours)
   - Reduce Firestore reads

2. **Optimize Firestore**:
   - Use indexes efficiently
   - Batch reads where possible
   - Clean up old activity data weekly

3. **Optimize Cloud Functions**:
   - Use minimum memory needed (256MB for most functions)
   - Set appropriate timeouts (don't use max unnecessarily)
   - Use function concurrency wisely

4. **Optimize Anthropic API**:
   - Batch city processing (5 cities per API call)
   - Cache AI responses for 7 days
   - Use cheaper models where appropriate

5. **Monitor egress**:
   - Compress responses where possible
   - Use CDN for static assets
   - Minimize data in API responses

### 4. Cost Monitoring Queries

```sql
-- Top 10 most expensive functions (in Cloud Console)
SELECT
  resource.labels.function_name,
  SUM(usage.amount) as total_cost
FROM billing_export
WHERE resource.type = 'cloud_function'
GROUP BY function_name
ORDER BY total_cost DESC
LIMIT 10
```

---

## Troubleshooting

### Common Issues

#### 1. "Permission Denied" Errors

**Symptom**: 403 errors when accessing Firestore

**Solution**:
```bash
# Check service account permissions
gcloud projects get-iam-policy litplan-prod

# Grant necessary roles
gcloud projects add-iam-policy-binding litplan-prod \
  --member="serviceAccount:litplan-prod@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"
```

#### 2. Function Timeout

**Symptom**: Functions timing out after 60 seconds

**Solution**:
```typescript
// Increase timeout in function config
export const weeklyPlanRefresh = functions
  .runWith({ timeoutSeconds: 540 })  // 9 minutes
  .pubsub.schedule('0 0 * * 1')
  .onRun(async (context) => { /* ... */ });
```

#### 3. Anthropic API Rate Limits

**Symptom**: "Rate limit exceeded" from Anthropic

**Solution**:
- Implement exponential backoff (already done)
- Reduce concurrent requests
- Contact Anthropic for higher limits
- Enable `WEEKLY_REFRESH_DRY_RUN=true` for testing

#### 4. Memory Exhausted

**Symptom**: "Function exceeded memory limit"

**Solution**:
```typescript
// Increase memory allocation
export const weeklyPlanRefresh = functions
  .runWith({ memory: '1GB' })  // Up from 256MB
  .pubsub.schedule('0 0 * * 1')
  .onRun(async (context) => { /* ... */ });
```

#### 5. Cold Start Latency

**Symptom**: First request after idle takes 5+ seconds

**Solutions**:
- Use minimum instances (costs $$$)
- Accept cold starts for infrequent endpoints
- Implement warming calls for critical functions

```typescript
// Set minimum instances (costs extra!)
export const api = functions
  .runWith({ minInstances: 1 })  // Always warm
  .https.onRequest(app);
```

### Debugging Tips

1. **Enable detailed logging**:
   ```typescript
   console.log('Debug info:', { userId, cityId, tier });
   ```

2. **Use structured logging**:
   ```typescript
   functions.logger.info('User upgraded', { userId, tier: 'pro' });
   ```

3. **Check function logs**:
   ```bash
   firebase functions:log --only api --lines 100
   ```

4. **Test locally with emulators**:
   ```bash
   npm run serve
   ```

5. **Use Firebase Debugger**:
   - Firebase Console > Functions > Logs
   - Click on function to see execution details

---

## Support and Resources

### Documentation

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Apple Receipt Validation](https://developer.apple.com/documentation/appstorereceipts)

### Internal Documentation

- `API_DOCUMENTATION.md` - API endpoint reference
- `ERROR_HANDLING.md` - Error handling guide
- `FIRESTORE_INDEXES.md` - Firestore index requirements
- `SECURITY_CHECKLIST.md` - Security best practices
- `PERFORMANCE_GUIDE.md` - Performance optimization
- `MONITORING.md` - Monitoring and alerting (Day 18)

### Support Contacts

- **Firebase Support**: https://firebase.google.com/support
- **Anthropic Support**: support@anthropic.com
- **Apple Developer Support**: https://developer.apple.com/support/

---

**Last Updated**: January 18, 2025 | Sprint 4, Day 18
**Version**: 1.0.0
**Maintained by**: Litplan Backend Team
