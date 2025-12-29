# UI Design Decisions Log

## Purpose
This document tracks all UI/UX design decisions made during development. Each agent should update this file when making significant design choices, creating new components, or establishing new patterns.

---

## Color Scheme Decision

**Date**: Sprint Day 1
**Decided By**: Product Manager (approved by user)
**Decision**: Electric Night theme

**Details**:
- Primary Background: Pure Black (#000000)
- Surface Primary: Dark Grey (#1C1C1E)
- Surface Secondary: Medium Grey (#2C2C2E)
- Accent Primary: Electric Cyan (#00D9FF)
- Accent Secondary: Purple (#AF52DE)

**Rationale**:
- Modern and fresh, stands out in App Store
- Perfect for nightlife theme without being too intense (vs red)
- Excellent contrast and readability
- Conveys premium, tech-forward experience
- Blue/cyan performs well in conversion tests

**Alternatives Considered**:
- Black/Grey/Red (original proposal) - felt too aggressive
- Purple Luxe - good but less unique
- Warm Social (orange/coral) - too casual for premium feel

---

## Card Stack Pattern

**Date**: Sprint Day 1 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Details**:
- Card stack offset: vertical/horizontal
- Number of visible cards in stack
- Rotation angles for depth effect
- Shadow and border specs

**Rationale**:
[To be filled by UI Designer]

**Implementation Notes**:
[To be filled by UI Designer]

---

## Card Expansion Interaction

**Date**: Sprint Day 1 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Details**:
- Expansion size: 80% screen width
- Previous/next card visibility: 10%
- Previous/next card scale: 80%
- Previous/next card opacity: 50%
- Animation: Spring (0.4s duration, 0.8 damping)
- Background dim: 50% opacity

**Rationale**:
[To be filled by UI Designer]

**Implementation Notes**:
[To be filled by UI Designer]

---

## Typography System

**Date**: Sprint Day 1 (December 26, 2025)
**Decided By**: UI Designer (per design brief)
**Decision**: SF Pro (iOS system font)
**Status**: Implemented

**Type Scale**:
- Display Large: 34pt Bold - Screen titles
- Display Medium: 28pt Bold - Section headers
- Headline: 22pt Semibold - Card titles
- Body Large: 18pt Regular - Primary content
- Body: 16pt Regular - Standard text
- Callout: 14pt Regular - Secondary text
- Caption: 12pt Regular - Metadata

**Rationale**:
- Native iOS feel
- Performance optimized
- Automatic Dynamic Type support
- Consistent with Apple HIG

**Implementation**: Created Typography.swift with extension on Font that provides static computed properties for each type style

---

## Spacing Scale

**Date**: Sprint Day 1 (December 26, 2025)
**Decided By**: UI Designer
**Decision**: 4pt base unit
**Status**: Implemented

**Scale**:
- XXS: 4pt
- XS: 8pt
- SM: 12pt
- MD: 16pt
- LG: 24pt
- XL: 32pt
- XXL: 48pt

**Rationale**:
- 4pt base aligns with iOS design patterns
- Consistent spacing creates visual harmony
- Easy to remember and apply

**Implementation**: Created Spacing.swift enum with static CGFloat constants for each size

---

## Button Components

**Date**: Sprint Day 2 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Primary Button**:
- Background: Accent color
- Text: White
- Height: 50pt
- Corner Radius: 12pt
- Font: 16pt Semibold

**Secondary Button**:
- Background: Transparent
- Border: 2pt accent color
- Text: Accent color
- Height: 50pt
- Corner Radius: 12pt

**Tertiary Button**:
- Text only, accent color
- No background or border

**Rationale**:
[To be filled by UI Designer]

---

## Tab Bar Design

**Date**: Sprint Day 1 (December 26, 2025)
**Decided By**: UI Designer
**Decision**: Standard iOS TabView with custom appearance
**Status**: Implemented

**Details**:
- Height: 83pt (includes safe area) - iOS standard
- Background: Surface Primary (#1C1C1E)
- Active state: Electric Cyan (#00D9FF) icon + label
- Inactive state: Medium grey (#636366)
- Uses SF Symbols for all icons

**Icons**:
- Tab 0 (Home/Explore): house / house.fill
- Tab 1 (Search): magnifyingglass / magnifyingglass.circle.fill
- Tab 2 (Viewed Cities): clock / clock.fill
- Tab 3 (Profile): person / person.fill

**Rationale**:
- Used SwiftUI's native TabView for best iOS integration
- Configured UITabBarAppearance for dark theme consistency
- SF Symbols provide filled/unfilled states automatically
- Electric Cyan accent creates clear visual hierarchy

**Implementation Notes**:
- Created ContentView.swift with TabView and @State for selectedTab tracking
- Configured appearance in .onAppear modifier
- Each tab has dedicated view (HomeView, SearchView, ViewedCitiesView, ProfileView)
- All placeholder views use design tokens for consistency

---

## Paywall Modal Design

**Date**: Sprint Day 3 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Details**:
- Full-screen sheet modal
- Surface primary background
- Benefits list with checkmark icons
- Large CTA button
- Close (X) button + "Maybe Later" text button
- Slide-up animation (0.35s ease-out)

**Rationale**:
[To be filled by UI Designer]

**Implementation Notes**:
[To be filled by UI Designer]

---

## Loading States & Skeletons

**Date**: Sprint Day 4 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Details**:
- Loading spinner vs skeleton screens
- Placeholder colors and animations
- Timeout duration
- Error state designs

**Rationale**:
[To be filled by UI Designer]

---

## Empty States

**Date**: Sprint Day 4 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Examples**:
- No search results: "No cities found" + illustration
- Empty Viewed Cities: "Explore cities to see them here"
- Empty Saved Cities: "Save your favorite cities"

**Rationale**:
[To be filled by UI Designer]

---

## Animation Standards

**Date**: Sprint Day 3 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Animation Types**:
- Card Expansion: Spring (0.4s, damping 0.8)
- Tab Switching: Cross-fade + slide (0.3s ease-in-out)
- Paywall Appearance: Slide-up (0.35s ease-out)
- Favorite/Save: Heart pop (0.2s ease-out)
- Pull-to-Refresh: Custom spinner

**Rationale**:
- Consistent animation language
- Smooth, premium feel
- 60fps performance target

---

## Haptic Feedback Strategy

**Date**: Sprint Day 3 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Haptic Events**:
- Button taps: Light impact
- Favorite/save: Medium impact
- Paywall trigger: Notification feedback (warning)
- Error states: Notification feedback (error)
- Success states: Notification feedback (success)

**Rationale**:
[To be filled by UI Designer]

---

## Image Loading Strategy

**Date**: Sprint Day 4 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**Details**:
- Placeholder color/design
- Loading animation (if any)
- Caching strategy
- Error fallback (broken image icon or solid color)
- Image formats: WebP or HEIC, fallback JPEG

**Rationale**:
[To be filled by UI Designer]

---

## Accessibility Decisions

**Date**: Sprint Day 5 (planned)
**Decided By**: UI Designer
**Decision**: [To be filled by UI Designer]

**VoiceOver Labels**:
- All interactive elements labeled
- Images have descriptive labels
- Buttons announce purpose

**Dynamic Type**:
- All text supports Dynamic Type
- Layouts adapt to larger sizes

**Color Contrast**:
- All text meets WCAG AA (4.5:1)
- Tested with accessibility inspector

**Rationale**:
[To be filled by UI Designer]

---

## Component Library

**Date**: Sprint Day 2+ (ongoing)
**Decided By**: UI Designer

**Components Created**:
- [ ] PrimaryButton.swift
- [ ] SecondaryButton.swift
- [ ] TertiaryButton.swift
- [ ] StandardCard.swift
- [ ] ElevatedCard.swift
- [ ] PlanCard.swift
- [ ] GroupFlowCard.swift
- [ ] CityCardStack.swift
- [ ] CustomTabBar.swift
- [ ] TopTabSwitcher.swift
- [ ] PaywallModal.swift
- [ ] LoadingSpinner.swift
- [ ] EmptyState.swift

**Notes**:
[To be filled by UI Designer as components are created]

---

## Design Deviations from Brief

**Purpose**: Document any intentional deviations from design-brief.md with rationale

### Deviation #1
**Date**: [DATE]
**Original Spec**: [What design brief said]
**New Decision**: [What was actually implemented]
**Rationale**: [Why the change was made]
**Approved By**: [PM/User approval]

---

## Pattern Library & Best Practices

### Card Patterns
[To be filled by UI Designer]

### List Patterns
[To be filled by UI Designer]

### Navigation Patterns
[To be filled by UI Designer]

### Form Patterns
[To be filled by UI Designer]

---

## Known UI Issues & Tech Debt

### Issue #1
**Description**: [Issue description]
**Impact**: Low | Medium | High
**Workaround**: [Temporary solution if any]
**Planned Fix**: [When/how to fix]
**Status**: Open | In Progress | Resolved

---

## Future UI Enhancements

### Enhancement #1
**Description**: [Feature/improvement idea]
**Priority**: Low | Medium | High
**Estimated Effort**: [Small | Medium | Large]
**Notes**: [Additional context]

---

**Instructions for UI Designer**:
- Update this file whenever you make a significant design decision
- Document component creation and patterns
- Note any deviations from the design brief
- Keep this file in sync with actual implementation

## Project Structure

**Date**: Sprint Day 1 (December 26, 2025)
**Decided By**: UI Designer
**Decision**: Clean architecture with folder separation
**Status**: Implemented

**Folder Structure**:
```
ios-app/Litplan/
├── LitplanApp.swift        # App entry point
├── ContentView.swift       # Main TabView navigation
├── Views/                  # All screen views
│   ├── HomeView.swift
│   ├── SearchView.swift
│   ├── ViewedCitiesView.swift
│   └── ProfileView.swift
├── Components/             # Reusable UI components (empty, to be filled Day 2+)
├── Models/                 # Data models (empty, to be filled Day 2+)
├── Services/               # API, data services (empty, to be filled Day 3+)
├── Utilities/              # Extensions, helpers, design tokens
│   ├── Color+Extensions.swift
│   ├── Spacing.swift
│   └── Typography.swift
└── Resources/              # Assets, images (empty)
```

**Rationale**:
- Clear separation of concerns
- Easy to navigate and maintain
- Scales well as project grows
- Follows iOS/SwiftUI best practices
- Components folder ready for reusable button, card, etc. components
- Models folder ready for City, Plan, User data structures
- Services folder ready for API integration and mock data

**Implementation Notes**:
- All folders created in Xcode project structure
- project.pbxproj references all groups correctly
- Ready for Day 2 component library development

---

**Last Updated**: December 26, 2025 by UI Designer (Sprint 1, Day 1)
