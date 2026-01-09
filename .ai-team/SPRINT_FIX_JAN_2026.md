# Sprint: Litplan Fixes - January 2026

## Overview
This sprint addresses critical fixes for Litplan across authentication, AI agents, and UI improvements.

---

## Fix 1: Pro Account Access Across Devices

### Problem
Users with a pro subscription cannot access their pro features when logging in from a different phone.

### Root Cause
Subscription lookup may be tied to device-specific identifiers rather than the user's Supabase Auth ID.

### Solution
- Ensure subscriptions are always looked up by `supabaseUserId` (user's auth ID)
- When user logs in on any device, fetch their subscription using their auth ID
- Store `originalTransactionId` from StoreKit to allow restoring purchases

### Backend Engineer Tasks
1. Review `/functions/subscription/index.ts` - ensure lookup by auth ID
2. Add restore purchase endpoint if missing
3. Verify subscription sync across devices

---

## Fix 2: AI Agent Restructuring

### Current State
- Uses Claude API for all AI agents
- Single search agent doing multiple tasks

### Target State
- **Search Agent (OpenAI)**: Searches for venues/events per criteria
- **Data Integrity Agent (OpenAI)**: Validates addresses, corrects details, ensures accuracy
- **Data Engineer (Claude Code only)**: Runs data health checks, not a deployed function

### Backend Engineer Tasks
1. Create `_shared/openai-client.ts` for OpenAI API integration
2. Modify `search-agent/` to use OpenAI
3. Create new `data-integrity-agent/` using OpenAI
4. Update `weekly-plan-refresh/` to call both agents in sequence
5. Keep `group-plan-agent/` using OpenAI for new plans

### Environment Variables Needed
```env
OPENAI_API_KEY=sk-...
```

---

## Fix 3: Maps Sync & Copiable Addresses

### Problem
- Group flows don't show addresses properly for maps
- No easy way to copy addresses

### UI Designer Tasks
1. Create `CopyableAddressView.swift` component with copy icon
2. Add to `GroupFlowDetailView.swift` for each activity
3. Add to `PlanDetailView.swift` for individual plans
4. Implement haptic feedback on copy
5. Show toast/confirmation when address copied

### Component Design
```swift
CopyableAddressView(address: String)
├── Text (address)
├── Button (copy icon - doc.on.doc)
└── onTap: Copy to clipboard + haptic + toast
```

---

## Fix 4: Live Plan Counts from Database

### Problem
- City cards show hardcoded plan counts instead of real data
- "Total plans" figures don't match what's displayed

### Data Sources to Fix
1. `City.totalPlansThisWeek` field - must be updated dynamically
2. CityCard component - must display real count
3. Explore screen - must show accurate numbers

### Backend Engineer Tasks
1. Create endpoint or modify `/cities` to include real plan count
2. Add query: `SELECT COUNT(*) FROM Plan WHERE cityId = ?`
3. Return `actualPlanCount` in city response

### UI Designer Tasks
1. Update `CityCard.swift` to use live plan count
2. Update `HomeView.swift` explore section
3. Ensure all city displays use the same data source

### Data Engineer Tasks
1. Validate plan counts match across all screens
2. Update `City.totalPlansThisWeek` via data-engineer-agent
3. Report any discrepancies

---

## Agent Assignments

| Task | Agent | Priority |
|------|-------|----------|
| Pro account device sync | Backend Engineer | HIGH |
| OpenAI API integration | Backend Engineer | HIGH |
| Search Agent migration | Backend Engineer | HIGH |
| Data Integrity Agent | Backend Engineer | MEDIUM |
| Copiable Address component | UI Designer | MEDIUM |
| Maps sync for group flows | UI Designer | MEDIUM |
| Live plan counts (backend) | Backend Engineer | HIGH |
| Live plan counts (UI) | UI Designer | HIGH |
| Data validation | Data Engineer | MEDIUM |

---

## Execution Order

1. **Backend Engineer** - Fix subscription lookup (30 min)
2. **Backend Engineer** - Create OpenAI client (30 min)
3. **Backend Engineer** - Migrate Search Agent to OpenAI (1 hour)
4. **Backend Engineer** - Create Data Integrity Agent (1 hour)
5. **Backend Engineer** - Add live plan counts to cities API (30 min)
6. **UI Designer** - Create CopyableAddressView component (30 min)
7. **UI Designer** - Add to GroupFlowDetailView (30 min)
8. **UI Designer** - Add to PlanDetailView (15 min)
9. **UI Designer** - Update CityCard for live counts (30 min)
10. **Data Engineer** - Validate all data consistency (30 min)
11. **QA** - Test all fixes end-to-end

---

## Success Criteria

- [ ] User can log in from new device and see pro features
- [ ] Plans are generated using OpenAI API
- [ ] Data integrity validated by separate agent
- [ ] Addresses can be copied with one tap
- [ ] City cards show real plan counts
- [ ] All screens show consistent plan numbers
