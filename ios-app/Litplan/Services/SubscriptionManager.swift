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

    // MARK: - Private Properties

    private let productIDs = [
        "com.litplan.pro.monthly",
        "com.litplan.pro.yearly"
    ]

    private var updateListenerTask: Task<Void, Error>?

    // Backend API configuration
    private let backendURL = "https://us-central1-litplan-ai.cloudfunctions.net/api"

    // MARK: - Initialization

    private init() {
        // Start listening for transaction updates in a detached task
        updateListenerTask = listenForTransactions()

        // Load products and check subscription status on init
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

    /// Load available subscription products from App Store
    func loadProducts() async {
        isLoading = true
        errorMessage = nil

        do {
            // Fetch products from App Store using StoreKit 2
            let products = try await Product.products(for: productIDs)

            // Sort products by price (ascending)
            self.availableProducts = products.sorted { $0.price < $1.price }

            print("Successfully loaded \(products.count) products")
        } catch {
            print("Failed to load products: \(error.localizedDescription)")
            errorMessage = "Failed to load subscription options. Please try again."
        }

        isLoading = false
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

    /// Check current subscription status from App Store
    func checkSubscriptionStatus() async {
        var activeProductIDs: Set<String> = []

        // Check all current entitlements
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)

                // Check if transaction is for one of our products
                if productIDs.contains(transaction.productID) {
                    activeProductIDs.insert(transaction.productID)
                }
            } catch {
                print("Failed to verify transaction: \(error.localizedDescription)")
            }
        }

        // Update state
        self.purchasedProductIDs = activeProductIDs
        self.isProUser = !activeProductIDs.isEmpty

        print("Subscription status - isProUser: \(isProUser), active products: \(activeProductIDs)")
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

    /// Validate transaction with backend server
    /// - Parameter transaction: The transaction to validate
    private func validateWithBackend(transaction: Transaction) async throws {
        // Get the auth token (in production, this would come from Firebase Auth)
        guard let authToken = getAuthToken() else {
            print("Warning: No auth token available, skipping backend validation")
            return
        }

        // Prepare receipt data (for StoreKit 2, we send transaction details)
        let receiptData = try await getReceiptData(for: transaction)

        // Prepare request body
        let requestBody: [String: Any] = [
            "transactionId": String(transaction.id),
            "productId": transaction.productID,
            "receiptData": receiptData
        ]

        // Create request
        guard let url = URL(string: "\(backendURL)/subscription/validate") else {
            throw SubscriptionError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        // Send request
        let (data, response) = try await URLSession.shared.data(for: request)

        // Check response status
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SubscriptionError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            // Parse error message from response
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errorMsg = errorJson["error"] as? String {
                throw SubscriptionError.backendError(errorMsg)
            }
            throw SubscriptionError.backendError("Validation failed with status \(httpResponse.statusCode)")
        }

        // Parse success response
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let success = json["success"] as? Bool,
              success else {
            throw SubscriptionError.invalidResponse
        }

        print("Backend validation successful for transaction \(transaction.id)")
    }

    /// Get receipt data for backend validation
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

    /// Get authentication token (placeholder - integrate with Firebase Auth)
    /// - Returns: The auth token if available
    private func getAuthToken() -> String? {
        // TODO: Integrate with Firebase Auth to get actual token
        // For now, return nil (backend validation will be skipped in development)

        // In production, this would be:
        // return Auth.auth().currentUser?.getIDToken()

        return nil
    }

    // MARK: - Transaction Listener

    /// Listen for transaction updates (auto-renewals, etc.)
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
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

                    // Update subscription status on main actor
                    await MainActor.run {
                        Task {
                            await self.updateSubscriptionStatus()
                        }
                    }

                    // Finish the transaction
                    await transaction.finish()
                } catch {
                    print("Transaction verification failed: \(error.localizedDescription)")
                }
            }
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
        return getProduct(for: "com.litplan.pro.monthly")
    }

    /// Get yearly product
    var yearlyProduct: Product? {
        return getProduct(for: "com.litplan.pro.yearly")
    }

    /// Check if a specific product is purchased
    /// - Parameter productID: The product identifier
    /// - Returns: True if the product is currently active
    func isPurchased(_ productID: String) -> Bool {
        return purchasedProductIDs.contains(productID)
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
