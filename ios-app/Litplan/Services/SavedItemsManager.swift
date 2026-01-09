//
//  SavedItemsManager.swift
//  Litplan
//
//  Created for Sprint 18C - Fix Saved Screen
//  Manages local storage of saved cities, plans, and group flows
//  Uses UserDefaults for persistence with option to sync with backend
//

import Foundation
import Combine

/// Manager for handling saved items (cities, plans, group flows)
/// Uses UserDefaults for local storage with optional API sync
@MainActor
class SavedItemsManager: ObservableObject {

    // MARK: - Singleton

    static let shared = SavedItemsManager()

    // MARK: - Published Properties

    @Published private(set) var savedCities: [City] = []
    @Published private(set) var savedPlans: [Plan] = []
    @Published private(set) var savedGroupFlows: [GroupFlow] = []
    @Published private(set) var isLoading: Bool = false

    // MARK: - Private Properties

    private let userDefaults = UserDefaults.standard
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    // UserDefaults keys
    private enum Keys {
        static let savedCityIds = "litplan.saved.cityIds"
        static let savedCities = "litplan.saved.cities"
        static let savedPlanIds = "litplan.saved.planIds"
        static let savedPlans = "litplan.saved.plans"
        static let savedGroupFlowIds = "litplan.saved.groupFlowIds"
        static let savedGroupFlows = "litplan.saved.groupFlows"
    }

    // MARK: - Initialization

    private init() {
        loadFromLocalStorage()
    }

    // MARK: - Public Methods - Cities

    /// Check if a city is saved
    func isCitySaved(_ city: City) -> Bool {
        savedCities.contains { $0.id == city.id }
    }

    /// Check if a city is saved by ID
    func isCitySaved(cityId: String) -> Bool {
        savedCities.contains { $0.id == cityId }
    }

    /// Save a city
    func saveCity(_ city: City) {
        guard !isCitySaved(city) else { return }

        savedCities.append(city)
        persistCities()

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Saved city: \(city.name)")
        }
    }

    /// Unsave a city
    func unsaveCity(_ city: City) {
        savedCities.removeAll { $0.id == city.id }
        persistCities()

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Unsaved city: \(city.name)")
        }
    }

    /// Unsave a city by ID
    func unsaveCity(cityId: String) {
        savedCities.removeAll { $0.id == cityId }
        persistCities()
    }

    /// Toggle save state for a city
    func toggleCitySave(_ city: City) {
        if isCitySaved(city) {
            unsaveCity(city)
        } else {
            saveCity(city)
        }
    }

    // MARK: - Public Methods - Plans

    /// Check if a plan is saved
    func isPlanSaved(_ plan: Plan) -> Bool {
        savedPlans.contains { $0.id == plan.id }
    }

    /// Check if a plan is saved by ID
    func isPlanSaved(planId: String) -> Bool {
        savedPlans.contains { $0.id == planId }
    }

    /// Save a plan
    func savePlan(_ plan: Plan) {
        guard !isPlanSaved(plan) else { return }

        savedPlans.append(plan)
        persistPlans()

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Saved plan: \(plan.title)")
        }
    }

    /// Unsave a plan
    func unsavePlan(_ plan: Plan) {
        savedPlans.removeAll { $0.id == plan.id }
        persistPlans()

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Unsaved plan: \(plan.title)")
        }
    }

    /// Unsave a plan by ID
    func unsavePlan(planId: String) {
        savedPlans.removeAll { $0.id == planId }
        persistPlans()
    }

    /// Toggle save state for a plan
    func togglePlanSave(_ plan: Plan) {
        if isPlanSaved(plan) {
            unsavePlan(plan)
        } else {
            savePlan(plan)
        }
    }

    // MARK: - Public Methods - Group Flows

    /// Check if a group flow is saved
    func isGroupFlowSaved(_ groupFlow: GroupFlow) -> Bool {
        savedGroupFlows.contains { $0.id == groupFlow.id }
    }

    /// Check if a group flow is saved by ID
    func isGroupFlowSaved(groupFlowId: String) -> Bool {
        savedGroupFlows.contains { $0.id == groupFlowId }
    }

    /// Save a group flow
    func saveGroupFlow(_ groupFlow: GroupFlow) {
        guard !isGroupFlowSaved(groupFlow) else { return }

        savedGroupFlows.append(groupFlow)
        persistGroupFlows()

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Saved group flow: \(groupFlow.title)")
        }
    }

    /// Unsave a group flow
    func unsaveGroupFlow(_ groupFlow: GroupFlow) {
        savedGroupFlows.removeAll { $0.id == groupFlow.id }
        persistGroupFlows()

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Unsaved group flow: \(groupFlow.title)")
        }
    }

    /// Unsave a group flow by ID
    func unsaveGroupFlow(groupFlowId: String) {
        savedGroupFlows.removeAll { $0.id == groupFlowId }
        persistGroupFlows()
    }

    /// Toggle save state for a group flow
    func toggleGroupFlowSave(_ groupFlow: GroupFlow) {
        if isGroupFlowSaved(groupFlow) {
            unsaveGroupFlow(groupFlow)
        } else {
            saveGroupFlow(groupFlow)
        }
    }

    // MARK: - Data Loading

    /// Load saved items from local storage
    func loadFromLocalStorage() {
        isLoading = true

        // Load saved cities
        if let data = userDefaults.data(forKey: Keys.savedCities) {
            do {
                savedCities = try decoder.decode([City].self, from: data)
            } catch {
                if Config.enableDebugLogging {
                    print("[SavedItemsManager] Failed to decode saved cities: \(error)")
                }
                savedCities = []
            }
        }

        // Load saved plans
        if let data = userDefaults.data(forKey: Keys.savedPlans) {
            do {
                savedPlans = try decoder.decode([Plan].self, from: data)
            } catch {
                if Config.enableDebugLogging {
                    print("[SavedItemsManager] Failed to decode saved plans: \(error)")
                }
                savedPlans = []
            }
        }

        // Load saved group flows
        if let data = userDefaults.data(forKey: Keys.savedGroupFlows) {
            do {
                savedGroupFlows = try decoder.decode([GroupFlow].self, from: data)
            } catch {
                if Config.enableDebugLogging {
                    print("[SavedItemsManager] Failed to decode saved group flows: \(error)")
                }
                savedGroupFlows = []
            }
        }

        isLoading = false

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Loaded \(savedCities.count) cities, \(savedPlans.count) plans, \(savedGroupFlows.count) group flows")
        }
    }

    /// Refresh saved items (reload from storage and optionally sync with backend)
    func refresh() async {
        await MainActor.run {
            loadFromLocalStorage()
        }

        // Future: Add API sync here if backend supports saved items
        // try? await syncWithBackend()
    }

    // MARK: - Clear Data

    /// Clear all saved items (used on logout)
    func clearAllSavedItems() {
        savedCities = []
        savedPlans = []
        savedGroupFlows = []

        userDefaults.removeObject(forKey: Keys.savedCities)
        userDefaults.removeObject(forKey: Keys.savedPlans)
        userDefaults.removeObject(forKey: Keys.savedGroupFlows)
        userDefaults.removeObject(forKey: Keys.savedCityIds)
        userDefaults.removeObject(forKey: Keys.savedPlanIds)
        userDefaults.removeObject(forKey: Keys.savedGroupFlowIds)

        if Config.enableDebugLogging {
            print("[SavedItemsManager] Cleared all saved items")
        }
    }

    // MARK: - Private Methods - Persistence

    private func persistCities() {
        do {
            let data = try encoder.encode(savedCities)
            userDefaults.set(data, forKey: Keys.savedCities)

            // Also store just the IDs for quick lookup
            let ids = savedCities.map { $0.id }
            userDefaults.set(ids, forKey: Keys.savedCityIds)
        } catch {
            if Config.enableDebugLogging {
                print("[SavedItemsManager] Failed to persist cities: \(error)")
            }
        }
    }

    private func persistPlans() {
        do {
            let data = try encoder.encode(savedPlans)
            userDefaults.set(data, forKey: Keys.savedPlans)

            // Also store just the IDs for quick lookup
            let ids = savedPlans.map { $0.id }
            userDefaults.set(ids, forKey: Keys.savedPlanIds)
        } catch {
            if Config.enableDebugLogging {
                print("[SavedItemsManager] Failed to persist plans: \(error)")
            }
        }
    }

    private func persistGroupFlows() {
        do {
            let data = try encoder.encode(savedGroupFlows)
            userDefaults.set(data, forKey: Keys.savedGroupFlows)

            // Also store just the IDs for quick lookup
            let ids = savedGroupFlows.map { $0.id }
            userDefaults.set(ids, forKey: Keys.savedGroupFlowIds)
        } catch {
            if Config.enableDebugLogging {
                print("[SavedItemsManager] Failed to persist group flows: \(error)")
            }
        }
    }

    // MARK: - Utility Methods

    /// Get city name for a plan (searches saved cities first, then mock data as fallback)
    func getCityName(for plan: Plan) -> String {
        // First check if plan has cityName directly
        if !plan.cityName.isEmpty {
            return plan.cityName
        }

        // Check saved cities
        if let city = savedCities.first(where: { plan.id.hasPrefix($0.id.prefix(3).lowercased()) }) {
            return city.name
        }

        // Fallback based on plan ID prefix
        if plan.id.hasPrefix("nyc") {
            return "New York"
        } else if plan.id.hasPrefix("la") {
            return "Los Angeles"
        } else if plan.id.hasPrefix("lon") {
            return "London"
        }
        return "City"
    }

    /// Get city name for a group flow
    func getCityName(for groupFlow: GroupFlow) -> String {
        // Check saved cities first
        if let city = savedCities.first(where: { $0.id == groupFlow.cityId }) {
            return city.name
        }

        // Fallback based on city ID prefix
        if groupFlow.cityId.hasPrefix("nyc") {
            return "New York"
        } else if groupFlow.cityId.hasPrefix("la") {
            return "Los Angeles"
        } else if groupFlow.cityId.hasPrefix("lon") {
            return "London"
        }
        return "City"
    }

    /// Total count of all saved items
    var totalSavedCount: Int {
        savedCities.count + savedPlans.count + savedGroupFlows.count
    }
}
