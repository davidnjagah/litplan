//
//  CityPreloadService.swift
//  Litplan
//
//  Created by Claude Code on 01/07/26.
//  Background city preloading service for optimized search experience
//

import Foundation

/// Service that preloads cities in the background after app launch
/// This ensures the search screen has cities ready without blocking the UI
@MainActor
class CityPreloadService: ObservableObject {
    static let shared = CityPreloadService()

    /// All cities loaded from API (available for search)
    @Published private(set) var allCities: [City] = []

    /// Loading state
    @Published private(set) var isLoading: Bool = false

    /// Whether cities have been loaded at least once
    @Published private(set) var hasLoaded: Bool = false

    private init() {}

    /// Preload cities in the background
    /// Call this after app launch and critical UI has loaded
    func preloadCities() {
        guard !isLoading && !hasLoaded else { return }

        isLoading = true

        Task {
            let fetchedCities = await APIService.shared.fetchCitiesWithFallback()

            await MainActor.run {
                self.allCities = fetchedCities
                self.isLoading = false
                self.hasLoaded = true

                #if DEBUG
                print("[CityPreloadService] Preloaded \(fetchedCities.count) cities in background")
                #endif
            }
        }
    }

    /// Force reload cities (e.g., pull to refresh)
    func reloadCities() async {
        isLoading = true

        let fetchedCities = await APIService.shared.fetchCitiesWithFallback()

        await MainActor.run {
            self.allCities = fetchedCities
            self.isLoading = false
            self.hasLoaded = true
        }
    }

    /// Search cities by name or country
    func searchCities(query: String) -> [City] {
        guard !query.isEmpty else { return [] }

        return allCities.filter { city in
            city.name.localizedCaseInsensitiveContains(query) ||
            city.country.localizedCaseInsensitiveContains(query)
        }
    }

    /// Discover a city remotely if not found locally
    /// Uses AI to validate and create new cities on-demand
    /// - Parameter query: The city name to discover
    /// - Returns: The discovered city if valid, nil otherwise
    func discoverCityRemotely(query: String) async -> City? {
        guard !query.isEmpty else { return nil }

        do {
            let city = try await APIService.shared.discoverCity(query: query)

            // Add to local cache for future searches
            await MainActor.run {
                if !self.allCities.contains(where: { $0.id == city.id }) {
                    self.allCities.append(city)

                    #if DEBUG
                    print("[CityPreloadService] Discovered and cached new city: \(city.name)")
                    #endif
                }
            }

            return city
        } catch {
            #if DEBUG
            print("[CityPreloadService] Failed to discover city '\(query)': \(error.localizedDescription)")
            #endif
            return nil
        }
    }
}
