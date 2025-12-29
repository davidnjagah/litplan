# Litplan iOS Design Handoff Guide

**Version:** 1.0.0
**Last Updated:** December 28, 2025
**Purpose:** Designer onboarding and design-to-development handoff
**Audience:** Future designers, design contractors, design team

---

## Table of Contents

1. [Welcome](#welcome)
2. [Design Philosophy](#design-philosophy)
3. [Getting Started](#getting-started)
4. [Design Files & Resources](#design-files--resources)
5. [Design Workflow](#design-workflow)
6. [Component Library](#component-library)
7. [Design QA Checklist](#design-qa-checklist)
8. [Developer Handoff Process](#developer-handoff-process)
9. [Brand Guidelines](#brand-guidelines)
10. [Collaboration & Feedback](#collaboration--feedback)

---

## Welcome

Welcome to the Litplan design team! This guide will help you understand our design system, workflow, and how to contribute effectively to the iOS app.

### What is Litplan?

Litplan is a nightlife discovery app that provides curated plans for bars, clubs, rooftops, and group experiences in 20+ cities worldwide. We're building a premium, minimalist experience optimized for dark mode with a focus on accessibility and polish.

### Design Team Structure

**Current State (v1.0.0):**
- UI Designer Agent (AI): Core design system, component library
- Product team: Vision, roadmap, user research

**Future State (v1.1+):**
- Lead Designer: Design system ownership, team leadership
- UI Designers: Feature design, iteration
- Researchers: User testing, data analysis

---

## Design Philosophy

### Core Principles

#### 1. Minimalism & Focus
**"Remove everything that doesn't help the user find their night."**

- **Pure black backgrounds** create depth and let content shine
- **No decorative elements** - every pixel serves a purpose
- **Content-first hierarchy** - images and titles are heroes
- **Generous whitespace** - breathing room between elements

**Example:**
```
❌ Don't: Busy card with decorative borders, dividers, unnecessary icons
✅ Do: Clean card with hero image, title, essential info only
```

#### 2. Premium Feel
**"Every interaction should feel polished and intentional."**

- **Spring physics animations** - natural, bouncy motion
- **Haptic feedback** - tactile confirmation for every tap
- **Progressive loading** - smooth fade-ins, no jarring pops
- **Micro-interactions** - subtle scale effects, hover states

**Example:**
```
Button tap → 95% scale with spring physics + haptic feedback
Image load → Fade in 0.3s + subtle glow effect
```

#### 3. Accessibility First
**"If it's not accessible, it's not done."**

- **WCAG 2.1 Level AA** - 4.5:1 contrast minimum
- **VoiceOver support** - every element has clear labels
- **Dynamic Type** - all text scales with user preferences
- **Touch targets** - 44×44pt minimum for all interactive elements
- **Reduce Motion** - alternative animations when enabled

#### 4. Dark Mode Optimized
**"Built for nightlife, optimized for low-light environments."**

- **Pure black (#000000)** - OLED efficiency, deep contrast
- **Electric cyan (#00D9FF)** - pops against dark backgrounds
- **No light mode** - single theme ensures consistency

---

## Getting Started

### Day 1: Setup

**1. Install Design Tools**
- Figma (recommended) or Sketch
- SF Symbols app (macOS)
- Color Contrast Analyzer (accessibility)
- Xcode (for preview on device)

**2. Access Design Files**
- Figma: [Link to be added]
- Sketch: [Link to be added]
- Asset Library: [Link to be added]

**3. Review Documentation**
- Read `/DESIGN_SYSTEM_GUIDE.md` (design tokens, components)
- Read `/UI_COMPONENT_CATALOG.md` (component usage)
- Review Human Interface Guidelines (iOS)

**4. Join Communication Channels**
- Slack: #design-team, #design-dev
- GitHub: Watch litplanAI/ios-app repo
- Weekly design review: Fridays 2pm PT

### Day 2-3: Exploration

**Explore the App:**
1. Clone repo: `git clone https://github.com/litplanAI/ios-app.git`
2. Open in Xcode
3. Run on simulator (iPhone 15 Pro)
4. Navigate all screens, test interactions
5. Enable VoiceOver (Cmd+F5) and test accessibility

**Study Components:**
1. Open `/Litplan/Components/` directory
2. Review each component file
3. Note props, usage, accessibility implementation
4. Run previews in Xcode (Cmd+Option+P)

**Understand User Flows:**
1. Home → Browse cities → View plans → Paywall → Subscribe
2. Home → Viewed cities → Return to city
3. Home → Profile → Settings

### Week 1: First Contribution

**Small Task to Get Comfortable:**
- Design a new empty state icon
- Create variant of existing card component
- Design App Store screenshot compositions
- Update color palette documentation

---

## Design Files & Resources

### Figma Structure (Recommended)

**File Organization:**
```
Litplan iOS Design System/
├── 📄 Cover (overview, team info)
├── 🎨 Design Tokens
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   └── Shadows
├── 🧩 Components
│   ├── Buttons
│   ├── Cards
│   ├── States
│   └── Modals
├── 📱 Screens
│   ├── Home
│   ├── City Details
│   ├── Paywall
│   └── Profile
└── 📐 Templates
    ├── iPhone 15 Pro (393×852pt)
    └── iPhone 15 Pro Max (430×932pt)
```

**Component Library Setup:**
1. Create components as Figma Components
2. Use Auto Layout for responsive behavior
3. Create variants for states (default, hover, pressed, disabled)
4. Publish to team library

**Design Token Variables:**
```
Colors:
- app-background: #000000
- surface-primary: #1C1C1E
- accent-primary: #00D9FF
- text-primary: #FFFFFF
(See DESIGN_SYSTEM_GUIDE.md for full list)

Typography:
- display-large: SF Pro 34pt Bold
- headline: SF Pro 22pt Semibold
(See DESIGN_SYSTEM_GUIDE.md for full list)

Spacing:
- xxs: 4pt
- xs: 8pt
- sm: 12pt
- md: 16pt
- lg: 24pt
- xl: 32pt
- xxl: 48pt
```

### Asset Export Settings

**Icons (SF Symbols):**
- Use SF Symbols 5.0+
- Export as vector (no rasterization)
- Weights: Regular, Semibold, Bold only

**Images:**
- City hero images: 1200×1600px @2x (JPEG 80%)
- Plan images: 800×600px @2x (JPEG 75%)
- Thumbnails: 240×240px @2x (JPEG 80%)
- App icon: 1024×1024px @1x (PNG, no transparency)

**Screenshots (App Store):**
- 6.7" Display: 1290×2796px (iPhone 15 Pro Max)
- 6.5" Display: 1242×2688px (iPhone 11 Pro Max)
- 5.5" Display: 1242×2208px (iPhone 8 Plus)
- Format: PNG (no transparency)

### Design Resources

**Apple Resources:**
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- SF Symbols: https://developer.apple.com/sf-symbols/
- iOS Design Templates: https://developer.apple.com/design/resources/

**Accessibility:**
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Color Contrast Checker: https://webaim.org/resources/contrastchecker/
- iOS Accessibility Guide: https://developer.apple.com/accessibility/

**Inspiration:**
- Dribbble (nightlife apps, dark mode designs)
- Behance (premium iOS apps)
- Mobbin (iOS patterns, flows)

---

## Design Workflow

### Feature Design Process

**1. Brief & Research (Day 1)**
- Receive feature brief from product team
- Review user research, analytics data
- Study existing patterns in app
- Identify design challenges

**2. Exploration & Ideation (Days 2-3)**
- Sketch rough concepts (paper or digital)
- Explore 2-3 different approaches
- Consider edge cases, error states
- Share early concepts with team

**3. High-Fidelity Design (Days 4-5)**
- Create pixel-perfect mockups in Figma
- Use components from design system
- Design all states (default, loading, error, empty)
- Create mobile-optimized layouts (iPhone 15 Pro)

**4. Prototype (Day 6)**
- Create interactive prototype in Figma
- Add animations, transitions
- Test user flow end-to-end
- Share with team for feedback

**5. Review & Iterate (Day 7)**
- Present to design team (async or sync)
- Present to product team
- Incorporate feedback
- Finalize design

**6. Developer Handoff (Day 8)**
- Prepare handoff documentation
- Export assets
- Create developer-friendly specs
- Schedule handoff meeting

**7. QA & Launch (Days 9-10)**
- Review implementation in Xcode preview
- Test on physical device
- Verify accessibility
- Sign off on implementation

### Design Review Cadence

**Weekly Design Review (Fridays 2pm PT):**
- Present work-in-progress
- Get feedback from team
- Review accessibility compliance
- Align on upcoming priorities

**Async Reviews (Slack #design-team):**
- Share updates as you go
- Quick feedback loops
- Early course correction

**Monthly Design Critique:**
- Deep dive on shipped features
- User feedback analysis
- Design system evolution

---

## Component Library

### Using Components

**Always use existing components first:**
1. Check `/UI_COMPONENT_CATALOG.md` for available components
2. Review props and usage examples
3. Use Figma component library
4. Only create new components if necessary

**When to create a new component:**
- Existing component doesn't fit use case (and can't be extended)
- Pattern will be reused 3+ times
- Component adds value to design system

**New Component Checklist:**
- [ ] Designed with all states (default, hover, pressed, disabled, loading, error)
- [ ] Accessible (VoiceOver labels, Dynamic Type, contrast)
- [ ] Documented in Figma with usage notes
- [ ] Added to component catalog
- [ ] Reviewed by design lead

### Component Naming

**Format:** `{Element}{Variant}{State}`

**Examples:**
- `PrimaryButton` (element + variant)
- `PrimaryButtonPressed` (element + variant + state)
- `CityCardStack` (element + context + variant)
- `EmptyStateView` (element + variant + type)

**Avoid:**
- Generic names (`Card`, `Button`)
- Overly specific names (`NYCPlanCard2024`)
- Acronyms (`CTABtn`)

---

## Design QA Checklist

### Before Handoff to Developers

**Visual Design:**
- [ ] All colors use design tokens (no custom hex values)
- [ ] All fonts use typography scale (no custom sizes)
- [ ] All spacing uses spacing tokens (4pt grid)
- [ ] Corner radius consistent (12pt for cards/buttons)
- [ ] Shadows match design system
- [ ] No placeholder content ("Lorem ipsum", "Image.jpg")

**Accessibility:**
- [ ] Text contrast ≥ 4.5:1 (use Color Contrast Analyzer)
- [ ] Touch targets ≥ 44×44pt
- [ ] VoiceOver labels written for all interactive elements
- [ ] Dynamic Type considered (test at max size)
- [ ] Color not sole indicator (use icons, text)
- [ ] Reduce Motion alternatives documented

**Responsive Design:**
- [ ] Designed for iPhone 15 Pro (393×852pt)
- [ ] Tested at iPhone 15 Pro Max (430×932pt)
- [ ] Tested at iPhone SE (375×667pt)
- [ ] Content reflows gracefully at all sizes
- [ ] No fixed widths (use flexible layouts)

**States & Flows:**
- [ ] Default state designed
- [ ] Loading state designed
- [ ] Error state designed
- [ ] Empty state designed
- [ ] Success state designed (if applicable)
- [ ] Disabled state designed (if applicable)
- [ ] Full user flow documented (screens + transitions)

**Assets:**
- [ ] All images exported at @2x and @3x
- [ ] SF Symbols used (not custom icons)
- [ ] Asset names follow convention (kebab-case)
- [ ] No missing assets

**Documentation:**
- [ ] Component usage notes written
- [ ] Edge cases documented
- [ ] Animation specs provided (duration, easing)
- [ ] Copy written and approved

---

## Developer Handoff Process

### 1. Prepare Handoff Package

**Figma Handoff:**
- Share Figma link with "View only" access
- Enable "Inspect" mode for developers
- Organize layers clearly (no "Layer 1", "Rectangle 2")
- Group related elements
- Name layers descriptively

**Documentation:**
Create handoff doc with:
- Feature overview and user flow
- Component usage (link to catalog)
- Animation specs (duration, easing, trigger)
- Copy (all text content)
- Edge cases and error handling
- Accessibility requirements

**Assets:**
- Export images at @2x and @3x
- Use PNG for transparency, JPEG for photos
- Organize in folder: `assets/{feature-name}/`
- Create asset manifest (list of all files)

### 2. Schedule Handoff Meeting

**Attendees:**
- Designer (you)
- iOS Developer(s)
- Product Manager (optional)

**Agenda (30 min):**
- 5 min: Feature overview and user flow
- 10 min: Walkthrough of screens and components
- 5 min: Accessibility requirements
- 5 min: Animation and interaction details
- 5 min: Q&A

**What to bring:**
- Figma prototype (interactive)
- Handoff documentation
- Reference apps (if applicable)

### 3. Post-Handoff Support

**Be available for questions:**
- Respond to Slack messages within 2 hours
- Jump on quick calls as needed
- Review implementation in progress

**Review implementation:**
- Test in Xcode preview (ask developer to share)
- Test on physical device
- Provide feedback (be specific: "Button padding should be 16pt, currently 12pt")

**Sign off:**
- Once implementation matches design (or acceptable compromises made)
- Document any deviations from original design

---

## Brand Guidelines

### Logo Usage

**Litplan Logo:**
- Primary: Electric Cyan "L" on black circle background
- Wordmark: "Litplan" in SF Pro Bold Rounded
- Minimum size: 44pt diameter (for legibility)
- Clear space: 12pt all sides

**Do's:**
- ✅ Use logo on black or dark grey backgrounds
- ✅ Use Electric Cyan (#00D9FF) as logo color
- ✅ Maintain aspect ratio (never stretch)

**Don'ts:**
- ❌ Don't use logo on light backgrounds
- ❌ Don't change logo color (except white for legal requirements)
- ❌ Don't add effects (shadow, glow, outline)
- ❌ Don't rotate or skew logo

### Color Palette

**Primary Palette:**
- Black (#000000) - Backgrounds
- Dark Grey (#1C1C1E) - Surfaces
- Electric Cyan (#00D9FF) - Accents, CTAs
- White (#FFFFFF) - Primary text

**Secondary Palette:**
- Purple (#AF52DE) - Alternative accent (rarely used)
- Green (#30D158) - Success
- Yellow (#FFD60A) - Warning
- Red (#FF453A) - Error

**Usage:**
- 70% Black backgrounds
- 20% Dark Grey surfaces
- 10% Electric Cyan accents

### Typography

**Primary Font:** SF Pro (iOS system font)

**Weights:**
- Bold: Display titles, headlines
- Semibold: Subheadlines, buttons
- Regular: Body text, descriptions
- Medium: Tertiary buttons, links

**Never use:**
- Light or Thin weights (accessibility issue)
- Italic (poor legibility on small screens)
- Condensed or Extended variants
- Custom fonts (breaks iOS Dynamic Type)

### Voice & Tone

**Brand Voice:**
- Confident, not arrogant
- Knowledgeable, not pretentious
- Helpful, not pushy
- Energetic, not chaotic

**Example Copy:**

**Do:**
- "Discover the best nightlife in New York"
- "45 curated plans this week"
- "Start your free trial"

**Don't:**
- "OMG NYC NIGHTLIFE IS LIT!!!" (too energetic)
- "Peruse our meticulously curated collection" (too pretentious)
- "LIMITED TIME OFFER!" (too pushy)

**Tone by Context:**

| Context | Tone | Example |
|---------|------|---------|
| Onboarding | Welcoming | "Welcome to Litplan. Let's find your night." |
| Empty states | Encouraging | "Start exploring cities to see your history here" |
| Errors | Apologetic, helpful | "Unable to load plans. Check your connection and try again." |
| Success | Celebratory | "Welcome to Litplan Pro! You're all set." |
| Paywall | Informative, value-focused | "Unlock unlimited cities and 50 plans per city" |

---

## Collaboration & Feedback

### Communication Channels

**Slack:**
- `#design-team` - Design discussions, feedback
- `#design-dev` - Design-developer collaboration
- `#product` - Product updates, roadmap
- `#general` - Company-wide announcements

**GitHub:**
- Create issues for design bugs
- Comment on pull requests for implementation feedback
- Use labels: `design`, `accessibility`, `visual-bug`

**Meetings:**
- Weekly Design Review (Fridays 2pm PT)
- Monthly Design Critique (first Wednesday)
- Quarterly Planning (with product team)

### Giving Feedback

**Framework: "Critique" not "Criticism"**

**Do:**
- ✅ Be specific: "Button padding should be 16pt, currently looks like 12pt"
- ✅ Explain why: "Low contrast between text and background (2.1:1) makes it hard to read"
- ✅ Suggest solutions: "Try using textSecondary (#AEAEB2) which has 9.5:1 contrast"
- ✅ Acknowledge good work: "Animation timing feels premium, well done"

**Don't:**
- ❌ Be vague: "This doesn't feel right"
- ❌ Be personal: "I don't like this design"
- ❌ Critique without context: "Change the color" (which color? why?)

**Example Feedback:**

❌ Bad: "The button looks weird"

✅ Good: "The button feels cramped. Increase padding from 12pt to 16pt (Spacing.md) to match our design system. Also, the corner radius looks larger than 12pt—verify it matches our standard."

### Receiving Feedback

**Framework: Feedback is a gift**

**Do:**
- ✅ Listen fully before responding
- ✅ Ask clarifying questions
- ✅ Thank the person for feedback
- ✅ Iterate based on feedback

**Don't:**
- ❌ Get defensive
- ❌ Dismiss feedback without consideration
- ❌ Take it personally

### Conflict Resolution

**Disagreement on design direction:**
1. Discuss rationale (both sides present reasoning)
2. Review data (user research, analytics, accessibility)
3. Test with users (if time permits)
4. Escalate to design lead or product manager
5. Document decision and reasoning

**Disagreement on implementation:**
1. Designer and developer align on feasibility
2. Explore alternative approaches
3. Document trade-offs
4. Agree on acceptable compromise
5. Update design system if pattern is new

---

## Onboarding Checklist

### Week 1
- [ ] Setup design tools (Figma, SF Symbols, etc.)
- [ ] Access design files and repositories
- [ ] Read design system documentation
- [ ] Run app on simulator and device
- [ ] Attend weekly design review
- [ ] Complete first small task

### Week 2
- [ ] Design first component variant
- [ ] Participate in design critique
- [ ] Review accessibility guidelines
- [ ] Test VoiceOver on app
- [ ] Handoff first design to developers

### Week 3
- [ ] Design first full feature
- [ ] Present in design review
- [ ] Conduct user testing session
- [ ] Review implementation in Xcode

### Week 4
- [ ] Ship first feature
- [ ] Contribute to design system
- [ ] Mentor junior designer (if applicable)
- [ ] Fully integrated into team

---

## Resources & Links

### Internal Documentation
- Design System Guide: `/DESIGN_SYSTEM_GUIDE.md`
- Component Catalog: `/UI_COMPONENT_CATALOG.md`
- Accessibility Testing: `/ACCESSIBILITY_TESTING_GUIDE.md`
- App Store Prep: `/APP_STORE_PREP.md`

### External Resources
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- SF Symbols: https://developer.apple.com/sf-symbols/
- Figma Best Practices: https://www.figma.com/best-practices/

### Tools
- Figma: https://www.figma.com/
- Color Contrast Analyzer: https://www.tpgi.com/color-contrast-checker/
- SF Symbols App: Download from Mac App Store
- Xcode: Download from Mac App Store

### Community
- iOS Design Slack: (invite link)
- Dribbble: https://dribbble.com/tags/ios-app
- Designer News: https://www.designernews.co/

---

## FAQ

**Q: Can I use custom fonts?**
A: No. We use SF Pro (iOS system font) exclusively to support Dynamic Type accessibility. Custom fonts break this feature.

**Q: Can I design a light mode?**
A: No. Litplan is dark mode only. This decision is intentional for nightlife context and OLED efficiency.

**Q: Can I change the Electric Cyan accent color?**
A: No. Electric Cyan (#00D9FF) is our brand color and cannot be changed without executive approval.

**Q: What if a component doesn't exist in our library?**
A: First, try to extend an existing component. If that's not possible, design a new component and add it to the catalog.

**Q: How do I test accessibility?**
A: Use Color Contrast Analyzer for contrast, enable VoiceOver on simulator (Cmd+F5), test Dynamic Type in Settings → Accessibility. See `/ACCESSIBILITY_TESTING_GUIDE.md`.

**Q: What if design and development disagree on implementation?**
A: Discuss trade-offs, explore alternatives, and document the decision. Developers often have valid technical constraints—be flexible.

**Q: Can I use photos from Unsplash/Pexels?**
A: For mockups, yes. For production, verify licensing. City images should be high-quality and representative.

**Q: How do I export assets for developers?**
A: Export @2x and @3x. PNG for transparency, JPEG for photos. Use descriptive names (kebab-case). Place in `assets/` folder.

**Q: What's the review process for new designs?**
A: Weekly design review (Fridays) for in-progress work. Monthly critique for shipped features. Ad-hoc reviews in Slack for quick feedback.

---

**Document Status:** COMPLETE
**Last Reviewed:** December 28, 2025
**Next Review:** Quarterly (March 2026)
**Questions:** Contact design@litplan.app or #design-team on Slack
