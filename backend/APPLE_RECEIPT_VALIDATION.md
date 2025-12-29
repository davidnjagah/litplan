# Apple Receipt Validation - Technical Documentation

## Overview
This document explains the server-side Apple receipt validation implementation for Litplan's subscription system (Sprint 3, Day 11).

## Implementation Summary

The `validateAppleReceipt` function in `/backend/functions/src/api/subscription.ts` implements full Apple server-side receipt validation with the following features:

### 1. Apple verifyReceipt API Integration
- **Production Endpoint**: `https://buy.itunes.apple.com/verifyReceipt`
- **Sandbox Endpoint**: `https://sandbox.itunes.apple.com/verifyReceipt`
- **Auto-detection**: Automatically retries with sandbox if production returns status 21007

### 2. Comprehensive Status Code Handling

All Apple status codes are handled according to [Apple's documentation](https://developer.apple.com/documentation/appstorereceipts/status):

| Status Code | Meaning | Handling |
|------------|---------|----------|
| 0 | Valid receipt | Success - parse subscription data |
| 21000 | Invalid HTTP method | Error - request must be POST |
| 21002 | Malformed data or temporary issue | Error - retry recommended |
| 21003 | Receipt authentication failed | Error - invalid receipt |
| 21004 | Shared secret mismatch | Error - check APPLE_SHARED_SECRET env var |
| 21005 | Receipt server temporarily unavailable | Error - retry recommended |
| 21006 | Valid but expired subscription | Error - subscription expired |
| 21007 | Sandbox receipt sent to production | Retry with sandbox endpoint |
| 21008 | Production receipt sent to sandbox | Error - environment mismatch |
| 21009 | Internal data access error | Error - retry recommended |
| 21010 | User account not found or deleted | Error - invalid user |

### 3. Receipt Data Parsing

The function extracts the following from Apple's response:

```typescript
{
  latest_receipt_info: [
    {
      transaction_id: string,              // Unique transaction ID
      original_transaction_id: string,     // Original purchase ID
      product_id: string,                  // Product identifier
      purchase_date_ms: string,            // Purchase timestamp
      expires_date_ms: string,             // Expiry timestamp
      // ... other fields
    }
  ],
  pending_renewal_info: [
    {
      auto_renew_status: "0" | "1",       // Auto-renewal status
      original_transaction_id: string,
      product_id: string,
      // ... other fields
    }
  ],
  status: number                          // Status code
}
```

### 4. Subscription Data Extraction

The function extracts:
- **Expiry Date**: Converted from `expires_date_ms` to JavaScript Date
- **Auto-Renew Status**: From `pending_renewal_info.auto_renew_status` ("1" = enabled)
- **Transaction Matching**: Finds the correct transaction by `original_transaction_id` or `transaction_id`

### 5. Expired Subscription Detection

```typescript
const now = new Date();
const isExpired = expiryDate < now;

if (isExpired && statusCode === 21006) {
  return {
    isValid: false,
    error: 'Subscription has expired',
    expiryDate,
    autoRenew,
    statusCode: 21006,
  };
}
```

### 6. Fraud Detection (Basic)

Current implementation logs all transactions for monitoring. Future enhancements should:
- Check Firestore for duplicate `transactionId` to prevent replay attacks
- Verify transaction hasn't been used by another user
- Implement rate limiting on validation endpoint

## Environment Configuration

### Required Environment Variable

Set in `.env` or Firebase Functions config:

```bash
APPLE_SHARED_SECRET=your_shared_secret_from_app_store_connect
```

**How to get your shared secret:**
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **My Apps** → Select your app
3. Go to **Features** → **In-App Purchases**
4. Click **Manage** next to your subscription group
5. Click **Generate** under "App-Specific Shared Secret"
6. Copy the generated secret and set as `APPLE_SHARED_SECRET`

**Important:** Never commit the shared secret to version control. Use environment variables or Firebase Secret Manager.

## API Request/Response Examples

### Valid Receipt Request

```bash
POST /subscription/validate
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "transactionId": "1000000012345678",
  "productId": "litplan_pro_monthly",
  "receiptData": "MIITtgYJKoZIhvcNAQcCoIITpzCCE6..." # Base64 encoded receipt
}
```

### Valid Receipt Response (Success)

```json
{
  "success": true,
  "subscription": {
    "status": "pro",
    "tier": "pro",
    "expiryDate": "2026-12-30T00:00:00.000Z",
    "autoRenew": true
  },
  "entitlements": {
    "maxCitiesPerWeek": 100,
    "maxPlansPerCity": 50,
    "weekendAccess": true,
    "groupPlansAccess": true,
    "savedCitiesAccess": true
  }
}
```

### Invalid Receipt Response (Expired)

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "Subscription has expired"
  }
}
```

### Invalid Receipt Response (Apple Error)

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_INVALID",
    "message": "The receipt could not be authenticated"
  }
}
```

## Testing

### Sandbox Testing

1. **Create Sandbox Test User:**
   - App Store Connect → Users and Access → Sandbox Testers
   - Create test account with unique email

2. **Test Purchase in iOS Simulator:**
   - Build and run iOS app with StoreKit sandbox enabled
   - Sign in with sandbox test account
   - Complete purchase flow
   - Backend will automatically use sandbox endpoint (status 21007 → retry)

3. **Test Validation:**
   ```bash
   # Use Postman or curl with sandbox receipt
   POST https://your-backend.com/api/v1/subscription/validate
   {
     "transactionId": "1000000012345678",
     "productId": "litplan_pro_monthly",
     "receiptData": "<base64_receipt_from_storekit>"
   }
   ```

### Production Testing

- Production receipts only work with production endpoint
- Test with real Apple Developer account and TestFlight
- Monitor Firebase logs for validation errors

## Error Handling

### Common Errors and Solutions

| Error | Possible Cause | Solution |
|-------|---------------|----------|
| "Apple shared secret not configured" | Missing env var | Set APPLE_SHARED_SECRET |
| "Receipt data is required" | Missing receiptData in request | Include base64 receipt |
| "Shared secret mismatch" (21004) | Wrong shared secret | Verify APPLE_SHARED_SECRET matches App Store Connect |
| "Sandbox receipt in production" (21007) | Testing in production | Use sandbox endpoint or production receipt |
| "Receipt authentication failed" (21003) | Invalid receipt | Verify receipt is from StoreKit purchase |

## Integration with updateUserEntitlements

After successful validation, the function calls `updateUserEntitlements`:

```typescript
const updateResult = await updateUserEntitlements(userId, 'pro', {
  expiryDate: validation.expiryDate,
  autoRenew: validation.autoRenew,
  transactionId,
  productId,
});
```

This helper function:
1. Updates subscription status to 'pro'
2. Sets all Pro tier entitlements (100 cities, 50 plans, weekends, etc.)
3. Stores transaction details for audit trail
4. Returns updated subscription and entitlements

## Security Best Practices

1. **Always validate server-side** - Never trust client-only validation
2. **Use HTTPS** - All requests to Apple must use HTTPS
3. **Protect shared secret** - Never expose in client code or commits
4. **Check expiry dates** - Validate subscription hasn't expired
5. **Monitor for fraud** - Log all transactions and check for duplicates
6. **Rate limiting** - Prevent abuse of validation endpoint (Sprint 3, Day 14)

## Future Enhancements

### Planned for Sprint 3, Day 12-14:
- [ ] Duplicate transaction detection (Firestore check)
- [ ] Rate limiting on `/subscription/validate` endpoint
- [ ] Enhanced fraud detection (device fingerprinting)
- [ ] Webhook integration for subscription status changes
- [ ] Automatic subscription sync (scheduled Cloud Function)

### Planned for Sprint 4:
- [ ] Subscription analytics dashboard
- [ ] Grace period handling for failed renewals
- [ ] Family sharing support
- [ ] Promotional offers and discount codes

## References

- [Apple verifyReceipt API](https://developer.apple.com/documentation/appstorereceipts/verifyreceipt)
- [Apple Status Codes](https://developer.apple.com/documentation/appstorereceipts/status)
- [StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [Firebase Functions Environment Config](https://firebase.google.com/docs/functions/config-env)

## Support

For issues or questions:
- Check Firebase logs: `firebase functions:log`
- Review Apple's receipt validation status codes
- Verify shared secret matches App Store Connect
- Test with sandbox environment first

---

**Last Updated**: Sprint 3, Day 11 (December 30, 2025)
**Implemented By**: Backend Engineer
**Status**: Production Ready
