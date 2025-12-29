# Firestore Indexes Guide

This document outlines the required Firestore indexes for optimal query performance in the Litplan backend.

## Table of Contents
- [Composite Indexes](#composite-indexes)
- [Single-Field Indexes](#single-field-indexes)
- [Index Creation Commands](#index-creation-commands)
- [Query Optimization Best Practices](#query-optimization-best-practices)

## Composite Indexes

Composite indexes are required when queries filter or sort on multiple fields.

### 1. Cities Collection

#### Featured Cities Query
**Query**: `cities.where('metadata.featured', '==', true).orderBy('rank', 'asc')`

```json
{
  "collectionGroup": "cities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "metadata.featured", "order": "ASCENDING" },
    { "fieldPath": "rank", "order": "ASCENDING" }
  ]
}
```

**gcloud command**:
```bash
gcloud firestore indexes composite create \
  --collection-group=cities \
  --query-scope=COLLECTION \
  --field-config field-path=metadata.featured,order=ascending \
  --field-config field-path=rank,order=ascending
```

### 2. Plans Subcollection (cities/{cityId}/plans)

#### Individual Plans by Rank
**Query**: `plans.where('flags.isIndividual', '==', true).orderBy('rank', 'asc')`

```json
{
  "collectionGroup": "plans",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "flags.isIndividual", "order": "ASCENDING" },
    { "fieldPath": "rank", "order": "ASCENDING" }
  ]
}
```

**gcloud command**:
```bash
gcloud firestore indexes composite create \
  --collection-group=plans \
  --query-scope=COLLECTION \
  --field-config field-path=flags.isIndividual,order=ascending \
  --field-config field-path=rank,order=ascending
```

#### Group Plans by Rank
**Query**: `plans.where('flags.isGroup', '==', true).orderBy('rank', 'asc')`

```json
{
  "collectionGroup": "plans",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "flags.isGroup", "order": "ASCENDING" },
    { "fieldPath": "rank", "order": "ASCENDING" }
  ]
}
```

**gcloud command**:
```bash
gcloud firestore indexes composite create \
  --collection-group=plans \
  --query-scope=COLLECTION \
  --field-config field-path=flags.isGroup,order=ascending \
  --field-config field-path=rank,order=ascending
```

### 3. Users Collection

#### User Subscription Status (if querying by tier and expiry)
**Query**: `users.where('subscription.tier', '==', 'pro').where('subscription.expiryDate', '<', now)`

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "subscription.tier", "order": "ASCENDING" },
    { "fieldPath": "subscription.expiryDate", "order": "ASCENDING" }
  ]
}
```

**gcloud command**:
```bash
gcloud firestore indexes composite create \
  --collection-group=users \
  --query-scope=COLLECTION \
  --field-config field-path=subscription.tier,order=ascending \
  --field-config field-path=subscription.expiryDate,order=ascending
```

## Single-Field Indexes

Firestore automatically creates single-field indexes for most fields. However, you may need to explicitly create or configure them for:

### Cities Collection
- `cityId` (ascending, descending) - for lookups
- `rank` (ascending) - for ordering
- `metadata.featured` (ascending) - for filtering

### Plans Subcollection
- `planId` (ascending, descending) - for lookups
- `rank` (ascending) - for ordering
- `flags.isWeekend` (ascending) - for filtering
- `flags.isIndividual` (ascending) - for filtering
- `flags.isGroup` (ascending) - for filtering

### Users Collection
- `subscription.tier` (ascending) - for filtering by tier
- `subscription.expiryDate` (ascending) - for expiry checks
- `createdAt` (ascending, descending) - for user analytics
- `updatedAt` (ascending, descending) - for tracking changes

### GroupFlows Subcollection
- `createdAt` (descending) - for ordering latest flows first

## Index Creation Commands

### Using gcloud CLI

1. **Install gcloud CLI** (if not already installed):
   ```bash
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. **Set your project**:
   ```bash
   gcloud config set project litplan-ai
   ```

3. **Create all required indexes**:
   ```bash
   # Featured cities
   gcloud firestore indexes composite create \
     --collection-group=cities \
     --query-scope=COLLECTION \
     --field-config field-path=metadata.featured,order=ascending \
     --field-config field-path=rank,order=ascending

   # Individual plans
   gcloud firestore indexes composite create \
     --collection-group=plans \
     --query-scope=COLLECTION \
     --field-config field-path=flags.isIndividual,order=ascending \
     --field-config field-path=rank,order=ascending

   # Group plans
   gcloud firestore indexes composite create \
     --collection-group=plans \
     --query-scope=COLLECTION \
     --field-config field-path=flags.isGroup,order=ascending \
     --field-config field-path=rank,order=ascending

   # User subscription status
   gcloud firestore indexes composite create \
     --collection-group=users \
     --query-scope=COLLECTION \
     --field-config field-path=subscription.tier,order=ascending \
     --field-config field-path=subscription.expiryDate,order=ascending
   ```

### Using Firebase Console

1. Navigate to [Firebase Console](https://console.firebase.google.com)
2. Select your project (litplan-ai)
3. Go to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Enter the collection path and field configurations
6. Click **Create**

### Using firestore.indexes.json

Create a `firestore.indexes.json` file in your project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "cities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "metadata.featured", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "plans",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "flags.isIndividual", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "plans",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "flags.isGroup", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "subscription.tier", "order": "ASCENDING" },
        { "fieldPath": "subscription.expiryDate", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

## Query Optimization Best Practices

### 1. Use Indexes for All Compound Queries
- Any query that filters on multiple fields requires a composite index
- Any query that filters on one field and orders by another requires a composite index
- Firestore will provide an error link to create the index if missing

### 2. Limit Result Sets
- Always use `.limit()` to prevent fetching unnecessary documents
- Current limits:
  - Cities list: No limit (small dataset ~50 cities)
  - Plans per city: 10 for free, 50 for pro
  - Group flows: 10 max
  - Saved cities: No limit (user-specific, typically small)

### 3. Use Collection Group Queries Sparingly
- Collection group queries scan all collections with the same name
- Use only when necessary (e.g., searching for a plan across all cities)
- Prefer querying specific document paths when possible

### 4. Optimize Field Paths
- Nested fields (e.g., `metadata.featured`) require explicit indexing
- Keep frequently queried fields at the root level when possible
- Consider denormalization for performance-critical queries

### 5. Cache Frequently Accessed Data
- Implement in-memory caching for read-heavy data (✅ Done for user entitlements)
- Cache TTL: 5 minutes for user entitlements
- Invalidate cache on writes

### 6. Batch Reads When Possible
- Use `.get()` with multiple document references when fetching related data
- Example: Fetching saved cities (currently done in loop, could be optimized)

### 7. Monitor Query Performance
- Use Firebase Performance Monitoring
- Track slow queries (>1000ms threshold in requestLogger)
- Review Firestore usage metrics in Firebase Console

### 8. Avoid N+1 Query Problems
- **Current Issue**: Saved cities endpoint fetches each city individually in a loop
- **Optimization**: Consider using a single query with `where('cityId', 'in', savedCityIds)`
- **Limitation**: Firestore `in` operator limited to 10 values

### 9. Denormalize When Appropriate
- Store frequently accessed data in parent documents
- Example: `metadata.totalPlansThisWeek` on city documents (already implemented)
- Trade-off: Increased storage for reduced read operations

### 10. Use Transactions for Consistency
- Use transactions when updating related documents
- Example: Updating user entitlements and subscription status together
- Firestore transactions limited to 500 documents

## Cost Optimization

### Read Operations
- **Current**: ~$0.06 per 100,000 reads
- **Optimization**: Cache user entitlements (reduces ~80% of user reads)
- **Estimated savings**: $0.05 per 100,000 user checks

### Write Operations
- **Current**: ~$0.18 per 100,000 writes
- **Optimization**: Batch writes when possible
- **Note**: Most writes are user-initiated (tracking views, saving cities)

### Storage
- **Current**: $0.18/GB/month
- **Optimization**: Clean up old activity data (implemented in cleanupUserActivity)
- **Retention**: 90 days for pro users, current week for free users

## Monitoring Queries

### Enable Firestore Query Profiling
```bash
gcloud firestore operations list
```

### View Index Usage
1. Firebase Console → Firestore → Usage tab
2. Review "Reads by index" metrics
3. Identify missing or underutilized indexes

### Set Up Alerts
1. Cloud Console → Monitoring → Alerting
2. Create alerts for:
   - High read/write costs
   - Slow query performance
   - Index creation failures

## Troubleshooting

### Common Issues

#### 1. "The query requires an index"
- Error message includes a link to create the index
- Click the link or use the gcloud command from error message
- Index creation typically takes a few minutes

#### 2. Index creation failed
- Check field paths are correct (case-sensitive)
- Verify collection names match exactly
- Ensure you have proper permissions

#### 3. Query still slow after adding index
- Check if index is fully built (can take time for large collections)
- Verify query is using the correct index (check query plan)
- Consider adding caching layer

#### 4. Too many indexes
- Review and remove unused indexes
- Consolidate similar indexes where possible
- Monitor index storage costs

## Next Steps

1. **Create all required indexes** using the gcloud commands above
2. **Monitor query performance** using the request logger
3. **Optimize saved cities endpoint** to use `in` query or denormalize data
4. **Set up performance monitoring** in Firebase Console
5. **Review costs monthly** and adjust optimizations as needed
