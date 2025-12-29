# StoreKit 2 Setup Guide for Litplan

## Overview
This guide explains how to configure StoreKit 2 for Litplan's subscription system. StoreKit 2 handles in-app purchases on iOS, and this backend validates receipts server-side.

## Prerequisites
- Apple Developer account ($99/year)
- App Store Connect access
- Litplan iOS app bundle ID: `com.litplan.app` (or your chosen ID)
- Backend deployment (Firebase or custom server)

---

## Step 1: Create Subscription Products in App Store Connect

### 1.1 Log in to App Store Connect
- Go to https://appstoreconnect.apple.com
- Navigate to **My Apps** → Select your app (or create new app)

### 1.2 Create Subscription Group
1. Go to **Features** → **In-App Purchases**
2. Click **Create** → Select **Auto-Renewable Subscription**
3. Create a **Subscription Group** named `litplan_pro_subscriptions`
4. Set **Group Display Name**: "Litplan Pro"

### 1.3 Create Monthly Subscription
1. **Product ID**: `litplan_pro_monthly`
2. **Reference Name**: Litplan Pro Monthly
3. **Subscription Duration**: 1 month
4. **Price**: $9.99/month (or your preferred pricing)
5. **Localization**: Add at least one localization
   - **Display Name**: Litplan Pro Monthly
   - **Description**: Unlimited cities, 50 plans per city, weekend access, group flows, and saved cities

### 1.4 Create Yearly Subscription (Optional)
1. **Product ID**: `litplan_pro_yearly`
2. **Reference Name**: Litplan Pro Yearly
3. **Subscription Duration**: 1 year
4. **Price**: $99.99/year (or your preferred pricing)
5. **Localization**: Same as monthly

### 1.5 Configure Free Trial (Optional)
1. In subscription settings, enable **Introductory Offer**
2. Set **Free Trial Duration**: 7 days
3. This will be shown as "Start Free Trial" in the iOS app

---

## Step 2: Configure StoreKit Configuration File (For Testing)

### 2.1 Create StoreKit Configuration in Xcode
1. Open Xcode project: `ios-app/Litplan.xcodeproj`
2. **File** → **New** → **File**
3. Select **StoreKit Configuration File**
4. Name it: `Litplan.storekit`
5. Save it in the project root

### 2.2 Add Products to Configuration File
Add the following JSON to `Litplan.storekit`:

```json
{
  "identifier" : "litplan_subscriptions",
  "nonRenewingSubscriptions" : [],
  "products" : [],
  "settings" : {
    "locale" : "en_US"
  },
  "subscriptionGroups" : [
    {
      "id" : "litplan_pro_subscriptions",
      "localizations" : [
        {
          "description" : "Unlock all premium features",
          "displayName" : "Litplan Pro",
          "locale" : "en_US"
        }
      ],
      "name" : "Litplan Pro Subscriptions",
      "subscriptions" : [
        {
          "adHocOffers" : [],
          "codeOffers" : [],
          "displayPrice" : "9.99",
          "familyShareable" : false,
          "groupNumber" : 1,
          "internalID" : "6499999999",
          "introductoryOffer" : {
            "displayPrice" : "0.00",
            "duration" : "P1W",
            "internalID" : "6499999998",
            "numberOfPeriods" : 1,
            "paymentMode" : "free",
            "subscriptionPeriod" : "P1M"
          },
          "localizations" : [
            {
              "description" : "Unlimited cities, 50 plans per city, weekend access, group flows, saved cities",
              "displayName" : "Litplan Pro Monthly",
              "locale" : "en_US"
            }
          ],
          "productID" : "litplan_pro_monthly",
          "recurringSubscriptionPeriod" : "P1M",
          "referenceName" : "Litplan Pro Monthly",
          "subscriptionGroupID" : "litplan_pro_subscriptions",
          "type" : "RecurringSubscription"
        }
      ]
    }
  ],
  "version" : {
    "major" : 2,
    "minor" : 0
  }
}
```

### 2.3 Configure Xcode Scheme to Use StoreKit File
1. **Product** → **Scheme** → **Edit Scheme**
2. Select **Run** → **Options**
3. Under **StoreKit Configuration**, select `Litplan.storekit`
4. This enables local testing without hitting Apple servers

---

## Step 3: Generate App Store Server API Key (For Backend Validation)

### 3.1 Create API Key
1. Go to **App Store Connect** → **Users and Access**
2. Click **Keys** tab → **App Store Connect API**
3. Click **Generate API Key** (or use In-App Purchase Keys)
4. **Name**: Litplan Backend Server
5. **Access**: Select **Admin** or **App Manager**
6. Click **Generate**

### 3.2 Download Private Key
1. After generation, **download the .p8 key file** (only available once!)
2. Save it securely: `AuthKey_XXXXXXXXXX.p8`
3. Note the **Key ID** (e.g., `AB12CD34EF`)
4. Note your **Issuer ID** (found at top of Keys page, e.g., `12345678-1234-1234-1234-123456789012`)

### 3.3 Store Credentials Securely
**IMPORTANT**: Never commit these to Git!

#### Option 1: Firebase Secret Manager (Recommended)
```bash
cd backend/functions
firebase functions:secrets:set APPLE_APP_STORE_KEY_ID
# Enter: AB12CD34EF

firebase functions:secrets:set APPLE_APP_STORE_ISSUER_ID
# Enter: 12345678-1234-1234-1234-123456789012

firebase functions:secrets:set APPLE_APP_STORE_PRIVATE_KEY
# Paste entire contents of .p8 file
```

#### Option 2: Environment Variables (Local Development)
Create `backend/functions/.env`:
```
APPLE_APP_STORE_KEY_ID=AB12CD34EF
APPLE_APP_STORE_ISSUER_ID=12345678-1234-1234-1234-123456789012
APPLE_APP_STORE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----"
```

---

## Step 4: Update Backend Environment Variables

### 4.1 Add to `.env.example`
Update `backend/functions/.env.example`:
```bash
# StoreKit 2 / App Store Server API
APPLE_APP_STORE_KEY_ID=your_key_id_here
APPLE_APP_STORE_ISSUER_ID=your_issuer_id_here
APPLE_APP_STORE_PRIVATE_KEY=your_private_key_here
APPLE_BUNDLE_ID=com.litplan.app
```

### 4.2 Configure Environment in Code
The backend will read these from `process.env` to validate receipts.

---

## Step 5: Test Subscription Flow

### 5.1 Create Sandbox Tester Account
1. **App Store Connect** → **Users and Access** → **Sandbox Testers**
2. Click **+** to add tester
3. **Email**: test-pro@litplan.com (can be fake email)
4. **Password**: Create strong password
5. **Country**: United States
6. **Save**

### 5.2 Test on iOS Simulator
1. Run iOS app in Xcode
2. Navigate to Profile → "Upgrade to Pro"
3. StoreKit sheet will show your configured products
4. Purchase using sandbox tester credentials
5. Backend will receive transaction ID and validate

### 5.3 Test Backend Validation
```bash
# Test POST /subscription/validate endpoint
curl -X POST http://localhost:5001/litplan-dev/us-central1/api/subscription/validate \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "2000000123456789",
    "productId": "litplan_pro_monthly",
    "receiptData": "base64_encoded_receipt"
  }'

# Expected response:
# {
#   "success": true,
#   "subscription": {
#     "status": "pro",
#     "tier": "pro",
#     "expiryDate": "...",
#     "autoRenew": true
#   },
#   "entitlements": { ... }
# }
```

---

## Step 6: Production Deployment

### 6.1 Submit for Review
1. Complete all subscription metadata in App Store Connect
2. Submit app for review with In-App Purchase enabled
3. Apple will review subscription setup (3-5 days)

### 6.2 Configure Backend for Production
1. Use production API credentials (same .p8 key works for both sandbox and production)
2. The backend automatically detects environment based on receipt
3. Deploy backend to production Firebase:
```bash
firebase deploy --only functions
```

### 6.3 Monitor Subscriptions
- **App Store Connect** → **Sales and Trends** → **Subscriptions**
- Track active subscribers, churn rate, conversion rate
- Backend logs all validation attempts in Cloud Functions logs

---

## API Integration Summary

### Backend Endpoints Created (Day 8)
1. **POST /subscription/validate** - Validates receipt, updates user to Pro
2. **GET /subscription/status** - Checks current subscription status
3. **POST /subscription/restore** - Restores previous purchases (Day 10)

### iOS Integration (Sprint 3, Day 12)
1. iOS app purchases subscription via StoreKit 2
2. iOS sends `transactionId` to backend
3. Backend validates with Apple's servers
4. Backend updates user's `subscription.tier` to `'pro'`
5. Backend updates user's `entitlements` (unlimited access)
6. iOS receives confirmation and updates UI

---

## Security Best Practices

1. **Never expose private keys** in client-side code or Git repositories
2. **Validate receipts server-side only** (never trust client)
3. **Use HTTPS** for all API calls
4. **Rotate API keys** annually
5. **Monitor for fraud** (unusual purchase patterns)
6. **Implement rate limiting** on validation endpoint (max 10 requests/minute per user)

---

## Troubleshooting

### Common Issues

#### 1. "Invalid Receipt" Error
- **Cause**: Using production receipt in sandbox (or vice versa)
- **Solution**: Backend auto-detects environment, ensure you're using correct Apple server URL

#### 2. "Product Not Found"
- **Cause**: Product ID mismatch between App Store Connect and code
- **Solution**: Verify `productId` exactly matches: `litplan_pro_monthly`

#### 3. "Unauthorized" Error
- **Cause**: Invalid API credentials
- **Solution**: Regenerate Key ID, Issuer ID, and .p8 file

#### 4. Subscription Not Updating in Backend
- **Cause**: Firestore user document not found
- **Solution**: Ensure user is authenticated and userId matches

---

## Cost Estimates

### Apple Fees
- **Apple Developer Account**: $99/year
- **Apple's Commission**: 30% of first-year revenue, 15% after year 1 (per subscriber)

### Example Revenue (if 1000 Pro subscribers at $9.99/month)
- **Gross Monthly Revenue**: $9,990
- **Apple's Cut (30%)**: $2,997
- **Your Net Revenue**: $6,993/month

---

## Resources

- [StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [In-App Purchase Best Practices](https://developer.apple.com/app-store/subscriptions/)
- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env#secret-manager)

---

## Next Steps

1. Complete StoreKit configuration in App Store Connect (coordinate with user)
2. Backend endpoints are implemented (Day 8) ✅
3. Test validation flow in Sprint 3, Day 12
4. Monitor subscriptions in production

---

**Created**: Sprint 2, Day 8 (December 27, 2025)
**Owner**: Backend Engineer
**Status**: Configuration Pending (Requires Apple Developer Account)
