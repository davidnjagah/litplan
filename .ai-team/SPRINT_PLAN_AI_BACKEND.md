# Sprint Plan: AI-Powered Backend Migration

## Overview
Migrate backend from Express/Firebase Cloud Functions to Supabase Edge Functions with AI-powered plan generation and quality assurance agents.

---

## Architecture Overview

### Current State
- Backend: Express.js + Firebase Cloud Functions
- Database: Supabase PostgreSQL (via Prisma)
- Auth: Supabase Auth

### Target State
- Backend: Supabase Edge Functions (Deno)
- Database: Supabase PostgreSQL (direct client)
- AI Agents: 3 Claude-powered agents for data management
- Scheduler: Supabase pg_cron for daily updates at 1am CET

---

## Sprint Breakdown

### Sprint 19: Supabase Edge Functions Foundation (Backend)
**Duration: 2-3 days**

**Tasks:**
1. Set up Supabase Edge Functions project structure
2. Migrate core API endpoints from Express to Edge Functions:
   - `/cities` - List/get cities
   - `/plans` - List/get plans
   - `/subscription` - Subscription management
   - `/user` - User profile and sync
3. Set up Supabase client for direct database access
4. Configure CORS and authentication middleware
5. Deploy and test each endpoint
6. Update iOS app API URLs to use Edge Functions

**Files to Create:**
```
backend/
├── supabase/
│   ├── functions/
│   │   ├── cities/index.ts
│   │   ├── plans/index.ts
│   │   ├── subscription/index.ts
│   │   ├── user/index.ts
│   │   ├── group-flows/index.ts
│   │   └── _shared/
│   │       ├── supabase-client.ts
│   │       ├── cors.ts
│   │       └── auth.ts
│   └── config.toml
```

---

### Sprint 20: AI Agent Infrastructure (Backend)
**Duration: 2-3 days**

**Tasks:**
1. Set up Claude API integration in Supabase Edge Functions
2. Create the AI Agent base class/utilities:
   - API key management (environment variables)
   - Rate limiting and retry logic
   - Response parsing and validation
3. Design the Plan data schema for AI generation:
   ```typescript
   interface GeneratedPlan {
     title: string;
     venueName: string;
     description: string;  // Must be extensive
     category: string;
     cityId: string;
     location: {
       address: string;
       neighborhood: string;
       coordinates: { lat: number; lng: number };
     };
     schedule: {
       date: string;  // ISO date
       dayOfWeek: string;
       startTime: string;
       endTime: string;
       isWeekend: boolean;
     };
     pricing: {
       entryFee: number;
       priceRange: string;
       currency: string;
     };
     aiTags: string[];
     flags: {
       isWeekendPlan: boolean;
       requiresReservation: boolean;
       ageRestriction: number | null;
     };
     qualityScore: number;  // 0-100
   }
   ```

**Files to Create:**
```
backend/supabase/functions/
├── _shared/
│   ├── claude-client.ts      # Claude API wrapper
│   ├── plan-schema.ts        # Plan validation schemas
│   └── quality-criteria.ts   # Quality thresholds
```

---

### Sprint 21: AI Agent 1 - Plan Generator (Backend)
**Duration: 2-3 days**

**Tasks:**
1. Create Plan Generator Agent that:
   - Generates plans for top 100 cities
   - Creates plans for 30 days ahead
   - Uses Claude to research and create detailed plans
   - Validates data completeness before storage
   - Only stores plans with extensive details (quality score > 80)

2. Prompt Engineering for Plan Generation:
   ```
   System: You are an expert nightlife and event curator for {city}.
   Generate a detailed plan for {date} ({dayOfWeek}).

   Requirements:
   - Real venue with actual address
   - Specific event/experience (not generic)
   - Detailed description (100+ words)
   - Accurate pricing information
   - Appropriate tags and categories
   - Reservation requirements
   - Age restrictions if applicable

   Output: JSON matching the GeneratedPlan schema
   ```

3. City coverage: Top 100 cities globally
4. Date coverage: Rolling 30-day window

**Files to Create:**
```
backend/supabase/functions/
├── ai-agents/
│   └── plan-generator/
│       ├── index.ts           # Main generator logic
│       ├── city-list.ts       # Top 100 cities
│       ├── prompts.ts         # Claude prompts
│       └── validator.ts       # Quality validation
```

---

### Sprint 22: AI Agents 2 & 3 - Quality Assurance (Backend)
**Duration: 2 days**

**Tasks:**
1. Create QA Agent 1 - Factual Accuracy Checker:
   - Verifies venue exists (via Google Places API or similar)
   - Validates address accuracy
   - Checks event date validity
   - Confirms pricing is reasonable
   - Score: 0-100 for accuracy

2. Create QA Agent 2 - Content Quality Checker:
   - Evaluates description quality and detail
   - Checks for plagiarism/duplicates
   - Validates tags appropriateness
   - Ensures cultural sensitivity
   - Score: 0-100 for quality

3. Combined Quality Gate:
   - Plan must score > 80 on both checks
   - Plans failing QA are logged but not stored
   - Weekly report of rejected plans

**Files to Create:**
```
backend/supabase/functions/
├── ai-agents/
│   ├── qa-accuracy/
│   │   ├── index.ts           # Accuracy checker
│   │   ├── venue-verifier.ts  # Venue validation
│   │   └── prompts.ts
│   └── qa-quality/
│       ├── index.ts           # Quality checker
│       ├── content-analyzer.ts
│       └── prompts.ts
```

---

### Sprint 23: Scheduled Job - Daily Plan Refresh (Backend)
**Duration: 1-2 days**

**Tasks:**
1. Set up pg_cron in Supabase for scheduled jobs
2. Create daily refresh job that runs at 1am CET:
   - Identifies expired plans (yesterday)
   - Generates new plans for day 31 (30 days ahead)
   - Runs QA checks on all new plans
   - Updates database with approved plans
   - Logs job execution and results

3. Create monitoring/alerting:
   - Job success/failure notifications
   - Plan generation statistics
   - Quality metrics dashboard

**SQL for pg_cron:**
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily job at 1am CET (midnight UTC)
SELECT cron.schedule(
  'daily-plan-refresh',
  '0 0 * * *',  -- Midnight UTC = 1am CET
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/daily-plan-refresh',
    headers := '{"Authorization": "Bearer [service-role-key]"}'::jsonb
  )
  $$
);
```

**Files to Create:**
```
backend/supabase/functions/
├── daily-plan-refresh/
│   ├── index.ts           # Main orchestrator
│   ├── cleanup.ts         # Remove expired plans
│   └── generator.ts       # Generate new day
```

---

### Sprint 24: iOS - Week Selection UI (UI Designer)
**Duration: 2-3 days**

**Tasks:**
1. Add week selector tab to CityDetailsView:
   - Horizontal scrollable date tabs
   - Shows Monday-Sunday for 4 weeks
   - Current day highlighted
   - Smooth scroll to selected date

2. UI Components:
   ```swift
   struct WeekSelectorView: View {
     @Binding var selectedDate: Date
     let availableWeeks: Int = 4

     var body: some View {
       ScrollView(.horizontal, showsIndicators: false) {
         HStack(spacing: Spacing.sm) {
           ForEach(datesForWeeks, id: \.self) { date in
             DateTabButton(
               date: date,
               isSelected: isSameDay(date, selectedDate),
               onTap: { selectedDate = date }
             )
           }
         }
       }
     }
   }

   struct DateTabButton: View {
     let date: Date
     let isSelected: Bool
     let onTap: () -> Void

     var body: some View {
       VStack(spacing: 4) {
         Text(dayOfWeek)      // "Mon", "Tue", etc.
         Text(dayNumber)       // "15", "16", etc.
         Text(monthAbbrev)     // "Jan", "Feb", etc.
       }
       .background(isSelected ? Color.accentPrimary : Color.surfaceSecondary)
       .cornerRadius(12)
     }
   }
   ```

3. Filter plans by selected date
4. Animate transitions between dates

**Files to Modify:**
```
ios-app/Litplan/Views/CityDetailsView.swift
ios-app/Litplan/Components/WeekSelectorView.swift (new)
```

---

### Sprint 25: Integration & Testing (QA)
**Duration: 2 days**

**Tasks:**
1. End-to-end testing of AI pipeline:
   - Generate plans for 5 test cities
   - Verify QA agents catch low-quality plans
   - Confirm database storage
   - Test daily refresh job

2. iOS integration testing:
   - Week selector functionality
   - Plans load for correct dates
   - Empty state for dates without plans
   - Premium gating works correctly

3. Performance testing:
   - API response times
   - AI agent execution times
   - Database query optimization

4. Cleanup:
   - Remove old Firebase Cloud Functions
   - Update documentation
   - Archive old backend code

---

## Environment Variables Required

```env
# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Claude API (for AI agents)
ANTHROPIC_API_KEY=sk-ant-...

# Google Places API (for venue verification)
GOOGLE_PLACES_API_KEY=...

# Top 100 Cities Config
TOP_CITIES_COUNT=100
PLAN_DAYS_AHEAD=30
QUALITY_THRESHOLD=80
```

---

## Database Schema Additions

```sql
-- Track AI-generated plans
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "aiGenerated" BOOLEAN DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "lastVerifiedAt" TIMESTAMP WITH TIME ZONE;

-- AI Agent logs
CREATE TABLE IF NOT EXISTS "AIAgentLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agentType" TEXT NOT NULL,  -- 'generator', 'qa-accuracy', 'qa-quality'
  "cityId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "plansGenerated" INTEGER DEFAULT 0,
  "plansApproved" INTEGER DEFAULT 0,
  "plansRejected" INTEGER DEFAULT 0,
  "executionTimeMs" INTEGER,
  "errors" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily job logs
CREATE TABLE IF NOT EXISTS "DailyRefreshLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "runDate" DATE NOT NULL,
  "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "status" TEXT NOT NULL,  -- 'running', 'completed', 'failed'
  "citiesProcessed" INTEGER DEFAULT 0,
  "plansGenerated" INTEGER DEFAULT 0,
  "plansApproved" INTEGER DEFAULT 0,
  "errors" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date-based plan queries
CREATE INDEX IF NOT EXISTS "Plan_schedule_date_idx" ON "Plan"(("schedule"->>'date'));
```

---

## Risk Mitigation

1. **Claude API Rate Limits**: Implement batching and queuing
2. **Cost Management**: Set daily API budget limits
3. **Quality Control**: Multiple QA agents prevent bad data
4. **Fallback**: Keep manual plan creation as backup
5. **Monitoring**: Log all agent activities for debugging

---

## Success Criteria

- [ ] All Express endpoints migrated to Supabase Edge Functions
- [ ] AI agents generate 50+ plans per city
- [ ] Quality gate rejects < 20% of generated plans
- [ ] Daily job runs reliably at 1am CET
- [ ] iOS week selector works for 4 weeks
- [ ] No regression in existing functionality
- [ ] Response times < 500ms for all endpoints

---

## Timeline Estimate

| Sprint | Duration | Cumulative |
|--------|----------|------------|
| Sprint 19: Edge Functions | 2-3 days | 2-3 days |
| Sprint 20: AI Infrastructure | 2-3 days | 4-6 days |
| Sprint 21: Plan Generator | 2-3 days | 6-9 days |
| Sprint 22: QA Agents | 2 days | 8-11 days |
| Sprint 23: Scheduler | 1-2 days | 9-13 days |
| Sprint 24: iOS Week Selector | 2-3 days | 11-16 days |
| Sprint 25: Testing | 2 days | 13-18 days |

**Total: ~2-3 weeks**
