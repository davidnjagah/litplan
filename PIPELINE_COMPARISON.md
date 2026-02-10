# LitPlanz AI Pipeline Comparison

This document compares the two main AI pipelines used for generating group plans in LitPlanz.

## Overview

| Aspect | Bolt Pipeline | 7-Agent Pipeline |
|--------|---------------|------------------|
| **Purpose** | On-demand custom plans for Pro users | Scheduled batch generation for all cities |
| **Trigger** | User-initiated (via app) | Monthly cron job (1st of month) |
| **AI Model** | GPT-4o | GPT-4o |
| **Venues Generated** | 3-7 (theme dependent) | 11 plans per city (3 free + 8 paid) |
| **Cities** | Any city (dynamic) | Pre-configured cities only |
| **Location** | `backend/supabase/supabase/functions/bolt-pipeline/` | `backend/supabase/supabase/functions/group-7agent-pipeline/` |

---

## Agent Comparison

| Step | Bolt Pipeline (4-5 Agents) | 7-Agent Pipeline |
|------|---------------------------|------------------|
| **Agent 1** | 🔍 **Venue Discovery** | 🔍 **Generator** |
| | Finds 3-7 highest-rated venues for theme | Creates 11 plan types (couples, friends, luxury, etc.) |
| | Theme-optimized prompts (Rooftop, Nightlife, etc.) | City-specific configs with legendary venues |
| | Uses `THEME_OPTIMIZATION` hints | Uses `DEFAULT_PLAN_TYPES` |
| **Agent 2** | 🎯 **Relevance Validator** | ✅ **Details Validator** |
| | Filters inappropriate venues (hospitals, schools) | RELAXED - Validates venues are plausible |
| | Detects duplicates and closed venues | Checks against known venue references |
| | Rejects city-name-as-venue | Keeps plans if venues are realistic |
| **Agent 3** | 🔎 **Address Validator (Google Places)** | 📍 **Address Validator** |
| | Uses Google Places API as SOURCE OF TRUTH | AI-based correction (no Google API) |
| | Rejects venues not found on Google | NEVER removes - only corrects addresses |
| | Distance check (50km from city) | Uses city coordinate ranges |
| | Business status check (closed venues) | No business status check |
| **Agent 3.5** | 🕐 **Timing Adjuster** | *(Not present)* |
| | Adjusts times to fit opening hours | - |
| | Reorders venues chronologically | - |
| | Uses Google's `openingHoursPeriods` | - |
| **Agent 4** | ✍️ **Narrative Creator** | 📝 **Description Editor** |
| | Creates immersive 1-sentence descriptions | Polishes descriptions (15-25 words) |
| | Generates catchy title & overview | Basic editing only |
| | Adjusts for fewer venues | - |
| **Agent 5** | *(Not present)* | 🚦 **Quality Gate** |
| | - | Scores plans 70-100 |
| | - | Enforces city-unique titles |
| | - | Rejects generic titles |
| **Agent 6** | *(Not present)* | ✨ **Comms Specialist** |
| | - | Rich 80-120 word descriptions |
| | - | 4+ sentence immersive copy |
| | - | Insider tips and suggestions |
| **Agent 7** | *(Not present)* | 🏷️ **Tag Generator** |
| | - | Generates bestFor audience tags |
| | - | Validates against `VALID_TAGS` list |

---

## Key Differences

| Feature | Bolt | 7-Agent |
|---------|------|---------|
| **Google Places Integration** | ✅ Yes (source of truth) | ❌ No (AI-only validation) |
| **Opening Hours Check** | ✅ Yes (from Google) | ❌ No |
| **Business Status** | ✅ Checks if closed | ❌ Not checked |
| **Description Quality** | 1 sentence per venue | 80-120 words per venue |
| **Quality Scoring** | ❌ No | ✅ 70-100 scale |
| **Audience Tags** | Basic aiTags | Full `bestFor` generation |
| **City Uniqueness** | ❌ Not enforced | ✅ Titles must be unique |

---

## Supported Themes

### Bolt Pipeline Themes
- Rooftop, Nightlife, Date Night, Bar Hopping, Live Music
- Foodie, Brunch, Jazz, Sunset, Speakeasy
- Cocktails, Comedy, Wine, Dancing, Beach
- Art, Culture, Adventure, Chill, Party
- Low Budget, Afro House, Afro Beats, Equestrian
- Excitement, Activities

### 7-Agent Pipeline Plan Types
- `free_daytime` - Free daytime adventures
- `free_sunset` - Free sunset & evening experiences
- `free_cultural` - Free cultural explorations
- `couples` - Romantic experiences
- `friend_groups` - Social adventures
- `girls_trips` - Glamorous getaways
- `girls_night_out` - Ladies night celebrations
- `boys_night_out` - Masculine adventures
- `luxury` - Premium experiences
- `family` - Family-friendly activities
- `romantic` - Romantic date experiences

---

## Improvement Opportunities

| Pipeline | Where to Improve | Benefit |
|----------|-----------------|---------|
| **Bolt** | Add Agent 6 (Comms Specialist) | Richer venue descriptions like 7-Agent |
| **Bolt** | Add quality scoring | Consistent quality control |
| **7-Agent** | Add Google Places validation (Agent 3) | Verified addresses, fewer fake venues |
| **7-Agent** | Add Agent 3.5 (Timing Adjuster) | Plans respect actual opening hours |
| **7-Agent** | Add business status checks | Filter out closed venues |
| **Both** | Unified venue database | Avoid re-validating same venues |
| **Both** | Shared description cache | Reduce AI costs for repeat venues |

---

## Pipeline Flow Diagrams

### Bolt Pipeline Flow
```
User Request (city, theme)
    ↓
Agent 1: Venue Discovery (GPT-4o)
    ↓ 3-7 venues
Agent 2: Relevance Validator (GPT-4o)
    ↓ filtered venues
Agent 3: Address Validator (Google Places API)
    ↓ verified venues
Agent 3.5: Timing Adjuster (GPT-4o)
    ↓ scheduled venues
Agent 4: Narrative Creator (GPT-4o)
    ↓
Store in Database → Return to User
```

### 7-Agent Pipeline Flow
```
Monthly Cron Trigger (1st of month)
    ↓
For each city:
    ↓
Agent 1: Generator (GPT-4o) - 11 plan types
    ↓
Agent 2: Details Validator (GPT-4o) - relaxed
    ↓
Agent 3: Address Validator (GPT-4o) - correct only
    ↓
Agent 4: Description Editor (GPT-4o)
    ↓
Agent 5: Quality Gate (GPT-4o) - score 70-100
    ↓
Agent 6: Comms Specialist (GPT-4o) - rich descriptions
    ↓
Agent 7: Tag Generator (GPT-4o) - bestFor tags
    ↓
Store in Database
```

---

## Cost Estimates

| Pipeline | Frequency | Estimated Cost |
|----------|-----------|----------------|
| **Bolt** | Per user request | ~$0.05-0.15 per plan |
| **7-Agent** | Monthly (100 cities) | ~$130/month |

---

## Summary

- **Bolt Pipeline** is more accurate (Google Places) but has simpler descriptions
- **7-Agent Pipeline** has richer content but weaker venue verification
- **Best improvement path**: Add Google Places to 7-Agent, add Comms Specialist to Bolt
