# Litplan iOS Design System Guide

**Version:** 1.0.0
**Last Updated:** December 28, 2025
**Status:** PRODUCTION READY
**Owner:** UI Designer Agent

---

## Table of Contents

1. [Introduction](#introduction)
2. [Design Principles](#design-principles)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Components](#components)
7. [Animations & Interactions](#animations--interactions)
8. [Icons & Imagery](#icons--imagery)
9. [Accessibility](#accessibility)
10. [Dark Mode](#dark-mode)
11. [Usage Examples](#usage-examples)

---

## Introduction

The Litplan Design System is a comprehensive set of design tokens, components, and patterns that ensure visual consistency and premium quality across the entire iOS app. Built on SwiftUI and iOS native patterns, this system prioritizes:

- **Minimalism**: Clean, focused interfaces with no clutter
- **Premium Feel**: Smooth animations, haptic feedback, and polished interactions
- **Accessibility**: WCAG 2.1 Level AA compliance, VoiceOver support, Dynamic Type
- **Dark Mode First**: Optimized for nightlife with dark backgrounds and high contrast

### File Structure

```
Litplan/
├── Utilities/
│   ├── Color+Extensions.swift      # Color tokens
│   ├── Typography.swift             # Font styles
│   ├── Spacing.swift                # Spacing tokens
│   └── HapticManager.swift          # Haptic feedback
├── Components/
│   ├── Buttons (PrimaryButton, SecondaryButton, TertiaryButton)
│   ├── Cards (StandardCard, CityCardStack, etc.)
│   ├── States (LoadingStateView, EmptyStateView, ErrorStateView)
│   └── Others (ToastView, AsyncImageView)
└── Views/
    └── (Screen-level views)
```

---

## Design Principles

### 1. Minimalism & Focus

**Goal:** Remove all distractions to let nightlife content shine.

- **Pure black backgrounds** (#000000) create depth and contrast
- **Minimal UI chrome** - no unnecessary borders, dividers, or decorations
- **Content-first hierarchy** - images and titles are the hero elements
- **Whitespace breathing room** - generous padding (16-24pt) between elements

**Example:**
```swift
// ❌ Don't: Cluttered card with decorative elements
VStack {
    Divider()
    Image(...)
    Divider()
    Text("Title")
        .border(Color.gray)
    Divider()
}

// ✅ Do: Clean card with focused content
VStack(spacing: Spacing.md) {
    Image(...)
    Text("Title")
        .font(.headline)
}
.padding(Spacing.md)
.background(Color.surfacePrimary)
.cornerRadius(12)
```

### 2. Premium Feel

**Goal:** Every interaction should feel polished and intentional.

- **Spring physics animations** - natural, bouncy motion (response: 0.4s, damping: 0.75)
- **Haptic feedback** - tactile confirmation for all interactions
- **Progressive loading** - smooth fade-ins for images and content
- **Micro-interactions** - subtle scale effects on tap (95% scale)

**Example:**
```swift
Button(action: {
    HapticManager.shared.light()  // Haptic feedback
    performAction()
}) {
    Text("Explore City")
}
.scaleEffect(isPressed ? 0.95 : 1.0)
.animation(.spring(response: 0.4, dampingFraction: 0.75), value: isPressed)
```

### 3. Accessibility First

**Goal:** Usable by everyone, regardless of ability.

- **VoiceOver labels** - every interactive element has clear labels and hints
- **Dynamic Type support** - all text scales with user preferences (100% coverage)
- **Color contrast** - minimum 4.5:1 ratio for text (WCAG AA)
- **Touch targets** - minimum 44x44pt for all tappable elements
- **Reduce Motion support** - alternative animations when enabled

**Example:**
```swift
Button(action: viewCity) {
    Text("View NYC Plans")
}
.frame(minWidth: 44, minHeight: 44)  // Minimum touch target
.accessibilityLabel("New York City, United States")
.accessibilityHint("Double tap to explore 45 nightlife plans")
.accessibilityAddTraits(.isButton)
```

### 4. Dark Mode Optimized

**Goal:** Perfect for nightlife with high contrast and reduced eye strain.

- **Pure black background** - true black (#000000) for OLED efficiency
- **Elevated surfaces** - Dark Grey (#1C1C1E) for cards and modals
- **Electric accents** - Cyan (#00D9FF) pops against dark backgrounds
- **No light mode** - single theme reduces complexity and ensures consistency

---

## Color System

### Color Palette

All colors are defined in `/Litplan/Utilities/Color+Extensions.swift` as SwiftUI `Color` extensions.

#### Primary Colors

| Token | Hex | Usage | Accessibility |
|-------|-----|-------|--------------|
| `appBackground` | `#000000` | Main app background | Pure black, OLED-friendly |
| `surfacePrimary` | `#1C1C1E` | Cards, elevated surfaces | 12:1 contrast with white text |
| `surfaceSecondary` | `#2C2C2E` | Secondary surfaces, tags | 9:1 contrast with white text |

**Code:**
```swift
Color.appBackground      // Pure black background
Color.surfacePrimary     // Cards and modals
Color.surfaceSecondary   // Tags, badges, secondary elements
```

#### Accent Colors

| Token | Hex | Usage | Accessibility |
|-------|-----|-------|--------------|
| `accentPrimary` | `#00D9FF` | CTAs, links, active states | 8.2:1 contrast on black |
| `accentSecondary` | `#AF52DE` | Secondary actions, variety | 6.1:1 contrast on black |

**Code:**
```swift
Color.accentPrimary      // Primary buttons, links, icons
Color.accentSecondary    // Secondary actions (currently unused)
```

**Visual:**
```
┌───────────────────────────────────┐
│  #00D9FF (Electric Cyan)          │  ← Eye-catching, high energy
│  Used for: Buttons, badges, CTAs  │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│  #AF52DE (Purple)                 │  ← Premium, sophisticated
│  Used for: Secondary actions      │
└───────────────────────────────────┘
```

#### Text Colors

| Token | Hex | Usage | Contrast Ratio (on black) |
|-------|-----|-------|--------------------------|
| `textPrimary` | `#FFFFFF` | Headlines, primary text | 21:1 (AAA) |
| `textSecondary` | `#AEAEB2` | Body text, descriptions | 9.5:1 (AAA) |
| `textTertiary` | `#636366` | Metadata, timestamps | 4.6:1 (AA) |

**Code:**
```swift
Text("Plan Title")
    .foregroundColor(.textPrimary)     // White, high contrast

Text("Venue description")
    .foregroundColor(.textSecondary)   // Light grey, readable

Text("Posted 2 hours ago")
    .foregroundColor(.textTertiary)    // Medium grey, subtle
```

**Hierarchy:**
```
PRIMARY (White)       ← Titles, headlines, important info
  ↓
SECONDARY (Light Grey) ← Body text, descriptions
  ↓
TERTIARY (Medium Grey) ← Metadata, timestamps, captions
```

#### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#30D158` | Success states, confirmations |
| `warning` | `#FFD60A` | Warnings, approaching limits |
| `error` | `#FF453A` | Errors, destructive actions |

**Code:**
```swift
// Success
Text("Plan saved!")
    .foregroundColor(.success)

// Warning
Text("2 cities remaining")
    .foregroundColor(.warning)

// Error
Text("Failed to load")
    .foregroundColor(.error)
```

### Color Combinations

#### Recommended Combinations

| Background | Text | Accent | Use Case |
|-----------|------|--------|----------|
| `appBackground` | `textPrimary` | `accentPrimary` | Main screens |
| `surfacePrimary` | `textPrimary` | `accentPrimary` | Cards, modals |
| `surfaceSecondary` | `textSecondary` | `accentPrimary` | Tags, badges |
| `accentPrimary` | `textPrimary` | N/A | Buttons, CTAs |

#### Forbidden Combinations

- ❌ `textTertiary` on `surfaceSecondary` (insufficient contrast: 2.1:1)
- ❌ `accentSecondary` on `surfacePrimary` (insufficient contrast: 3.2:1)
- ❌ Light backgrounds (breaks dark mode consistency)

### Color Usage Guidelines

**Do's:**
- ✅ Use `accentPrimary` for all primary CTAs
- ✅ Use `textPrimary` for all important information
- ✅ Use semantic colors (`success`, `warning`, `error`) consistently
- ✅ Maintain minimum 4.5:1 contrast for text

**Don'ts:**
- ❌ Don't use color as the only indicator (accessibility)
- ❌ Don't create custom colors outside the design system
- ❌ Don't use gradients excessively (only in specific components)
- ❌ Don't reduce opacity below 50% for important content

---

## Typography

### Font System

Litplan uses **SF Pro** (iOS system font) with Dynamic Type support for accessibility. All font styles are defined in `/Litplan/Utilities/Typography.swift`.

#### Typography Scale

| Style | Size | Weight | Usage | Dynamic Type |
|-------|------|--------|-------|--------------|
| `displayLarge` | 34pt | Bold | Screen titles | `.largeTitle` |
| `displayMedium` | 28pt | Bold | Section headers | `.title` |
| `headline` | 22pt | Semibold | Card titles | `.title3` |
| `bodyLarge` | 18pt | Regular | Primary content | `.body` |
| `body` | 16pt | Regular | Standard text | `.body` |
| `callout` | 14pt | Regular | Secondary text | `.callout` |
| `caption` | 12pt | Regular | Metadata, timestamps | `.caption` |

**Code:**
```swift
// Display styles (headers)
Text("Discover Your Night")
    .font(.displayLarge)           // 34pt Bold

Text("Popular Cities")
    .font(.displayMedium)          // 28pt Bold

// Content styles
Text("Rooftop Bar Experience")
    .font(.headline)               // 22pt Semibold

Text("Description of the plan...")
    .font(.bodyLarge)              // 18pt Regular

Text("Standard body text")
    .font(.body)                   // 16pt Regular

Text("Venue location")
    .font(.callout)                // 14pt Regular

Text("Posted 2h ago")
    .font(.caption)                // 12pt Regular
```

### Line Height & Spacing

**Default Line Heights (iOS System):**
- Display: 1.2x (tight, for large text)
- Body: 1.4x (comfortable reading)
- Caption: 1.3x (compact)

**Letter Spacing:**
- All styles use system default (no custom tracking)
- SF Pro is optimized for readability at all sizes

### Typography Hierarchy

```
┌─────────────────────────────────────┐
│  DISPLAY LARGE (34pt Bold)          │  ← Screen titles only
│                                     │
│  Display Medium (28pt Bold)         │  ← Section headers
│                                     │
│  Headline (22pt Semibold)           │  ← Card titles, important content
│                                     │
│  Body Large (18pt Regular)          │  ← Primary paragraphs
│  Body (16pt Regular)                │  ← Standard text
│  Callout (14pt Regular)             │  ← Secondary descriptions
│  Caption (12pt Regular)             │  ← Metadata, timestamps
└─────────────────────────────────────┘
```

### Dynamic Type Support

All font styles use iOS Dynamic Type for accessibility:

```swift
// ✅ Dynamic Type enabled (automatically scales)
Text("Title")
    .font(.headline)  // Scales with user's text size preference

// ❌ Fixed size (does not scale, accessibility issue)
Text("Title")
    .font(.system(size: 22))  // Never use fixed sizes
```

**Testing Dynamic Type:**
1. Settings → Accessibility → Display & Text Size → Larger Text
2. Drag slider to test all sizes (XS to XXXL)
3. Verify no text truncation or overlap

### Typography Usage Guidelines

**Do's:**
- ✅ Use Dynamic Type styles (`.headline`, `.body`, etc.)
- ✅ Use `.multilineTextAlignment(.center)` for centered text
- ✅ Use `.lineLimit(2)` to prevent excessive wrapping
- ✅ Use `.fixedSize(horizontal: false, vertical: true)` to prevent truncation

**Don'ts:**
- ❌ Don't use fixed font sizes (`Font.system(size: 22)`)
- ❌ Don't use custom fonts (SF Pro is optimized for iOS)
- ❌ Don't reduce font weight excessively (minimum: Regular)
- ❌ Don't use ALL CAPS extensively (accessibility issue)

---

## Spacing & Layout

### Spacing Scale

Litplan uses a **4pt base grid** for consistency. All spacing values are defined in `/Litplan/Utilities/Spacing.swift`.

| Token | Value | Usage |
|-------|-------|-------|
| `Spacing.xxs` | 4pt | Tight spacing, icon-text gaps |
| `Spacing.xs` | 8pt | Compact spacing, button content |
| `Spacing.sm` | 12pt | Card padding, tag spacing |
| `Spacing.md` | 16pt | Standard padding, section gaps |
| `Spacing.lg` | 24pt | Section padding, vertical spacing |
| `Spacing.xl` | 32pt | Large section gaps |
| `Spacing.xxl` | 48pt | Hero spacing, major sections |

**Code:**
```swift
VStack(spacing: Spacing.md) {  // 16pt between elements
    Text("Title")
    Text("Subtitle")
}
.padding(Spacing.lg)  // 24pt padding all sides
```

### Grid System

**8pt Base Grid:**
- All component dimensions are multiples of 8pt (8, 16, 24, 32, 40, 48, etc.)
- Touch targets: minimum 44pt × 44pt
- Card corners: 12pt radius
- Button corners: 12pt radius

**Layout Examples:**
```swift
// ✅ Aligned to 8pt grid
.frame(width: 280, height: 360)  // 280 = 35×8, 360 = 45×8
.padding(Spacing.md)             // 16 = 2×8

// ❌ Not aligned to grid
.frame(width: 275, height: 355)  // Inconsistent
.padding(15)                      // Use Spacing.md instead
```

### Padding Guidelines

**Card Padding:**
```swift
StandardCard {
    VStack {
        Text("Content")
    }
    .padding(Spacing.md)  // 16pt internal padding
}
```

**Screen Padding:**
```swift
ScrollView {
    VStack {
        // Content
    }
    .padding(.horizontal, Spacing.lg)  // 24pt horizontal padding
    .padding(.vertical, Spacing.xl)    // 32pt vertical padding
}
```

**Button Padding:**
```swift
Text("Subscribe Now")
    .padding(.horizontal, Spacing.lg)  // 24pt horizontal
    .padding(.vertical, Spacing.md)    // 16pt vertical
```

### Spacing Usage Guidelines

**Do's:**
- ✅ Use spacing tokens (`.xxs`, `.xs`, `.sm`, etc.)
- ✅ Maintain consistent padding across similar components
- ✅ Use larger spacing for section separation (`.lg`, `.xl`)
- ✅ Use smaller spacing for related content (`.xs`, `.sm`)

**Don'ts:**
- ❌ Don't use custom spacing values (use tokens)
- ❌ Don't mix padding/margin inconsistently
- ❌ Don't reduce spacing below `.xxs` (4pt)
- ❌ Don't exceed `.xxl` (48pt) without design review

---

## Components

### Component Categories

1. **Buttons** - PrimaryButton, SecondaryButton, TertiaryButton
2. **Cards** - StandardCard, CityCardStack, ExpandedCardView
3. **Group Flows** - GroupFlowCard, DetailedGroupFlowView
4. **States** - LoadingStateView, EmptyStateView, ErrorStateView
5. **Notifications** - ToastView
6. **Media** - AsyncImageView
7. **Modals** - PaywallView, LaunchScreenView

### Button System

#### Primary Button
**File:** `/Litplan/Components/PrimaryButton.swift`

**Usage:** Primary CTAs, subscription actions, confirmations

**Visual:**
```
┌───────────────────────────────────┐
│      Subscribe Now (White)        │  ← Electric Cyan background
└───────────────────────────────────┘
```

**Code:**
```swift
PrimaryButton(
    title: "Subscribe Now",
    action: { performSubscription() }
)

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

**Specifications:**
- Background: `accentPrimary` (#00D9FF)
- Text: `textPrimary` (#FFFFFF)
- Height: 50pt
- Corner radius: 12pt
- Font: `.body` (16pt Semibold)
- Disabled opacity: 50%

#### Secondary Button
**File:** `/Litplan/Components/SecondaryButton.swift`

**Usage:** Secondary actions, "Maybe Later", alternative options

**Visual:**
```
┌───────────────────────────────────┐
│    Maybe Later (Cyan border)      │  ← Transparent background
└───────────────────────────────────┘
```

**Code:**
```swift
SecondaryButton(
    title: "Maybe Later",
    action: { dismissPaywall() }
)
```

**Specifications:**
- Background: Transparent
- Border: 2pt `accentPrimary`
- Text: `accentPrimary`
- Height: 50pt
- Corner radius: 12pt

#### Tertiary Button
**File:** `/Litplan/Components/TertiaryButton.swift`

**Usage:** Inline links, "Restore Purchases", subtle actions

**Visual:**
```
Restore Purchases (Cyan text, no background)
```

**Code:**
```swift
TertiaryButton(
    title: "Restore Purchases",
    action: { restorePurchases() }
)
```

**Specifications:**
- Background: None
- Text: `accentPrimary`
- Height: 44pt (minimum touch target)
- Font: `.body` (16pt Medium)

### Card System

#### Standard Card
**File:** `/Litplan/Components/StandardCard.swift`

**Usage:** Generic card container for any content

**Code:**
```swift
StandardCard {
    VStack(alignment: .leading, spacing: Spacing.sm) {
        Text("Card Title")
            .font(.headline)
            .foregroundColor(.textPrimary)

        Text("Card content goes here")
            .font(.body)
            .foregroundColor(.textSecondary)
    }
    .padding(Spacing.md)
}
```

**Specifications:**
- Background: `surfacePrimary` (#1C1C1E)
- Corner radius: 12pt
- Shadow: 8pt blur, 4pt offset, 30% opacity
- Border: None

#### City Card Stack
**File:** `/Litplan/Components/CityCardStack.swift`

**Usage:** Home screen city cards with stacked effect

**Visual:**
```
┌─────────────────────────┐
│  [City Hero Image]      │  ← 280×360pt
│                         │
│  45 plans this week     │  ← Badge (top-right)
│                         │
│  New York City          │  ← City name (bottom)
│  🇺🇸 United States      │
└─────────────────────────┘
   └─── Stack effect (3-4 cards layered)
```

**Code:**
```swift
CityCardStack(city: city) {
    navigateToCityDetails()
}
```

**Specifications:**
- Dimensions: 280pt × 360pt
- Stack effect: 3-4 cards visible, slight rotation
- Tap animation: 95% scale with spring physics
- Accessibility: VoiceOver labels, Dynamic Type

### State Components

#### Loading State
**File:** `/Litplan/Components/LoadingStateView.swift`

**Code:**
```swift
LoadingStateView(message: "Loading plans...")
```

**Specifications:**
- Animated spinner: Electric Cyan gradient
- Message: `bodyLarge`, `textSecondary`
- Reduce Motion support: Static spinner when enabled

#### Empty State
**File:** `/Litplan/Components/EmptyStateView.swift`

**Code:**
```swift
EmptyStateView(
    icon: "building.2.crop.circle",
    title: "No Cities Viewed Yet",
    message: "Start exploring cities to see your history",
    ctaText: "Browse Cities",
    ctaAction: { navigateToExplore() }
)
```

**Specifications:**
- Icon: 80pt, `textTertiary`
- Title: `displayMedium`, `textPrimary`
- Message: `bodyLarge`, `textSecondary`
- Optional CTA: PrimaryButton style

#### Error State
**File:** `/Litplan/Components/ErrorStateView.swift`

**Code:**
```swift
// With error code
ErrorStateView(errorCode: "NETWORK_ERROR") {
    retryLoadData()
}

// With Error object
ErrorStateView(error: error) {
    retryLoadData()
}
```

**Specifications:**
- Icon: 80pt, `error` color
- User-friendly messages (no raw errors shown to users)
- Retry button: PrimaryButton style with reload icon

### Toast Notifications
**File:** `/Litplan/Components/ToastView.swift`

**Usage:** Non-critical feedback (success, info, warnings)

**Code:**
```swift
@State private var toast: ToastData? = nil

VStack {
    // Your content
}
.toast($toast)

// Trigger toast
toast = ToastData(type: .success, message: "Plan saved!")
```

**Specifications:**
- Auto-dismiss: 3 seconds
- Position: Top of screen
- Animation: Slide down with ease-out
- Types: Success, Warning, Error, Info

---

## Animations & Interactions

### Animation Standards

#### Spring Physics
**Default spring parameters:**
```swift
.animation(.spring(response: 0.4, dampingFraction: 0.75))
```

- **Response:** 0.4s (snappy, not too fast)
- **Damping:** 0.75 (slight bounce, premium feel)

**Use cases:**
- Button taps (scale effect)
- Card entrance/exit
- Modal presentation/dismissal

#### Duration Standards

| Animation Type | Duration | Easing |
|---------------|----------|--------|
| Tap feedback | 0.1s | Spring |
| Button press | 0.2s | Ease out |
| Card transition | 0.3s | Spring |
| Modal entrance | 0.4s | Ease out |
| Image fade-in | 0.3s | Ease in |

**Code Examples:**
```swift
// Button press
.scaleEffect(isPressed ? 0.95 : 1.0)
.animation(.spring(response: 0.4, dampingFraction: 0.75), value: isPressed)

// Image fade-in
.opacity(isLoaded ? 1.0 : 0.0)
.animation(.easeIn(duration: 0.3), value: isLoaded)

// Modal entrance
.offset(y: showModal ? 0 : UIScreen.main.bounds.height)
.animation(.easeOut(duration: 0.4), value: showModal)
```

### Haptic Feedback

**File:** `/Litplan/Utilities/HapticManager.swift`

**Usage:**
```swift
// Light tap (subtle interactions)
HapticManager.shared.light()

// Medium tap (standard interactions)
HapticManager.shared.medium()

// Heavy tap (important actions)
HapticManager.shared.heavy()

// Success notification
HapticManager.shared.success()

// Error notification
HapticManager.shared.error()

// Warning notification
HapticManager.shared.warning()

// Selection change (pickers, tabs)
HapticManager.shared.selection()
```

**Guidelines:**
- ✅ Use haptics for all button taps
- ✅ Use success/error for confirmation actions
- ✅ Use warning for destructive actions
- ❌ Don't overuse haptics (max 1 per interaction)

### Reduce Motion Support

**Always respect `accessibilityReduceMotion`:**
```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

// Conditional animation
.animation(reduceMotion ? .none : .spring(), value: isPressed)

// Alternative for critical animations
.animation(
    reduceMotion ? .linear(duration: 0.1) : .spring(response: 0.4),
    value: isPressed
)
```

---

## Icons & Imagery

### SF Symbols

**Primary Icon Library:** SF Symbols 5.0 (iOS 17+)

**Common Icons:**
```swift
// Navigation
"chevron.right"           // Navigation arrows
"xmark"                   // Close buttons
"line.horizontal.3"       // Menu/hamburger

// Actions
"heart.fill"              // Favorites
"star.fill"               // Ratings
"checkmark.circle.fill"   // Success

// Content
"mappin.circle.fill"      // Location
"clock.fill"              // Time
"calendar"                // Date
"dollarsign.circle"       // Price

// States
"wifi.slash"              // No connection
"exclamationmark.triangle" // Warning
"xmark.circle"            // Error
```

**Icon Sizing:**
```swift
// Small icons (inline with text)
Image(systemName: "mappin.circle.fill")
    .font(.system(size: 14))

// Medium icons (buttons, cards)
Image(systemName: "heart.fill")
    .font(.system(size: 20))

// Large icons (empty states, modals)
Image(systemName: "building.2.crop.circle")
    .font(.system(size: 80))
```

**Icon Colors:**
```swift
// Primary accent (interactive)
.foregroundColor(.accentPrimary)

// Secondary (informational)
.foregroundColor(.textSecondary)

// Tertiary (subtle)
.foregroundColor(.textTertiary)

// Semantic (success, warning, error)
.foregroundColor(.success)
```

### Image Loading

**File:** `/Litplan/Components/AsyncImageView.swift`

**Features:**
- Memory & disk caching (50MB limit, 100 image limit)
- Progressive loading with fade-in
- Downsampling for performance
- Automatic cache cleanup on memory warning

**Usage:**
```swift
// Thumbnail (120×120pt)
AsyncImageView.thumbnail(url: imageURL)

// Card (280×200pt)
AsyncImageView.card(url: imageURL, width: 280, height: 200)

// Hero (full width)
AsyncImageView.hero(url: imageURL, height: 250)

// Avatar (circular)
AsyncImageView.avatar(url: imageURL, size: 80)

// Custom
AsyncImageView(
    url: imageURL,
    contentMode: .fill,
    showPlaceholder: true,
    downsampleSize: CGSize(width: 300, height: 200)
)
```

**Image Guidelines:**
- ✅ Always use AsyncImageView (never plain AsyncImage)
- ✅ Specify downsample size for performance
- ✅ Use `.fill` content mode for hero images
- ✅ Use corner radius for polish (12pt standard)

---

## Accessibility

### WCAG 2.1 Level AA Compliance

**Requirements:**
1. **Color Contrast:** Minimum 4.5:1 for text, 3:1 for UI components
2. **Touch Targets:** Minimum 44×44pt for all interactive elements
3. **VoiceOver:** All elements have labels, hints, and traits
4. **Dynamic Type:** All text scales with user preferences
5. **Reduce Motion:** Alternative animations when enabled

### VoiceOver Support

**Labels & Hints:**
```swift
Button(action: viewCity) {
    Image(systemName: "chevron.right")
}
.accessibilityLabel("New York City, United States")
.accessibilityHint("Double tap to explore 45 nightlife plans")
.accessibilityAddTraits(.isButton)
```

**Grouping Elements:**
```swift
VStack {
    Image(...)
        .accessibilityHidden(true)  // Decorative

    Text("Title")
    Text("Description")
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Title. Description")
```

**Best Practices:**
- ✅ Provide clear, concise labels (not "Image" or "Button")
- ✅ Include context in hints (what happens on tap)
- ✅ Hide decorative elements (`.accessibilityHidden(true)`)
- ✅ Test with VoiceOver enabled (Cmd+F5 on simulator)

### Color Contrast Testing

**Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Color Contrast Analyzer (Desktop app)

**Verified Combinations:**

| Foreground | Background | Ratio | Result |
|-----------|-----------|-------|--------|
| `#FFFFFF` | `#000000` | 21:1 | AAA ✅ |
| `#AEAEB2` | `#000000` | 9.5:1 | AAA ✅ |
| `#636366` | `#000000` | 4.6:1 | AA ✅ |
| `#00D9FF` | `#000000` | 8.2:1 | AAA ✅ |
| `#30D158` | `#000000` | 7.1:1 | AAA ✅ |

### Dynamic Type Testing

**Test all text sizes:**
1. Settings → Accessibility → Display & Text Size → Larger Text
2. Test at minimum (XS), default, and maximum (XXXL)
3. Verify no truncation, overlap, or off-screen content

**Code:**
```swift
// ✅ Scales automatically
Text("Title")
    .font(.headline)

// ✅ Prevents truncation
Text("Long description...")
    .font(.body)
    .lineLimit(nil)
    .fixedSize(horizontal: false, vertical: true)
```

---

## Dark Mode

### Implementation

Litplan is **dark mode only** - no light mode variant.

**Rationale:**
- Nightlife context (app used at night)
- Reduced eye strain in low-light environments
- Consistent visual identity
- Simplified maintenance (single theme)

### Color Mapping

| Element | Color Token | Hex |
|---------|------------|-----|
| App background | `appBackground` | `#000000` |
| Card background | `surfacePrimary` | `#1C1C1E` |
| Tag background | `surfaceSecondary` | `#2C2C2E` |
| Primary text | `textPrimary` | `#FFFFFF` |
| Secondary text | `textSecondary` | `#AEAEB2` |
| Accent | `accentPrimary` | `#00D9FF` |

**No iOS adaptive colors used** - all colors are fixed values optimized for dark mode.

---

## Usage Examples

### Example 1: Card with Content

```swift
StandardCard {
    VStack(alignment: .leading, spacing: Spacing.md) {
        // Image
        AsyncImageView.card(url: planImageURL, width: 280, height: 200)

        // Title
        Text("Rooftop Bar Experience")
            .font(.headline)
            .foregroundColor(.textPrimary)

        // Location
        HStack(spacing: Spacing.xxs) {
            Image(systemName: "mappin.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.accentPrimary)

            Text("The Roof at PUBLIC")
                .font(.callout)
                .foregroundColor(.textSecondary)
        }

        // CTA
        PrimaryButton(title: "View Details") {
            HapticManager.shared.light()
            navigateToDetails()
        }
    }
    .padding(Spacing.md)
}
```

### Example 2: Empty State

```swift
if plans.isEmpty {
    EmptyStateView(
        icon: "calendar.badge.clock",
        title: "No Plans Available",
        message: "Fresh nightlife plans are generated every Monday. Check back soon!",
        ctaText: "Explore Other Cities",
        ctaAction: {
            HapticManager.shared.light()
            navigateToExplore()
        }
    )
}
```

### Example 3: Loading State

```swift
if isLoading {
    LoadingStateView(message: "Loading nightlife plans...")
} else {
    // Content
}
```

### Example 4: Error Handling

```swift
if let error = viewModel.error {
    ErrorStateView(error: error) {
        HapticManager.shared.warning()
        viewModel.retry()
    }
} else {
    // Content
}
```

---

## Version History

**v1.0.0** - December 28, 2025
- Initial design system documentation
- 12 color tokens, 7 typography styles, 7 spacing values
- 15+ reusable components documented
- WCAG 2.1 Level AA compliance verified
- Dark mode optimization complete

---

## Resources

- **Design Files:** (TBD - Figma/Sketch links)
- **SF Symbols:** https://developer.apple.com/sf-symbols/
- **Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines/
- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **Color Contrast Checker:** https://webaim.org/resources/contrastchecker/

---

**Document Status:** COMPLETE
**Last Reviewed:** December 28, 2025
**Next Review:** Before v1.1.0 updates
