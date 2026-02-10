//
//  SearchHistoryManager.swift
//  Litplan
//
//  Created for tracking searched cities from both main search and Bolt view
//  Persists search history locally using UserDefaults
//

import Foundation
import Combine

/// Represents a city in the search history with timestamp
struct SearchHistoryCity: Identifiable, Codable, Equatable {
    let id: UUID
    let name: String
    let country: String
    let searchedAt: Date

    /// Display format: "City, Country"
    var displayName: String {
        country.isEmpty ? name : "\(name), \(country)"
    }

    init(id: UUID = UUID(), name: String, country: String, searchedAt: Date = Date()) {
        self.id = id
        self.name = name
        self.country = country
        self.searchedAt = searchedAt
    }

    /// Create from SearchedCity (used in city selectors)
    init(from searchedCity: SearchedCity) {
        self.id = UUID()
        self.name = searchedCity.name
        self.country = searchedCity.country
        self.searchedAt = Date()
    }

    static func == (lhs: SearchHistoryCity, rhs: SearchHistoryCity) -> Bool {
        // Two cities are equal if they have the same name and country (case insensitive)
        lhs.name.lowercased() == rhs.name.lowercased() &&
        lhs.country.lowercased() == rhs.country.lowercased()
    }
}

/// Manager for handling search history persistence
/// Uses UserDefaults for local storage
@MainActor
class SearchHistoryManager: ObservableObject {

    // MARK: - Singleton

    static let shared = SearchHistoryManager()

    // MARK: - Published Properties

    @Published private(set) var searchHistory: [SearchHistoryCity] = []
    @Published private(set) var isLoading: Bool = false

    // MARK: - Private Properties

    private let userDefaults = UserDefaults.standard
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    /// Maximum number of cities to keep in history
    private let maxHistoryCount = 50

    // UserDefaults key
    private let historyKey = "litplan.search.history"

    // MARK: - Initialization

    private init() {
        loadFromLocalStorage()
    }

    // MARK: - Public Methods

    /// Add a city to search history
    /// If the city already exists, it moves to the top with updated timestamp
    func addCity(_ city: SearchedCity) {
        let historyCity = SearchHistoryCity(from: city)
        addCity(historyCity)
    }

    /// Add a SearchHistoryCity directly
    func addCity(_ city: SearchHistoryCity) {
        // Remove existing entry if present (will be re-added at top)
        searchHistory.removeAll { $0 == city }

        // Add to the beginning (most recent first)
        searchHistory.insert(city, at: 0)

        // Trim to max count
        if searchHistory.count > maxHistoryCount {
            searchHistory = Array(searchHistory.prefix(maxHistoryCount))
        }

        persistHistory()

        if Config.enableDebugLogging {
            print("[SearchHistoryManager] Added city: \(city.displayName)")
        }
    }

    /// Remove a city from search history
    func removeCity(_ city: SearchHistoryCity) {
        searchHistory.removeAll { $0.id == city.id }
        persistHistory()

        if Config.enableDebugLogging {
            print("[SearchHistoryManager] Removed city: \(city.displayName)")
        }
    }

    /// Remove a city by name and country
    func removeCity(name: String, country: String) {
        searchHistory.removeAll {
            $0.name.lowercased() == name.lowercased() &&
            $0.country.lowercased() == country.lowercased()
        }
        persistHistory()
    }

    /// Clear all search history
    func clearHistory() {
        searchHistory = []
        userDefaults.removeObject(forKey: historyKey)

        if Config.enableDebugLogging {
            print("[SearchHistoryManager] Cleared all search history")
        }
    }

    /// Check if a city exists in history
    func containsCity(name: String, country: String) -> Bool {
        searchHistory.contains {
            $0.name.lowercased() == name.lowercased() &&
            $0.country.lowercased() == country.lowercased()
        }
    }

    /// Get recent cities (for quick access display)
    func recentCities(limit: Int = 5) -> [SearchHistoryCity] {
        Array(searchHistory.prefix(limit))
    }

    /// Total count of searched cities
    var totalCount: Int {
        searchHistory.count
    }

    // MARK: - Data Loading

    /// Load search history from local storage
    func loadFromLocalStorage() {
        isLoading = true

        if let data = userDefaults.data(forKey: historyKey) {
            do {
                searchHistory = try decoder.decode([SearchHistoryCity].self, from: data)
            } catch {
                if Config.enableDebugLogging {
                    print("[SearchHistoryManager] Failed to decode search history: \(error)")
                }
                searchHistory = []
            }
        }

        isLoading = false

        if Config.enableDebugLogging {
            print("[SearchHistoryManager] Loaded \(searchHistory.count) cities from history")
        }
    }

    /// Refresh history (reload from storage)
    func refresh() {
        loadFromLocalStorage()
    }

    // MARK: - Private Methods

    private func persistHistory() {
        do {
            let data = try encoder.encode(searchHistory)
            userDefaults.set(data, forKey: historyKey)
        } catch {
            if Config.enableDebugLogging {
                print("[SearchHistoryManager] Failed to persist search history: \(error)")
            }
        }
    }
}
