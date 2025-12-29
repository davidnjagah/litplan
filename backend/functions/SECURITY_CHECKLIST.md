# Litplan Backend - Security Checklist

## Environment Variables (Required)

### Firebase Functions Configuration
- [ ] APPLE_SHARED_SECRET - Set in Firebase Functions config
- [ ] STRIPE_SECRET_KEY - Set if using Stripe (future)
- [ ] FIREBASE_PROJECT_ID - Auto-configured by Firebase
- [ ] CORS_ORIGINS - Whitelist of allowed origins

### Commands to Set Environment Variables
```bash
# Set Apple Shared Secret (for App Store receipt validation)
firebase functions:config:set apple.shared_secret="YOUR_APPLE_SHARED_SECRET_HERE"

# Set CORS origins (for production)
firebase functions:config:set cors.origins="https://litplan.app,https://www.litplan.app"

# View current configuration
firebase functions:config:get

# Deploy configuration changes
firebase deploy --only functions
```

## Security Best Practices Implemented

### Authentication & Authorization
- ✅ All endpoints require authentication (except /health and /)
- ✅ Firebase Authentication token validation on all protected routes
- ✅ User ID validation ensures users can only access their own data
- ✅ Pro tier enforcement with requireProTier middleware
- ✅ Subscription expiry checks prevent access with expired subscriptions

### Rate Limiting & DDoS Protection
- ✅ Rate limiting on all endpoints (Sprint 3, Day 14)
- ✅ Configurable limits per endpoint (10-100 requests per minute)
- ✅ User-specific rate limiting (by Firebase UID)
- ✅ IP-based rate limiting for unauthenticated requests
- ⚠️ In-memory rate limiting (single instance only)
  - **Production**: Use Redis or Cloud Memorystore for distributed rate limiting

### Input Validation & Sanitization
- ✅ Request body validation on all POST/PUT requests
- ✅ Type validation for all parameters
- ✅ String sanitization (removes HTML tags and dangerous characters)
- ✅ Email format validation
- ✅ UUID format validation
- ✅ City ID format validation (alphanumeric + hyphens)
- ✅ Pagination parameter validation (limit 1-100)
- ✅ Length limits on all string inputs (max 500 characters)

### Data Protection
- ✅ Firestore security rules enforce server-side auth
- ✅ No PII (Personally Identifiable Information) in logs
- ✅ Sensitive data redacted in error messages
- ✅ No stack traces in production errors
- ✅ Transaction IDs validated to prevent replay attacks
- ✅ Subscription receipts validated server-side with Apple

### Transport Security
- ✅ HTTPS enforced (Firebase default)
- ✅ Security headers applied to all responses:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content-Security-Policy: default-src 'none'
  - Strict-Transport-Security: max-age=31536000

### CORS Configuration
- ✅ CORS configured with origin validation
- ⚠️ Currently allows all origins (cors: {origin: true})
- **Production**: Whitelist specific domains only
```typescript
app.use(cors({
  origin: [
    'https://litplan.app',
    'https://www.litplan.app'
  ]
}));
```

### Logging & Monitoring
- ✅ Request logging with performance tracking
- ✅ Error logging with timestamps
- ✅ Activity tracking (city views, plan views)
- ✅ Subscription status changes logged
- ❌ No centralized alerting (future enhancement)
- ❌ No anomaly detection (future enhancement)

## Security Hardening Checklist

### Pre-Production (Required)
- [ ] Review and update Firestore security rules
- [ ] Set production CORS whitelist
- [ ] Configure Firebase Functions environment variables
- [ ] Set up Cloud Logging log sinks
- [ ] Enable audit logging for sensitive operations
- [ ] Review IAM permissions (principle of least privilege)
- [ ] Set Firebase Functions timeout limits
- [ ] Configure Firebase Functions memory limits

### Production Deployment
- [ ] Enable Cloud Armor (DDoS protection)
- [ ] Set up Cloud Monitoring alerts:
  - [ ] High error rate (>5% of requests)
  - [ ] High latency (>2s average)
  - [ ] Rate limit exceeded (>100 times/hour)
  - [ ] Failed authentication attempts (>50/hour)
  - [ ] Subscription validation failures
- [ ] Configure backup strategy:
  - [ ] Daily Firestore backups
  - [ ] Backup retention (30 days)
- [ ] Set up budget alerts (cost monitoring)
- [ ] Configure log retention policies

### Post-Production
- [ ] Run security scanner (OWASP ZAP, Burp Suite)
- [ ] Perform penetration testing
- [ ] Conduct security code review
- [ ] Set up incident response plan
- [ ] Schedule quarterly security audits

## OWASP Top 10 Vulnerability Assessment

### A01:2021 - Broken Access Control
- ✅ **Protected**: User ID validation on all routes
- ✅ **Protected**: Pro tier enforcement with middleware
- ✅ **Protected**: Subscription expiry checks
- ✅ **Protected**: Activity limits enforced server-side

### A02:2021 - Cryptographic Failures
- ✅ **Protected**: HTTPS enforced
- ✅ **Protected**: No sensitive data in transit (Firebase handles encryption)
- ✅ **Protected**: No passwords stored (Firebase Auth)
- ⚠️ **Partial**: Environment variables in Firebase config (encrypted at rest)

### A03:2021 - Injection
- ✅ **Protected**: No SQL (using Firestore NoSQL)
- ✅ **Protected**: Input sanitization on all strings
- ✅ **Protected**: Type validation on all parameters
- ✅ **Protected**: No dynamic query construction

### A04:2021 - Insecure Design
- ✅ **Protected**: Rate limiting prevents abuse
- ✅ **Protected**: Tier limits enforced server-side
- ✅ **Protected**: Transaction ID validation prevents replay
- ✅ **Protected**: Subscription validation uses Apple server-side API

### A05:2021 - Security Misconfiguration
- ✅ **Protected**: Security headers applied
- ✅ **Protected**: Error messages don't leak stack traces in production
- ⚠️ **Review**: CORS allows all origins (fix in production)
- ⚠️ **Review**: Firestore security rules (needs review)

### A06:2021 - Vulnerable and Outdated Components
- ✅ **Protected**: Using latest Firebase SDK
- ✅ **Protected**: Dependencies updated regularly
- ❌ **Action Required**: Set up Dependabot or Snyk for automated updates

### A07:2021 - Identification and Authentication Failures
- ✅ **Protected**: Firebase Authentication
- ✅ **Protected**: Token validation on every request
- ✅ **Protected**: No session management (stateless JWT)
- ✅ **Protected**: Rate limiting prevents brute force

### A08:2021 - Software and Data Integrity Failures
- ✅ **Protected**: Apple receipt validation server-side
- ✅ **Protected**: Transaction ID validation
- ✅ **Protected**: No client-side trust for subscription status
- ❌ **Future**: Request signing for critical operations

### A09:2021 - Security Logging and Monitoring Failures
- ✅ **Protected**: Request logging enabled
- ✅ **Protected**: Error logging with timestamps
- ⚠️ **Partial**: No centralized alerting
- ❌ **Future**: Integrate with SIEM (Security Information and Event Management)

### A10:2021 - Server-Side Request Forgery (SSRF)
- ✅ **Protected**: No user-controlled URLs
- ✅ **Protected**: Apple API URL is hardcoded
- N/A - No external URL fetching based on user input

## Known Security Limitations

### Current Limitations
1. **Rate Limiting (In-Memory)**
   - Uses in-memory Map (single instance only)
   - Lost on function cold start
   - **Production Fix**: Use Redis or Cloud Memorystore

2. **CORS Configuration**
   - Currently allows all origins
   - **Production Fix**: Whitelist specific domains

3. **No Request Signing**
   - Future enhancement for critical operations
   - Consider HMAC signatures for subscription updates

4. **No IP Whitelisting**
   - Future enhancement for admin operations
   - Consider IP restrictions for sensitive endpoints

5. **No Geofencing**
   - Future enhancement to block suspicious regions
   - Monitor for unusual geographic patterns

### Firestore Security Rules Review
```javascript
// Current rules (to be reviewed)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;

      // User activity subcollection
      match /activity/{activityId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Cities collection (read-only)
    match /cities/{cityId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write
    }

    // Config collection (read-only)
    match /config/{configId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write
    }
  }
}
```

## Incident Response Plan

### Security Incident Detection
1. Monitor Cloud Logging for:
   - Repeated authentication failures
   - Rate limit exceeded events
   - Unusual error rates
   - Suspicious activity patterns

2. Set up alerts for:
   - Failed subscription validations (possible fraud)
   - Rapid tier upgrades (possible abuse)
   - High volume from single user (possible scraping)

### Response Procedure
1. **Detect**: Alert triggers
2. **Assess**: Review logs and metrics
3. **Contain**: Rate limit or block user if necessary
4. **Eradicate**: Fix vulnerability
5. **Recover**: Deploy fix and monitor
6. **Post-mortem**: Document and improve

### Emergency Contacts
- Firebase Support: https://firebase.google.com/support
- Google Cloud Support: https://cloud.google.com/support
- Apple Developer Support: https://developer.apple.com/support

## Compliance & Privacy

### Data Protection
- ✅ GDPR considerations: User data deletion support
- ✅ CCPA considerations: User data export (future)
- ✅ Minimal data collection
- ✅ No third-party analytics (currently)

### App Store Requirements
- ✅ Server-side receipt validation
- ✅ Subscription status sync
- ✅ Restore purchases support
- ✅ Family Sharing support (future)

## Security Testing Schedule

### Weekly
- [ ] Review Cloud Logging for errors and anomalies
- [ ] Check rate limit metrics
- [ ] Monitor subscription validation failures

### Monthly
- [ ] Review and update dependencies
- [ ] Review Firestore security rules
- [ ] Analyze Cloud Functions performance and errors
- [ ] Review IAM permissions

### Quarterly
- [ ] Run automated security scanner (OWASP ZAP)
- [ ] Conduct security code review
- [ ] Update security documentation
- [ ] Review incident response plan

### Annually
- [ ] Full penetration testing
- [ ] Security audit by third party
- [ ] Review and update security policies
- [ ] Update compliance documentation

## Production Launch Checklist

### Pre-Launch (1 Week Before)
- [ ] All environment variables set
- [ ] Firestore security rules reviewed and tested
- [ ] CORS whitelist configured
- [ ] Rate limiting tested and tuned
- [ ] Cloud Logging configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy configured
- [ ] Security scanner run (no critical issues)

### Launch Day
- [ ] Deploy with `firebase deploy --only functions`
- [ ] Verify health check endpoint
- [ ] Test all critical endpoints
- [ ] Monitor Cloud Logging for errors
- [ ] Monitor Cloud Functions metrics
- [ ] Verify rate limiting works

### Post-Launch (First Week)
- [ ] Daily log review
- [ ] Monitor subscription validations
- [ ] Track error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Prepare hotfix if needed

## Additional Resources

### Documentation
- Firebase Security Rules: https://firebase.google.com/docs/rules
- Cloud Functions Security: https://cloud.google.com/functions/docs/securing
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Apple Server-to-Server Notifications: https://developer.apple.com/documentation/appstoreservernotifications

### Tools
- OWASP ZAP: https://www.zaproxy.org/
- Snyk: https://snyk.io/
- Firebase Emulator Suite: https://firebase.google.com/docs/emulator-suite
- Postman: https://www.postman.com/

---

**Last Updated**: 2025-12-28
**Version**: 1.0.0
**Owner**: Backend Engineering Team
