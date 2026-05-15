//
//  BoltTokenManager.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/13/26.
//  Sprint 16 - Token system for Bolt group plan generation
//
//  Pro users get 5 tokens per week that refresh based on their subscription start date.
//  Each user's tokens refresh 7 days after their subscription began (personalized cycle).
//  Tokens are synced with the database for cross-device tracking.
//  Falls back to local storage if offline.
//

import Foundation
import Combine
import UIKit

/// Manages Bolt generation tokens for Pro and free email users
/// - Pro users get 5 tokens per week
/// - Tokens refresh every 7 days from user's subscription start date (personalized)
/// - Syncs with Supabase database for tracking
/// - Free email users get 1 token per week (resets every 7 days)
/// - Free non-email users have 0 tokens (cannot generate)
@MainActor
class BoltTokenManager: ObservableObject {
    static let shared = BoltTokenManager()

    // MARK: - Constants

    /// Maximum tokens per week for Pro users
    static let maxTokensPerWeek = 7

    /// Token refresh cycle in days
    static let refreshCycleDays = 7

    /// UserDefaults keys (fallback for offline)
    private let tokenCountKey = "bolt_token_count"
    private let lastRefreshKey = "bolt_token_last_refresh"
    private let totalGenerationsKey = "bolt_total_generations"
    private let pendingSyncKey = "bolt_pending_sync"
    private let subscriptionStartKey = "bolt_subscription_start_date"
    private let freeTokenUsedDateKey = "bolt_free_token_used_date"

    // MARK: - Published Properties

    /// Current token count
    @Published var tokenCount: Int = 0

    /// Whether tokens have been loaded
    @Published var isLoaded: Bool = false

    /// Total lifetime generations
    @Published var totalGenerations: Int = 0

    /// Whether we're syncing with database
    @Published var isSyncing: Bool = false

    /// User's subscription start date (for personalized refresh cycle)
    @Published var subscriptionStartDate: Date?

    /// Whether the free weekly token is available for email users
    @Published var freeTokenAvailable: Bool = false

    // MARK: - Private Properties

    /// Pending operations to sync when online
    private var pendingOperations: [PendingTokenOperation] = []

    // MARK: - Computed Properties

    /// Whether the user can generate (has tokens and is Pro)
    var canGenerate: Bool {
        guard SubscriptionManager.shared.isProUser else { return false }
        return tokenCount > 0
    }

    /// Whether any signed-in, non-Pro user can generate their free weekly Vibez.
    var canFreeUserGenerate: Bool {
        guard !SubscriptionManager.shared.isProUser else { return false }
        guard SupabaseManager.shared.currentUser != nil else { return false }
        return freeTokenAvailable
    }

    /// Load free token state: apply local cache instantly, then reconcile with server.
    func loadFreeTokenState() {
        loadFreeTokenStateLocal()
        Task {
            await loadFreeTokenStateFromServer()
        }
    }

    private func loadFreeTokenStateLocal() {
        if let lastUsed = UserDefaults.standard.object(forKey: freeTokenUsedDateKey) as? Date {
            let days = Calendar.current.dateComponents([.day], from: lastUsed, to: Date()).day ?? 0
            freeTokenAvailable = days >= Self.refreshCycleDays
        } else {
            // No local record — default to false and let the server decide.
            // Prevents a reinstall from resetting the token.
            freeTokenAvailable = false
        }
    }

    private func loadFreeTokenStateFromServer() async {
        guard let userId = SupabaseManager.shared.currentUser?.id else { return }

        do {
            let client = SupabaseManager.shared.client!
            let response: [FreeTokenStatusResponse] = try await client
                .rpc("get_free_token_status", params: ["p_user_id": userId])
                .execute()
                .value

            guard let result = response.first else { return }

            freeTokenAvailable = result.available

            // Keep local cache in sync with server's authoritative timestamp
            if let isoString = result.last_generation_at {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = formatter.date(from: isoString) {
                    UserDefaults.standard.set(date, forKey: freeTokenUsedDateKey)
                }
            } else {
                UserDefaults.standard.removeObject(forKey: freeTokenUsedDateKey)
            }

            print("[BoltTokenManager] Server free token: available=\(result.available), days_until_reset=\(result.days_until_reset ?? 0)")
        } catch {
            print("[BoltTokenManager] Server free token fetch failed, using local: \(error)")
        }
    }

    /// Consume the free weekly token (optimistic local update + server write).
    func consumeFreeToken() {
        UserDefaults.standard.set(Date(), forKey: freeTokenUsedDateKey)
        freeTokenAvailable = false

        Task {
            await consumeFreeTokenOnServer()
        }
    }

    private func consumeFreeTokenOnServer() async {
        guard let userId = SupabaseManager.shared.currentUser?.id else { return }

        do {
            let client = SupabaseManager.shared.client!
            try await client
                .rpc("consume_free_bolt_token", params: ["p_user_id": userId])
                .execute()
            print("[BoltTokenManager] Free token consumed on server")
        } catch {
            print("[BoltTokenManager] Failed to sync free token consumption: \(error)")
        }
    }

    /// Days until the free token resets
    var daysUntilFreeTokenRefresh: Int {
        guard let lastUsed = UserDefaults.standard.object(forKey: freeTokenUsedDateKey) as? Date else { return 0 }
        let days = Calendar.current.dateComponents([.day], from: lastUsed, to: Date()).day ?? 0
        return max(0, Self.refreshCycleDays - days)
    }

    /// Days until next token refresh (based on user's subscription start date)
    var daysUntilRefresh: Int {
        guard let startDate = subscriptionStartDate else {
            // Fallback: if no subscription start date, use 7 days from now
            return Self.refreshCycleDays
        }

        let calendar = Calendar.current
        let now = Date()

        // Calculate days since subscription start
        let daysSinceStart = calendar.dateComponents([.day], from: startDate, to: now).day ?? 0

        // Calculate days into current cycle (0-6)
        let daysIntoCycle = daysSinceStart % Self.refreshCycleDays

        // Days until next refresh
        let daysUntil = Self.refreshCycleDays - daysIntoCycle

        return daysUntil == Self.refreshCycleDays ? 0 : daysUntil
    }

    /// Formatted next refresh date (based on user's subscription cycle)
    var nextRefreshDate: String {
        guard let startDate = subscriptionStartDate else {
            return "in \(Self.refreshCycleDays) days"
        }

        let calendar = Calendar.current
        let now = Date()

        // Calculate days since subscription start
        let daysSinceStart = calendar.dateComponents([.day], from: startDate, to: now).day ?? 0

        // Calculate days into current cycle
        let daysIntoCycle = daysSinceStart % Self.refreshCycleDays

        // Days until next refresh
        let daysUntil = Self.refreshCycleDays - daysIntoCycle

        // Calculate next refresh date
        guard let nextRefresh = calendar.date(byAdding: .day, value: daysUntil, to: now) else {
            return "in \(daysUntil) days"
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: nextRefresh)
    }

    // MARK: - Initialization

    private init() {
        loadPendingOperations()
        loadSubscriptionStartDate()
        loadFreeTokenState()
        setupWeeklyRefreshCheck()
        observeAuthChanges()
    }

    private func observeAuthChanges() {
        Task {
            guard let client = SupabaseManager.shared.client else { return }
            for await (event, _) in client.auth.authStateChanges {
                switch event {
                case .signedIn:
                    loadFreeTokenState()
                    await loadTokensAsync()
                case .signedOut:
                    clearData()
                default:
                    break
                }
            }
        }
    }

    /// Load subscription start date from local storage
    private func loadSubscriptionStartDate() {
        subscriptionStartDate = UserDefaults.standard.object(forKey: subscriptionStartKey) as? Date
    }

    /// Save subscription start date to local storage
    private func saveSubscriptionStartDate(_ date: Date) {
        subscriptionStartDate = date
        UserDefaults.standard.set(date, forKey: subscriptionStartKey)
    }

    /// Set subscription start date (called when user first subscribes)
    func setSubscriptionStartDate(_ date: Date) {
        // Only set if not already set (preserve original start date)
        if subscriptionStartDate == nil {
            saveSubscriptionStartDate(date)
            print("[BoltTokenManager] Subscription start date set: \(date)")
        }
    }

    /// Initialize subscription start date if not set (for existing Pro users)
    func initializeSubscriptionStartDateIfNeeded() {
        guard SubscriptionManager.shared.isProUser else { return }

        if subscriptionStartDate == nil {
            // For existing users without a start date, use now as their start date
            // This gives them a fresh 7-day cycle from today
            saveSubscriptionStartDate(Date())
            print("[BoltTokenManager] Initialized subscription start date for existing user")
        }
    }

    // MARK: - Public Methods

    /// Load tokens from database (with local fallback)
    func loadTokens() {
        Task {
            await loadTokensAsync()
        }
    }

    /// Load tokens asynchronously from database
    func loadTokensAsync() async {
        guard let userId = SupabaseManager.shared.currentUser?.id else {
            // Not logged in, use local storage
            loadTokensFromLocal()
            return
        }

        isSyncing = true

        do {
            // Try to load from database
            let tokens = try await fetchTokensFromDatabase(userId: userId)
            totalGenerations = tokens.totalGenerations

            // Guard against stale server data overwriting a fresh upgrade.
            // Two cases where local should win:
            //  1. Local subscriptionStartDate is newer than server's cycleStartDate (server is behind)
            //  2. Local subscriptionStartDate exists but server returned no cycleStartDate yet
            //     (server hasn't processed the upgrade at all)
            let localIsMoreRecent: Bool
            if let localStart = subscriptionStartDate, let serverCycle = tokens.cycleStartDate {
                localIsMoreRecent = localStart > serverCycle
            } else if subscriptionStartDate != nil && tokens.cycleStartDate == nil {
                // Local cycle was just set (fresh upgrade), server hasn't registered it yet
                localIsMoreRecent = true
            } else {
                localIsMoreRecent = false
            }

            if localIsMoreRecent {
                print("[BoltTokenManager] Fresh upgrade — server not yet updated, keeping local \(tokenCount) tokens")
            } else {
                tokenCount = tokens.tokenCount
            }

            // Set subscription start date from database if available
            if let cycleStartDate = tokens.cycleStartDate {
                if subscriptionStartDate == nil {
                    saveSubscriptionStartDate(cycleStartDate)
                }
            } else {
                // Initialize for existing users
                initializeSubscriptionStartDateIfNeeded()
            }

            // Save to local as backup
            saveTokensToLocal()

            // Sync any pending operations
            await syncPendingOperations()

            print("[BoltTokenManager] Loaded from database: \(tokenCount) tokens, \(totalGenerations) total, cycle start: \(subscriptionStartDate?.description ?? "nil")")
        } catch {
            print("[BoltTokenManager] Database load failed, using local: \(error)")
            loadTokensFromLocal()
        }

        isSyncing = false
        isLoaded = true
    }

    /// Consume a token for generation
    /// - Parameters:
    ///   - cityName: The city for the generation (for tracking)
    ///   - themeName: The theme for the generation (for tracking)
    /// - Returns: true if token was consumed, false if no tokens available
    func consumeToken(cityName: String? = nil, themeName: String? = nil) -> Bool {
        guard canGenerate else {
            print("[BoltTokenManager] Cannot consume token - no tokens or not Pro")
            return false
        }

        // Optimistically update local state
        tokenCount -= 1
        totalGenerations += 1
        saveTokensToLocal()

        // Sync with database
        Task {
            await consumeTokenInDatabase(cityName: cityName, themeName: themeName)
        }

        print("[BoltTokenManager] Token consumed. Remaining: \(tokenCount)")
        return true
    }

    /// Refund a token (if generation failed)
    func refundToken() {
        tokenCount = min(tokenCount + 1, Self.maxTokensPerWeek)
        totalGenerations = max(totalGenerations - 1, 0)
        saveTokensToLocal()

        // Sync with database
        Task {
            await refundTokenInDatabase()
        }

        print("[BoltTokenManager] Token refunded. Remaining: \(tokenCount)")
    }

    /// Force refresh tokens (for testing or admin)
    func forceRefresh() {
        tokenCount = Self.maxTokensPerWeek
        saveTokensToLocal()
        print("[BoltTokenManager] Tokens force refreshed to \(tokenCount)")
    }

    /// Called when a free user upgrades to Pro.
    /// Immediately restores all 7 tokens and starts the weekly cycle from the moment of subscription.
    func handleUpgradeToProSubscription() {
        let now = Date()
        tokenCount = Self.maxTokensPerWeek
        // Reset cycle to start from the subscription moment
        subscriptionStartDate = now
        UserDefaults.standard.set(now, forKey: subscriptionStartKey)
        UserDefaults.standard.set(now, forKey: lastRefreshKey)
        saveTokensToLocal()
        print("[BoltTokenManager] Upgraded to Pro — \(tokenCount) tokens restored, cycle starts now")

        // Sync with server — server response wins if it disagrees, but user sees tokens immediately
        Task {
            await loadTokensAsync()
        }
    }

    /// Clear all token data (for logout)
    func clearData() {
        UserDefaults.standard.removeObject(forKey: tokenCountKey)
        UserDefaults.standard.removeObject(forKey: lastRefreshKey)
        UserDefaults.standard.removeObject(forKey: totalGenerationsKey)
        UserDefaults.standard.removeObject(forKey: pendingSyncKey)
        UserDefaults.standard.removeObject(forKey: subscriptionStartKey)
        tokenCount = 0
        totalGenerations = 0
        subscriptionStartDate = nil
        pendingOperations = []
        isLoaded = false
    }

    // MARK: - Database Operations

    /// Fetch tokens from Supabase database
    private func fetchTokensFromDatabase(userId: String) async throws -> (tokenCount: Int, totalGenerations: Int, cycleStartDate: Date?) {
        let client = SupabaseManager.shared.client!

        // Call the get_or_create_bolt_tokens function
        let response: [TokenResponse] = try await client
            .rpc("get_or_create_bolt_tokens", params: ["p_user_id": userId])
            .execute()
            .value

        guard let result = response.first else {
            throw TokenError.noData
        }

        // Parse cycle start date if available
        var cycleStartDate: Date?
        if let dateString = result.cycle_start_date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            cycleStartDate = formatter.date(from: dateString)
        }

        return (result.token_count, result.total_generations, cycleStartDate)
    }

    /// Consume token in database
    private func consumeTokenInDatabase(cityName: String?, themeName: String?) async {
        guard let userId = SupabaseManager.shared.currentUser?.id else {
            // Queue for later sync
            addPendingOperation(.consume(cityName: cityName, themeName: themeName))
            return
        }

        do {
            let client = SupabaseManager.shared.client!

            var params: [String: String] = ["p_user_id": userId]
            if let city = cityName {
                params["p_city_name"] = city
            }
            if let theme = themeName {
                params["p_theme_name"] = theme
            }

            let _: [ConsumeResponse] = try await client
                .rpc("consume_bolt_token", params: params)
                .execute()
                .value

            print("[BoltTokenManager] Token consumption synced to database")
        } catch {
            print("[BoltTokenManager] Failed to sync consumption: \(error)")
            addPendingOperation(.consume(cityName: cityName, themeName: themeName))
        }
    }

    /// Refund token in database
    private func refundTokenInDatabase() async {
        guard let userId = SupabaseManager.shared.currentUser?.id else {
            addPendingOperation(.refund)
            return
        }

        do {
            let client = SupabaseManager.shared.client!

            let _: [RefundResponse] = try await client
                .rpc("refund_bolt_token", params: ["p_user_id": userId])
                .execute()
                .value

            print("[BoltTokenManager] Token refund synced to database")
        } catch {
            print("[BoltTokenManager] Failed to sync refund: \(error)")
            addPendingOperation(.refund)
        }
    }

    // MARK: - Local Storage (Fallback)

    /// Load tokens from local storage
    private func loadTokensFromLocal() {
        let lastRefresh = UserDefaults.standard.object(forKey: lastRefreshKey) as? Date

        // Check if we need to refresh tokens
        if shouldRefreshTokens(lastRefresh: lastRefresh) {
            if lastRefresh == nil {
                // No local record at all (fresh install / cleared storage).
                // Don't grant tokens locally — server is authoritative.
                tokenCount = 0
            } else {
                // A genuine week boundary crossed — safe to grant locally.
                tokenCount = Self.maxTokensPerWeek
                UserDefaults.standard.set(Date(), forKey: lastRefreshKey)
                saveTokensToLocal()
            }
        } else {
            tokenCount = UserDefaults.standard.integer(forKey: tokenCountKey)
        }

        totalGenerations = UserDefaults.standard.integer(forKey: totalGenerationsKey)
        isLoaded = true

        print("[BoltTokenManager] Loaded from local: \(tokenCount) tokens, \(totalGenerations) generations")
    }

    /// Save tokens to local storage
    private func saveTokensToLocal() {
        UserDefaults.standard.set(tokenCount, forKey: tokenCountKey)
        UserDefaults.standard.set(totalGenerations, forKey: totalGenerationsKey)
        UserDefaults.standard.set(Date(), forKey: lastRefreshKey)
    }

    /// Check if tokens should be refreshed (based on personalized 7-day cycle)
    private func shouldRefreshTokens(lastRefresh: Date?) -> Bool {
        guard let lastRefresh = lastRefresh else { return true }

        // Initialize subscription start date if needed (for existing Pro users)
        initializeSubscriptionStartDateIfNeeded()

        guard let startDate = subscriptionStartDate else {
            // Fallback to calendar week if no subscription start date
            let calendar = Calendar.current
            let now = Date()
            let currentWeekStart = calendar.date(from: calendar.dateComponents(
                [.yearForWeekOfYear, .weekOfYear],
                from: now
            ))
            let lastRefreshWeekStart = calendar.date(from: calendar.dateComponents(
                [.yearForWeekOfYear, .weekOfYear],
                from: lastRefresh
            ))
            return currentWeekStart != lastRefreshWeekStart
        }

        let calendar = Calendar.current
        let now = Date()

        // Calculate which cycle the last refresh was in
        let daysSinceStartToLastRefresh = calendar.dateComponents([.day], from: startDate, to: lastRefresh).day ?? 0
        let lastRefreshCycle = daysSinceStartToLastRefresh / Self.refreshCycleDays

        // Calculate which cycle we're currently in
        let daysSinceStartToNow = calendar.dateComponents([.day], from: startDate, to: now).day ?? 0
        let currentCycle = daysSinceStartToNow / Self.refreshCycleDays

        // Refresh if we're in a new cycle
        return currentCycle > lastRefreshCycle
    }

    // MARK: - Pending Operations (Offline Support)

    /// Add a pending operation to sync later
    private func addPendingOperation(_ operation: PendingTokenOperation) {
        pendingOperations.append(operation)
        savePendingOperations()
    }

    /// Save pending operations to UserDefaults
    private func savePendingOperations() {
        if let data = try? JSONEncoder().encode(pendingOperations) {
            UserDefaults.standard.set(data, forKey: pendingSyncKey)
        }
    }

    /// Load pending operations from UserDefaults
    private func loadPendingOperations() {
        if let data = UserDefaults.standard.data(forKey: pendingSyncKey),
           let operations = try? JSONDecoder().decode([PendingTokenOperation].self, from: data) {
            pendingOperations = operations
        }
    }

    /// Sync pending operations with database
    private func syncPendingOperations() async {
        guard !pendingOperations.isEmpty else { return }

        let operationsToSync = pendingOperations
        pendingOperations = []
        savePendingOperations()

        for operation in operationsToSync {
            switch operation {
            case .consume(let cityName, let themeName):
                await consumeTokenInDatabase(cityName: cityName, themeName: themeName)
            case .refund:
                await refundTokenInDatabase()
            }
        }
    }

    // MARK: - Weekly Refresh Check

    private func setupWeeklyRefreshCheck() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.loadFreeTokenState()
                await self?.loadTokensAsync()
            }
        }
    }
}

// MARK: - Token Display Info

extension BoltTokenManager {
    /// Formatted token count for display
    var formattedTokenCount: String {
        "\(tokenCount)/\(Self.maxTokensPerWeek)"
    }

    /// Formatted free token count for display (email free users)
    var formattedFreeTokenCount: String {
        freeTokenAvailable ? "1/1" : "0/1"
    }

    /// Status message for UI
    var statusMessage: String {
        if !SubscriptionManager.shared.isProUser {
            return "Upgrade to Pro to generate custom plans"
        } else if tokenCount == 0 {
            return "Tokens refresh \(nextRefreshDate)"
        } else if tokenCount == 1 {
            return "1 generation remaining this week"
        } else {
            return "\(tokenCount) generations remaining this week"
        }
    }

    /// Whether to show low token warning (1 or 2 tokens left)
    var showLowTokenWarning: Bool {
        SubscriptionManager.shared.isProUser && tokenCount > 0 && tokenCount <= 2
    }
}

// MARK: - Supporting Types

/// Pending operation for offline sync
private enum PendingTokenOperation: Codable {
    case consume(cityName: String?, themeName: String?)
    case refund
}

/// Response from get_free_token_status function
private struct FreeTokenStatusResponse: Codable {
    let available: Bool
    let last_generation_at: String?
    let days_until_reset: Int?
}

/// Response from get_or_create_bolt_tokens function
private struct TokenResponse: Codable {
    let token_count: Int
    let week_start_date: String
    let total_generations: Int
    let cycle_start_date: String?
}

/// Response from consume_bolt_token function
private struct ConsumeResponse: Codable {
    let success: Bool
    let remaining_tokens: Int
    let message: String
}

/// Response from refund_bolt_token function
private struct RefundResponse: Codable {
    let success: Bool
    let remaining_tokens: Int
}

/// Token errors
private enum TokenError: Error {
    case noData
    case syncFailed
}
