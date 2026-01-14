//
//  BoltTokenManager.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/13/26.
//  Sprint 16 - Token system for Bolt group plan generation
//
//  Pro users get 5 tokens per week that refresh every Monday at midnight.
//  Tokens are synced with the database for cross-device tracking.
//  Falls back to local storage if offline.
//

import Foundation
import Combine
import UIKit

/// Manages Bolt generation tokens for Pro users
/// - Pro users get 5 tokens per week
/// - Tokens refresh every Monday at midnight
/// - Syncs with Supabase database for tracking
/// - Free users have 0 tokens (cannot generate)
@MainActor
class BoltTokenManager: ObservableObject {
    static let shared = BoltTokenManager()

    // MARK: - Constants

    /// Maximum tokens per week for Pro users
    static let maxTokensPerWeek = 5

    /// UserDefaults keys (fallback for offline)
    private let tokenCountKey = "bolt_token_count"
    private let lastRefreshKey = "bolt_token_last_refresh"
    private let totalGenerationsKey = "bolt_total_generations"
    private let pendingSyncKey = "bolt_pending_sync"

    // MARK: - Published Properties

    /// Current token count
    @Published var tokenCount: Int = 0

    /// Whether tokens have been loaded
    @Published var isLoaded: Bool = false

    /// Total lifetime generations
    @Published var totalGenerations: Int = 0

    /// Whether we're syncing with database
    @Published var isSyncing: Bool = false

    // MARK: - Private Properties

    /// Pending operations to sync when online
    private var pendingOperations: [PendingTokenOperation] = []

    // MARK: - Computed Properties

    /// Whether the user can generate (has tokens and is Pro)
    var canGenerate: Bool {
        guard SubscriptionManager.shared.isProUser else { return false }
        return tokenCount > 0
    }

    /// Days until next token refresh
    var daysUntilRefresh: Int {
        let calendar = Calendar.current
        let now = Date()

        // Find next Monday
        var components = DateComponents()
        components.weekday = 2 // Monday

        guard let nextMonday = calendar.nextDate(
            after: now,
            matching: components,
            matchingPolicy: .nextTime
        ) else {
            return 7
        }

        let days = calendar.dateComponents([.day], from: now, to: nextMonday).day ?? 7
        return max(0, days)
    }

    /// Formatted next refresh date
    var nextRefreshDate: String {
        let calendar = Calendar.current
        var components = DateComponents()
        components.weekday = 2 // Monday

        guard let nextMonday = calendar.nextDate(
            after: Date(),
            matching: components,
            matchingPolicy: .nextTime
        ) else {
            return "Next Monday"
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: nextMonday)
    }

    // MARK: - Initialization

    private init() {
        loadPendingOperations()
        setupWeeklyRefreshCheck()
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
            tokenCount = tokens.tokenCount
            totalGenerations = tokens.totalGenerations

            // Save to local as backup
            saveTokensToLocal()

            // Sync any pending operations
            await syncPendingOperations()

            print("[BoltTokenManager] Loaded from database: \(tokenCount) tokens, \(totalGenerations) total")
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

    /// Clear all token data (for logout)
    func clearData() {
        UserDefaults.standard.removeObject(forKey: tokenCountKey)
        UserDefaults.standard.removeObject(forKey: lastRefreshKey)
        UserDefaults.standard.removeObject(forKey: totalGenerationsKey)
        UserDefaults.standard.removeObject(forKey: pendingSyncKey)
        tokenCount = Self.maxTokensPerWeek
        totalGenerations = 0
        pendingOperations = []
        isLoaded = false
    }

    // MARK: - Database Operations

    /// Fetch tokens from Supabase database
    private func fetchTokensFromDatabase(userId: String) async throws -> (tokenCount: Int, totalGenerations: Int) {
        let client = SupabaseManager.shared.client!

        // Call the get_or_create_bolt_tokens function
        let response: [TokenResponse] = try await client
            .rpc("get_or_create_bolt_tokens", params: ["p_user_id": userId])
            .execute()
            .value

        guard let result = response.first else {
            throw TokenError.noData
        }

        return (result.token_count, result.total_generations)
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
            tokenCount = Self.maxTokensPerWeek
            UserDefaults.standard.set(Date(), forKey: lastRefreshKey)
            saveTokensToLocal()
        } else {
            tokenCount = UserDefaults.standard.integer(forKey: tokenCountKey)
            if lastRefresh == nil {
                tokenCount = Self.maxTokensPerWeek
                saveTokensToLocal()
            }
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

    /// Check if tokens should be refreshed (Monday midnight)
    private func shouldRefreshTokens(lastRefresh: Date?) -> Bool {
        guard let lastRefresh = lastRefresh else { return true }

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

/// Response from get_or_create_bolt_tokens function
private struct TokenResponse: Codable {
    let token_count: Int
    let week_start_date: String
    let total_generations: Int
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
