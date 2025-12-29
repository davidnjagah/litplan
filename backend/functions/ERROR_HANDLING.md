# Error Handling Guide

**Sprint 4, Day 17** - Comprehensive error handling documentation for Litplan backend.

## Table of Contents
- [Error Response Format](#error-response-format)
- [Error Codes](#error-codes)
- [Error Classes](#error-classes)
- [Retry Strategies](#retry-strategies)
- [Client Error Handling](#client-error-handling)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Production Debugging](#production-debugging)

---

## Error Response Format

All API errors follow a consistent JSON format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "retryAfter": 60,  // Optional: for rate limit errors (seconds)
    "timestamp": "2025-01-15T10:30:00Z"  // Optional: development only
  }
}
```

### Success Response Format

Success responses follow this format:

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

---

## Error Codes

### Authentication Errors (401)

| Code | Description | User Action |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | Invalid or missing auth token | Re-authenticate |
| `INVALID_TOKEN` | Token is malformed or expired | Login again |
| `TOKEN_EXPIRED` | Token has expired | Refresh token |
| `UNAUTHORIZED` | General auth failure | Check credentials |

### Authorization Errors (403)

| Code | Description | User Action |
|------|-------------|-------------|
| `AUTHORIZATION_ERROR` | Insufficient permissions | Upgrade subscription |
| `PRO_TIER_REQUIRED` | Feature requires Pro subscription | Show paywall |
| `WEEKEND_ACCESS_RESTRICTED` | Weekend plans require Pro | Show paywall |
| `PLAN_LIMIT_REACHED` | City plan limit reached | Upgrade or wait |
| `CITY_LIMIT_REACHED` | Weekly city limit reached | Upgrade or wait |

### Validation Errors (400)

| Code | Description | User Action |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid request data | Fix request |
| `MISSING_REQUIRED_FIELD` | Required field missing | Add missing field |
| `INVALID_FORMAT` | Wrong data format | Correct format |
| `INVALID_VALUE` | Invalid field value | Use valid value |

### Resource Errors (404)

| Code | Description | User Action |
|------|-------------|-------------|
| `NOT_FOUND` | Resource doesn't exist | Check resource ID |
| `PLAN_NOT_FOUND` | Plan doesn't exist | Browse other plans |
| `CITY_NOT_FOUND` | City doesn't exist | Select valid city |
| `USER_NOT_FOUND` | User doesn't exist | Check user ID |

### Subscription Errors (400/409)

| Code | Description | User Action |
|------|-------------|-------------|
| `SUBSCRIPTION_ERROR` | Subscription validation failed | Retry or contact support |
| `INVALID_RECEIPT` | Apple receipt invalid | Check purchase |
| `SUBSCRIPTION_EXPIRED` | Subscription expired | Renew subscription |
| `DUPLICATE_TRANSACTION` | Transaction already processed | Ignore (idempotent) |
| `SUBSCRIPTION_ALREADY_ACTIVE` | User already has active sub | View subscription status |

### Rate Limit Errors (429)

| Code | Description | User Action |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |

Response includes `retryAfter` field indicating seconds to wait.

### External Service Errors (502)

| Code | Description | User Action |
|------|-------------|-------------|
| `EXTERNAL_SERVICE_ERROR` | Third-party API failed | Retry or wait |
| `ANTHROPIC_API_ERROR` | AI service unavailable | Retry later |
| `APPLE_API_ERROR` | Apple API failure | Retry later |

### Database Errors (500)

| Code | Description | User Action |
|------|-------------|-------------|
| `DATABASE_ERROR` | Database operation failed | Retry |
| `INTERNAL_ERROR` | Unexpected server error | Retry or contact support |

---

## Error Classes

### Custom Error Hierarchy

```typescript
BaseError (abstract)
├── ValidationError (400)
│   ├── missingField()
│   ├── invalidFormat()
│   ├── invalidValue()
│   └── outOfRange()
├── AuthenticationError (401)
│   ├── invalidToken()
│   ├── missingToken()
│   ├── tokenExpired()
│   └── invalidCredentials()
├── AuthorizationError (403)
│   ├── insufficientPermissions()
│   ├── proTierRequired()
│   ├── weekendAccessRestricted()
│   ├── planLimitReached()
│   └── cityLimitReached()
├── NotFoundError (404)
│   ├── user()
│   ├── plan()
│   ├── city()
│   └── subscription()
├── RateLimitError (429)
├── ExternalServiceError (502)
│   ├── anthropicAPI()
│   ├── appleAPI()
│   └── networkError()
├── DatabaseError (500)
│   ├── readFailed()
│   ├── writeFailed()
│   ├── updateFailed()
│   ├── deleteFailed()
│   ├── batchFailed()
│   └── transactionFailed()
├── DuplicateTransactionError (409)
└── SubscriptionError (400/403)
    ├── invalidReceipt()
    ├── expired()
    ├── mismatchedApp()
    ├── sandboxInProduction()
    └── alreadyActive()
```

### Usage Examples

```typescript
// Validation error
throw ValidationError.missingField('email');

// Authorization error
throw AuthorizationError.proTierRequired('weekend plans');

// External service error
throw ExternalServiceError.anthropicAPI('Rate limit exceeded', true);

// Database error
throw DatabaseError.readFailed('users', error);
```

---

## Retry Strategies

### Exponential Backoff

The backend uses exponential backoff for retryable operations:

- **Max retries**: 3
- **Base delay**: 1 second
- **Max delay**: 8 seconds
- **Backoff formula**: `min(baseDelay * 2^attempt, maxDelay)`

**Retry sequence**: 1s → 2s → 4s

### Retryable Errors

| Error Type | Retryable | Reason |
|------------|-----------|--------|
| Network timeout | ✅ | Transient network issue |
| 429 Rate limit | ✅ | Wait and retry |
| 500 Server error | ✅ | Temporary server issue |
| 502 Bad gateway | ✅ | Service temporarily down |
| 503 Service unavailable | ✅ | Service restarting |
| 400 Bad request | ❌ | Client error, won't change |
| 401 Unauthorized | ❌ | Auth required |
| 403 Forbidden | ❌ | Permissions issue |
| 404 Not found | ❌ | Resource doesn't exist |

### Client Retry Implementation

```typescript
async function retryRequest<T>(
  request: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error: any) {
      lastError = error;

      // Check if retryable
      const statusCode = error.response?.status;
      const isRetryable = [429, 500, 502, 503].includes(statusCode);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);

      // Check for retry-after header (rate limits)
      const retryAfter = error.response?.data?.error?.retryAfter;
      const waitTime = retryAfter ? retryAfter * 1000 : delay;

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}
```

---

## Client Error Handling

### iOS/Swift Implementation

```swift
enum APIError: Error {
    case validationError(String)
    case authenticationError
    case authorizationError(String)
    case notFound
    case rateLimitExceeded(retryAfter: Int)
    case subscriptionError(String)
    case serverError
    case networkError
}

func handleAPIError(_ response: HTTPURLResponse, data: Data?) -> APIError {
    guard let data = data,
          let json = try? JSONDecoder().decode(ErrorResponse.self, from: data) else {
        return .serverError
    }

    switch json.error.code {
    case "VALIDATION_ERROR", "MISSING_REQUIRED_FIELD", "INVALID_FORMAT":
        return .validationError(json.error.message)

    case "AUTHENTICATION_ERROR", "INVALID_TOKEN", "UNAUTHORIZED":
        return .authenticationError

    case "AUTHORIZATION_ERROR", "PRO_TIER_REQUIRED", "WEEKEND_ACCESS_RESTRICTED",
         "PLAN_LIMIT_REACHED", "CITY_LIMIT_REACHED":
        return .authorizationError(json.error.message)

    case "NOT_FOUND", "PLAN_NOT_FOUND", "CITY_NOT_FOUND":
        return .notFound

    case "RATE_LIMIT_EXCEEDED":
        let retryAfter = json.error.retryAfter ?? 60
        return .rateLimitExceeded(retryAfter: retryAfter)

    case "SUBSCRIPTION_ERROR", "INVALID_RECEIPT", "SUBSCRIPTION_EXPIRED":
        return .subscriptionError(json.error.message)

    default:
        return .serverError
    }
}
```

### Displaying Errors to Users

```swift
func showErrorToUser(_ error: APIError) {
    switch error {
    case .validationError(let message):
        // Show inline form error
        showInlineError(message)

    case .authenticationError:
        // Force logout and show login screen
        forceLogout()

    case .authorizationError(let message):
        // Show paywall if Pro required
        if message.contains("Pro") {
            showPaywall()
        } else {
            showAlert(message)
        }

    case .notFound:
        // Show "content not found" message
        showAlert("This content is no longer available")

    case .rateLimitExceeded(let retryAfter):
        // Show rate limit message with countdown
        showRateLimitAlert(retryAfter: retryAfter)

    case .subscriptionError(let message):
        // Show subscription error with retry option
        showSubscriptionError(message)

    case .serverError, .networkError:
        // Show generic error with retry button
        showRetryableError("Something went wrong. Please try again.")
    }
}
```

---

## Monitoring and Alerting

### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| ERROR | Server errors (5xx) | Database failure, API crash |
| WARN | Client errors (4xx) | Invalid input, unauthorized |
| INFO | Normal operations | Request completed, user logged in |
| DEBUG | Development only | Variable values, flow trace |

### Key Metrics to Monitor

1. **Error Rate**
   - Target: < 1% of all requests
   - Alert: > 5% error rate for 5 minutes

2. **API Response Time**
   - Target: < 500ms p95
   - Alert: > 2s p95 for 5 minutes

3. **Rate Limit Hits**
   - Target: < 0.1% of requests
   - Alert: > 1% for single user

4. **External Service Failures**
   - Anthropic API errors
   - Apple API errors
   - Alert: > 10 failures in 5 minutes

5. **Database Errors**
   - Firestore timeouts
   - Transaction failures
   - Alert: > 5 failures in 5 minutes

### Firebase Cloud Logging

All errors are logged to Cloud Logging with structured data:

```typescript
{
  severity: "ERROR",
  context: "Subscription validation",
  endpoint: "POST /subscription/validate",
  userId: "user123",
  errorCode: "EXTERNAL_SERVICE_ERROR",
  message: "Apple API returned 21005",
  statusCode: 502,
  isOperational: true,
  timestamp: "2025-01-15T10:30:00Z",
  stack: "..." // Development only
}
```

### Alerting Rules (Recommended)

```yaml
# Cloud Monitoring Alert Policies

1. High Error Rate:
   - Condition: error_count / total_requests > 0.05
   - Duration: 5 minutes
   - Notification: Email, Slack

2. External Service Failures:
   - Condition: external_service_errors > 10
   - Duration: 5 minutes
   - Notification: PagerDuty

3. Database Errors:
   - Condition: database_errors > 5
   - Duration: 5 minutes
   - Notification: PagerDuty

4. Weekly Refresh Job Failures:
   - Condition: weeklyPlanRefresh.citiesFailed > 3
   - Duration: 1 execution
   - Notification: Email
```

---

## Production Debugging

### Error Context

All errors are logged with full context:

```typescript
{
  context: "Route handler",
  endpoint: "GET /plans/:planId",
  userId: "user123",
  requestId: "req456",
  userAgent: "Litplan-iOS/1.0",
  timestamp: "2025-01-15T10:30:00Z",
  error: {
    code: "PLAN_NOT_FOUND",
    message: "Plan not found",
    statusCode: 404,
    technicalDetails: { planId: "nyc-plan-123" }
  }
}
```

### Debugging Workflow

1. **Identify the error** in Cloud Logging
   - Search by error code: `jsonPayload.code="PLAN_NOT_FOUND"`
   - Search by user: `jsonPayload.userId="user123"`
   - Search by endpoint: `jsonPayload.endpoint="POST /subscription/validate"`

2. **Check error frequency**
   - Is it affecting multiple users?
   - Is it a spike or ongoing?

3. **Review technical details**
   - Check `technicalDetails` field for debug info
   - Review stack trace (development only)

4. **Reproduce the issue**
   - Use same request parameters
   - Check if issue persists

5. **Fix and monitor**
   - Deploy fix
   - Monitor error rate for that code

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| High rate limit hits | Client retry loop | Add exponential backoff |
| Apple API 21004 | Shared secret expired | Rotate secret |
| Database timeout | Large query | Add pagination |
| Anthropic rate limit | Too many concurrent requests | Implement request queue |
| Duplicate transactions | Concurrent requests | Use transaction (implemented) |
| Plan data corrupted | AI generation error | Add validation |

### Debug Commands

```bash
# View recent errors
gcloud logging read "severity>=ERROR" --limit 50 --format json

# View errors for specific endpoint
gcloud logging read 'jsonPayload.endpoint="POST /subscription/validate"' --limit 20

# View errors for specific user
gcloud logging read 'jsonPayload.userId="user123"' --limit 10

# Monitor live errors
gcloud logging tail "severity>=ERROR"

# Export errors to BigQuery for analysis
gcloud logging sinks create error-analysis \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/logs \
  --log-filter='severity>=ERROR'
```

---

## Best Practices

### For Backend Developers

1. **Always use custom error classes** - Don't throw generic `Error`
2. **Include context in errors** - userId, endpoint, request data
3. **Mark retryable errors** - Use `retryable` flag correctly
4. **Log before throwing** - Ensure errors are logged
5. **Sanitize messages** - No sensitive data in user-facing messages
6. **Use transactions** - For concurrent operations
7. **Validate early** - Check inputs before processing
8. **Handle edge cases** - Null checks, empty arrays, etc.

### For iOS Developers

1. **Parse error codes** - Don't just show generic "error occurred"
2. **Implement retry logic** - For retryable errors
3. **Show paywalls** - When Pro tier required
4. **Handle rate limits** - Respect retry-after header
5. **Log errors** - Send to analytics (anonymized)
6. **Test error scenarios** - Simulate network failures
7. **Provide user actions** - "Retry", "Upgrade", "Contact Support"

---

## Testing Error Handling

### Unit Tests

```typescript
describe('Subscription validation', () => {
  it('should reject duplicate transactions', async () => {
    // Setup: Create user with existing transaction
    await createUser({ subscription: { transactionId: 'txn123' } });

    // Test: Try to use same transaction for different user
    const response = await request(app)
      .post('/subscription/validate')
      .send({ transactionId: 'txn123', productId: 'com.litplan.pro' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_TRANSACTION');
  });
});
```

### Integration Tests

```typescript
describe('Plan view limits', () => {
  it('should enforce 10-plan limit for free users', async () => {
    // View 10 plans
    for (let i = 0; i < 10; i++) {
      await viewPlan(userId, cityId, `plan${i}`);
    }

    // 11th plan should fail
    const response = await request(app)
      .get(`/plans/plan11`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PLAN_LIMIT_REACHED');
  });
});
```

---

## Changelog

### Sprint 4, Day 17 (2025-01-15)
- ✅ Created comprehensive error classes
- ✅ Implemented global error handler middleware
- ✅ Added retry logic with exponential backoff
- ✅ Enhanced subscription edge case handling
- ✅ Added concurrent request protection
- ✅ Improved error logging with context
- ✅ Created ERROR_HANDLING.md documentation

---

## Support

For questions or issues:
- **Development**: Check Cloud Logging for error details
- **Production**: Alert on-call engineer via PagerDuty
- **Questions**: Contact backend team

Last Updated: January 15, 2025 | Sprint 4, Day 17
