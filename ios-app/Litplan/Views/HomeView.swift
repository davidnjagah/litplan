//
//  HomeView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Home (Explore) tab - Day 3 implementation
//

import SwiftUI

struct HomeView: View {
    @State private var searchText = ""
    @State private var selectedCity: City?
    @State private var showCityDetails = false
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
    @State private var showGroupFlowDetails = false

    // Network monitoring
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // Cached cities for filtering after API load (fallback to MockDataService when offline)
    @State private var allCities: [City] = []
    private var trendingCities: [City] {
        Array(cities.prefix(5))
    }
    private var topUSCities: [City] {
        cities.filter { $0.country == "United States" }
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
                    // Loading state
                    LoadingStateView(message: "Loading plans...")
                        .transition(.opacity)
                } else if hasError {
                    // Error state with smart error parsing
                    Group {
                        if let error = errorData {
                            ErrorStateView(error: error) {
                                loadPlans()
                            }
                        } else {
                            ErrorStateView(
                                title: "Connection Lost",
                                message: "Unable to load plans. Please check your connection and try again."
                            ) {
                                loadPlans()
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
                                loadPlans()
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

                            // Top US Cities section
                            if !topUSCities.isEmpty {
                                citySection(
                                    title: "Top US Cities",
                                    cities: topUSCities
                                )
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
            .fullScreenCover(isPresented: $showCityDetails) {
                if let city = selectedCity {
                    CityDetailsView(city: city) {
                        showCityDetails = false
                        selectedCity = nil
                    }
                }
            }
            .fullScreenCover(isPresented: $showGroupFlowDetails) {
                if let groupFlow = selectedGroupFlow {
                    DetailedGroupFlowView(
                        groupFlow: groupFlow,
                        onDismiss: {
                            showGroupFlowDetails = false
                            selectedGroupFlow = nil
                        },
                        onUpgrade: {
                            showGroupFlowDetails = false
                            paywallTrigger = .groupFlow(cityName: getCityName(for: groupFlow))
                        }
                    )
                }
            }
            .onAppear {
                resetWeeklyLimitIfNeeded()
                if cities.isEmpty && !isLoading {
                    loadPlans()
                }
            }
            .onChange(of: networkMonitor.isConnected) { oldValue, newValue in
                if newValue && !oldValue {
                    // Connection restored
                    toast = ToastData(type: .success, message: "Connection restored")
                    // Auto-retry failed requests
                    if hasError {
                        loadPlans()
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
            // TODO: Navigate to Search tab (Day 3 task - will be implemented later)
            print("Search bar tapped - navigate to Search tab")
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

    // MARK: - Action Handlers
    private func handleCityTap(_ city: City) {
        // Haptic feedback on tap
        HapticManager.shared.medium()

        // Free users: check weekly city limit
        if !isProUser {
            // Load current viewed cities
            let currentViewedCities: Set<String>
            if let data = UserDefaults.standard.data(forKey: "viewedCitiesThisWeek"),
               let cities = try? JSONDecoder().decode(Set<String>.self, from: data) {
                currentViewedCities = cities
            } else {
                currentViewedCities = []
            }

            // If this city hasn't been viewed yet
            if !currentViewedCities.contains(city.id) {
                // Check if they've already viewed 1 city this week
                if currentViewedCities.count >= 1 {
                    paywallTrigger = .cityLimit
                    return
                }

                // Add to viewed cities
                var updatedCities = currentViewedCities
                updatedCities.insert(city.id)

                // Save back to UserDefaults
                if let data = try? JSONEncoder().encode(updatedCities) {
                    UserDefaults.standard.set(data, forKey: "viewedCitiesThisWeek")
                }
            }
        }

        // Record city view to backend (fire and forget)
        Task {
            do {
                try await APIService.shared.recordCityView(cityId: city.id)
            } catch {
                if Config.enableDebugLogging {
                    print("[HomeView] Failed to record city view: \(error)")
                }
            }
        }

        // Show city details
        selectedCity = city
        showCityDetails = true
    }

    // MARK: - Weekly City Tracking

    private var viewedCitiesThisWeek: Set<String> {
        get {
            guard let data = UserDefaults.standard.data(forKey: "viewedCitiesThisWeek"),
                  let cities = try? JSONDecoder().decode(Set<String>.self, from: data) else {
                return []
            }
            return cities
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                UserDefaults.standard.set(data, forKey: "viewedCitiesThisWeek")
            }
        }
    }

    private var lastWeekReset: Date {
        get {
            UserDefaults.standard.object(forKey: "lastWeekReset") as? Date ?? Date()
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "lastWeekReset")
        }
    }

    private func resetWeeklyLimitIfNeeded() {
        let now = Date()
        let calendar = Calendar.current

        // Check if a week has passed
        if calendar.dateComponents([.day], from: lastWeekReset, to: now).day ?? 0 >= 7 {
            // Reset by directly modifying UserDefaults
            UserDefaults.standard.removeObject(forKey: "viewedCitiesThisWeek")
            UserDefaults.standard.set(now, forKey: "lastWeekReset")
        }
    }

    // MARK: - API Data Loading

    private func loadPlans() {
        // Check internet connection first - if offline, use MockDataService fallback
        guard networkMonitor.isConnected else {
            // Use mock data as offline fallback for content data (cities/plans)
            allCities = MockDataService.shared.cities
            cities = allCities
            // Sprint 15: Load recommended group flows offline
            loadRecommendedGroupFlows()
            isLoading = false
            hasError = false

            if Config.enableDebugLogging {
                print("[HomeView] Offline - using cached/mock cities data")
            }
            return
        }

        isLoading = true
        hasError = false
        errorData = nil
        loadingStartTime = Date()

        // Fetch cities from API with fallback to mock data
        Task {
            do {
                // Use APIService's fetchCitiesWithFallback which handles offline/error cases
                let fetchedCities = await APIService.shared.fetchCitiesWithFallback()

                await MainActor.run {
                    allCities = fetchedCities
                    cities = fetchedCities
                    // Sprint 15: Load recommended group flows
                    loadRecommendedGroupFlows()
                    isLoading = false
                    hasError = false
                    loadingStartTime = nil

                    if Config.enableDebugLogging {
                        print("[HomeView] Loaded \(fetchedCities.count) cities")
                    }
                }
            }
        }
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

    /// Load recommended group flows from all available cities
    private func loadRecommendedGroupFlows() {
        // Gather group flows from all cities that have them
        var allFlows: [GroupFlow] = []

        // Get group flows from cities that have them in MockDataService
        let cityIdsWithFlows = ["nyc-001", "la-001", "mad-001"]
        for cityId in cityIdsWithFlows {
            let flows = MockDataService.shared.getGroupFlows(for: cityId)
            allFlows.append(contentsOf: flows)
        }

        // Shuffle and take up to 6 for display
        recommendedGroupFlows = Array(allFlows.shuffled().prefix(6))

        if Config.enableDebugLogging {
            print("[HomeView] Loaded \(recommendedGroupFlows.count) recommended group flows")
        }
    }

    /// Get city name for a group flow
    private func getCityName(for groupFlow: GroupFlow) -> String {
        // Match by cityId
        if let city = MockDataService.shared.cities.first(where: { $0.id == groupFlow.cityId }) {
            return city.name
        }
        // Fallback: try matching by prefix
        if let city = MockDataService.shared.cities.first(where: { groupFlow.cityId.hasPrefix($0.id.prefix(3).lowercased()) }) {
            return city.name
        }
        return "Unknown City"
    }

    /// Handle group plan tap with premium gating
    private func handleGroupPlanTap(_ groupFlow: GroupFlow) {
        HapticManager.shared.medium()

        if isProUser {
            // Pro users can view full details
            selectedGroupFlow = groupFlow
            showGroupFlowDetails = true
        } else {
            // Free users see paywall
            let cityName = getCityName(for: groupFlow)
            paywallTrigger = .groupFlow(cityName: cityName)
        }
    }

    // MARK: - Recommended Group Plans Section
    private var recommendedGroupPlansSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack {
                Text("Recommended Group Plans")
                    .font(.displayMedium)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)

                Spacer()
            }
            .padding(.horizontal, Spacing.md)
            .accessibilityAddTraits(.isHeader)

            // Horizontal scroll of group plan cards
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.md) {
                    Spacer().frame(width: Spacing.xxs)

                    ForEach(recommendedGroupFlows) { groupFlow in
                        RecommendedGroupPlanCard(
                            groupFlow: groupFlow,
                            cityName: getCityName(for: groupFlow),
                            isProUser: isProUser
                        ) {
                            handleGroupPlanTap(groupFlow)
                        } onUpgrade: {
                            let cityName = getCityName(for: groupFlow)
                            paywallTrigger = .groupFlow(cityName: cityName)
                        }
                    }

                    Spacer().frame(width: Spacing.xxs)
                }
            }
        }
    }
}

// MARK: - Sprint 15: Recommended Group Plan Card
struct RecommendedGroupPlanCard: View {
    let groupFlow: GroupFlow
    let cityName: String
    let isProUser: Bool
    var onTap: () -> Void
    var onUpgrade: () -> Void

    /// Total hours for display
    private var totalHours: Int {
        groupFlow.totalDuration / 60
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Image placeholder with lock overlay for free users
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

                // Group icon in center
                Image(systemName: "person.3.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.white.opacity(0.6))

                // Lock overlay for free users
                if !isProUser {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Image(systemName: "lock.fill")
                                .font(.caption)
                                .foregroundColor(.white)
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

            // Summary info
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

// MARK: - Preview
#Preview {
    HomeView()
        .environmentObject(NetworkMonitor.shared)
        .environmentObject(SubscriptionManager.shared)
}
