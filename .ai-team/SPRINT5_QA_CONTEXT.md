# Sprint 5: QA Tester Context - Prisma + Clerk Migration

## Your Mission
Validate the complete migration from Firebase/Firestore to Prisma + Clerk, ensuring zero data loss, authentication integrity, and subscription continuity.

## Testing Scope

### 1. Infrastructure Testing (Phase 1)
- PostgreSQL database connectivity
- Prisma migrations
- PlanetScale connectivity (production)

### 2. Authentication Testing (Phase 3)
- Clerk Google Sign-In
- Clerk Apple Sign-In
- Clerk Email/Password flows
- Session management
- Token refresh

### 3. API Testing (Phase 4)
- All endpoint functionality
- Response format compatibility
- Error handling
- Performance benchmarks

### 4. Subscription Testing (Phase 4-5)
- Subscription validation
- Entitlements mapping
- StoreKit + Clerk ID linking

### 5. Data Migration Testing (Phase 5)
- Data integrity verification
- User mapping validation
- Relationship integrity

---

## Test Cases

### TC-001: Database Setup
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| PostgreSQL container starts | Container running on port 5432 | | |
| Prisma migration runs | No errors, tables created | | |
| Seed data loads | 10 cities, 500 plans created | | |
| Prisma Studio connects | Can view/edit data | | |

### TC-002: Clerk Authentication - Google
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Google sign-in button appears | Button visible on auth screen | | |
| Tap initiates OAuth flow | Google consent screen appears | | |
| Successful sign-in creates user | User record in database | | |
| Session persists after app restart | User remains signed in | | |
| Sign out clears session | Returns to auth screen | | |

### TC-003: Clerk Authentication - Apple
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Apple sign-in button appears | Button visible on auth screen | | |
| Tap initiates Apple ID flow | Apple sign-in dialog appears | | |
| Successful sign-in creates user | User record in database | | |
| Privacy email relay works | Email stored correctly | | |
| Session persists after app restart | User remains signed in | | |

### TC-004: Clerk Authentication - Email/Password
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Email sign-in screen accessible | Screen loads correctly | | |
| Empty email shows error | Validation message | | |
| Invalid email format shows error | Validation message | | |
| Wrong password shows error | "Invalid credentials" message | | |
| Successful sign-in creates session | User lands on main screen | | |
| Sign-up creates new user | User record in database | | |
| Password reset sends email | Email received | | |
| Password reset completes | Can sign in with new password | | |

### TC-005: API - Cities Endpoint
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| GET /cities returns all cities | 10 cities in response | | |
| Cities ordered by rank | rank 1 first | | |
| Response format matches iOS | All expected fields present | | |
| Response time < 300ms | Actual time measured | | |
| Unauthenticated request returns 401 | 401 status code | | |

### TC-006: API - Plans Endpoint
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| GET /cities/:id/plans returns plans | 50 plans max | | |
| Free user limited to 10 plans | Only 10 returned | | |
| Pro user gets 50 plans | 50 returned | | |
| Weekend filter works | Only weekend plans | | |
| Response format matches iOS | All expected fields | | |

### TC-007: API - Subscription
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| POST /subscription/validate works | Subscription updated | | |
| Clerk userId linked to subscription | clerkUserId in record | | |
| GET /subscription/status accurate | Correct status returned | | |
| Entitlements updated correctly | Tier limits enforced | | |

### TC-008: Data Migration
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| All cities migrated | Count matches Firestore | | |
| All plans migrated | Count matches Firestore | | |
| All users migrated | Count matches Firestore | | |
| Relationships intact | Foreign keys valid | | |
| No data corruption | Spot check 10 records | | |

### TC-009: iOS App Integration
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| App shows auth screen first | Auth screen displayed | | |
| Sign in navigates to main | Main tab view visible | | |
| Profile shows user info | Name, email, photo correct | | |
| Subscription status displayed | Correct tier shown | | |
| API calls work with Clerk token | Data loads correctly | | |

### TC-010: Subscription Continuity
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Existing Pro user retains access | All Pro features work | | |
| Transaction ID preserved | Same ID in new system | | |
| Expiry date correct | Matches original | | |
| Auto-renew status correct | Same as original | | |

---

## Test Data Requirements

### Test Users
```json
{
  "freeUser": {
    "email": "free@test.litplan.app",
    "password": "Test123!@#",
    "expectedTier": "FREE"
  },
  "proUser": {
    "email": "pro@test.litplan.app",
    "password": "Test123!@#",
    "expectedTier": "PRO"
  },
  "newUser": {
    "email": "new@test.litplan.app",
    "password": "Test123!@#"
  }
}
```

### Test Cities to Verify
- NYC (rank 1)
- Los Angeles (rank 2)
- London (rank 5)

### Test Plans to Verify
- First plan in NYC
- 10th plan in NYC (free limit)
- 11th plan in NYC (pro only)
- Weekend plan in LA

---

## Regression Test Suite

### Pre-Migration Baseline
Before migration, document:
1. Total user count
2. Total city count
3. Total plan count
4. Pro user count
5. Sample query results

### Post-Migration Verification
After migration, verify same results:
1. User count matches
2. City count matches
3. Plan count matches
4. Pro user count matches
5. Query results match

---

## Performance Benchmarks

### API Response Times (target: p95 < 300ms)
| Endpoint | Pre-Migration | Post-Migration | Delta |
|----------|---------------|----------------|-------|
| GET /cities | | | |
| GET /cities/:id/plans | | | |
| GET /user/me | | | |
| GET /subscription/status | | | |

### Database Query Times
| Query | Pre-Migration | Post-Migration | Delta |
|-------|---------------|----------------|-------|
| Get all cities | | | |
| Get plans for city | | | |
| Get user by ID | | | |

---

## Bug Report Template

```markdown
### Bug: [Title]

**Severity**: Critical / High / Medium / Low
**Component**: Backend / iOS / Database
**Phase**: [1-6]

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:

**Actual Result**:

**Screenshot/Logs**:

**Environment**:
- Device:
- OS Version:
- Backend Version:
- Database:

**Additional Notes**:
```

---

## Test Execution Log

```markdown
### QA Tester - Sprint 5
**Date**: [Date]
**Phase**: [1-6]

#### Tests Executed:
| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| TC-001 | Database Setup | | |
| TC-002 | Clerk Google Auth | | |
| ... | ... | | |

#### Bugs Found:
1. [BUG-001]: Description

#### Blockers:
-

#### Test Coverage:
- Tests Planned: X
- Tests Executed: X
- Tests Passed: X
- Tests Failed: X
- Bugs Found: X

#### Recommendations:
-
```

---

## Critical Checkpoints

### Before Phase 4 (API Migration)
- [ ] All database tests pass
- [ ] Clerk webhooks tested
- [ ] Test data seeded

### Before Phase 5 (iOS Updates)
- [ ] All API endpoints tested
- [ ] Response formats verified
- [ ] Subscription flow tested

### Before Phase 6 (Production)
- [ ] All regression tests pass
- [ ] Performance benchmarks met
- [ ] Data migration verified
- [ ] Rollback plan tested

---

## Rollback Test Plan

In case of critical issues:
1. Verify Firestore backup exists
2. Verify can revert API to Firestore
3. Verify iOS can fall back to old auth
4. Document rollback procedure

---

**Reference Documents**:
- Full migration plan: `SPRINT_5_PRISMA_CLERK_MIGRATION.md`
- API specs: `backend-specs.md`
- Previous QA reports: `qa-checklist.md`
