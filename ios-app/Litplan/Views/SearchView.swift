//
//  SearchView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Search tab - Day 5 implementation with real-time search
//

import SwiftUI

struct SearchView: View {
    @State private var searchQuery = ""
    @State private var selectedCity: City?
    @State private var showCityDetails = false
    @FocusState private var isSearchFocused: Bool

    // Get all cities from MockDataService
    private let allCities = MockDataService.shared.cities

    // Trending cities (top 6 featured cities)
    private var trendingCities: [City] {
        allCities.filter { $0.metadata.featured }.prefix(6).map { $0 }
    }

    // Search results - filter cities by name or country (case-insensitive)
    private var searchResults: [City] {
        if searchQuery.isEmpty {
            return []
        }
        return allCities.filter { city in
            city.name.localizedCaseInsensitiveContains(searchQuery) ||
            city.country.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Large search bar at top
                    searchBar
                        .padding(.top, Spacing.md)
                        .padding(.horizontal, Spacing.md)

                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(alignment: .leading, spacing: Spacing.xl) {
                            // Show search results if actively searching
                            if !searchQuery.isEmpty {
                                searchResultsSection
                            } else {
                                // Show Recent Searches (placeholder for now - Pro feature)
                                recentSearchesSection

                                // Show Trending Cities grid
                                trendingCitiesSection
                            }

                            // Bottom padding
                            Spacer()
                                .frame(height: Spacing.xl)
                        }
                        .padding(.top, Spacing.lg)
                    }
                }
            }
            .navigationBarHidden(true)
            .fullScreenCover(isPresented: $showCityDetails) {
                if let city = selectedCity {
                    CityDetailsView(city: city) {
                        showCityDetails = false
                        selectedCity = nil
                    }
                }
            }
        }
    }

    // MARK: - Search Bar Component
    private var searchBar: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(searchQuery.isEmpty ? .textTertiary : .accentPrimary)
                .font(.system(size: 20))
                .accessibilityHidden(true)

            TextField("Search cities...", text: $searchQuery)
                .font(.bodyLarge)
                .foregroundColor(.textPrimary)
                .focused($isSearchFocused)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .accessibilityLabel("Search cities")
                .accessibilityHint("Type to search for cities worldwide")

            if !searchQuery.isEmpty {
                Button(action: {
                    searchQuery = ""
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textTertiary)
                        .font(.system(size: 18))
                }
                .accessibilityLabel("Clear search")
                .frame(minWidth: 44, minHeight: 44)
            }
        }
        .padding(.horizontal, Spacing.md)
        .frame(height: 52)
        .background(Color.surfaceSecondary)
        .cornerRadius(16)
    }

    // MARK: - Search Results Section
    private var searchResultsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Search Results")
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)
                .accessibilityAddTraits(.isHeader)

            if searchResults.isEmpty {
                // No results found
                VStack(spacing: Spacing.md) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundColor(.textTertiary)
                        .accessibilityHidden(true)

                    Text("No cities found")
                        .font(.headline)
                        .foregroundColor(.textPrimary)

                    Text("Try searching for a different city")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xl)
            } else {
                // Search results list
                LazyVStack(spacing: Spacing.sm) {
                    ForEach(searchResults) { city in
                        searchResultRow(city: city)
                    }
                }
                .padding(.horizontal, Spacing.md)
            }
        }
    }

    // Individual search result row
    private func searchResultRow(city: City) -> some View {
        Button(action: {
            handleCityTap(city)
        }) {
            HStack(spacing: Spacing.md) {
                // City thumbnail
                AsyncImageView(url: URL(string: city.displayAssets.thumbnailUrl))
                    .frame(width: 60, height: 60)
                    .cornerRadius(8)
                    .clipped()
                    .accessibilityHidden(true)

                // City info
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: Spacing.xs) {
                        Text(city.name)
                            .font(.headline)
                            .foregroundColor(.textPrimary)

                        Text(city.displayAssets.countryFlag)
                            .font(.callout)
                    }

                    Text("\(city.metadata.planCount) plans this week")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Arrow indicator
                Image(systemName: "chevron.right")
                    .foregroundColor(.textTertiary)
                    .font(.system(size: 14))
                    .accessibilityHidden(true)
            }
            .padding(Spacing.sm)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(city.name), \(city.country)")
        .accessibilityHint("Double tap to explore \(city.metadata.planCount) nightlife plans")
    }

    // MARK: - Recent Searches Section (Pro Feature Placeholder)
    private var recentSearchesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Recent Searches")
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)
                .accessibilityAddTraits(.isHeader)

            // Placeholder for Pro feature
            HStack(spacing: Spacing.sm) {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundColor(.textTertiary)
                    .font(.system(size: 18))

                Text("Search history available with Litplan Pro")
                    .font(.callout)
                    .foregroundColor(.textSecondary)
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Trending Cities Section
    private var trendingCitiesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Trending Cities")
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)
                .accessibilityAddTraits(.isHeader)

            // 2-column grid of trending cities
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: Spacing.md),
                    GridItem(.flexible(), spacing: Spacing.md)
                ],
                spacing: Spacing.md
            ) {
                ForEach(trendingCities) { city in
                    trendingCityCard(city: city)
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // Trending city card (smaller: 160pt × 200pt)
    private func trendingCityCard(city: City) -> some View {
        Button(action: {
            handleCityTap(city)
        }) {
            ZStack(alignment: .bottom) {
                // Background image with gradient overlay
                AsyncImageView(url: URL(string: city.displayAssets.heroImageUrl))
                    .frame(width: 160, height: 200)
                    .clipped()

                // Gradient overlay (black 80% at bottom → transparent)
                LinearGradient(
                    gradient: Gradient(stops: [
                        .init(color: .black.opacity(0), location: 0),
                        .init(color: .black.opacity(0.4), location: 0.5),
                        .init(color: .black.opacity(0.8), location: 1)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )

                // City info at bottom
                VStack(alignment: .leading, spacing: 4) {
                    Text(city.name)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text(city.displayAssets.countryFlag)
                            .font(.caption)
                        Text(city.country)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                            .lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.sm)

                // Plan count badge (top-right)
                VStack {
                    HStack {
                        Spacer()
                        Text("\(city.metadata.planCount)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 4)
                            .background(Color.accentPrimary)
                            .cornerRadius(8)
                            .padding([.top, .trailing], Spacing.xs)
                    }
                    Spacer()
                }
            }
            .frame(width: 160, height: 200)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.3), radius: 12, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(city.name), \(city.country)")
        .accessibilityHint("Trending city. Double tap to explore \(city.metadata.planCount) nightlife plans")
    }

    // MARK: - Action Handlers
    private func handleCityTap(_ city: City) {
        // Dismiss keyboard if open
        isSearchFocused = false

        // Show city details view
        selectedCity = city
        showCityDetails = true
    }
}

// MARK: - Preview
#Preview {
    SearchView()
}
