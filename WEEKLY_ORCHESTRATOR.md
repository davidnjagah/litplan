# Weekly Orchestrator - AI Pipeline Documentation

> **Primary Location:** `backend/railway/src/index.ts`
> **Railway URL:** `https://litplan-production.up.railway.app`
> **URL Config:** `RAILWAY_URL` in `backend/supabase/.env`
> **Last Updated:** January 2026

---

## Weekly Pipeline Flow - Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAILWAY SERVICE                                    │
│                    (Primary Orchestrator - No Timeout)                       │
│                     backend/railway/src/index.ts                             │
│                                                                              │
│   Endpoints:                                                                 │
│   • POST /api/pipeline/individual  → Individual plans                        │
│   • POST /api/pipeline/group       → Group plans                             │
│   • POST /api/pipeline/full        → Both pipelines                          │
│   • POST /api/pipeline/batch       → Multiple cities                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP calls to Supabase
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE EDGE FUNCTIONS                                 │
│                    (Individual Agent Execution)                              │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                              │
          │                                              │
          ▼                                              ▼
┌─────────────────────────┐                ┌─────────────────────────────────┐
│    INDIVIDUAL PLANS     │                │         GROUP PLANS              │
│                         │                │                                  │
│  search-agent           │                │  group-7agent-pipeline           │
│  (Claude API)           │                │  (GPT-4o API)                    │
│                         │                │                                  │
│  • Finds real venues    │                │  7 Agents in sequence:           │
│  • Discovers events     │                │  1. Generator (9 plan types)     │
│  • Validates locations  │                │  2. Details Validator            │
│                         │                │  3. Address Validator            │
└─────────────────────────┘                │  4. Description Editor           │
          │                                │  5. Quality Gate                 │
          │                                │  6. Comms Specialist             │
          │                                │  7. Tag Generator                │
          │                                └─────────────────────────────────┘
          │                                              │
          │                                              │
          ▼                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                                    │
│                      (PostgreSQL - Data Storage)                             │
│                                                                              │
│   Tables:                                                                    │
│   • Plan          → Individual venues/events                                 │
│   • GroupFlow     → Group plan metadata                                      │
│   • GroupFlowStep → Activities within group plans                            │
│   • City          → City configurations                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Flow for Full Pipeline

```
User/Cron triggers Railway
         │
         ▼
┌────────────────────────────────────────┐
│  RAILWAY: /api/pipeline/full           │
│  (No timeout - runs for minutes)       │
└────────────────────────────────────────┘
         │
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────────┐              ┌──────────────────────────────┐
│  PHASE 1: Individual │              │  PHASE 2: Group Plans        │
└─────────────────────┘              └──────────────────────────────┘
         │                                          │
         ▼                                          ▼
┌─────────────────────┐              ┌──────────────────────────────┐
│  Supabase:          │              │  Supabase:                   │
│  search-agent       │              │  group-7agent-pipeline        │
│                     │              │                              │
│  ┌───────────────┐  │              │  ┌────────────────────────┐  │
│  │  Claude API   │  │              │  │      GPT-4o API        │  │
│  │  (Anthropic)  │  │              │  │      (OpenAI)          │  │
│  └───────────────┘  │              │  └────────────────────────┘  │
│                     │              │                              │
│  Generates:         │              │  Generates 9 plan types:     │
│  • 30-50 venues     │              │  • couples                   │
│  • 10-20 events     │              │  • friend_groups             │
│                     │              │  • girls_trips               │
│                     │              │  • girls_night_out           │
│                     │              │  • boys_night_out            │
│                     │              │  • luxury                    │
│                     │              │  • family                    │
│                     │              │  • free_experiences          │
│                     │              │  • romantic                  │
└─────────────────────┘              └──────────────────────────────┘
         │                                          │
         │                                          │
         ▼                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
│                                                                  │
│  Plan table:              │  GroupFlow + GroupFlowStep tables:   │
│  • Individual venues      │  • Multi-venue itineraries           │
│  • Weekly events          │  • 3 activities per plan             │
│  • Day distribution       │  • Estimated costs, duration         │
└─────────────────────────────────────────────────────────────────┘
```

## Platform Summary

| Platform | Role | Timeout |
|----------|------|---------|
| **Railway** | Primary orchestrator, coordinates everything | None (unlimited) |
| **Supabase Edge Functions** | Individual agent execution | 60 seconds each |
| **Claude API (Anthropic)** | Individual plan generation (search-agent) | - |
| **GPT-4o API (OpenAI)** | Group plan generation (7-agent pipeline) | - |
| **Supabase PostgreSQL** | Data storage | - |

## Why This Architecture?

1. **Railway** handles long-running orchestration (can run for 5+ minutes)
2. **Supabase Edge Functions** handle individual AI calls (each under 60s)
3. **Split AI providers**: Claude for search/discovery, GPT for creative group plans
4. **Single database**: All data stored in Supabase PostgreSQL

---

## Complete End-to-End Pipeline Process

```
══════════════════════════════════════════════════════════════════════════════
                         LITPLAN AI PIPELINE - FULL PROCESS
══════════════════════════════════════════════════════════════════════════════


┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: TRIGGER                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

   How the pipeline starts:

   Option A: Manual trigger via API
   ┌────────────────────────────────────────────────────────────────────────┐
   │  curl -X POST https://railway-url/api/pipeline/full \                  │
   │    -d '{ "cityName": "Dar es Salaam", "country": "Tanzania" }'         │
   └────────────────────────────────────────────────────────────────────────┘

   Option B: Scheduled cron job (weekly refresh)
   ┌────────────────────────────────────────────────────────────────────────┐
   │  Every Sunday at midnight → triggers batch pipeline for all cities     │
   └────────────────────────────────────────────────────────────────────────┘



┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: RAILWAY ORCHESTRATOR RECEIVES REQUEST                              │
└─────────────────────────────────────────────────────────────────────────────┘

   Location: backend/railway/src/index.ts

   ┌────────────────────────────────────────────────────────────────────────┐
   │  Railway Service (Node.js/Express)                                     │
   │                                                                        │
   │  • Receives: { cityName: "Dar es Salaam", country: "Tanzania" }        │
   │  • Calculates: weekStartDate, weekEndDate, yearWeek (e.g., "2026-W02") │
   │  • Decides: Run Phase 1 (Individual) then Phase 2 (Group)              │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼


┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: PHASE 1 - INDIVIDUAL PLANS (Claude AI)                             │
└─────────────────────────────────────────────────────────────────────────────┘

   Railway calls → Supabase Edge Function: search-agent

   ┌────────────────────────────────────────────────────────────────────────┐
   │  search-agent (Claude 3.5 Sonnet)                                      │
   │                                                                        │
   │  INPUT:                                                                │
   │  • City: Dar es Salaam, Tanzania                                       │
   │  • Week: Jan 6-12, 2026                                                │
   │                                                                        │
   │  CLAUDE SEARCHES FOR:                                                  │
   │  ┌──────────────────────────────────────────────────────────────────┐  │
   │  │  "Find me real nightlife venues, restaurants, bars, clubs,       │  │
   │  │   cultural spots, family activities, and events happening        │  │
   │  │   in Dar es Salaam this week. Include real addresses,            │  │
   │  │   coordinates, opening hours, and price ranges."                 │  │
   │  └──────────────────────────────────────────────────────────────────┘  │
   │                                                                        │
   │  CLAUDE RETURNS:                                                       │
   │  • 30-50 venues (bars, clubs, restaurants, cultural spots)             │
   │  • 10-20 events (concerts, festivals, special nights)                  │
   │  • Each with: name, address, coordinates, description, category,       │
   │               price range, best nights, opening hours                  │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │  DAY DISTRIBUTION APPLIED                                              │
   │                                                                        │
   │  • Nightclubs → Friday & Saturday ONLY                                 │
   │  • Family activities → Saturday & Sunday                               │
   │  • Restaurants → Spread across Mon-Thu                                 │
   │  • Rooftop bars → Thursday-Saturday                                    │
   │  • Free experiences → Any day, prefer weekends                         │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │  STORED IN DATABASE: Plan table                                        │
   │                                                                        │
   │  Example records:                                                      │
   │  ┌────────────────────────────────────────────────────────────────┐    │
   │  │ id: "plan-dar-001"                                             │    │
   │  │ title: "Sunset Cocktails at Karambezi Cafe"                    │    │
   │  │ venueName: "Karambezi Cafe"                                    │    │
   │  │ address: "Sea Cliff Hotel, Toure Drive, Msasani"               │    │
   │  │ category: "cocktail_bar"                                       │    │
   │  │ weekday: "Friday"                                              │    │
   │  │ priceRange: "$$$"                                              │    │
   │  │ latitude: -6.7478, longitude: 39.2894                          │    │
   │  │ description: "Iconic oceanfront bar with stunning sunset..."   │    │
   │  └────────────────────────────────────────────────────────────────┘    │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼


┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: PHASE 2 - GROUP PLANS (GPT-4o 7-Agent Pipeline)                    │
└─────────────────────────────────────────────────────────────────────────────┘

   Railway calls → Supabase Edge Function: group-7agent-pipeline

   ═══════════════════════════════════════════════════════════════════════════
   AGENT 1: GENERATOR
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GPT-4o generates 9 group plans (multi-venue itineraries):             │
   │                                                                        │
   │  1. COUPLES      → "Romantic Swahili Sunset" (3 intimate venues)       │
   │  2. FRIEND_GROUPS → "Dar After Dark" (3 social hotspots)               │
   │  3. GIRLS_TRIPS  → "Coastal Glam Experience" (3 chic spots)            │
   │  4. GIRLS_NIGHT_OUT → "Msasani Ladies Night" (3 dance venues)          │
   │  5. BOYS_NIGHT_OUT → "Dar VIP Experience" (3 high-energy clubs)        │
   │  6. LUXURY       → "Five-Star Dar" (3 premium venues)                  │
   │  7. FAMILY       → "Dar Family Adventure" (3 kid-friendly spots)       │
   │  8. FREE_EXPERIENCES → "Free Dar Discovery" (3 no-cost activities)     │
   │  9. ROMANTIC     → "Ocean Romance" (3 date night venues)               │
   │                                                                        │
   │  Each plan includes:                                                   │
   │  • 3 activities with venue names, addresses, coordinates               │
   │  • Start times and durations                                           │
   │  • Estimated costs                                                     │
   │  • Difficulty level (easy/moderate/challenging)                        │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ═══════════════════════════════════════════════════════════════════════════
   AGENT 2: DETAILS VALIDATOR
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GPT-4o validates each venue exists:                                   │
   │                                                                        │
   │  • Checks: "Does Karambezi Cafe really exist at Sea Cliff Hotel?"      │
   │  • Verifies: Coordinates are within Dar es Salaam bounds               │
   │  • Action: KEEP valid plans, REMOVE plans with fake venues             │
   │                                                                        │
   │  Result: 9 plans → 8 plans (1 removed for fake venue)                  │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ═══════════════════════════════════════════════════════════════════════════
   AGENT 3: ADDRESS VALIDATOR
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GPT-4o triple-checks all addresses:                                   │
   │                                                                        │
   │  • Corrects: "Sea Cliff Hotel" → "Sea Cliff Hotel, Toure Drive, Msasani│
   │  • Fixes: Wrong postal codes                                           │
   │  • Updates: Precise GPS coordinates                                    │
   │  • Action: CORRECT fixable addresses, REMOVE unfixable                 │
   │                                                                        │
   │  Result: 8 plans → 8 plans (2 addresses corrected)                     │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ═══════════════════════════════════════════════════════════════════════════
   AGENT 4: DESCRIPTION EDITOR
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GPT-4o polishes all descriptions:                                     │
   │                                                                        │
   │  BEFORE: "A bar with nice views"                                       │
   │  AFTER:  "Sunset cocktails at iconic Karambezi with stunning           │
   │           Indian Ocean views and fresh seafood."                       │
   │                                                                        │
   │  • Makes descriptions 15-25 words                                      │
   │  • Adds sensory language                                               │
   │  • Highlights unique features                                          │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ═══════════════════════════════════════════════════════════════════════════
   AGENT 5: QUALITY GATE
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GPT-4o scores each plan and ensures unique titles:                    │
   │                                                                        │
   │  REJECTS generic titles:                                               │
   │  ✗ "Couples Night Out" → Too generic                                   │
   │  ✗ "Fun With Friends" → Not city-specific                              │
   │                                                                        │
   │  ACCEPTS city-unique titles:                                           │
   │  ✓ "Swahili Sunset Romance" → Unique to Dar                            │
   │  ✓ "Msasani Midnight Adventure" → References local area                │
   │                                                                        │
   │  Scoring: 0-100                                                        │
   │  • 90-100: Exceptional                                                 │
   │  • 80-89: Good                                                         │
   │  • 70-79: Acceptable                                                   │
   │  • Below 70: REJECTED                                                  │
   │                                                                        │
   │  Result: 8 plans → 7 plans (1 rejected for score 65)                   │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ═══════════════════════════════════════════════════════════════════════════
   AGENT 6: COMMS SPECIALIST
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GPT-4o crafts captivating marketing copy:                             │
   │                                                                        │
   │  PLAN DESCRIPTION (max 25 words, 2 sentences):                         │
   │  "Experience the magic of Dar es Salaam's coastline at sunset.         │
   │   Three intimate venues perfect for romance."                          │
   │                                                                        │
   │  VENUE DESCRIPTIONS (10-15 words each):                                │
   │  • "Sunset cocktails at iconic Karambezi with panoramic ocean views."  │
   │  • "Fresh seafood at Samaki Samaki with live Taarab music."            │
   │  • "Rooftop nightcaps at Level 8 overlooking the harbor lights."       │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
   ═══════════════════════════════════════════════════════════════════════════
   AGENT 7: TAG GENERATOR
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GPT-4o assigns audience tags (bestFor):                               │
   │                                                                        │
   │  Analyzes each plan and assigns up to 5 tags:                          │
   │                                                                        │
   │  "Swahili Sunset Romance":                                             │
   │  → tags: ["couples", "romantic", "date_night", "anniversary"]          │
   │  → primaryTag: "romantic"                                              │
   │                                                                        │
   │  "Dar Family Adventure":                                               │
   │  → tags: ["family_friendly", "kids", "all_ages", "outdoor", "daytime"] │
   │  → primaryTag: "family_friendly"                                       │
   │                                                                        │
   │  Available tags: couples, romantic, friends, party, luxury, vip,       │
   │  family_friendly, kids, free, budget_friendly, instagram_worthy, etc.  │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼


┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: STORE GROUP PLANS IN DATABASE                                      │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────────────────────────────┐
   │  GroupFlow table (the plan itself):                                    │
   │  ┌──────────────────────────────────────────────────────────────────┐  │
   │  │ id: "gf-dar-7agent-001"                                          │  │
   │  │ cityId: "dar-es-salaam-tz"                                       │  │
   │  │ title: "Swahili Sunset Romance"                                  │  │
   │  │ description: "Experience the magic of Dar's coastline..."        │  │
   │  │ totalHours: 5                                                    │  │
   │  │ totalEstimate: 150 (USD)                                         │  │
   │  │ difficulty: "moderate"                                           │  │
   │  │ theme: "romantic"                                                │  │
   │  │ isWeekend: true                                                  │  │
   │  │ proOnly: false                                                   │  │
   │  └──────────────────────────────────────────────────────────────────┘  │
   │                                                                        │
   │  GroupFlowStep table (the activities within):                          │
   │  ┌──────────────────────────────────────────────────────────────────┐  │
   │  │ Step 1: Karambezi Cafe      │ 18:00 │ 90 min │ Sunset cocktails  │  │
   │  │ Step 2: Samaki Samaki       │ 20:00 │ 120 min│ Seafood dinner    │  │
   │  │ Step 3: Level 8 Rooftop     │ 22:30 │ 90 min │ Nightcaps         │  │
   │  └──────────────────────────────────────────────────────────────────┘  │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼


┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: RAILWAY RETURNS RESULTS                                            │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────────────────────────────┐
   │  Response to API caller:                                               │
   │                                                                        │
   │  {                                                                     │
   │    "success": true,                                                    │
   │    "cityName": "Dar es Salaam",                                        │
   │    "data": {                                                           │
   │      "individual": {                                                   │
   │        "venuesStored": 42,                                             │
   │        "eventsStored": 15                                              │
   │      },                                                                │
   │      "group": {                                                        │
   │        "totalGenerated": 9,                                            │
   │        "totalApproved": 7,                                             │
   │        "totalStored": 7,                                               │
   │        "averageScore": 87                                              │
   │      }                                                                 │
   │    },                                                                  │
   │    "durationMs": 145000  // ~2.5 minutes                               │
   │  }                                                                     │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼


┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: iOS APP FETCHES DATA                                               │
└─────────────────────────────────────────────────────────────────────────────┘

   User opens Litplan app → Selects "Dar es Salaam"

   ┌────────────────────────────────────────────────────────────────────────┐
   │  iOS App calls Supabase API:                                           │
   │                                                                        │
   │  GET /plans?cityId=dar-es-salaam-tz                                    │
   │  → Returns 42 individual venues + 15 events                            │
   │                                                                        │
   │  GET /group-flows?cityId=dar-es-salaam-tz                              │
   │  → Returns 7 group plans with activities                               │
   └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼


┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 8: USER SEES CONTENT                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────────────────────────────┐
   │                                                                        │
   │   ┌─────────────────────────────────────────────────────────────────┐  │
   │   │  HomeView (Explore Tab)                                         │  │
   │   │                                                                 │  │
   │   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │  │
   │   │  │ Dar es Salaam   │  │ Nairobi         │  │ Cape Town       │  │  │
   │   │  │    42 venues    │  │    38 venues    │  │    45 venues    │  │  │
   │   │  │ 7 group plans   │  │ 8 group plans   │  │ 9 group plans   │  │  │
   │   │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │  │
   │   └─────────────────────────────────────────────────────────────────┘  │
   │                                                                        │
   │   User taps "Dar es Salaam" →                                          │
   │                                                                        │
   │   ┌─────────────────────────────────────────────────────────────────┐  │
   │   │  CityDetailsView                                                │  │
   │   │                                                                 │  │
   │   │  GROUP PLANS:                                                   │  │
   │   │  ┌─────────────────────────────────────────────────────────┐    │  │
   │   │  │ Swahili Sunset Romance                                  │    │  │
   │   │  │    Karambezi → Samaki Samaki → Level 8                  │    │  │
   │   │  │    5 hours • $150 • For: Couples, Date Night            │    │  │
   │   │  └─────────────────────────────────────────────────────────┘    │  │
   │   │  ┌─────────────────────────────────────────────────────────┐    │  │
   │   │  │ Dar Family Adventure                                    │    │  │
   │   │  │    Slipway → Coco Beach → Village Museum                │    │  │
   │   │  │    4 hours • $40 • For: Families, Kids                  │    │  │
   │   │  └─────────────────────────────────────────────────────────┘    │  │
   │   │                                                                 │  │
   │   │  INDIVIDUAL PLANS:                                              │  │
   │   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
   │   │  │Karambezi │ │Level 8   │ │Havoc     │ │Q-Bar     │           │  │
   │   │  │Cafe      │ │Rooftop   │ │Nightspot │ │Live Music│           │  │
   │   │  │Friday    │ │Saturday  │ │Saturday  │ │Thursday  │           │  │
   │   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │  │
   │   └─────────────────────────────────────────────────────────────────┘  │
   │                                                                        │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Pipeline Summary

### Platforms Involved

| Platform | Role | Timeout |
|----------|------|---------|
| **Railway** | Orchestrator - coordinates everything, no timeout | Unlimited |
| **Supabase Edge** | search-agent (Claude) + group-7agent-pipeline (GPT) | 60s each |
| **Claude API** | Finds real venues and events (individual plans) | - |
| **GPT-4o API** | Creates and validates group plans (7-agent pipeline) | - |
| **Supabase DB** | Stores all plans (PostgreSQL) | - |
| **iOS App** | Fetches and displays plans to users | - |

### Data Created Per City

| Type | Count | Description |
|------|-------|-------------|
| Individual venues | 30-50 | Bars, clubs, restaurants, cultural spots |
| Weekly events | 10-20 | Concerts, special nights, festivals |
| Group plans | 7-9 | Curated multi-venue itineraries |
| Group activities | 21-27 | 3 per group plan |

### Timing

| Phase | Duration |
|-------|----------|
| Phase 1 (Individual) | ~30-60 seconds |
| Phase 2 (Group) | ~90-180 seconds (7 agents) |
| **Total per city** | **~2-4 minutes** |

---

## Default Plan Types (9 Types)

1. **couples** - Romantic experiences for two
2. **friend_groups** - Social adventures for groups
3. **girls_trips** - Glamorous getaways
4. **girls_night_out** - Ladies night celebrations
5. **boys_night_out** - High-energy VIP experiences
6. **luxury** - Premium five-star experiences
7. **family** - Kid-friendly excursions
8. **free_experiences** - No-cost activities
9. **romantic** - Candlelit dinners and sunset spots

---

## Day Distribution Rules

| Category | Assigned Days |
|----------|---------------|
| Nightclubs/Dance Clubs | Friday & Saturday ONLY |
| Family activities | Saturday & Sunday |
| Cultural activities | Saturday & Sunday |
| Restaurants | Mon-Thu (spread evenly) |
| Rooftop/Cocktail bars | Thursday-Saturday |
| Luxury experiences | Thursday-Saturday |
| Free experiences | Any day, prefer weekends |
| Romantic | Friday & Saturday |

---

## Supported Cities

| City | Country | Currency |
|------|---------|----------|
| Ibiza | Spain | EUR |
| Paris | France | EUR |
| Nairobi | Kenya | KES |
| Dar es Salaam | Tanzania | TZS |
| Cape Town | South Africa | ZAR |
| Lagos | Nigeria | NGN |
| New York | United States | USD |
| Los Angeles | United States | USD |
| Miami | United States | USD |
| London | United Kingdom | GBP |
| Madrid | Spain | EUR |
| Barcelona | Spain | EUR |
| Berlin | Germany | EUR |
| Tokyo | Japan | JPY |
| Amsterdam | Netherlands | EUR |

---

## How to Run the Pipeline

### Health Check
```bash
curl https://litplan-production.up.railway.app/health
```

### Generate Individual Plans
```bash
curl -X POST https://litplan-production.up.railway.app/api/pipeline/individual \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "dar-es-salaam-tz",
    "cityName": "Dar es Salaam",
    "country": "Tanzania"
  }'
```

### Generate Group Plans
```bash
curl -X POST https://litplan-production.up.railway.app/api/pipeline/group \
  -H "Content-Type: application/json" \
  -d '{
    "cityName": "Dar es Salaam",
    "country": "Tanzania"
  }'
```

### Run Full Pipeline
```bash
curl -X POST https://litplan-production.up.railway.app/api/pipeline/full \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "dar-es-salaam-tz",
    "cityName": "Dar es Salaam",
    "country": "Tanzania"
  }'
```

### Batch Process Multiple Cities
```bash
curl -X POST https://litplan-production.up.railway.app/api/pipeline/batch \
  -H "Content-Type: application/json" \
  -d '{
    "cities": [
      { "cityId": "nairobi-ke", "cityName": "Nairobi", "country": "Kenya" },
      { "cityId": "dar-es-salaam-tz", "cityName": "Dar es Salaam", "country": "Tanzania" }
    ]
  }'
```

---

## Important Notes

1. **Railway is the PRIMARY orchestrator** - All pipeline operations should go through Railway
2. **Supabase Edge Functions are DEPRECATED for orchestration** - They are only used as individual agents called by Railway
3. **60-second timeout** - Each Supabase Edge Function has a 60s limit, which is why Railway coordinates them
4. **Two AI providers** - Claude for discovery/search, GPT-4o for creative generation

---

## File Locations

| Component | Location |
|-----------|----------|
| Railway Orchestrator | `backend/railway/src/index.ts` |
| Search Agent (Claude) | `backend/supabase/supabase/functions/ai-agents/search-agent/` |
| 7-Agent Pipeline (GPT) | `backend/supabase/supabase/functions/group-7agent-pipeline/` |
| Prompt Templates | `backend/supabase/supabase/functions/ai-agents/*/prompts.ts` |
| iOS App | `ios-app/Litplan/` |

---

**Last Updated:** January 2026
