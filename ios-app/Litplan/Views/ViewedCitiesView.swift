//
//  ViewedCitiesView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 2, Day 9 - Viewed Cities tab with history of cities user has explored
//  Sprint 10 - Connected to real API data with pagination
//  Sprint 12 - Graceful fallback to recommended cities when API unavailable
//

import SwiftUI

struct ViewedCitiesView: View {
    // MARK: - State Properties
    @State private var viewedCities: [ViewedCity] = []
    @State private var isLoading: Bool = false
    @State private var isLoadingMore: Bool = false
    @State private var isRefreshing: Bool = false
    @State private var hasError: Bool = false
    @State private var errorData: Error?
    @State private var selectedCity: City?
    @State private var showCityDetails: Bool = false
    @State private var paywallTrigger: PaywallTrigger? = nil
    @State private var showingRecommendations: Bool = false

    // Pagination state
    @State private var currentOffset: Int = 0
    @State private var hasMoreData: Bool = true
    @State private var totalCount: Int = 0
    private let pageSize: Int = 20

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // Recommended cities from MockDataService
    private var recommendedCities: [City] {
        Array(MockDataService.shared.cities.prefix(8))
    }

    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                if isLoading && viewedCities.isEmpty {
                    loadingView
                        .transition(.opacity)
                } else if viewedCities.isEmpty {
                    // Show recommended cities instead of error or empty state
                    recommendedCitiesView
                        .transition(.opacity)
                } else {
                    viewedCitiesList
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: isLoading)
            .navigationBarHidden(true)
            .fullScreenCover(isPresented: $showCityDetails) {
                if let city = selectedCity {
                    CityDetailsView(city: city) {
                        showCityDetails = false
                    }
                }
            }
            .sheet(item: $paywallTrigger) { trigger in
                PaywallView(trigger: trigger) {
                    paywallTrigger = nil
                }
                .environmentObject(subscriptionManager)
            }
            .onAppear {
                if viewedCities.isEmpty {
                    loadViewedCities()
                }
            }
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        LoadingStateView(message: "Loading your cities...")
    }

    // MARK: - Recommended Cities View (Fallback for empty/error states)
    private var recommendedCitiesView: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                // Header section
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    // Main title
                    Text(showingRecommendations ? "Discover Cities" : "Start Exploring")
                        .font(.displayLarge)
                        .foregroundColor(.textPrimary)

                    // Subtitle
                    Text(showingRecommendations ? "Popular destinations to explore" : "Check out these popular destinations")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Spacing.md)
                .padding(.top, 60) // Account for safe area
                .padding(.bottom, Spacing.lg)

                // Recommended cities list
                LazyVStack(spacing: Spacing.md) {
                    ForEach(recommendedCities) { city in
                        RecommendedCityCard(city: city) {
                            handleRecommendedCityTap(city)
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.lg)
            }
        }
    }

    // MARK: - Viewed Cities List
    private var viewedCitiesList: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Viewed Cities")
                            .font(.displayLarge)
                            .foregroundColor(.textPrimary)

                        Text("\(totalCount) cit\(totalCount == 1 ? "y" : "ies") viewed")
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, 60) // Account for safe area
                .padding(.bottom, Spacing.lg)

                // Cities list
                LazyVStack(spacing: Spacing.md) {
                    ForEach(viewedCities) { viewedCity in
                        ViewedCityCard(viewedCity: viewedCity) {
                            handleCityTap(viewedCity)
                        }
                        .onAppear {
                            // Load more when reaching near the end
                            if viewedCity.id == viewedCities.last?.id && hasMoreData && !isLoadingMore {
                                loadMoreCities()
                            }
                        }
                    }

                    // Loading more indicator
                    if isLoadingMore {
                        HStack {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                            Text("Loading more...")
                                .font(.callout)
                                .foregroundColor(.textSecondary)
                        }
                        .padding(.vertical, Spacing.md)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.lg)
            }
        }
        .refreshable {
            await refreshViewedCities()
        }
    }

    // MARK: - Data Loading Functions

    private func loadViewedCities() {
        isLoading = true
        hasError = false
        errorData = nil
        currentOffset = 0

        Task {
            do {
                let response = try await APIService.shared.fetchViewedCities(limit: pageSize, offset: 0)

                await MainActor.run {
                    // Convert ViewedCityData to ViewedCity
                    viewedCities = response.cities.map { convertToViewedCity($0) }
                    totalCount = response.total
                    hasMoreData = response.hasMore
                    currentOffset = viewedCities.count
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    // On any error, gracefully fall back to recommended cities
                    viewedCities = []
                    totalCount = 0
                    hasMoreData = false
                    isLoading = false
                    showingRecommendations = true

                    if Config.enableDebugLogging {
                        if case APIError.unauthorized = error {
                            print("[ViewedCitiesView] User not authenticated, showing recommended cities")
                        } else {
                            print("[ViewedCitiesView] API error, falling back to recommended cities: \(error)")
                        }
                    }
                }
            }
        }
    }

    private func loadMoreCities() {
        guard !isLoadingMore && hasMoreData else { return }

        isLoadingMore = true

        Task {
            do {
                let response = try await APIService.shared.fetchViewedCities(limit: pageSize, offset: currentOffset)

                await MainActor.run {
                    let newCities = response.cities.map { convertToViewedCity($0) }
                    viewedCities.append(contentsOf: newCities)
                    hasMoreData = response.hasMore
                    currentOffset += newCities.count
                    isLoadingMore = false
                }
            } catch {
                await MainActor.run {
                    isLoadingMore = false

                    if Config.enableDebugLogging {
                        print("[ViewedCitiesView] Failed to load more cities: \(error)")
                    }
                }
            }
        }
    }

    private func refreshViewedCities() async {
        isRefreshing = true
        currentOffset = 0

        do {
            let response = try await APIService.shared.fetchViewedCities(limit: pageSize, offset: 0)

            await MainActor.run {
                viewedCities = response.cities.map { convertToViewedCity($0) }
                totalCount = response.total
                hasMoreData = response.hasMore
                currentOffset = viewedCities.count
                hasError = false
                errorData = nil
                isRefreshing = false
            }
        } catch {
            await MainActor.run {
                isRefreshing = false

                // Don't show error on refresh if we already have data
                if viewedCities.isEmpty {
                    errorData = error
                    hasError = true
                }

                if Config.enableDebugLogging {
                    print("[ViewedCitiesView] Failed to refresh viewed cities: \(error)")
                }
            }
        }
    }

    // MARK: - Helper Functions

    /// Convert ViewedCityData (API response) to ViewedCity (local model)
    private func convertToViewedCity(_ data: ViewedCityData) -> ViewedCity {
        return ViewedCity(
            cityId: data.cityId,
            name: data.city.name,
            country: data.city.country,
            viewedAt: ViewedCity.ViewedTimestamp(
                seconds: Int64(data.lastViewedAt.timeIntervalSince1970),
                nanoseconds: 0
            ),
            viewCount: data.viewCount,
            displayAssets: ViewedCity.DisplayAssets(
                heroImageUrl: data.city.displayAssets.heroImageUrl,
                thumbnailUrl: data.city.displayAssets.thumbnailUrl,
                countryFlag: data.city.displayAssets.countryFlag
            )
        )
    }

    private func handleCityTap(_ viewedCity: ViewedCity) {
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

            // If this city hasn't been viewed yet this week
            if !currentViewedCities.contains(viewedCity.cityId) {
                // Check if they've already viewed 1 city this week
                if currentViewedCities.count >= 1 {
                    HapticManager.shared.warning()
                    paywallTrigger = .cityLimit
                    return
                }

                // Add to viewed cities
                var updatedCities = currentViewedCities
                updatedCities.insert(viewedCity.cityId)

                // Save back to UserDefaults
                if let data = try? JSONEncoder().encode(updatedCities) {
                    UserDefaults.standard.set(data, forKey: "viewedCitiesThisWeek")
                }
            }
        }

        // Record city view to backend
        Task {
            do {
                try await APIService.shared.recordCityView(cityId: viewedCity.cityId)
            } catch {
                if Config.enableDebugLogging {
                    print("[ViewedCitiesView] Failed to record city view: \(error)")
                }
            }
        }

        // Convert ViewedCity to City for navigation
        let city = convertViewedCityToCity(viewedCity)

        selectedCity = city
        showCityDetails = true
    }

    private func convertViewedCityToCity(_ viewedCity: ViewedCity) -> City {
        // Create City from ViewedCity data (API data)
        // The ViewedCity contains all the necessary city information from the API response
        return City(
            id: viewedCity.cityId,
            name: viewedCity.name,
            country: viewedCity.country,
            displayAssets: City.DisplayAssets(
                heroImageUrl: viewedCity.displayAssets.heroImageUrl ?? "",
                thumbnailUrl: viewedCity.displayAssets.thumbnailUrl ?? "",
                countryFlag: viewedCity.displayAssets.countryFlag
            ),
            coordinates: City.Coordinates(latitude: 0, longitude: 0),
            metadata: City.CityMetadata(
                timezone: "UTC",
                currency: "USD",
                featured: false,
                planCount: 50
            )
        )
    }

    /// Handle tap on a recommended city from the fallback view
    private func handleRecommendedCityTap(_ city: City) {
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

            // If this city hasn't been viewed yet this week
            if !currentViewedCities.contains(city.id) {
                // Check if they've already viewed 1 city this week
                if currentViewedCities.count >= 1 {
                    HapticManager.shared.warning()
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
                // Silently fail - this is fire and forget
                if Config.enableDebugLogging {
                    print("[ViewedCitiesView] Failed to record recommended city view: \(error)")
                }
            }
        }

        // Navigate to city details
        selectedCity = city
        showCityDetails = true
    }
}

// MARK: - Recommended City Card Component
/// Card component for displaying recommended cities in the fallback view
struct RecommendedCityCard: View {
    let city: City
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.sm) {
                // Left: City thumbnail image (80x80pt matching ViewedCityCard)
                AsyncImageView(url: URL(string: city.displayAssets.thumbnailUrl))
                    .frame(width: 80, height: 80)
                    .cornerRadius(12)
                    .clipped()

                // Right: City info
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    // City name
                    Text(city.name)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)

                    // Country with flag
                    HStack(spacing: 4) {
                        Text(city.displayAssets.countryFlag)
                            .font(.system(size: 14))

                        Text(city.country)
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Plan count and featured badge
                    HStack(spacing: Spacing.sm) {
                        // Plan count
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.system(size: 11))
                                .foregroundColor(.textTertiary)

                            Text("\(city.metadata.planCount) plans")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }

                        // Featured badge if applicable
                        if city.metadata.featured {
                            Text("Featured")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.accentPrimary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule()
                                        .fill(Color.accentPrimary.opacity(0.15))
                                )
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Right chevron indicator
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textTertiary)
            }
            .padding(Spacing.sm)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(city.name), \(city.country)")
        .accessibilityHint("Double tap to explore \(city.metadata.planCount) nightlife plans")
    }
}

#Preview("Viewed Cities") {
    ViewedCitiesView()
}

#Preview("Recommended City Card") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            RecommendedCityCard(city: MockDataService.shared.cities[0]) {
                print("Tapped NYC")
            }

            RecommendedCityCard(city: MockDataService.shared.cities[3]) {
                print("Tapped London")
            }

            RecommendedCityCard(city: MockDataService.shared.cities[5]) {
                print("Tapped Tokyo")
            }
        }
        .padding(Spacing.md)
    }
}
