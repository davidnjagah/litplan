# Litplan Backend - Operations Handoff Checklist

Version: 1.0.0
Date: December 28, 2025
Prepared for: DevOps/Operations Team

## Introduction

This document serves as a comprehensive handoff checklist for the Litplan backend system. It contains all the information needed for the operations team to successfully manage, monitor, and maintain the production environment.

---

## Table of Contents

1. [Access & Credentials](#access--credentials)
2. [Repository & Code](#repository--code)
3. [Infrastructure](#infrastructure)
4. [Monitoring & Logging](#monitoring--logging)
5. [Support & Communication](#support--communication)
6. [Emergency Contacts](#emergency-contacts)
7. [Handoff Sign-Off](#handoff-sign-off)

---

## Access & Credentials

### Firebase Console Access

- [ ] **Firebase Console**: https://console.firebase.google.com/
  - **Project Name**: litplan-prod
  - **Project ID**: litplan-prod
  - **Access Level Required**: Editor or Owner
  - **Team Members with Access**: [List names and emails]

- [ ] **Staging Project**:
  - **Project Name**: litplan-staging
  - **Project ID**: litplan-staging
  - **Access Level Required**: Editor

**Action Items**:
- [ ] Grant Firebase Console access to operations team
- [ ] Enable 2FA for all accounts with Firebase access
- [ ] Document emergency access procedures

---

### Google Cloud Console Access

- [ ] **GCP Console**: https://console.cloud.google.com/
  - **Organization**: [Your Organization Name]
  - **Billing Account**: [Billing Account ID]
  - **Project**: litplan-prod
  - **Recommended Roles**:
    - Cloud Functions Admin
    - Firestore Admin
    - Logs Viewer
    - Monitoring Viewer

**Action Items**:
- [ ] Grant GCP Console access to operations team
- [ ] Set up billing alerts ($650/month threshold)
- [ ] Enable audit logging for all administrative actions
- [ ] Review and document IAM roles

---

### Anthropic API Key

- [ ] **Location**: Firebase Functions Config
  ```bash
  firebase functions:config:get anthropic --project=litplan-prod
  ```

- [ ] **Alternative Location**: Environment variables (staging/local)
  ```bash
  ANTHROPIC_API_KEY=your_key_here
  ```

- [ ] **Anthropic Console**: https://console.anthropic.com/
  - **Access**: Contact backend team for account access
  - **API Key Management**: Settings > API Keys
  - **Usage Dashboard**: Settings > Usage

**Action Items**:
- [ ] Store API key in secure secrets manager (1Password, Vault, etc.)
- [ ] Document API key rotation schedule (every 90 days)
- [ ] Set up usage monitoring and alerts ($600/month threshold)
- [ ] Keep backup of API key in secure location

**Cost Information**:
- **Monthly Budget**: $520 (fixed cost for weekly plan refresh)
- **Model**: claude-3-5-sonnet-20241022
- **Usage**: ~50 cities × 60 plans/city = 3000 API calls per week

---

### Apple Shared Secret

- [ ] **Location**: Firebase Functions Config
  ```bash
  firebase functions:config:get apple --project=litplan-prod
  ```

- [ ] **Alternative Location**: Environment variables (staging/local)
  ```bash
  APPLE_SHARED_SECRET=your_32_character_secret_here
  ```

- [ ] **App Store Connect**: https://appstoreconnect.apple.com/
  - **Team**: [Your Team Name]
  - **App**: Litplan
  - **Location**: My Apps > Litplan > App Information > App-Specific Shared Secret

**Action Items**:
- [ ] Store shared secret in secure secrets manager
- [ ] Document shared secret rotation schedule (every 90 days)
- [ ] Verify secret is 32 characters long
- [ ] Test subscription validation after rotation

**Important Notes**:
- Shared secret is required for Apple receipt validation
- Changing the secret will NOT affect existing subscriptions
- Always test in staging before rotating in production

---

### Service Account Keys

- [ ] **Firebase Admin SDK Service Account**:
  - **Location**: Firebase Console > Project Settings > Service Accounts
  - **Usage**: Backend Cloud Functions authentication
  - **File**: `serviceAccountKey.json` (DO NOT commit to git)
  - **Permissions**: Firebase Admin SDK, Firestore access

- [ ] **GCP Service Accounts**:
  - **Cloud Functions Service Account**: Auto-generated
  - **Firestore Service Account**: Auto-generated
  - **Custom Service Accounts**: [List any custom accounts]

**Action Items**:
- [ ] Download and securely store service account keys
- [ ] Rotate service account keys every 90 days
- [ ] Review service account permissions (principle of least privilege)
- [ ] Set up alerts for service account usage anomalies

---

### Secrets Management

- [ ] **Recommended Tool**: Google Secret Manager, 1Password, or HashiCorp Vault

- [ ] **Secrets to Store**:
  - Anthropic API Key
  - Apple Shared Secret
  - Firebase Service Account Key
  - Any custom API keys

**Action Items**:
- [ ] Migrate all secrets to secrets manager
- [ ] Set up access controls (who can view/rotate secrets)
- [ ] Document secret rotation procedures
- [ ] Enable audit logging for secret access

---

## Repository & Code

### GitHub Repository

- [ ] **Repository URL**: https://github.com/[your-org]/litplanAI
- [ ] **Backend Code**: `/backend/functions`
- [ ] **Main Branch**: `main`
- [ ] **Development Branch**: `develop`
- [ ] **Staging Branch**: `staging` (optional)

**Action Items**:
- [ ] Grant repository access to operations team
- [ ] Set up branch protection rules (require reviews, status checks)
- [ ] Enable vulnerability alerts (Dependabot)
- [ ] Document code review process

---

### Branch Strategy

```
main (production)
  ├── staging (staging environment)
  └── develop (development)
      └── feature/* (feature branches)
```

**Deployment Flow**:
1. Developers create feature branches from `develop`
2. PRs merged to `develop` after code review
3. `develop` merged to `staging` for staging deployment
4. `staging` merged to `main` for production deployment

**Action Items**:
- [ ] Document branch strategy
- [ ] Set up CI/CD pipelines (GitHub Actions, CircleCI, etc.)
- [ ] Configure automated tests on PRs
- [ ] Set up deployment automation

---

### CI/CD Setup

**Current State**: Manual deployment using scripts

**Recommended Setup**:
- [ ] **GitHub Actions** or **CircleCI** for automated deployments
- [ ] **Automated Tests**: Run on every PR
- [ ] **Staging Deployment**: Auto-deploy on merge to `staging` branch
- [ ] **Production Deployment**: Manual approval required

**Action Items**:
- [ ] Set up CI/CD pipeline
- [ ] Configure automated tests (lint, build, unit tests)
- [ ] Set up deployment automation
- [ ] Document deployment approval process

---

### Environment Variables

**Production** (`litplan-prod`):
```bash
# View all config
firebase functions:config:get --project=litplan-prod

# Set config
firebase functions:config:set anthropic.api_key="YOUR_KEY" --project=litplan-prod
firebase functions:config:set apple.shared_secret="YOUR_SECRET" --project=litplan-prod
firebase functions:config:set refresh.dry_run="false" --project=litplan-prod
```

**Staging** (`litplan-staging`):
```bash
firebase functions:config:get --project=litplan-staging
```

**Local Development** (`.env` file):
```bash
ANTHROPIC_API_KEY=your_key_here
APPLE_SHARED_SECRET=your_secret_here
WEEKLY_REFRESH_DRY_RUN=true
NODE_ENV=development
```

**Action Items**:
- [ ] Document all environment variables
- [ ] Verify production config is set
- [ ] Verify staging config is set
- [ ] Create `.env.example` template (already exists)

---

### Deployment Procedures

**Staging Deployment**:
```bash
cd backend/functions
./scripts/deploy-staging.sh
```

**Production Deployment**:
```bash
cd backend/functions
./scripts/deploy-production.sh
```

**Rollback Procedure**:
```bash
# Use generated rollback script
./rollback-[TIMESTAMP].sh

# Or manual rollback
git checkout [PREVIOUS_COMMIT]
npm run build
firebase deploy --only functions --project=litplan-prod
```

**Action Items**:
- [ ] Test staging deployment
- [ ] Test production deployment (in staging first)
- [ ] Test rollback procedure
- [ ] Document deployment checklist

---

## Infrastructure

### Firebase Project IDs

| Environment | Project ID | Purpose |
|------------|------------|---------|
| Production | `litplan-prod` | Live user traffic |
| Staging | `litplan-staging` | Testing and QA |
| Development | `litplan-dev` | Local development |

**Action Items**:
- [ ] Verify all projects are created
- [ ] Configure Firebase Authentication for each project
- [ ] Set up billing alerts for each project
- [ ] Document project ownership

---

### Cloud Functions Configuration

**Production Functions**:

| Function Name | Runtime | Memory | Timeout | Trigger | Region |
|--------------|---------|--------|---------|---------|--------|
| `api` | Node 18 | 256MB | 60s | HTTPS | us-central1 |
| `weeklyPlanRefresh` | Node 18 | 512MB | 540s | Scheduled (Mon 00:00 UTC) | us-central1 |
| `syncSubscriptionStatus` | Node 18 | 256MB | 300s | Scheduled (Daily 02:00 UTC) | us-central1 |
| `cleanupUserActivity` | Node 18 | 256MB | 300s | Scheduled (Sun 02:00 UTC) | us-central1 |
| `updateUserActivity` | Node 18 | 256MB | 60s | Firestore Trigger | us-central1 |

**Scaling Configuration**:
- **Max Instances**: 50 (production), 10 (staging)
- **Min Instances**: 0 (cost optimization)
- **Concurrency**: 80 requests per instance

**Action Items**:
- [ ] Review and adjust memory allocation based on usage
- [ ] Monitor cold start times
- [ ] Adjust timeout values if needed
- [ ] Set up max instance limits to prevent cost spikes

---

### Firestore Collections Structure

```
cities/
  ├── {cityId}/
  │   ├── plans/ (subcollection)
  │   │   └── {planId}/
  │   └── groupFlows/ (subcollection)
  │       └── {groupFlowId}/

nightlifePlans/ (root collection, optimized for plan search)
  └── {planId}/

users/
  ├── {userId}/
  │   ├── activity/ (subcollection)
  │   │   └── {activityId}/
  │   └── savedCities/ (subcollection)
  │       └── {cityId}/

config/
  └── appConfig/
```

**Action Items**:
- [ ] Review collection structure
- [ ] Verify indexes are deployed (see `firestore.indexes.json`)
- [ ] Set up data retention policies
- [ ] Document data backup procedures

---

### Security Rules

- [ ] **Location**: `/backend/functions/firestore.rules`
- [ ] **Deployment Command**:
  ```bash
  firebase deploy --only firestore:rules --project=litplan-prod
  ```

**Key Security Rules**:
- Users can only read/write their own data (`users/{userId}`)
- Saved cities require Pro tier (`request.auth.token.tier == 'pro'`)
- Cities and plans are read-only from client (backend writes only)
- Config is read-only from client

**Action Items**:
- [ ] Review security rules
- [ ] Test rules using Firebase Emulator
- [ ] Set up alerts for unauthorized access attempts
- [ ] Document rule testing procedures

---

### Composite Indexes

- [ ] **Location**: `/backend/functions/firestore.indexes.json`
- [ ] **Deployment Command**:
  ```bash
  firebase deploy --only firestore:indexes --project=litplan-prod
  ```

**Critical Indexes**:
1. Cities: `metadata.isActive` + `createdAt` (DESC)
2. Plans: `rank` + `flags.isWeekend`
3. Activity: `timestamp` (DESC) + `type`
4. Saved Cities: `savedAt` (DESC)

**Action Items**:
- [ ] Verify all indexes are built (check Firebase Console)
- [ ] Monitor index usage and performance
- [ ] Add new indexes as needed
- [ ] Remove unused indexes to reduce costs

---

## Monitoring & Logging

### Cloud Monitoring Dashboards

**Recommended Dashboards** (to be created):

1. **System Health Overview**:
   - API uptime
   - Error rate
   - Request rate
   - Latency (p50, p95, p99)

2. **Cloud Functions Performance**:
   - Invocation count
   - Execution time
   - Memory usage
   - Error count

3. **External Services**:
   - Anthropic API response times
   - Apple API response times
   - Firestore latency

4. **Business Metrics**:
   - Daily active users
   - Subscription conversions
   - Plan views
   - City views

**Action Items**:
- [ ] Create Cloud Monitoring dashboards
- [ ] Set up dashboard access for team
- [ ] Configure dashboard auto-refresh
- [ ] Export dashboards for backup

---

### Alert Policies

**Critical Alerts** (Page on-call):
- [ ] API error rate > 5% for 5 minutes
- [ ] API completely down (health check fails)
- [ ] Firestore unreachable
- [ ] Cloud Functions execution errors > 10 in 5 minutes

**Warning Alerts** (Email team):
- [ ] API error rate > 2% for 10 minutes
- [ ] P95 latency > 2s for 10 minutes
- [ ] Anthropic API errors > 5 in 5 minutes
- [ ] Cost spike (> $30 per day)

**Informational Alerts**:
- [ ] Weekly plan refresh completed
- [ ] Subscription sync completed
- [ ] Budget threshold reached (80% of monthly budget)

**Action Items**:
- [ ] Set up alert policies in Cloud Monitoring
- [ ] Configure notification channels (email, Slack, PagerDuty)
- [ ] Test alert delivery
- [ ] Document alert response procedures

---

### Log Aggregation

**Cloud Logging**:
```bash
# View all logs
gcloud logging read "resource.type=cloud_function" --limit=100 --project=litplan-prod

# View error logs
gcloud logging read "severity=ERROR" --limit=100 --project=litplan-prod

# View specific function logs
gcloud functions logs read api --limit=50 --project=litplan-prod
```

**Log Retention**:
- **Default**: 30 days
- **Recommended**: 90 days for production
- **Cost**: ~$0.50/GB ingested

**Action Items**:
- [ ] Configure log retention period
- [ ] Set up log-based metrics
- [ ] Create saved log queries for common issues
- [ ] Consider log export to BigQuery for long-term storage

---

### Performance Metrics

**Key Metrics to Track**:

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Uptime | 99.9% | < 99.5% | < 99% |
| Error Rate | < 1% | 2-5% | > 5% |
| P95 Latency | < 500ms | 1-2s | > 2s |
| P99 Latency | < 1s | 2-3s | > 3s |
| Function Success Rate | > 99% | 95-99% | < 95% |

**Action Items**:
- [ ] Set up performance monitoring
- [ ] Create latency SLO dashboard
- [ ] Track SLO compliance over time
- [ ] Document performance baselines

---

## Support & Communication

### Support Email Setup

- [ ] **Support Email**: support@litplan.app
- [ ] **Configuration**: Google Workspace or similar
- [ ] **Access**: Operations team, support team
- [ ] **Response SLA**: 24 hours for non-critical, 4 hours for critical

**Action Items**:
- [ ] Set up support email forwarding
- [ ] Create canned responses for common issues
- [ ] Document escalation procedures
- [ ] Set up support ticket tracking (Zendesk, Freshdesk, etc.)

---

### Error Reporting

**Current Setup**:
- Cloud Logging captures all errors
- Errors logged with full context (userId, endpoint, error details)

**Recommended Enhancement**:
- [ ] Integrate Sentry for advanced error tracking
- [ ] Set up error grouping and deduplication
- [ ] Configure error alerts
- [ ] Track error resolution status

**Action Items**:
- [ ] Evaluate error reporting tools (Sentry, Rollbar, Bugsnag)
- [ ] Set up error reporting service
- [ ] Configure error alerts
- [ ] Document error triage process

---

### User Feedback Channels

- [ ] **In-App Feedback**: [To be implemented]
- [ ] **App Store Reviews**: Monitor regularly
- [ ] **Support Email**: support@litplan.app
- [ ] **Social Media**: [If applicable]

**Action Items**:
- [ ] Set up in-app feedback mechanism
- [ ] Monitor App Store reviews daily
- [ ] Create feedback response templates
- [ ] Track and categorize feedback

---

### Bug Tracking

- [ ] **Tool**: GitHub Issues, Jira, or Linear
- [ ] **Repository**: https://github.com/[your-org]/litplanAI/issues
- [ ] **Labels**: `bug`, `enhancement`, `critical`, `production`

**Bug Triage Process**:
1. New bug reported via support email or monitoring
2. Create GitHub issue with label `bug`
3. Assign severity (P0-P4)
4. Assign to engineer
5. Fix and deploy
6. Verify in production
7. Close issue

**Action Items**:
- [ ] Set up bug tracking system
- [ ] Create issue templates
- [ ] Document triage process
- [ ] Set up bug review cadence (daily for P0/P1)

---

## Emergency Contacts

### Primary On-Call (Rotating Weekly)

- **Name**: [Backend Engineer]
- **Email**: [email@example.com]
- **Phone**: [Phone number]
- **PagerDuty**: [PagerDuty email]
- **Response Time**: 15 minutes

---

### Secondary On-Call

- **Name**: [Senior Backend Engineer]
- **Email**: [email@example.com]
- **Phone**: [Phone number]
- **Escalation**: If primary doesn't respond in 30 minutes

---

### Engineering Manager

- **Name**: [Engineering Manager]
- **Email**: [email@example.com]
- **Phone**: [Phone number]
- **Escalation**: P0 incidents or if on-call unavailable

---

### CTO/VP Engineering

- **Name**: [CTO/VP Engineering]
- **Email**: [email@example.com]
- **Phone**: [Phone number]
- **Escalation**: P0 incidents with business impact

---

### External Vendor Contacts

**Anthropic Support**:
- **Email**: support@anthropic.com
- **Documentation**: https://docs.anthropic.com/
- **Status Page**: https://status.anthropic.com/

**Firebase/GCP Support**:
- **Support Portal**: https://cloud.google.com/support
- **Phone**: [Your support phone number]
- **Level**: [Your support tier]

**Apple Developer Support**:
- **Portal**: https://developer.apple.com/support/
- **Phone**: 1-800-633-2152

---

## Handoff Sign-Off

### Handoff Checklist Completion

- [ ] All access and credentials documented
- [ ] Repository access granted
- [ ] Infrastructure overview understood
- [ ] Monitoring and alerting configured
- [ ] Support processes documented
- [ ] Emergency contacts verified
- [ ] Deployment procedures tested
- [ ] Rollback procedures tested
- [ ] Runbook reviewed and understood
- [ ] Knowledge transfer sessions completed

---

### Knowledge Transfer Sessions

**Recommended Sessions** (1-2 hours each):

1. **Session 1: Architecture Overview**:
   - [ ] Firebase Cloud Functions architecture
   - [ ] Firestore data model
   - [ ] API endpoints and authentication
   - [ ] External service integrations (Anthropic, Apple)

2. **Session 2: Deployment & Operations**:
   - [ ] Deployment procedures (staging, production)
   - [ ] Rollback procedures
   - [ ] Environment variable management
   - [ ] Secret rotation

3. **Session 3: Monitoring & Incident Response**:
   - [ ] Cloud Monitoring dashboards
   - [ ] Alert policies and response
   - [ ] Log analysis and troubleshooting
   - [ ] Common incidents and resolutions

4. **Session 4: Cost Management & Optimization**:
   - [ ] Current cost breakdown
   - [ ] Cost monitoring and alerts
   - [ ] Optimization opportunities
   - [ ] Budget management

**Action Items**:
- [ ] Schedule knowledge transfer sessions
- [ ] Prepare session materials
- [ ] Conduct sessions with operations team
- [ ] Document questions and answers

---

### Sign-Off

**Backend Team Lead**:
- **Name**: ___________________________
- **Signature**: ___________________________
- **Date**: ___________________________

**Operations Team Lead**:
- **Name**: ___________________________
- **Signature**: ___________________________
- **Date**: ___________________________

**Engineering Manager**:
- **Name**: ___________________________
- **Signature**: ___________________________
- **Date**: ___________________________

---

## Post-Handoff Support

**First 30 Days**:
- Backend team available for questions and support
- Weekly check-in meetings
- On-call shadowing (operations team shadows backend on-call)

**30-60 Days**:
- Backend team on-call backup
- Bi-weekly check-ins
- Operations team takes primary on-call responsibility

**60+ Days**:
- Operations team fully owns on-call
- Backend team available for escalations
- Monthly review meetings

---

## Additional Resources

- [Production Runbook](PRODUCTION_RUNBOOK.md) - Incident response and operational procedures
- [API Reference](API_REFERENCE.md) - Complete API endpoint documentation
- [Error Handling Guide](ERROR_HANDLING.md) - Error codes and handling
- [Security Checklist](SECURITY_CHECKLIST.md) - Security review checklist
- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md) - Deployment procedures
- [Monitoring Guide](MONITORING.md) - Monitoring and observability
- [Cost Optimization Guide](COST_OPTIMIZATION.md) - Cost management strategies

---

**End of Handoff Checklist**

Questions or issues? Contact the Backend Engineering Team.
