# Monitoring & Observability Guide

**Litplan Backend - Production Monitoring Strategy**
**Sprint 4, Day 18 - Production Readiness**

---

## Table of Contents

1. [Overview](#overview)
2. [Key Metrics](#key-metrics)
3. [Dashboards](#dashboards)
4. [Alert Policies](#alert-policies)
5. [Log Analysis](#log-analysis)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Cost Monitoring](#cost-monitoring)
8. [Incident Response](#incident-response)
9. [Monitoring Tools Setup](#monitoring-tools-setup)

---

## Overview

This document outlines the complete monitoring strategy for the Litplan backend. Effective monitoring ensures high availability, optimal performance, and quick incident response.

### Monitoring Philosophy

1. **Proactive, not reactive**: Detect issues before users report them
2. **Data-driven decisions**: Use metrics to guide optimizations
3. **Alert fatigue prevention**: Only alert on actionable issues
4. **User-centric**: Focus on metrics that impact user experience
5. **Cost-aware**: Monitor spending to prevent bill shock

### Monitoring Stack

| Tool | Purpose | Cost |
|------|---------|------|
| Google Cloud Monitoring | Infrastructure & function metrics | Free tier + usage |
| Firebase Performance Monitoring | Client-side performance | Free |
| Cloud Logging | Centralized log aggregation | Free tier + usage |
| Cloud Trace | Distributed tracing | Free tier + usage |
| Budget Alerts | Cost tracking | Free |
| (Optional) Sentry | Error tracking & alerting | $26/month |
| (Optional) PagerDuty | On-call alerting | $19/user/month |

---

## Key Metrics

### 1. Function Performance Metrics

#### API Function (api)

| Metric | Target | Warning | Critical | Description |
|--------|--------|---------|----------|-------------|
| **Invocations** | N/A | N/A | N/A | Total requests per minute |
| **Error Rate** | < 1% | > 3% | > 5% | Percentage of failed requests |
| **p50 Latency** | < 300ms | > 500ms | > 1000ms | Median response time |
| **p95 Latency** | < 800ms | > 1500ms | > 2500ms | 95th percentile response time |
| **p99 Latency** | < 1500ms | > 3000ms | > 5000ms | 99th percentile response time |
| **Active Instances** | 1-10 | > 20 | > 50 | Concurrent function instances |
| **Memory Usage** | < 70% | > 85% | > 95% | Memory utilization |

#### Scheduled Functions

| Function | Frequency | Duration Target | Error Target |
|----------|-----------|-----------------|--------------|
| **weeklyPlanRefresh** | Weekly (Monday 00:00 UTC) | < 30 min | 0 failures |
| **syncSubscriptionStatus** | Daily (02:00 UTC) | < 5 min | < 1% error rate |
| **cleanupUserActivity** | Weekly (Sunday 02:00 UTC) | < 2 min | 0 failures |

### 2. Business Metrics

| Metric | Description | Alert Condition |
|--------|-------------|-----------------|
| **Daily Active Users (DAU)** | Unique users per day | Drop > 30% compared to 7-day avg |
| **Free-to-Pro Conversion Rate** | % of free users upgrading | Drop > 50% compared to 7-day avg |
| **Subscription Validation Success Rate** | % of successful validations | < 95% |
| **Plan Views Per User** | Avg plans viewed per session | Drop > 40% |
| **Weekend Plan Paywall Hit Rate** | % of free users hitting weekend paywall | N/A (monitoring only) |
| **City Limit Paywall Hit Rate** | % of free users hitting city limit | N/A (monitoring only) |

### 3. External Service Metrics

| Service | Metric | Target | Alert |
|---------|--------|--------|-------|
| **Anthropic API** | Success Rate | > 99% | < 95% |
| **Anthropic API** | Latency (p95) | < 5s | > 10s |
| **Anthropic API** | Rate Limit Hits | 0 | > 5 in 1 hour |
| **Apple API** | Success Rate | > 98% | < 95% |
| **Apple API** | Latency (p95) | < 2s | > 5s |
| **Firestore** | Read Latency (p95) | < 100ms | > 500ms |
| **Firestore** | Write Latency (p95) | < 200ms | > 1000ms |

### 4. Security Metrics

| Metric | Description | Alert Condition |
|--------|-------------|-----------------|
| **Rate Limit Violations** | Requests blocked by rate limiter | > 100/hour from single IP |
| **Authentication Failures** | Failed login attempts | > 50/hour from single IP |
| **Duplicate Transaction Attempts** | Potential fraud | > 1 per user |
| **Invalid Receipt Submissions** | Bad receipt data | > 10/hour |
| **Sandbox Receipts in Production** | Wrong environment receipts | > 0 |

---

## Dashboards

### Dashboard 1: System Health Overview

**Purpose**: High-level system health check

**Widgets**:
1. **Total Invocations** (last 24h)
   - Line chart, all functions
2. **Error Rate** (last 24h)
   - Line chart, grouped by function
3. **p95 Latency** (last 24h)
   - Line chart, grouped by endpoint
4. **Active Instances** (real-time)
   - Gauge chart
5. **Current Cost** (month-to-date)
   - Number widget
6. **Scheduled Function Status** (last 7 days)
   - Table: Function name, last run, status, duration

### Dashboard 2: API Performance

**Purpose**: Deep dive into API performance

**Widgets**:
1. **Requests by Endpoint** (last 1h)
   - Bar chart
2. **Error Rate by Endpoint** (last 24h)
   - Heatmap
3. **Latency Distribution** (last 1h)
   - Histogram: p50, p95, p99
4. **Rate Limit Hits** (last 24h)
   - Line chart
5. **Top 10 Slowest Endpoints** (last 1h)
   - Table: Endpoint, p95 latency, count
6. **Error Details** (last 1h)
   - Table: Error code, message, count

### Dashboard 3: Business Metrics

**Purpose**: Track business KPIs

**Widgets**:
1. **Daily Active Users** (last 30 days)
   - Line chart with trend line
2. **Free vs Pro Users** (current)
   - Pie chart
3. **Subscription Conversions** (last 30 days)
   - Line chart: conversions/day
4. **Plan Views** (last 7 days)
   - Stacked bar chart: individual vs group
5. **Paywall Hit Rate** (last 7 days)
   - Line chart: weekend paywall, city limit
6. **Top 10 Cities by Views** (last 7 days)
   - Bar chart

### Dashboard 4: External Services

**Purpose**: Monitor third-party dependencies

**Widgets**:
1. **Anthropic API** (last 24h)
   - Success rate, latency, rate limits
2. **Apple API** (last 24h)
   - Success rate, latency, error codes
3. **Firestore Operations** (last 1h)
   - Reads, writes, deletes, latency
4. **External Service Errors** (last 24h)
   - Table: Service, error, count, last occurrence

---

## Alert Policies

### Critical Alerts (Page On-Call)

**Delivery**: Email + SMS/Phone + PagerDuty

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| **API Down** | Error rate > 50% | 3 minutes | Immediate response |
| **Database Unreachable** | Firestore errors > 90% | 2 minutes | Check Firebase status |
| **Weekly Refresh Failed** | weeklyPlanRefresh fails | Immediate | Check logs, manual trigger |
| **High Memory Usage** | Memory > 95% | 5 minutes | Increase memory allocation |
| **Zero Traffic** | Invocations = 0 | 10 minutes | Check deployment status |

**Incident Response**:
1. Acknowledge alert within 5 minutes
2. Assess severity and impact
3. Execute rollback if needed
4. Communicate status to team
5. Resolve issue
6. Post-mortem within 48 hours

### Warning Alerts (Email Only)

**Delivery**: Email

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| **Elevated Error Rate** | Error rate > 5% | 10 minutes | Investigate logs |
| **Slow Responses** | p95 latency > 2s | 15 minutes | Check performance |
| **High Instance Count** | Active instances > 20 | 10 minutes | Review traffic patterns |
| **Anthropic Rate Limits** | Rate limit hits > 5 | 1 hour | Review refresh job |
| **Failed Subscriptions** | Validation failures > 10% | 1 hour | Check Apple API status |
| **Cost Spike** | Daily cost > $50 | Immediate | Review usage |

**Response Time**: Within 1 hour during business hours

### Informational Alerts (Dashboard Only)

**Delivery**: Dashboard notifications

| Alert | Condition | Purpose |
|-------|-----------|---------|
| **Traffic Patterns** | Unusual traffic | Capacity planning |
| **Conversion Rate Drop** | 20% decrease | Product investigation |
| **Popular Cities** | New trending cities | Content planning |
| **API Usage** | Anthropic usage trends | Cost forecasting |

---

## Log Analysis

### Log-Based Metrics

Create custom metrics from logs to track specific events:

```bash
# 1. Subscription validations
gcloud logging metrics create subscription_validations \
  --description="Count of subscription validation attempts" \
  --log-filter='resource.type="cloud_function"
    resource.labels.function_name="api"
    jsonPayload.message=~"Validating subscription"'

# 2. Pro conversions
gcloud logging metrics create pro_conversions \
  --description="Count of successful Pro upgrades" \
  --log-filter='resource.type="cloud_function"
    resource.labels.function_name="api"
    jsonPayload.message=~"upgraded to Pro successfully"'

# 3. Weekend paywall hits
gcloud logging metrics create weekend_paywall_hits \
  --description="Count of weekend paywall encounters" \
  --log-filter='resource.type="cloud_function"
    resource.labels.function_name="api"
    jsonPayload.error.code="WEEKEND_ACCESS_RESTRICTED"'

# 4. Rate limit violations
gcloud logging metrics create rate_limit_violations \
  --description="Count of rate limit violations" \
  --log-filter='resource.type="cloud_function"
    resource.labels.function_name="api"
    jsonPayload.error.code="RATE_LIMIT_EXCEEDED"'

# 5. Database errors
gcloud logging metrics create database_errors \
  --description="Count of database operation failures" \
  --log-filter='resource.type="cloud_function"
    jsonPayload.error.code=~"DATABASE_ERROR"'
```

### Useful Log Queries

#### Find all errors in last hour
```sql
resource.type="cloud_function"
severity>=ERROR
timestamp >= "2025-01-18T00:00:00Z"
```

#### Track specific user's activity
```sql
resource.type="cloud_function"
jsonPayload.userId="user123"
timestamp >= "2025-01-18T00:00:00Z"
```

#### Find slow requests (> 2 seconds)
```sql
resource.type="cloud_function"
jsonPayload.latency > 2000
timestamp >= "2025-01-18T00:00:00Z"
```

#### Subscription validation failures
```sql
resource.type="cloud_function"
jsonPayload.message=~"subscription validation failed"
severity>=WARNING
```

#### Anthropic API errors
```sql
resource.type="cloud_function"
jsonPayload.error.service="Anthropic API"
severity>=ERROR
```

---

## Performance Benchmarks

### Target Performance (95th Percentile)

| Endpoint | Free Tier | Pro Tier | Max Acceptable |
|----------|-----------|----------|----------------|
| `GET /health` | 50ms | 50ms | 200ms |
| `GET /cities` | 300ms | 300ms | 800ms |
| `GET /cities/:cityId` | 400ms | 400ms | 1000ms |
| `GET /cities/:cityId/plans` | 600ms | 600ms | 1500ms |
| `GET /plans/:planId` | 500ms | 500ms | 1200ms |
| `GET /user/savedCities` | 400ms | 400ms | 1000ms |
| `POST /subscription/validate` | 1500ms | 1500ms | 3000ms |
| `GET /subscription/status` | 200ms | 200ms | 600ms |

### Scheduled Function Benchmarks

| Function | Baseline | Target | Max Acceptable |
|----------|----------|--------|----------------|
| **weeklyPlanRefresh** (10 cities) | 3 min | 5 min | 15 min |
| **weeklyPlanRefresh** (50 cities) | 15 min | 20 min | 45 min |
| **syncSubscriptionStatus** (1000 users) | 2 min | 3 min | 10 min |
| **cleanupUserActivity** | 1 min | 2 min | 5 min |

### Throughput Targets

| Metric | Current | Target | Max Capacity |
|--------|---------|--------|--------------|
| **Requests per second** | 10-50 | 100 | 500 |
| **Concurrent users** | 100 | 1000 | 5000 |
| **Plans generated per week** | 500 | 2500 | 10000 |
| **Subscription validations per hour** | 10 | 50 | 200 |

---

## Cost Monitoring

### Monthly Budget

| Service | Estimated | Threshold | Alert |
|---------|-----------|-----------|-------|
| **Cloud Functions** | $20 | $40 | 80% |
| **Firestore** | $10 | $20 | 80% |
| **Anthropic API** | $520 | $650 | 90% |
| **Cloud Storage** | $5 | $10 | 80% |
| **Cloud Monitoring** | $5 | $10 | 80% |
| **Total** | **$560** | **$730** | **80%** |

### Cost Optimization Queries

#### Top 10 most expensive functions
```sql
SELECT
  resource.labels.function_name,
  SUM(usage.amount) as total_invocations,
  SUM(usage.amount * execution_time) as total_execution_time
FROM billing_export
WHERE resource.type = 'cloud_function'
  AND DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY function_name
ORDER BY total_execution_time DESC
LIMIT 10
```

#### Firestore usage by collection
```sql
SELECT
  operation_type,
  collection_id,
  COUNT(*) as operation_count,
  SUM(bytes_read) as total_bytes_read
FROM firestore_audit_logs
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY operation_type, collection_id
ORDER BY operation_count DESC
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 - Critical** | Complete service outage | < 15 min | API down, database unavailable |
| **P1 - High** | Major functionality broken | < 1 hour | Subscriptions failing, plans not loading |
| **P2 - Medium** | Degraded performance | < 4 hours | Slow responses, elevated errors |
| **P3 - Low** | Minor issues | Next business day | Single user issue, cosmetic bug |

### Incident Response Playbook

#### 1. API Down (P0)

**Symptoms**:
- Error rate > 50%
- Zero successful requests
- HTTP 500/502/503 errors

**Response**:
1. Check Firebase Functions status page
2. Check recent deployments (rollback if needed)
3. Check Cloud Functions logs for errors
4. Verify Firestore is accessible
5. Check external service status (Anthropic, Apple)
6. Scale up instances if traffic spike
7. Communicate status to team/users

**Rollback Command**:
```bash
# Rollback to previous version
firebase deploy --only functions --force
```

#### 2. Weekly Refresh Failed (P1)

**Symptoms**:
- weeklyPlanRefresh function failed
- No new plans generated
- Cities showing stale data

**Response**:
1. Check function logs for error details
2. Verify Anthropic API is accessible
3. Check Anthropic API rate limits
4. Verify Firestore write permissions
5. Manually trigger function if needed
6. Monitor retry attempts

**Manual Trigger**:
```bash
# Trigger function manually
gcloud functions call weeklyPlanRefresh --region=us-central1

# Or use dry-run mode first
firebase functions:config:set refresh.dry_run="true"
gcloud functions call weeklyPlanRefresh --region=us-central1
```

#### 3. High Error Rate (P2)

**Symptoms**:
- Error rate 5-25%
- Specific endpoints failing
- User reports of issues

**Response**:
1. Identify affected endpoints
2. Check recent code changes
3. Review error messages in logs
4. Check rate limiting
5. Verify input validation
6. Monitor for pattern (specific users, times, etc.)

### Post-Incident Actions

1. **Immediate** (< 1 hour):
   - Confirm resolution
   - Update alert status
   - Communicate to stakeholders

2. **Short-term** (< 24 hours):
   - Document timeline
   - Identify root cause
   - Implement temporary fix if needed

3. **Long-term** (< 1 week):
   - Write post-mortem
   - Implement permanent fix
   - Add monitoring/alerts to prevent recurrence
   - Share learnings with team

---

## Monitoring Tools Setup

### 1. Google Cloud Monitoring

#### Create Custom Dashboard

```bash
# Navigate to Cloud Console
# Monitoring > Dashboards > Create Dashboard

# Add widgets for:
# - Function invocations (line chart)
# - Error rate (gauge)
# - p95 latency (line chart)
# - Active instances (number)
```

#### Set Up Alert Policies

```bash
# High error rate alert
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --condition-filter='resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_count" AND metric.label.status!="ok"'
```

### 2. Log-Based Alerts

```bash
# Alert on critical errors
gcloud logging sinks create critical-errors \
  pubsub.googleapis.com/projects/PROJECT_ID/topics/critical-errors \
  --log-filter='severity>=CRITICAL'
```

### 3. Uptime Checks

```bash
# Create uptime check for API health endpoint
gcloud monitoring uptime create http \
  --display-name="API Health Check" \
  --uri="https://us-central1-PROJECT_ID.cloudfunctions.net/api/health" \
  --check-interval=1m \
  --timeout=10s
```

### 4. Cost Budget Alerts

```bash
# Set up budget alert in Cloud Console
# Billing > Budgets & Alerts
# Set budget: $600/month
# Alert thresholds: 50%, 80%, 100%
# Add email notifications
```

---

## Best Practices

### 1. Logging

- Use structured logging (JSON format)
- Include context: userId, endpoint, request ID
- Don't log sensitive data (passwords, tokens)
- Use appropriate severity levels
- Add correlation IDs for tracing

### 2. Metrics

- Track both technical and business metrics
- Set realistic SLOs (Service Level Objectives)
- Monitor trends, not just absolute values
- Use percentiles (p95, p99) over averages

### 3. Alerts

- Alert on symptoms, not causes
- Make alerts actionable
- Avoid alert fatigue (tune thresholds)
- Use escalation policies
- Test alerts regularly

### 4. Dashboards

- Design for glance-ability
- Group related metrics
- Use appropriate visualizations
- Keep dashboards up to date
- Share with entire team

---

**Last Updated**: January 18, 2025 | Sprint 4, Day 18
**Version**: 1.0.0
**Maintained by**: Litplan Backend Team
