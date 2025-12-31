# Xcode Build Error Fix - Litplan iOS App

## Problem Summary

The Litplan iOS app fails to build with these errors:
- `Cannot find 'AuthenticationManager' in scope`
- `Cannot find 'SupabaseManager' in scope`
- `Cannot find 'Config' in scope`
- `Unable to find module dependency: 'Supabase'`

## Root Cause Analysis

**The Supabase Swift package is added to the project but NOT linked to the Litplan target.**

### What's Present (Correct)
1. Package reference in `XCRemoteSwiftPackageReference` section
2. Package in `packageReferences` array at project level
3. `Package.resolved` file with Supabase v2.39.0 resolved
4. All Swift files added to Sources build phase

### What's Missing (Problem)
| Component | Status |
|-----------|--------|
| `XCSwiftPackageProductDependency` section | **MISSING** |
| `packageProductDependencies` on target | **MISSING** |
| `PBXBuildFile` for Supabase framework | **MISSING** |
| `PBXFrameworksBuildPhase` entry | **EMPTY** |

## Error Cascade

1. **SupabaseManager.swift** imports `Supabase` → Module not found → File fails to compile
2. **AuthenticationManager.swift** imports `Supabase` → Module not found → File fails to compile
3. **LitplanApp.swift** references `AuthenticationManager` and `SupabaseManager` → Classes unavailable
4. **Config.swift** may also fail due to build order issues

## Solution

### Option 1: Xcode UI (Recommended)

1. Open `Litplan.xcodeproj` in Xcode
2. Select the **Litplan target** in the project navigator
3. Go to **General** tab
4. Scroll to **"Frameworks, Libraries, and Embedded Content"**
5. Click the **"+"** button
6. Select **"Supabase"** from the package products list
7. Click **"Add"**
8. Clean build folder (Cmd+Shift+K)
9. Build (Cmd+B)

### Option 2: Manual project.pbxproj Edit

The following changes need to be made to `project.pbxproj`:

#### 1. Add to PBXBuildFile section
```
SPM001 /* Supabase in Frameworks */ = {isa = PBXBuildFile; productRef = SPM101 /* Supabase */; };
```

#### 2. Update PBXFrameworksBuildPhase
```
200 /* Frameworks */ = {
    isa = PBXFrameworksBuildPhase;
    buildActionMask = 2147483647;
    files = (
        SPM001 /* Supabase in Frameworks */,
    );
    runOnlyForDeploymentPostprocessing = 0;
};
```

#### 3. Add packageProductDependencies to PBXNativeTarget
```
400 /* Litplan */ = {
    ...
    packageProductDependencies = (
        SPM101 /* Supabase */,
    );
    ...
};
```

#### 4. Add XCSwiftPackageProductDependency section
```
/* Begin XCSwiftPackageProductDependency section */
    SPM101 /* Supabase */ = {
        isa = XCSwiftPackageProductDependency;
        package = 211DED502F02E98C00532BB0 /* XCRemoteSwiftPackageReference "supabase-swift" */;
        productName = Supabase;
    };
/* End XCSwiftPackageProductDependency section */
```

## Files Affected

| File | Issue | Fix |
|------|-------|-----|
| `project.pbxproj` | Missing SPM linking | Add 4 sections above |
| `SupabaseManager.swift` | Code correct | Will compile after fix |
| `AuthenticationManager.swift` | Code correct | Will compile after fix |
| `Config.swift` | Code correct | Will compile after fix |
| `LitplanApp.swift` | Code correct | Will compile after fix |

## Verification

After applying the fix, run:
```bash
cd /Users/davidnjagah/Documents/GitHub/litplanAI/ios-app
xcodebuild -project Litplan.xcodeproj -scheme Litplan -sdk iphonesimulator build
```

Expected: Build succeeds with no errors.
