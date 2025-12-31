//
//  ViewedCitiesView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 2, Day 9 - Viewed Cities tab with history of cities user has explored
//  Sprint 10 - Connected to real API data with pagination
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
                } else if hasError && viewedCities.isEmpty {
                    errorView
                } else if viewedCities.isEmpty {
                    emptyStateView
                } else {
                    viewedCitiesList
                }
            }
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

    // MARK: - Error View
    private var errorView: some View {
        Group {
            if let error = errorData {
                ErrorStateView(error: error) {
                    loadViewedCities()
                }
            } else {
                ErrorStateView(
                    title: "Unable to Load Cities",
                    message: "We couldn't load your viewed cities. Please try again."
                ) {
                    loadViewedCities()
                }
            }
        }
    }

    // MARK: - Empty State View
    private var emptyStateView: some View {
        EmptyStateView(
            icon: "building.2.crop.circle",
            title: "No Cities Viewed Yet",
            message: "Start exploring! Your viewing history will appear here."
        )
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
                    // Check if user is authenticated
                    if case APIError.unauthorized = error {
                        // User not authenticated - show empty state (no mock data for user-specific content)
                        viewedCities = []
                        totalCount = 0
                        hasMoreData = false
                        isLoading = false

                        if Config.enableDebugLogging {
                            print("[ViewedCitiesView] User not authenticated, showing empty state")
                        }
                    } else {
                        errorData = error
                        hasError = true
                        isLoading = false

                        if Config.enableDebugLogging {
                            print("[ViewedCitiesView] Failed to load viewed cities: \(error)")
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
}

#Preview {
    ViewedCitiesView()
}
