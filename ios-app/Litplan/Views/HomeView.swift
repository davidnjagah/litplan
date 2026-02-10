//
//  HomeView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Home (Explore) tab - Day 3 implementation
//

import SwiftUI

struct HomeView: View {
    // Callback to navigate to Search tab
    var onNavigateToSearch: (() -> Void)?

    @State private var searchText = ""
    @State private var selectedCity: City?
    @State private var paywallTrigger: PaywallTrigger? = nil
    @State private var isLoading = false
    @State private var hasError = false
    @State private var errorData: Error? = nil
    @State private var cities: [City] = []
    @State private var loadingStartTime: Date? = nil
    @State private var toast: ToastData? = nil

    // Sprint 15: Recommended Group Plans
    @State private var recommendedGroupFlows: [GroupFlow] = []
    @State private var selectedGroupFlow: GroupFlow? = nil

    // Sprint 18A: Weekend Plans from various cities
    @State private var weekendPlans: [Plan] = []
    @State private var selectedPlan: Plan? = nil

    // Network monitoring
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // Cached cities for filtering after API load (fallback to CacheService when offline)
    @State private var allCities: [City] = []
    private var trendingCities: [City] {
        Array(cities.prefix(5))
    }
    private var europeanCities: [City] {
        cities.filter { $0.country == "United Kingdom" || $0.country == "France" ||
                          $0.country == "Spain" || $0.country == "Netherlands" }
    }
    private var asianCities: [City] {
        cities.filter { $0.country == "Japan" }
    }
    private var otherCities: [City] {
        cities.filter { $0.country == "United Arab Emirates" }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                // Offline banner
                if networkMonitor.showOfflineBanner {
                    VStack {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "wifi.slash")
                                .font(.system(size: 14, weight: .semibold))
                            Text("No Internet Connection")
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.textPrimary)
                        .padding(.vertical, Spacing.xs)
                        .padding(.horizontal, Spacing.md)
                        .frame(maxWidth: .infinity)
                        .background(Color.error)
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("No internet connection")

                        Spacer()
                    }
                    .zIndex(999)
                }

                if isLoading {
                    // Skeleton loading state with placeholder cards
                    skeletonLoadingView
                        .transition(.opacity)
                } else if hasError {
                    // Error state with smart error parsing
                    Group {
                        if let error = errorData {
                            ErrorStateView(error: error) {
                                Task { await loadPlans() }
                            }
                        } else {
                            ErrorStateView(
                                title: "Connection Lost",
                                message: "Unable to load plans. Please check your connection and try again."
                            ) {
                                Task { await loadPlans() }
                            }
                        }
                    }
                    .transition(.opacity)
                } else if cities.isEmpty {
                    // Empty state
                    VStack(spacing: 0) {
                        // Search bar at top
                        searchBar
                            .padding(.top, Spacing.md)

                        EmptyStateView(
                            icon: "calendar.badge.clock",
                            title: "No Plans Available",
                            message: "Check back soon! Fresh nightlife plans are generated every Monday.",
                            ctaText: "Refresh",
                            ctaAction: {
                                Task { await loadPlans() }
                            }
                        )
                    }
                    .transition(.opacity)
                } else {
                    // Content loaded successfully
                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(spacing: Spacing.lg) {
                            // Search bar at top
                            searchBar

                            // Trending This Week section
                            if !trendingCities.isEmpty {
                                citySection(
                                    title: "Trending This Week",
                                    cities: trendingCities
                                )
                            }

                            // Sprint 15: Recommended Group Plans section
                            if !recommendedGroupFlows.isEmpty {
                                recommendedGroupPlansSection
                            }

                            // Sprint 18A: Weekend Plans section
                            if !weekendPlans.isEmpty {
                                weekendPlansSection
                            }

                            // European Nights section
                            if !europeanCities.isEmpty {
                                citySection(
                                    title: "European Nights",
                                    cities: europeanCities
                                )
                            }

                            // Asian Experiences section
                            if !asianCities.isEmpty {
                                citySection(
                                    title: "Asian Experiences",
                                    cities: asianCities
                                )
                            }

                            // Global Hotspots section
                            if !otherCities.isEmpty {
                                citySection(
                                    title: "Global Hotspots",
                                    cities: otherCities
                                )
                            }

                            // Bottom padding for last section
                            Spacer()
                                .frame(height: Spacing.xl)
                        }
                        .padding(.top, Spacing.md)
                    }
                    .refreshable {
                        await refreshPlans()
                    }
                    .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: isLoading)
            .animation(.easeInOut(duration: 0.2), value: hasError)
            .navigationBarHidden(true)
            .toast($toast)
            .sheet(item: $paywallTrigger) { trigger in
                PaywallView(trigger: trigger) {
                    paywallTrigger = nil
                }
            }
            .fullScreenCover(item: $selectedCity) { city in
                CityDetailsView(city: city) {
                    selectedCity = nil
                }
                .onAppear {
                    print("[HomeView] 📱 CityDetailsView APPEARED in fullScreenCover for: \(city.name)")
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
                        paywallTrigger = .groupFlow(cityName: getCityName(for: groupFlow))
                    }
                )
            }
            .fullScreenCover(item: $selectedPlan) { plan in
                PlanDetailView(plan: plan) {
                    selectedPlan = nil
                }
            }
            .task {
                // Load plans if not already loaded
                if cities.isEmpty {
                    await loadPlans()
                }
                // Note: Pro status is managed centrally by SubscriptionManager
                // Views should read cached isProUser state, not call refresh on every onAppear
            }
            .onChange(of: networkMonitor.isConnected) { oldValue, newValue in
                if newValue && !oldValue {
                    // Connection restored
                    toast = ToastData(type: .success, message: "Connection restored")
                    // Auto-retry failed requests
                    if hasError {
                        Task { await loadPlans() }
                    }
                }
            }
        }
    }

    // MARK: - Search Bar Component
    private var searchBar: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.textTertiary)
                .font(.system(size: 16))
                .accessibilityHidden(true)

            Text("Search cities...")
                .font(.body)
                .foregroundColor(.textTertiary)

            Spacer()
        }
        .padding(.horizontal, Spacing.md)
        .frame(height: 44)
        .background(Color.surfaceSecondary)
        .cornerRadius(12)
        .padding(.horizontal, Spacing.md)
        .accessibilityLabel("Search cities")
        .accessibilityHint("Double tap to search for cities worldwide")
        .accessibilityAddTraits(.isButton)
        .onTapGesture {
            // Haptic feedback for search tap
            HapticManager.shared.light()
            // Navigate to Search tab
            onNavigateToSearch?()
        }
    }

    // MARK: - City Section Component
    private func citySection(title: String, cities: [City]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            Text(title)
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)
                .accessibilityAddTraits(.isHeader)

            // Horizontal scrolling city cards (REVERTED)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.lg) {
                    Spacer().frame(width: Spacing.xxs)

                    ForEach(cities) { city in
                        CityCardStack(city: city) {
                            handleCityTap(city)
                        }
                    }

                    Spacer().frame(width: Spacing.xxs)
                }
            }
        }
    }

    // MARK: - Skeleton Loading View
    private var skeletonLoadingView: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: Spacing.lg) {
                // Skeleton search bar
                skeletonSearchBar
                    .padding(.horizontal, Spacing.md)

                // Skeleton section header
                skeletonSectionHeader
                    .padding(.horizontal, Spacing.md)

                // Skeleton city cards (horizontal scroll)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.lg) {
                        Spacer().frame(width: Spacing.xxs)
                        ForEach(0..<3, id: \.self) { _ in
                            skeletonCityCard
                        }
                        Spacer().frame(width: Spacing.xxs)
                    }
                }

                // Second skeleton section
                skeletonSectionHeader
                    .padding(.horizontal, Spacing.md)

                // More skeleton city cards
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.lg) {
                        Spacer().frame(width: Spacing.xxs)
                        ForEach(0..<3, id: \.self) { _ in
                            skeletonCityCard
                        }
                        Spacer().frame(width: Spacing.xxs)
                    }
                }

                Spacer()
            }
            .padding(.top, Spacing.md)
        }
    }

    private var skeletonSearchBar: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.surfaceSecondary)
            .frame(height: 44)
    }

    private var skeletonSectionHeader: some View {
        HStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.surfaceSecondary)
                .frame(width: 160, height: 24)
            Spacer()
        }
    }

    private var skeletonCityCard: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Skeleton image
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.surfaceSecondary)
                .frame(width: 280, height: 180)

            // Skeleton title
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.surfaceSecondary)
                .frame(width: 120, height: 20)

            // Skeleton subtitle
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.surfaceSecondary)
                .frame(width: 80, height: 14)
        }
    }

    // MARK: - Action Handlers
    private func handleCityTap(_ city: City) {
        print("[HomeView] 👆 handleCityTap called for city: \(city.name) (id: \(city.id))")

        // Haptic feedback on tap
        HapticManager.shared.medium()

        // Record city view to backend for analytics (fire and forget)
        Task {
            do {
                try await APIService.shared.recordCityView(cityId: city.id)
            } catch {
                print("[HomeView] ❌ Failed to record city view: \(error)")
            }
        }

        // Show city details - using item: binding, so just set the city
        selectedCity = city
        print("[HomeView] ✅ Set selectedCity=\(city.name)")
    }


    // MARK: - API Data Loading (Cache-First Strategy)

    @MainActor
    private func loadPlans() async {
        hasError = false
        errorData = nil

        print("[HomeView] 🚀 loadPlans() called - isLoading: \(isLoading), cities: \(cities.count)")

        // STEP 1: Load from cache IMMEDIATELY (no network delay)
        if let cachedCities = CacheService.shared.getCachedCities(), !cachedCities.isEmpty {
            allCities = cachedCities
            cities = cachedCities
            isLoading = false  // Show cached content immediately

            print("[HomeView] ⚡ Loaded \(cachedCities.count) cities from cache (instant)")

            // Load supplementary data with cached cities
            loadRecommendedGroupFlows()
            loadWeekendPlans()
        } else {
            // No cache - show loading state
            isLoading = true
            print("[HomeView] ⏳ No cache found, showing loading state")
        }

        // STEP 2: Fetch fresh data from API in background
        loadingStartTime = Date()
        print("[HomeView] 🌐 Fetching cities from API... (network: \(networkMonitor.isConnected))")
        let fetchedCities = await APIService.shared.fetchCitiesWithFallback()
        loadingStartTime = nil

        print("[HomeView] 📦 API returned \(fetchedCities.count) cities")

        // Update with fresh data
        allCities = fetchedCities
        cities = fetchedCities
        isLoading = false

        // Load supplementary data with fresh cities
        loadRecommendedGroupFlows()
        loadWeekendPlans()

        print("[HomeView] ✅ Final state - cities: \(cities.count), isLoading: \(isLoading), hasError: \(hasError)")
    }

    private func refreshPlans() async {
        // Check if offline
        guard networkMonitor.isConnected else {
            // Show toast for pull-to-refresh while offline
            toast = ToastData(
                type: .warning,
                message: "No internet connection. Please try again when online."
            )
            HapticManager.shared.warning()
            return
        }

        // Fetch fresh cities from API with fallback
        let fetchedCities = await APIService.shared.fetchCitiesWithFallback()
        allCities = fetchedCities
        cities = fetchedCities

        // Show success toast
        if !cities.isEmpty {
            toast = ToastData(type: .success, message: "Plans updated")
            HapticManager.shared.success()
        }
    }

    // MARK: - Sprint 15: Recommended Group Plans

    /// Load recommended group flows - uses sample data for reliable display
    private func loadRecommendedGroupFlows() {
        // Use sample group flows for consistent display
        // These will always show in the Explore view
        recommendedGroupFlows = GroupFlow.sampleGroupFlows
        print("[HomeView] ✅ Loaded \(recommendedGroupFlows.count) recommended group flows (sample data)")
    }

    // MARK: - Sprint 18A: Weekend Plans

    /// Load weekend plans - uses sample data for reliable display
    private func loadWeekendPlans() {
        // Use sample weekend plans for consistent display
        // These will always show in the Explore view
        weekendPlans = Plan.sampleWeekendPlans
        print("[HomeView] ✅ Loaded \(weekendPlans.count) weekend plans (sample data)")
    }

    /// Get city name for a group flow
    private func getCityName(for groupFlow: GroupFlow) -> String {
        // Match by cityId from loaded cities (from API or cache)
        if let city = allCities.first(where: { $0.id == groupFlow.cityId }) {
            return city.name
        }
        // Fallback: try matching by prefix
        if let city = allCities.first(where: { groupFlow.cityId.hasPrefix($0.id.prefix(3).lowercased()) }) {
            return city.name
        }
        return "Unknown City"
    }

    /// Handle group plan tap with premium gating
    private func handleGroupPlanTap(_ groupFlow: GroupFlow) {
        HapticManager.shared.medium()

        if isProUser {
            // Pro users can view full details - using item: binding
            selectedGroupFlow = groupFlow
        } else {
            // Free users see paywall
            let cityName = getCityName(for: groupFlow)
            paywallTrigger = .groupFlow(cityName: cityName)
        }
    }

    // MARK: - Recommended Group Plans Section (Sprint 18A: Updated to match CityDetailsView style)
    private var recommendedGroupPlansSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack {
                Text("Recommended Group Plans")
                    .font(.displayMedium)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)

                Spacer()

                if !isProUser {
                    // PRO badge for free users
                    Text("PRO")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.accentPrimary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.accentPrimary.opacity(0.15))
                        .cornerRadius(4)
                }
            }
            .padding(.horizontal, Spacing.md)
            .accessibilityAddTraits(.isHeader)

            // Horizontal scroll of GroupFlowCards (same style as CityDetailsView)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.md) {
                    Spacer().frame(width: Spacing.xxs)

                    if isProUser {
                        // Pro users see all plans
                        ForEach(recommendedGroupFlows) { groupFlow in
                            GroupFlowCard(
                                groupFlow: groupFlow,
                                isProUser: true,
                                onTapViewItinerary: {
                                    handleGroupPlanTap(groupFlow)
                                },
                                onTapUnlock: nil,
                                cityName: getCityName(for: groupFlow)
                            )
                            .frame(width: 320)
                        }
                    } else {
                        // Free users: Show first 2 plans visible, rest hidden behind "Explore More"
                        ForEach(Array(recommendedGroupFlows.prefix(2).enumerated()), id: \.element.id) { _, groupFlow in
                            GroupFlowCard(
                                groupFlow: groupFlow,
                                isProUser: false,
                                onTapViewItinerary: {
                                    // Free users tapping shows paywall
                                    HapticManager.shared.warning()
                                    let cityName = getCityName(for: groupFlow)
                                    paywallTrigger = .groupFlow(cityName: cityName)
                                },
                                onTapUnlock: {
                                    let cityName = getCityName(for: groupFlow)
                                    paywallTrigger = .groupFlow(cityName: cityName)
                                },
                                cityName: getCityName(for: groupFlow)
                            )
                            .frame(width: 320)
                        }

                        // "Explore More" overlay card for free users
                        if recommendedGroupFlows.count > 2 {
                            ExploreMoreOverlayCard {
                                HapticManager.shared.medium()
                                paywallTrigger = .groupFlow(cityName: "Premium")
                            }
                        }
                    }

                    Spacer().frame(width: Spacing.xxs)
                }
            }
        }
    }

    // MARK: - Sprint 18A: Weekend Plans Section (Horizontal Scroll)
    private var weekendPlansSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.xs) {
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.accentPrimary)
                    .accessibilityHidden(true)

                Text("Weekend Plans")
                    .font(.displayMedium)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)

                Spacer()

                if !isProUser {
                    // PRO badge for free users
                    Text("PRO")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.accentPrimary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.accentPrimary.opacity(0.15))
                        .cornerRadius(4)
                }

                Text("\(weekendPlans.count) plans")
                    .font(.system(size: 13))
                    .foregroundColor(.textTertiary)
            }
            .padding(.horizontal, Spacing.md)
            .accessibilityAddTraits(.isHeader)

            // Horizontal scroll of weekend plan cards
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.md) {
                    Spacer().frame(width: Spacing.xxs)

                    if isProUser {
                        // Pro users see all weekend plans
                        ForEach(weekendPlans) { plan in
                            WeekendPlanCard(plan: plan, isBlurred: false) {
                                handleWeekendPlanTap(plan)
                            }
                        }
                    } else {
                        // Free users: First 2 visible, rest blurred with unlock overlay
                        ForEach(Array(weekendPlans.prefix(2).enumerated()), id: \.element.id) { _, plan in
                            WeekendPlanCard(plan: plan, isBlurred: false) {
                                // Tapping shows paywall for free users
                                HapticManager.shared.warning()
                                paywallTrigger = .weekendPlan(cityName: plan.cityName)
                            }
                        }

                        // Blurred cards for remaining plans
                        if weekendPlans.count > 2 {
                            WeekendPlanUnlockCard(remainingCount: weekendPlans.count - 2) {
                                HapticManager.shared.medium()
                                paywallTrigger = .weekendPlan(cityName: "Premium")
                            }
                        }
                    }

                    Spacer().frame(width: Spacing.xxs)
                }
            }
        }
    }

    // MARK: - Weekend Plan Tap Handler
    private func handleWeekendPlanTap(_ plan: Plan) {
        HapticManager.shared.medium()

        if isProUser {
            // Using item: binding - just set the plan
            selectedPlan = plan
        } else {
            HapticManager.shared.warning()
            paywallTrigger = .weekendPlan(cityName: plan.cityName)
        }
    }
}

// MARK: - Sprint 15: Recommended Group Plan Card
struct RecommendedGroupPlanCard: View {
    let groupFlow: GroupFlow
    let cityName: String
    let isProUser: Bool
    let isFreePreview: Bool  // True for the 2 free plans shown to free users
    var onTap: () -> Void
    var onUpgrade: () -> Void

    /// Total hours for display
    private var totalHours: Int {
        groupFlow.totalDuration / 60
    }

    /// Show full details if pro user OR if this is a free preview card
    private var showFullDetails: Bool {
        isProUser || isFreePreview
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Image placeholder with crown overlay for premium content
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.surfaceSecondary)
                    .frame(width: 200, height: 120)

                // Gradient overlay for visual interest
                LinearGradient(
                    gradient: Gradient(colors: [Color.accentPrimary.opacity(0.3), Color.accentSecondary.opacity(0.2)]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .cornerRadius(12)
                .frame(width: 200, height: 120)

                // Crown icon in center (indicates premium content)
                Image(systemName: "crown.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.white.opacity(0.6))

                // Crown badge overlay for premium/locked content (non-free preview plans for free users)
                if !isProUser && !isFreePreview {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Image(systemName: "crown.fill")
                                .font(.caption)
                                .foregroundColor(.yellow)
                                .padding(6)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(4)
                                .padding(8)
                        }
                    }
                    .frame(width: 200, height: 120)
                }
            }

            // City name
            Text(cityName)
                .font(.caption)
                .foregroundColor(.accentPrimary)
                .fontWeight(.medium)

            // Group Plan title
            Text(groupFlow.title)
                .font(.callout)
                .fontWeight(.medium)
                .foregroundColor(.textPrimary)
                .lineLimit(2)

            // Summary info - always show for free preview or pro users
            HStack(spacing: Spacing.sm) {
                Label("\(groupFlow.activities.count) venues", systemImage: "mappin.and.ellipse")
                Label("\(totalHours)h", systemImage: "clock")
            }
            .font(.caption)
            .foregroundColor(.textSecondary)
        }
        .frame(width: 200)
        .onTapGesture {
            if isProUser {
                onTap()
            } else {
                // Free users: tapping shows paywall (even for free preview cards)
                HapticManager.shared.warning()
                onUpgrade()
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(cityName), \(groupFlow.title), \(groupFlow.activities.count) venues, \(totalHours) hours")
        .accessibilityHint(isProUser ? "Double tap to view full itinerary" : "Double tap to unlock with Pro")
        .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Explore More Overlay Card
struct ExploreMoreOverlayCard: View {
    var onTap: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            Spacer()

            // Crown icon
            Image(systemName: "crown.fill")
                .font(.system(size: 40))
                .foregroundColor(.accentPrimary)

            // Arrow in circle icon
            Image(systemName: "arrow.right.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.accentPrimary)

            // Text
            VStack(spacing: Spacing.xs) {
                Text("Explore More")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)

                Text("Unlock All Group Plans")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }

            Spacer()
        }
        .frame(width: 320, height: 350)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.surfacePrimary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.accentPrimary.opacity(0.3), lineWidth: 2)
                )
        )
        .onTapGesture {
            onTap()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Explore more group plans")
        .accessibilityHint("Double tap to unlock all premium plans")
        .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Sprint 18A: Weekend Plan Card (Horizontal Scroll Version)
struct WeekendPlanCard: View {
    let plan: Plan
    let isBlurred: Bool
    var onTap: () -> Void

    // Fallback image URL for plans without images
    private var planImageUrl: URL? {
        if let firstImage = plan.images.first, !firstImage.isEmpty {
            return URL(string: firstImage)
        }
        return URL(string: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Plan image
            ZStack {
                AsyncImageView(url: planImageUrl, targetSize: CGSize(width: 200, height: 120))
                    .frame(width: 200, height: 120)
                    .cornerRadius(12)
                    .blur(radius: isBlurred ? 6 : 0)

                // Gradient overlay for text readability
                LinearGradient(
                    gradient: Gradient(colors: [Color.clear, Color.black.opacity(0.6)]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .cornerRadius(12)
                .frame(width: 200, height: 120)

                // Weekend badge
                VStack {
                    HStack {
                        Text(plan.schedule.dayOfWeek)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.accentPrimary)
                            .cornerRadius(4)

                        Spacer()
                    }
                    .padding(8)

                    Spacer()
                }
                .frame(width: 200, height: 120)
            }

            // City name
            Text(plan.cityName)
                .font(.caption)
                .foregroundColor(.accentPrimary)
                .fontWeight(.medium)

            // Plan title
            Text(plan.title)
                .font(.callout)
                .fontWeight(.semibold)
                .foregroundColor(.textPrimary)
                .lineLimit(2)

            // Venue and time info
            HStack(spacing: Spacing.sm) {
                Label(plan.venueName, systemImage: "mappin.and.ellipse")
                    .lineLimit(1)
                Label(plan.formattedTimeRange, systemImage: "clock")
            }
            .font(.caption)
            .foregroundColor(.textSecondary)

            // Price tag
            HStack {
                Text(plan.pricing.priceRange)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.textSecondary)

                Spacer()

                if let rank = plan.flags.rank, rank <= 3 {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                        Text("Top \(rank)")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundColor(.accentPrimary)
                }
            }
        }
        .frame(width: 200)
        .padding(Spacing.sm)
        .background(Color.surfacePrimary)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.surfaceSecondary, lineWidth: 1)
        )
        .onTapGesture {
            onTap()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(plan.cityName), \(plan.title), \(plan.venueName), \(plan.schedule.dayOfWeek)")
        .accessibilityHint("Double tap to view plan details")
        .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Sprint 18A: Weekend Plan Unlock Card
struct WeekendPlanUnlockCard: View {
    let remainingCount: Int
    var onTap: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            // Arrow down icon in circle
            ZStack {
                Circle()
                    .fill(Color.accentPrimary)
                    .frame(width: 48, height: 48)

                Image(systemName: "arrow.down.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.textPrimary)
            }
            .shadow(color: Color.accentPrimary.opacity(0.4), radius: 8, x: 0, y: 4)

            VStack(spacing: Spacing.xxs) {
                Text("Unlock \(remainingCount) More")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.textPrimary)

                Text("Weekend Plans")
                    .font(.system(size: 13))
                    .foregroundColor(.textSecondary)
            }

            // Crown icon for premium
            Image(systemName: "crown.fill")
                .font(.system(size: 20))
                .foregroundColor(.accentPrimary)
        }
        .frame(width: 200, height: 220)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.surfaceSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.accentPrimary.opacity(0.3), lineWidth: 2)
                )
        )
        .onTapGesture {
            onTap()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Unlock \(remainingCount) more weekend plans")
        .accessibilityHint("Double tap to upgrade to Pro")
        .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Preview
#Preview {
    HomeView()
        .environmentObject(NetworkMonitor.shared)
        .environmentObject(SubscriptionManager.shared)
}
