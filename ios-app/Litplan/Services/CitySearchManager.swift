//
//  CitySearchManager.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/13/26.
//  Sprint 16 - Worldwide city search using MapKit MKLocalSearchCompleter
//

import Foundation
import MapKit
import Combine

/// Represents a searched city with name and country
struct SearchedCity: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let country: String

    /// Display format: "City, Country"
    var displayName: String {
        "\(name), \(country)"
    }

    /// Create from MKLocalSearchCompletion
    init(completion: MKLocalSearchCompletion) {
        // Parse the title and subtitle
        self.name = completion.title
        self.country = completion.subtitle.isEmpty ? "" : completion.subtitle
    }

    /// Manual initialization
    init(name: String, country: String) {
        self.name = name
        self.country = country
    }
}

/// Manages city search using Apple's MapKit MKLocalSearchCompleter
/// Provides worldwide city search with autocomplete
@MainActor
class CitySearchManager: NSObject, ObservableObject {
    static let shared = CitySearchManager()

    // MARK: - Published Properties

    @Published var searchQuery: String = ""
    @Published var searchResults: [SearchedCity] = []
    @Published var isSearching: Bool = false
    @Published var selectedCity: SearchedCity? = nil

    // MARK: - Private Properties

    private let searchCompleter = MKLocalSearchCompleter()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    override init() {
        super.init()
        setupSearchCompleter()
        setupSearchQueryObserver()
    }

    // MARK: - Setup

    private func setupSearchCompleter() {
        searchCompleter.delegate = self
        // Filter for cities only
        searchCompleter.resultTypes = .address
        searchCompleter.pointOfInterestFilter = .excludingAll
    }

    private func setupSearchQueryObserver() {
        // Debounce search queries to avoid excessive API calls
        $searchQuery
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] query in
                self?.performSearch(query: query)
            }
            .store(in: &cancellables)
    }

    // MARK: - Search

    private func performSearch(query: String) {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedQuery.isEmpty else {
            searchResults = []
            isSearching = false
            return
        }

        isSearching = true
        searchCompleter.queryFragment = trimmedQuery
    }

    /// Select a city and clear search
    func selectCity(_ city: SearchedCity) {
        selectedCity = city
        searchQuery = ""
        searchResults = []
        isSearching = false
    }

    /// Clear selected city
    func clearSelection() {
        selectedCity = nil
    }

    /// Reset search state
    func reset() {
        searchQuery = ""
        searchResults = []
        isSearching = false
    }
}

// MARK: - MKLocalSearchCompleterDelegate

extension CitySearchManager: MKLocalSearchCompleterDelegate {
    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        Task { @MainActor in
            // Filter results to get city-like results
            let cityResults = completer.results.compactMap { completion -> SearchedCity? in
                // Skip if it looks like a specific address (contains numbers)
                let hasNumbers = completion.title.contains(where: { $0.isNumber })
                if hasNumbers { return nil }

                // Skip if it's a point of interest (typically has category info)
                // We want actual city/town names
                let isCityLike = !completion.subtitle.isEmpty ||
                                 completion.title.split(separator: ",").count <= 2

                if !isCityLike { return nil }

                return SearchedCity(completion: completion)
            }

            // Remove duplicates and limit results
            var seen = Set<String>()
            self.searchResults = cityResults.filter { city in
                let key = "\(city.name)-\(city.country)"
                if seen.contains(key) { return false }
                seen.insert(key)
                return true
            }.prefix(10).map { $0 }

            self.isSearching = false
        }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            print("[CitySearchManager] Search error: \(error.localizedDescription)")
            self.isSearching = false
        }
    }
}
