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
    @State private var paywallTrigger: PaywallTrigger? = nil
    @FocusState private var isSearchFocused: Bool

    // City discovery states
    @State private var isDiscovering: Bool = false
    @State private var discoveredCity: City? = nil
    @State private var discoveryError: String? = nil
    @State private var searchError: String? = nil

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // City preload service for background-loaded cities (used for search)
    @ObservedObject private var cityPreloadService = CityPreloadService.shared

    // City discovery manager for Pro user city discovery
    @ObservedObject private var cityDiscoveryManager = CityDiscoveryManager.shared

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
                                // Show Trending Cities grid
                                trendingCitiesSection
                            }

                            // Bottom padding
                            Spacer()
                                .frame(height: Spacing.xl)
                        }
                        .padding(.top, Spacing.lg)
                    }
                    .refreshable {
                        await refreshCities()
                    }
                }
            }
            .navigationBarHidden(true)
            .fullScreenCover(item: $selectedCity) { city in
                CityDetailsView(city: city) {
                    selectedCity = nil
                }
            }
            .sheet(item: $paywallTrigger) { trigger in
                PaywallView(trigger: trigger) {
                    paywallTrigger = nil
                }
                .environmentObject(subscriptionManager)
            }
            .onAppear {
                print("[SearchView] 🚀 onAppear")
                print("[SearchView] 📊 State - trendingCities: \(trendingCities.count), preloadedCities: \(cityPreloadService.allCities.count)")
                print("[SearchView] 📊 PreloadService - isLoading: \(cityPreloadService.isLoading), hasLoaded: \(cityPreloadService.hasLoaded)")
            }
            // Note: Pro status is managed centrally by SubscriptionManager
            // Views should read cached isProUser state, not call refresh on every onAppear
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
            } else if let error = searchError {
                // Search error state with retry option
                searchErrorView(error: error)
            } else if searchResults.isEmpty && discoveredCity == nil {
                // No local results - offer to discover
                discoveryPromptView
            } else {
                // Search results list (local + discovered, avoiding duplicates)
                LazyVStack(spacing: Spacing.sm) {
                    // Show discovered city first with "NEW" badge if available
                    if let discovered = discoveredCity {
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

    // MARK: - Search Error View
    private func searchErrorView(error: String) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.warning)
                .accessibilityHidden(true)

            Text("Search Failed")
                .font(.headline)
                .foregroundColor(.textPrimary)

            Text(error)
                .font(.callout)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)

            Button(action: {
                retrySearch()
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
            .accessibilityLabel("Retry search")
            .accessibilityHint("Double tap to search again")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
    }

    // MARK: - Retry Search
    private func retrySearch() {
        searchError = nil
        HapticManager.shared.light()

        // Trigger a re-search by forcing the preload service to reload
        Task {
            await cityPreloadService.reloadCities()
        }
    }

    // MARK: - Refresh Cities (Pull-to-Refresh)
    private func refreshCities() async {
        searchError = nil
        await cityPreloadService.reloadCities()
        HapticManager.shared.success()
    }

    // MARK: - Discovery Prompt View
    private var discoveryPromptView: some View {
        VStack(spacing: Spacing.md) {
            // Check if there's already an active discovery for this query
            if cityDiscoveryManager.isDiscoveryInProgress(for: searchQuery) {
                discoveryInProgressView
            } else {
                // Standard discovery prompt
                Image(systemName: "globe")
                    .font(.system(size: 48))
                    .foregroundColor(.accentPrimary)
                    .accessibilityHidden(true)

                Text("Can't find \"\(searchQuery)\"?")
                    .font(.headline)
                    .foregroundColor(.textPrimary)

                if isProUser {
                    // Pro users can discover new cities
                    Text("Discover this city and we'll generate plans for you")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)

                    Button(action: {
                        Task {
                            await discoverCity()
                        }
                    }) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "sparkles")
                            Text("Discover City")
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(
                            LinearGradient(
                                colors: [Color.accentPrimary, Color(hex: "#00FF88")],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, Spacing.xl)
                    .accessibilityLabel("Discover \(searchQuery)")
                    .accessibilityHint("AI will generate nightlife plans for this city")

                    Text("Takes 5-10 minutes. You'll get a notification when ready.")
                        .font(.caption)
                        .foregroundColor(.textTertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.lg)
                } else {
                    // Free users see upgrade prompt
                    Text("Pro members can discover new cities")
                        .font(.callout)
                        .foregroundColor(.textSecondary)

                    Button(action: {
                        paywallTrigger = .cityDiscovery
                    }) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "crown.fill")
                            Text("Upgrade to Pro")
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(
                            LinearGradient(
                                colors: [Color(hex: "#FFD700"), Color(hex: "#FFA500")],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, Spacing.xl)
                    .accessibilityLabel("Upgrade to Pro")
                    .accessibilityHint("Get Pro to discover new cities")
                }

                if let error = discoveryError {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.lg)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
    }

    // MARK: - Discovery In Progress View
    private var discoveryInProgressView: some View {
        VStack(spacing: Spacing.md) {
            // Animated progress indicator
            ZStack {
                Circle()
                    .stroke(Color.surfaceSecondary, lineWidth: 4)
                    .frame(width: 60, height: 60)

                Circle()
                    .trim(from: 0, to: 0.7)
                    .stroke(
                        LinearGradient(
                            colors: [Color.accentPrimary, Color(hex: "#00FF88")],
                            startPoint: .leading,
                            endPoint: .trailing
                        ),
                        style: StrokeStyle(lineWidth: 4, lineCap: .round)
                    )
                    .frame(width: 60, height: 60)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: UUID())

                Image(systemName: "sparkles")
                    .font(.system(size: 24))
                    .foregroundColor(.accentPrimary)
            }

            Text("Discovering \"\(searchQuery)\"...")
                .font(.headline)
                .foregroundColor(.textPrimary)

            if let job = cityDiscoveryManager.getDiscoveryJob(for: searchQuery),
               let estimatedTime = job.estimatedTime {
                Text("Estimated: \(estimatedTime)")
                    .font(.callout)
                    .foregroundColor(.textSecondary)
            }

            Text("We'll send you a notification when plans are ready!")
                .font(.caption)
                .foregroundColor(.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)
        }
    }

    // MARK: - Discovery Action
    private func discoverCity() async {
        guard !searchQuery.isEmpty else { return }
        guard isProUser else {
            paywallTrigger = .cityDiscovery
            return
        }

        isDiscovering = true
        discoveryError = nil

        // Dismiss keyboard
        isSearchFocused = false

        // Try local discovery first (existing city in database)
        if let city = await cityPreloadService.discoverCityRemotely(query: searchQuery) {
            await MainActor.run {
                discoveredCity = city
                isDiscovering = false
                HapticManager.shared.success()
            }
            return
        }

        // If not found locally, use the new city discovery API (Pro feature)
        // Parse city name and country from query (simple heuristic)
        let components = searchQuery.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        let cityName = components.first ?? searchQuery
        let country = components.count > 1 ? components[1] : ""

        let result = await cityDiscoveryManager.discoverCity(cityName: cityName, country: country)

        await MainActor.run {
            switch result {
            case .success(let response):
                if response.status == "available", let plans = response.plans, !plans.isEmpty {
                    // City already has plans - this shouldn't happen often
                    // but handle it gracefully
                    HapticManager.shared.success()
                } else if response.status == "started" || response.status == "in_progress" {
                    // Discovery started - show in-progress UI
                    HapticManager.shared.success()
                }
                isDiscovering = false

            case .failure(let error):
                if case DiscoveryError.proRequired = error {
                    paywallTrigger = .cityDiscovery
                } else {
                    discoveryError = error.localizedDescription
                    HapticManager.shared.warning()
                }
                isDiscovering = false
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
                AsyncImageView(url: URL(string: city.displayAssets.thumbnailUrl), targetSize: CGSize(width: 60, height: 60))
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
                AsyncImageView(url: URL(string: city.displayAssets.heroImageUrl), targetSize: CGSize(width: 160, height: 200))
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

        // Record city view to backend for analytics (fire and forget)
        Task {
            do {
                try await APIService.shared.recordCityView(cityId: city.id)
            } catch {
                if Config.enableDebugLogging {
                    print("[SearchView] Failed to record city view: \(error)")
                }
            }
        }

        // Show city details view - using item: binding
        selectedCity = city
    }
}

// MARK: - Preview
#Preview {
    SearchView()
}
