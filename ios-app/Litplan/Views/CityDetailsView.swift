//
//  CityDetailsView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 6 - City Details with parallax hero, tabs, and plan lists
//  Sprint 17E - Reorganized with Weekend Section at top and Day-based grouping
//

import SwiftUI

struct CityDetailsView: View {
    let city: City
    let onDismiss: () -> Void

    @State private var selectedTab: PlanTab = .individual
    @State private var scrollOffset: CGFloat = 0
    @State private var plans: [Plan] = []
    @State private var groupFlows: [GroupFlow] = []
    @State private var isLoading: Bool = true
    @State private var hasLoadedOnce: Bool = false
    @State private var loadError: String? = nil
    @State private var isFavorited: Bool = false
    @State private var selectedGroupFlow: GroupFlow?
    // Removed: @State private var selectedDate: Date = Date() -- No longer using day-by-day selection (Sprint 14)

    // Paywall trigger state
    @State private var paywallTrigger: PaywallTrigger? = nil
    @State private var viewedPlansCount: Int = 0
    @State private var selectedPlan: Plan? = nil
    @State private var showPlanDetails: Bool = false

    // Track which days are expanded (show all plans vs top 3)
    @State private var expandedWeekdays: Set<String> = []

    // Number of plans to show per day before "See More"
    private let plansPerDayLimit = 3

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // Saved items manager for city save functionality
    @ObservedObject private var savedItemsManager = SavedItemsManager.shared

    // Pro feature - connected to SubscriptionManager
    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // Accessibility - Reduce Motion
    @Environment(\.accessibilityReduceMotion) var reduceMotion

    // Hero image dimensions
    private let heroImageHeight: CGFloat = 200
    private let maxParallaxOffset: CGFloat = 100

    enum PlanTab: String, CaseIterable {
        case individual = "Individual Plans"
        case group = "Group Plans"
    }

    // MARK: - Computed Properties for Plan Organization

    // Weekend days (Friday, Saturday, Sunday)
    private let weekendDayNames = ["Friday", "Saturday", "Sunday"]

    // Weekday days (Monday through Thursday)
    private let weekdayDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday"]

    /// Weekend plans (Friday, Saturday, Sunday) - uses computedDayOfWeek for accuracy
    private var weekendPlans: [Plan] {
        plans.filter { weekendDayNames.contains($0.computedDayOfWeek) }
    }

    /// Weekday plans (Monday through Thursday) - uses computedDayOfWeek for accuracy
    private var weekdayPlans: [Plan] {
        plans.filter { weekdayDayNames.contains($0.computedDayOfWeek) }
    }

    /// Check if there are any weekend plans
    private var hasWeekendPlans: Bool {
        !weekendPlans.isEmpty
    }

    /// Check if there are any weekday plans
    private var hasWeekdayPlans: Bool {
        !weekdayPlans.isEmpty
    }

    // MARK: - This Week Date Range (Sprint 14)

    /// Get the current week's date range
    private var thisWeekDateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let now = Date()
        let weekday = calendar.component(.weekday, from: now)
        // Adjust to Monday as week start
        let daysFromMonday = (weekday + 5) % 7
        let monday = calendar.date(byAdding: .day, value: -daysFromMonday, to: now)!
        let sunday = calendar.date(byAdding: .day, value: 6, to: monday)!
        return (monday, sunday)
    }

    /// Formatted week range (e.g., "Jan 6 - Jan 12")
    private var formattedWeekRange: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let range = thisWeekDateRange
        return "\(formatter.string(from: range.start)) - \(formatter.string(from: range.end))"
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.appBackground
                .ignoresSafeArea()

            // Scrollable content - only show after initial render
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Hero image with parallax effect
                    heroImageSection

                    // Tab switcher
                    tabSwitcher
                        .padding(.top, Spacing.md)

                    // "This Week" header (Sprint 14 - replaced WeekSelectorView)
                    if selectedTab == .individual {
                        thisWeekHeader
                            .padding(.top, Spacing.sm)
                    }

                    // Plans list based on selected tab
                    plansListSection
                }
            }
            .coordinateSpace(name: "scroll")

            // PRIORITY: Close button ALWAYS renders first and stays visible
            // This ensures users can always dismiss the screen even if content fails to load
            closeButtonOverlay
        }
        .navigationBarHidden(true)
        .sheet(item: $paywallTrigger) { trigger in
            PaywallView(trigger: trigger) {
                paywallTrigger = nil
            }
        }
        .fullScreenCover(item: $selectedGroupFlow) { groupFlow in
            DetailedGroupFlowView(
                groupFlow: groupFlow,
                onDismiss: {
                    selectedGroupFlow = nil
                },
                onUpgrade: {
                    selectedGroupFlow = nil
                    paywallTrigger = .groupFlow(cityName: city.name)
                }
            )
        }
        .fullScreenCover(isPresented: $showPlanDetails) {
            if let plan = selectedPlan {
                PlanDetailView(plan: plan) {
                    showPlanDetails = false
                }
            }
        }
        .task {
            // Check if city is already saved
            isFavorited = savedItemsManager.isCitySaved(city)
            await loadDataWithTimeout()
        }
    }

    // MARK: - Close Button Overlay (ALWAYS visible, loads first)
    private var closeButtonOverlay: some View {
        VStack {
            HStack {
                // Favorite/Save button (top-left)
                Button(action: handleSaveTap) {
                    Image(systemName: isFavorited ? "heart.fill" : "heart")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(isFavorited ? .accentPrimary : .textPrimary)
                        .frame(width: 36, height: 36)
                        .background(
                            Circle()
                                .fill(Color.surfacePrimary)
                        )
                        .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .accessibilityLabel(isFavorited ? "Saved" : "Save city")
                .accessibilityHint(isFavorited ? "Double tap to remove from favorites" : "Double tap to save to favorites")

                Spacer()

                // Close button (top-right) - ALWAYS visible
                Button(action: {
                    HapticManager.shared.light()
                    onDismiss()
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.textPrimary)
                        .frame(width: 36, height: 36)
                        .background(
                            Circle()
                                .fill(Color.surfacePrimary)
                        )
                        .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .accessibilityLabel("Close")
                .accessibilityHint("Dismiss city details")
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, 54) // Account for safe area + notch

            Spacer()
        }
    }

    // MARK: - Data Loading
    private func loadDataWithTimeout() async {
        isLoading = true
        loadError = nil

        // Load plans and group flows in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                await self.loadPlansAsync()
            }

            group.addTask {
                await self.loadGroupFlowsAsync()
            }

            // Wait for both to complete
            for await _ in group {}
        }

        await MainActor.run {
            isLoading = false
            hasLoadedOnce = true
        }
    }

    // MARK: - Hero Image Section
    private var heroImageSection: some View {
        GeometryReader { geometry in
            let offset = geometry.frame(in: .named("scroll")).minY

            ZStack {
                AsyncImageView(url: URL(string: city.displayAssets.heroImageUrl))
                    .frame(width: geometry.size.width, height: heroImageHeight + max(0, offset))
                    .offset(y: -offset)
                    .clipped()
            }
            .overlay(
                // Gradient overlay for text readability
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.black.opacity(0.6),
                        Color.black.opacity(0.3),
                        Color.clear
                    ]),
                    startPoint: .bottom,
                    endPoint: .top
                )
            )
            .overlay(
                // City name at bottom of hero
                VStack {
                    Spacer()
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text(city.name)
                                .font(.system(size: 34, weight: .bold))
                                .foregroundColor(.textPrimary)

                            Text("\(city.displayAssets.countryFlag) \(city.country)")
                                .font(.system(size: 16))
                                .foregroundColor(.textSecondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.md)
                }
            )
        }
        .frame(height: heroImageHeight)
    }


    // MARK: - Tab Switcher
    private var tabSwitcher: some View {
        HStack(spacing: Spacing.md) {
            ForEach(PlanTab.allCases, id: \.self) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.bottom, Spacing.sm)
    }

    private func tabButton(for tab: PlanTab) -> some View {
        Button(action: {
            withAnimation(reduceMotion ? .none : .spring(response: 0.3, dampingFraction: 0.8)) {
                selectedTab = tab
            }
        }) {
            VStack(spacing: Spacing.xs) {
                Text(tab.rawValue)
                    .font(.system(size: 16, weight: selectedTab == tab ? .semibold : .regular))
                    .foregroundColor(selectedTab == tab ? .textPrimary : .textSecondary)

                // Active indicator
                Rectangle()
                    .fill(selectedTab == tab ? Color.accentPrimary : Color.clear)
                    .frame(height: 3)
                    .cornerRadius(1.5)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityLabel(tab.rawValue)
        .accessibilityAddTraits(selectedTab == tab ? [.isButton, .isSelected] : .isButton)
    }

    // MARK: - Plans List Section
    private var plansListSection: some View {
        VStack(spacing: Spacing.md) {
            if isLoading {
                // Loading state - shown while data is being fetched
                VStack(spacing: 20) {
                    ProgressView()
                        .tint(.accentPrimary)
                        .scaleEffect(1.5)
                    Text("Loading nightlife plans...")
                        .font(.system(size: 16))
                        .foregroundColor(.textSecondary)
                }
                .frame(height: 200)
                .accessibilityLabel("Loading plans")
                .accessibilityValue("Please wait")
                .transition(.opacity)
            } else if let error = loadError {
                // Error state - shown if loading failed
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.warning)

                    Text("Unable to Load Plans")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.textPrimary)

                    Text(error)
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)

                    Button(action: {
                        Task {
                            await loadDataWithTimeout()
                        }
                    }) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Try Again")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(.accentPrimary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.accentPrimary, lineWidth: 1.5)
                        )
                    }
                }
                .frame(height: 250)
                .padding(.horizontal, Spacing.lg)
                .transition(.opacity)
            } else if plans.isEmpty && hasLoadedOnce {
                // Empty state - shown if no plans available for this city
                VStack(spacing: 12) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 40))
                        .foregroundColor(.textSecondary)
                    Text("No plans available yet")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.textPrimary)
                    Text("Check back soon for curated nightlife experiences")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)

                    Button(action: {
                        Task {
                            await loadDataWithTimeout()
                        }
                    }) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 14, weight: .medium))
                            Text("Refresh")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(.accentPrimary)
                    }
                    .padding(.top, Spacing.sm)
                }
                .frame(height: 220)
                .padding(.horizontal, Spacing.lg)
                .transition(.opacity)
            } else {
                Group {
                    if selectedTab == .individual {
                        individualPlansList
                    } else {
                        groupPlansList
                    }
                }
                .transition(.opacity)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.md)
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }

    // MARK: - This Week Header (Sprint 14)
    private var thisWeekHeader: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "calendar")
                .font(.system(size: 18))
                .foregroundColor(.accentPrimary)

            VStack(alignment: .leading, spacing: 2) {
                Text("This Week")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.textPrimary)

                Text(formattedWeekRange)
                    .font(.system(size: 14))
                    .foregroundColor(.textSecondary)
            }

            Spacer()
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Individual Plans List (Sprint 14 - Week-based, Weekend/Weekday sections)
    private var individualPlansList: some View {
        LazyVStack(spacing: Spacing.lg) {
            if plans.isEmpty {
                // Empty state
                VStack(spacing: Spacing.md) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 40))
                        .foregroundColor(.textTertiary)

                    Text("No plans available this week")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.textPrimary)

                    Text("Check back soon for curated experiences")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xxl)
            } else {
                // Weekend Plans Section (Fri-Sun) - Pro-gated with 2 free
                if hasWeekendPlans {
                    WeekendPlansSection(
                        plans: weekendPlans,
                        isProUser: isProUser,
                        onPlanTap: { plan in
                            handleWeekendPlanTap(plan)
                        },
                        onUpgrade: {
                            HapticManager.shared.warning()
                            paywallTrigger = .weekendPlan(cityName: city.name)
                        }
                    )
                }

                // Weekday Plans Section (Mon-Thu) - Free for all
                if hasWeekdayPlans {
                    weekdayPlansSection
                }
            }
        }
    }

    // MARK: - Weekday Plans Section (Sprint 14)

    // Group weekday plans by day using computedDayOfWeek (single source of truth)
    private var weekdayPlansByDay: [(day: String, plans: [Plan])] {
        var result: [(day: String, plans: [Plan])] = []

        for day in weekdayDayNames {
            let dayPlans = weekdayPlans.filter { $0.computedDayOfWeek == day }
            if !dayPlans.isEmpty {
                // Sort by start time
                let sorted = dayPlans.sorted { $0.schedule.startTime < $1.schedule.startTime }
                result.append((day: day, plans: sorted))
            }
        }

        return result
    }

    private var weekdayPlansSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.xs) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 16))
                    .foregroundColor(.textSecondary)

                Text("Weekday Plans")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.textPrimary)

                Text("Mon-Thu")
                    .font(.system(size: 12))
                    .foregroundColor(.textTertiary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.surfaceSecondary)
                    .cornerRadius(4)

                Spacer()

                Text("\(weekdayPlans.count) plans")
                    .font(.system(size: 13))
                    .foregroundColor(.textTertiary)
            }
            .padding(.horizontal, Spacing.sm)

            // Weekday plans grouped by day
            VStack(spacing: 0) {
                ForEach(Array(weekdayPlansByDay.enumerated()), id: \.element.day) { dayIndex, dayGroup in
                    let isExpanded = expandedWeekdays.contains(dayGroup.day)
                    let visiblePlans = isExpanded ? dayGroup.plans : Array(dayGroup.plans.prefix(plansPerDayLimit))
                    let hasMorePlans = dayGroup.plans.count > plansPerDayLimit

                    // Day header
                    weekdayHeader(for: dayGroup.day, planCount: dayGroup.plans.count)

                    // Plans for this day (show limited or all based on expanded state)
                    ForEach(Array(visiblePlans.enumerated()), id: \.element.id) { index, plan in
                        VStack(spacing: 0) {
                            PlanListItem(plan: plan, showRank: false)
                                .onTapGesture {
                                    handlePlanTap(plan)
                                }

                            if index < visiblePlans.count - 1 {
                                Divider()
                                    .background(Color.surfaceSecondary)
                                    .padding(.leading, 62)
                            }
                        }
                    }

                    // "See More" button if there are more plans
                    if hasMorePlans {
                        seeMoreButton(for: dayGroup.day, isExpanded: isExpanded, remainingCount: dayGroup.plans.count - plansPerDayLimit)
                    }

                    // Divider between days
                    if dayIndex < weekdayPlansByDay.count - 1 {
                        Divider()
                            .background(Color.surfaceSecondary)
                    }
                }
            }
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
        .padding(.horizontal, Spacing.sm)
    }

    // MARK: - See More Button

    private func seeMoreButton(for day: String, isExpanded: Bool, remainingCount: Int) -> some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                if isExpanded {
                    expandedWeekdays.remove(day)
                } else {
                    expandedWeekdays.insert(day)
                }
            }
            HapticManager.shared.light()
        }) {
            HStack(spacing: Spacing.xs) {
                Text(isExpanded ? "Show Less" : "See \(remainingCount) More")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.accentPrimary)

                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.accentPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.sm)
            .background(Color.surfaceSecondary.opacity(0.5))
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func weekdayHeader(for day: String, planCount: Int) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: weekdayIcon(for: day))
                .font(.system(size: 14))
                .foregroundColor(weekdayColor(for: day))

            Text(day)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.textPrimary)

            Spacer()

            Text("\(planCount)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.textTertiary)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.surfaceSecondary)
                .cornerRadius(10)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.surfaceSecondary.opacity(0.5))
    }

    private func weekdayIcon(for day: String) -> String {
        switch day {
        case "Monday": return "sunrise.fill"
        case "Tuesday": return "sun.max.fill"
        case "Wednesday": return "sun.haze.fill"
        case "Thursday": return "sunset.fill"
        default: return "calendar"
        }
    }

    private func weekdayColor(for day: String) -> Color {
        switch day {
        case "Monday": return .accentPrimary
        case "Tuesday": return Color(hex: "#FF9500") // Orange
        case "Wednesday": return Color(hex: "#34C759") // Green
        case "Thursday": return Color(hex: "#AF52DE") // Purple
        default: return .textSecondary
        }
    }

    // MARK: - Group Plans List
    private var groupPlansList: some View {
        LazyVStack(spacing: Spacing.md) {
            if groupFlows.isEmpty {
                // Empty state for group plans
                VStack(spacing: Spacing.md) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.textTertiary)

                    Text("Group Plans Coming Soon")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.textPrimary)

                    Text("We're working on creating awesome group experiences for \(city.name)")
                        .font(.system(size: 16))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xxl)
            } else {
                // Show first 3-5 group flows
                let displayCount = isProUser ? min(groupFlows.count, 5) : min(groupFlows.count, 3)

                ForEach(groupFlows.prefix(displayCount)) { groupFlow in
                    GroupFlowCard(
                        groupFlow: groupFlow,
                        isProUser: isProUser,
                        onTapViewItinerary: {
                            selectedGroupFlow = groupFlow
                        },
                        onTapUnlock: {
                            paywallTrigger = .groupFlow(cityName: city.name)
                        }
                    )
                }

                // Paywall card for free users after showing 3 group plans
                if !isProUser && groupFlows.count > 3 {
                    GroupPlansPaywallCard {
                        paywallTrigger = .groupFlow(cityName: city.name)
                    }
                }
            }
        }
    }

    // MARK: - Helper Functions
    private func loadPlansAsync() async {
        // Check network first
        let hasNetwork = NetworkMonitor.shared.isConnected

        // Load plans from API with fallback to mock data for offline support
        let loadedPlans = await APIService.shared.fetchPlansWithFallback(cityId: city.id)

        // Update state on main actor
        await MainActor.run {
            plans = loadedPlans

            // If no network and no plans, set a helpful message
            if loadedPlans.isEmpty && !hasNetwork {
                loadError = "No internet connection. Please check your connection and try again."
            }

            // Debug logging for plan distribution
            #if DEBUG
            let weekendCount = loadedPlans.filter { ["Friday", "Saturday", "Sunday"].contains($0.computedDayOfWeek) }.count
            let weekdayCount = loadedPlans.filter { ["Monday", "Tuesday", "Wednesday", "Thursday"].contains($0.computedDayOfWeek) }.count
            print("[CityDetailsView] Loaded \(loadedPlans.count) plans - Weekend: \(weekendCount), Weekday: \(weekdayCount)")
            if let firstPlan = loadedPlans.first {
                print("[CityDetailsView] Sample plan: date=\(firstPlan.schedule.date), computedDay=\(firstPlan.computedDayOfWeek), storedDay=\(firstPlan.schedule.dayOfWeek)")
            }
            #endif
        }
    }

    private func loadGroupFlowsAsync() async {
        print("[CityDetailsView] loadGroupFlowsAsync started for city: \(city.name) (id: \(city.id))")

        // Load group flows from API with fallback to mock data
        let loadedGroupFlows = await APIService.shared.fetchGroupFlowsWithFallback(cityId: city.id)

        print("[CityDetailsView] Received \(loadedGroupFlows.count) group flows")
        for (index, flow) in loadedGroupFlows.prefix(3).enumerated() {
            print("[CityDetailsView]   [\(index)] \(flow.title)")
        }

        // Update state on main actor
        await MainActor.run {
            groupFlows = loadedGroupFlows
            print("[CityDetailsView] Updated groupFlows state with \(groupFlows.count) items")
        }
    }

    // MARK: - Action Handlers

    private func handlePlanTap(_ plan: Plan) {
        // Haptic feedback on plan tap
        HapticManager.shared.medium()

        // Free users: check plan limit
        if !isProUser {
            viewedPlansCount += 1

            if viewedPlansCount > 10 {
                // Haptic feedback for limit reached
                HapticManager.shared.warning()
                paywallTrigger = .planLimit(cityName: city.name)
                return
            }
        }

        // Show plan details
        selectedPlan = plan
        showPlanDetails = true
    }

    private func handleWeekendPlanTap(_ plan: Plan) {
        // Haptic feedback
        HapticManager.shared.medium()

        if !isProUser {
            HapticManager.shared.warning()
            paywallTrigger = .weekendPlan(cityName: city.name)
            return
        }

        selectedPlan = plan
        showPlanDetails = true
    }

    private func handleSaveTap() {
        // FREE users CAN save cities (no restriction per Sprint 17C)
        // Toggle saved state using SavedItemsManager
        savedItemsManager.toggleCitySave(city)
        isFavorited = savedItemsManager.isCitySaved(city)

        // Haptic feedback - success for save, light for unsave
        if isFavorited {
            HapticManager.shared.success()
        } else {
            HapticManager.shared.light()
        }
    }
}

// MARK: - Group Plans Paywall Card
struct GroupPlansPaywallCard: View {
    var onTapUpgrade: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "crown.fill")
                .font(.system(size: 40))
                .foregroundColor(.accentPrimary)

            Text("Unlock Group Experiences")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)

            Text("Upgrade to Litplan Pro to access curated group flows and premium experiences")
                .font(.system(size: 14))
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.md)

            Button(action: {
                HapticManager.shared.medium()
                onTapUpgrade?()
            }) {
                Text("Upgrade to Pro")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.accentPrimary)
                    .cornerRadius(12)
            }
            .padding(.horizontal, Spacing.md)
        }
        .padding(.vertical, Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.surfacePrimary)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.accentPrimary.opacity(0.3), lineWidth: 2)
                )
        )
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        CityDetailsView(city: City.sampleNYC) {
            print("Dismissed")
        }
    }
}
