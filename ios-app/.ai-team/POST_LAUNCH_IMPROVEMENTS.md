# Litplan iOS Post-Launch Improvements Roadmap

**Version 1.0.0 Launch Date:** January 2026 (estimated)
**Last Updated:** December 28, 2025
**Planning Horizon:** 6 months (January-June 2026)
**Status:** Draft for review

---

## Table of Contents

1. [Version 1.1 - High Priority](#version-11---high-priority-1-month-post-launch)
2. [Version 1.2 - Medium Priority](#version-12---medium-priority-2-months)
3. [Version 1.3 - Low Priority](#version-13---low-priority-3-months)
4. [Future Explorations](#future-explorations-6-months)
5. [Technical Debt](#technical-debt)
6. [Continuous Improvements](#continuous-improvements)

---

## Prioritization Framework

### How We Prioritize

**User Impact x Effort Matrix:**
```
High Impact, Low Effort → Version 1.1 (immediate)
High Impact, High Effort → Version 1.2 (plan carefully)
Low Impact, Low Effort → Version 1.3 (when time permits)
Low Impact, High Effort → Future (re-evaluate)
```

**Decision Criteria:**
1. **User Requests:** Features most requested in reviews/feedback
2. **Analytics:** Data showing user pain points or drop-offs
3. **Competitive Parity:** Features expected in nightlife apps
4. **Business Impact:** Features that drive engagement or revenue
5. **Technical Foundation:** Features that enable future work

---

## Version 1.1 - High Priority (1 Month Post-Launch)

**Release Target:** February 2026 (1 month after v1.0.0)
**Theme:** Core Feature Enhancement
**Goal:** Address top user requests and quick wins

---

### 1. Search Functionality

**Problem:** Users can't quickly find specific cities or plans
**Impact:** High (30-40% of users expect search)
**Effort:** Medium (2 weeks)
**Priority:** P0 (must-have for v1.1)

**Scope:**
- Search cities by name ("New York", "NYC", "Los Angeles")
- Search plans by keyword ("rooftop", "speakeasy", "jazz club")
- Search results with highlighting
- Recent searches (last 5)
- Search suggestions (autocomplete)

**UI Components:**
- Search bar in navigation (magnifying glass icon)
- Search results view (filtered cities/plans)
- Empty state ("No results found. Try searching for...")
- Keyboard shortcuts (Cmd+F on iPad)

**Accessibility:**
- VoiceOver: "Search field. Enter keywords to search"
- Clear button: "Clear search text"
- Results: "{N} results found for {query}"

**Analytics:**
- Track search queries (anonymized)
- Track no-result searches (improve data)
- Track search-to-click conversion

**Example:**
```swift
// SearchView.swift
struct SearchView: View {
    @State private var searchQuery = ""
    @State private var recentSearches: [String] = []

    var filteredCities: [City] {
        cities.filter { $0.name.contains(searchQuery) }
    }

    var filteredPlans: [Plan] {
        plans.filter { plan in
            plan.title.contains(searchQuery) ||
            plan.aiTags.contains(where: { $0.contains(searchQuery) })
        }
    }

    var body: some View {
        VStack {
            // Search bar
            SearchBar(text: $searchQuery)

            // Results
            if searchQuery.isEmpty {
                RecentSearchesView(searches: recentSearches)
            } else if filteredCities.isEmpty && filteredPlans.isEmpty {
                EmptyStateView(
                    icon: "magnifyingglass.circle",
                    title: "No Results Found",
                    message: "Try searching for another city or keyword"
                )
            } else {
                SearchResultsView(cities: filteredCities, plans: filteredPlans)
            }
        }
    }
}
```

---

### 2. Saved Plans / Favorites

**Problem:** Users want to bookmark individual plans for later
**Impact:** High (50%+ users expect this in nightlife apps)
**Effort:** Medium (2 weeks)
**Priority:** P0 (must-have for v1.1)

**Scope:**
- Save/unsave plans (heart icon)
- Saved plans list (accessible from Profile tab)
- Save count per plan (social proof: "523 saves")
- Sync across devices (iCloud or backend)
- Share saved plans with friends (future: v1.2)

**UI Components:**
- Heart icon on plan cards (toggle on tap)
- Saved Plans screen (grid or list view)
- Empty state ("No saved plans yet. Tap ♥ to save plans you like")
- Sort options (Recently saved, By city, By date)

**Accessibility:**
- VoiceOver: "Save plan, button. Not saved" / "Unsave plan, button. Saved"
- Haptic feedback on save/unsave
- Dynamic Type support for saved plans list

**Data Model:**
```swift
struct SavedPlan: Identifiable, Codable {
    let id: UUID
    let planId: String
    let cityId: String
    let savedAt: Date
    let userId: String
}
```

**Analytics:**
- Track save rate (% of views that save)
- Track unsave rate (churn indicator)
- Most saved plans (content insights)

**Example:**
```swift
// SavedPlansView.swift
struct SavedPlansView: View {
    @StateObject private var viewModel = SavedPlansViewModel()

    var body: some View {
        if viewModel.savedPlans.isEmpty {
            EmptyStateView(
                icon: "heart.circle",
                title: "No Saved Plans",
                message: "Tap ♥ on plans you like to save them here",
                ctaText: "Explore Cities",
                ctaAction: { navigateToExplore() }
            )
        } else {
            ScrollView {
                LazyVStack(spacing: Spacing.md) {
                    ForEach(viewModel.savedPlans) { savedPlan in
                        PlanCard(plan: savedPlan, isSaved: true)
                    }
                }
                .padding(.horizontal, Spacing.lg)
            }
        }
    }
}
```

---

### 3. Push Notifications

**Problem:** Users don't know when new plans are available
**Impact:** High (increases engagement by 20-30%)
**Effort:** Medium (2 weeks)
**Priority:** P1 (nice-to-have for v1.1)

**Scope:**
- Weekly plan refresh notification ("45 new plans in New York this week!")
- Saved plan updates ("Rooftop Bar Experience updated with new date")
- Personalized recommendations ("New speakeasy in Los Angeles")
- Notification preferences (in Settings)

**Notification Types:**
| Type | Frequency | Example |
|------|-----------|---------|
| Weekly Refresh | Monday 10am | "45 new nightlife plans in New York are here!" |
| Saved Plan Update | As needed | "Rooftop Bar Experience now has Saturday availability" |
| Personalized | 2x/week | "We found 3 new speakeasies you might like" |
| Pro Reminder | Once/week | "Your free trial ends in 3 days. Upgrade to Pro!" |

**User Controls:**
- Enable/disable notifications (Settings)
- Choose notification types (All, Weekly only, None)
- Quiet hours (no notifications 10pm-9am)

**Accessibility:**
- Notifications follow iOS accessibility settings
- Text-only notifications (no images)
- Clear, actionable language

**Implementation:**
- Use APNs (Apple Push Notification Service)
- Backend trigger (Cloud Functions or scheduled job)
- Deep linking (notification → specific plan)

**Privacy:**
- Optional (user must opt-in)
- No data shared with third parties
- Comply with iOS notification guidelines

---

### 4. Share Plans

**Problem:** Users want to share plans with friends
**Impact:** Medium-High (social sharing drives growth)
**Effort:** Low (1 week)
**Priority:** P1 (nice-to-have for v1.1)

**Scope:**
- Share individual plans (Messages, Instagram, Twitter, etc.)
- Share group flows (multi-venue itineraries)
- Deep links (open shared plan in app)
- Rich link previews (image, title, description)

**Share Sheet:**
- Native iOS share sheet (UIActivityViewController)
- Share options: Messages, Instagram Story, Twitter, Copy Link
- Shareable content: Plan image, title, venue, city

**Deep Links:**
- Format: `litplan://plan/{planId}`
- Opens app to specific plan (if installed)
- Falls back to App Store (if not installed)

**Accessibility:**
- VoiceOver: "Share, button. Share this plan with friends"
- Large share button (≥ 44×44pt)

**Analytics:**
- Track share button taps
- Track share destinations (Messages, Instagram, etc.)
- Track deep link conversions

**Example:**
```swift
// Share button on plan card
Button(action: {
    sharePlan(plan)
}) {
    HStack(spacing: Spacing.xs) {
        Image(systemName: "square.and.arrow.up")
        Text("Share")
    }
}
.accessibilityLabel("Share plan")

func sharePlan(_ plan: Plan) {
    let url = URL(string: "https://litplan.app/plan/\(plan.id)")!
    let items: [Any] = [plan.title, url]
    let activityVC = UIActivityViewController(
        activityItems: items,
        applicationActivities: nil
    )
    // Present share sheet
}
```

---

### 5. User Reviews & Ratings

**Problem:** Users want to share feedback on venues
**Impact:** Medium (builds community, improves trust)
**Effort:** Medium (2 weeks)
**Priority:** P2 (defer to v1.2 if time-constrained)

**Scope:**
- Rate plans (1-5 stars)
- Write text reviews (optional, 500 chars max)
- View other reviews (sorted by recency)
- Flag inappropriate reviews (moderation)
- Average rating displayed on plan cards

**UI Components:**
- Star rating picker (tap to rate)
- Review text field (expandable)
- Review list (scrollable, paginated)
- Empty state ("No reviews yet. Be the first!")

**Moderation:**
- Auto-flag profanity (bad words filter)
- Manual review flagging (users can report)
- Admin moderation dashboard (future: v1.2)

**Accessibility:**
- VoiceOver: "Rate this plan, 0 to 5 stars. Currently {N} stars"
- Star picker: Increment/decrement buttons for VoiceOver
- Review text: Standard text field accessibility

**Analytics:**
- Track review submission rate
- Track average rating per plan
- Track flagged reviews (moderation insights)

---

## Version 1.2 - Medium Priority (2 Months)

**Release Target:** March 2026 (2 months after v1.0.0)
**Theme:** Advanced Features & Personalization
**Goal:** Delight power users with advanced functionality

---

### 6. Map View

**Problem:** Users want to see venues on a map
**Impact:** Medium (useful for planning routes)
**Effort:** High (3 weeks)
**Priority:** P1 (high value, but complex)

**Scope:**
- Map view showing all venues in a city
- Cluster markers for nearby venues
- Tap marker to see venue details
- Directions to venue (Apple Maps integration)
- Filter by plan type (rooftop, speakeasy, etc.)

**UI Components:**
- Map view (MapKit)
- Venue markers (custom annotation)
- Detail callout (venue name, image, CTA)
- Filter bar (chips for plan types)

**Accessibility:**
- VoiceOver: Map may be limited (inherent constraint)
- List view toggle (accessible alternative)
- Voice directions (Apple Maps handles)

**Technical:**
- Use SwiftUI MapKit (iOS 17+)
- Custom annotations for venue markers
- Deep link to Apple Maps for directions

---

### 7. Calendar Integration

**Problem:** Users want to add plans to their calendar
**Impact:** Medium (convenience feature)
**Effort:** Low (1 week)
**Priority:** P2

**Scope:**
- "Add to Calendar" button on plan details
- EventKit integration (iOS Calendar)
- Pre-filled event (title, location, time, notes)
- Recurring events for weekly plans

**UI:**
- Button: "Add to Calendar" (calendar icon)
- Success toast: "Added to your calendar"
- Error handling (calendar access denied)

**Accessibility:**
- VoiceOver: "Add to Calendar, button"
- Clear success/error feedback

---

### 8. Group Planning

**Problem:** Friends want to plan together
**Impact:** High (social features drive engagement)
**Effort:** High (4 weeks)
**Priority:** P1 (complex, defer if needed)

**Scope:**
- Create group (invite friends via link)
- Vote on plans (thumbs up/down)
- Finalize group itinerary
- Group chat (future: v1.3)

**UI:**
- Create group button
- Invite link (share sheet)
- Voting UI (thumbs up/down)
- Group members list

**Backend:**
- Requires backend for groups (Firestore or similar)
- Real-time sync (Firestore listeners)
- Invitations (deep links)

---

### 9. Advanced Filters

**Problem:** Users want to filter plans by criteria
**Impact:** Medium (power user feature)
**Effort:** Medium (2 weeks)
**Priority:** P2

**Scope:**
- Filter by price range ($, $$, $$$)
- Filter by vibe (casual, upscale, romantic)
- Filter by time (Happy hour, Late night)
- Filter by features (Live music, Outdoor seating)

**UI:**
- Filter sheet (bottom drawer)
- Filter chips (price, vibe, time, features)
- Clear all filters button
- Applied filters badge (count)

---

### 10. Personalization (ML-Based Recommendations)

**Problem:** Users see irrelevant plans
**Impact:** High (increases engagement)
**Effort:** High (4 weeks + ML model)
**Priority:** P1 (long-term strategic)

**Scope:**
- Track user behavior (views, saves, shares)
- ML model to predict preferences
- Personalized "For You" section on Home
- Recommended cities based on history

**Technical:**
- Core ML for on-device inference (privacy-first)
- Collaborative filtering (similar users)
- Content-based filtering (similar plans)

**Privacy:**
- On-device only (no data sent to server)
- Opt-in (Settings)
- Clear data deletion

---

## Version 1.3 - Low Priority (3+ Months)

**Release Target:** April 2026+ (3+ months after v1.0.0)
**Theme:** Platform Expansion & Ecosystem
**Goal:** Extend Litplan across Apple ecosystem

---

### 11. iPad Support

**Problem:** iPad users see scaled-up iPhone app (poor UX)
**Impact:** Medium (10-15% of iOS users on iPad)
**Effort:** Medium (3 weeks)
**Priority:** P2

**Scope:**
- iPad-optimized layouts (multi-column)
- Sidebar navigation (instead of tab bar)
- Keyboard shortcuts (Cmd+1/2/3, Cmd+F, Cmd+W)
- Split view (cities list + details)

**Design:**
- Adaptive layouts (compact vs. regular)
- Larger text (iPad is viewed from farther)
- Wider cards (utilize extra space)

---

### 12. Widget Support

**Problem:** Users want quick access without opening app
**Impact:** Low-Medium (convenience)
**Effort:** Medium (2 weeks)
**Priority:** P3

**Scope:**
- Home screen widget (upcoming plans)
- Lock screen widget (next plan time)
- Widget sizes (Small, Medium, Large)
- Interactive widgets (tap to open plan)

**Widget Types:**
| Type | Size | Content |
|------|------|---------|
| Upcoming Plans | Medium | Next 3 plans with times |
| City Snapshot | Small | "45 plans in NYC this week" |
| Group Flow | Large | Full itinerary with timeline |

---

### 13. Apple Watch App

**Problem:** Users want on-the-go access
**Impact:** Low (nice-to-have, limited utility)
**Effort:** High (4 weeks)
**Priority:** P3

**Scope:**
- View saved plans
- Upcoming plans list
- Directions to venue (Apple Maps)
- Minimal UI (complications)

**Watch Complications:**
- Next plan time
- Plans count for today
- Tap to open app

---

### 14. Siri Shortcuts

**Problem:** Users want voice access
**Impact:** Low (power user feature)
**Effort:** Low (1 week)
**Priority:** P3

**Scope:**
- "Show me nightlife in New York"
- "What's my next plan?"
- "Find speakeasies near me"

**Implementation:**
- Intents Extension (Siri integration)
- Custom phrases (user-defined)
- Siri suggestions (based on usage)

---

### 15. Live Activities

**Problem:** Users want real-time plan tracking
**Impact:** Low (limited use case)
**Effort:** Medium (2 weeks)
**Priority:** P3

**Scope:**
- Live Activity for group flows (multi-venue)
- Track progress (venue 1 → 2 → 3)
- Time remaining at each venue
- Dynamic Island (iPhone 14 Pro+)

**Example:**
```
┌─────────────────────────────┐
│ Rooftop & Speakeasy Flow    │
│ ① Rooftop Bar (15 min left) │
│ → Next: Speakeasy at 10 PM  │
└─────────────────────────────┘
```

---

## Future Explorations (6+ Months)

**Release Target:** July 2026+ (6+ months after v1.0.0)
**Theme:** Innovation & Experimentation
**Goal:** Explore new concepts, validate assumptions

---

### 16. AR Venue Preview

**Problem:** Users don't know what venue looks like
**Impact:** Low (gimmick unless executed well)
**Effort:** High (8 weeks + AR expertise)
**Priority:** P4 (explore, don't commit)

**Scope:**
- ARKit integration
- 360° venue photos (immersive)
- Point camera at street to see venue entrance
- "Try before you go" experience

**Risks:**
- Requires high-quality AR assets (expensive)
- Limited utility (novelty wears off)
- Accessibility concerns (AR is visual-only)

---

### 17. Social Features (Friend Activity)

**Problem:** Users want to see what friends are doing
**Impact:** Medium (social features can be sticky)
**Effort:** High (6 weeks + privacy concerns)
**Priority:** P3

**Scope:**
- Follow friends (mutual)
- See friend activity ("Sarah saved Rooftop Bar")
- Friend recommendations ("3 friends saved this plan")
- Privacy controls (hide activity, block users)

**Privacy:**
- Opt-in (default: private)
- Granular controls (hide from specific users)
- No location tracking (just saves/reviews)

---

### 18. Gamification (Badges, Streaks)

**Problem:** Users have no incentive to explore
**Impact:** Low (can feel gimmicky)
**Effort:** Medium (3 weeks)
**Priority:** P4 (test carefully)

**Scope:**
- Badges for milestones ("Explorer: Visited 10 cities")
- Streaks ("7-day streak: Viewed plans daily")
- Leaderboard (top explorers)
- Unlock exclusive content (Pro feature)

**Risks:**
- Can feel forced (nightlife is spontaneous)
- May not align with brand (minimalism)
- Accessibility concerns (progress tracking)

---

## Technical Debt

**Priority:** Ongoing (address gradually)

---

### 1. Unit Test Coverage

**Current:** Template tests only (~5% coverage)
**Goal:** 80% coverage (components, view models, services)
**Effort:** 4 weeks (spread over multiple sprints)
**Priority:** P1 (essential for long-term health)

**Approach:**
1. **Sprint 5:** Add tests for utilities (Color, Typography, Spacing) - 1 week
2. **Sprint 6:** Add tests for components (buttons, cards) - 2 weeks
3. **Sprint 7:** Add tests for view models (HomeViewModel, etc.) - 1 week

**Example:**
```swift
// PrimaryButtonTests.swift
import XCTest
@testable import Litplan

class PrimaryButtonTests: XCTestCase {

    func testButtonHasCorrectLabel() {
        let button = PrimaryButton(title: "Subscribe", action: {})
        XCTAssertEqual(button.title, "Subscribe")
    }

    func testButtonDisabledState() {
        let button = PrimaryButton(title: "Subscribe", action: {}, isDisabled: true)
        XCTAssertTrue(button.isDisabled)
    }
}
```

---

### 2. Integration Tests

**Current:** None
**Goal:** Test critical user flows (Home → City → Plan → Subscribe)
**Effort:** 2 weeks
**Priority:** P2

**Flows to Test:**
1. Browse cities → View plans → Open plan details
2. Trigger paywall → Subscribe → Unlock Pro features
3. View history → Return to previously viewed city
4. Error handling → Network loss → Retry

---

### 3. UI Automation Tests

**Current:** None
**Goal:** Automated screenshot tests, regression prevention
**Effort:** 3 weeks
**Priority:** P2

**Tools:**
- XCTest UI Testing (built-in)
- Snapshot testing (pointfreeco/swift-snapshot-testing)
- Percy (visual regression testing, optional)

**Example:**
```swift
// HomeViewUITests.swift
import XCTest

class HomeViewUITests: XCTestCase {

    func testHomeScreenElements() {
        let app = XCUIApplication()
        app.launch()

        // Verify title exists
        XCTAssertTrue(app.staticTexts["Discover Your Night"].exists)

        // Verify first city card exists
        XCTAssertTrue(app.buttons.matching(identifier: "cityCard").firstMatch.exists)
    }
}
```

---

### 4. Performance Profiling with Instruments

**Current:** Manual testing only
**Goal:** Automated performance regression detection
**Effort:** 1 week setup + ongoing
**Priority:** P2

**Metrics to Track:**
- Launch time (target: <3s)
- Scrolling frame rate (target: 60 FPS)
- Memory usage (target: <150MB)
- Network latency (target: <2s)

**Tools:**
- Xcode Instruments (Time Profiler, Allocations)
- MetricKit (automated performance metrics)

---

### 5. Crash Analytics Deep Dive

**Current:** App Store Connect crash reports
**Goal:** Real-time crash monitoring and alerting
**Effort:** 1 week integration
**Priority:** P1 (critical for production)

**Tools:**
- Firebase Crashlytics (recommended)
- Sentry (alternative)
- Xcode Organizer (built-in, limited)

**Setup:**
1. Integrate Firebase Crashlytics SDK
2. Symbolicate crash reports (dSYM upload)
3. Set up alerts (Slack, email)
4. Monitor crash-free rate (target: >99%)

---

## Continuous Improvements

**Priority:** Ongoing

---

### 1. Design System Evolution

**As app grows, design system should evolve:**
- Add new components as needed
- Refine existing components based on usage
- Update color palette (if brand evolves)
- Document new patterns

**Process:**
- Quarterly design system review
- Version control for design tokens
- Migration guide for breaking changes

---

### 2. Accessibility Audits

**Ensure accessibility remains excellent:**
- Monthly VoiceOver testing
- Quarterly WCAG compliance audit
- User testing with people with disabilities
- Update ACCESSIBILITY_TESTING_GUIDE.md as needed

---

### 3. Performance Monitoring

**Track performance over time:**
- Monthly Instruments profiling
- Monitor crash rate (target: <0.1%)
- Monitor launch time (target: <3s)
- Monitor memory usage (target: <150MB)

**Alerts:**
- If launch time > 3s (investigate)
- If crash rate > 0.1% (fix immediately)
- If memory usage > 150MB (optimize)

---

### 4. User Feedback Loop

**Listen to users, iterate:**
- Monitor App Store reviews (daily)
- Respond to reviews (within 24h)
- Conduct user interviews (monthly)
- Analyze in-app analytics (weekly)

**Prioritization:**
- Top user requests → High priority
- Frequent complaints → Critical bugs
- Positive feedback → Amplify in marketing

---

## Version Roadmap Summary

| Version | Release Date | Theme | Key Features |
|---------|--------------|-------|--------------|
| **1.0.0** | Jan 2026 | Launch | Core nightlife discovery |
| **1.1** | Feb 2026 | Core Enhancement | Search, Saved Plans, Push Notifications, Share |
| **1.2** | Mar 2026 | Advanced Features | Map View, Calendar, Group Planning, Filters, ML |
| **1.3** | Apr 2026+ | Platform Expansion | iPad, Widgets, Apple Watch, Siri, Live Activities |
| **2.0** | Jul 2026+ | Innovation | AR, Social, Gamification (TBD based on v1 learnings) |

---

## Success Metrics (Post-Launch)

### Version 1.1 Success Criteria

**Engagement:**
- Search usage: 30%+ of sessions
- Saved plans: 10%+ of plans saved
- Notification opt-in: 40%+
- Share rate: 5%+ of plans shared

**Retention:**
- Day 7 retention: 30%+
- Day 30 retention: 15%+
- Monthly active users (MAU): 10,000+

**Revenue:**
- Subscription conversion: 5%+
- Churn rate: <5%/month
- Average revenue per user (ARPU): $2+

### Version 1.2 Success Criteria

**Engagement:**
- Map view usage: 20%+ of sessions
- Group planning: 10%+ of users create groups
- Filter usage: 15%+ of searches use filters

**Retention:**
- Day 7 retention: 35%+ (vs. 30% in v1.1)
- Day 30 retention: 18%+ (vs. 15% in v1.1)

---

## Budget & Resources

**Estimated Effort (Developer Months):**
- Version 1.1: 2-3 months (1 developer)
- Version 1.2: 3-4 months (1-2 developers)
- Version 1.3: 2-3 months (1 developer)
- Technical Debt: 2-3 months (ongoing)

**Total: 9-13 developer months over 6 months**

**Team Recommendations:**
- 1 Senior iOS Developer (full-time)
- 1 Junior iOS Developer (full-time, starting v1.2)
- 1 Designer (part-time, design updates)
- 1 Backend Developer (part-time, for group features, ML)

---

## Risks & Mitigation

### Risk 1: Feature Creep

**Risk:** Adding too many features dilutes minimalist brand
**Mitigation:**
- Strict prioritization (user data only)
- Design reviews before build
- "No" by default (justify every feature)

### Risk 2: Performance Regression

**Risk:** New features slow down app
**Mitigation:**
- Performance profiling before release
- Set performance budgets (launch <3s, 60 FPS)
- Automated performance tests

### Risk 3: Accessibility Regression

**Risk:** New features break accessibility
**Mitigation:**
- Accessibility testing for every feature
- VoiceOver QA before release
- Automated accessibility audits (Xcode Accessibility Inspector)

### Risk 4: User Churn

**Risk:** Users lose interest after initial novelty
**Mitigation:**
- Fresh content weekly (new plans)
- Push notifications for re-engagement
- Personalization (ML recommendations)
- Community features (reviews, group planning)

---

## Conclusion

This roadmap outlines 6 months of post-launch improvements for Litplan iOS. Priorities are based on user impact, effort, and strategic alignment. All features should be validated with user research and analytics before committing development resources.

### Key Principles

1. **User-first:** Build what users want, not what we think is cool
2. **Data-driven:** Validate assumptions with analytics
3. **Minimalist:** Say no to features that don't fit brand
4. **Accessible:** Maintain WCAG 2.1 Level AA compliance
5. **Performant:** Never compromise on 60 FPS, <3s launch

### Next Steps

1. Launch v1.0.0 (January 2026)
2. Monitor user feedback and analytics (first 2 weeks)
3. Prioritize v1.1 features based on data
4. Begin v1.1 development (February 2026)
5. Iterate roadmap quarterly based on learnings

---

**Document Status:** Draft for review
**Owner:** Product Team
**Reviewers:** Engineering, Design, Business
**Next Review:** Post-launch (January 2026)
