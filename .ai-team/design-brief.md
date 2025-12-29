# Litplan - Design Brief & UI Specifications

## Executive Summary
Litplan is a premium iOS app for discovering curated nightlife and social experiences across top cities worldwide. The app combines AI-powered recommendations with a sophisticated, night-themed UI that emphasizes visual discovery through card-based interactions.

---

## Color Scheme Analysis & Recommendation

### User's Initial Proposal
- **Primary**: Black background
- **Secondary**: Grey surfaces
- **Accent**: Red

### Expert UI Designer Analysis

After analyzing successful apps in the social discovery, nightlife, and premium content spaces (Spotify, Tinder, Airbnb, Superhuman, Linear), here are professional recommendations:

#### Option 1: Electric Night (RECOMMENDED)
- **Primary Background**: Pure Black (#000000) or Rich Black (#0A0A0A)
- **Surface Colors**:
  - Dark Grey #1C1C1E (cards, elevated surfaces)
  - Medium Grey #2C2C2E (secondary surfaces)
- **Accent Color**: Electric Blue (#0A84FF) or Cyan (#00D9FF)
- **Secondary Accent**: Soft Purple (#AF52DE)
- **Text**:
  - Primary: White (#FFFFFF)
  - Secondary: Light Grey (#AEAEB2)
  - Tertiary: Medium Grey (#636366)
- **Why**: Electric blue on black creates a modern, premium nightlife vibe without the aggression of red. It's eye-catching, conveys energy and excitement, and has excellent contrast for accessibility.

#### Option 2: Purple Luxe
- **Primary Background**: Pure Black (#000000)
- **Surface Colors**: Dark Grey (#1C1C1E, #2C2C2E)
- **Accent Color**: Vibrant Purple (#8B5CF6)
- **Secondary Accent**: Pink Accent (#EC4899)
- **Text**: Same as Option 1
- **Why**: Purple conveys premium, exclusive experiences (think nightclub VIP). Modern, trendy, used by apps like Twitch and Discord for community/entertainment.

#### Option 3: Warm Social
- **Primary Background**: Pure Black (#000000)
- **Surface Colors**: Dark Grey (#1C1C1E, #2C2C2E)
- **Accent Color**: Coral/Orange (#FF6B35) or Warm Orange (#FF8C42)
- **Secondary Accent**: Amber (#FFA500)
- **Text**: Same as Option 1
- **Why**: Warm tones feel inviting and social. Creates energy without being as intense as pure red.

#### Option 4: Original Red (Refined)
- **Primary Background**: Pure Black (#000000)
- **Surface Colors**: Dark Grey (#1C1C1E, #2C2C2E)
- **Accent Color**: Modern Red (#FF3B30) - iOS system red, or Crimson (#DC143C)
- **Text**: Same as Option 1
- **Why**: Red is bold, urgent, and attention-grabbing. Works if you want high energy, but can feel aggressive or overwhelming in large quantities.

### Final Recommendation
**Go with Option 1 (Electric Night)** for the following reasons:
1. Modern and fresh - stands out in the App Store
2. Perfect for nightlife without being too intense
3. Excellent contrast and readability
4. Conveys premium, tech-forward experience
5. Blue/Cyan performs well in A/B tests for conversion
6. Flexible - can be paired with purple or pink as secondary accents for variety

**Color Palette for Development:**
```swift
// Primary Colors
static let background = Color(hex: "#000000")
static let surfacePrimary = Color(hex: "#1C1C1E")
static let surfaceSecondary = Color(hex: "#2C2C2E")

// Accent Colors
static let accentPrimary = Color(hex: "#00D9FF") // Electric Cyan
static let accentSecondary = Color(hex: "#AF52DE") // Purple for variety

// Text Colors
static let textPrimary = Color(hex: "#FFFFFF")
static let textSecondary = Color(hex: "#AEAEB2")
static let textTertiary = Color(hex: "#636366")

// Semantic Colors
static let success = Color(hex: "#30D158")
static let warning = Color(hex: "#FFD60A")
static let error = Color(hex: "#FF453A")
```

---

## Design Philosophy

### Core Principles
1. **Visual-First Discovery**: Large, beautiful imagery takes center stage
2. **Effortless Navigation**: Intuitive gestures and clear hierarchy
3. **Premium & Polished**: Every interaction should feel smooth and intentional
4. **Dark & Sophisticated**: Night-optimized UI that feels like browsing for a night out
5. **Information Density**: Show rich content without clutter

### Design Inspiration Sources
- **Screenshot 1 (TripGlide)**: Card-based city exploration, smooth transitions
- **Screenshot 2**: Vertical scrolling plan lists with clean card design
- **Screenshot 3**: Detailed itinerary/schedule view with timeline
- **Screenshot 4 (Dark Social App)**: Sectioned content, card clusters, dark theme mastery

### Reference Apps for Quality Bar
- **Things 3**: Minimal, functional beauty and polish
- **Linear**: Speed, smooth animations, and modern dark UI
- **Airbnb**: Card-based discovery and high-quality imagery
- **Spotify**: Dark theme execution and music/event discovery patterns
- **Tinder**: Card deck interactions and swipe mechanics

---

## App Structure & Navigation

### Bottom Tab Bar (4 Tabs)
1. **Home (Explore)** - House icon
2. **Search** - Magnifying glass icon (center, possibly elevated)
3. **Viewed Cities** - Clock/History icon
4. **Profile** - Person icon

**Design Specs:**
- Height: 83pt (includes safe area)
- Background: Surface Primary (#1C1C1E) with subtle top border
- Active state: Accent color icon + label
- Inactive state: Medium grey (#636366)
- Smooth animation on tab switch

### Top Tab Bar (Context-Specific)
Appears after selecting a city:
- **Individual Plans**
- **Group Plans**

**Design Specs:**
- Segmented control style or custom tab switcher
- Pills or underline indicator in accent color
- Smooth transition animation between tabs

---

## Screen-by-Screen Specifications

### 1. Home Tab (Explore)

#### Top Section
- **Search Bar**:
  - 44pt height, rounded corners (12pt radius)
  - Surface secondary background
  - Magnifying glass icon left, "Search cities..." placeholder
  - Light grey text, responds to tap → navigate to Search tab

#### City Card Decks Section
**Layout Pattern (Inspired by Screenshot 1 & 4):**
- Horizontal scrolling sections, each representing a region or theme
- Section headers: "Trending This Week", "Top US Cities", "European Nights", etc.
- Each section contains city card stacks

**Card Stack Behavior:**
- Multiple cards visually stacked (offset by 8pt vertically, 4pt horizontally)
- Creates depth with 3-4 cards visible per stack
- Slight rotation on back cards (-2° to +2°) for organic feel
- Each stack represents one city

**Individual City Card:**
- **Size**: 280pt width × 360pt height
- **Image**: High-quality city nightlife photo, gradient overlay bottom-to-top (black 0% → transparent)
- **Content**:
  - City name: 28pt bold, white, bottom 60pt
  - Country flag or name: 14pt, light grey, bottom 40pt
  - Plan count badge: "12 plans this week" - small pill, top-right, accent background
- **Border**: Subtle 1pt border in dark grey (#2C2C2E)
- **Shadow**: Soft shadow for depth
- **Tap behavior**: Expand to full city view

**Expanded City Card View:**
When user taps a city stack:
- Cards expand to 80% screen width, centered
- Background dims to 50% opacity (#000000 at 0.5 alpha)
- Current card at full opacity, 100% scale
- Previous card visible on left: 10% visible, 80% scale, 50% opacity
- Next card visible on right: 10% visible, 80% scale, 50% opacity
- Horizontal swipe to navigate between plans with snap animation
- City name in bold 32pt at top center
- Close button (X) top-left to dismiss back to stack view
- Smooth spring animation (0.4s duration, ease-in-out)

**Plan Card Content (In Expanded View):**
- **Hero Image**: Full-bleed, 240pt height
- **Content Section** (white background overlay or dark card):
  - Plan Title: 22pt bold
  - Venue Name: 16pt regular, with location pin icon
  - Date & Time: 14pt, grey, with calendar icon
  - Entry Fee: 14pt, accent color if applicable
  - Tags: Pill-shaped tags (e.g., "Live Music", "Rooftop", "DJ Set")
  - CTA Button: "View Details" or "Get Directions" - accent color
  - Favorite/Save icon: Heart outline, top-right

#### Example Cities & Plans (Mock Data)
Provide 10 cities with 10 real nightlife plans each:

**Cities**: New York, Los Angeles, Miami, London, Paris, Tokyo, Berlin, Barcelona, Amsterdam, Dubai

**Example NYC Plans:**
1. "The Roof at PUBLIC" - Rooftop bar, Lower East Side
2. "Blue Note Jazz Club" - Live Jazz, Greenwich Village
3. "Le Bain at The Standard" - Nightclub, Meatpacking District
4. "Brooklyn Brewery" - Craft Beer, Williamsburg
5. "Comedy Cellar" - Stand-up Comedy, West Village
6. "House of Yes" - Immersive Performance, Bushwick
7. "The Dead Rabbit" - Cocktail Bar, Financial District
8. "Elsewhere" - Music Venue, Bushwick
9. "Bemelmans Bar" - Piano Bar, Upper East Side
10. "Nowadays" - Outdoor Dance Club, Ridgewood

(Repeat pattern for other 9 cities with authentic venues)

---

### 2. Search Tab

**Design (Full-Screen Search):**
- **Search Bar**: Large, 52pt height, prominent at top
- **Recent Searches**: Grey text, clock icons, tap to search again (only for Pro users with history)
- **Trending Cities**: Card grid below, 2 columns, smaller cards (160pt × 200pt)
- **Search Results**: As user types, show filtered city list
  - City name + country flag
  - Quick preview: "24 plans this week"
  - Tap → Navigate to City Details view

---

### 3. City Details View (After Selecting a City)

**Top Section:**
- **Hero Image**: City skyline or nightlife scene, 200pt height, parallax effect on scroll
- **City Name**: Large 34pt bold, overlaid on image with gradient
- **Back Button**: Top-left, white with subtle shadow
- **Favorite Button**: Top-right, heart icon (Pro users only)

**Top Tab Switcher:**
- Individual Plans | Group Plans
- Accent underline or pill background for active tab

#### Individual Plans Tab
**Layout (Inspired by Screenshot 2):**
- Vertical scrolling list
- Each plan = Card (full width, 16pt horizontal margins)
- **Card Design**:
  - 140pt height
  - Left: Image (120pt × 120pt, rounded 12pt)
  - Right: Content
    - Title: 18pt semibold
    - Venue: 14pt regular, grey, with pin icon
    - Date/Time: 12pt, grey
    - Tags: Small pills, horizontal scroll if needed
    - Entry fee badge: Accent color if applicable
  - Favorite icon: Top-right of card
  - Divider: 1pt grey line between cards

- **Ranking**: Show "Top 1", "Top 2" badges in accent color
- **Free Tier Limit**: After 10th card, show "Unlock 40 more plans" paywall card
- **Weekend Indicator**: Orange/amber badge for weekend plans (Pro only, greyed out for free users)

#### Group Plans Tab
**Layout:**
- Similar vertical scroll
- **Group Flow Card**:
  - Taller card: 200pt height
  - Timeline/flow visual: 2-3 connected plan thumbnails
  - "Pre-Game → Main Event → After Party" structure
  - Each step shows: small image, venue name, time
  - Arrow/line connecting steps
  - Duration: "5-hour experience"
  - CTA: "View Full Itinerary"

- **Paywall**: Free users see 3-5 group plans, then paywall

---

### 4. Viewed Cities Tab

#### Pro Users:
- **Saved Section** (Top):
  - Horizontal scrolling cards
  - Smaller city cards (140pt × 180pt)
  - Heart badge to indicate saved status
  - Tap to remove from saved

- **Recent Section** (Below):
  - Vertical list or grid (2 columns)
  - City card with timestamp: "Viewed 2 days ago"
  - Ordered by recency

#### Free Users:
- **Recent Section Only**:
  - Shows only the 1 city they viewed this week
  - Grey placeholder card: "Upgrade to Pro to save cities"
  - CTA button to paywall

---

### 5. Profile Tab

**Design:**
- **Header**:
  - Profile avatar (or iCloud account icon)
  - Name: Large 28pt
  - Email: 14pt grey
  - Subscription badge: "Pro Member" in accent color or "Free Plan" in grey

- **Sections**:
  - **Subscription**:
    - Current plan, renewal date (if Pro)
    - "Manage Subscription" button → StoreKit sheet
    - "Upgrade to Pro" CTA (if free user)

  - **Settings**:
    - Notifications toggle
    - Privacy settings
    - Terms & Privacy links

  - **About**:
    - App version
    - "Rate on App Store"
    - "Share Litplan"
    - Support/Contact

---

## Component Library

### Buttons
- **Primary CTA**: Accent color background, white text, 50pt height, 12pt rounded
- **Secondary**: Outline style, accent color border/text, transparent background
- **Tertiary**: Text only, accent color

### Cards
- **Standard Card**: Surface primary background, 12pt corner radius, subtle shadow
- **Elevated Card**: Surface secondary, 16pt corner radius, stronger shadow

### Tags/Badges
- **Tag**: 8pt vertical padding, 12pt horizontal, 16pt corner radius, surface secondary background, light grey text
- **Active Tag**: Accent background, white text

### Icons
- SF Symbols for consistency with iOS
- 20pt standard size, 24pt for tab bar

---

## Animations & Interactions

### Key Animations
1. **Card Expansion**: Spring animation (duration: 0.4s, damping: 0.8)
2. **Tab Switching**: Cross-fade with slight slide (0.3s ease-in-out)
3. **Pull-to-Refresh**: Custom spinner in accent color
4. **Paywall Appearance**: Modal slide-up with background dim (0.35s ease-out)
5. **Favorite/Save**: Heart pop animation with haptic feedback

### Gestures
- **Swipe**: Horizontal swipe on card stacks to navigate
- **Long Press**: On city card to preview or save (Pro users)
- **Pull Down**: Dismiss expanded card view
- **Double Tap**: Quick favorite/save action

---

## Paywall Design

### Trigger Points
1. Free user tries to view 11th plan
2. Free user taps weekend plan
3. Free user tries to access 2nd city in week
4. Free user taps "Save City" in Viewed Cities

### Paywall Modal
- **Design**: Full-screen sheet, surface primary background
- **Header**: "Unlock Litplan Pro"
- **Benefits List**:
  - "Unlimited cities" with checkmark icon
  - "Up to 50 plans per city"
  - "Weekend plans included"
  - "Save favorite cities"
  - "Group flow experiences"
- **Pricing**: Large, clear pricing from StoreKit
- **CTA**: Large accent button "Start Free Trial" or "Subscribe"
- **Close**: X button top-right, small "Maybe Later" text button below CTA

---

## Typography

### Font Family
**SF Pro** (iOS system font) for native iOS feel and performance

### Type Scale
- **Display Large**: 34pt, Bold - Screen titles
- **Display Medium**: 28pt, Bold - Section headers
- **Headline**: 22pt, Semibold - Card titles
- **Body Large**: 18pt, Regular - Primary content
- **Body**: 16pt, Regular - Standard text
- **Callout**: 14pt, Regular - Secondary text
- **Caption**: 12pt, Regular - Metadata, timestamps

---

## Accessibility

### Requirements
- **Color Contrast**: All text meets WCAG AA standards (4.5:1 minimum)
- **Dynamic Type**: Support system font size preferences
- **VoiceOver**: All interactive elements labeled
- **Haptic Feedback**: On key interactions (save, favorite, errors)
- **Dark Mode**: Primary theme, but verify contrast in light mode for system override

---

## Technical Specifications

### Platform
- iOS 17.0+
- SwiftUI primary, UIKit for specific needs
- iPhone optimized (iPad support future consideration)

### Assets
- Image formats: WebP or HEIC for efficiency, fallback to JPEG
- @2x and @3x assets for all graphics
- SF Symbols for icons
- Lottie for complex animations (optional)

---

## Design System Files

All designers should reference:
1. **Figma/Sketch file**: Complete UI kit with components (to be created)
2. **design-tokens.json**: Color, spacing, typography values
3. **Asset library**: Approved photos for each city/plan
4. **Icon set**: Custom icons if needed beyond SF Symbols

---

## Success Metrics (For QA/Testing)

### UI/UX Quality Benchmarks
- Card animations run at 60fps
- App launch to first content: < 2 seconds
- Image loading with smooth placeholders
- No UI jank on scroll
- Haptic feedback responsive (< 50ms)
- Transitions feel "premium" (subjective, but validated by testers)

---

## Next Steps for UI Designer

1. Create design tokens JSON file
2. Build SwiftUI component library (buttons, cards, tabs)
3. Implement Home/Explore screen with card stacks
4. Implement card expansion interaction
5. Build City Details view with tabs
6. Create paywall modal
7. Integrate with backend API specs (see backend-specs.md)

---

**Last Updated**: Sprint Day 1
**Owner**: UI Designer Agent
**Status**: Design System Approved - Ready for Implementation
