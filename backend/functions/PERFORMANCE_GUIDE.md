# Performance Optimization Guide

This guide outlines performance targets, optimization strategies, and monitoring approaches for the Litplan backend.

## Table of Contents
- [Response Time Targets](#response-time-targets)
- [Current Optimizations](#current-optimizations)
- [Firestore Cost Optimization](#firestore-cost-optimization)
- [Rate Limiting Strategy](#rate-limiting-strategy)
- [Caching Strategy](#caching-strategy)
- [Monitoring & Alerting](#monitoring--alerting)
- [Performance Metrics](#performance-metrics)
- [Optimization Checklist](#optimization-checklist)

## Response Time Targets

### API Endpoint Performance Goals

| Endpoint Category | Target (p50) | Target (p95) | Target (p99) | Current Status |
|------------------|--------------|--------------|--------------|----------------|
| Authentication | < 200ms | < 500ms | < 1000ms | ✅ Cached tokens |
| Subscription Validation | < 500ms | < 1500ms | < 3000ms | ⚠️ External API call |
| Subscription Status | < 100ms | < 300ms | < 500ms | ✅ Cached entitlements |
| Cities List | < 200ms | < 500ms | < 1000ms | ✅ Small dataset |
| City Details | < 150ms | < 400ms | < 800ms | ✅ Optimized |
| Plans List | < 250ms | < 600ms | < 1200ms | ✅ Indexed |
| Plan Details | < 300ms | < 800ms | < 1500ms | ⚠️ Searches all cities |
| Saved Cities (Read) | < 200ms | < 500ms | < 1000ms | ⚠️ N+1 query pattern |
| Saved Cities (Write) | < 150ms | < 400ms | < 800ms | ✅ Single write |

### Performance Thresholds
- **Fast**: < 200ms - Excellent user experience
- **Acceptable**: 200-500ms - Good user experience
- **Slow**: 500-1000ms - Noticeable delay, needs optimization
- **Critical**: > 1000ms - Poor user experience, triggers performance logger

## Current Optimizations

### ✅ Implemented (Sprint 3, Day 14)

#### 1. Rate Limiting
**Purpose**: Prevent abuse and ensure fair resource allocation

- **Token bucket algorithm**: Smooth rate limiting with burst allowance
- **In-memory store**: Fast lookups without database overhead
- **Automatic cleanup**: Removes stale entries every hour
- **Presets**:
  - Subscription endpoints: 10 req/min (validate, restore)
  - Subscription status: 100 req/min
  - Browsing endpoints: 200 req/min (cities, plans)
  - Mutation endpoints: 30 req/min (save/unsave)

**Benefits**:
- Prevents API abuse
- Reduces unnecessary Firestore reads
- Protects against DDoS attacks
- Fair resource allocation across users

#### 2. Entitlements Caching
**Purpose**: Reduce Firestore reads for frequently accessed user data

- **Cache location**: In-memory store (Node.js process)
- **TTL**: 5 minutes
- **Cache key**: `userId`
- **Invalidation**: Automatic on subscription updates
- **Cleanup interval**: 10 minutes

**Impact**:
- Reduces Firestore reads by ~80% for entitlement checks
- Improves response time from ~150ms to ~5ms (cached)
- Saves ~$0.05 per 100,000 entitlement checks

#### 3. Request Logging
**Purpose**: Monitor API performance and identify bottlenecks

- **Logged data**: userId, method, path, statusCode, duration, IP, userAgent
- **Performance logger**: Alerts on requests > 1000ms
- **Error logger**: Logs all 4xx/5xx responses
- **Format**: JSON for easy parsing and analysis

**Benefits**:
- Real-time performance monitoring
- Identify slow endpoints
- Track error rates
- Debug user-specific issues

#### 4. Composite Indexes
**Purpose**: Optimize multi-field queries

- Cities: `metadata.featured` + `rank`
- Plans: `flags.isIndividual` + `rank`
- Plans: `flags.isGroup` + `rank`
- Users: `subscription.tier` + `subscription.expiryDate`

**Benefits**:
- Faster query execution
- Reduced read costs
- Support for complex filtering

### 🔄 Needs Optimization

#### 1. Plan Details Endpoint
**Current Issue**: Searches all cities sequentially to find plan

```typescript
// Current (inefficient)
for (const cityDoc of citiesSnapshot.docs) {
  const planSnapshot = await cityDoc.ref
    .collection('plans')
    .where('planId', '==', planId)
    .limit(1)
    .get();
  // ...
}
```

**Optimization Options**:
1. **Add cityId to request** (recommended)
   - Change endpoint to `/cities/:cityId/plans/:planId`
   - Direct lookup without searching
   - Reduces from O(n) to O(1)

2. **Denormalize plan data**
   - Store top-level `/plans/{planId}` collection
   - Reference back to city document
   - Trade-off: Additional storage and write complexity

3. **Use collection group query**
   - Query all `plans` subcollections at once
   - Requires collection group index
   - Still slower than direct lookup

**Estimated Impact**: 300ms → 100ms (70% reduction)

#### 2. Saved Cities Endpoint
**Current Issue**: Fetches each city individually in a loop

```typescript
// Current (N+1 pattern)
for (const cityId of savedCityIds) {
  const citySnapshot = await db.collection('cities')
    .where('cityId', '==', cityId)
    .limit(1)
    .get();
  // ...
}
```

**Optimization Options**:
1. **Use `in` query** (recommended for ≤10 cities)
   ```typescript
   const citiesSnapshot = await db.collection('cities')
     .where('cityId', 'in', savedCityIds.slice(0, 10))
     .get();
   ```
   - Firestore `in` limited to 10 values
   - Need to batch if user has > 10 saved cities

2. **Denormalize city data**
   - Store city metadata in user document
   - Trade-off: Data duplication, update complexity

3. **Cache saved cities**
   - In-memory cache with TTL
   - Invalidate on save/unsave

**Estimated Impact**: 200ms → 80ms (60% reduction for ≤10 cities)

## Firestore Cost Optimization

### Current Costs (Estimated)

Based on 10,000 active users:

| Operation | Monthly Volume | Cost per 100k | Monthly Cost |
|-----------|----------------|---------------|--------------|
| User reads (entitlements) | 5M | $0.06 | $3.00 |
| City reads | 500K | $0.06 | $0.30 |
| Plan reads | 2M | $0.06 | $1.20 |
| User writes (tracking) | 1M | $0.18 | $1.80 |
| **Total** | | | **$6.30** |

### After Optimizations (Estimated)

| Operation | Monthly Volume | Cost per 100k | Monthly Cost | Savings |
|-----------|----------------|---------------|--------------|---------|
| User reads (cached) | 1M | $0.06 | $0.60 | $2.40 ✅ |
| City reads | 500K | $0.06 | $0.30 | $0.00 |
| Plan reads | 2M | $0.06 | $1.20 | $0.00 |
| User writes | 1M | $0.18 | $1.80 | $0.00 |
| **Total** | | | **$3.90** | **$2.40 (38%)** |

### Additional Optimization Strategies

#### 1. Reduce Write Operations
- Batch write operations where possible
- Only update `updatedAt` when meaningful changes occur
- Consider throttling activity tracking (e.g., max 1 write per minute per user)

#### 2. Implement Read Caching
- Cache city list (updates only on weekly refresh)
- Cache plan metadata (updates only on weekly refresh)
- Use CDN for static content (images, descriptions)

#### 3. Optimize Data Storage
- Remove old activity records (implemented in `cleanupUserActivity`)
- Archive inactive user data after 90 days
- Compress large text fields (descriptions, reviews)

#### 4. Monitor Usage Patterns
- Track read/write ratios per endpoint
- Identify high-cost queries
- Optimize or rate-limit expensive operations

## Rate Limiting Strategy

### Current Configuration

| Endpoint | Limit | Window | Reasoning |
|----------|-------|--------|-----------|
| `/subscription/validate` | 10 req/min | 60s | Expensive Apple API calls |
| `/subscription/restore` | 10 req/min | 60s | Expensive Apple API calls |
| `/subscription/status` | 100 req/min | 60s | Frequent checks, low cost |
| `/cities/*` | 200 req/min | 60s | Browsing behavior |
| `/plans/:planId` | 200 req/min | 60s | Browsing behavior |
| `/cities/save` | 30 req/min | 60s | Write operations |
| `/cities/save/:cityId` | 30 req/min | 60s | Write operations |

### Rate Limit Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 seconds.",
    "retryAfter": 45
  }
}
```

**HTTP Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds until next request allowed (on 429)

### Adjusting Rate Limits

To change rate limits, update the preset in `rateLimiter.ts`:

```typescript
export const RateLimitPresets = {
  subscription: {
    maxRequests: 20, // Increase from 10
    windowMs: 60 * 1000,
  },
};
```

Or create custom rate limiter:

```typescript
import { rateLimiter } from '../utils/rateLimiter';

router.get('/custom-endpoint',
  rateLimiter(50, 60 * 1000), // 50 req/min
  async (req, res) => {
    // ...
  }
);
```

## Caching Strategy

### Current Implementation

#### 1. Entitlements Cache
- **What**: User subscription tier and entitlements
- **Where**: In-memory (Node.js process)
- **TTL**: 5 minutes
- **Size**: ~500 bytes per user
- **Max entries**: Unlimited (cleanup removes stale)
- **Invalidation**: On subscription updates

**Trade-offs**:
- ✅ Fast lookups (~5ms vs ~150ms)
- ✅ Reduces Firestore costs
- ❌ Stale data for up to 5 minutes
- ❌ Doesn't persist across function cold starts
- ❌ Not shared across Cloud Function instances

#### 2. Rate Limiter Store
- **What**: Token buckets for rate limiting
- **Where**: In-memory (Node.js process)
- **TTL**: 1 hour (automatic cleanup)
- **Size**: ~200 bytes per bucket
- **Max entries**: Unlimited (cleanup removes stale)

### Future Caching Enhancements

#### 1. Redis for Distributed Caching
**Use Case**: Share cache across Cloud Function instances

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const getCachedEntitlements = async (userId: string) => {
  const cached = await redis.get(`entitlements:${userId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from Firestore
  const entitlements = await fetchFromFirestore(userId);

  // Cache for 5 minutes
  await redis.setex(`entitlements:${userId}`, 300, JSON.stringify(entitlements));

  return entitlements;
};
```

**Benefits**:
- Shared across all function instances
- Persists across cold starts
- TTL support built-in
- Can use Redis Pub/Sub for cache invalidation

**Costs**: ~$15/month for managed Redis (Memorystore)

#### 2. CDN Caching for Static Content
**Use Case**: Cache city/plan images and static data

- Use Cloud CDN or Cloudflare
- Set `Cache-Control` headers on image responses
- Reduce bandwidth costs
- Improve global latency

#### 3. Application-Level Caching
**Use Case**: Cache rarely-changing data (cities list)

```typescript
let citiesCache: any[] | null = null;
let citiesCacheTime = 0;
const CITIES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const getCities = async () => {
  const now = Date.now();

  if (citiesCache && (now - citiesCacheTime) < CITIES_CACHE_TTL) {
    return citiesCache;
  }

  citiesCache = await fetchCitiesFromFirestore();
  citiesCacheTime = now;

  return citiesCache;
};
```

## Monitoring & Alerting

### Current Logging

#### 1. Request Logger
Logs every API request:
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "userId": "user123",
  "method": "GET",
  "path": "/cities/nyc",
  "statusCode": 200,
  "duration": "145ms",
  "ip": "203.0.113.0",
  "userAgent": "LitplanApp/1.0 iOS/17.0"
}
```

#### 2. Performance Logger
Logs slow requests (>1000ms):
```json
{
  "type": "SLOW_REQUEST",
  "timestamp": "2025-01-15T10:31:22.456Z",
  "userId": "user456",
  "method": "GET",
  "path": "/plans/plan789",
  "statusCode": 200,
  "duration": "1534ms",
  "threshold": "1000ms"
}
```

#### 3. Error Logger
Logs failed requests (4xx, 5xx):
```json
{
  "type": "ERROR_RESPONSE",
  "timestamp": "2025-01-15T10:32:10.789Z",
  "userId": "user789",
  "method": "POST",
  "path": "/cities/save",
  "statusCode": 403,
  "ip": "203.0.113.0"
}
```

### Recommended Monitoring Setup

#### 1. Cloud Logging Queries

**Find slow endpoints**:
```
resource.type="cloud_function"
jsonPayload.type="SLOW_REQUEST"
```

**Find error patterns**:
```
resource.type="cloud_function"
jsonPayload.type="ERROR_RESPONSE"
severity>=ERROR
```

**Track endpoint usage**:
```
resource.type="cloud_function"
jsonPayload.method="GET"
jsonPayload.path="/cities/*"
```

#### 2. Cloud Monitoring Metrics

Create custom metrics from logs:

1. **Average Response Time**:
   - Metric: `jsonPayload.duration`
   - Aggregation: Average
   - Group by: `jsonPayload.path`

2. **Error Rate**:
   - Metric: Count of logs where `jsonPayload.statusCode >= 400`
   - Aggregation: Rate
   - Group by: `jsonPayload.path`

3. **Request Volume**:
   - Metric: Count of all requests
   - Aggregation: Count
   - Group by: `jsonPayload.path`

#### 3. Alerting Policies

**High Error Rate**:
```yaml
condition:
  displayName: "High Error Rate (>5%)"
  conditionThreshold:
    filter: |
      resource.type="cloud_function"
      jsonPayload.statusCode>=400
    aggregations:
      - alignmentPeriod: 60s
        perSeriesAligner: ALIGN_RATE
    comparison: COMPARISON_GT
    thresholdValue: 0.05
    duration: 300s
notificationChannels:
  - projects/litplan-ai/notificationChannels/email-devs
```

**Slow Response Times**:
```yaml
condition:
  displayName: "Slow Responses (p95 > 1s)"
  conditionThreshold:
    filter: |
      resource.type="cloud_function"
      jsonPayload.duration
    aggregations:
      - alignmentPeriod: 300s
        perSeriesAligner: ALIGN_PERCENTILE_95
    comparison: COMPARISON_GT
    thresholdValue: 1000
    duration: 300s
```

**High Request Rate** (potential abuse):
```yaml
condition:
  displayName: "Unusual Request Spike"
  conditionThreshold:
    filter: |
      resource.type="cloud_function"
    aggregations:
      - alignmentPeriod: 60s
        perSeriesAligner: ALIGN_RATE
    comparison: COMPARISON_GT
    thresholdValue: 1000
    duration: 120s
```

## Performance Metrics

### Key Performance Indicators (KPIs)

#### 1. Response Time Metrics
- **p50 (median)**: 50% of requests complete in this time
- **p95**: 95% of requests complete in this time
- **p99**: 99% of requests complete in this time
- **Max**: Slowest request

**Target Distribution**:
- p50 < 200ms: 80% of endpoints
- p95 < 500ms: 90% of endpoints
- p99 < 1000ms: 95% of endpoints

#### 2. Availability Metrics
- **Uptime**: 99.9% target (43 minutes downtime/month)
- **Error rate**: < 1% target
- **Success rate**: > 99% target

#### 3. Cost Metrics
- **Cost per user**: < $0.01/month target
- **Cost per request**: < $0.0001 target
- **Total Firestore cost**: < $50/month at 10k users

### Benchmarking Endpoints

Use the included performance test script:

```bash
# Test single endpoint
curl -w "\nTime: %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  https://us-central1-litplan-ai.cloudfunctions.net/api/cities/nyc

# Test with multiple requests (using Apache Bench)
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  https://us-central1-litplan-ai.cloudfunctions.net/api/cities/nyc
```

Expected output:
```
Requests per second:    50.00 [#/sec] (mean)
Time per request:       20.000 [ms] (mean)
Time per request:       200.000 [ms] (mean, across all concurrent requests)
```

## Optimization Checklist

### Before Deployment
- [ ] All composite indexes created
- [ ] Rate limiting applied to all endpoints
- [ ] Caching implemented for frequently accessed data
- [ ] Request logging enabled
- [ ] Performance thresholds configured

### Weekly Monitoring
- [ ] Review slow request logs
- [ ] Check error rates
- [ ] Monitor Firestore costs
- [ ] Review rate limit hits
- [ ] Check cache hit rates

### Monthly Review
- [ ] Analyze endpoint usage patterns
- [ ] Review and adjust rate limits
- [ ] Optimize high-cost queries
- [ ] Update performance targets
- [ ] Cost optimization opportunities

### Quarterly Improvements
- [ ] Benchmark against targets
- [ ] Implement new caching strategies
- [ ] Refactor slow endpoints
- [ ] Update documentation
- [ ] Review and update alerting policies

## Troubleshooting Performance Issues

### Issue: Slow API responses

**Diagnosis**:
1. Check performance logger for slow endpoints
2. Review Firestore query execution time
3. Check if indexes are being used
4. Verify rate limiting isn't causing delays

**Solutions**:
- Add missing indexes
- Implement caching
- Optimize query structure
- Consider denormalization

### Issue: High Firestore costs

**Diagnosis**:
1. Review Firestore usage in console
2. Identify high-volume queries
3. Check for N+1 query patterns
4. Monitor cache hit rates

**Solutions**:
- Implement aggressive caching
- Reduce unnecessary reads
- Batch operations
- Archive old data

### Issue: Rate limit errors

**Diagnosis**:
1. Check rate limit headers in responses
2. Review user request patterns
3. Identify abnormal traffic

**Solutions**:
- Adjust rate limits if legitimate traffic
- Implement client-side retry with backoff
- Add user education about limits
- Consider graduated rate limits by tier

### Issue: Memory issues

**Diagnosis**:
1. Monitor Cloud Functions memory usage
2. Check cache sizes
3. Review for memory leaks

**Solutions**:
- Increase function memory allocation
- Implement cache size limits
- Add cache cleanup intervals
- Optimize data structures

## Next Steps

1. **Implement missing optimizations**:
   - Optimize plan details endpoint (add cityId to request)
   - Optimize saved cities endpoint (use `in` query)
   - Add CDN caching for images

2. **Set up monitoring**:
   - Create Cloud Monitoring dashboards
   - Configure alerting policies
   - Set up weekly performance reports

3. **Continuous improvement**:
   - Review logs weekly
   - Benchmark quarterly
   - Update targets as user base grows
   - Document new optimizations

4. **Scale planning**:
   - Project costs at 100k users
   - Plan for Redis implementation
   - Consider microservices architecture
   - Evaluate Cloud Run for better scaling
