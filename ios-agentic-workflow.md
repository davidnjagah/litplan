# 🚀 iOS App Development: Agentic AI Team Workflow

## The Dream Team Setup

### Your AI Development Team

1. **You (Human)** - Vision Holder & Final Decision Maker
2. **Claude (Product Manager)** - Me, coordinating everything in claude.ai
3. **UI Designer** - Claude Code in Warp (Designer mode)
4. **Backend Engineer** - Claude Code in Warp (Backend mode)
5. **QA Tester** - Claude Code in Warp (Testing mode)
6. **Data Engineer** - Supabase Edge Function (Automated Agent)

---

## 📁 Project Structure

```
my-ios-app/
├── .ai-team/                    # AI team coordination folder
│   ├── DAILY_LOG.md            # Single source of truth
│   ├── sprint-plan.md          # Current sprint goals
│   ├── ui-decisions.md         # Design system decisions
│   ├── backend-specs.md        # API contracts
│   ├── qa-checklist.md         # Testing criteria
│   └── data-health-report.md   # Data Engineer reports
├── ios-app/                    # iOS project
│   ├── MyApp.xcodeproj
│   └── MyApp/
├── backend/                    # Backend services
│   ├── api/
│   └── supabase/
│       └── functions/
│           └── data-engineer-agent/  # Automated data integrity agent
└── design/                     # Design assets
    └── figma-exports/
```

---

## 🎯 The Optimal Workflow

### Phase 1: Setup (One Time)

**Step 1: Create Your Project Folder**
```bash
mkdir my-ios-app
cd my-ios-app
mkdir -p .ai-team design backend ios-app
```

**Step 2: Initialize Daily Log**
Create `.ai-team/DAILY_LOG.md` with this template:

```markdown
# Daily Development Log

## [Date] - Sprint Day X

### 🎨 UI Designer (Claude Code - Designer)
- **Tasks Completed:**
  - 
- **Files Modified:**
  - 
- **Decisions Made:**
  - 
- **Blockers:**
  - 

### 🔧 Backend Engineer (Claude Code - Backend)
- **Tasks Completed:**
  - 
- **Files Modified:**
  - 
- **API Changes:**
  - 
- **Blockers:**
  - 

### ✅ QA Tester (Claude Code - QA)
- **Tests Run:**
  -
- **Bugs Found:**
  -
- **Tests Passed:**
  -
- **Blockers:**
  -

### 🗄️ Data Engineer (Supabase Agent)
- **Data Integrity Checks:**
  -
- **Orphaned Records Found:**
  -
- **Component Data Consistency:**
  - GroupFlowCard (Explore + CityDetails):
  - IndividualPlanCard (Home + CityDetails + Search):
  - CityCard (Home + Search + ViewedCities):
  - Duplicate Tables:
  - Single Source of Truth:
- **Sync Issues Detected:**
  -
- **Tables Validated:**
  -
- **Database Health:**
  - Connection Status:
  - Query Performance:
- **Actions Taken:**
  -
- **Alerts:**
  -

### 📊 Product Manager (Claude - PM)
- **Decisions Made:**
  - 
- **Team Coordination:**
  - 
- **Next Steps:**
  - 

---
```

**Step 3: Create Your Context Files**
These help each AI agent understand their role:

`.ai-team/UI_DESIGNER_CONTEXT.md`:
```markdown
# UI Designer Context

## Your Role
You are the expert iOS UI designer responsible for creating a modern, beautiful user interface.

## Design Philosophy
[Your vision here - minimal, bold, glassmorphic, etc.]

## Tech Stack
- SwiftUI
- UIKit (if needed)
- Modern iOS patterns (iOS 17+)

## Always Do
- Follow iOS Human Interface Guidelines
- Maintain design consistency
- Update ui-decisions.md with any new patterns
- Log all work in DAILY_LOG.md under your section
```

`.ai-team/BACKEND_ENGINEER_CONTEXT.md`:
```markdown
# Backend Engineer Context

## Your Role
Senior backend engineer building robust, scalable APIs.

## Tech Stack
[Your choice: Node.js/Express, Python/FastAPI, Swift Vapor, etc.]

## Always Do
- Write clean, documented code
- Update API specs in backend-specs.md
- Log all work in DAILY_LOG.md under your section
- Consider security and performance
```

`.ai-team/QA_TESTER_CONTEXT.md`:
```markdown
# QA Tester Context

## Your Role
Quality assurance - find bugs, validate features, ensure excellence.

## Responsibilities
- Unit testing
- UI testing
- Integration testing
- Manual testing checklist

## Always Do
- Update qa-checklist.md
- Document bugs clearly
- Log all work in DAILY_LOG.md under your section
```

`.ai-team/DATA_ENGINEER_CONTEXT.md`:
```markdown
# Data Engineer Context

## Your Role
You are the expert Data Engineer - the guardian of data integrity, synchronization, and database health. You are the very best at what data engineers do, with deep expertise in database systems, ETL processes, data quality, and real-time synchronization.

## Core Responsibilities

### 1. Data Integrity & Quality
- Ensure referential integrity across all database tables
- Validate data types, constraints, and relationships
- Monitor for orphaned records and broken foreign keys
- Implement data validation rules at the database level
- Detect and prevent data corruption

### 2. Data Synchronization
- Ensure all app screens reflect real-time data from the database
- Verify data consistency between iOS app, backend APIs, and Supabase
- Monitor sync latency between client and server
- Validate that cached data matches source of truth
- Ensure all related entities are properly linked (e.g., Plans ↔ Cities ↔ GroupFlows ↔ GroupFlowSteps)

### 3. Database Health & Performance
- Monitor database connection health and uptime
- Track query performance and identify slow queries
- Optimize indexes for common query patterns
- Monitor table sizes and growth rates
- Ensure connection pooling is working correctly
- Alert on database connectivity issues

### 4. Deduplication & Cleanup
- Detect and remove duplicate records
- Identify orphaned data (records pointing to non-existent parents)
- Clean up stale or expired data
- Maintain data hygiene across all tables
- Archive old data appropriately

### 5. Schema Management
- Validate schema consistency across environments
- Monitor for schema drift
- Ensure migrations are applied correctly
- Document all table relationships and constraints

### 6. ETL & Data Pipeline
- Monitor data transformation processes
- Validate data flows between tables
- Ensure AI-generated content is properly stored
- Verify data enrichment processes complete successfully

### 7. Component Data Consistency (CRITICAL)
- **Single Source of Truth**: Ensure ALL UI components query from the same database tables
- **No Duplicate Tables**: There should NEVER be duplicate tables serving the same purpose
- **Cross-Screen Consistency**: Components that appear on multiple screens MUST query the same table
  - Example: Group Plans in Explore Section AND Group Plans in City Screen → BOTH query `GroupFlow` + `GroupFlowStep` tables
  - Example: Plan cards in Home View AND Plan cards in City Details → BOTH query `Plan` table
- **Validate Component Queries**: Audit iOS components to ensure they use consistent API endpoints
- **Detect Query Divergence**: Alert if same component type uses different data sources

### Component → Table Mapping (Litplan)
| Component | Screens Used | Must Query Table(s) |
|-----------|--------------|---------------------|
| GroupFlowCard | Explore, CityDetails | `GroupFlow` + `GroupFlowStep` |
| IndividualPlanCard | Home, CityDetails, Search | `Plan` |
| CityCard | Home, Search, ViewedCities | `City` |
| WeekSelector | CityDetails | `Plan` (filtered by weekday) |

## Litplan-Specific Focus Areas

### Tables to Monitor
- `City` - Source of truth for cities
- `Plan` - Individual venue/event plans
- `GroupFlow` - Multi-venue experiences
- `GroupFlowStep` - Activities within group flows (MUST link to valid GroupFlow IDs)
- `User` - User accounts
- `Subscription` - Payment/subscription status
- `ViewedCity` - User city view history

### Critical Relationships to Validate
1. **Plan.cityId → City.id** - Every plan must belong to a valid city
2. **GroupFlow.cityId → City.id** - Every group flow must belong to a valid city
3. **GroupFlowStep.flowId → GroupFlow.id** - Every step must belong to a valid flow (NO ORPHANS!)
4. **GroupFlowStep.planId → Plan.id** - Every step should reference a valid plan
5. **Subscription.userId → User.id** - Subscriptions must belong to valid users

### Sync Validation Points
1. Home Screen (Explore) - Cities with accurate planCount
2. City Details View - Plans matching cityId with correct weekday distribution
3. Group Flows Section - Activities populated from GroupFlowStep
4. Search Results - Real-time city data
5. Viewed Cities - Accurate history

## Execution Schedule
- **Runs automatically** after UI Designer and Backend Engineer complete their tasks
- **Frequency**: After every deployment and on scheduled intervals
- **Trigger**: Called by PM or automatically via Supabase cron jobs

## Always Do
- Check for orphaned records after any data migration
- Validate foreign key relationships
- Monitor API response times for data endpoints
- Alert on data integrity issues immediately
- Log all findings in DAILY_LOG.md under your section
- Update data-health-report.md with status

## Never Do
- Delete production data without explicit approval
- Modify schema without PM coordination
- Ignore orphaned records - always investigate root cause
- Assume data is correct - always verify
```

---

## 🎨 Getting UI Inspiration (Critical Step!)

### Method 1: Dribbble/Behance Reference
1. Find 3-5 iOS apps with your desired aesthetic
2. Screenshot key screens
3. Upload to Claude (me) with: "This is the vibe I want"
4. I'll create a detailed design brief for the UI Designer

### Method 2: Existing App Analysis
Tell me: "I want it to look like [App Name] but for [your use case]"
I'll analyze the design patterns and create specifications

### Method 3: Mood Board Approach
Upload images/screenshots of:
- Color schemes you like
- Typography examples
- Layout patterns
- Animation styles

**Then I create a `design-brief.md` that all agents can reference**

---

## 🔄 Daily Workflow (The Magic)

### Morning (Sprint Planning with PM - Me)

**You talk to me in claude.ai:**
```
You: "Today I want to build the login screen and user profile API"

Me (PM): I'll break this down and assign tasks:
- UI Designer: Create login screen with modern iOS design
- Backend: Build auth API with JWT tokens
- QA: Write tests for auth flow
```

### Afternoon (Agents Execute)

**Open 3 Warp terminals:**

**Terminal 1 - UI Designer:**
```bash
cd my-ios-app
claude

# In Claude Code prompt:
"You are the UI Designer. Read .ai-team/UI_DESIGNER_CONTEXT.md and today's task in DAILY_LOG.md.

MANDATORY GIT WORKFLOW:
1. First, create your feature branch: git checkout -b ui/[feature-name]-[date]
2. Build the login screen following our design system
3. Commit your work frequently with clear messages
4. When done, push your branch: git push -u origin ui/[feature-name]-[date]
5. Update DAILY_LOG.md with your progress and branch name"
```

**Terminal 2 - Backend Engineer:**
```bash
cd my-ios-app/backend
claude

# In Claude Code prompt:
"You are the Backend Engineer. Read .ai-team/BACKEND_ENGINEER_CONTEXT.md and build the auth API as specified.

MANDATORY GIT WORKFLOW:
1. First, create your feature branch: git checkout -b backend/[feature-name]-[date]
2. Implement the API endpoints
3. Commit your work frequently with clear messages
4. When done, push your branch: git push -u origin backend/[feature-name]-[date]
5. Update DAILY_LOG.md with your progress and branch name"
```

**Terminal 3 - QA Tester:**
```bash
cd my-ios-app
claude

# In Claude Code prompt:
"You are the QA Tester. Read .ai-team/QA_TESTER_CONTEXT.md. Once UI and Backend are done, test the auth flow.

MANDATORY GIT WORKFLOW:
1. First, create your feature branch: git checkout -b qa/[feature-name]-[date]
2. Run tests and document results
3. Commit test files and reports
4. When done, push your branch: git push -u origin qa/[feature-name]-[date]
5. Log results in DAILY_LOG.md with your branch name"
```

**Automated - Data Engineer (Supabase Agentic AI):**

The Data Engineer runs automatically as a Supabase Edge Function after UI Designer and Backend Engineer complete their tasks.

```typescript
// Supabase Edge Function: data-engineer-agent
// Triggers: After deployments, scheduled cron, or manual invocation

// Location: /backend/supabase/supabase/functions/data-engineer-agent/index.ts
```

**Execution Order:**
1. UI Designer completes → pushes branch
2. Backend Engineer completes → pushes branch
3. **Data Engineer Agent automatically runs** → validates data integrity
4. QA Tester tests → after Data Engineer confirms data is healthy

**What the Data Engineer Agent Does:**
```
1. Validates all foreign key relationships
2. Detects orphaned records (e.g., GroupFlowStep → missing GroupFlow)
3. Verifies data sync between tables (Plan counts match City.totalPlansThisWeek)
4. Checks database connection health
5. Reports findings to DAILY_LOG.md
6. Alerts PM if critical issues found
```

---

### Evening (Review & Merge with PM - Me)

Come back to claude.ai:
```
You: "Here's today's DAILY_LOG.md [paste or upload]"

Me (PM): I'll:
1. Review all agent branches
2. Check code quality and completeness
3. Merge approved work into main branch
4. Push to remote repository
5. Tag if milestone reached
6. Plan tomorrow's sprint
```

---

## 🔀 MANDATORY: Git Branch Workflow for Agents

### Why This is Required
Every agent MUST work on their own git branch. This ensures:
- No code conflicts between agents
- Easy rollback if something breaks
- Clear audit trail of who changed what
- PM can review before merging to main

### Branch Naming Convention

| Agent | Branch Pattern | Example |
|-------|----------------|---------|
| UI Designer | `ui/[feature]-[date]` | `ui/login-screen-2024-12-29` |
| Backend Engineer | `backend/[feature]-[date]` | `backend/auth-api-2024-12-29` |
| QA Tester | `qa/[feature]-[date]` | `qa/auth-tests-2024-12-29` |

### Agent Git Workflow (REQUIRED)

**Step 1: Start of Work - Create Branch**
```bash
# Pull latest main first
git checkout main
git pull origin main

# Create your feature branch
git checkout -b [role]/[feature]-[date]
```

**Step 2: During Work - Commit Frequently**
```bash
# Stage changes
git add -A

# Commit with descriptive message
git commit -m "[role]: [what you did]

- Detail 1
- Detail 2

Files modified:
- path/to/file1
- path/to/file2"
```

**Step 3: End of Work - Push Branch**
```bash
# Push to remote
git push -u origin [role]/[feature]-[date]

# Update DAILY_LOG.md with branch name
```

### PM End-of-Day Merge Process (REQUIRED)

**Step 1: Review All Branches**
```bash
# List all remote branches
git fetch --all
git branch -r

# Check each agent's branch
git log origin/ui/[branch] --oneline -5
git log origin/backend/[branch] --oneline -5
git log origin/qa/[branch] --oneline -5
```

**Step 2: Merge Approved Work**
```bash
# Start from main
git checkout main
git pull origin main

# Merge UI Designer's work
git merge origin/ui/[branch] --no-ff -m "Merge ui/[branch]: [summary]"

# Merge Backend Engineer's work
git merge origin/backend/[branch] --no-ff -m "Merge backend/[branch]: [summary]"

# Merge QA Tester's work
git merge origin/qa/[branch] --no-ff -m "Merge qa/[branch]: [summary]"
```

**Step 3: Push to Remote & Clean Up**
```bash
# Push merged main
git push origin main

# Tag if milestone reached
git tag -a v[X.Y.Z] -m "Sprint [N] Day [X]: [summary]"
git push origin --tags

# Delete merged branches (optional)
git branch -d ui/[branch]
git branch -d backend/[branch]
git branch -d qa/[branch]
git push origin --delete ui/[branch]
git push origin --delete backend/[branch]
git push origin --delete qa/[branch]
```

**Step 4: Document in DAILY_LOG.md**
```markdown
### 📊 Product Manager (Claude - PM) - End of Day
- **Branches Merged:**
  - ui/login-screen-2024-12-29 → main
  - backend/auth-api-2024-12-29 → main
  - qa/auth-tests-2024-12-29 → main
- **Merge Commit:** abc1234
- **Tag Created:** v1.1.0 (if applicable)
- **Remote Push:** ✅ Completed
- **Issues Found:** None / [list issues]
- **Next Day Plan:** [tasks for tomorrow]
```

### Conflict Resolution

If merge conflicts occur:

```bash
# During merge, if conflicts appear
git status  # See conflicting files

# Open conflicting files and resolve manually
# Look for <<<<<<< HEAD, =======, >>>>>>> markers

# After resolving
git add [resolved-file]
git commit -m "Resolve merge conflict in [file]"
```

### Daily Git Checklist

**Agents (Start of Day):**
- [ ] `git checkout main && git pull origin main`
- [ ] `git checkout -b [role]/[feature]-[date]`

**Agents (During Work):**
- [ ] Commit every significant change
- [ ] Use clear commit messages
- [ ] Reference task/bug IDs in commits

**Agents (End of Work):**
- [ ] `git add -A && git commit -m "[summary]"`
- [ ] `git push -u origin [branch]`
- [ ] Update DAILY_LOG.md with branch name

**PM (End of Day):**
- [ ] `git fetch --all`
- [ ] Review each agent's branch
- [ ] Merge approved branches to main
- [ ] `git push origin main`
- [ ] Tag if milestone reached
- [ ] Document in DAILY_LOG.md
- [ ] Plan next day's tasks

---

## 🎯 Pro Tips for Success

### 1. **One DAILY_LOG.md to Rule Them All**
- Each agent appends to the same file
- Easy to track progress
- Natural changelog
- Grep-able history

### 2. **Use Git Branches Per Agent**
```bash
git checkout -b ui/login-screen
git checkout -b backend/auth-api
git checkout -b qa/auth-tests
```

### 3. **Context is King**
Each Claude Code session should start with:
```
"Read .ai-team/[YOUR_ROLE]_CONTEXT.md and .ai-team/DAILY_LOG.md first, then proceed with [task]"
```

### 4. **Share Files Between Agents**
```bash
# UI Designer creates design tokens
echo "Colors, fonts, spacing" > .ai-team/design-tokens.json

# Backend Engineer references it
# QA Tester validates against it
```

### 5. **Use Me (PM Claude) for Coordination**
- Upload the DAILY_LOG daily
- I'll spot conflicts
- I'll prioritize next tasks
- I'll update sprint-plan.md

---

## 🚀 Advanced: Multi-Agent Collaboration

### Scenario: "Build User Profile Screen"

**Step 1: Plan (with PM - me)**
```
You → Me: "Build user profile screen with edit capability"
Me → Creates task breakdown in sprint-plan.md
```

**Step 2: Design (UI Designer)**
```bash
# UI Designer Claude Code
"Build profile screen. Follow design-tokens.json. Mock API calls."
```

**Step 3: Backend (Backend Engineer)**
```bash
# Backend Claude Code
"Build /user/:id GET and PATCH endpoints. Follow backend-specs.md."
```

**Step 4: Integration (UI Designer)**
```bash
# UI Designer returns
"Replace mock API with real backend endpoints from backend-specs.md"
```

**Step 5: Test (QA)**
```bash
# QA Claude Code
"Test profile screen: happy path, error cases, edge cases. Update qa-checklist.md"
```

**Step 6: Review (PM - me)**
```
You upload DAILY_LOG.md
Me: Verifies completion, identifies improvements, plans next sprint
```

---

## 🗄️ Data Engineer: Supabase Agentic AI

### Overview

The Data Engineer is an **automated AI agent** that runs as a Supabase Edge Function. Unlike the other team members who are invoked manually via Claude Code, the Data Engineer runs automatically to ensure data integrity across the entire system.

### Why an Automated Data Engineer?

| Problem | Solution |
|---------|----------|
| Orphaned records (Steps → deleted Flows) | Automatic detection and cleanup |
| Data sync issues across screens | Real-time validation |
| Duplicate entries in tables | Automated deduplication |
| Database connection failures | Health monitoring & alerts |
| Foreign key violations | Relationship validation |

### Implementation: Supabase Edge Function

**Location:** `/backend/supabase/supabase/functions/data-engineer-agent/index.ts`

```typescript
/**
 * Data Engineer Agent - Supabase Edge Function
 *
 * Ensures data integrity, synchronization, and database health
 * Runs automatically after deployments and on scheduled intervals
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DataHealthReport {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    orphanedRecords: OrphanCheck[];
    foreignKeyViolations: FKViolation[];
    syncIssues: SyncIssue[];
    duplicates: DuplicateRecord[];
    connectionHealth: ConnectionStatus;
  };
  actions: string[];
  alerts: string[];
}

serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const report: DataHealthReport = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      orphanedRecords: [],
      foreignKeyViolations: [],
      syncIssues: [],
      duplicates: [],
      connectionHealth: { connected: true, latency: 0 }
    },
    actions: [],
    alerts: []
  };

  // 1. Check for orphaned GroupFlowSteps
  const orphanedSteps = await checkOrphanedSteps(supabase);
  if (orphanedSteps.length > 0) {
    report.checks.orphanedRecords.push(...orphanedSteps);
    report.status = 'warning';
    // Auto-fix: Delete orphaned steps
    await deleteOrphanedSteps(supabase, orphanedSteps);
    report.actions.push(`Deleted ${orphanedSteps.length} orphaned GroupFlowSteps`);
  }

  // 2. Validate Plan → City relationships
  const invalidPlans = await checkPlanCityRelations(supabase);
  if (invalidPlans.length > 0) {
    report.checks.foreignKeyViolations.push(...invalidPlans);
    report.status = 'critical';
    report.alerts.push(`${invalidPlans.length} Plans reference non-existent Cities!`);
  }

  // 3. Verify City.totalPlansThisWeek matches actual Plan count
  const syncIssues = await checkPlanCountSync(supabase);
  if (syncIssues.length > 0) {
    report.checks.syncIssues.push(...syncIssues);
    // Auto-fix: Update plan counts
    await updatePlanCounts(supabase, syncIssues);
    report.actions.push(`Updated plan counts for ${syncIssues.length} cities`);
  }

  // 4. Check for duplicate records
  const duplicates = await checkDuplicates(supabase);
  if (duplicates.length > 0) {
    report.checks.duplicates.push(...duplicates);
    report.status = 'warning';
  }

  // 5. Test database connection health
  report.checks.connectionHealth = await checkConnectionHealth(supabase);

  // 6. Validate component data consistency (same component = same table)
  const componentIssues = await validateComponentConsistency(supabase);
  if (componentIssues.length > 0) {
    report.checks.syncIssues.push(...componentIssues);
    report.alerts.push(`Component data consistency issues detected!`);
  }

  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Implementation functions...
async function checkOrphanedSteps(supabase: any) {
  // Find GroupFlowSteps where flowId doesn't exist in GroupFlow
  const { data: steps } = await supabase.from('GroupFlowStep').select('id, flowId');
  const { data: flows } = await supabase.from('GroupFlow').select('id');
  const flowIds = new Set(flows?.map((f: any) => f.id));
  return steps?.filter((s: any) => !flowIds.has(s.flowId)) || [];
}

async function checkPlanCityRelations(supabase: any) {
  // Find Plans where cityId doesn't exist in City
  const { data: plans } = await supabase.from('Plan').select('id, cityId');
  const { data: cities } = await supabase.from('City').select('id');
  const cityIds = new Set(cities?.map((c: any) => c.id));
  return plans?.filter((p: any) => !cityIds.has(p.cityId)) || [];
}

async function checkPlanCountSync(supabase: any) {
  // Compare City.totalPlansThisWeek with actual Plan count
  const { data: cities } = await supabase.from('City').select('id, totalPlansThisWeek');
  const issues = [];
  for (const city of cities || []) {
    const { count } = await supabase
      .from('Plan')
      .select('*', { count: 'exact', head: true })
      .eq('cityId', city.id);
    if (count !== city.totalPlansThisWeek) {
      issues.push({ cityId: city.id, expected: city.totalPlansThisWeek, actual: count });
    }
  }
  return issues;
}

async function validateComponentConsistency(supabase: any) {
  /**
   * Validates that components displaying the same data type query from the same tables.
   *
   * Component → Table Mapping:
   * - GroupFlowCard (Explore + CityDetails) → GroupFlow + GroupFlowStep
   * - IndividualPlanCard (Home + CityDetails + Search) → Plan
   * - CityCard (Home + Search + ViewedCities) → City
   *
   * This function verifies data consistency across tables that feed multiple screens.
   */
  const issues = [];

  // Check 1: All GroupFlows have steps (components would show empty otherwise)
  const { data: groupFlows } = await supabase.from('GroupFlow').select('id, title, cityId');
  const { data: steps } = await supabase.from('GroupFlowStep').select('flowId');
  const flowsWithSteps = new Set(steps?.map((s: any) => s.flowId));

  for (const flow of groupFlows || []) {
    if (!flowsWithSteps.has(flow.id)) {
      issues.push({
        type: 'component_data_missing',
        component: 'GroupFlowCard',
        issue: `GroupFlow "${flow.title}" (${flow.id}) has no steps - will appear empty in UI`,
        tables: ['GroupFlow', 'GroupFlowStep']
      });
    }
  }

  // Check 2: All Plans have required display fields
  const { data: plans } = await supabase
    .from('Plan')
    .select('id, title, venueName, cityId')
    .or('title.is.null,venueName.is.null');

  for (const plan of plans || []) {
    if (!plan.title || !plan.venueName) {
      issues.push({
        type: 'component_data_incomplete',
        component: 'IndividualPlanCard',
        issue: `Plan ${plan.id} missing title or venueName - UI will show incomplete data`,
        tables: ['Plan']
      });
    }
  }

  // Check 3: City data consistency for CityCard
  const { data: cities } = await supabase
    .from('City')
    .select('id, name, heroImage, cardImage');

  for (const city of cities || []) {
    if (!city.heroImage && !city.cardImage) {
      issues.push({
        type: 'component_data_incomplete',
        component: 'CityCard',
        issue: `City "${city.name}" (${city.id}) has no images - UI will show placeholder`,
        tables: ['City']
      });
    }
  }

  return issues;
}
```

### Trigger Configuration

**1. Scheduled Cron Job (Recommended)**
```sql
-- Run every 6 hours
SELECT cron.schedule(
  'data-engineer-check',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    'https://[project].supabase.co/functions/v1/data-engineer-agent',
    '{}',
    'application/json',
    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key'))]
  );
  $$
);
```

**2. After Deployment Hook**
```bash
# In CI/CD pipeline, after deploying functions:
curl -X POST https://[project].supabase.co/functions/v1/data-engineer-agent \
  -H "Authorization: Bearer $SERVICE_KEY"
```

**3. Manual Invocation by PM**
```bash
# When PM suspects data issues:
supabase functions invoke data-engineer-agent
```

### Execution Order in Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY DEVELOPMENT FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. UI Designer      ──────► Completes UI changes                │
│         │                                                        │
│         ▼                                                        │
│  2. Backend Engineer ──────► Completes API/DB changes            │
│         │                                                        │
│         ▼                                                        │
│  3. DATA ENGINEER    ──────► AUTO-RUNS after #1 & #2             │
│     (Supabase Agent)         - Validates data integrity          │
│         │                    - Fixes orphaned records            │
│         │                    - Syncs plan counts                 │
│         │                    - Reports to DAILY_LOG.md           │
│         ▼                                                        │
│  4. QA Tester        ──────► Tests with clean, valid data        │
│         │                                                        │
│         ▼                                                        │
│  5. PM Review        ──────► Merges all branches                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Health Report Format

The Data Engineer generates reports in this format:

```json
{
  "timestamp": "2026-01-05T14:30:00Z",
  "status": "healthy",
  "checks": {
    "orphanedRecords": [],
    "foreignKeyViolations": [],
    "syncIssues": [],
    "duplicates": [],
    "componentConsistency": {
      "GroupFlowCard": { "screens": ["Explore", "CityDetails"], "table": "GroupFlow+GroupFlowStep", "valid": true },
      "IndividualPlanCard": { "screens": ["Home", "CityDetails", "Search"], "table": "Plan", "valid": true },
      "CityCard": { "screens": ["Home", "Search", "ViewedCities"], "table": "City", "valid": true }
    },
    "connectionHealth": {
      "connected": true,
      "latency": 45,
      "poolSize": 10,
      "activeConnections": 3
    }
  },
  "tables": {
    "City": { "count": 50, "valid": true },
    "Plan": { "count": 1000, "valid": true },
    "GroupFlow": { "count": 121, "valid": true },
    "GroupFlowStep": { "count": 428, "valid": true }
  },
  "singleSourceOfTruth": {
    "verified": true,
    "duplicateTables": 0,
    "note": "All components query from single database - no duplicate tables"
  },
  "actions": [
    "Updated plan counts for 3 cities",
    "Deleted 0 orphaned steps",
    "Verified component data consistency across all screens"
  ],
  "alerts": []
}
```

### Integration with DAILY_LOG.md

The Data Engineer automatically appends to the daily log:

```markdown
### 🗄️ Data Engineer (Supabase Agent) - Auto-Run @ 14:30 UTC
- **Data Integrity Checks:**
  - ✅ All Plan → City relationships valid
  - ✅ All GroupFlowStep → GroupFlow relationships valid
  - ✅ No orphaned records detected
- **Component Data Consistency:**
  - ✅ GroupFlowCard (Explore + CityDetails) → Same data from GroupFlow+GroupFlowStep
  - ✅ IndividualPlanCard (Home + CityDetails + Search) → Same data from Plan
  - ✅ CityCard (Home + Search + ViewedCities) → Same data from City
  - ✅ No duplicate tables detected
  - ✅ Single source of truth verified
- **Sync Issues Detected:**
  - Fixed: NYC plan count (was 48, now 50)
- **Tables Validated:**
  - City: 50 records ✓
  - Plan: 1000 records ✓
  - GroupFlow: 121 records ✓
  - GroupFlowStep: 428 records ✓
- **Database Health:**
  - Connection Status: ✅ Healthy
  - Query Performance: 45ms avg
- **Actions Taken:**
  - Updated totalPlansThisWeek for 3 cities
  - Verified all components query from single database
- **Alerts:** None
```

### Alert Escalation

| Severity | Condition | Action |
|----------|-----------|--------|
| 🟢 Healthy | All checks pass, components consistent | Log only |
| 🟡 Warning | Orphaned records found, auto-fixed | Log + notify PM |
| 🟡 Warning | Component showing incomplete data | Log + notify PM + flag for UI fix |
| 🔴 Critical | FK violations, data corruption | Log + alert PM immediately + pause deployments |
| 🔴 Critical | Duplicate tables detected | Log + alert PM immediately + investigate root cause |
| 🔴 Critical | Same component querying different tables | Log + alert PM + immediate code review |

---

## 📱 iOS-Specific Considerations

### Design Inspiration Sources
1. **Apple's HIG**: https://developer.apple.com/design/human-interface-guidelines/
2. **iOS Apps to Study**:
   - Apollo (Reddit client) - information density
   - Things 3 - minimal, functional beauty
   - Notion - modern, clean
   - Superhuman - gesture-driven
   - Linear - speed and polish

### Tell UI Designer:
```
"Reference [App Name]'s approach to [feature]. 
Key elements: 
- Navigation style
- Card design
- Color usage
- Typography
- Animations"
```

---

## 🎬 Getting Started (First Day)

### Option A: Start with Design
```
Day 1:
1. You → Me: "I want to build [app description]. UI like [reference]"
2. Me → Creates design-brief.md with vision
3. UI Designer → Creates design system and first screens
4. Me → Reviews and plans backend needs
```

### Option B: Start with Backend
```
Day 1:
1. You → Me: "I need these APIs: [list]"
2. Me → Creates backend-specs.md
3. Backend Engineer → Builds API structure
4. UI Designer → Creates screens that consume APIs
```

---

## 💡 Is This Doable? ABSOLUTELY.

### What Makes This Work:

✅ **Single DAILY_LOG.md** - All agents append to one file  
✅ **Context files** - Each agent knows their role  
✅ **PM coordination** - I (Claude in claude.ai) orchestrate  
✅ **Git branches** - Agents work in parallel without conflicts  
✅ **Clear handoffs** - Backend specs → UI implementation → QA validation  

### Potential Challenges:

⚠️ **File conflicts** - Mitigated by branches and clear ownership  
⚠️ **Context limits** - Keep logs focused, archive old sprints  
⚠️ **Agent "memory"** - Must re-read context each session (which is fine!)  

---

## 🎯 Your Next Steps

1. **Define Your Vision**: Tell me about the app you want to build
2. **Share UI Inspiration**: Send screenshots/references of the design style
3. **Choose Tech Stack**: iOS (SwiftUI/UIKit) + Backend (Node/Python/etc)
4. **I'll Create**: Full design brief + initial sprint plan
5. **You Setup**: Project structure with .ai-team folder
6. **We Build**: You coordinate with me, agents execute

---

## 📦 Version Control & Backup Strategy

### Why This Matters
Before making significant architectural changes (database migrations, auth system changes, major refactors), **always create a versioned backup**. This protects your working code and allows easy rollback.

### Git Setup (Required)

**Step 1: Initialize Git Repository**
```bash
cd my-ios-app
git init
git branch -M main
```

**Step 2: Create .gitignore**
```gitignore
# Dependencies
node_modules/
Pods/
.build/

# Environment
.env
.env.local
*.local

# IDE
.idea/
*.xcworkspace
xcuserdata/

# Build outputs
build/
DerivedData/
*.ipa

# Secrets (NEVER commit these)
*.p8
*.p12
*.mobileprovision
GoogleService-Info.plist
firebase-credentials.json
```

**Step 3: First Commit**
```bash
git add -A
git commit -m "v1.0.0: Initial version - [describe current state]"
git tag -a v1.0.0 -m "Version 1.0.0: [description]"
```

**Step 4: Push to Remote**
```bash
git remote add origin https://github.com/[username]/[repo].git
git push -u origin main --tags
```

### Versioning Strategy (Semantic Versioning)

Use **MAJOR.MINOR.PATCH** format:

| Version | When to Use | Example |
|---------|-------------|---------|
| **MAJOR** (X.0.0) | Breaking changes, architecture overhauls | `v2.0.0: Migrated to Prisma + Clerk` |
| **MINOR** (1.X.0) | New features, backward compatible | `v1.1.0: Added group flows feature` |
| **PATCH** (1.0.X) | Bug fixes, small improvements | `v1.0.1: Fixed auth token refresh` |

### Pre-Major-Change Checklist

Before starting a major sprint (database migration, auth change, etc.):

1. **Create Local Backup**
   ```bash
   # Copy entire project to parent folder with version label
   cp -R /path/to/project /path/to/project-v1-pre-[change-name]
   ```

2. **Commit Current State**
   ```bash
   git add -A
   git commit -m "v[X.Y.Z]: Pre-[change] snapshot - [current state description]"
   git tag -a v[X.Y.Z] -m "Snapshot before [change]"
   ```

3. **Push to Remote**
   ```bash
   git push origin main --tags
   ```

4. **Document in DAILY_LOG.md**
   ```markdown
   ### Version Checkpoint
   - **Version**: v1.0.0
   - **Date**: [date]
   - **State**: Pre-Prisma/Clerk migration
   - **Backup Location**: /parent/folder/project-v1-pre-prisma-clerk
   - **GitHub Tag**: v1.0.0
   ```

### Branch Strategy for Major Changes

```bash
# Create feature branch for major work
git checkout -b feature/prisma-clerk-migration

# Work on the feature...
# Make commits along the way...

# When complete, merge back
git checkout main
git merge feature/prisma-clerk-migration
git tag -a v2.0.0 -m "Version 2.0.0: Prisma + Clerk Migration"
git push origin main --tags
```

### Rollback Procedure

If something goes wrong:

**Option 1: Git Rollback**
```bash
# View tags
git tag -l

# Checkout previous version
git checkout v1.0.0

# Create branch from that point if needed
git checkout -b rollback/v1.0.0
```

**Option 2: Local Backup**
```bash
# If git is corrupted or unavailable
cp -R /path/to/project-v1-pre-change /path/to/project
```

### Version History Template

Create `.ai-team/VERSION_HISTORY.md`:

```markdown
# Version History

## v2.0.0 (In Progress)
- **Status**: Sprint 5 - Prisma + Clerk Migration
- **Changes**:
  - Database: Firestore → Prisma/PlanetScale
  - Auth: iCloud → Clerk
  - Subscriptions linked to Clerk IDs

## v1.0.0 (December 29, 2024)
- **Tag**: v1.0.0
- **Backup**: litplanAI-v1-pre-prisma-clerk
- **State**: Firebase/Firestore implementation complete
- **Features**:
  - iOS app with SwiftUI
  - Firebase Cloud Functions backend
  - StoreKit 2 subscriptions
  - Sign in with Apple auth
```

### Golden Rules

1. **Never delete backups** until new version is stable in production
2. **Always tag releases** before major changes
3. **Document version state** in DAILY_LOG.md and VERSION_HISTORY.md
4. **Test rollback procedure** before starting major migrations
5. **Keep at least 2 versions** of local backups (current - 1, current - 2)

---

## 🔥 Ready to Start?

Tell me:
1. **What's the app?** (e.g., "fitness tracker", "recipe organizer")
2. **What's the vibe?** (e.g., "minimal like Things 3", "bold like Superhuman")
3. **What's the first feature?** (e.g., "user auth and onboarding")

I'll create your first sprint plan and get your AI team rolling! 🚀
