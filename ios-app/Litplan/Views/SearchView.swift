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
    @State private var paywallTrigger: PaywallTrigger? = nil
    @FocusState private var isSearchFocused: Bool

    // City discovery states
    @State private var isDiscovering: Bool = false
    @State private var discoveredCity: City? = nil
    @State private var discoveryError: String? = nil

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // City preload service for background-loaded cities (used for search)
    @ObservedObject private var cityPreloadService = CityPreloadService.shared

    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // Hardcoded trending cities - always available instantly (no API call needed)
    private let trendingCities: [City] = City.trendingCities

    // Search results - uses background-loaded cities from preload service
    private var searchResults: [City] {
        if searchQuery.isEmpty {
            return []
        }
        return cityPreloadService.searchCities(query: searchQuery)
    }

    // Show loading indicator only when searching and cities haven't loaded yet
    private var isSearchLoading: Bool {
        !searchQuery.isEmpty && cityPreloadService.isLoading && !cityPreloadService.hasLoaded
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
            .sheet(item: $paywallTrigger) { trigger in
                PaywallView(trigger: trigger) {
                    paywallTrigger = nil
                }
                .environmentObject(subscriptionManager)
            }
            .onAppear {
                // Check pro status for all users (including guests)
                Task {
                    await subscriptionManager.refreshProStatus()
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

            if isSearchLoading || isDiscovering {
                // Loading state - cities loading or discovering
                VStack(spacing: Spacing.md) {
                    ProgressView()
                        .tint(.accentPrimary)

                    Text(isDiscovering ? "Discovering city..." : "Loading cities...")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xl)
            } else if searchResults.isEmpty && discoveredCity == nil {
                // No local results - offer to discover
                discoveryPromptView
            } else {
                // Search results list (local + discovered, avoiding duplicates)
                LazyVStack(spacing: Spacing.sm) {
                    // Show discovered city first if available and not already in local results
                    if let discovered = discoveredCity,
                       !searchResults.contains(where: { $0.id == discovered.id }) {
                        searchResultRow(city: discovered, isDiscovered: true)
                    }

                    // Show local search results (filter out discovered city to avoid duplicates)
                    ForEach(searchResults.filter { city in
                        discoveredCity == nil || city.id != discoveredCity?.id
                    }) { city in
                        searchResultRow(city: city, isDiscovered: false)
                    }
                }
                .padding(.horizontal, Spacing.md)
            }
        }
        .onChange(of: searchQuery) { _, _ in
            // Reset discovery state whenever search query changes
            // This prevents discovered cities from appearing in unrelated searches
            discoveredCity = nil
            discoveryError = nil
        }
    }

    // MARK: - Discovery Prompt View
    private var discoveryPromptView: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "globe")
                .font(.system(size: 48))
                .foregroundColor(.accentPrimary)
                .accessibilityHidden(true)

            Text("Can't find \"\(searchQuery)\"?")
                .font(.headline)
                .foregroundColor(.textPrimary)

            Text("We can search for this city worldwide")
                .font(.callout)
                .foregroundColor(.textSecondary)

            Button(action: {
                Task {
                    await discoverCity()
                }
            }) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "magnifyingglass.circle.fill")
                    Text("Discover City")
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.accentPrimary)
                .cornerRadius(12)
            }
            .padding(.horizontal, Spacing.xl)
            .accessibilityLabel("Discover \(searchQuery)")
            .accessibilityHint("Search worldwide for this city using AI")

            if let error = discoveryError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
    }

    // MARK: - Discovery Action
    private func discoverCity() async {
        guard !searchQuery.isEmpty else { return }

        isDiscovering = true
        discoveryError = nil

        // Dismiss keyboard
        isSearchFocused = false

        if let city = await cityPreloadService.discoverCityRemotely(query: searchQuery) {
            await MainActor.run {
                discoveredCity = city
                isDiscovering = false
                HapticManager.shared.success()
            }
        } else {
            await MainActor.run {
                discoveryError = "Could not find a city named \"\(searchQuery)\". Try a different spelling or check if it's a real city."
                isDiscovering = false
                HapticManager.shared.warning()
            }
        }
    }

    // Individual search result row
    private func searchResultRow(city: City, isDiscovered: Bool = false) -> some View {
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

                        // Show "New" badge for discovered cities
                        if isDiscovered {
                            Text("NEW")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.accentPrimary)
                                .cornerRadius(4)
                        }
                    }

                    // Show "Coming Soon" for cities with no plans
                    if city.metadata.planCount == 0 {
                        Text("Plans coming soon")
                            .font(.callout)
                            .foregroundColor(.accentPrimary)
                    } else {
                        Text("\(city.metadata.planCount) plans available")
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                    }
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
        .accessibilityHint(city.metadata.planCount == 0 ? "Newly discovered city. Plans coming soon." : "Double tap to explore \(city.metadata.planCount) nightlife plans")
    }

    // MARK: - Recent Searches Section
    private var recentSearchesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Recent Searches")
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)
                .accessibilityAddTraits(.isHeader)

            // Empty state - no search history yet
            HStack(spacing: Spacing.sm) {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundColor(.textTertiary)
                    .font(.system(size: 18))

                Text("No recent searches")
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

                // Plan count badge (top-right) - hardcoded for performance
                VStack {
                    HStack {
                        Spacer()
                        Text("50")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 4)
                            .background(Color.accentPrimary)
                            .cornerRadius(8)
                            .padding([.top, .trailing], Spacing.xs)
                        // Original: Text("\(city.metadata.displayPlanCount)")
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
        .accessibilityHint("Trending city. Double tap to explore 50 nightlife plans")
    }

    // MARK: - Action Handlers
    private func handleCityTap(_ city: City) {
        // Dismiss keyboard if open
        isSearchFocused = false

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
                // Check if they've already viewed 10 cities this week (Sprint 14: increased from 1)
                if currentViewedCities.count >= 10 {
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
                if Config.enableDebugLogging {
                    print("[SearchView] Failed to record city view: \(error)")
                }
            }
        }

        // Show city details view
        selectedCity = city
        showCityDetails = true
    }
}

// MARK: - Preview
#Preview {
    SearchView()
}
