//
//  SavedItemsManager.swift
//  Litplan
//
//  Manages saved cities, plans, and group flows.
//  Source of truth: Supabase (server). UserDefaults = local cache for instant reads.
//  Strategy: optimistic local update → background server write.
//             On login: server fetch replaces local cache.
//

import Foundation
import Combine

@MainActor
class SavedItemsManager: ObservableObject {

    // MARK: - Singleton

    static let shared = SavedItemsManager()

    // Free tier cap per category
    static let freeSaveCap = 3

    // MARK: - Published Properties

    @Published private(set) var savedCities: [City] = []
    @Published private(set) var savedPlans: [Plan] = []
    @Published private(set) var savedGroupFlows: [GroupFlow] = []
    @Published private(set) var isLoading: Bool = false

    // MARK: - Private

    private let userDefaults = UserDefaults.standard
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private enum Keys {
        static let savedCities    = "litplan.saved.cities"
        static let savedCityIds   = "litplan.saved.cityIds"
        static let savedPlans     = "litplan.saved.plans"
        static let savedPlanIds   = "litplan.saved.planIds"
        static let savedGroupFlows  = "litplan.saved.groupFlows"
        static let savedGroupFlowIds = "litplan.saved.groupFlowIds"
    }

    // MARK: - Supabase row types

    private struct SavedCityRow: Codable {
        let id: String
        let userId: String
        let cityId: String
        let cityData: City?
        let savedAt: String?
        enum CodingKeys: String, CodingKey {
            case id, userId, cityId, cityData, savedAt
        }
    }

    private struct SavedCityInsert: Encodable {
        let id: String
        let userId: String
        let cityId: String
        let cityData: City
        let savedAt: String?
        enum CodingKeys: String, CodingKey {
            case id, userId, cityId, cityData, savedAt
        }
    }

    private struct SavedPlanRow: Codable {
        let id: String
        let userId: String
        let planId: String
        let planData: Plan?
        let savedAt: String?
        enum CodingKeys: String, CodingKey {
            case id, userId, planId, planData, savedAt
        }
    }

    private struct SavedPlanInsert: Encodable {
        let id: String
        let userId: String
        let planId: String
        let planData: Plan
        let savedAt: String?
        enum CodingKeys: String, CodingKey {
            case id, userId, planId, planData, savedAt
        }
    }

    private struct SavedGroupFlowRow: Codable {
        let id: String
        let userId: String
        let flowId: String
        let flowData: GroupFlow?
        let savedAt: String?
        enum CodingKeys: String, CodingKey {
            case id, userId, flowId, flowData, savedAt
        }
    }

    private struct SavedGroupFlowInsert: Encodable {
        let id: String
        let userId: String
        let flowId: String
        let flowData: GroupFlow
        let savedAt: String?
        enum CodingKeys: String, CodingKey {
            case id, userId, flowId, flowData, savedAt
        }
    }

    // MARK: - Init

    private init() {
        loadFromLocalStorage()
        observeAuthChanges()
    }

    // Trigger a server fetch whenever the user signs in; clear on sign-out.
    private func observeAuthChanges() {
        Task {
            guard let client = SupabaseManager.shared.client else { return }
            for await (event, _) in client.auth.authStateChanges {
                switch event {
                case .signedIn:
                    await fetchFromServer()
                case .signedOut:
                    clearAllSavedItems()
                default:
                    break
                }
            }
        }
    }

    // MARK: - Server Sync

    /// Pull all saved items from Supabase and replace the local cache.
    func fetchFromServer() async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }

        isLoading = true
        defer { isLoading = false }

        do {
            // Cities
            let cityRows: [SavedCityRow] = try await client
                .from("SavedCity")
                .select()
                .eq("userId", value: userId)
                .execute()
                .value
            let cities = cityRows.compactMap { $0.cityData }

            // Plans
            let planRows: [SavedPlanRow] = try await client
                .from("SavedPlan")
                .select()
                .eq("userId", value: userId)
                .execute()
                .value
            let plans = planRows.compactMap { $0.planData }

            // Group flows
            let flowRows: [SavedGroupFlowRow] = try await client
                .from("SavedGroupFlow")
                .select()
                .eq("userId", value: userId)
                .execute()
                .value
            let flows = flowRows.compactMap { $0.flowData }

            // Server wins — replace local cache
            savedCities    = cities
            savedPlans     = plans
            savedGroupFlows = flows
            persistCities()
            persistPlans()
            persistGroupFlows()

            print("[SavedItemsManager] Fetched from server — cities:\(cities.count) plans:\(plans.count) flows:\(flows.count)")
        } catch {
            print("[SavedItemsManager] Server fetch failed, using local cache: \(error)")
        }
    }

    // MARK: - Cities

    func isCitySaved(_ city: City) -> Bool { savedCities.contains { $0.id == city.id } }
    func isCitySaved(cityId: String) -> Bool { savedCities.contains { $0.id == cityId } }

    func saveCity(_ city: City) {
        guard !isCitySaved(city) else { return }
        savedCities.append(city)
        persistCities()
        Task { await serverSaveCity(city) }
        print("[SavedItemsManager] Saved city: \(city.name)")
    }

    func unsaveCity(_ city: City) {
        savedCities.removeAll { $0.id == city.id }
        persistCities()
        Task { await serverUnsaveCity(city.id) }
        print("[SavedItemsManager] Unsaved city: \(city.name)")
    }

    func unsaveCity(cityId: String) {
        savedCities.removeAll { $0.id == cityId }
        persistCities()
        Task { await serverUnsaveCity(cityId) }
    }

    @discardableResult
    func toggleCitySave(_ city: City) -> Bool {
        if isCitySaved(city) { unsaveCity(city); return true }
        let isPro = SubscriptionManager.shared.isProUser
        guard isPro || savedCities.count < SavedItemsManager.freeSaveCap else { return false }
        saveCity(city)
        return true
    }

    private func serverSaveCity(_ city: City) async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }
        let row = SavedCityInsert(
            id: UUID().uuidString,
            userId: userId,
            cityId: city.id,
            cityData: city,
            savedAt: nil
        )
        do {
            try await client.from("SavedCity").upsert(row, onConflict: "userId,cityId").execute()
        } catch {
            print("[SavedItemsManager] Failed to save city on server: \(error)")
        }
    }

    private func serverUnsaveCity(_ cityId: String) async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }
        do {
            try await client.from("SavedCity")
                .delete()
                .eq("userId", value: userId)
                .eq("cityId", value: cityId)
                .execute()
        } catch {
            print("[SavedItemsManager] Failed to unsave city on server: \(error)")
        }
    }

    // MARK: - Plans

    func isPlanSaved(_ plan: Plan) -> Bool { savedPlans.contains { $0.id == plan.id } }
    func isPlanSaved(planId: String) -> Bool { savedPlans.contains { $0.id == planId } }

    func savePlan(_ plan: Plan) {
        guard !isPlanSaved(plan) else { return }
        savedPlans.append(plan)
        persistPlans()
        Task { await serverSavePlan(plan) }
        print("[SavedItemsManager] Saved plan: \(plan.title)")
    }

    func unsavePlan(_ plan: Plan) {
        savedPlans.removeAll { $0.id == plan.id }
        persistPlans()
        Task { await serverUnsavePlan(plan.id) }
        print("[SavedItemsManager] Unsaved plan: \(plan.title)")
    }

    func unsavePlan(planId: String) {
        savedPlans.removeAll { $0.id == planId }
        persistPlans()
        Task { await serverUnsavePlan(planId) }
    }

    @discardableResult
    func togglePlanSave(_ plan: Plan) -> Bool {
        if isPlanSaved(plan) { unsavePlan(plan); return true }
        let isPro = SubscriptionManager.shared.isProUser
        guard isPro || savedPlans.count < SavedItemsManager.freeSaveCap else { return false }
        savePlan(plan)
        return true
    }

    private func serverSavePlan(_ plan: Plan) async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }
        let row = SavedPlanInsert(
            id: UUID().uuidString,
            userId: userId,
            planId: plan.id,
            planData: plan,
            savedAt: nil
        )
        do {
            try await client.from("SavedPlan").upsert(row, onConflict: "userId,planId").execute()
        } catch {
            print("[SavedItemsManager] Failed to save plan on server: \(error)")
        }
    }

    private func serverUnsavePlan(_ planId: String) async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }
        do {
            try await client.from("SavedPlan")
                .delete()
                .eq("userId", value: userId)
                .eq("planId", value: planId)
                .execute()
        } catch {
            print("[SavedItemsManager] Failed to unsave plan on server: \(error)")
        }
    }

    // MARK: - Group Flows

    func isGroupFlowSaved(_ groupFlow: GroupFlow) -> Bool { savedGroupFlows.contains { $0.id == groupFlow.id } }
    func isGroupFlowSaved(groupFlowId: String) -> Bool { savedGroupFlows.contains { $0.id == groupFlowId } }

    func saveGroupFlow(_ groupFlow: GroupFlow) {
        guard !isGroupFlowSaved(groupFlow) else { return }
        savedGroupFlows.append(groupFlow)
        persistGroupFlows()
        Task { await serverSaveGroupFlow(groupFlow) }
        print("[SavedItemsManager] Saved group flow: \(groupFlow.title)")
    }

    func unsaveGroupFlow(_ groupFlow: GroupFlow) {
        savedGroupFlows.removeAll { $0.id == groupFlow.id }
        persistGroupFlows()
        Task { await serverUnsaveGroupFlow(groupFlow.id) }
        print("[SavedItemsManager] Unsaved group flow: \(groupFlow.title)")
    }

    func unsaveGroupFlow(groupFlowId: String) {
        savedGroupFlows.removeAll { $0.id == groupFlowId }
        persistGroupFlows()
        Task { await serverUnsaveGroupFlow(groupFlowId) }
    }

    @discardableResult
    func toggleGroupFlowSave(_ groupFlow: GroupFlow) -> Bool {
        if isGroupFlowSaved(groupFlow) { unsaveGroupFlow(groupFlow); return true }
        let isPro = SubscriptionManager.shared.isProUser
        guard isPro || savedGroupFlows.count < SavedItemsManager.freeSaveCap else { return false }
        saveGroupFlow(groupFlow)
        return true
    }

    private func serverSaveGroupFlow(_ groupFlow: GroupFlow) async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }
        let row = SavedGroupFlowInsert(
            id: UUID().uuidString,
            userId: userId,
            flowId: groupFlow.id,
            flowData: groupFlow,
            savedAt: nil
        )
        do {
            try await client.from("SavedGroupFlow").upsert(row, onConflict: "userId,flowId").execute()
        } catch {
            print("[SavedItemsManager] Failed to save group flow on server: \(error)")
        }
    }

    private func serverUnsaveGroupFlow(_ flowId: String) async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }
        do {
            try await client.from("SavedGroupFlow")
                .delete()
                .eq("userId", value: userId)
                .eq("flowId", value: flowId)
                .execute()
        } catch {
            print("[SavedItemsManager] Failed to unsave group flow on server: \(error)")
        }
    }

    // MARK: - Local Storage

    func loadFromLocalStorage() {
        isLoading = true
        if let data = userDefaults.data(forKey: Keys.savedCities),
           let cities = try? decoder.decode([City].self, from: data) {
            savedCities = cities
        }
        if let data = userDefaults.data(forKey: Keys.savedPlans),
           let plans = try? decoder.decode([Plan].self, from: data) {
            savedPlans = plans
        }
        if let data = userDefaults.data(forKey: Keys.savedGroupFlows),
           let flows = try? decoder.decode([GroupFlow].self, from: data) {
            savedGroupFlows = flows
        }
        isLoading = false
        print("[SavedItemsManager] Local cache — cities:\(savedCities.count) plans:\(savedPlans.count) flows:\(savedGroupFlows.count)")
    }

    func refresh() async {
        await fetchFromServer()
    }

    // MARK: - Clear (logout)

    func clearAllSavedItems() {
        savedCities    = []
        savedPlans     = []
        savedGroupFlows = []
        userDefaults.removeObject(forKey: Keys.savedCities)
        userDefaults.removeObject(forKey: Keys.savedPlans)
        userDefaults.removeObject(forKey: Keys.savedGroupFlows)
        userDefaults.removeObject(forKey: Keys.savedCityIds)
        userDefaults.removeObject(forKey: Keys.savedPlanIds)
        userDefaults.removeObject(forKey: Keys.savedGroupFlowIds)
        print("[SavedItemsManager] Cleared all saved items")
    }

    // MARK: - Persistence helpers

    private func persistCities() {
        if let data = try? encoder.encode(savedCities) {
            userDefaults.set(data, forKey: Keys.savedCities)
            userDefaults.set(savedCities.map { $0.id }, forKey: Keys.savedCityIds)
        }
    }

    private func persistPlans() {
        if let data = try? encoder.encode(savedPlans) {
            userDefaults.set(data, forKey: Keys.savedPlans)
            userDefaults.set(savedPlans.map { $0.id }, forKey: Keys.savedPlanIds)
        }
    }

    private func persistGroupFlows() {
        if let data = try? encoder.encode(savedGroupFlows) {
            userDefaults.set(data, forKey: Keys.savedGroupFlows)
            userDefaults.set(savedGroupFlows.map { $0.id }, forKey: Keys.savedGroupFlowIds)
        }
    }

    // MARK: - Utilities

    func getCityName(for plan: Plan) -> String {
        if !plan.cityName.isEmpty { return plan.cityName }
        if let city = savedCities.first(where: { plan.id.hasPrefix($0.id.prefix(3).lowercased()) }) {
            return city.name
        }
        if plan.id.hasPrefix("nyc") { return "New York" }
        if plan.id.hasPrefix("la")  { return "Los Angeles" }
        if plan.id.hasPrefix("lon") { return "London" }
        return "City"
    }

    func getCityName(for groupFlow: GroupFlow) -> String {
        if let city = savedCities.first(where: { $0.id == groupFlow.cityId }) { return city.name }
        if groupFlow.cityId.hasPrefix("nyc") { return "New York" }
        if groupFlow.cityId.hasPrefix("la")  { return "Los Angeles" }
        if groupFlow.cityId.hasPrefix("lon") { return "London" }
        return "City"
    }

    var totalSavedCount: Int { savedCities.count + savedPlans.count + savedGroupFlows.count }
}
