# Litplan Backend - Production Operations Runbook

Version: 1.0.0
Last Updated: December 28, 2025
Maintained by: Backend Engineering Team

## Table of Contents

1. [Incident Response](#incident-response)
2. [Operational Procedures](#operational-procedures)
3. [Monitoring & Alerting](#monitoring--alerting)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Regular Maintenance](#regular-maintenance)

---

## Incident Response

### Severity Classification

#### P0 - Critical (Page Immediately)
- **Definition**: Complete service outage or data loss
- **Response Time**: 15 minutes
- **Examples**:
  - API completely down (all endpoints returning 5xx)
  - Firestore database unreachable
  - Critical data corruption
  - Security breach detected

**Response Procedure**:
1. Acknowledge incident in PagerDuty
2. Join incident Slack channel (#litplan-incidents)
3. Assess scope and impact
4. Execute rollback if recent deployment (see [Rollback Procedure](#rollback-procedure))
5. Update status page
6. Communicate with stakeholders every 15 minutes
7. Document all actions in incident log

#### P1 - High (Page During Business Hours)
- **Definition**: Major feature broken, significant user impact
- **Response Time**: 1 hour
- **Examples**:
  - Subscription validation failing
  - Weekly plan refresh job failed
  - External service (Anthropic/Apple) completely down
  - Authentication broken

**Response Procedure**:
1. Acknowledge incident
2. Assess if degraded mode is possible
3. Check recent deployments
4. Review error logs and metrics
5. Implement fix or rollback
6. Update status page
7. Post-incident review within 24 hours

#### P2 - Medium (Email Alert)
- **Definition**: Non-critical feature degradation
- **Response Time**: 4 hours
- **Examples**:
  - Elevated error rate (5-10%)
  - Slow response times (p95 > 2s)
  - Single endpoint failing
  - Rate limiting triggered frequently

**Response Procedure**:
1. Review logs and metrics
2. Identify root cause
3. Plan fix for next deployment
4. Monitor for escalation
5. Document issue and resolution

#### P3 - Low (Ticket Only)
- **Definition**: Minor issues, no user impact
- **Response Time**: Next business day
- **Examples**:
  - Logging issues
  - Non-critical warnings in logs
  - Performance degradation < 10%

**Response Procedure**:
1. Create ticket in issue tracker
2. Prioritize in next sprint
3. Document for knowledge base

#### P4 - Informational
- **Definition**: Informational alerts, no action required
- **Examples**:
  - Successful deployments
  - Scheduled job completions
  - Budget threshold warnings

---

### On-Call Escalation

**Primary On-Call**: Backend Engineer (rotating weekly)
**Secondary On-Call**: Senior Backend Engineer
**Escalation Path**:
1. Primary On-Call (15 min response)
2. Secondary On-Call (if no response in 30 min)
3. Engineering Manager (if no response in 60 min)
4. CTO (P0 incidents only)

**Contact Information**: See PagerDuty for current on-call rotation

---

### Common Incidents & Solutions

#### Incident: API Returns 503 - Service Unavailable

**Symptoms**:
- Health check endpoint returns 503
- All API requests failing
- Cloud Functions logs show errors

**Diagnosis**:
```bash
# Check function health
curl https://us-central1-litplan-prod.cloudfunctions.net/api/health

# Check Cloud Functions status
gcloud functions describe api --region=us-central1 --project=litplan-prod

# Check recent logs
gcloud functions logs read api --limit=50 --region=us-central1 --project=litplan-prod
```

**Common Causes**:
1. **Firestore down**: Check GCP Status Dashboard
2. **Function crash loop**: Check for unhandled exceptions in logs
3. **Out of memory**: Check function memory usage
4. **Deployment issue**: Recent bad deployment

**Resolution**:
```bash
# If recent deployment, rollback
./scripts/deploy-production.sh --rollback

# If memory issue, increase memory allocation
gcloud functions deploy api \
  --region=us-central1 \
  --memory=512MB \
  --project=litplan-prod

# If Firestore issue, check GCP status and wait for resolution
```

---

#### Incident: Subscription Validation Failing

**Symptoms**:
- Users report "Subscription validation failed" error
- POST /subscription/validate returns 400/500
- Logs show Apple API errors

**Diagnosis**:
```bash
# Check subscription endpoint logs
gcloud functions logs read api --filter="subscription/validate" --limit=100

# Test Apple API connectivity
curl -X POST https://buy.itunes.apple.com/verifyReceipt \
  -H "Content-Type: application/json" \
  -d '{"receipt-data":"test","password":"test"}'
```

**Common Causes**:
1. **Apple shared secret expired/invalid** (Status 21004)
2. **Apple API down** (Network timeout)
3. **Sandbox receipts in production** (Status 21007)
4. **Malformed receipt data** (Status 21002)

**Resolution**:
```bash
# Verify shared secret is configured
firebase functions:config:get apple --project=litplan-prod

# Update shared secret if needed
firebase functions:config:set apple.shared_secret="YOUR_NEW_SECRET" --project=litplan-prod
firebase deploy --only functions --project=litplan-prod

# Check Apple status
# Visit: https://developer.apple.com/system-status/
```

---

#### Incident: Weekly Plan Refresh Failed

**Symptoms**:
- No new plans generated on Monday
- Logs show "Weekly plan refresh completed with errors"
- Users see stale plans (older than 1 week)

**Diagnosis**:
```bash
# Check weeklyPlanRefresh logs
gcloud functions logs read weeklyPlanRefresh --limit=200 --project=litplan-prod

# Check last successful run
gcloud scheduler jobs describe weeklyPlanRefresh --location=us-central1 --project=litplan-prod
```

**Common Causes**:
1. **Anthropic API quota exceeded** (Rate limit: 50 req/min)
2. **Anthropic API key invalid/expired**
3. **Firestore write failures** (Batch operation errors)
4. **Function timeout** (Max 540s for Cloud Functions)

**Resolution**:
```bash
# Manual trigger to retry
gcloud scheduler jobs run weeklyPlanRefresh --location=us-central1 --project=litplan-prod

# Check Anthropic API key
firebase functions:config:get anthropic --project=litplan-prod

# Update API key if needed
firebase functions:config:set anthropic.api_key="YOUR_KEY" --project=litplan-prod
firebase deploy --only functions:weeklyPlanRefresh --project=litplan-prod

# Check Anthropic usage dashboard
# Visit: https://console.anthropic.com/settings/usage
```

---

#### Incident: High Error Rate (> 5%)

**Symptoms**:
- Cloud Monitoring alert: "Error rate > 5%"
- Multiple endpoints returning errors
- Logs show repeated error pattern

**Diagnosis**:
```bash
# Check error breakdown by endpoint
gcloud logging read "resource.type=cloud_function AND severity=ERROR" \
  --limit=200 --format=json --project=litplan-prod | \
  jq '.[] | .jsonPayload.endpoint' | sort | uniq -c

# Check error types
gcloud logging read "resource.type=cloud_function AND severity=ERROR" \
  --limit=200 --format=json --project=litplan-prod | \
  jq '.[] | .jsonPayload.error.code' | sort | uniq -c
```

**Common Causes**:
1. **External service degradation** (Anthropic/Apple slow/down)
2. **Database connection issues** (Firestore timeouts)
3. **Invalid authentication tokens** (Expired Firebase tokens)
4. **Code bug introduced in recent deployment**

**Resolution**:
1. If external service issue: Wait for service recovery, consider circuit breaker
2. If database issue: Check Firestore status, consider retries
3. If authentication issue: Check Firebase Authentication status
4. If code bug: Rollback to previous version

---

### Communication Templates

#### Status Page Update (P0/P1)
```
Title: [Service Name] Experiencing Issues

We are currently investigating elevated error rates affecting [specific feature/service].

Impact: [Description of user impact]
Status: Investigating
Updated: [Timestamp]

Next update in 15 minutes.
```

#### Incident Resolution Notification
```
Title: [Service Name] Incident Resolved

The issue affecting [specific feature/service] has been resolved.

Root Cause: [Brief description]
Resolution: [What was done]
Duration: [Time from start to resolution]

We apologize for any inconvenience. A full post-incident review will be published within 24 hours.
```

#### Planned Maintenance Notification
```
Subject: Scheduled Maintenance - [Date] [Time]

We will be performing scheduled maintenance on [Date] from [Start Time] to [End Time] UTC.

Expected Impact: [Brief downtime/degraded performance description]
Affected Services: [List of services]

We will send updates before, during, and after the maintenance window.
```

---

## Operational Procedures

### Deploy New Version

**Prerequisites**:
- Code merged to main branch
- All tests passing
- Staging deployment successful
- Approval from team lead

**Procedure**:
```bash
# 1. Pull latest code
git checkout main
git pull origin main

# 2. Navigate to functions directory
cd backend/functions

# 3. Run production deployment script (includes safety checks)
./scripts/deploy-production.sh

# The script will:
# - Check git repository is clean
# - Prompt for confirmation
# - Create automatic Firestore backup
# - Deploy functions sequentially
# - Run post-deployment smoke tests
# - Generate rollback script

# 4. Monitor deployment
# Watch function logs for first 10 minutes
gcloud functions logs read api --limit=50 --project=litplan-prod

# 5. Verify health checks
curl https://us-central1-litplan-prod.cloudfunctions.net/api/health

# 6. Update status page
# Post: "Deployment completed successfully"
```

**Post-Deployment Checklist**:
- [ ] Health check endpoint returns 200 OK
- [ ] Test subscription validation endpoint
- [ ] Test plan retrieval endpoint
- [ ] Check error rate in Cloud Monitoring (should be < 1%)
- [ ] Monitor for 30 minutes
- [ ] Update deployment log

---

### Rollback Procedure

**When to Rollback**:
- Error rate > 10% immediately after deployment
- Critical feature completely broken
- Security vulnerability introduced
- P0 incident caused by deployment

**Immediate Rollback** (< 30 minutes after deployment):
```bash
# Use generated rollback script from deployment
./rollback-[TIMESTAMP].sh

# Or manual rollback to previous version
firebase deploy --only functions --project=litplan-prod

# Note: Firebase doesn't have native versioning
# The deploy-production.sh script creates backup before each deploy
```

**Delayed Rollback** (> 30 minutes after deployment):
```bash
# 1. Identify previous working commit
git log --oneline -10

# 2. Checkout previous commit
git checkout [PREVIOUS_COMMIT_HASH]

# 3. Build and deploy
npm run build
firebase deploy --only functions --project=litplan-prod

# 4. Return to main branch
git checkout main

# 5. Create hotfix if needed
git checkout -b hotfix/rollback-issue
```

**Firestore Rollback** (if database changes were deployed):
```bash
# 1. List recent backups
gsutil ls gs://litplan-backups/backups/

# 2. Restore from backup
gcloud firestore import gs://litplan-backups/backups/[TIMESTAMP]/ \
  --project=litplan-prod

# Warning: This will overwrite current data
# Coordinate with team before executing
```

---

### Scale Cloud Functions

**Increase Capacity** (high traffic expected):
```bash
# Increase max instances
gcloud functions deploy api \
  --region=us-central1 \
  --max-instances=100 \
  --project=litplan-prod

# Increase memory (if OOM errors)
gcloud functions deploy api \
  --region=us-central1 \
  --memory=512MB \
  --project=litplan-prod

# Increase timeout (if slow operations)
gcloud functions deploy api \
  --region=us-central1 \
  --timeout=60s \
  --project=litplan-prod
```

**Decrease Capacity** (reduce costs):
```bash
# Reduce max instances
gcloud functions deploy api \
  --region=us-central1 \
  --max-instances=50 \
  --project=litplan-prod

# Reduce memory
gcloud functions deploy api \
  --region=us-central1 \
  --memory=256MB \
  --project=litplan-prod
```

**Monitor Scaling**:
```bash
# Check current configuration
gcloud functions describe api --region=us-central1 --project=litplan-prod

# Monitor instance count
gcloud monitoring read \
  "metric.type=cloudfunctions.googleapis.com/function/instance_count" \
  --project=litplan-prod
```

---

### Database Maintenance

#### Backup Firestore

**Automated Backup** (runs daily at 3 AM UTC):
```bash
# Check backup status
gsutil ls gs://litplan-backups/backups/ | tail -10

# Manual backup
./scripts/backup-firestore.sh production
```

**Restore from Backup**:
```bash
# 1. List backups
gsutil ls -l gs://litplan-backups/backups/

# 2. Restore (WARNING: Overwrites current data)
gcloud firestore import gs://litplan-backups/backups/20250128_030000/ \
  --project=litplan-prod

# 3. Monitor restore progress
gcloud firestore operations list --project=litplan-prod
```

#### Clean Old Data

**Clean Activity Data** (runs weekly, automated):
```bash
# Manually trigger cleanup
gcloud scheduler jobs run cleanupUserActivity \
  --location=us-central1 \
  --project=litplan-prod

# Check cleanup logs
gcloud functions logs read cleanupUserActivity --limit=100 --project=litplan-prod
```

#### Verify Indexes

```bash
# List all indexes
gcloud firestore indexes composite list --project=litplan-prod

# Check index build status
gcloud firestore operations list --project=litplan-prod --filter="type:INDEX"

# Deploy updated indexes
firebase deploy --only firestore:indexes --project=litplan-prod
```

---

### Update Environment Variables

#### Using Firebase Functions Config (Recommended):
```bash
# View all config
firebase functions:config:get --project=litplan-prod

# Update Anthropic API key
firebase functions:config:set anthropic.api_key="YOUR_NEW_KEY" \
  --project=litplan-prod

# Update Apple shared secret
firebase functions:config:set apple.shared_secret="YOUR_NEW_SECRET" \
  --project=litplan-prod

# Update weekly refresh settings
firebase functions:config:set refresh.dry_run="false" \
  --project=litplan-prod

# Deploy to apply changes
firebase deploy --only functions --project=litplan-prod
```

#### Using .env File (Local Development Only):
```bash
# Edit .env file
nano .env

# Restart local emulator
npm run serve
```

**Never commit secrets to version control!**

---

### Rotate API Keys

#### Anthropic API Key Rotation

**Frequency**: Every 90 days or immediately if compromised

**Procedure**:
1. Generate new API key in Anthropic Console: https://console.anthropic.com/settings/keys
2. Update Firebase config:
   ```bash
   firebase functions:config:set anthropic.api_key="NEW_KEY" --project=litplan-prod
   ```
3. Deploy functions:
   ```bash
   firebase deploy --only functions --project=litplan-prod
   ```
4. Test with health check:
   ```bash
   curl https://us-central1-litplan-prod.cloudfunctions.net/api/health
   ```
5. Revoke old key in Anthropic Console
6. Update key in secrets manager (1Password/Vault)
7. Document rotation in runbook

#### Apple Shared Secret Rotation

**Frequency**: Every 90 days or immediately if compromised

**Procedure**:
1. Generate new shared secret in App Store Connect:
   - Go to App Store Connect > My Apps > [App] > App Information
   - Under App-Specific Shared Secret, click "Generate"
2. Update Firebase config:
   ```bash
   firebase functions:config:set apple.shared_secret="NEW_SECRET" --project=litplan-prod
   ```
3. Deploy functions:
   ```bash
   firebase deploy --only functions --project=litplan-prod
   ```
4. Test subscription validation with real purchase
5. Document rotation in runbook

---

## Monitoring & Alerting

### Key Metrics to Watch

#### Health Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Uptime | 99.9% | < 99.5% | < 99% |
| Error Rate | < 1% | 2-5% | > 5% |
| P95 Latency | < 500ms | 1-2s | > 2s |
| P99 Latency | < 1s | 2-3s | > 3s |

#### Business Metrics
| Metric | Monitoring |
|--------|-----------|
| Daily Active Users | Track daily, alert on 20% drop |
| Subscription Conversions | Track daily, alert on 50% drop |
| Plan Views per User | Track weekly average |
| Weekend Plan Access Rate | Pro user engagement metric |

#### Cost Metrics
| Service | Monthly Budget | Alert Threshold |
|---------|---------------|-----------------|
| Cloud Functions | $20 | $30 |
| Firestore | $10 | $15 |
| Anthropic API | $520 | $600 |
| Total | $560 | $650 |

---

### Alert Response Procedures

#### Alert: API Error Rate > 5%

**Investigation Steps**:
1. Check Cloud Monitoring dashboard
2. Identify failing endpoints:
   ```bash
   gcloud logging read "severity=ERROR" --limit=100 | grep endpoint
   ```
3. Check error types:
   ```bash
   gcloud logging read "severity=ERROR" --limit=100 | grep "error.code"
   ```
4. Identify pattern (all endpoints vs specific endpoint)
5. Check recent deployments
6. Review external service status (Anthropic, Apple, Firebase)

**Response Actions**:
- If all endpoints: Consider rollback
- If specific endpoint: Disable if non-critical, fix if critical
- If external service: Wait for recovery, communicate status
- If code bug: Hotfix or rollback

---

#### Alert: High Latency (P95 > 2s)

**Investigation Steps**:
1. Check slow request logs:
   ```bash
   gcloud logging read "jsonPayload.duration > 2000" --limit=50
   ```
2. Identify slow endpoints
3. Check Firestore query performance
4. Check external API response times
5. Check Cloud Functions instance count

**Response Actions**:
- Optimize slow Firestore queries
- Add indexes if missing
- Increase function memory/timeout if needed
- Consider caching for frequently accessed data
- Scale up instances if needed

---

#### Alert: Anthropic API Cost Spike

**Investigation Steps**:
1. Check Anthropic usage dashboard: https://console.anthropic.com/settings/usage
2. Review weeklyPlanRefresh logs for excessive API calls
3. Check for infinite retry loops
4. Verify dry-run mode is disabled correctly

**Response Actions**:
```bash
# Emergency: Disable weekly refresh
gcloud scheduler jobs pause weeklyPlanRefresh \
  --location=us-central1 \
  --project=litplan-prod

# Investigate root cause
gcloud functions logs read weeklyPlanRefresh --limit=500

# Fix issue and re-enable
gcloud scheduler jobs resume weeklyPlanRefresh \
  --location=us-central1 \
  --project=litplan-prod
```

---

### Log Analysis Queries

#### Find All Errors in Last Hour
```bash
gcloud logging read \
  "resource.type=cloud_function AND severity=ERROR AND timestamp > \"$(date -u -v-1H '+%Y-%m-%dT%H:%M:%SZ')\"" \
  --limit=100 \
  --project=litplan-prod
```

#### Find Slow Requests (> 2s)
```bash
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.duration > 2000" \
  --limit=50 \
  --format="table(timestamp, jsonPayload.endpoint, jsonPayload.duration)" \
  --project=litplan-prod
```

#### Find Subscription Validation Errors
```bash
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.endpoint=~\"/subscription/validate\" AND severity=ERROR" \
  --limit=100 \
  --project=litplan-prod
```

#### Find Rate Limit Hits
```bash
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.error.code=\"RATE_LIMIT_EXCEEDED\"" \
  --limit=50 \
  --project=litplan-prod
```

#### Track User Activity
```bash
gcloud logging read \
  "resource.type=cloud_function AND jsonPayload.userId=\"USER_ID_HERE\"" \
  --limit=100 \
  --project=litplan-prod
```

---

### Performance Degradation Detection

#### Symptoms of Performance Degradation
- Gradual increase in p95/p99 latency over days
- Increased function execution time
- More timeout errors
- Higher memory usage
- Slower Firestore queries

#### Investigation Checklist
- [ ] Check Firestore index status (missing indexes slow queries)
- [ ] Check Cloud Functions memory usage (OOM causes restarts)
- [ ] Check external API response times (Anthropic/Apple slowness)
- [ ] Check database size growth (large collections need pagination)
- [ ] Check code for N+1 query patterns
- [ ] Review recent code changes for inefficiencies

#### Optimization Actions
```bash
# Add missing Firestore index
firebase deploy --only firestore:indexes --project=litplan-prod

# Increase function memory
gcloud functions deploy api --memory=512MB --project=litplan-prod

# Check database size
gcloud firestore operations list --project=litplan-prod
```

---

### Cost Spike Investigation

#### Daily Cost Review
```bash
# Check current month spending
gcloud billing accounts get-spend \
  --billing-account=[BILLING_ACCOUNT_ID] \
  --start-date=2025-01-01

# Check Cloud Functions cost breakdown
gcloud billing accounts get-sku-report \
  --billing-account=[BILLING_ACCOUNT_ID] \
  --service="Cloud Functions" \
  --start-date=2025-01-01
```

#### Common Cost Spike Causes
1. **Excessive function invocations** (infinite loops, DDoS)
2. **Memory increase** (512MB costs 2x more than 256MB)
3. **Long execution times** (billed per 100ms)
4. **Anthropic API overuse** (plan refresh running too frequently)
5. **Firestore read/write spikes** (missing cache, inefficient queries)

#### Emergency Cost Controls
```bash
# Reduce max instances (limits concurrent executions)
gcloud functions deploy api --max-instances=20 --project=litplan-prod

# Pause expensive scheduled functions
gcloud scheduler jobs pause weeklyPlanRefresh --location=us-central1 --project=litplan-prod

# Enable budget alerts (if not already configured)
gcloud billing budgets create \
  --billing-account=[BILLING_ACCOUNT_ID] \
  --display-name="Litplan Monthly Budget" \
  --budget-amount=650 \
  --threshold-rule=percent=80 \
  --threshold-rule=percent=100
```

---

## Troubleshooting Guide

### API Errors (4xx, 5xx)

#### 400 Bad Request
**Common Causes**:
- Missing required fields (transactionId, productId, etc.)
- Invalid data format (malformed base64 receipt)
- Validation failures

**Debugging**:
```bash
# Check recent 400 errors
gcloud logging read "httpRequest.status=400" --limit=20 --project=litplan-prod

# Look for validation errors
gcloud logging read "severity=WARNING AND jsonPayload.validationError" --limit=20
```

**Resolution**:
- Review API documentation for required fields
- Validate request format on client-side
- Check for API version mismatches

---

#### 401 Unauthorized
**Common Causes**:
- Missing Authorization header
- Invalid Firebase token
- Expired Firebase token

**Debugging**:
```bash
# Check recent 401 errors
gcloud logging read "httpRequest.status=401" --limit=20 --project=litplan-prod

# Verify Firebase Authentication is working
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://us-central1-litplan-prod.cloudfunctions.net/api/user/me
```

**Resolution**:
- Ensure client sends `Authorization: Bearer <token>` header
- Verify token is not expired (Firebase tokens expire after 1 hour)
- Check Firebase Authentication service status

---

#### 403 Forbidden
**Common Causes**:
- Free user accessing Pro features
- Plan limit reached
- Weekend plan access denied for free users

**Debugging**:
```bash
# Check recent 403 errors
gcloud logging read "httpRequest.status=403" --limit=20 --project=litplan-prod

# Check error codes
gcloud logging read "httpRequest.status=403" --format=json | jq '.[] | .jsonPayload.error.code'
```

**Resolution**:
- Show upgrade prompt to user
- Explain tier limits clearly
- Allow user to restore purchases

---

#### 429 Rate Limit Exceeded
**Common Causes**:
- User making too many requests
- Bot/script abuse
- Client retry loop

**Debugging**:
```bash
# Identify high-volume users
gcloud logging read "httpRequest.status=429" --format=json | \
  jq '.[] | .jsonPayload.userId' | sort | uniq -c | sort -rn

# Check rate limit hits by endpoint
gcloud logging read "jsonPayload.error.code=\"RATE_LIMIT_EXCEEDED\"" --limit=100
```

**Resolution**:
- Increase rate limits if legitimate traffic:
  ```bash
  # Edit src/utils/rateLimiter.ts
  # Increase maxRequests or windowMs
  # Deploy updated code
  ```
- Block abusive IPs in Cloud Armor (if DDoS)
- Contact user to explain rate limits

---

#### 500 Internal Server Error
**Common Causes**:
- Unhandled exceptions in code
- Firestore connection failures
- External service failures
- Code bugs

**Debugging**:
```bash
# Find recent 500 errors with stack traces
gcloud logging read "httpRequest.status=500" --limit=10 --format=json | \
  jq '.[] | {endpoint: .jsonPayload.endpoint, error: .jsonPayload.error}'

# Check for specific error types
gcloud logging read "severity=ERROR AND httpRequest.status=500"
```

**Resolution**:
- Review error logs for stack traces
- Fix code bugs and deploy hotfix
- Add error handling for edge cases
- Rollback if introduced in recent deployment

---

#### 503 Service Unavailable
**Common Causes**:
- Firestore database down
- Cloud Functions cold start timeout
- Function crash loop
- Deployment in progress

**Debugging**:
```bash
# Check function status
gcloud functions describe api --region=us-central1 --project=litplan-prod

# Check for crash loops
gcloud functions logs read api --limit=100 | grep "Error"

# Check Firestore status
# Visit: https://status.cloud.google.com/
```

**Resolution**:
- Wait for GCP service recovery
- Rollback if deployment issue
- Increase function timeout/memory if needed

---

### Timeout Issues

#### Function Timeout (Cloud Functions max 540s)

**Symptoms**:
- Requests return 504 Gateway Timeout
- Logs show "Function execution took too long"
- weeklyPlanRefresh fails to complete

**Debugging**:
```bash
# Find timeout errors
gcloud logging read "textPayload=~\"timeout\"" --limit=20 --project=litplan-prod

# Check function duration
gcloud logging read "jsonPayload.duration > 30000" --limit=20
```

**Resolution**:
```bash
# Increase timeout (max 540s for 2nd gen functions)
gcloud functions deploy weeklyPlanRefresh \
  --timeout=540s \
  --project=litplan-prod

# Optimize code:
# - Add batch processing
# - Reduce API calls per city
# - Implement pagination
```

---

#### Anthropic API Timeout

**Symptoms**:
- Plan generation fails with "Request timeout"
- Logs show "Anthropic API call exceeded timeout"

**Debugging**:
```bash
# Check Anthropic API response times
gcloud logging read "jsonPayload.anthropicDuration" --format=json | \
  jq '.[] | .jsonPayload.anthropicDuration' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count "ms"}'
```

**Resolution**:
```bash
# Increase timeout in weeklyPlanRefresh.ts
# Edit RETRY_CONFIG.timeout to 30000 (30s)

# Add retry logic for transient failures
# Deploy updated code
```

---

### External Service Failures

#### Anthropic API Down/Degraded

**Symptoms**:
- Plan generation fails
- Logs show "Anthropic API error: 5xx"
- weeklyPlanRefresh completes with 0 plans generated

**Debugging**:
```bash
# Check Anthropic status
# Visit: https://status.anthropic.com/

# Check recent Anthropic errors
gcloud logging read "jsonPayload.service=\"anthropic\" AND severity=ERROR" --limit=50
```

**Resolution**:
- Wait for Anthropic service recovery
- Retry manually:
  ```bash
  gcloud scheduler jobs run weeklyPlanRefresh --location=us-central1 --project=litplan-prod
  ```
- If prolonged outage, consider showing cached plans to users

---

#### Apple API Down/Degraded

**Symptoms**:
- Subscription validation fails
- Logs show "Apple API error: timeout"
- Status 21005 (server temporarily unavailable)

**Debugging**:
```bash
# Check Apple status
# Visit: https://developer.apple.com/system-status/

# Check recent Apple API errors
gcloud logging read "jsonPayload.service=\"apple\" AND severity=ERROR" --limit=50
```

**Resolution**:
- Implement retry logic (already in place for 21005)
- Show user-friendly message: "Apple's servers are temporarily unavailable. Please try again in a few minutes."
- Wait for Apple service recovery

---

### Database Connection Issues

#### Firestore Connection Timeout

**Symptoms**:
- API requests timeout
- Logs show "Firestore connection timeout"
- Health check readiness probe fails

**Debugging**:
```bash
# Check Firestore status
# Visit: https://status.cloud.google.com/

# Check recent Firestore errors
gcloud logging read "jsonPayload.database=\"firestore\" AND severity=ERROR" --limit=50
```

**Resolution**:
- Check Firestore service status
- Verify network connectivity from Cloud Functions
- Increase Firestore timeout in admin SDK initialization
- Contact GCP support if issue persists

---

#### Firestore Write Failures

**Symptoms**:
- Logs show "Batch write failed"
- Data not persisting to database
- Transaction conflicts

**Debugging**:
```bash
# Check write errors
gcloud logging read "jsonPayload.operation=\"firestore_write\" AND severity=ERROR" --limit=50

# Check for quota exceeded
gcloud logging read "textPayload=~\"quota\"" --limit=20
```

**Resolution**:
- Check Firestore quotas: https://console.cloud.google.com/firestore/quotas
- Implement exponential backoff for retries
- Reduce batch size if exceeding limits (max 500 ops per batch)
- Consider upgrading Firestore pricing tier

---

### Authentication Problems

#### Firebase Token Validation Failing

**Symptoms**:
- All authenticated requests return 401
- Logs show "Invalid Firebase token"

**Debugging**:
```bash
# Check Firebase Authentication status
# Visit: https://console.firebase.google.com/

# Test token validation
curl -H "Authorization: Bearer TOKEN" \
  https://us-central1-litplan-prod.cloudfunctions.net/api/user/me
```

**Resolution**:
- Verify Firebase Authentication service is operational
- Check for Firebase project configuration issues
- Ensure service account has correct permissions
- Regenerate service account key if corrupted

---

#### User Not Found Errors

**Symptoms**:
- New users get "User not found" errors
- Logs show "User document does not exist"

**Debugging**:
```bash
# Check user creation logs
gcloud logging read "jsonPayload.operation=\"user_create\"" --limit=20

# Verify user exists in Firestore
# Use Firebase Console > Firestore > users collection
```

**Resolution**:
- Ensure user document is created on first authentication
- Check POST /auth/login creates user if not exists
- Verify Firebase Authentication and Firestore are synced

---

## Regular Maintenance

### Daily Checks (5 minutes)

**Morning Health Check**:
```bash
# 1. Check overall health
curl https://us-central1-litplan-prod.cloudfunctions.net/api/health

# 2. Check error rate (should be < 1%)
gcloud logging read "severity=ERROR AND timestamp > \"$(date -u -v-1d '+%Y-%m-%dT%H:%M:%SZ')\"" \
  --limit=0 --format="value(count)" --project=litplan-prod

# 3. Check yesterday's metrics
# Visit: Cloud Monitoring Dashboard

# 4. Review any overnight alerts
# Visit: PagerDuty or alert system
```

**Checklist**:
- [ ] API health check returns 200 OK
- [ ] Error rate < 1%
- [ ] No critical alerts overnight
- [ ] Scheduled jobs completed successfully (check logs)
- [ ] Cost tracking on target (< $20/day)

---

### Weekly Tasks (30 minutes)

**Monday Morning** (after weeklyPlanRefresh runs):
```bash
# 1. Verify plan refresh succeeded
gcloud functions logs read weeklyPlanRefresh --limit=100 --project=litplan-prod

# 2. Check plans were generated
# Visit Firebase Console > Firestore > nightlifePlans
# Verify createdAt timestamps are recent (< 24 hours)

# 3. Review weekly metrics
# - Total API requests
# - Average response time
# - Error rate
# - Active users
# - Subscription conversions
```

**Friday Afternoon** (weekly summary):
```bash
# 1. Review weekly cost report
gcloud billing accounts get-spend \
  --billing-account=[BILLING_ACCOUNT_ID] \
  --start-date=$(date -u -v-mon '+%Y-%m-%d')

# 2. Check for slow performance trends
# Visit Cloud Monitoring > Latency dashboard

# 3. Review on-call incidents
# Document learnings in runbook

# 4. Update team on week's metrics
```

**Checklist**:
- [ ] Weekly plan refresh completed successfully
- [ ] All cities have fresh plans (< 1 week old)
- [ ] Weekly cost within budget ($140/week target)
- [ ] No performance degradation trends
- [ ] Incident post-mortems completed
- [ ] Team updated on metrics

---

### Monthly Reviews (2 hours)

**First Monday of Month**:
```bash
# 1. Review full month cost breakdown
gcloud billing accounts get-spend \
  --billing-account=[BILLING_ACCOUNT_ID] \
  --start-date=2025-01-01 \
  --end-date=2025-02-01

# 2. Generate monthly report
# - Total API requests
# - Average response time (p50, p95, p99)
# - Error rate
# - Uptime percentage
# - Active users (DAU, MAU)
# - Subscription conversions
# - Cost per active user

# 3. Review and update documentation
# - Update this runbook with new procedures
# - Document new common issues
# - Update troubleshooting guides
```

**Optimization Review**:
- [ ] Identify slow queries (add indexes)
- [ ] Review and optimize Cloud Functions memory allocation
- [ ] Check for unused resources (delete old backups)
- [ ] Review rate limits (adjust based on usage patterns)
- [ ] Update Firestore security rules if needed
- [ ] Review and rotate API keys (if 90 days old)

**Checklist**:
- [ ] Monthly cost within budget ($560 target)
- [ ] Uptime > 99.9%
- [ ] Error rate < 1%
- [ ] No major incidents (P0/P1)
- [ ] Documentation updated
- [ ] Optimization opportunities identified
- [ ] Team retrospective completed

---

### Quarterly Audits (1 day)

**Security Audit**:
- [ ] Review Firestore security rules
- [ ] Audit user access permissions
- [ ] Rotate all API keys (Anthropic, Apple)
- [ ] Review Cloud Functions IAM roles
- [ ] Check for exposed secrets in logs
- [ ] Review authentication flow
- [ ] Update dependencies (npm audit fix)

**Performance Audit**:
- [ ] Analyze slow query patterns
- [ ] Review Firestore index usage
- [ ] Check for N+1 query patterns
- [ ] Optimize cold start times
- [ ] Review caching opportunities
- [ ] Load test with peak traffic simulation

**Cost Audit**:
- [ ] Review quarterly spending trends
- [ ] Identify cost optimization opportunities
- [ ] Forecast next quarter costs
- [ ] Adjust budgets and alerts
- [ ] Review Anthropic API usage (can we reduce?)

**Compliance Audit**:
- [ ] Verify GDPR compliance (data retention, user deletion)
- [ ] Review privacy policy alignment
- [ ] Check data backup and retention policies
- [ ] Audit logging and monitoring coverage
- [ ] Review incident response procedures

---

## Appendix

### Useful Commands

#### Quick Health Check
```bash
curl -s https://us-central1-litplan-prod.cloudfunctions.net/api/health | jq .
```

#### Deploy Single Function
```bash
firebase deploy --only functions:api --project=litplan-prod
```

#### View Real-Time Logs
```bash
gcloud functions logs read api --limit=50 --follow --project=litplan-prod
```

#### Check Function Metrics
```bash
gcloud functions describe api --region=us-central1 --project=litplan-prod
```

#### Test Endpoint Locally
```bash
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"transactionId":"test","productId":"com.litplan.pro.monthly","receiptData":"test"}'
```

### Important URLs

- **Firebase Console**: https://console.firebase.google.com/project/litplan-prod
- **GCP Console**: https://console.cloud.google.com/
- **Anthropic Console**: https://console.anthropic.com/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **GCP Status**: https://status.cloud.google.com/
- **Anthropic Status**: https://status.anthropic.com/
- **Apple System Status**: https://developer.apple.com/system-status/

### Contact Information

- **On-Call Engineer**: See PagerDuty rotation
- **Engineering Manager**: [email]
- **Product Manager**: [email]
- **CTO**: [email]
- **Support Email**: support@litplan.app

### Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-28 | 1.0.0 | Initial production runbook | Backend Team |

---

**End of Production Runbook**

For questions or suggestions, contact the Backend Engineering Team.
