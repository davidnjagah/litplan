//
//  SearchView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Search tab with MapKit city suggestions
//

import SwiftUI
import MapKit
import UIKit

struct SearchView: View {
    @State private var searchQuery = ""
    @State private var selectedCity: City?
    @State private var paywallTrigger: PaywallTrigger? = nil
    @FocusState private var isSearchFocused: Bool

    // City from MapKit suggestion (shows as card before opening)
    @State private var discoveredCity: DiscoveredCityCard? = nil
    @State private var searchError: String? = nil

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // City preload service for background-loaded cities
    @ObservedObject private var cityPreloadService = CityPreloadService.shared

    // City search manager for MapKit suggestions
    @StateObject private var citySearchManager = CitySearchManager.shared

    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // Hardcoded trending cities
    private let trendingCities: [City] = City.trendingCities

    // Search results from preloaded cities
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
                    // Search bar
                    searchBar
                        .padding(.top, Spacing.md)
                        .padding(.horizontal, Spacing.md)

                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(alignment: .leading, spacing: Spacing.xl) {
                            if !searchQuery.isEmpty {
                                searchResultsSection
                            } else {
                                trendingCitiesSection
                            }

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
            }
            .onAppear {
                print("[SearchView] onAppear")
            }
        }
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(searchQuery.isEmpty ? .textTertiary : .accentPrimary)
                .font(.system(size: 20))

            TextField("Search cities...", text: $searchQuery)
                .font(.bodyLarge)
                .foregroundColor(.textPrimary)
                .focused($isSearchFocused)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .onChange(of: searchQuery) { _, newValue in
                    // Sync with MapKit search
                    citySearchManager.searchQuery = newValue
                    // Clear discovered city when query changes
                    discoveredCity = nil
                }

            if !searchQuery.isEmpty {
                Button(action: {
                    searchQuery = ""
                    discoveredCity = nil
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textTertiary)
                        .font(.system(size: 18))
                }
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

            if isSearchLoading {
                // Loading state
                VStack(spacing: Spacing.md) {
                    ProgressView()
                        .tint(.accentPrimary)
                    Text("Loading cities...")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xl)
            } else if !searchResults.isEmpty {
                // Show local search results
                LazyVStack(spacing: Spacing.sm) {
                    ForEach(searchResults) { city in
                        searchResultRow(city: city)
                    }
                }
                .padding(.horizontal, Spacing.md)
            } else if discoveredCity != nil {
                // Show discovered city card
                discoveredCitySection
            } else if !citySearchManager.searchResults.isEmpty {
                // Show MapKit suggestions
                mapKitSuggestionsSection
            } else {
                // No results - show discover prompt
                noResultsPrompt
            }
        }
    }

    // MARK: - Discovered City Section
    private var discoveredCitySection: some View {
        VStack(spacing: Spacing.md) {
            if let city = discoveredCity {
                DiscoveredCityCardView(city: city) {
                    // Open city details
                    openDiscoveredCity(city)
                }
                .padding(.horizontal, Spacing.md)
            }
        }
    }

    // MARK: - MapKit Suggestions Section
    private var mapKitSuggestionsSection: some View {
        VStack(spacing: Spacing.md) {
            Text("Suggestions")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.textSecondary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.xs) {
                ForEach(citySearchManager.searchResults.prefix(5)) { suggestion in
                    mapKitSuggestionRow(suggestion)
                }
            }
            .padding(.horizontal, Spacing.md)

            if citySearchManager.isSearching {
                ProgressView()
                    .tint(.accentPrimary)
                    .padding(.top, Spacing.sm)
            }
        }
    }

    // MARK: - MapKit Suggestion Row
    private func mapKitSuggestionRow(_ city: SearchedCity) -> some View {
        Button(action: {
            HapticManager.shared.medium()
            selectMapKitCity(city)
        }) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.accentPrimary)

                VStack(alignment: .leading, spacing: 2) {
                    Text(city.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)

                    if !city.country.isEmpty {
                        Text(city.country)
                            .font(.system(size: 13))
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

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
        .buttonStyle(.plain)
    }

    // MARK: - Select MapKit City
    private func selectMapKitCity(_ city: SearchedCity) {
        isSearchFocused = false

        // Generate city-specific image using LoremFlickr
        let seed = abs(city.name.hashValue) % 10000
        let imageUrl = "https://loremflickr.com/800/600/city,skyline?lock=\(seed)"

        // Create discovered city card
        discoveredCity = DiscoveredCityCard(
            name: city.name,
            country: city.country,
            imageUrl: imageUrl,
            countryFlag: countryFlag(for: city.country)
        )
    }

    // MARK: - Open Discovered City
    private func openDiscoveredCity(_ city: DiscoveredCityCard) {
        HapticManager.shared.medium()

        let cityId = city.name.lowercased().replacingOccurrences(of: " ", with: "-")

        let newCity = City(
            id: cityId,
            name: city.name,
            country: city.country,
            displayAssets: City.DisplayAssets(
                heroImageUrl: city.imageUrl,
                thumbnailUrl: city.imageUrl,
                countryFlag: city.countryFlag
            ),
            coordinates: City.Coordinates(latitude: 0, longitude: 0),
            metadata: City.CityMetadata(
                timezone: "UTC",
                currency: "USD",
                featured: false,
                planCount: 0
            )
        )

        selectedCity = newCity
    }

    // MARK: - No Results Prompt
    private var noResultsPrompt: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "globe")
                .font(.system(size: 48))
                .foregroundColor(.accentPrimary)

            Text("No cities found for \"\(searchQuery)\"")
                .font(.headline)
                .foregroundColor(.textPrimary)

            Text("Try a different search term")
                .font(.callout)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xl)
    }

    // MARK: - Search Result Row
    private func searchResultRow(city: City) -> some View {
        Button(action: {
            handleCityTap(city)
        }) {
            HStack(spacing: Spacing.md) {
                AsyncImageView(url: URL(string: city.displayAssets.thumbnailUrl), targetSize: CGSize(width: 60, height: 60))
                    .frame(width: 60, height: 60)
                    .cornerRadius(8)
                    .clipped()

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: Spacing.xs) {
                        Text(city.name)
                            .font(.headline)
                            .foregroundColor(.textPrimary)

                        Text(city.displayAssets.countryFlag)
                            .font(.callout)
                    }

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

                Image(systemName: "chevron.right")
                    .foregroundColor(.textTertiary)
                    .font(.system(size: 14))
            }
            .padding(Spacing.sm)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Trending Cities Section
    private var trendingCitiesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Trending Cities")
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

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

    // MARK: - Trending City Card
    private func trendingCityCard(city: City) -> some View {
        Button(action: {
            handleCityTap(city)
        }) {
            ZStack(alignment: .bottom) {
                AsyncImageView(url: URL(string: city.displayAssets.heroImageUrl), targetSize: CGSize(width: 160, height: 200))
                    .frame(width: 160, height: 200)
                    .clipped()

                LinearGradient(
                    gradient: Gradient(stops: [
                        .init(color: .black.opacity(0), location: 0),
                        .init(color: .black.opacity(0.4), location: 0.5),
                        .init(color: .black.opacity(0.8), location: 1)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )

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
    }

    // MARK: - Action Handlers
    private func handleCityTap(_ city: City) {
        isSearchFocused = false
        HapticManager.shared.medium()

        Task {
            do {
                try await APIService.shared.recordCityView(cityId: city.id)
            } catch {
                if Config.enableDebugLogging {
                    print("[SearchView] Failed to record city view: \(error)")
                }
            }
        }

        selectedCity = city
    }

    private func refreshCities() async {
        searchError = nil
        await cityPreloadService.reloadCities()
        HapticManager.shared.success()
    }

    // MARK: - Helpers
    private func countryFlag(for country: String) -> String {
        let countryFlags: [String: String] = [
            "Sweden": "🇸🇪", "United States": "🇺🇸", "USA": "🇺🇸",
            "United Kingdom": "🇬🇧", "UK": "🇬🇧", "France": "🇫🇷",
            "Germany": "🇩🇪", "Spain": "🇪🇸", "Italy": "🇮🇹",
            "Japan": "🇯🇵", "Kenya": "🇰🇪", "South Africa": "🇿🇦",
            "Australia": "🇦🇺", "Canada": "🇨🇦", "Brazil": "🇧🇷",
            "Mexico": "🇲🇽", "Netherlands": "🇳🇱", "Portugal": "🇵🇹",
            "Thailand": "🇹🇭", "UAE": "🇦🇪", "Singapore": "🇸🇬",
            "India": "🇮🇳", "China": "🇨🇳", "Russia": "🇷🇺"
        ]
        return countryFlags[country] ?? "🌍"
    }
}

// MARK: - Discovered City Card Model
struct DiscoveredCityCard: Identifiable {
    let id = UUID()
    let name: String
    let country: String
    let imageUrl: String
    let countryFlag: String
}

// MARK: - Discovered City Card View (with image preloading)
struct DiscoveredCityCardView: View {
    let city: DiscoveredCityCard
    let onTap: () -> Void

    @State private var loadedImage: UIImage? = nil
    @State private var isLoading = true

    var body: some View {
        Button(action: onTap) {
            ZStack {
                // Only show card when image is loaded
                if let image = loadedImage {
                    cardContent(image: image)
                        .transition(.opacity.combined(with: .scale(scale: 0.95)))
                } else {
                    // Loading placeholder
                    loadingPlaceholder
                }
            }
            .animation(.easeOut(duration: 0.3), value: loadedImage != nil)
        }
        .buttonStyle(.plain)
        .onAppear {
            loadImage()
        }
    }

    private func cardContent(image: UIImage) -> some View {
        HStack(spacing: Spacing.md) {
            // City image (already loaded)
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 80, height: 80)
                .cornerRadius(12)
                .clipped()

            // City info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: Spacing.xs) {
                    Text(city.name)
                        .font(.headline)
                        .foregroundColor(.textPrimary)

                    Text(city.countryFlag)
                        .font(.callout)

                    Text("NEW")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.accentPrimary)
                        .cornerRadius(4)
                }

                Text(city.country)
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                Text("Tap to explore")
                    .font(.caption)
                    .foregroundColor(.accentPrimary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.textTertiary)
                .font(.system(size: 14))
        }
        .padding(Spacing.md)
        .background(Color.surfacePrimary)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.accentPrimary.opacity(0.3), lineWidth: 2)
        )
    }

    private var loadingPlaceholder: some View {
        HStack(spacing: Spacing.md) {
            Rectangle()
                .fill(Color.surfaceSecondary)
                .frame(width: 80, height: 80)
                .cornerRadius(12)
                .overlay(
                    ProgressView()
                        .tint(.accentPrimary)
                )

            VStack(alignment: .leading, spacing: 8) {
                Rectangle()
                    .fill(Color.surfaceSecondary)
                    .frame(width: 120, height: 16)
                    .cornerRadius(4)

                Rectangle()
                    .fill(Color.surfaceSecondary)
                    .frame(width: 80, height: 12)
                    .cornerRadius(4)
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(Color.surfacePrimary)
        .cornerRadius(16)
    }

    private func loadImage() {
        guard let url = URL(string: city.imageUrl) else {
            // If URL is invalid, show card anyway with placeholder
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            // Check for successful response
            guard let data = data,
                  let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200,
                  let image = UIImage(data: data) else {
                // On failure, retry once with a fallback image
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    loadFallbackImage()
                }
                return
            }

            DispatchQueue.main.async {
                self.loadedImage = image
                self.isLoading = false
            }
        }.resume()
    }

    private func loadFallbackImage() {
        // Fallback: Static Unsplash cityscape image
        let fallbackUrl = "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80"

        guard let url = URL(string: fallbackUrl) else { return }

        URLSession.shared.dataTask(with: url) { data, _, _ in
            if let data = data, let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    self.loadedImage = image
                    self.isLoading = false
                }
            }
        }.resume()
    }
}

// MARK: - Preview
#Preview {
    SearchView()
}
