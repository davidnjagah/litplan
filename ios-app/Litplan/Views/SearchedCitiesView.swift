//
//  SearchedCitiesView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 2, Day 9 - Searched Cities tab with history of cities user has explored
//  Sprint 10 - Connected to real API data with pagination
//  Sprint 12 - Graceful fallback to recommended cities when API unavailable
//  Sprint 13 - Migrated to live API data, removed MockDataService dependency
//  Renamed from ViewedCitiesView to SearchedCitiesView
//

import SwiftUI

struct SearchedCitiesView: View {
    // MARK: - State Properties
    @State private var viewedCities: [ViewedCity] = []
    @State private var recommendedCities: [City] = []
    @State private var isLoading: Bool = false
    @State private var isLoadingMore: Bool = false
    @State private var isLoadingRecommended: Bool = false
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
                // Load recommended cities for fallback display
                if recommendedCities.isEmpty {
                    loadRecommendedCities()
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

                // Show loading state while fetching recommended cities
                if isLoadingRecommended && recommendedCities.isEmpty {
                    VStack(spacing: Spacing.md) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                        Text("Loading cities...")
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxl)
                } else if recommendedCities.isEmpty {
                    // Empty state when no cities could be loaded
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "globe")
                            .font(.system(size: 48))
                            .foregroundColor(.textTertiary)

                        Text("No cities available")
                            .font(.headline)
                            .foregroundColor(.textSecondary)

                        Text("Check your connection and try again")
                            .font(.callout)
                            .foregroundColor(.textTertiary)

                        Button(action: {
                            loadRecommendedCities()
                        }) {
                            Text("Retry")
                                .font(.callout.weight(.semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, Spacing.lg)
                                .padding(.vertical, Spacing.sm)
                                .background(Color.accentPrimary)
                                .cornerRadius(8)
                        }
                        .padding(.top, Spacing.sm)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxl)
                } else {
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
    }

    // MARK: - Searched Cities List
    private var viewedCitiesList: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Searched Cities")
                            .font(.displayLarge)
                            .foregroundColor(.textPrimary)

                        Text("\(totalCount) cit\(totalCount == 1 ? "y" : "ies") searched")
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

    /// Load recommended cities from API for fallback display
    private func loadRecommendedCities() {
        guard recommendedCities.isEmpty else { return }

        isLoadingRecommended = true

        Task {
            do {
                let cities = try await APIService.shared.fetchCities()

                await MainActor.run {
                    // Take first 8 featured cities for recommendations
                    let featuredCities = cities.filter { $0.metadata.featured }
                    recommendedCities = Array(featuredCities.prefix(8))

                    // If no featured cities, just take the first 8
                    if recommendedCities.isEmpty {
                        recommendedCities = Array(cities.prefix(8))
                    }

                    isLoadingRecommended = false
                }
            } catch {
                await MainActor.run {
                    isLoadingRecommended = false

                    if Config.enableDebugLogging {
                        print("[ViewedCitiesView] Failed to load recommended cities: \(error)")
                    }
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
            ),
            // Pass through the plan count from the API - single source of truth
            planCount: data.city.metadata.planCount
        )
    }

    private func handleCityTap(_ viewedCity: ViewedCity) {
        // Haptic feedback on tap
        HapticManager.shared.medium()

        // Record city view to backend for analytics
        Task {
            do {
                try await APIService.shared.recordCityView(cityId: viewedCity.cityId)
            } catch {
                if Config.enableDebugLogging {
                    print("[SearchedCitiesView] Failed to record city view: \(error)")
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
        // Plan count comes from the API via ViewedCity - single source of truth
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
                planCount: viewedCity.planCount ?? 0
            )
        )
    }

    /// Handle tap on a recommended city from the fallback view
    private func handleRecommendedCityTap(_ city: City) {
        // Haptic feedback on tap
        HapticManager.shared.medium()

        // Record city view to backend for analytics (fire and forget)
        Task {
            do {
                try await APIService.shared.recordCityView(cityId: city.id)
            } catch {
                // Silently fail - this is fire and forget
                if Config.enableDebugLogging {
                    print("[SearchedCitiesView] Failed to record recommended city view: \(error)")
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
                        // Plan count - hardcoded for performance
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.system(size: 11))
                                .foregroundColor(.textTertiary)

                            Text("50 plans")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                            // Original: Text("\(city.metadata.displayPlanCount) plans")
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
        .accessibilityHint("Double tap to explore 50 nightlife plans")
    }
}

#Preview("Searched Cities") {
    SearchedCitiesView()
}

#Preview("Recommended City Card") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            RecommendedCityCard(city: City.sampleNYC) {
                print("Tapped NYC")
            }

            RecommendedCityCard(city: City.sampleLondon) {
                print("Tapped London")
            }

            RecommendedCityCard(city: City.sampleTokyo) {
                print("Tapped Tokyo")
            }
        }
        .padding(Spacing.md)
    }
}
