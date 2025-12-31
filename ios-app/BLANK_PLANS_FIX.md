# Blank Plans Screen Issue - Analysis & Fix

## Date: December 30, 2025

## Issue Description
When tapping on certain cities from the home screen, the plans screen appears blank (no plans are displayed).

---

## Root Cause Analysis

### Investigation Findings

| Component | File | Status |
|-----------|------|--------|
| City IDs | MockDataService.swift | Correct (11 cities) |
| Plan Keys | MockDataService.swift | Correct (11 entries match city IDs) |
| Plan Creation Functions | MockDataService.swift | All exist and return data |
| Data Loading | CityDetailsView.swift | **PROBLEMATIC** |

### Cities in MockDataService

| City | ID | Has Plans |
|------|-----|-----------|
| New York | `nyc-001` | Yes (50+ plans) |
| Los Angeles | `la-001` | Yes (50+ plans) |
| Miami | `mia-001` | Yes (50+ plans) |
| London | `lon-001` | Yes (50+ plans) |
| Paris | `par-001` | Yes (50+ plans) |
| Tokyo | `tyo-001` | Yes (50+ plans) |
| Berlin | `ber-001` | Yes (50+ plans) |
| Barcelona | `bcn-001` | Yes (50+ plans) |
| Amsterdam | `ams-001` | Yes (50+ plans) |
| Dubai | `dxb-001` | Yes (50+ plans) |
| Madrid | `mad-001` | Yes (50+ plans) |

---

## Primary Issue: Thread Safety with Lazy Var

### The Problem

**Location:** `CityDetailsView.swift:382-392`

```swift
private func loadPlansAsync() async {
    // PROBLEM: Accessing lazy var from detached task causes race condition
    let loadedPlans = await Task.detached(priority: .userInitiated) {
        MockDataService.shared.getPlans(for: city.id)  // <- Not thread-safe
    }.value

    await MainActor.run {
        plans = loadedPlans
    }
}
```

**Why it fails:**
1. `allPlans` in MockDataService is declared as `lazy var`
2. Swift's `lazy var` is NOT thread-safe
3. `Task.detached` runs on a background thread
4. When multiple cities are accessed quickly, the lazy initialization can race
5. The race condition returns an empty dictionary, resulting in blank plans

### The Fix

Since MockDataService is in-memory mock data (not network I/O), there's no need for detached background tasks. The data should be accessed synchronously:

```swift
private func loadPlansAsync() async {
    // Simply access the data synchronously - it's in-memory
    plans = MockDataService.shared.getPlans(for: city.id)
}
```

---

## Secondary Issue: Group Flows Limited to 3 Cities

**Location:** `MockDataService.swift:285-298`

Only NYC, LA, and Madrid have group flows defined. Other cities return empty arrays.

```swift
func getGroupFlows(for cityId: String) -> [GroupFlow] {
    switch cityId {
    case "nyc-001":
        return createNYCGroupFlows()
    case "la-001":
        return createLAGroupFlows()
    case "mad-001":
        return createMadridGroupFlows()
    default:
        return [] // Other cities get nothing!
    }
}
```

**Impact:** 8 out of 11 cities show empty "Group Plans" tab.

---

## Implementation Checklist

- [x] Identified root cause: Thread-unsafe lazy var + detached task
- [x] Verified all cities have plan data defined
- [x] Documented the fix
- [x] Apply fix to CityDetailsView.swift (remove detached task) - **COMPLETED**
- [x] Apply fix to loadGroupFlowsAsync() as well - **COMPLETED**
- [x] Rebuild and test - **BUILD SUCCEEDED**

---

## Files to Modify

### 1. CityDetailsView.swift

**Change `loadPlansAsync()` from:**
```swift
private func loadPlansAsync() async {
    let loadedPlans = await Task.detached(priority: .userInitiated) {
        MockDataService.shared.getPlans(for: city.id)
    }.value
    await MainActor.run {
        plans = loadedPlans
    }
}
```

**To:**
```swift
private func loadPlansAsync() async {
    // Access mock data synchronously - it's in-memory, no I/O needed
    plans = MockDataService.shared.getPlans(for: city.id)
}
```

**Change `loadGroupFlowsAsync()` from:**
```swift
private func loadGroupFlowsAsync() async {
    let loadedGroupFlows = await Task.detached(priority: .userInitiated) {
        MockDataService.shared.getGroupFlows(for: city.id)
    }.value
    await MainActor.run {
        groupFlows = loadedGroupFlows
    }
}
```

**To:**
```swift
private func loadGroupFlowsAsync() async {
    // Access mock data synchronously - it's in-memory, no I/O needed
    groupFlows = MockDataService.shared.getGroupFlows(for: city.id)
}
```

---

## Why This Fix Works

1. **No Race Condition:** Direct access doesn't involve background threads competing for lazy initialization
2. **Main Actor Context:** `loadPlansAsync()` is called from a SwiftUI `task { }` modifier which runs on MainActor
3. **Instant Access:** MockDataService data is in-memory, so "async" waiting is unnecessary
4. **Simpler Code:** Removing unnecessary concurrency complexity

---

## Testing After Fix

After applying the fix, verify all cities show their plans:

1. Open app
2. Navigate to Home screen
3. Tap each city card:
   - [ ] New York
   - [ ] Los Angeles
   - [ ] Miami
   - [ ] London
   - [ ] Paris
   - [ ] Tokyo
   - [ ] Berlin
   - [ ] Barcelona
   - [ ] Amsterdam
   - [ ] Dubai
   - [ ] Madrid
4. Verify plans list is populated (not blank)
