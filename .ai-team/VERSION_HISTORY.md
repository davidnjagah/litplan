# Version History

## v2.0.0 (In Progress)
- **Status**: Sprint 5 - Prisma + Clerk Migration
- **Target Completion**: January 10-12, 2025
- **Changes**:
  - Database: Firestore → Prisma ORM + PostgreSQL (local) / PlanetScale (production)
  - Auth: Sign in with Apple/iCloud → Clerk (Google, Apple, Email/Password)
  - Subscriptions: Linked to Clerk account IDs
- **Documentation**:
  - `SPRINT_5_PRISMA_CLERK_MIGRATION.md`
  - `SPRINT5_BACKEND_CONTEXT.md`
  - `SPRINT5_UI_DESIGNER_CONTEXT.md`
  - `SPRINT5_QA_CONTEXT.md`

---

## v1.0.0 (December 29, 2024)
- **Tag**: `v1.0.0`
- **GitHub**: https://github.com/davidnjagah/litplan/releases/tag/v1.0.0
- **Local Backup**: `/Users/davidnjagah/Documents/GitHub/litplanAI-v1-pre-prisma-clerk`
- **State**: Firebase/Firestore implementation complete

### Features Included:
- **iOS App** (SwiftUI, iOS 17+)
  - Home/Explore view with city card stacks
  - Search view for city lookup
  - Viewed Cities tab with history
  - Profile view with subscription status
  - Complete component library (buttons, cards, state views)
  - PaywallView for subscription upsells
  - StoreKit 2 integration

- **Backend** (Firebase Cloud Functions + TypeScript)
  - Firestore data models (User, City, Plan, GroupFlow)
  - Authentication with Sign in with Apple
  - Subscription management with StoreKit 2 server validation
  - All API endpoints (cities, plans, user, subscriptions)
  - Weekly AI plan refresh scheduled function (Claude 3.5 Sonnet)
  - Security rules and rate limiting

- **AI Team Workflow**
  - Complete `.ai-team/` coordination folder
  - Sprint plans (1-4 completed)
  - Daily logs with agent contributions
  - QA reports and checklists
  - Design system documentation

### Tech Stack:
| Component | Technology |
|-----------|------------|
| Database | Cloud Firestore |
| Auth | Sign in with Apple / iCloud |
| Payments | StoreKit 2 |
| Backend | Firebase Cloud Functions (Node.js/TypeScript) |
| iOS | SwiftUI, iOS 17+ |
| AI | Claude 3.5 Sonnet (Anthropic API) |

### Stats:
- **Files**: 216
- **Lines of Code**: ~105,000+
- **Sprints Completed**: 4
- **API Endpoints**: 15+
- **iOS Views**: 10+
- **Components**: 15+

---

## Version Naming Convention

| Version | Meaning |
|---------|---------|
| `vX.0.0` | Major release (breaking changes, architecture overhauls) |
| `v1.X.0` | Minor release (new features, backward compatible) |
| `v1.0.X` | Patch release (bug fixes, small improvements) |

## Rollback Instructions

### To rollback to v1.0.0:

**Option 1: Git**
```bash
git checkout v1.0.0
git checkout -b rollback/v1.0.0
```

**Option 2: Local Backup**
```bash
cp -R /Users/davidnjagah/Documents/GitHub/litplanAI-v1-pre-prisma-clerk /Users/davidnjagah/Documents/GitHub/litplanAI
```
