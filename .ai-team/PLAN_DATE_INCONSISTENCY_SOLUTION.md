# Plan Date Inconsistency - Solution Document

**Date:** January 5, 2026
**Priority:** Critical
**Status:** Ready for Implementation

---

## Executive Summary

Plans are displaying under wrong days in the city screen (e.g., shown under Saturday section but details show Sunday). This document provides a comprehensive analysis and fixes identified by two independent code analysts.

---

## Root Causes Identified

### 1. Dual Representation Problem (iOS)
The system stores both an ISO `date` string AND a separate `dayOfWeek` string without ensuring synchronization.

### 2. Field Naming Mismatch (Backend ↔ iOS)
- **Database field:** `weekday`
- **iOS expects:** `dayOfWeek`

### 3. Timezone-Naive Date Parsing
Date parsing uses local timezone instead of UTC, causing off-by-one-day errors.

### 4. dayOfWeek Not Derived from Date
For venues (non-events), `dayOfWeek` is set from `bestNights` without validating against the actual `date`.

### 5. Missing API Transformation
Backend returns flat Prisma fields, but iOS expects nested `schedule` object.

---

## Affected Files

### iOS App
| File | Issue |
|------|-------|
| `Litplan/Services/MockDataService.swift:1396-1397` | Hardcoded date/dayOfWeek mismatch |
| `Litplan/Models/Plan.swift:143-152` | Timezone-insensitive formattedDate |
| `Litplan/Models/Plan.swift:253-259` | Sample data inconsistency |

### Backend
| File | Issue |
|------|-------|
| `_shared/plan-schema.ts:207-209` | `isWeekend()` excludes Friday |
| `weekly-plan-refresh/index.ts:440-444` | dayOfWeek not derived from date |
| `weekly-plan-refresh/index.ts:463` | Venues have null date |
| `plans/index.ts:71,76,81` | Queries `schedule->date` on flat column |

---

## Implementation Plan

### Phase 1: iOS Fixes (Immediate)

#### Fix 1.1: Add Computed dayOfWeek Property
**File:** `Litplan/Models/Plan.swift`

Add after line 90:
```swift
/// Computed day of week derived from the actual ISO date (single source of truth)
var computedDayOfWeek: String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
    guard let date = formatter.date(from: schedule.date) else {
        return schedule.dayOfWeek  // Fallback to stored value
    }
    let dayFormatter = DateFormatter()
    dayFormatter.dateFormat = "EEEE"
    dayFormatter.timeZone = TimeZone(identifier: "UTC")
    return dayFormatter.string(from: date)
}
```

#### Fix 1.2: Update formattedDate to Use UTC
**File:** `Litplan/Models/Plan.swift`

Replace lines 143-152:
```swift
var formattedDate: String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
    guard let date = formatter.date(from: schedule.date) else {
        return schedule.dayOfWeek
    }
    let displayFormatter = DateFormatter()
    displayFormatter.dateFormat = "EEEE, MMM d"
    displayFormatter.timeZone = TimeZone(identifier: "UTC")  // ADD THIS LINE
    return displayFormatter.string(from: date)
}
```

#### Fix 1.3: Update WeekendPlansSection to Use computedDayOfWeek
**File:** `Litplan/Components/WeekendPlansSection.swift`

Change line 32:
```swift
// FROM:
let dayPlans = plans.filter { $0.schedule.dayOfWeek == day }

// TO:
let dayPlans = plans.filter { $0.computedDayOfWeek == day }
```

#### Fix 1.4: Update CityDetailsView to Use computedDayOfWeek
**File:** `Litplan/Views/CityDetailsView.swift`

Change line 410:
```swift
// FROM:
let dayPlans = weekdayPlans.filter { $0.schedule.dayOfWeek == day }

// TO:
let dayPlans = weekdayPlans.filter { $0.computedDayOfWeek == day }
```

#### Fix 1.5: Fix MockDataService Sample Data
**File:** `Litplan/Services/MockDataService.swift`

Replace lines 1396-1397 with proper date calculation:
```swift
// Calculate actual dates for current week
private func createPlan(...) -> Plan {
    let calendar = Calendar.current
    let today = Date()

    // Calculate date for the target day
    let targetWeekday = isWeekend ? 7 : 6  // Saturday or Friday
    var components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)
    components.weekday = targetWeekday
    let targetDate = calendar.date(from: components) ?? today

    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime, .withTimeZone]
    let dateString = isoFormatter.string(from: targetDate)

    let dayFormatter = DateFormatter()
    dayFormatter.dateFormat = "EEEE"
    dayFormatter.timeZone = TimeZone(identifier: "UTC")
    let dayOfWeek = dayFormatter.string(from: targetDate)

    // Use these derived values in the Plan.Schedule
}
```

---

### Phase 2: Backend Fixes

#### Fix 2.1: Update isWeekend() to Include Friday
**File:** `_shared/plan-schema.ts`

```typescript
export function isWeekend(dayOfWeek: string): boolean {
  // Friday is weekend for nightlife purposes
  return ['Friday', 'Saturday', 'Sunday'].includes(dayOfWeek);
}
```

#### Fix 2.2: Use UTC for Date Calculations
**File:** `weekly-plan-refresh/index.ts` and `daily-plan-refresh/index.ts`

```typescript
function getDayOfWeek(dateStr: string): string {
  // Use UTC to avoid timezone issues
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];  // Use getUTCDay() not getDay()
}
```

#### Fix 2.3: Always Derive dayOfWeek from Date
**File:** `weekly-plan-refresh/index.ts`

Replace lines 440-444:
```typescript
// ALWAYS derive dayOfWeek from the actual date
const planDate = isEvent ? item.eventDate : calculateVenueDate(item, weekInfo);
const dayOfWeek = getDayOfWeek(planDate);
const isWeekendPlan = isWeekend(dayOfWeek);
```

#### Fix 2.4: Ensure Venues Have Dates
**File:** `weekly-plan-refresh/index.ts`

Add helper function:
```typescript
function calculateVenueDate(item: any, weekInfo: WeekInfo): string {
  const bestDay = item.schedule?.bestNights?.[0] || 'Saturday';
  const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(bestDay);

  const startDate = new Date(weekInfo.weekStartDate + 'T12:00:00Z');
  const daysUntilTarget = (dayIndex - startDate.getUTCDay() + 7) % 7;
  const targetDate = new Date(startDate.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);

  return targetDate.toISOString().split('T')[0];
}
```

#### Fix 2.5: Fix Plans API Query
**File:** `plans/index.ts`

Change lines 71, 76, 81:
```typescript
// FROM:
.order('schedule->date', { ascending: true })

// TO:
.order('date', { ascending: true })
```

---

### Phase 3: Data Migration

Run this script to fix existing plans in database:

```typescript
// scripts/fix-plan-dates.ts
async function fixPlanDates() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: plans } = await supabase
    .from('Plan')
    .select('id, date, weekday, eventDate')
    .not('date', 'is', null);

  for (const plan of plans || []) {
    const dateToUse = plan.date || plan.eventDate;
    if (!dateToUse) continue;

    const correctDay = getDayOfWeekUTC(dateToUse);
    if (plan.weekday !== correctDay) {
      console.log(`Fixing ${plan.id}: ${plan.weekday} -> ${correctDay}`);
      await supabase
        .from('Plan')
        .update({
          weekday: correctDay,
          isWeekend: ['Friday', 'Saturday', 'Sunday'].includes(correctDay)
        })
        .eq('id', plan.id);
    }
  }
}

function getDayOfWeekUTC(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Test that `computedDayOfWeek` matches `formattedDate` for all plans
- [ ] Test that `isWeekend()` returns true for Friday, Saturday, Sunday
- [ ] Test date parsing with various timezones

### Integration Tests
- [ ] Verify plans appear under correct day headers in city screen
- [ ] Verify plan details show same day as list header
- [ ] Test across different device timezones (UTC, EST, PST, Tokyo, Sydney)

### Manual QA
- [ ] Open city plans screen
- [ ] Note day section for each plan
- [ ] Tap each plan and verify Date matches section header
- [ ] Repeat for weekend and weekday plans

---

## Implementation Order

1. **iOS Fix 1.2** (formattedDate UTC) - Prevents new mismatches in display
2. **iOS Fix 1.1** (computedDayOfWeek) - Add single source of truth
3. **iOS Fix 1.3 & 1.4** (Use computedDayOfWeek) - Fix filtering
4. **Backend Fix 2.1** (isWeekend Friday) - Consistency
5. **Backend Fix 2.2 & 2.3** (UTC and derive) - Fix generation
6. **Backend Fix 2.4** (venue dates) - Complete data
7. **Backend Fix 2.5** (API queries) - Fix queries
8. **Phase 3** (Data migration) - Fix existing data
9. **iOS Fix 1.5** (MockDataService) - Fix test data

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing plans | Data migration script validates before updating |
| Timezone regressions | All fixes use explicit UTC |
| API changes breaking iOS | iOS uses `computedDayOfWeek` which works with current AND fixed data |

---

## Sign-off Required

- [ ] iOS Engineer
- [ ] Backend Engineer
- [ ] QA Tester
- [ ] Product Manager

---

*Document generated by AI Code Analysts - January 5, 2026*
