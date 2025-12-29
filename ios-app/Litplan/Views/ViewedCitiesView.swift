//
//  ViewedCitiesView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 2, Day 9 - Viewed Cities tab with history of cities user has explored
//

import SwiftUI

struct ViewedCitiesView: View {
    @State private var viewedCities: [ViewedCity] = []
    @State private var isLoading: Bool = false
    @State private var isRefreshing: Bool = false
    @State private var selectedCity: City?
    @State private var showCityDetails: Bool = false

    // For mock data - in production this would be real user status
    @State private var isProUser: Bool = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                if isLoading {
                    loadingView
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
            .onAppear {
                loadViewedCities()
            }
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        LoadingStateView(message: "Loading your cities...")
    }

    // MARK: - Empty State View
    private var emptyStateView: some View {
        EmptyStateView(
            icon: "building.2.crop.circle",
            title: "No Cities Viewed Yet",
            message: "Start exploring cities to see your viewing history here"
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

                        Text("\(viewedCities.count) cit\(viewedCities.count == 1 ? "y" : "ies") viewed")
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

    // MARK: - Helper Functions

    private func loadViewedCities() {
        isLoading = true

        // Simulate API call delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            // For Day 9, using mock data
            // In production, this would call GET /user/viewedCities API
            viewedCities = ViewedCity.samples

            isLoading = false
        }
    }

    private func refreshViewedCities() async {
        isRefreshing = true

        // Simulate API refresh
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second

        // Reload data
        viewedCities = ViewedCity.samples

        isRefreshing = false
    }

    private func handleCityTap(_ viewedCity: ViewedCity) {
        // Convert ViewedCity to City for navigation
        // In production, this would fetch the full City object from the backend
        let city = convertViewedCityToCity(viewedCity)

        selectedCity = city
        showCityDetails = true
    }

    private func convertViewedCityToCity(_ viewedCity: ViewedCity) -> City {
        // For mock data, find the city from MockDataService
        if let city = MockDataService.shared.cities.first(where: { $0.id == viewedCity.cityId }) {
            return city
        }

        // Fallback: create City from ViewedCity data
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
