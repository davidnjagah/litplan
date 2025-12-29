# Litplan iOS App - UI Designer Agent

## Project Overview

The Litplan iOS app is a nightlife planning application that helps users discover and plan night out experiences in cities around the world. The app features AI-powered plan generation, group planning capabilities, and a subscription model with Free and Pro tiers.

## Current Status

**Sprint 2: COMPLETE** ✅
**Build Status:** SUCCESS (Zero errors, zero warnings)
**Platform:** iOS 17.0+
**Framework:** SwiftUI
**Total Files:** 25 Swift files
**Total Lines:** 5,449 lines of code

## Features Implemented

### Core Tabs
1. **Explore (Home)** - Discover trending cities and curated collections
2. **Search** - Find cities with autocomplete and popular suggestions
3. **Viewed** - History of recently viewed cities
4. **Profile** - User account and subscription management

### Key Features
- City browsing with beautiful card stacks
- AI-generated nightlife plans (10 per city)
- Group planning with friend invites and voting
- Subscription tier differentiation (Free/Pro)
- Saved cities (Pro feature)
- Settings and account management

## Design System

### Colors
- **Primary Background:** Pure Black (#000000)
- **Surface Primary:** Dark Grey (#1C1C1E)
- **Accent Primary:** Electric Cyan (#00D9FF)
- **Accent Secondary:** Purple (#AF52DE)

### Spacing
4pt base system: xxs (4), xs (8), sm (12), md (16), lg (24), xl (32), xxl (48)

### Typography
SF Pro font family with 7 defined styles from Display Large (34pt) to Caption (12pt)

## Architecture

```
Litplan/
├── Views/           # Main screens (6 views)
├── Components/      # Reusable UI (8 components)
├── Models/          # Data models (5 models)
├── Services/        # Mock data service
└── Utilities/       # Design tokens (Color, Spacing, Typography)
```

## Component Library

### Buttons
- **PrimaryButton** - Electric Cyan CTA buttons
- **SecondaryButton** - Outlined secondary actions
- **TertiaryButton** - Text-only tertiary actions

### Cards
- **StandardCard** - Base card with dark grey background
- **CityCardStack** - Horizontal scrolling city cards
- **ExpandedCardView** - Full-screen city details
- **GroupFlowCard** - Group planning cards
- **ViewedCityCard** - History item cards

## Data Models

1. **City** - City information with country, image, description
2. **Plan** - Nightlife plan with venue, time, entry fee, tags
3. **GroupFlow** - Group planning with members and voting
4. **ViewedCity** - User's city viewing history
5. **User** - User profile with subscription tier

## Mock Data

- **15 Cities** across US, Europe, Asia, and Middle East
- **150+ Plans** with diverse venues and experiences
- **Group Flows** with sample members and votes
- **Users** with Free and Pro tier examples

## Build Instructions

### Requirements
- Xcode 15.0+
- iOS 17.0+ Simulator
- macOS with Apple Silicon or Intel

### Build
```bash
cd ios-app
xcodebuild -project Litplan.xcodeproj -scheme Litplan \
  -destination 'platform=iOS Simulator,name=iPhone 17' build
```

### Run in Simulator
1. Open `Litplan.xcodeproj` in Xcode
2. Select iPhone 17 (or any iOS 17+ simulator)
3. Press Cmd+R to build and run

## Next Steps (Sprint 3)

### Backend Integration
- [ ] Implement API service layer
- [ ] Add authentication flow
- [ ] Connect to real endpoints
- [ ] Error handling and retry logic

### Navigation
- [ ] Wire up all tap actions
- [ ] Implement deep linking
- [ ] Add navigation state management
- [ ] Tab switching from search

### Data Persistence
- [ ] Add Core Data or UserDefaults
- [ ] Cache viewed cities
- [ ] Store user preferences
- [ ] Offline support

### Additional Features
- [ ] Pull to refresh
- [ ] Infinite scroll
- [ ] Filters and sorting
- [ ] Share functionality
- [ ] Haptic feedback

## File Reference

### Views (6 files)
- `HomeView.swift` (171 lines) - Explore tab
- `SearchView.swift` (TBD) - Search tab
- `ViewedCitiesView.swift` (TBD) - History tab
- `ProfileView.swift` (407 lines) - Profile tab
- `CityDetailsView.swift` (TBD) - City details
- `DetailedGroupFlowView.swift` (TBD) - Group planning

### Components (8 files)
- `PrimaryButton.swift` (76 lines)
- `SecondaryButton.swift` (TBD)
- `TertiaryButton.swift` (TBD)
- `StandardCard.swift` (166 lines)
- `CityCardStack.swift` (TBD)
- `ExpandedCardView.swift` (TBD)
- `GroupFlowCard.swift` (TBD)
- `ViewedCityCard.swift` (TBD)

### Models (5 files)
- `City.swift` - City data model
- `Plan.swift` - Nightlife plan model
- `GroupFlow.swift` - Group planning model
- `ViewedCity.swift` - Viewing history model
- `User.swift` (104 lines) - User profile model

### Utilities (3 files)
- `Color+Extensions.swift` (80 lines)
- `Spacing.swift` (34 lines)
- `Typography.swift` (37 lines)

## Design Decisions

### Why SwiftUI?
- Modern, declarative UI framework
- Native iOS performance
- Easy previews and iteration
- Built-in dark mode support

### Why Mock Data?
- Rapid UI development without backend dependencies
- Consistent testing data
- Easy to demonstrate all features
- Simple to replace with real API calls

### Why Component-First?
- Maximizes code reuse
- Ensures design consistency
- Simplifies maintenance
- Enables rapid prototyping

## Contact

**Agent:** UI Designer
**Sprint:** Sprint 2 (Complete)
**Last Updated:** December 28, 2025

---

For detailed daily progress, see `DAILY_LOG.md`
For Sprint 2 summary, see `SPRINT_2_SUMMARY.md`
