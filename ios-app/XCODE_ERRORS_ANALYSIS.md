# Xcode Build Errors Analysis & Solutions

## Date: December 30, 2025

## Issues Summary

| # | File | Error/Warning | Type | Priority |
|---|------|---------------|------|----------|
| 1 | APIService.swift | "No 'filter' candidates produce the expected contextual result type '[Plan]'" | Build Error | Critical |
| 2 | APIService.swift | "Value of tuple type '(key: String, value: [Plan])' has no member 'id'" | Build Error | Critical |
| 3 | Auth | "Initial session emitted after attempting to refresh the local stored session..." | Runtime Warning | Low |

---

## Issue 1 & 2: APIService Filter Errors

### Root Cause

The `allPlans` property in `MockDataService` is defined as a dictionary of type `[String: [Plan]]` (where the key is a city ID string and the value is an array of `Plan` objects).

The current code attempts to use `.filter` with nil-coalescing operator `??` combined with chained closures. The Swift compiler struggles with type inference due to:
1. Complex expression with `??` operator
2. Chained higher-order functions (`flatMap` followed by `filter`)
3. Implicit closure parameters (`$0`)

### Current Code (Broken)

**File:** `/Users/davidnjagah/Documents/GitHub/litplanAI/ios-app/Litplan/Services/APIService.swift`
**Lines:** 465-473

```swift
extension MockDataService {
    /// Get plans for a specific city ID
    func plans(for cityId: String) -> [Plan] {
        // Return plans for the city from the dictionary, or empty array if not found
        return allPlans[cityId] ?? allPlans.values.flatMap { $0 }.filter {
            $0.id.lowercased().hasPrefix(cityId.prefix(3).lowercased())
        }
    }
}
```

### Fixed Code

```swift
extension MockDataService {
    /// Get plans for a specific city ID
    func plans(for cityId: String) -> [Plan] {
        // Return plans for the city from the dictionary
        if let cityPlans = allPlans[cityId] {
            return cityPlans
        }

        // Fallback: search for plans with matching city prefix
        let allPlansList: [Plan] = allPlans.values.flatMap { $0 }
        return allPlansList.filter { plan in
            plan.id.lowercased().hasPrefix(cityId.prefix(3).lowercased())
        }
    }
}
```

### Why This Fix Works

1. **Separating the nil-coalescing logic**: Using an explicit `if let` statement makes the code flow clearer and avoids complex type inference across the `??` operator.

2. **Explicit type annotation**: Adding `: [Plan]` to the intermediate variable `allPlansList` helps the compiler understand the exact type being worked with.

3. **Named closure parameter**: Using `plan in` instead of the implicit `$0` makes the filter closure's intent clearer and assists type inference.

4. **Improved readability**: The refactored code clearly shows:
   - First, try to get plans directly by city ID
   - If that fails, flatten all plans and filter by prefix matching

---

## Issue 3: Auth Session Warning

### Warning Type
**Runtime Warning** (NOT a compile-time error)

This is a runtime informational warning/log message emitted by the Supabase Swift SDK. It appears in the Xcode console during app execution, not during the build process.

### Root Cause

The warning message is:
> "Initial session emitted after attempting to refresh the local stored session. This is incorrect behavior and will be fixed in the next major release since it's a breaking change."

**Why it occurs:**
1. **Default SDK Behavior**: By default, the Supabase Swift SDK sets `emitLocalSessionAsInitialSession` to `false`. This means when the app starts, the SDK first attempts to refresh/validate the locally stored session before emitting the `initialSession` event.

2. **Code Pattern**: In `LitplanApp.swift`, the app calls both:
   - `authManager.checkAuthState()` - which accesses `client.auth.session`
   - `supabaseManager.listenForAuthChanges()` - which subscribes to `authStateChanges`

3. **Duplicate Session Checks**: `SupabaseManager.init()` spawns a Task to call `checkExistingSession()`, and `LitplanApp.swift` also calls `checkAuthState()`. This redundancy triggers the SDK's internal warning.

### Impact
**NOT Critical - Does NOT block the build**

- This is informational, not an error
- App works correctly
- Sessions are managed properly
- Will be fixed in future SDK major release

### Solutions

#### Option 1: Configure AuthClient (Recommended)

```swift
private func initializeClient() {
    client = SupabaseClient(
        supabaseURL: URL(string: Config.supabaseURL)!,
        supabaseKey: Config.supabaseAnonKey,
        options: SupabaseClientOptions(
            auth: AuthClient.Configuration(
                emitLocalSessionAsInitialSession: true
            )
        )
    )
}
```

#### Option 2: Remove Duplicate Session Check

Remove the Task block in `SupabaseManager.init()`:

```swift
private init() {
    initializeClient()
    // Remove this Task block since LitplanApp.swift already calls checkAuthState()
    // Task {
    //     await checkExistingSession()
    // }
}
```

#### Option 3: Ignore the Warning

Since this is informational and does not affect functionality, you can safely ignore it.

---

## Implementation Checklist

- [x] Fix APIService.swift filter code (Critical) - **COMPLETED**
- [x] Remove duplicate session check from SupabaseManager (Low priority) - **COMPLETED**
- [x] Run build to verify all errors resolved - **BUILD SUCCEEDED**
- [ ] Test app functionality

## Build Status

**BUILD SUCCEEDED** on December 30, 2025

All compile-time errors have been resolved. The Auth warning is a runtime informational message that does not affect app functionality.

---

## References

- [Supabase Swift Auth API Reference](https://supabase.com/docs/reference/swift/auth-onauthstatechange)
- [Supabase Swift SDK Releases](https://github.com/supabase/supabase-swift/releases)
