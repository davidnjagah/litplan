# Staging Testing Guide

Complete guide for testing the Litplan backend in the staging environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment to Staging](#deployment-to-staging)
3. [Smoke Tests](#smoke-tests)
4. [API Endpoint Testing](#api-endpoint-testing)
5. [Scheduled Functions Testing](#scheduled-functions-testing)
6. [Security Rules Testing](#security-rules-testing)
7. [Error Scenario Testing](#error-scenario-testing)
8. [Rate Limiting Testing](#rate-limiting-testing)
9. [Monitoring and Logs](#monitoring-and-logs)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- gcloud CLI (optional, for backups)
- Postman or cURL for API testing

### Required Access

- Firebase project access (staging)
- Firebase authentication credentials
- Environment variables configured

### Environment Setup

1. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   # Set Firebase Functions config
   firebase functions:config:set \
     anthropic.api_key="your-anthropic-api-key" \
     apple.shared_secret="your-apple-shared-secret"
   ```

3. **Login to Firebase**:
   ```bash
   firebase login
   firebase use staging
   ```

---

## Deployment to Staging

### Automated Deployment

Use the automated deployment script:

```bash
cd functions
./scripts/deploy-staging.sh
```

The script will:
- ✅ Check prerequisites (Node version, Firebase CLI)
- ✅ Install dependencies
- ✅ Run linter
- ✅ Build TypeScript
- ✅ Deploy Firestore rules and indexes
- ✅ Deploy Cloud Functions
- ✅ Run health check
- ✅ Display deployment summary

### Manual Deployment

If you need to deploy components individually:

```bash
# Build TypeScript
npm run build

# Deploy only functions
firebase deploy --only functions --project litplan-staging

# Deploy only Firestore rules
cd ..
firebase deploy --only firestore:rules --project litplan-staging

# Deploy only Firestore indexes
firebase deploy --only firestore:indexes --project litplan-staging
```

---

## Smoke Tests

### 1. Health Check

Test the health endpoint immediately after deployment:

```bash
# Basic health check
curl https://us-central1-litplan-staging.cloudfunctions.net/api/health

# Expected response:
{
  "timestamp": "2025-01-19T10:30:00.000Z",
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123.45,
  "checks": {
    "firestore": {
      "healthy": true,
      "message": "Firestore is accessible",
      "latency": 45
    },
    "anthropic": {
      "healthy": true,
      "message": "Anthropic API is accessible",
      "latency": 234
    },
    "apple": {
      "healthy": true,
      "message": "Apple shared secret is configured"
    },
    "environment": {
      "healthy": true,
      "message": "All required environment variables are set"
    }
  }
}
```

### 2. Liveness Probe

```bash
curl https://us-central1-litplan-staging.cloudfunctions.net/api/health/liveness

# Expected: 200 OK
{
  "status": "alive",
  "timestamp": "2025-01-19T10:30:00.000Z"
}
```

### 3. Readiness Probe

```bash
curl https://us-central1-litplan-staging.cloudfunctions.net/api/health/readiness

# Expected: 200 OK if ready, 503 if not ready
{
  "status": "ready",
  "timestamp": "2025-01-19T10:30:00.000Z"
}
```

---

## API Endpoint Testing

### Setup Test Environment

1. **Get a test Firebase Auth token**:
   ```javascript
   // In Firebase Console or your app
   // Sign in a test user and get their ID token
   const token = await firebase.auth().currentUser.getIdToken();
   ```

2. **Set base URL**:
   ```bash
   export BASE_URL="https://us-central1-litplan-staging.cloudfunctions.net/api"
   export AUTH_TOKEN="your-firebase-auth-token"
   ```

### Test Authentication

```bash
# Login (creates or updates user)
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "deviceId": "test-device-123",
    "platform": "ios"
  }'

# Expected: 200 OK with user data
```

### Test User Endpoints

```bash
# Get user profile
curl "$BASE_URL/user/me" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Update user preferences
curl -X PATCH "$BASE_URL/user/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "preferences": {
      "nightlifePreferences": ["rooftop bars", "live music"]
    }
  }'
```

### Test Cities Endpoints

```bash
# List all cities
curl "$BASE_URL/cities" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Get specific city (tracks weekly limit)
curl "$BASE_URL/cities/new-york" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Get city plans
curl "$BASE_URL/cities/new-york/plans?type=individual" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Get group flows
curl "$BASE_URL/cities/new-york/plans?type=group" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Test Plans Endpoints

```bash
# Get specific plan (tracks view limit, enforces weekend restriction)
curl "$BASE_URL/plans/plan-123" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Test Saved Cities (Pro Only)

```bash
# Save a city (Pro only)
curl -X POST "$BASE_URL/cities/save" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "cityId": "new-york"
  }'

# Get saved cities
curl "$BASE_URL/cities/saved" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Unsave a city
curl -X DELETE "$BASE_URL/cities/save/new-york" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Test Subscription Endpoints

```bash
# Validate Apple receipt
curl -X POST "$BASE_URL/subscription/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "receiptData": "base64-encoded-receipt-data",
    "productId": "com.litplan.pro.monthly"
  }'

# Get subscription status
curl "$BASE_URL/subscription/status" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Restore subscription
curl -X POST "$BASE_URL/subscription/restore" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "receiptData": "base64-encoded-receipt-data"
  }'
```

---

## Scheduled Functions Testing

Scheduled functions run automatically, but you can trigger them manually for testing.

### Weekly Plan Refresh

```bash
# Trigger manually via Firebase Console:
# 1. Go to Functions section
# 2. Find "weeklyPlanRefresh"
# 3. Click "..." menu
# 4. Select "Trigger function now"

# Or use gcloud CLI:
gcloud functions call weeklyPlanRefresh --project litplan-staging
```

**What to verify**:
- ✅ Function executes without errors
- ✅ New plans are generated for each city
- ✅ Old plans are archived or deleted
- ✅ Execution completes within timeout (540s)
- ✅ Logs show AI generation details

### Subscription Status Sync

```bash
# Trigger manually:
gcloud functions call syncSubscriptionStatus --project litplan-staging
```

**What to verify**:
- ✅ Function executes without errors
- ✅ Expired subscriptions are downgraded
- ✅ Active subscriptions remain unchanged
- ✅ User tier is updated correctly

---

## Security Rules Testing

### Test Firestore Rules

1. **Test authenticated read access**:
   ```javascript
   // Should succeed
   const cities = await db.collection('cities').get();
   const user = await db.collection('users').doc(userId).get();
   ```

2. **Test unauthenticated access**:
   ```javascript
   // Should fail
   const cities = await db.collection('cities').get();
   // Error: Missing or insufficient permissions
   ```

3. **Test write restrictions**:
   ```javascript
   // Should fail (only backend can write)
   await db.collection('cities').doc('new-york').set({...});
   // Error: Missing or insufficient permissions
   ```

4. **Test user data isolation**:
   ```javascript
   // Should succeed (own data)
   await db.collection('users').doc(myUserId).get();

   // Should fail (other user's data)
   await db.collection('users').doc(otherUserId).get();
   // Error: Missing or insufficient permissions
   ```

5. **Test Pro-only features**:
   ```javascript
   // Should fail for free users
   await db.collection('users').doc(userId).collection('savedCities').add({...});
   // Error: Missing or insufficient permissions
   ```

---

## Error Scenario Testing

### Test Error Handling

1. **Invalid authentication**:
   ```bash
   curl "$BASE_URL/user/me" \
     -H "Authorization: Bearer invalid-token"

   # Expected: 401 Unauthorized
   ```

2. **Missing required fields**:
   ```bash
   curl -X POST "$BASE_URL/auth/login" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -d '{}'

   # Expected: 400 Bad Request
   ```

3. **Resource not found**:
   ```bash
   curl "$BASE_URL/cities/non-existent-city" \
     -H "Authorization: Bearer $AUTH_TOKEN"

   # Expected: 404 Not Found
   ```

4. **Tier limit exceeded**:
   ```bash
   # View multiple cities as free user
   curl "$BASE_URL/cities/new-york" -H "Authorization: Bearer $AUTH_TOKEN"
   curl "$BASE_URL/cities/los-angeles" -H "Authorization: Bearer $AUTH_TOKEN"

   # Expected: 403 Forbidden with upgrade message
   ```

5. **Weekend plan access (free user)**:
   ```bash
   curl "$BASE_URL/plans/weekend-plan-123" \
     -H "Authorization: Bearer $AUTH_TOKEN"

   # Expected: 403 Forbidden with upgrade message
   ```

---

## Rate Limiting Testing

### Test Rate Limits

Rate limiting is enabled in staging with higher limits than production.

```bash
# Send multiple requests rapidly
for i in {1..150}; do
  curl "$BASE_URL/cities" -H "Authorization: Bearer $AUTH_TOKEN"
done

# After ~100 requests in 1 minute:
# Expected: 429 Too Many Requests
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Monitoring and Logs

### View Function Logs

```bash
# Real-time logs
firebase functions:log --project litplan-staging

# Specific function
firebase functions:log --only api --project litplan-staging

# With time filter
firebase functions:log --since 1h --project litplan-staging
```

### Firebase Console

1. **Functions Dashboard**:
   - Go to: https://console.firebase.google.com/project/litplan-staging/functions
   - View invocations, errors, and execution time

2. **Firestore Dashboard**:
   - Go to: https://console.firebase.google.com/project/litplan-staging/firestore
   - Verify data structure and security rules

3. **Error Reporting**:
   - Go to: https://console.firebase.google.com/project/litplan-staging/errors
   - Monitor runtime errors and stack traces

### Performance Monitoring

1. **Check slow requests**:
   ```bash
   firebase functions:log --project litplan-staging | grep "Slow request"
   ```

2. **Check error rates**:
   ```bash
   firebase functions:log --project litplan-staging | grep "ERROR"
   ```

---

## Troubleshooting

### Common Issues

#### 1. Health Check Fails

**Symptoms**: `/health` endpoint returns 503 or errors

**Solutions**:
- Check if Firestore is accessible
- Verify Anthropic API key is set
- Check Firebase Functions logs for errors
- Ensure environment variables are configured

#### 2. Authentication Fails

**Symptoms**: 401 errors on all endpoints

**Solutions**:
- Verify Firebase Auth token is valid
- Check token hasn't expired (refresh if needed)
- Ensure user exists in Authentication
- Check CORS configuration

#### 3. Plans Not Generated

**Symptoms**: `/cities/:cityId/plans` returns empty

**Solutions**:
- Run seed script: `npm run seed:cities`
- Check weeklyPlanRefresh logs
- Verify Anthropic API is accessible
- Check if dry-run mode is enabled

#### 4. Subscription Validation Fails

**Symptoms**: `/subscription/validate` returns errors

**Solutions**:
- Verify Apple shared secret is correct
- Check receipt data is valid base64
- Use sandbox URL for test receipts
- Check Apple's service status

#### 5. Security Rules Block Requests

**Symptoms**: "Missing or insufficient permissions" errors

**Solutions**:
- Verify user is authenticated
- Check user has correct tier for Pro features
- Review Firestore rules configuration
- Test rules in Firebase Console

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variable
firebase functions:config:set \
  debug.enabled=true \
  --project litplan-staging

# Redeploy functions
firebase deploy --only functions --project litplan-staging
```

### Reset Test Data

If you need to reset staging data:

```bash
# Backup first
./scripts/backup-firestore.sh staging

# Delete all data (CAUTION!)
# Manually delete collections in Firebase Console

# Re-seed
npm run seed:cities
```

---

## Test Checklist

Use this checklist before promoting to production:

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Linter passes with no errors
- [ ] Build completes successfully
- [ ] Environment variables configured

### Post-Deployment
- [ ] Health check returns 200 OK
- [ ] All health checks are healthy
- [ ] Liveness probe works
- [ ] Readiness probe works

### API Testing
- [ ] Authentication works
- [ ] User endpoints return correct data
- [ ] Cities endpoint returns active cities
- [ ] Plans endpoint returns plans
- [ ] Saved cities works (Pro only)
- [ ] Subscription validation works

### Security Testing
- [ ] Firestore rules block unauthorized access
- [ ] User data is isolated
- [ ] Pro features require subscription
- [ ] Weekend plans require Pro tier
- [ ] Write operations are blocked for clients

### Performance Testing
- [ ] Health check < 1s
- [ ] API responses < 2s
- [ ] No slow queries (> 5s)
- [ ] Rate limiting works
- [ ] No memory leaks

### Error Handling
- [ ] Invalid auth returns 401
- [ ] Missing fields return 400
- [ ] Not found returns 404
- [ ] Tier limits return 403
- [ ] Errors have helpful messages

### Scheduled Functions
- [ ] Weekly refresh executes successfully
- [ ] Subscription sync works
- [ ] No timeout errors
- [ ] Logs are clean

---

## Next Steps

After successful staging testing:

1. ✅ Document any issues found
2. ✅ Fix critical bugs
3. ✅ Re-test affected areas
4. ✅ Update production deployment plan
5. ✅ Schedule production deployment
6. ✅ Prepare rollback plan
7. ✅ Deploy to production using `./scripts/deploy-production.sh`

---

**Last Updated**: January 19, 2025
**Version**: 1.0.0
**Environment**: Staging
