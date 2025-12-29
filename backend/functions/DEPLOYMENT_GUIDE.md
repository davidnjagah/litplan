# Litplan Backend - Deployment Guide

Complete step-by-step guide for deploying the Litplan backend to Firebase Cloud Functions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Prerequisites

### Required Software
- Node.js v18 or later
- npm v8 or later
- Firebase CLI v12 or later
- Git (for version control)

### Required Accounts & Access
- Firebase project with Blaze (pay-as-you-go) plan
- Google Cloud project (created automatically with Firebase)
- Apple Developer account (for App Store receipt validation)
- Access to Firebase console (https://console.firebase.google.com)
- Appropriate IAM permissions (Editor or Owner role)

### Install Firebase CLI
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Verify installation
firebase --version

# Login to Firebase
firebase login

# List available projects
firebase projects:list
```

---

## Initial Setup

### 1. Clone Repository
```bash
# Clone the repository
git clone <repository-url>
cd litplan-backend

# Navigate to functions directory
cd functions

# Install dependencies
npm install
```

### 2. Initialize Firebase Project
```bash
# Select your Firebase project
firebase use <project-id>

# Or create a new project
firebase projects:create <project-id>
firebase use <project-id>
```

### 3. Verify Project Configuration
```bash
# View current project
firebase projects:list

# View Firebase configuration
cat .firebaserc
cat firebase.json
```

---

## Environment Configuration

### 1. Set Environment Variables

#### Apple Shared Secret (Required for Receipt Validation)
```bash
# Set Apple Shared Secret
firebase functions:config:set apple.shared_secret="YOUR_APPLE_SHARED_SECRET_HERE"
```

**How to get Apple Shared Secret:**
1. Go to App Store Connect (https://appstoreconnect.apple.com)
2. Navigate to "My Apps" > Select your app
3. Go to "App Information" > "App-Specific Shared Secret"
4. Click "Generate" if not already created
5. Copy the shared secret

#### CORS Origins (Required for Production)
```bash
# Development (allow all origins)
firebase functions:config:set cors.origins="*"

# Production (whitelist specific domains)
firebase functions:config:set cors.origins="https://litplan.app,https://www.litplan.app"
```

#### Optional: Stripe Configuration (Future Enhancement)
```bash
# If using Stripe for payments
firebase functions:config:set stripe.secret_key="sk_live_YOUR_STRIPE_SECRET_KEY"
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
```

### 2. View Current Configuration
```bash
# View all environment variables
firebase functions:config:get

# View specific configuration
firebase functions:config:get apple
firebase functions:config:get cors
```

### 3. Download Configuration for Local Testing
```bash
# Download .runtimeconfig.json for local emulator
firebase functions:config:get > .runtimeconfig.json

# Add to .gitignore
echo ".runtimeconfig.json" >> .gitignore
```

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript files compile without errors
- [ ] All tests pass (if tests exist)
- [ ] Code linting passes (ESLint)
- [ ] No console.log statements (use functions.logger instead)
- [ ] No TODO comments for critical functionality

### Security
- [ ] Environment variables set (Apple Shared Secret, CORS origins)
- [ ] Firestore security rules reviewed and updated
- [ ] CORS configured for production (whitelist specific domains)
- [ ] Rate limiting configured
- [ ] Security headers middleware enabled
- [ ] Input validation on all endpoints
- [ ] No sensitive data in logs

### Configuration
- [ ] Firebase project selected (`firebase use <project-id>`)
- [ ] Package.json version updated
- [ ] Firebase functions configuration verified
- [ ] Firestore indexes created (if needed)
- [ ] Cloud Functions timeout and memory limits configured

### Testing
- [ ] All endpoints tested locally with emulator
- [ ] Authentication tested with valid Firebase tokens
- [ ] Rate limiting tested
- [ ] Subscription validation tested with real receipts
- [ ] Error handling tested (invalid inputs, edge cases)

---

## Deployment Steps

### Step 1: Build TypeScript
```bash
# Navigate to functions directory
cd functions

# Install dependencies (if not already done)
npm install

# Build TypeScript to JavaScript
npm run build

# Verify build succeeded
ls lib/  # Should contain compiled JavaScript files
```

### Step 2: Test Locally (Optional but Recommended)
```bash
# Start Firebase emulator
firebase emulators:start

# Test endpoints
# Health check
curl http://localhost:5001/<project-id>/us-central1/api/health

# Test authentication
curl -X POST http://localhost:5001/<project-id>/us-central1/api/auth/login \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json"
```

### Step 3: Deploy Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:api
firebase deploy --only functions:syncSubscriptionStatus

# Deploy with confirmation
firebase deploy --only functions --force
```

### Step 4: Deploy Firestore Rules (If Updated)
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### Step 5: Deploy Everything (Complete Deployment)
```bash
# Deploy all Firebase resources
firebase deploy

# This deploys:
# - Cloud Functions
# - Firestore rules
# - Firestore indexes
# - Storage rules (if configured)
```

---

## Post-Deployment Verification

### 1. Verify Deployment Status
```bash
# List deployed functions
firebase functions:list

# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only api
```

### 2. Test Health Endpoint
```bash
# Get function URL
firebase functions:config:get

# Test health endpoint
curl https://us-central1-<project-id>.cloudfunctions.net/api/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "timestamp": "2025-12-28T10:00:00.000Z"
# }
```

### 3. Test API Endpoints
```bash
# Test root endpoint (API documentation)
curl https://us-central1-<project-id>.cloudfunctions.net/api/

# Test authenticated endpoint (requires valid Firebase token)
curl https://us-central1-<project-id>.cloudfunctions.net/api/user/me \
  -H "Authorization: Bearer <firebase-id-token>"

# Test config endpoint
curl https://us-central1-<project-id>.cloudfunctions.net/api/config \
  -H "Authorization: Bearer <firebase-id-token>"
```

### 4. Monitor Logs
```bash
# Stream logs in real-time
firebase functions:log --follow

# View logs in Cloud Console
# https://console.cloud.google.com/logs/query
```

### 5. Check Cloud Functions Dashboard
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to "Functions" in left sidebar
4. Verify all functions are deployed and healthy
5. Check invocation count and error rate

---

## Rollback Procedure

### Quick Rollback (Previous Version)
```bash
# List recent deployments
firebase functions:list

# Rollback to previous version (not directly supported)
# Instead, redeploy from previous Git commit

# Checkout previous commit
git log --oneline
git checkout <previous-commit-hash>

# Redeploy
cd functions
npm install
npm run build
firebase deploy --only functions

# Return to latest code
git checkout main
```

### Emergency Rollback (Delete Function)
```bash
# Delete specific function (use with caution!)
firebase functions:delete api

# Redeploy older version
git checkout <stable-commit>
firebase deploy --only functions
```

### Best Practice: Tag Stable Releases
```bash
# Tag current release before deployment
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Rollback to tagged version
git checkout v1.0.0
firebase deploy --only functions
```

---

## Monitoring & Troubleshooting

### Monitoring Tools

#### 1. Firebase Console
- **URL**: https://console.firebase.google.com
- **Metrics**: Invocations, errors, execution time
- **Logs**: Real-time function logs

#### 2. Google Cloud Console
- **URL**: https://console.cloud.google.com
- **Cloud Functions**: Detailed metrics and quotas
- **Cloud Logging**: Advanced log filtering
- **Cloud Monitoring**: Custom dashboards and alerts

#### 3. Command Line Monitoring
```bash
# Stream logs
firebase functions:log --follow

# View recent logs (last 100 lines)
firebase functions:log --limit 100

# Filter logs by function
firebase functions:log --only api

# Filter logs by time
firebase functions:log --since 1h
firebase functions:log --since 2025-12-28
```

### Common Issues & Solutions

#### Issue 1: Deployment Failed
```bash
# Error: "Build failed"
# Solution: Check TypeScript compilation
npm run build
# Fix any TypeScript errors and redeploy

# Error: "Permission denied"
# Solution: Check IAM permissions
firebase login --reauth
```

#### Issue 2: Function Timeout
```bash
# Error: "Function execution took longer than 60s"
# Solution: Increase timeout in index.ts
# Add to function configuration:
export const api = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onRequest(app);
```

#### Issue 3: Environment Variables Not Set
```bash
# Error: "Apple Shared Secret not configured"
# Solution: Set environment variable
firebase functions:config:set apple.shared_secret="YOUR_SECRET"
firebase deploy --only functions
```

#### Issue 4: CORS Errors
```bash
# Error: "CORS policy blocked request"
# Solution: Update CORS configuration
firebase functions:config:set cors.origins="https://your-domain.com"
firebase deploy --only functions

# Or update in code (index.ts):
app.use(cors({
  origin: ['https://litplan.app', 'https://www.litplan.app']
}));
```

#### Issue 5: High Cold Start Latency
```bash
# Solution: Enable minimum instances (requires Blaze plan)
export const api = functions
  .runWith({ minInstances: 1 })
  .https.onRequest(app);

# Note: Minimum instances incur additional costs
```

### Performance Optimization

#### 1. Monitor Cold Starts
```bash
# Check execution time in logs
firebase functions:log --only api | grep "execution took"

# If cold starts are high (>5s), consider:
# - Reducing function size (split into smaller functions)
# - Enabling minimum instances
# - Using Firebase Hosting for static content
```

#### 2. Optimize Bundle Size
```bash
# Check bundle size
ls -lh lib/

# Reduce dependencies
npm prune
npm dedupe

# Use tree-shaking (already enabled with TypeScript)
```

#### 3. Database Query Optimization
- Add Firestore indexes for complex queries
- Use pagination for large result sets
- Cache frequently accessed data

### Logging Best Practices

```typescript
// Use Firebase Functions logger (NOT console.log)
import * as functions from 'firebase-functions';

// Info level (general operations)
functions.logger.info('User logged in', { userId: 'abc123' });

// Warning level (non-critical issues)
functions.logger.warn('Rate limit approaching', { userId: 'abc123', count: 95 });

// Error level (critical errors)
functions.logger.error('Subscription validation failed', { error: error.message });

// Debug level (development only)
functions.logger.debug('Request details', { body: req.body });
```

---

## Deployment Checklist

### Before Deployment
- [ ] Code reviewed and approved
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Environment variables configured
- [ ] Firestore rules updated (if needed)
- [ ] Version number incremented
- [ ] Git commit created with descriptive message
- [ ] Git tag created for release

### During Deployment
- [ ] `firebase deploy --only functions` executed
- [ ] Deployment completed without errors
- [ ] Functions appear in Firebase Console

### After Deployment
- [ ] Health endpoint returns 200 OK
- [ ] API documentation endpoint accessible
- [ ] Authenticated endpoints tested
- [ ] Logs show no errors
- [ ] Monitoring dashboard shows normal metrics
- [ ] Team notified of deployment

---

## Production Best Practices

### 1. Use CI/CD Pipeline
Set up GitHub Actions or Cloud Build for automated deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd functions && npm install && npm run build
      - uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### 2. Enable Function Versioning
```bash
# Deploy with traffic splitting (gradual rollout)
# Not directly supported by Firebase Functions
# Instead, use Cloud Run for advanced traffic management
```

### 3. Set Up Monitoring Alerts
1. Go to Cloud Console > Monitoring > Alerting
2. Create alert policies for:
   - Error rate > 5%
   - Execution time > 2s (average)
   - Invocations > threshold
   - Rate limit exceeded

### 4. Regular Backups
```bash
# Backup Firestore data
gcloud firestore export gs://<bucket-name>/backups/$(date +%Y-%m-%d)

# Schedule automated backups
# Use Cloud Scheduler to trigger Firestore exports daily
```

### 5. Cost Monitoring
1. Set up billing alerts in Cloud Console
2. Monitor function invocations
3. Review Firestore read/write operations
4. Optimize cold starts (costly)

---

## Support & Resources

### Documentation
- Firebase Functions: https://firebase.google.com/docs/functions
- Firebase CLI: https://firebase.google.com/docs/cli
- Cloud Functions: https://cloud.google.com/functions/docs
- Firestore: https://firebase.google.com/docs/firestore

### Getting Help
- Firebase Support: https://firebase.google.com/support
- Stack Overflow: https://stackoverflow.com/questions/tagged/firebase
- Firebase Slack: https://firebase.community/

### Internal Resources
- API Documentation: See API_DOCUMENTATION.md
- Security Checklist: See SECURITY_CHECKLIST.md
- Development Guide: See README.md

---

**Last Updated**: 2025-12-28
**Version**: 1.0.0
**Maintained By**: Backend Engineering Team
