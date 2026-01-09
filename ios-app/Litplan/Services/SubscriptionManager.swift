//
//  SubscriptionManager.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/30/25.
//  StoreKit 2 integration for subscription management - Sprint 3, Day 12
//

import Foundation
import StoreKit

/// Manages subscription purchases, restoration, and status using StoreKit 2
@MainActor
class SubscriptionManager: ObservableObject {

    // MARK: - Singleton

    static let shared = SubscriptionManager()

    // MARK: - Published Properties

    @Published var availableProducts: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []
    @Published var isProUser: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var isTestMode: Bool = false  // Indicates if Pro was granted via test mode
    @Published var productsLoadedAt: Date?  // Track when products were last loaded

    // MARK: - Subscription State

    @Published var subscriptionState: SubscriptionState = .none
    @Published var currentSubscriptionType: SubscriptionType?
    @Published var subscriptionExpirationDate: Date?

    // MARK: - Private Properties

    /// StoreKit 2 product identifiers
    /// These must match the product IDs configured in App Store Connect and StoreKit Configuration
    private let productIDs = [
        "com.litplan.pro.monthly",
        "com.litplan.pro.yearly"
    ]

    /// Product ID constants for easy reference
    enum ProductID {
        static let monthly = "com.litplan.pro.monthly"
        static let yearly = "com.litplan.pro.yearly"
    }

    private var updateListenerTask: Task<Void, Error>?

    /// Cache duration for products (1 hour)
    private let productsCacheValidityDuration: TimeInterval = 3600

    /// Whether products are currently being loaded (prevents duplicate requests)
    private var isLoadingProducts: Bool = false

    // Backend API configuration - now using Config
    private var backendURL: String {
        return Config.legacyAPIBaseURL
    }

    // MARK: - Initialization

    private init() {
        // Start listening for transaction updates in a detached task
        updateListenerTask = listenForTransactions()

        // Check for persisted test access first
        checkPersistedTestAccess()

        // Load products and check subscription status on init (fire-and-forget)
        // Use Task with @MainActor to ensure proper actor context
        Task { @MainActor [weak self] in
            guard let self = self else { return }
            await self.loadProducts()
            await self.checkSubscriptionStatus()
        }
    }

    deinit {
        updateListenerTask?.cancel()
    }

    // MARK: - Product Loading

    /// Check if cached products are still valid
    var areProductsCached: Bool {
        guard !availableProducts.isEmpty,
              let loadedAt = productsLoadedAt else {
            return false
        }
        let elapsed = Date().timeIntervalSince(loadedAt)
        return elapsed < productsCacheValidityDuration
    }

    /// Load available subscription products from App Store
    /// Products are cached and will not re-fetch unless cache is invalid or force is true
    /// - Parameter force: If true, forces a refresh even if products are cached
    func loadProducts(force: Bool = false) async {
        // Check if products are already cached and valid
        if !force && areProductsCached {
            print("[SubscriptionManager] Products already cached (\(availableProducts.count) products), skipping fetch")
            return
        }

        // Prevent duplicate simultaneous requests
        guard !isLoadingProducts else {
            print("[SubscriptionManager] Product load already in progress, skipping duplicate request")
            return
        }

        isLoadingProducts = true
        isLoading = true
        errorMessage = nil

        let startTime = Date()
        print("[SubscriptionManager] Starting product load...")

        do {
            // Fetch products from App Store using StoreKit 2
            print("[SubscriptionManager] Requesting products with IDs: \(productIDs)")
            let products = try await Product.products(for: productIDs)

            if products.isEmpty {
                print("[SubscriptionManager] WARNING: No products returned. Check that:")
                print("[SubscriptionManager]   1. Product IDs match App Store Connect / StoreKit Config")
                print("[SubscriptionManager]   2. StoreKit Configuration file is set in scheme")
                print("[SubscriptionManager]   3. Products are approved in App Store Connect (for production)")
            }

            // Sort products by price (ascending)
            self.availableProducts = products.sorted { $0.price < $1.price }
            self.productsLoadedAt = Date()

            let duration = Date().timeIntervalSince(startTime)
            print("[SubscriptionManager] Successfully loaded \(products.count) products in \(String(format: "%.2f", duration))s")
            for product in availableProducts {
                print("[SubscriptionManager]   - \(product.id): \(product.displayPrice)")
            }
        } catch {
            print("[SubscriptionManager] Failed to load products: \(error)")
            print("[SubscriptionManager] Error type: \(type(of: error))")
            errorMessage = "Failed to load subscription options. Please try again."
        }

        isLoading = false
        isLoadingProducts = false
    }

    /// Pre-load products on app launch - call this early to ensure products are cached
    func preloadProducts() {
        print("[SubscriptionManager] Pre-loading products on app launch...")
        Task { @MainActor in
            await loadProducts()
        }
    }

    // MARK: - Purchase Flow

    /// Purchase a subscription product
    /// - Parameter product: The product to purchase
    /// - Returns: The verified transaction if successful, nil otherwise
    func purchase(_ product: Product) async throws -> Transaction? {
        isLoading = true
        errorMessage = nil

        do {
            // Check network connectivity
            guard NetworkMonitor.shared.isConnected else {
                isLoading = false
                errorMessage = "No internet connection. Please check your connection and try again."
                throw SubscriptionError.networkUnavailable
            }

            // Initiate purchase
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                // Transaction successful, now verify it
                let transaction: Transaction
                do {
                    transaction = try checkVerified(verification)
                } catch {
                    isLoading = false
                    errorMessage = "Purchase verification failed. Please contact support if you were charged."
                    throw SubscriptionError.failedVerification
                }

                // Validate with backend
                do {
                    try await validateWithBackend(transaction: transaction)
                } catch SubscriptionError.backendError(let message) {
                    isLoading = false
                    errorMessage = message
                    // Finish the transaction even if backend validation fails
                    await transaction.finish()
                    throw SubscriptionError.backendError(message)
                } catch {
                    isLoading = false
                    errorMessage = "Unable to activate subscription. Please try restoring purchases."
                    await transaction.finish()
                    throw error
                }

                // Update local state
                await updateSubscriptionStatus()

                // Finish the transaction
                await transaction.finish()

                isLoading = false
                return transaction

            case .userCancelled:
                // User cancelled, no error needed
                isLoading = false
                return nil

            case .pending:
                // Purchase is pending (e.g., requires parental approval)
                isLoading = false
                errorMessage = "Purchase is pending approval. You'll receive a notification when it's ready."
                return nil

            @unknown default:
                isLoading = false
                errorMessage = "An unexpected error occurred. Please try again."
                throw SubscriptionError.unknownPurchaseResult
            }
        } catch StoreKitError.userCancelled {
            // User cancelled, no error needed
            isLoading = false
            return nil
        } catch StoreKitError.networkError(let underlyingError) {
            isLoading = false
            errorMessage = "Network error during purchase. Please check your connection and try again."
            throw SubscriptionError.networkError(underlyingError)
        } catch {
            isLoading = false
            errorMessage = "Purchase failed. Please try again or contact support."
            print("[SubscriptionManager] Purchase error: \(error.localizedDescription)")
            throw error
        }
    }

    // MARK: - Restore Purchases

    /// Restore previous purchases
    func restorePurchases() async throws {
        isLoading = true
        errorMessage = nil

        do {
            // Check network connectivity
            guard NetworkMonitor.shared.isConnected else {
                isLoading = false
                errorMessage = "No internet connection. Please check your connection and try again."
                throw SubscriptionError.networkUnavailable
            }

            // Sync with App Store to restore purchases
            do {
                try await AppStore.sync()
            } catch {
                isLoading = false
                errorMessage = "Failed to connect to App Store. Please try again."
                throw SubscriptionError.appStoreConnectionFailed
            }

            // Update subscription status
            await checkSubscriptionStatus()

            // Validate with backend if we have an active subscription
            if isProUser, let transaction = await getCurrentSubscriptionTransaction() {
                do {
                    try await validateWithBackend(transaction: transaction)
                } catch {
                    // Don't fail restore if backend validation fails
                    print("[SubscriptionManager] Backend validation failed during restore: \(error)")
                    // User is still marked as Pro based on App Store receipt
                }
            }

            isLoading = false

            if !isProUser {
                errorMessage = "No previous purchases found. If you believe this is an error, please contact support."
                throw SubscriptionError.noPurchasesToRestore
            }
        } catch {
            isLoading = false
            errorMessage = "Failed to restore purchases. Please try again or contact support."
            print("[SubscriptionManager] Restore error: \(error.localizedDescription)")
            throw error
        }
    }

    // MARK: - Subscription Status

    /// Refresh Pro status by checking StoreKit 2 entitlements
    /// Works for ALL users (authenticated, guest, or unauthenticated) since StoreKit entitlements
    /// are tied to the Apple ID, not the app's authentication state.
    /// Call this from views on `.onAppear` to ensure Pro status is accurate.
    /// - Returns: The current Pro status after checking entitlements
    @discardableResult
    func refreshProStatus() async -> Bool {
        if Config.enableDebugLogging {
            print("[SubscriptionManager] refreshProStatus() called - checking StoreKit entitlements for all users")
        }

        // Check if test mode is active (takes precedence)
        if isTestMode {
            if Config.enableDebugLogging {
                print("[SubscriptionManager] Test mode active - isProUser: true")
            }
            return true
        }

        var hasActiveSubscription = false
        var detectedState: SubscriptionState = .none
        var latestExpirationDate: Date?
        var detectedType: SubscriptionType?

        // Check all current entitlements from StoreKit 2
        // This works regardless of authentication state since entitlements are tied to Apple ID
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)

                // Check if transaction is for one of our products
                if productIDs.contains(transaction.productID) {
                    if Config.enableDebugLogging {
                        print("[SubscriptionManager] Found entitlement for product: \(transaction.productID)")
                    }

                    // Check if subscription is still valid
                    if let expirationDate = transaction.expirationDate {
                        if expirationDate > Date() {
                            hasActiveSubscription = true
                            latestExpirationDate = expirationDate

                            // Determine state based on transaction details
                            if transaction.revocationDate != nil {
                                detectedState = .cancelledButValid
                            } else {
                                detectedState = .active
                            }

                            // Determine subscription type
                            detectedType = SubscriptionType(productID: transaction.productID)

                            if Config.enableDebugLogging {
                                print("[SubscriptionManager] Active subscription found - expires: \(expirationDate), state: \(detectedState)")
                            }
                        } else {
                            if Config.enableDebugLogging {
                                print("[SubscriptionManager] Found expired subscription for product: \(transaction.productID)")
                            }
                        }
                    }
                }
            } catch {
                if Config.enableDebugLogging {
                    print("[SubscriptionManager] Failed to verify transaction: \(error.localizedDescription)")
                }
            }
        }

        // Update published properties
        self.isProUser = hasActiveSubscription || isTestMode
        if hasActiveSubscription {
            self.subscriptionState = detectedState
            self.subscriptionExpirationDate = latestExpirationDate
            self.currentSubscriptionType = detectedType
        } else if !isTestMode {
            // Only reset state if not in test mode and no active subscription
            self.subscriptionState = .none
            self.subscriptionExpirationDate = nil
            self.currentSubscriptionType = nil
        }

        if Config.enableDebugLogging {
            print("[SubscriptionManager] refreshProStatus() complete - isProUser: \(isProUser), state: \(subscriptionState)")
        }

        return isProUser
    }

    /// Check current subscription status from App Store
    func checkSubscriptionStatus() async {
        var activeProductIDs: Set<String> = []
        var latestTransaction: Transaction?
        var latestExpirationDate: Date?
        var detectedState: SubscriptionState = .none

        // Check all current entitlements
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)

                // Check if transaction is for one of our products
                if productIDs.contains(transaction.productID) {
                    activeProductIDs.insert(transaction.productID)

                    // Track the latest transaction
                    if latestTransaction == nil || transaction.purchaseDate > latestTransaction!.purchaseDate {
                        latestTransaction = transaction
                        latestExpirationDate = transaction.expirationDate
                    }

                    // Determine subscription state based on transaction details
                    if let expirationDate = transaction.expirationDate {
                        if expirationDate > Date() {
                            // Check if subscription is revoked/cancelled but still valid
                            if transaction.revocationDate != nil {
                                detectedState = .cancelledButValid
                            } else if transaction.isUpgraded {
                                // Upgraded to a different subscription
                                detectedState = .active
                            } else {
                                detectedState = .active
                            }
                        } else {
                            detectedState = .expired
                        }
                    }
                }
            } catch {
                print("[SubscriptionManager] Failed to verify transaction: \(error.localizedDescription)")
            }
        }

        // Determine subscription type from the latest transaction
        var detectedType: SubscriptionType? = nil
        if let productID = latestTransaction?.productID {
            detectedType = SubscriptionType(productID: productID)
        }

        // Update state
        self.purchasedProductIDs = activeProductIDs
        self.subscriptionState = detectedState
        self.currentSubscriptionType = detectedType
        self.subscriptionExpirationDate = latestExpirationDate
        self.isProUser = detectedState.grantsAccess

        print("[SubscriptionManager] Status - state: \(detectedState), type: \(detectedType?.rawValue ?? "none"), isProUser: \(isProUser), expires: \(latestExpirationDate?.description ?? "N/A")")
    }

    /// Check subscription status with optional backend verification
    /// Call this on app launch for comprehensive validation
    func verifySubscriptionOnLaunch() async {
        // First check local StoreKit entitlements
        await checkSubscriptionStatus()

        // If we have an active subscription, optionally sync with backend
        if isProUser, let transaction = await getCurrentSubscriptionTransaction() {
            do {
                try await syncTransactionWithBackend(transaction: transaction)
                print("[SubscriptionManager] Backend sync successful on launch")
            } catch {
                // Don't fail if backend sync fails - local entitlements are the source of truth
                print("[SubscriptionManager] Backend sync failed on launch (non-fatal): \(error)")
            }
        }
    }

    /// Update subscription status (internal helper)
    private func updateSubscriptionStatus() async {
        await checkSubscriptionStatus()
    }

    /// Get the current active subscription transaction
    private func getCurrentSubscriptionTransaction() async -> Transaction? {
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)

                // Return the first active subscription we find
                if productIDs.contains(transaction.productID) {
                    return transaction
                }
            } catch {
                print("Failed to verify transaction: \(error.localizedDescription)")
            }
        }

        return nil
    }

    // MARK: - Transaction Verification

    /// Verify a transaction's signature
    /// - Parameter result: The verification result from StoreKit
    /// - Returns: The verified transaction
    /// - Throws: An error if verification fails
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            // Transaction signature is invalid
            throw SubscriptionError.failedVerification
        case .verified(let safe):
            // Transaction is verified by Apple
            return safe
        }
    }

    // MARK: - Backend Validation

    /// Sync transaction with backend server using POST /api/v2/subscription/verify
    /// - Parameter transaction: The transaction to sync
    private func syncTransactionWithBackend(transaction: Transaction) async throws {
        // Check if user is authenticated
        guard await getAuthTokenAsync() != nil else {
            print("[SubscriptionManager] Warning: No auth token available, skipping backend sync")
            return
        }

        // Determine environment
        let environment = transaction.environment == .sandbox ? "sandbox" : "production"

        // Prepare request body with transaction details
        // Auto-renewable subscriptions always auto-renew by default
        let requestBody = SubscriptionVerifyRequest(
            transactionId: String(transaction.id),
            productId: transaction.productID,
            purchaseDate: transaction.purchaseDate,
            expiresDate: transaction.expirationDate,
            originalTransactionId: String(transaction.originalID),
            environment: environment,
            autoRenewStatus: true
        )

        // Use APIService for the request
        let response = try await APIService.shared.verifySubscription(requestBody)

        if response.success, let data = response.data {
            // Update local state from backend response
            if let subscription = data.subscription {
                if let backendState = SubscriptionState(rawValue: subscription.status.lowercased()) {
                    self.subscriptionState = backendState
                    self.isProUser = backendState.grantsAccess
                }

                if let expiresDate = subscription.expiresDate {
                    self.subscriptionExpirationDate = expiresDate
                }
            }

            print("[SubscriptionManager] Backend sync successful for transaction \(transaction.id)")
        } else {
            let message = response.error?.message ?? "Verification failed"
            throw SubscriptionError.backendError(message)
        }
    }

    /// Validate transaction with backend server (legacy method, calls new sync method)
    /// - Parameter transaction: The transaction to validate
    private func validateWithBackend(transaction: Transaction) async throws {
        try await syncTransactionWithBackend(transaction: transaction)
    }

    /// Get receipt data for backend validation (if needed for legacy endpoints)
    /// - Parameter transaction: The transaction to get receipt data for
    /// - Returns: Base64-encoded receipt data
    private func getReceiptData(for transaction: Transaction) async throws -> String {
        // For StoreKit 2, we can use the transaction's JSON representation
        // In production, you might want to use the receipt URL

        // Try to get the app receipt
        if let appStoreReceiptURL = Bundle.main.appStoreReceiptURL,
           FileManager.default.fileExists(atPath: appStoreReceiptURL.path) {
            let receiptData = try Data(contentsOf: appStoreReceiptURL)
            return receiptData.base64EncodedString()
        }

        // Fallback: return transaction ID as receipt (for sandbox testing)
        return String(transaction.id)
    }

    /// Get authentication token synchronously from SupabaseManager
    /// - Returns: The auth token if available
    private func getAuthToken() -> String? {
        return SupabaseManager.shared.currentSession?.accessToken
    }

    /// Get authentication token asynchronously from SupabaseManager
    /// - Returns: The auth token if available
    private func getAuthTokenAsync() async -> String? {
        return await SupabaseManager.shared.getAccessToken()
    }

    // MARK: - Transaction Listener

    /// Listen for transaction updates (auto-renewals, etc.)
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached { [weak self] in
            // Iterate through any transactions that don't come from a direct call to purchase()
            for await result in Transaction.updates {
                do {
                    // Check verification in detached context
                    let transaction: Transaction
                    switch result {
                    case .unverified:
                        throw SubscriptionError.failedVerification
                    case .verified(let safe):
                        transaction = safe
                    }

                    print("[SubscriptionManager] Received transaction update for product: \(transaction.productID)")

                    // Update subscription status on main actor
                    await self?.handleTransactionUpdate(transaction: transaction)

                    // Finish the transaction
                    await transaction.finish()
                } catch {
                    print("[SubscriptionManager] Transaction verification failed: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Handle transaction update on MainActor
    private func handleTransactionUpdate(transaction: Transaction) async {
        // Update subscription status
        await updateSubscriptionStatus()

        // Sync with backend for auto-renewals and other updates
        do {
            try await syncTransactionWithBackend(transaction: transaction)
            print("[SubscriptionManager] Transaction update synced with backend")
        } catch {
            print("[SubscriptionManager] Failed to sync transaction update with backend: \(error)")
        }
    }

    // MARK: - Helper Methods

    /// Get product by ID
    /// - Parameter productID: The product identifier
    /// - Returns: The product if found
    func getProduct(for productID: String) -> Product? {
        return availableProducts.first { $0.id == productID }
    }

    /// Get monthly product
    var monthlyProduct: Product? {
        return getProduct(for: ProductID.monthly)
    }

    /// Get yearly product
    var yearlyProduct: Product? {
        return getProduct(for: ProductID.yearly)
    }

    /// Check if a specific product is purchased
    /// - Parameter productID: The product identifier
    /// - Returns: True if the product is currently active
    func isPurchased(_ productID: String) -> Bool {
        return purchasedProductIDs.contains(productID)
    }

    /// Get subscription status from the backend
    /// - Returns: SubscriptionStatusResponse with current status
    func fetchBackendSubscriptionStatus() async throws -> SubscriptionStatusResponse {
        return try await APIService.shared.getSubscriptionStatus()
    }

    /// Formatted expiration date string for display
    var formattedExpirationDate: String? {
        guard let date = subscriptionExpirationDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    /// Days until subscription expires
    var daysUntilExpiration: Int? {
        guard let date = subscriptionExpirationDate else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: Date(), to: date)
        return components.day
    }

    /// Check if subscription is expiring soon (within 7 days)
    var isExpiringSoon: Bool {
        guard let days = daysUntilExpiration else { return false }
        return days > 0 && days <= 7
    }

    /// Get detailed subscription info for display
    var subscriptionDisplayInfo: SubscriptionDisplayInfo {
        return SubscriptionDisplayInfo(
            isActive: isProUser,
            state: subscriptionState,
            type: currentSubscriptionType,
            expirationDate: subscriptionExpirationDate,
            formattedExpiration: formattedExpirationDate,
            daysRemaining: daysUntilExpiration,
            isExpiringSoon: isExpiringSoon,
            isTestMode: isTestMode
        )
    }

    // MARK: - Test Mode Methods

    /// Check if the current user should have test Pro access
    /// Call this after user signs in
    func checkTestProAccess() {
        guard Config.enableStoreKitTesting else { return }

        // Get current user email from Supabase
        let userEmail = SupabaseManager.shared.currentUser?.email?.lowercased()

        // Check if user is in test Pro users list
        if let email = userEmail, Config.testProUserEmails.map({ $0.lowercased() }).contains(email) {
            grantTestProAccess()
            print("[SubscriptionManager] Test Pro access granted for: \(email)")
        }
    }

    /// Grant Pro access for testing (without payment)
    func grantTestProAccess() {
        guard Config.enableStoreKitTesting else {
            print("[SubscriptionManager] Test mode is disabled in Config")
            return
        }

        isProUser = true
        isTestMode = true
        subscriptionState = .active
        currentSubscriptionType = .monthly
        purchasedProductIDs.insert("\(ProductID.monthly).test")

        // Persist test mode
        UserDefaults.standard.set(true, forKey: "testProAccess")

        print("[SubscriptionManager] Test Pro access GRANTED - isProUser: \(isProUser)")
    }

    /// Revoke test Pro access
    func revokeTestProAccess() {
        isTestMode = false
        purchasedProductIDs.remove("\(ProductID.monthly).test")
        UserDefaults.standard.set(false, forKey: "testProAccess")

        // Re-check actual subscription status (fire-and-forget)
        Task {
            await checkSubscriptionStatus()
        }

        print("[SubscriptionManager] Test Pro access REVOKED")
    }

    /// Check if test mode was previously granted (on app launch)
    private func checkPersistedTestAccess() {
        guard Config.enableStoreKitTesting else { return }

        if UserDefaults.standard.bool(forKey: "testProAccess") {
            isProUser = true
            isTestMode = true
            subscriptionState = .active
            currentSubscriptionType = .monthly
            purchasedProductIDs.insert("\(ProductID.monthly).test")
            print("[SubscriptionManager] Restored persisted test Pro access")
        }
    }

    // MARK: - Logout Cleanup

    /// Clear all Pro features cache on logout
    /// Call this when user signs out to ensure Pro features are reverted to free account settings
    func clearProCache() {
        // Reset subscription state
        isProUser = false
        isTestMode = false
        purchasedProductIDs.removeAll()
        subscriptionState = .none
        subscriptionExpirationDate = nil
        currentSubscriptionType = nil

        // Clear persisted data
        UserDefaults.standard.removeObject(forKey: "testProAccess")
        UserDefaults.standard.removeObject(forKey: "subscriptionStatus")
        UserDefaults.standard.removeObject(forKey: "cachedProAccess")

        print("[SubscriptionManager] Pro cache cleared on logout")
    }
}

// MARK: - Subscription Errors

enum SubscriptionError: LocalizedError {
    case failedVerification
    case invalidURL
    case invalidResponse
    case backendError(String)
    case networkUnavailable
    case networkError(Error)
    case unknownPurchaseResult
    case noPurchasesToRestore
    case appStoreConnectionFailed
    case receiptMissing
    case receiptInvalid
    case subscriptionAlreadyActive

    var errorDescription: String? {
        switch self {
        case .failedVerification:
            return "Purchase verification failed. Please contact support if you were charged."
        case .invalidURL:
            return "Configuration error. Please update the app."
        case .invalidResponse:
            return "Server response error. Please try again."
        case .backendError(let message):
            return message
        case .networkUnavailable:
            return "No internet connection. Please check your connection and try again."
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .unknownPurchaseResult:
            return "An unexpected error occurred. Please try again."
        case .noPurchasesToRestore:
            return "No previous purchases found."
        case .appStoreConnectionFailed:
            return "Failed to connect to App Store. Please try again."
        case .receiptMissing:
            return "Receipt not found. Please try making the purchase again."
        case .receiptInvalid:
            return "Receipt validation failed. Please contact support."
        case .subscriptionAlreadyActive:
            return "You already have an active subscription."
        }
    }

    var userFriendlyMessage: String {
        switch self {
        case .failedVerification:
            return "We couldn't verify your purchase. If you were charged, please contact support."
        case .invalidURL, .invalidResponse:
            return "Something went wrong. Please try again or contact support."
        case .backendError(let message):
            return message
        case .networkUnavailable:
            return "No internet connection. Please connect and try again."
        case .networkError:
            return "Network error. Please check your connection."
        case .unknownPurchaseResult:
            return "An unexpected error occurred. Please try again."
        case .noPurchasesToRestore:
            return "No previous purchases found. Start a free trial to get started!"
        case .appStoreConnectionFailed:
            return "Can't connect to App Store. Please try again."
        case .receiptMissing:
            return "Receipt not found. Please try purchasing again."
        case .receiptInvalid:
            return "Receipt is invalid. Please contact support."
        case .subscriptionAlreadyActive:
            return "You're already a Pro member!"
        }
    }
}

// MARK: - Subscription State

/// Represents the current state of a user's subscription
enum SubscriptionState: String, Codable {
    /// No subscription
    case none = "none"
    /// Active and valid subscription
    case active = "active"
    /// Subscription has expired
    case expired = "expired"
    /// In billing grace period (payment failed but still has access)
    case gracePeriod = "grace_period"
    /// Cancelled but still valid until expiration date
    case cancelledButValid = "cancelled_but_valid"
    /// Subscription is pending (awaiting approval)
    case pending = "pending"

    /// Whether this state grants Pro access
    var grantsAccess: Bool {
        switch self {
        case .active, .gracePeriod, .cancelledButValid:
            return true
        case .none, .expired, .pending:
            return false
        }
    }

    /// User-friendly description of the state
    var description: String {
        switch self {
        case .none:
            return "No subscription"
        case .active:
            return "Active"
        case .expired:
            return "Expired"
        case .gracePeriod:
            return "Grace Period"
        case .cancelledButValid:
            return "Cancelled (valid until expiry)"
        case .pending:
            return "Pending"
        }
    }
}

// MARK: - Subscription Type

/// Represents the type/tier of subscription
enum SubscriptionType: String, Codable {
    case monthly = "monthly"
    case yearly = "yearly"

    /// The corresponding StoreKit product ID
    var productID: String {
        switch self {
        case .monthly:
            return SubscriptionManager.ProductID.monthly
        case .yearly:
            return SubscriptionManager.ProductID.yearly
        }
    }

    /// Create from a product ID
    init?(productID: String) {
        switch productID {
        case SubscriptionManager.ProductID.monthly:
            self = .monthly
        case SubscriptionManager.ProductID.yearly:
            self = .yearly
        default:
            return nil
        }
    }

    /// User-friendly display name
    var displayName: String {
        switch self {
        case .monthly:
            return "Monthly"
        case .yearly:
            return "Yearly"
        }
    }
}

// MARK: - Subscription Verification Request

/// Request body for subscription verification
struct SubscriptionVerifyRequest: Codable {
    let transactionId: String
    let productId: String
    let purchaseDate: Date
    let expiresDate: Date?
    let originalTransactionId: String?
    let environment: String
    let autoRenewStatus: Bool

    enum CodingKeys: String, CodingKey {
        case transactionId = "transaction_id"
        case productId = "product_id"
        case purchaseDate = "purchase_date"
        case expiresDate = "expires_date"
        case originalTransactionId = "original_transaction_id"
        case environment
        case autoRenewStatus = "autoRenewStatus"
    }
}

// MARK: - Subscription Display Info

/// Consolidated subscription information for UI display
struct SubscriptionDisplayInfo {
    let isActive: Bool
    let state: SubscriptionState
    let type: SubscriptionType?
    let expirationDate: Date?
    let formattedExpiration: String?
    let daysRemaining: Int?
    let isExpiringSoon: Bool
    let isTestMode: Bool

    /// Status message for display in UI
    var statusMessage: String {
        if isTestMode {
            return "Test Mode Active"
        }

        switch state {
        case .none:
            return "No subscription"
        case .active:
            if let days = daysRemaining, days > 0 {
                return "Active - \(days) days remaining"
            }
            return "Active"
        case .expired:
            return "Subscription expired"
        case .gracePeriod:
            return "Payment issue - please update payment method"
        case .cancelledButValid:
            if let expiration = formattedExpiration {
                return "Cancelled - expires \(expiration)"
            }
            return "Cancelled - access until expiry"
        case .pending:
            return "Subscription pending"
        }
    }

    /// Short status for compact display
    var shortStatus: String {
        if isTestMode { return "Test" }
        switch state {
        case .none: return "Free"
        case .active: return "Pro"
        case .expired: return "Expired"
        case .gracePeriod: return "Grace Period"
        case .cancelledButValid: return "Ending Soon"
        case .pending: return "Pending"
        }
    }
}
