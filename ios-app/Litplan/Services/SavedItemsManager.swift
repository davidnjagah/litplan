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

    /// IDs that occupy visible save slots for free users (max 3 per category).
    /// Pro users ignore these — all saved items are shown.
    @Published private(set) var visibleCityIds: Set<String> = []
    @Published private(set) var visiblePlanIds: Set<String> = []
    @Published private(set) var visibleGroupFlowIds: Set<String> = []

    /// When each saved item was saved (item id → date). Powers date-grouped Saved views.
    /// Populated from the server's `savedAt` on fetch and set to now() on local saves.
    @Published private(set) var savedAtById: [String: Date] = [:]

    /// The save date for a given item id (nil if unknown — bucket such items as "Earlier").
    func savedAt(for id: String) -> Date? { savedAtById[id] }

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
        static let visibleCityIds    = "litplan.saved.visibleCityIds"
        static let visiblePlanIds    = "litplan.saved.visiblePlanIds"
        static let visibleGroupFlowIds = "litplan.saved.visibleGroupFlowIds"
        static let savedAtById = "litplan.saved.savedAtById"
    }

    /// Parse a server ISO8601 `savedAt` string (with or without fractional seconds).
    private static func parseDate(_ s: String?) -> Date? {
        guard let s = s else { return nil }
        let withFrac = ISO8601DateFormatter()
        withFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFrac.date(from: s) ?? ISO8601DateFormatter().date(from: s)
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
        enum CodingKeys: String, CodingKey {
            case id, userId, cityId, cityData
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
        enum CodingKeys: String, CodingKey {
            case id, userId, planId, planData
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
        enum CodingKeys: String, CodingKey {
            case id, userId, flowId, flowData
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
            // Cities — newest saved first
            let cityRows: [SavedCityRow] = try await client
                .from("SavedCity")
                .select()
                .eq("userId", value: userId)
                .order("savedAt", ascending: false)
                .execute()
                .value
            let cities = cityRows.compactMap { $0.cityData }

            // Plans — newest saved first
            let planRows: [SavedPlanRow] = try await client
                .from("SavedPlan")
                .select()
                .eq("userId", value: userId)
                .order("savedAt", ascending: false)
                .execute()
                .value
            let plans = planRows.compactMap { $0.planData }

            // Group flows — newest saved first
            let flowRows: [SavedGroupFlowRow] = try await client
                .from("SavedGroupFlow")
                .select()
                .eq("userId", value: userId)
                .order("savedAt", ascending: false)
                .execute()
                .value
            let flows = flowRows.compactMap { $0.flowData }

            // Build the saved-at map (item id → date) from server rows.
            var savedDates: [String: Date] = [:]
            for r in cityRows { if let c = r.cityData, let d = Self.parseDate(r.savedAt) { savedDates[c.id] = d } }
            for r in planRows { if let p = r.planData, let d = Self.parseDate(r.savedAt) { savedDates[p.id] = d } }
            for r in flowRows { if let f = r.flowData, let d = Self.parseDate(r.savedAt) { savedDates[f.id] = d } }

            // Server wins — replace local cache
            savedCities    = cities
            savedPlans     = plans
            savedGroupFlows = flows
            savedAtById    = savedDates
            persistCities()
            persistPlans()
            persistGroupFlows()
            persistSavedAt()

            // Reconcile visible sets: remove stale IDs, fill open slots from server order
            reconcileVisibleIds(against: cities, keyPath: \.visibleCityIds, key: Keys.visibleCityIds)
            reconcileVisibleIds(against: plans, keyPath: \.visiblePlanIds, key: Keys.visiblePlanIds)
            reconcileVisibleIds(against: flows, keyPath: \.visibleGroupFlowIds, key: Keys.visibleGroupFlowIds)

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
        savedCities.insert(city, at: 0)
        if visibleCityIds.count < SavedItemsManager.freeSaveCap {
            visibleCityIds.insert(city.id)
            persistVisibleCityIds()
        }
        savedAtById[city.id] = Date()
        persistCities()
        persistSavedAt()
        Task { await serverSaveCity(city) }
        print("[SavedItemsManager] Saved city: \(city.name)")
    }

    func unsaveCity(_ city: City) {
        savedCities.removeAll { $0.id == city.id }
        visibleCityIds.remove(city.id)
        persistVisibleCityIds()
        persistCities()
        Task { await serverUnsaveCity(city.id) }
        print("[SavedItemsManager] Unsaved city: \(city.name)")
    }

    func unsaveCity(cityId: String) {
        savedCities.removeAll { $0.id == cityId }
        visibleCityIds.remove(cityId)
        persistVisibleCityIds()
        persistCities()
        Task { await serverUnsaveCity(cityId) }
    }

    @discardableResult
    func toggleCitySave(_ city: City) -> Bool {
        if isCitySaved(city) { unsaveCity(city); return true }
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
            cityData: city
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
        savedPlans.insert(plan, at: 0)
        if visiblePlanIds.count < SavedItemsManager.freeSaveCap {
            visiblePlanIds.insert(plan.id)
            persistVisiblePlanIds()
        }
        savedAtById[plan.id] = Date()
        persistPlans()
        persistSavedAt()
        Task { await serverSavePlan(plan) }
        print("[SavedItemsManager] Saved plan: \(plan.title)")
    }

    func unsavePlan(_ plan: Plan) {
        savedPlans.removeAll { $0.id == plan.id }
        visiblePlanIds.remove(plan.id)
        persistVisiblePlanIds()
        persistPlans()
        Task { await serverUnsavePlan(plan.id) }
        print("[SavedItemsManager] Unsaved plan: \(plan.title)")
    }

    func unsavePlan(planId: String) {
        savedPlans.removeAll { $0.id == planId }
        visiblePlanIds.remove(planId)
        persistVisiblePlanIds()
        persistPlans()
        Task { await serverUnsavePlan(planId) }
    }

    @discardableResult
    func togglePlanSave(_ plan: Plan) -> Bool {
        if isPlanSaved(plan) { unsavePlan(plan); return true }
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
            planData: plan
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
        savedGroupFlows.insert(groupFlow, at: 0)
        if visibleGroupFlowIds.count < SavedItemsManager.freeSaveCap {
            visibleGroupFlowIds.insert(groupFlow.id)
            persistVisibleGroupFlowIds()
        }
        savedAtById[groupFlow.id] = Date()
        persistGroupFlows()
        persistSavedAt()
        Task { await serverSaveGroupFlow(groupFlow) }
        print("[SavedItemsManager] Saved group flow: \(groupFlow.title)")
    }

    func unsaveGroupFlow(_ groupFlow: GroupFlow) {
        savedGroupFlows.removeAll { $0.id == groupFlow.id }
        visibleGroupFlowIds.remove(groupFlow.id)
        persistVisibleGroupFlowIds()
        persistGroupFlows()
        Task { await serverUnsaveGroupFlow(groupFlow.id) }
        print("[SavedItemsManager] Unsaved group flow: \(groupFlow.title)")
    }

    func unsaveGroupFlow(groupFlowId: String) {
        savedGroupFlows.removeAll { $0.id == groupFlowId }
        visibleGroupFlowIds.remove(groupFlowId)
        persistVisibleGroupFlowIds()
        persistGroupFlows()
        Task { await serverUnsaveGroupFlow(groupFlowId) }
    }

    @discardableResult
    func toggleGroupFlowSave(_ groupFlow: GroupFlow) -> Bool {
        if isGroupFlowSaved(groupFlow) { unsaveGroupFlow(groupFlow); return true }
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
            flowData: groupFlow
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
        if let raw = userDefaults.dictionary(forKey: Keys.savedAtById) as? [String: Double] {
            savedAtById = raw.mapValues { Date(timeIntervalSince1970: $0) }
        }

        // Load visible sets; initialize from local cache if no stored state yet
        if let ids = userDefaults.stringArray(forKey: Keys.visibleCityIds) {
            visibleCityIds = Set(ids.prefix(SavedItemsManager.freeSaveCap))
        } else {
            visibleCityIds = Set(savedCities.prefix(SavedItemsManager.freeSaveCap).map { $0.id })
        }
        if let ids = userDefaults.stringArray(forKey: Keys.visiblePlanIds) {
            visiblePlanIds = Set(ids.prefix(SavedItemsManager.freeSaveCap))
        } else {
            visiblePlanIds = Set(savedPlans.prefix(SavedItemsManager.freeSaveCap).map { $0.id })
        }
        if let ids = userDefaults.stringArray(forKey: Keys.visibleGroupFlowIds) {
            visibleGroupFlowIds = Set(ids.prefix(SavedItemsManager.freeSaveCap))
        } else {
            visibleGroupFlowIds = Set(savedGroupFlows.prefix(SavedItemsManager.freeSaveCap).map { $0.id })
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
        savedAtById = [:]
        visibleCityIds = []
        visiblePlanIds = []
        visibleGroupFlowIds = []
        userDefaults.removeObject(forKey: Keys.savedCities)
        userDefaults.removeObject(forKey: Keys.savedPlans)
        userDefaults.removeObject(forKey: Keys.savedGroupFlows)
        userDefaults.removeObject(forKey: Keys.savedCityIds)
        userDefaults.removeObject(forKey: Keys.savedPlanIds)
        userDefaults.removeObject(forKey: Keys.savedGroupFlowIds)
        userDefaults.removeObject(forKey: Keys.visibleCityIds)
        userDefaults.removeObject(forKey: Keys.visiblePlanIds)
        userDefaults.removeObject(forKey: Keys.visibleGroupFlowIds)
        userDefaults.removeObject(forKey: Keys.savedAtById)
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

    private func persistSavedAt() {
        userDefaults.set(savedAtById.mapValues { $0.timeIntervalSince1970 }, forKey: Keys.savedAtById)
    }

    private func persistVisibleCityIds() {
        userDefaults.set(Array(visibleCityIds), forKey: Keys.visibleCityIds)
    }

    private func persistVisiblePlanIds() {
        userDefaults.set(Array(visiblePlanIds), forKey: Keys.visiblePlanIds)
    }

    private func persistVisibleGroupFlowIds() {
        userDefaults.set(Array(visibleGroupFlowIds), forKey: Keys.visibleGroupFlowIds)
    }

    /// Reconcile a visible-ID set against a freshly fetched server list.
    /// Removes stale IDs, then fills open slots from the server-ordered list.
    private func reconcileVisibleIds<T: Identifiable>(
        against items: [T],
        keyPath: ReferenceWritableKeyPath<SavedItemsManager, Set<String>>,
        key: String
    ) where T.ID == String {
        let serverIds = Set(items.map { $0.id })
        var visible = self[keyPath: keyPath].intersection(serverIds)
        // Enforce cap in case of stale data from a prior version
        if visible.count > SavedItemsManager.freeSaveCap {
            visible = Set(Array(visible).prefix(SavedItemsManager.freeSaveCap))
        }
        // Fill open slots in server order (handles first-load and items removed server-side)
        for item in items where !visible.contains(item.id) {
            if visible.count >= SavedItemsManager.freeSaveCap { break }
            visible.insert(item.id)
        }
        self[keyPath: keyPath] = visible
        userDefaults.set(Array(visible), forKey: key)
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
