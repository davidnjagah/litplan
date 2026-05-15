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

    init(city: City, onDismiss: @escaping () -> Void) {
        self.city = city
        self.onDismiss = onDismiss
        print("[CityDetailsView] 🏗️ INIT called for city: \(city.name) (id: \(city.id))")
    }

    @State private var selectedTab: PlanTab = .individual
    @State private var scrollOffset: CGFloat = 0

    // Swipe to dismiss state
    @State private var dragOffset: CGFloat = 0
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

    // Track which days are expanded (show all plans vs top 3)
    @State private var expandedWeekdays: Set<String> = []
    @State private var expandedGroupFlowDays: Set<String> = []

    // Number of plans to show per day before "See More"
    private let plansPerDayLimit = 3
    private let groupFlowsPerDayLimit = 3

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

    // MARK: - Group Flow Day Organization

    /// All possible days in order for group flow display
    private let groupFlowDayOrder = ["Friday", "Saturday", "Sunday", "Weekend", "Weekday", "Any Day"]

    /// Group flows organized by their display day
    private var groupFlowsByDay: [(day: String, flows: [GroupFlow])] {
        var result: [(day: String, flows: [GroupFlow])] = []

        for day in groupFlowDayOrder {
            let dayFlows = groupFlows.filter { $0.displayDay == day }
            if !dayFlows.isEmpty {
                result.append((day: day, flows: dayFlows))
            }
        }

        return result
    }

    /// Icon for a group flow day
    private func iconForGroupFlowDay(_ day: String) -> String {
        switch day.lowercased() {
        case "friday", "saturday":
            return "moon.stars.fill"
        case "sunday":
            return "sun.max.fill"
        case "weekend":
            return "moon.stars.fill"
        case "weekday":
            return "calendar.badge.clock"
        default:
            return "calendar"
        }
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

            VStack(spacing: 0) {
                // Drag handle indicator for swipe to dismiss
                dragHandle

                // Scrollable content - only show after initial render
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        // Hero image with parallax effect
                        heroImageSection
                            .frame(height: heroImageHeight)  // Required for GeometryReader in ScrollView

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
                .refreshable {
                    await refreshData()
                }
            }

            // PRIORITY: Close button ALWAYS renders first and stays visible
            // This ensures users can always dismiss the screen even if content fails to load
            closeButtonOverlay
        }
        .offset(y: dragOffset)
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
        .fullScreenCover(item: $selectedPlan) { plan in
            PlanDetailView(plan: plan) {
                selectedPlan = nil
            }
        }
        .onAppear {
            // Check if city is already saved
            isFavorited = savedItemsManager.isCitySaved(city)

            // Force load data immediately
            loadData()
        }
    }

    // MARK: - Load Data (Cache-first with parallel API fetch + timeout)
    private func loadData() {
        loadError = nil

        print("[CityDetailsView] 🚀 loadData() called for city: \(city.name) (id: \(city.id))")
        print("[CityDetailsView] 📊 Initial state - plans: \(plans.count), groupFlows: \(groupFlows.count), isLoading: \(isLoading)")

        // STEP 1: Load from cache IMMEDIATELY (no network delay)
        if let cachedPlans = CacheService.shared.getCachedPlans(for: city.id) {
            self.plans = cachedPlans
            print("[CityDetailsView] ⚡ Cache hit: \(cachedPlans.count) plans for \(city.name)")
        } else {
            print("[CityDetailsView] 💨 Cache miss: no plans cached for \(city.name)")
        }

        if let cachedFlows = CacheService.shared.getCachedGroupFlows(for: city.id) {
            self.groupFlows = cachedFlows
            print("[CityDetailsView] ⚡ Cache hit: \(cachedFlows.count) group flows for \(city.name)")
        } else {
            print("[CityDetailsView] 💨 Cache miss: no group flows cached for \(city.name)")
        }

        // If we have cached data, show it immediately (no loading spinner)
        if !plans.isEmpty || !groupFlows.isEmpty {
            isLoading = false
            hasLoadedOnce = true
            print("[CityDetailsView] ✅ Showing cached data immediately")
        } else {
            isLoading = true
            print("[CityDetailsView] ⏳ No cache - showing loading state")
        }

        // STEP 2: Fetch fresh data from API in background
        Task {
            print("[CityDetailsView] 🌐 Fetching plans and group flows from API...")

            async let plansTask = APIService.shared.fetchPlansWithFallback(cityId: city.id)
            async let flowsTask = APIService.shared.fetchGroupFlowsWithFallback(cityId: city.id)

            let (loadedPlans, loadedFlows) = await (plansTask, flowsTask)

            print("[CityDetailsView] 📦 API returned: \(loadedPlans.count) plans, \(loadedFlows.count) group flows")

            await MainActor.run {
                self.plans = loadedPlans
                self.groupFlows = loadedFlows
                self.isLoading = false
                self.hasLoadedOnce = true

                print("[CityDetailsView] ✅ Final state for \(city.name) - plans: \(plans.count), groupFlows: \(groupFlows.count), isLoading: \(isLoading)")
            }
        }

        // STEP 3: Safety timeout - ensure loading never gets stuck (10 seconds)
        Task {
            try? await Task.sleep(nanoseconds: 10_000_000_000)  // 10 seconds
            await MainActor.run {
                if isLoading {
                    isLoading = false
                    hasLoadedOnce = true
                    print("[CityDetailsView] ⏰ Loading timeout reached for \(city.name) - forcing isLoading = false")
                }
            }
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

    // MARK: - Drag Handle for Swipe to Dismiss
    private var dragHandle: some View {
        VStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.textTertiary.opacity(0.5))
                .frame(width: 36, height: 5)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .contentShape(Rectangle())
        .gesture(dismissGesture)
    }

    private var dismissGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                if value.translation.height > 0 {
                    // Apply slight resistance (0.8 multiplier) for natural feel
                    dragOffset = value.translation.height * 0.8
                }
            }
            .onEnded { value in
                if value.translation.height > 120 || value.predictedEndTranslation.height > 200 {
                    // Dismiss the view
                    HapticManager.shared.medium()
                    withAnimation(.easeOut(duration: 0.25)) {
                        dragOffset = UIScreen.main.bounds.height
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        onDismiss()
                    }
                } else {
                    // Snap back with spring animation
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        dragOffset = 0
                    }
                }
            }
    }

    // MARK: - Pull-to-Refresh Handler
    private func refreshData() async {
        // Check network connectivity
        guard NetworkMonitor.shared.isConnected else {
            await MainActor.run {
                loadError = "No internet connection. Pull down to try again."
                HapticManager.shared.warning()
            }
            return
        }

        // Reload plans
        let loadedPlans = await APIService.shared.fetchPlansWithFallback(cityId: city.id)
        await MainActor.run {
            self.plans = loadedPlans
        }

        // Reload group flows
        let loadedFlows = await APIService.shared.fetchGroupFlowsWithFallback(cityId: city.id)
        await MainActor.run {
            self.groupFlows = loadedFlows
            loadError = nil
            HapticManager.shared.success()
        }
    }

    // MARK: - Hero Image Section
    private var heroImageSection: some View {
        GeometryReader { geometry in
            let offset = geometry.frame(in: .named("scroll")).minY

            ZStack {
                AsyncImageView(url: URL(string: city.displayAssets.heroImageUrl), targetSize: CGSize(width: 400, height: heroImageHeight))
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
                // Skeleton loading state - shown while data is being fetched
                VStack(spacing: Spacing.md) {
                    // Loading header with progress indicator
                    HStack(spacing: Spacing.sm) {
                        ProgressView()
                            .tint(.accentPrimary)
                        Text("Loading plans...")
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                    }
                    .padding(.bottom, Spacing.sm)

                    // Skeleton plan cards
                    ForEach(0..<3, id: \.self) { _ in
                        skeletonPlanCard
                    }
                }
                .padding(.horizontal, Spacing.sm)
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
                        loadData()
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
                // Coming Soon state - shown for cities without plans yet
                VStack(spacing: Spacing.md) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 48))
                        .foregroundColor(.accentPrimary)

                    Text("Plans Coming Soon!")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.textPrimary)

                    Text("We're curating the best nightlife experiences in \(city.name). Check back soon!")
                        .font(.system(size: 16))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.lg)

                    // Generate in Vibez button
                    Button(action: {
                        navigateToVibez()
                    }) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Generate in Vibez")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color.accentPrimary)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.top, Spacing.sm)
                }
                .frame(height: 300)
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

    // MARK: - This Week Header (Sprint 14, Updated Sprint 16 - Removed specific dates)
    private var thisWeekHeader: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "calendar")
                .font(.system(size: 18))
                .foregroundColor(.accentPrimary)

            Text("This Week")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)

            Spacer()
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Individual Plans List (Sprint 14 - Week-based, Weekend/Weekday sections)
    // Note: Empty state is handled in plansListSection - this view only shows when plans exist
    private var individualPlansList: some View {
        LazyVStack(spacing: Spacing.lg) {
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

    // MARK: - Skeleton Loading Card
    private var skeletonPlanCard: some View {
        HStack(spacing: Spacing.md) {
            // Skeleton image placeholder
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.surfaceSecondary)
                .frame(width: 60, height: 60)

            // Skeleton text placeholders
            VStack(alignment: .leading, spacing: Spacing.xs) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.surfaceSecondary)
                    .frame(width: 150, height: 16)

                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.surfaceSecondary)
                    .frame(width: 100, height: 12)

                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.surfaceSecondary)
                    .frame(width: 80, height: 12)
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(Color.surfacePrimary)
        .cornerRadius(12)
    }

    // MARK: - Group Plans List
    private var groupPlansList: some View {
        LazyVStack(spacing: Spacing.md) {
            if groupFlows.isEmpty {
                // Coming Soon empty state for group plans
                VStack(spacing: Spacing.md) {
                    ZStack {
                        Image(systemName: "person.3.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.textTertiary)
                        Image(systemName: "sparkles")
                            .font(.system(size: 24))
                            .foregroundColor(.accentPrimary)
                            .offset(x: 30, y: -20)
                    }

                    Text("Group Plans Coming Soon!")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.textPrimary)

                    Text("Epic group experiences for \(city.name) are being curated")
                        .font(.system(size: 16))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)

                    // Generate in Vibez button
                    Button(action: {
                        navigateToVibez()
                    }) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Generate in Vibez")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color.accentPrimary)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.sm)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xxl)
            } else if groupFlowsByDay.isEmpty {
                // All group flows exist but none have day classification yet
                // Show all without day grouping (backwards compatibility)
                allGroupFlowsSection
            } else {
                // Show group flows organized by day
                groupFlowsByDaySection
            }
        }
    }

    // MARK: - All Group Flows Section (No Day Grouping)
    private var allGroupFlowsSection: some View {
        VStack(spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.xs) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.textSecondary)

                Text("Group Experiences")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.textPrimary)

                Spacer()

                Text("\(groupFlows.count) plans")
                    .font(.system(size: 13))
                    .foregroundColor(.textTertiary)
            }
            .padding(.horizontal, Spacing.sm)

            // Show all group flows for pro users, 3 for free users
            let displayFlows = isProUser ? groupFlows : Array(groupFlows.prefix(3))

            ForEach(displayFlows) { groupFlow in
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

    // MARK: - Group Flows By Day Section
    private var groupFlowsByDaySection: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Track total shown for free user limit
            let _ = freeUserGroupFlowTracker()

            ForEach(Array(groupFlowsByDay.enumerated()), id: \.element.day) { dayIndex, dayGroup in
                groupFlowDaySection(dayGroup: dayGroup, dayIndex: dayIndex)
            }
        }
    }

    /// Helper to track how many group flows free users have seen
    private func freeUserGroupFlowTracker() -> Int {
        // This is just for calculating display limits
        return 0
    }

    /// Section for a single day's group flows
    private func groupFlowDaySection(dayGroup: (day: String, flows: [GroupFlow]), dayIndex: Int) -> some View {
        let isExpanded = expandedGroupFlowDays.contains(dayGroup.day)
        let visibleFlows = isExpanded ? dayGroup.flows : Array(dayGroup.flows.prefix(groupFlowsPerDayLimit))
        let hasMoreFlows = dayGroup.flows.count > groupFlowsPerDayLimit

        return VStack(alignment: .leading, spacing: Spacing.md) {
            // Day header
            groupFlowDayHeader(day: dayGroup.day, flowCount: dayGroup.flows.count)

            // Group flow cards for this day
            ForEach(visibleFlows) { groupFlow in
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

            // "See More" button if there are more flows for this day
            if hasMoreFlows && isProUser {
                groupFlowSeeMoreButton(for: dayGroup.day, isExpanded: isExpanded, remainingCount: dayGroup.flows.count - groupFlowsPerDayLimit)
            }

            // Paywall for free users on first day section only
            if dayIndex == 0 && !isProUser && groupFlows.count > 3 {
                GroupPlansPaywallCard {
                    paywallTrigger = .groupFlow(cityName: city.name)
                }
            }
        }
    }

    /// Header for a group flow day section
    private func groupFlowDayHeader(day: String, flowCount: Int) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: iconForGroupFlowDay(day))
                .font(.system(size: 16))
                .foregroundColor(.accentPrimary)

            Text(day)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.textPrimary)

            Spacer()

            Text("\(flowCount) \(flowCount == 1 ? "plan" : "plans")")
                .font(.system(size: 13))
                .foregroundColor(.textTertiary)
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.top, Spacing.sm)
    }

    /// "See More" button for group flows
    private func groupFlowSeeMoreButton(for day: String, isExpanded: Bool, remainingCount: Int) -> some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                if isExpanded {
                    expandedGroupFlowDays.remove(day)
                } else {
                    expandedGroupFlowDays.insert(day)
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
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
        .padding(.horizontal, Spacing.sm)
    }
    // MARK: - Action Handlers

    private func navigateToVibez() {
        HapticManager.shared.medium()

        // Create SearchedCity from current city
        let searchedCity = SearchedCity(name: city.name, country: city.country)

        // Post notification to navigate to Vibez tab with this city
        NotificationCenter.default.post(
            name: .navigateToVibezWithCity,
            object: nil,
            userInfo: ["city": searchedCity]
        )

        // Dismiss this view
        onDismiss()
    }

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
    }

    private func handleSaveTap() {
        savedItemsManager.toggleCitySave(city)
        isFavorited = savedItemsManager.isCitySaved(city)
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

            Text("Upgrade to LitPlanz Pro to access curated group flows and premium experiences")
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
