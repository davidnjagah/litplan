# Litplan iOS UI Component Catalog

**Version:** 1.0.0
**Last Updated:** December 28, 2025
**Status:** PRODUCTION READY
**Total Components:** 17

---

## Table of Contents

1. [Button Components](#button-components)
2. [Card Components](#card-components)
3. [State Components](#state-components)
4. [Notification Components](#notification-components)
5. [Media Components](#media-components)
6. [View Components](#view-components)
7. [Quick Reference](#quick-reference)

---

## Button Components

### 1. PrimaryButton

**File:** `/Litplan/Components/PrimaryButton.swift`

**Purpose:** Main call-to-action button with electric cyan background, used for primary actions like subscriptions, confirmations, and form submissions.

**Props:**
- `title: String` - Button text
- `action: () -> Void` - Tap handler
- `isLoading: Bool = false` - Show loading spinner
- `isDisabled: Bool = false` - Disable interaction

**Code Example:**
```swift
// Basic usage
PrimaryButton(title: "Subscribe Now") {
    performSubscription()
}

// With loading state
PrimaryButton(
    title: "Processing...",
    action: {},
    isLoading: true
)

// Disabled state
PrimaryButton(
    title: "Unavailable",
    action: {},
    isDisabled: true
)
```

**Visual Example:**
```
┌───────────────────────────────────┐
│      Subscribe Now (White)        │  ← #00D9FF background
└───────────────────────────────────┘
     ↓ When pressed (95% scale)
┌──────────────────────────────┐
│    Subscribe Now (White)     │
└──────────────────────────────┘
```

**Specifications:**
- Height: 50pt
- Background: `Color.accentPrimary` (#00D9FF)
- Text: `Color.textPrimary` (#FFFFFF, 16pt Semibold)
- Corner radius: 12pt
- Disabled opacity: 50%
- Animation: Spring physics (response: 0.4s, damping: 0.75)

**Accessibility:**
- ✅ VoiceOver: Button role, reads title
- ✅ Dynamic Type: Text scales with user preferences
- ✅ Touch target: 50pt height (exceeds 44pt minimum)
- ✅ Color contrast: 21:1 (AAA)

**Related Components:** SecondaryButton, TertiaryButton

**Do's:**
- ✅ Use for primary CTAs (Subscribe, Start Trial, Confirm)
- ✅ Keep title concise (1-3 words)
- ✅ Show loading state during async operations
- ✅ Disable when action is unavailable

**Don'ts:**
- ❌ Don't use multiple primary buttons on same screen
- ❌ Don't use for navigation (use chevrons/links)
- ❌ Don't change background color (breaks consistency)

---

### 2. SecondaryButton

**File:** `/Litplan/Components/SecondaryButton.swift`

**Purpose:** Secondary action button with cyan border and transparent background, used for alternative options like "Maybe Later" or "Learn More".

**Props:**
- `title: String` - Button text
- `action: () -> Void` - Tap handler
- `isLoading: Bool = false` - Show loading spinner
- `isDisabled: Bool = false` - Disable interaction

**Code Example:**
```swift
SecondaryButton(title: "Maybe Later") {
    dismissPaywall()
}

// Below primary button
VStack(spacing: Spacing.md) {
    PrimaryButton(title: "Subscribe Now", action: subscribe)
    SecondaryButton(title: "Maybe Later", action: dismiss)
}
```

**Visual Example:**
```
┌───────────────────────────────────┐
│    Maybe Later (Cyan text)        │  ← Transparent, 2pt cyan border
└───────────────────────────────────┘
```

**Specifications:**
- Height: 50pt
- Background: Transparent
- Border: 2pt `Color.accentPrimary`
- Text: `Color.accentPrimary` (16pt Semibold)
- Corner radius: 12pt
- Animation: Spring physics

**Accessibility:**
- ✅ VoiceOver: Button role, reads title
- ✅ Touch target: 50pt height
- ✅ Color contrast: Border and text both 8.2:1 (AAA)

**Do's:**
- ✅ Use below primary buttons for secondary actions
- ✅ Use for dismissible modals ("Maybe Later", "Cancel")
- ✅ Pair with PrimaryButton in vertical stacks

**Don'ts:**
- ❌ Don't use alone without a primary action
- ❌ Don't use for destructive actions (use error color)

---

### 3. TertiaryButton

**File:** `/Litplan/Components/TertiaryButton.swift`

**Purpose:** Text-only button for inline links and subtle actions like "Restore Purchases" or "Terms & Conditions".

**Props:**
- `title: String` - Button text
- `action: () -> Void` - Tap handler
- `isLoading: Bool = false` - Show loading spinner
- `isDisabled: Bool = false` - Disable interaction

**Code Example:**
```swift
TertiaryButton(title: "Restore Purchases") {
    restorePurchases()
}

// In footer
VStack(spacing: Spacing.xs) {
    Text("Already subscribed?")
        .font(.caption)
        .foregroundColor(.textSecondary)

    TertiaryButton(title: "Restore Purchases", action: restore)
}
```

**Visual Example:**
```
Restore Purchases  ← Cyan text, no background, 44pt touch target
```

**Specifications:**
- Height: 44pt (minimum touch target)
- Background: None
- Text: `Color.accentPrimary` (16pt Medium)
- No border or corner radius
- Animation: Subtle opacity change on press

**Accessibility:**
- ✅ VoiceOver: Link role, reads title
- ✅ Touch target: 44pt minimum
- ✅ Color contrast: 8.2:1 (AAA)

**Do's:**
- ✅ Use for inline links in body text
- ✅ Use in footers for legal/support links
- ✅ Use for "Restore Purchases" in paywalls

**Don'ts:**
- ❌ Don't use for primary actions
- ❌ Don't reduce font size below 16pt
- ❌ Don't use for critical actions (invisible in quick scan)

---

## Card Components

### 4. StandardCard

**File:** `/Litplan/Components/StandardCard.swift`

**Purpose:** Generic card container with dark grey background and subtle shadow, used as a wrapper for any card content.

**Props:**
- `content: @ViewBuilder () -> Content` - Card content

**Code Example:**
```swift
StandardCard {
    VStack(alignment: .leading, spacing: Spacing.sm) {
        Text("Plan Title")
            .font(.headline)
            .foregroundColor(.textPrimary)

        Text("Venue Name")
            .font(.body)
            .foregroundColor(.textSecondary)

        Text("Entry: $20")
            .font(.callout)
            .foregroundColor(.accentPrimary)
    }
    .padding(Spacing.md)
}
```

**Visual Example:**
```
┌─────────────────────────────────┐
│  Plan Title                     │  ← #1C1C1E background
│  Venue Name                     │
│  Entry: $20                     │
└─────────────────────────────────┘
   └─── Subtle shadow (8pt blur, 4pt offset)
```

**Specifications:**
- Background: `Color.surfacePrimary` (#1C1C1E)
- Corner radius: 12pt
- Shadow: Black 30% opacity, 8pt blur, 4pt Y offset
- No padding (apply inside content)

**Accessibility:**
- ✅ VoiceOver: Content determines accessibility
- ✅ Dynamic Type: Inherit from content
- ✅ Color contrast: 12:1 with white text (AAA)

**Do's:**
- ✅ Use for any card-based content
- ✅ Add padding inside content (`.padding(Spacing.md)`)
- ✅ Use for plan cards, settings cards, info cards

**Don'ts:**
- ❌ Don't nest cards inside cards
- ❌ Don't change background color
- ❌ Don't add external padding (breaks shadow effect)

---

### 5. CityCardStack

**File:** `/Litplan/Components/CityCardStack.swift`

**Purpose:** Hero city card with stacked effect, used on Home screen to showcase cities with hero images, plan counts, and tap-to-expand interaction.

**Props:**
- `city: City` - City data model
- `onTap: () -> Void` - Tap handler for navigation

**Code Example:**
```swift
CityCardStack(city: nyc) {
    navigateToCityDetails(nyc)
}

// In horizontal scroll
ScrollView(.horizontal, showsIndicators: false) {
    HStack(spacing: Spacing.lg) {
        ForEach(cities) { city in
            CityCardStack(city: city) {
                navigateTo(city)
            }
        }
    }
    .padding(.horizontal, Spacing.lg)
}
```

**Visual Example:**
```
┌──────────────────────────┐
│  [NYC Skyline Image]     │  ← 280×360pt
│                          │
│  45 plans    ← Badge     │
│                          │
│  New York City           │
│  🇺🇸 United States       │
└──────────────────────────┘
 └─┬─┘ Stack effect (3 cards visible)
```

**Specifications:**
- Dimensions: 280pt × 360pt
- Hero image: Full-bleed with gradient overlay
- Badge: Top-right, Electric Cyan background
- Stack effect: 3 visible cards, slight rotation (±1-1.5°)
- Tap animation: 95% scale with spring physics
- Corner radius: 12pt

**Accessibility:**
- ✅ VoiceOver: "{City}, {Country}. Double tap to explore {N} nightlife plans"
- ✅ Button role
- ✅ Dynamic Type: City name and country scale
- ✅ Reduce Motion: No rotation when enabled

**Do's:**
- ✅ Use on Home screen for city discovery
- ✅ Show plan count in badge
- ✅ Use high-quality hero images (1200×1600px minimum)

**Don'ts:**
- ❌ Don't resize card (breaks stack effect)
- ❌ Don't remove stack layers (defining visual feature)
- ❌ Don't use for non-city content

---

### 6. ExpandedCardView

**File:** `/Litplan/Components/ExpandedCardView.swift`

**Purpose:** Full-screen carousel modal for browsing plans with horizontal swipe navigation, shown when tapping a plan from CityDetailsView.

**Props:**
- `city: City` - City context
- `initialPlanIndex: Int` - Starting plan index
- `onDismiss: () -> Void` - Dismiss handler

**Code Example:**
```swift
.sheet(isPresented: $showExpandedCard) {
    ExpandedCardView(
        city: selectedCity,
        initialPlanIndex: selectedPlanIndex
    ) {
        showExpandedCard = false
    }
}
```

**Visual Example:**
```
┌─────────────────────────────────────┐
│  [X]            New York            │  ← Top bar with close
├─────────────────────────────────────┤
│                                     │
│    ┌──────────┐                    │
│    │  Plan    │  ← Current card    │
│    │  Image   │     (100% scale)   │
│    │  Title   │                    │
│    └──────────┘                    │
│  ◀ ▶  ← Swipe left/right           │
│                                     │
└─────────────────────────────────────┘
```

**Specifications:**
- Full-screen modal with 50% black background dim
- Card size: 80% screen width
- Carousel: Current card at 100% scale, adjacent at 80% scale and 50% opacity
- Swipe threshold: 50pt to change cards
- Animation: Spring physics (response: 0.4s, damping: 0.8)

**Accessibility:**
- ✅ VoiceOver: Each card is separately navigable
- ✅ Close button: "Close" label with dismiss hint
- ✅ Swipe accessible via VoiceOver gestures

**Do's:**
- ✅ Use for detailed plan viewing
- ✅ Show 3 cards at once (previous, current, next)
- ✅ Allow tap on dimmed background to dismiss

**Don'ts:**
- ❌ Don't auto-advance cards (user should control)
- ❌ Don't prevent dismiss (always show close button)

---

### 7. GroupFlowCard

**File:** `/Litplan/Components/GroupFlowCard.swift`

**Purpose:** Multi-venue itinerary card showing timeline of activities, used to display full-night group experiences with start times, venues, and total duration/cost.

**Props:**
- `groupFlow: GroupFlow` - Group flow data model
- `isProUser: Bool` - Pro subscription status
- `onTapViewItinerary: () -> Void` - Tap handler

**Code Example:**
```swift
GroupFlowCard(
    groupFlow: nycRooftopFlow,
    isProUser: subscriptionManager.isProUser
) {
    navigateToDetailedGroupFlow(nycRooftopFlow)
}
```

**Visual Example:**
```
┌────────────────────────────────────┐
│  Rooftop & Speakeasy Experience    │  ← Title
│  [Groups] [Date Night]  MODERATE   │  ← Tags + Difficulty
├────────────────────────────────────┤
│  ① 8PM • 90min                     │
│  |  Rooftop Bar                    │
│  |  Start with cocktails...        │
│  ↓                                 │
│  ② 10PM • 60min                    │
│  |  Speakeasy                      │
│     Hidden cocktail lounge...      │
├────────────────────────────────────┤
│  ⏱ 3h total    💵 $80-120 est      │
│  [View Full Itinerary]             │
└────────────────────────────────────┘
```

**Specifications:**
- Timeline: Numbered circles (①②③) with connecting lines
- Difficulty badge: Green (Easy), Yellow (Moderate), Red (Intense)
- Free tier: 60% opacity with lock icon on CTA
- Pro tier: Full opacity with accent border
- Corner radius: 16pt

**Accessibility:**
- ✅ VoiceOver: "{Title}, {Difficulty} difficulty. Double tap to view full itinerary. {Duration} total, {Cost} estimated cost"
- ✅ Button role
- ✅ Dynamic Type: All text scales
- ✅ Pro status indicated in hint

**Do's:**
- ✅ Use for multi-venue experiences (2-4 activities)
- ✅ Show time, duration, and venue for each activity
- ✅ Display total duration and cost estimate

**Don'ts:**
- ❌ Don't show for single-venue plans (use standard plan card)
- ❌ Don't exceed 4 activities (too long to scroll)
- ❌ Don't hide Pro status (lock icon shows value)

---

### 8. ViewedCityCard

**File:** `/Litplan/Components/ViewedCityCard.swift`

**Purpose:** Compact horizontal card for recently viewed cities, used in ViewedCitiesView with thumbnail, city name, view count, and last viewed time.

**Props:**
- `viewedCity: ViewedCity` - Viewed city data model
- `onTap: () -> Void` - Tap handler

**Code Example:**
```swift
ForEach(viewedCities) { viewedCity in
    ViewedCityCard(viewedCity: viewedCity) {
        navigateToCity(viewedCity.id)
    }
}
```

**Visual Example:**
```
┌─────────────────────────────────────────┐
│  [Thumb]  New York City                 │
│   80×80   🇺🇸 United States             │
│           👁 3 views • 🕐 2h ago     ›   │
└─────────────────────────────────────────┘
```

**Specifications:**
- Height: ~100pt (flexible based on content)
- Thumbnail: 80×80pt, 12pt corner radius
- Metadata: Eye icon + view count, clock icon + relative time
- Chevron right: Navigation indicator
- Background: `surfacePrimary`

**Accessibility:**
- ✅ VoiceOver: "{City}, {Country}. Viewed {N} times, last viewed {time}"
- ✅ Button role
- ✅ Dynamic Type: All text scales
- ✅ Touch target: Full card height (>44pt)

**Do's:**
- ✅ Use for viewing history
- ✅ Show view count and last viewed time
- ✅ Sort by most recent first

**Don'ts:**
- ❌ Don't use for city discovery (use CityCardStack)
- ❌ Don't show if never viewed (use empty state)

---

## State Components

### 9. LoadingStateView

**File:** `/Litplan/Components/LoadingStateView.swift`

**Purpose:** Full-screen loading indicator with animated spinner and message, used during data fetching or AI plan generation.

**Props:**
- `message: String = "Loading plans..."` - Loading message

**Code Example:**
```swift
if isLoading {
    LoadingStateView(message: "Refreshing your cities...")
} else {
    // Content
}

// Custom message
LoadingStateView(message: "Generating AI plans...")
```

**Visual Example:**
```
         ╭──────╮
         │  ◐   │  ← Animated cyan gradient spinner
         ╰──────╯

    Loading plans...
```

**Specifications:**
- Spinner: 60pt diameter, cyan gradient (70% arc)
- Animation: 1s linear repeat (disabled with Reduce Motion)
- Message: `bodyLarge`, `textSecondary`
- Full-screen centered

**Accessibility:**
- ✅ VoiceOver: "Loading. {message}"
- ✅ Reduce Motion: Static spinner when enabled
- ✅ Live region: Announces when loading state changes

**Do's:**
- ✅ Use for network requests (>1s)
- ✅ Provide specific message ("Loading nightlife plans...")
- ✅ Show immediately when action starts

**Don'ts:**
- ❌ Don't use for instant operations (<500ms)
- ❌ Don't show indefinitely (timeout after 30s)
- ❌ Don't block UI permanently (provide error state)

---

### 10. EmptyStateView

**File:** `/Litplan/Components/EmptyStateView.swift`

**Purpose:** Full-screen empty state with icon, title, message, and optional CTA, used when no content is available.

**Props:**
- `icon: String = "building.2.crop.circle"` - SF Symbol name
- `title: String` - Empty state title
- `message: String` - Explanation message
- `ctaText: String? = nil` - Optional CTA button text
- `ctaAction: (() -> Void)? = nil` - Optional CTA handler

**Code Example:**
```swift
if cities.isEmpty {
    EmptyStateView(
        icon: "building.2.crop.circle",
        title: "No Cities Viewed Yet",
        message: "Start exploring cities to see your viewing history here"
    )
}

// With CTA
EmptyStateView(
    icon: "calendar.badge.clock",
    title: "No Plans Available",
    message: "Check back soon! Fresh plans are generated every Monday.",
    ctaText: "Explore Other Cities",
    ctaAction: { navigateToExplore() }
)
```

**Visual Example:**
```
         ╭──────╮
         │  🏢  │  ← 80pt icon, tertiary grey
         ╰──────╯

    No Cities Viewed Yet

  Start exploring cities to see
      your viewing history

    ┌──────────────────┐
    │  Browse Cities   │  ← Optional CTA
    └──────────────────┘
```

**Specifications:**
- Icon: 80pt, `textTertiary`
- Title: `displayMedium`, `textPrimary`
- Message: `bodyLarge`, `textSecondary`, centered
- CTA: PrimaryButton style
- Full-screen centered

**Accessibility:**
- ✅ VoiceOver: "{Title}. {Message}"
- ✅ Icon hidden from VoiceOver (decorative)
- ✅ CTA is separate button element
- ✅ Dynamic Type: All text scales

**Do's:**
- ✅ Use when content is unavailable (not error)
- ✅ Explain why it's empty and what to do
- ✅ Provide CTA for actionable solutions

**Don'ts:**
- ❌ Don't show for temporary loading (use LoadingStateView)
- ❌ Don't show for errors (use ErrorStateView)
- ❌ Don't use generic messages ("No data")

---

### 11. ErrorStateView

**File:** `/Litplan/Components/ErrorStateView.swift`

**Purpose:** Full-screen error state with icon, title, message, and retry button, used for network failures, API errors, and unexpected issues.

**Props:**
Multiple initializers:
- `ErrorStateView(icon:title:message:retryButtonText:onRetry:)` - Manual
- `ErrorStateView(errorCode:retryButtonText:onRetry:)` - Backend error code
- `ErrorStateView(error:retryButtonText:onRetry:)` - Swift Error object

**Code Example:**
```swift
// Manual error
if let error = viewModel.error {
    ErrorStateView(
        icon: "wifi.slash",
        title: "Connection Lost",
        message: "Unable to load plans. Check your connection and try again.",
        retryButtonText: "Retry"
    ) {
        viewModel.retry()
    }
}

// Backend error code
ErrorStateView(errorCode: "NETWORK_ERROR") {
    retryLoadData()
}

// Swift Error object
ErrorStateView(error: networkError) {
    retryLoadData()
}
```

**Visual Example:**
```
         ╭──────╮
         │  📡  │  ← 80pt icon, red error color
         ╰──────╯

     Connection Lost

  Unable to load plans. Please
 check your connection and retry.

    ┌──────────────────┐
    │  🔄  Retry       │  ← PrimaryButton with reload icon
    └──────────────────┘
```

**Specifications:**
- Icon: 80pt, `error` color (#FF453A)
- Title: `displayMedium`, `textPrimary`
- Message: `bodyLarge`, `textSecondary`, centered
- Retry button: PrimaryButton style with reload icon
- Full-screen centered
- Haptic: Warning feedback on retry tap

**Supported Error Codes:**
- `RATE_LIMIT_EXCEEDED` → "Slow Down"
- `AUTHENTICATION_ERROR` → "Session Expired"
- `AUTHORIZATION_ERROR` → "Premium Feature"
- `NOT_FOUND` → "Not Found"
- `EXTERNAL_SERVICE_ERROR` → "Service Unavailable"
- `DATABASE_ERROR` → "Something Went Wrong"
- `NETWORK_ERROR` → "Connection Lost"
- `UNKNOWN_ERROR` → "Error"

**Accessibility:**
- ✅ VoiceOver: "{Title}. {Message}"
- ✅ Retry button: "Retry. Retry loading data"
- ✅ Error icon hidden (decorative)
- ✅ Dynamic Type: All text scales

**Do's:**
- ✅ Use for recoverable errors (network, API)
- ✅ Provide user-friendly messages (not raw errors)
- ✅ Always include retry button
- ✅ Use error code parsing for backend errors

**Don'ts:**
- ❌ Don't show technical error messages to users
- ❌ Don't use for empty states (use EmptyStateView)
- ❌ Don't omit retry action (users need recovery path)

---

## Notification Components

### 12. ToastView

**File:** `/Litplan/Components/ToastView.swift`

**Purpose:** Non-critical notification that slides down from top, auto-dismisses after 3 seconds, used for success confirmations, warnings, and info messages.

**Props:**
Uses `ToastData` model:
- `type: ToastType` - `.success`, `.warning`, `.error`, `.info`
- `message: String` - Toast message

**Code Example:**
```swift
@State private var toast: ToastData? = nil

var body: some View {
    VStack {
        // Your content
    }
    .toast($toast)  // Add modifier
}

// Trigger toast
toast = ToastData(type: .success, message: "Plan saved successfully")
toast = ToastData(type: .error, message: "Failed to save plan")
toast = ToastData(type: .warning, message: "Connection restored")
toast = ToastData(type: .info, message: "Welcome to Litplan Pro!")
```

**Visual Example:**
```
TOP OF SCREEN
┌─────────────────────────────────┐
│  ✓ Plan saved successfully  ×  │  ← Success (green icon)
└─────────────────────────────────┘
     └─── Slides down, auto-dismisses 3s

┌─────────────────────────────────┐
│  ⚠ Connection restored     ×   │  ← Warning (yellow icon)
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  ✕ Failed to save plan     ×   │  ← Error (red icon)
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  ℹ Welcome to Litplan Pro! ×   │  ← Info (cyan icon)
└─────────────────────────────────┘
```

**Specifications:**
- Position: Top of screen (below safe area)
- Animation: Slide down 0.3s ease-out, slide up 0.2s ease-in
- Auto-dismiss: 3 seconds
- Manual dismiss: Tap X button or tap toast
- Shadow: 12pt blur, 4pt offset
- Corner radius: 12pt

**Toast Types:**
| Type | Icon | Color |
|------|------|-------|
| Success | `checkmark.circle.fill` | `success` (#30D158) |
| Warning | `exclamationmark.triangle.fill` | `warning` (#FFD60A) |
| Error | `xmark.circle.fill` | `error` (#FF453A) |
| Info | `info.circle.fill` | `accentPrimary` (#00D9FF) |

**Accessibility:**
- ✅ VoiceOver: Reads message automatically
- ✅ Dismiss button: "Dismiss notification. Tap to dismiss"
- ✅ Live region: Announces toast appearance
- ✅ Dynamic Type: Message text scales

**Do's:**
- ✅ Use for non-critical feedback (saved, copied, etc.)
- ✅ Keep message short (1 line, max 2)
- ✅ Use success for confirmations
- ✅ Auto-dismiss after 3s

**Don'ts:**
- ❌ Don't use for critical errors (use ErrorStateView)
- ❌ Don't stack multiple toasts (queue them)
- ❌ Don't show indefinitely (always auto-dismiss)
- ❌ Don't use for long messages (>2 lines)

---

## Media Components

### 13. AsyncImageView

**File:** `/Litplan/Components/AsyncImageView.swift`

**Purpose:** High-performance async image loader with memory & disk caching, downsampling, and progressive loading, used for all remote images in the app.

**Props:**
- `url: URL?` - Image URL
- `contentMode: ContentMode = .fill` - Image scaling mode
- `showPlaceholder: Bool = true` - Show placeholder when loading
- `downsampleSize: CGSize? = nil` - Target size for downsampling

**Code Example:**
```swift
// Basic usage
AsyncImageView(
    url: imageURL,
    contentMode: .fill
)
.frame(width: 280, height: 200)
.cornerRadius(12)

// Convenience styles
AsyncImageView.thumbnail(url: imageURL)  // 120×120pt
AsyncImageView.card(url: imageURL, width: 280, height: 200)
AsyncImageView.hero(url: imageURL, height: 250)
AsyncImageView.avatar(url: imageURL, size: 80)

// Custom downsampling
AsyncImageView(
    url: imageURL,
    downsampleSize: CGSize(width: 300, height: 200)  // Performance optimization
)
```

**Visual States:**
```
LOADING
┌─────────────┐
│             │
│      ⌛     │  ← Grey background + spinner
│             │
└─────────────┘

LOADED
┌─────────────┐
│   [Image]   │  ← Fades in 0.3s
└─────────────┘

ERROR
┌─────────────┐
│             │
│      📷     │  ← Grey background + photo icon
│             │
└─────────────┘
```

**Specifications:**
- Memory cache: 50MB limit, 100 image limit
- Disk cache: Unlimited (user can clear in Settings)
- Downsampling: Automatic based on target size
- Progressive loading: Fade-in 0.3s ease-in
- Placeholder: `surfaceSecondary` background
- Error state: Photo icon on grey background

**Caching Strategy:**
1. Check memory cache (instant)
2. Check disk cache (fast)
3. Download from URL (network)
4. Downsample if target size specified
5. Cache in memory + disk

**Convenience Styles:**

| Style | Dimensions | Corner Radius | Use Case |
|-------|-----------|---------------|----------|
| `thumbnail` | 120×120pt | 12pt | City thumbnails, avatars |
| `card` | Custom | 16pt | Plan cards, featured content |
| `hero` | Full width | 0pt | Hero images, headers |
| `avatar` | Custom | Circular | User profiles |

**Accessibility:**
- ✅ Images are decorative (not read by VoiceOver)
- ✅ Loading/error states hidden from VoiceOver
- ✅ Use `.accessibilityLabel()` on parent if meaningful

**Do's:**
- ✅ Always use AsyncImageView (never plain AsyncImage)
- ✅ Specify downsample size for performance
- ✅ Use convenience styles when possible
- ✅ Use `.fill` content mode for cards/heroes

**Don'ts:**
- ❌ Don't use without frame (will be 0×0)
- ❌ Don't skip downsampling for large images (memory issue)
- ❌ Don't load 4K images for 200pt views (waste)

**Performance Tips:**
```swift
// ✅ Good - Downsample to exact size needed
AsyncImageView(
    url: imageURL,
    downsampleSize: CGSize(width: 280, height: 200)
)
.frame(width: 280, height: 200)

// ❌ Bad - Full-resolution image in memory
AsyncImage(url: imageURL)  // Loads 4000×3000 for 280×200 view
    .frame(width: 280, height: 200)
```

---

## View Components

### 14. PaywallView

**File:** `/Litplan/Views/PaywallView.swift`

**Purpose:** Full-screen subscription paywall modal with pricing, benefits, and purchase flow, shown when free tier limits are reached or Pro features are accessed.

**Props:**
- `trigger: PaywallTrigger? = nil` - Optional context trigger
- `onDismiss: (() -> Void)? = nil` - Dismiss handler

**Code Example:**
```swift
.sheet(isPresented: $showPaywall) {
    PaywallView(
        trigger: .cityLimit,  // Context: "You've Reached Your City Limit"
        onDismiss: {
            showPaywall = false
        }
    )
}

// Generic paywall (no trigger)
.sheet(isPresented: $showPaywall) {
    PaywallView()
}
```

**Visual Structure:**
```
┌─────────────────────────────────┐
│  [X Close]                      │
│                                 │
│         👑                      │  ← Crown icon
│   Unlock Litplan Pro            │
│  Get unlimited access...        │
│                                 │
│  ✓ Unlimited cities             │
│  ✓ 50 plans per city            │
│  ✓ Weekend plans                │
│  ✓ Group flow experiences       │
│  ✓ Save favorite cities         │
│                                 │
│  ┌─────────────────────────┐   │
│  │ BEST VALUE              │   │
│  │ $79.99/year             │   │  ← Yearly (selected)
│  │ 7-day free trial        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ $9.99/month             │   │  ← Monthly
│  └─────────────────────────┘   │
│                                 │
│  [Start Free Trial]             │  ← Primary CTA
│                                 │
│  Terms • Privacy • Restore      │  ← Footer links
└─────────────────────────────────┘
```

**Paywall Triggers:**

| Trigger | Icon | Title | Message |
|---------|------|-------|---------|
| `.cityLimit` | `building.2.crop.circle` | "You've Reached Your City Limit" | "Upgrade to Pro for unlimited cities" |
| `.planLimit` | `calendar.badge.clock` | "Plan Limit Reached" | "Unlock 50 plans per city with Pro" |
| `.weekendPlan` | `calendar.badge.exclamationmark` | "Weekend Plans Are Pro-Only" | "Get Friday & Saturday plans with Pro" |
| `.groupFlow` | `arrow.triangle.branch` | "Group Flows Are Pro-Only" | "Unlock multi-venue experiences with Pro" |
| `.savedCity` | `star.circle` | "Save Cities with Pro" | "Quick access to your favorite cities" |

**Specifications:**
- Full-screen modal
- Close button: Top-right, always visible
- Crown icon: 60pt with bounce animation
- Pricing cards: Selectable, yearly has "BEST VALUE" badge
- CTA: Changes based on selection ("Start Free Trial" or "Subscribe")
- Footer: Restore Purchases, Terms, Privacy links

**Accessibility:**
- ✅ VoiceOver: All benefits, pricing, and CTA read clearly
- ✅ Close button: "Close. Dismiss paywall"
- ✅ Pricing cards: Radio button role, selection state announced
- ✅ Dynamic Type: All text scales
- ✅ Reduce Motion: No crown bounce when enabled

**Do's:**
- ✅ Use trigger context when available
- ✅ Show pricing clearly (no hidden costs)
- ✅ Offer 7-day trial on yearly plan
- ✅ Allow dismissal (close button always visible)

**Don'ts:**
- ❌ Don't prevent dismissal (user must be able to close)
- ❌ Don't hide pricing (transparency required)
- ❌ Don't use aggressive language ("Limited time!")

---

### 15. LaunchScreenView

**File:** `/Litplan/Views/LaunchScreenView.swift`

**Purpose:** Animated launch screen shown on app startup with logo, tagline, and loading indicator, transitions to HomeView after 1.5 seconds.

**Props:**
- `onComplete: () -> Void` - Completion handler when animation finishes

**Code Example:**
```swift
@State private var showLaunchScreen = true

var body: some View {
    if showLaunchScreen {
        LaunchScreenView {
            withAnimation {
                showLaunchScreen = false
            }
        }
    } else {
        HomeView()
    }
}
```

**Visual Example:**
```
         ╭──────────╮
         │    ⭕    │  ← Glow effect (cyan gradient)
         │   ╭──╮   │
         │   │ L│   │  ← Logo circle (120pt)
         │   ╰──╯   │
         ╰──────────╯

        Litplan

    Discover Your Night

           ⌛
```

**Animation Timeline:**
- 0.0s → Logo fade-in + scale (0.6s ease-out)
- 0.4s → Tagline fade-in (0.4s ease-in)
- 1.5s → Complete, call onComplete()

**Specifications:**
- Background: `appBackground` (pure black)
- Logo: 120pt circle, `surfaceSecondary` background
- "L" letter: 72pt Bold Rounded, `accentPrimary`
- Glow: Radial gradient (cyan 30% → transparent)
- App name: 36pt Bold Rounded, `textPrimary`
- Tagline: `bodyLarge`, `textSecondary`
- Loading spinner: `accentPrimary` tint

**Accessibility:**
- ✅ VoiceOver: "Litplan loading. App is starting"
- ✅ Not interactive (no buttons during launch)
- ✅ Short duration (1.5s total)

**Do's:**
- ✅ Keep duration short (1.5s total)
- ✅ Show loading indicator
- ✅ Transition smoothly to HomeView

**Don'ts:**
- ❌ Don't extend duration beyond 2s (poor UX)
- ❌ Don't skip animation (appears janky)
- ❌ Don't make interactive (not a splash screen)

---

### 16. DetailedGroupFlowView

**File:** `/Litplan/Views/DetailedGroupFlowView.swift`

**Purpose:** Full-screen detailed view of group flow itinerary with map, timeline, and venue details, shown when tapping "View Full Itinerary" on GroupFlowCard.

**Props:**
- `groupFlow: GroupFlow` - Group flow data model
- `onDismiss: () -> Void` - Dismiss handler

**Code Example:**
```swift
.sheet(isPresented: $showDetailedFlow) {
    DetailedGroupFlowView(
        groupFlow: selectedGroupFlow
    ) {
        showDetailedFlow = false
    }
}
```

**Visual Structure:**
```
┌─────────────────────────────────┐
│  [X]  Rooftop & Speakeasy Exp   │  ← Header with close
├─────────────────────────────────┤
│  [Map showing all venues]       │  ← Map view (optional)
├─────────────────────────────────┤
│  ① 8:00 PM • 90 minutes         │
│     Rooftop Bar                 │
│     📍 123 W 57th St            │
│     Start your night with...    │
│     [View on Map]               │
│                                 │
│  ② 10:00 PM • 60 minutes        │
│     Speakeasy                   │
│     📍 456 E 52nd St            │
│     Hidden cocktail lounge...   │
│     [View on Map]               │
│                                 │
│  ③ 11:30 PM • 120 minutes       │
│     Rooftop Club                │
│     📍 789 Park Ave             │
│     End the night dancing...    │
│     [View on Map]               │
├─────────────────────────────────┤
│  ⏱ 4.5h total  💵 $100-150 est  │
│  [Start Navigation]             │
└─────────────────────────────────┘
```

**Specifications:**
- Full-screen sheet
- Map view: Shows all venue pins (if MapKit integrated)
- Timeline: Full details for each activity
- Venue cards: Address, description, images
- Footer: Total duration, cost, navigation CTA

**Accessibility:**
- ✅ VoiceOver: Each activity is separately navigable
- ✅ Close button: "Close" label
- ✅ Map accessible via VoiceOver (if available)
- ✅ Dynamic Type: All text scales

**Do's:**
- ✅ Show full venue details (address, hours, description)
- ✅ Display map when available
- ✅ Provide navigation CTA

**Don'ts:**
- ❌ Don't hide venue addresses (users need to navigate)
- ❌ Don't omit duration/cost estimates

---

### 17. HomeView

**File:** `/Litplan/Views/HomeView.swift`

**Purpose:** Main entry screen with city discovery, recently viewed cities, and tab navigation.

**Structure:**
```
┌─────────────────────────────────┐
│  Discover Your Night            │  ← Display title
├─────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  │  ← City card carousel
│  │ NYC  │  │  LA  │  │Tokyo │  │
│  └──────┘  └──────┘  └──────┘  │
│                                 │
│  Recently Viewed                │
│  ┌─────────────────────────┐   │  ← Viewed city list
│  │ [Thumb] NYC      2h  ›  │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ [Thumb] London   1d  ›  │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
│ Home    Search    Profile      │  ← Tab bar
```

**See also:** HomeView is too complex for this catalog. Refer to `/Litplan/Views/HomeView.swift` for full implementation.

---

## Quick Reference

### Component Selection Guide

**Need a button?**
- Primary action (Subscribe, Confirm) → `PrimaryButton`
- Secondary action (Cancel, Maybe Later) → `SecondaryButton`
- Inline link (Terms, Restore) → `TertiaryButton`

**Need a card?**
- Generic content → `StandardCard`
- City discovery → `CityCardStack`
- Plan details → `ExpandedCardView`
- Multi-venue itinerary → `GroupFlowCard`
- Viewing history → `ViewedCityCard`

**Need a state?**
- Loading data → `LoadingStateView`
- No content → `EmptyStateView`
- Error occurred → `ErrorStateView`

**Need feedback?**
- Success/info/warning → `ToastView`
- Critical error → `ErrorStateView`

**Need an image?**
- Any remote image → `AsyncImageView`

**Need a modal?**
- Subscription → `PaywallView`
- Itinerary details → `DetailedGroupFlowView`
- App startup → `LaunchScreenView`

### File Paths Quick Access

```
Buttons:
- /Litplan/Components/PrimaryButton.swift
- /Litplan/Components/SecondaryButton.swift
- /Litplan/Components/TertiaryButton.swift

Cards:
- /Litplan/Components/StandardCard.swift
- /Litplan/Components/CityCardStack.swift
- /Litplan/Components/ExpandedCardView.swift
- /Litplan/Components/GroupFlowCard.swift
- /Litplan/Components/ViewedCityCard.swift

States:
- /Litplan/Components/LoadingStateView.swift
- /Litplan/Components/EmptyStateView.swift
- /Litplan/Components/ErrorStateView.swift

Notifications:
- /Litplan/Components/ToastView.swift

Media:
- /Litplan/Components/AsyncImageView.swift

Views:
- /Litplan/Views/PaywallView.swift
- /Litplan/Views/LaunchScreenView.swift
- /Litplan/Views/DetailedGroupFlowView.swift
- /Litplan/Views/HomeView.swift
```

---

## Version History

**v1.0.0** - December 28, 2025
- Initial component catalog
- 17 components documented with examples
- Complete prop documentation
- Accessibility notes for all components
- Do's and don'ts for each component

---

**Document Status:** COMPLETE
**Last Reviewed:** December 28, 2025
**Next Review:** Before v1.1.0 component additions
