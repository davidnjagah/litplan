//
//  SubscriptionManager.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/30/25.
//  StoreKit 2 integration for subscription management - Sprint 3, Day 12
//

import Foundation
import StoreKit

/// Cached subscription state for optimistic UI rendering
/// Views should read this cached state instead of calling validation on every onAppear
enum SubscriptionCacheState: String, Codable {
    case unknown    // Initial state, still validating
    case active     // Has active Pro subscription
    case expired    // Subscription expired
    case free       // No subscription (free user)

    var isProUser: Bool {
        return self == .active
    }
}

/// Manages subscription purchases, restoration, and status using StoreKit 2
///
/// Architecture:
/// - Views read the cached `isProUser` state and react (do NOT call validation on every onAppear)
/// - SubscriptionManager refreshes at key events: app launch, app foreground, after purchase/restore
/// - If state == unknown, views show optimistically while refresh happens asynchronously
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

    /// Cached subscription state - views should observe this for UI decisions
    @Published var cacheState: SubscriptionCacheState = .unknown

    // MARK: - Subscription State

    @Published var subscriptionState: SubscriptionState = .none
    @Published var currentSubscriptionType: SubscriptionType?
    @Published var subscriptionExpirationDate: Date?

    // MARK: - Cache Keys

    private let cacheStateKey = "subscriptionCacheState"
    private let cacheTimestampKey = "subscriptionCacheTimestamp"
    private let cacheValidityDuration: TimeInterval = 3600  // 1 hour

    // MARK: - Private Properties

    /// StoreKit 2 product identifiers
    /// These must match the product IDs configured in App Store Connect and StoreKit Configuration
    private let productIDs = [
        "com.litplan.pro.monthly.v2",
        "com.litplan.pro.yearly.v2"
    ]

    /// Product ID constants for easy reference
    enum ProductID {
        static let monthly = "com.litplan.pro.monthly.v2"
        static let yearly = "com.litplan.pro.yearly.v2"
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

        // Load cached state first for optimistic UI
        loadCachedState()

        // Check for persisted test access
        checkPersistedTestAccess()

        // Check for persisted manual Pro access (demo accounts)
        checkPersistedManualAccess()

        // Set up app lifecycle observers for automatic refresh
        setupLifecycleObservers()

        // Re-evaluate Pro on every Supabase auth state change (works for all login
        // methods — Apple, Google, email). Closes the per-device Pro leak between
        // app accounts on the same Apple ID.
        observeAuthChanges()

        // Load products and check subscription status on init (fire-and-forget)
        // Use Task with @MainActor to ensure proper actor context
        Task { @MainActor [weak self] in
            guard let self = self else { return }
            await self.loadProducts()
            await self.refreshSubscriptionState()
        }
    }

    // MARK: - Lifecycle Observers

    /// Set up observers for app lifecycle events to refresh subscription at key moments
    private func setupLifecycleObservers() {
        // Refresh when app comes to foreground
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                await self?.refreshSubscriptionStateIfNeeded()
            }
        }

        // Refresh when app becomes active (after unlock, etc.)
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                await self?.refreshSubscriptionStateIfNeeded()
            }
        }
    }

    // MARK: - Cache Management

    /// Load cached subscription state for optimistic UI rendering
    private func loadCachedState() {
        if let cachedStateString = UserDefaults.standard.string(forKey: cacheStateKey),
           let cachedState = SubscriptionCacheState(rawValue: cachedStateString) {
            self.cacheState = cachedState
            self.isProUser = cachedState.isProUser

            if Config.enableDebugLogging {
                print("[SubscriptionManager] Loaded cached state: \(cachedState)")
            }
        }
    }

    /// Save subscription state to cache
    private func saveCacheState(_ state: SubscriptionCacheState) {
        self.cacheState = state
        UserDefaults.standard.set(state.rawValue, forKey: cacheStateKey)
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: cacheTimestampKey)

        if Config.enableDebugLogging {
            print("[SubscriptionManager] Saved cache state: \(state)")
        }
    }

    /// Check if cache is still valid (within validity duration)
    private var isCacheValid: Bool {
        let timestamp = UserDefaults.standard.double(forKey: cacheTimestampKey)
        guard timestamp > 0 else { return false }
        let elapsed = Date().timeIntervalSince1970 - timestamp
        return elapsed < cacheValidityDuration
    }

    // MARK: - Centralized Refresh

    /// Refresh subscription state - called at key events (launch, foreground, purchase, restore)
    /// Views should NOT call this on every onAppear - they should read cached isProUser instead
    func refreshSubscriptionState() async {
        if Config.enableDebugLogging {
            print("[SubscriptionManager] refreshSubscriptionState() - full refresh")
        }

        // Check entitlements and update state
        await checkSubscriptionStatus()

        // Durable Pro fallback: if StoreKit shows no active entitlement (cache lapsed,
        // sandbox expiry, entitlement not yet loaded on a fresh launch), trust the
        // server's Subscription record until it actually expires. StoreKit remains the
        // primary path; we only ever UPGRADE to Pro here, never revoke.
        if !isProUser && !isTestMode {
            await reconcileWithBackendStatus()
        }

        // Update cache based on subscription state
        let newCacheState: SubscriptionCacheState
        if isTestMode {
            newCacheState = .active
        } else if subscriptionState.grantsAccess {
            newCacheState = .active
        } else if subscriptionState == .expired {
            newCacheState = .expired
        } else {
            newCacheState = .free
        }

        saveCacheState(newCacheState)
        self.isProUser = newCacheState.isProUser
    }

    /// Consult the backend Subscription record as a durable fallback when StoreKit
    /// reports no active entitlement. Only grants Pro (never revokes) so a stale or
    /// unreachable backend can't strip access a paying user actually has.
    private func reconcileWithBackendStatus() async {
        // The auth token may not be ready immediately after `.signedIn` — wait briefly
        // and retry once. Without this, reEvaluateForCurrentUser could skip the server
        // check entirely and incorrectly deny Pro to a user the server says is active.
        var token = await getAuthTokenAsync()
        if token == nil {
            try? await Task.sleep(nanoseconds: 250_000_000)
            token = await getAuthTokenAsync()
        }
        guard token != nil else {
            print("[SubscriptionManager] reconcile: no auth token after retry — skipping backend check")
            return
        }

        do {
            let status = try await APIService.shared.getSubscriptionStatus()
            let notExpired = status.expiresAt.map { $0 > Date() } ?? true
            if !status.hasActiveSubscription || !notExpired {
                print("[SubscriptionManager] reconcile: backend says NOT active (isActive=\(status.hasActiveSubscription), expires=\(status.expiresAt?.description ?? "nil"))")
                return
            }

            self.isProUser = true
            self.subscriptionState = .active
            if self.currentSubscriptionType == nil {
                self.currentSubscriptionType = .monthly
            }
            if let expires = status.expiresAt {
                self.subscriptionExpirationDate = expires
            }
            // Reflect restored Pro in the token balance.
            await BoltTokenManager.shared.loadTokensAsync()
            print("[SubscriptionManager] reconcile: Pro granted from backend (expires=\(status.expiresAt?.description ?? "n/a"))")
        } catch {
            print("[SubscriptionManager] reconcile: backend call failed (non-fatal): \(error)")
        }
    }

    /// Refresh subscription state only if cache is invalid or state is unknown
    /// This is called on app foreground to avoid unnecessary refreshes
    private func refreshSubscriptionStateIfNeeded() async {
        // Every foreground is a chance to retry a subscription sync that failed earlier.
        await flushPendingVerify()

        // Always refresh if state is unknown
        if cacheState == .unknown {
            await refreshSubscriptionState()
            return
        }

        // Only refresh if cache is expired
        if !isCacheValid {
            if Config.enableDebugLogging {
                print("[SubscriptionManager] Cache expired, refreshing subscription state")
            }
            await refreshSubscriptionState()
        } else if Config.enableDebugLogging {
            print("[SubscriptionManager] Cache still valid, skipping refresh")
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

            // Capture pre-purchase state to detect free → Pro transition
            let wasProBeforePurchase = isProUser

            // Determine up front whether this purchase begins a free trial, so the
            // TikTok conversion fired below distinguishes StartTrial from Subscribe.
            // Eligibility must be checked before the purchase, as it flips after.
            var willStartTrial = false
            if let sub = product.subscription,
               sub.introductoryOffer?.paymentMode == .freeTrial {
                willStartTrial = await sub.isEligibleForIntroOffer
            }

            // Attach the Supabase user id as appAccountToken. Apple echoes it back in
            // the transaction AND in App Store Server Notifications, letting the webhook
            // map server-side subscription events directly to this user.
            var purchaseOptions: Set<Product.PurchaseOption> = []
            if let uidString = SupabaseManager.shared.currentUser?.id,
               let userUUID = UUID(uuidString: uidString) {
                purchaseOptions.insert(.appAccountToken(userUUID))
            }

            // Initiate purchase
            let result = try await product.purchase(options: purchaseOptions)

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

                // Update local state and cache first so user gets immediate access
                await refreshSubscriptionState()

                // If this is a free → Pro upgrade, restore full tokens with a fresh weekly cycle
                if isProUser && !wasProBeforePurchase {
                    BoltTokenManager.shared.handleUpgradeToProSubscription()
                }

                // Report the conversion to TikTok for ad attribution/optimization.
                TikTokTrackingManager.trackSubscription(
                    productId: product.id,
                    price: product.price,
                    currency: product.priceFormatStyle.currencyCode,
                    isTrial: willStartTrial
                )

                // Validate with backend (non-blocking - don't fail the purchase if backend is unavailable)
                do {
                    try await validateWithBackend(transaction: transaction)
                } catch {
                    // Log but don't block the purchase - user already paid
                    print("[SubscriptionManager] Backend validation failed (non-blocking): \(error)")
                    // The local StoreKit state is the source of truth
                    // Backend will be synced on next app launch or restore
                }

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
                errorMessage = "We couldn't reach the App Store right now. Please check your connection and try again."
                throw SubscriptionError.appStoreConnectionFailed
            }

            // Update subscription status and cache
            await refreshSubscriptionState()

            // Reload tokens to reflect restored Pro status
            if isProUser {
                await BoltTokenManager.shared.loadTokensAsync()
            }

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
                errorMessage = "No active subscription found for this Apple ID. If you subscribed with a different account, try signing in with that one."
                throw SubscriptionError.noPurchasesToRestore
            }
        } catch {
            isLoading = false
            errorMessage = "We couldn't reach the App Store right now. Please check your connection and try again."
            print("[SubscriptionManager] Restore error: \(error.localizedDescription)")
            throw error
        }
    }

    // MARK: - Auth-bound Pro evaluation
    //
    // The leak we're closing: StoreKit entitlements are tied to the device's Apple ID,
    // not the app's auth user. Without the filter below, signing out of app account A
    // and into account B on the same device would inherit A's Pro because StoreKit
    // still reports the Apple-ID-bound entitlement. The filter binds entitlements to
    // the current app user via `appAccountToken` (set at purchase since v2.2 = the
    // Supabase user UUID). The auth observer makes this re-evaluate on every sign-in
    // / sign-out for ALL login methods (Apple, Google, Email) — Supabase normalises
    // them into a single `.signedIn` / `.signedOut` event.

    /// True if this StoreKit transaction belongs to the user currently signed in to
    /// our app. v2.2+ purchases carry `appAccountToken` = the Supabase user UUID;
    /// legacy v2.1 purchases (no token) are accepted to avoid revoking Pro from
    /// existing buyers — that's a one-time pre-v2.2 exposure that auto-heals once
    /// the user next renews or taps Restore Purchases on v2.2.
    /// Returns **false when nobody is signed in to the app** — this is what prevents
    /// the Pro state from leaking between sign-out and the next sign-in.
    private func transactionBelongsToCurrentAppUser(_ transaction: Transaction) -> Bool {
        // Read directly from the Supabase client (not SupabaseManager.shared.currentUser)
        // to avoid a race: both this manager and SupabaseManager subscribe to the same
        // auth stream, and SupabaseManager's mapped `currentUser` may not be updated yet
        // when this fn runs. `client.auth.currentUser` is the underlying source and is
        // synchronously up-to-date upon `.signedIn`.
        guard let user = SupabaseManager.shared.client?.auth.currentUser else {
            return false // no app user → never grant Pro from StoreKit
        }
        if let txnToken = transaction.appAccountToken {
            return txnToken == user.id
        }
        return true // legacy v2.1 purchase — honour
    }

    /// Re-evaluate Pro every time the Supabase auth state changes. Catches every
    /// login method (Apple ID token, Google ID token, email/password, email signup)
    /// because Supabase emits the same `.signedIn` event for all of them.
    private func observeAuthChanges() {
        Task { @MainActor [weak self] in
            guard let self = self, let client = SupabaseManager.shared.client else { return }
            for await (event, _) in client.auth.authStateChanges {
                switch event {
                case .signedOut:
                    self.resetForSignedOutUser()
                case .signedIn, .userUpdated:
                    await self.reEvaluateForCurrentUser()
                default:
                    break
                }
            }
        }
    }

    /// Comprehensive reset of Pro state — both in-memory AND persisted UserDefaults.
    /// Does NOT re-read StoreKit (the appAccountToken filter would also reject without
    /// a current user, but resetting first keeps state coherent immediately).
    ///
    /// Persisted clears matter because `.signedOut` can fire without going through
    /// `AuthenticationManager.signOut()` — e.g. when a refresh token fails or a session
    /// is revoked server-side. In those cases the explicit `clearProCache()` in signOut
    /// wouldn't run, so this listener path is the safety net.
    private func resetForSignedOutUser() {
        isProUser = false
        isTestMode = false
        purchasedProductIDs.removeAll()
        subscriptionState = .none
        subscriptionExpirationDate = nil
        currentSubscriptionType = nil
        cacheState = .free

        // Persisted Pro keys — wipe so a leak can't survive a session-expiry sign-out.
        UserDefaults.standard.removeObject(forKey: "testProAccess")
        UserDefaults.standard.removeObject(forKey: "manualProAccess")
        UserDefaults.standard.removeObject(forKey: "subscriptionStatus")
        UserDefaults.standard.removeObject(forKey: "cachedProAccess")
        UserDefaults.standard.removeObject(forKey: cacheStateKey)
        UserDefaults.standard.removeObject(forKey: cacheTimestampKey)

        saveCacheState(.free)
    }

    /// Re-evaluate Pro for the user who just signed in. Starts from "no Pro" so a
    /// previous user's state can't leak forward.
    ///
    /// Order of grants — SERVER-FIRST, StoreKit as fallback:
    /// 1. `app_metadata.is_pro` (admin-granted comp accounts)
    /// 2. Test allowlist (debug builds only)
    /// 3. Server `Subscription` table (the source of truth for paid Pro)
    /// 4. StoreKit entitlements (fallback; appAccountToken-filtered)
    ///
    /// Why server first: StoreKit entitlements are Apple-ID-bound and can be missing
    /// at the wrong moment (sandbox sub expired, simulator session lost the receipt,
    /// purchase happened on a different appAccountToken). The server `Subscription`
    /// row is per app account and authoritative for paying users.
    ///
    /// Reads `client.auth.currentUser` directly (not the SupabaseManager wrapper) to
    /// avoid races with the parallel auth listener.
    private func reEvaluateForCurrentUser() async {
        resetForSignedOutUser()

        guard let user = SupabaseManager.shared.client?.auth.currentUser else {
            print("[SubscriptionManager] reEvaluate: no signed-in user → not Pro")
            saveCacheState(.free)
            return
        }
        let userIdShort = user.id.uuidString.lowercased().prefix(8)
        print("[SubscriptionManager] reEvaluate for user \(userIdShort)…")

        // 1. Manual Pro via app_metadata.is_pro (admin-granted comp accounts)
        if user.appMetadata["is_pro"]?.boolValue == true {
            print("[SubscriptionManager] → manual Pro from app_metadata.is_pro=true")
            grantManualProAccess()
            saveCacheState(.active)
            return
        }

        // 2. Test Pro grant by email allowlist (debug builds only)
        if Config.enableStoreKitTesting,
           let email = user.email?.lowercased(),
           Config.testProUserEmails.map({ $0.lowercased() }).contains(email) {
            print("[SubscriptionManager] → test Pro for allowlisted email")
            grantTestProAccess()
            saveCacheState(.active)
            return
        }

        // 3. Server Subscription record — source of truth for paid Pro.
        await reconcileWithBackendStatus()
        if isProUser {
            print("[SubscriptionManager] → Pro granted from backend Subscription record")
            saveCacheState(.active)
            return
        }

        // 4. StoreKit fallback (filtered by appAccountToken)
        await checkSubscriptionStatus()
        if isProUser {
            print("[SubscriptionManager] → Pro granted from StoreKit entitlement (appAccountToken match or legacy)")
        } else {
            print("[SubscriptionManager] → NOT Pro (no app_metadata, no server row, no StoreKit match)")
        }
        saveCacheState(isProUser ? .active : .free)
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

        // Check all current entitlements from StoreKit 2. Filter to only those that
        // belong to the currently signed-in app user — this prevents Apple-ID-bound
        // entitlements from leaking Pro between app accounts on a shared device.
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)

                // Check if transaction is for one of our products AND belongs to this app user
                if productIDs.contains(transaction.productID) && transactionBelongsToCurrentAppUser(transaction) {
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

        // Check all current entitlements. Same app-user filter as refreshProStatus — only
        // count entitlements whose appAccountToken matches the current Supabase user (or
        // legacy v2.1 transactions without a token). Prevents Apple-ID leakage across accounts.
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)

                // Check if transaction is for one of our products AND belongs to this app user
                if productIDs.contains(transaction.productID) && transactionBelongsToCurrentAppUser(transaction) {
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

        // Retry any subscription sync that failed previously (e.g. backend down at purchase time).
        await flushPendingVerify()

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
        // Determine environment
        let environment = transaction.environment == .sandbox ? "sandbox" : "production"

        // Detect introductory (free-trial) offer so the backend records TRIAL vs PRO.
        let isTrial: Bool = {
            if #available(iOS 17.2, *) {
                return transaction.offer?.type == .introductory
            } else {
                return transaction.offerType == .introductory
            }
        }()

        // Prepare request body with transaction details
        // Auto-renewable subscriptions always auto-renew by default
        let requestBody = SubscriptionVerifyRequest(
            transactionId: String(transaction.id),
            productId: transaction.productID,
            purchaseDate: transaction.purchaseDate,
            expiresDate: transaction.expirationDate,
            originalTransactionId: String(transaction.originalID),
            environment: environment,
            autoRenewStatus: true,
            isTrial: isTrial
        )

        // We need an authenticated Supabase session to attribute the subscription
        // to a user. If we can't sync now, persist the request and retry on next
        // launch/foreground — never silently drop it (this was the original bug).
        guard await getAuthTokenAsync() != nil else {
            print("[SubscriptionManager] No auth token yet — queueing subscription sync for retry")
            enqueuePendingVerify(requestBody)
            return
        }

        do {
            let response = try await APIService.shared.verifySubscription(requestBody)
            guard response.success, let data = response.data else {
                let message = response.error?.message ?? "Verification failed"
                throw SubscriptionError.backendError(message)
            }

            // Success — clear any queued retry and reconcile local state.
            clearPendingVerify()
            if let subscription = data.subscription {
                if let backendState = SubscriptionState(rawValue: subscription.status.lowercased()) {
                    self.subscriptionState = backendState
                    self.isProUser = backendState.grantsAccess
                }
                if let expiresDate = subscription.expiresDate {
                    self.subscriptionExpirationDate = expiresDate
                }
            }
            print("[SubscriptionManager] ✅ Backend sync successful for transaction \(transaction.id) (trial: \(isTrial))")
        } catch {
            // Persist for retry so a transient/backend failure can't lose the record.
            print("[SubscriptionManager] ❌ Backend sync FAILED for transaction \(transaction.id): \(error) — queued for retry")
            enqueuePendingVerify(requestBody)
            throw error
        }
    }

    // MARK: - Pending Subscription Sync (retry queue)

    private let pendingVerifyKey = "pendingSubscriptionVerify"

    /// Persist a verify request that failed to sync, so it can be retried later.
    private func enqueuePendingVerify(_ req: SubscriptionVerifyRequest) {
        if let data = try? JSONEncoder().encode(req) {
            UserDefaults.standard.set(data, forKey: pendingVerifyKey)
        }
    }

    private func clearPendingVerify() {
        UserDefaults.standard.removeObject(forKey: pendingVerifyKey)
    }

    /// Retry a previously-failed subscription sync. Called on launch and foreground.
    /// No-op when there's nothing queued or no auth session yet.
    func flushPendingVerify() async {
        guard let data = UserDefaults.standard.data(forKey: pendingVerifyKey),
              let req = try? JSONDecoder().decode(SubscriptionVerifyRequest.self, from: data) else {
            return
        }
        guard await getAuthTokenAsync() != nil else { return }

        do {
            let response = try await APIService.shared.verifySubscription(req)
            if response.success {
                clearPendingVerify()
                print("[SubscriptionManager] ✅ Flushed pending subscription sync for \(req.transactionId)")
            } else {
                print("[SubscriptionManager] Pending subscription sync still failing: \(response.error?.message ?? "unknown")")
            }
        } catch {
            print("[SubscriptionManager] Pending subscription sync retry failed: \(error)")
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
        // Update subscription status and cache
        await refreshSubscriptionState()

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

    // MARK: - Manual Pro Access (Demo Accounts)

    /// Check if the current user has manual Pro access granted via app_metadata
    /// This is used for demo accounts and special users granted Pro without payment
    /// Call this after user signs in
    func checkManualProAccess() {
        guard let user = SupabaseManager.shared.currentUser else { return }

        // Check app_metadata for is_pro flag (set via Supabase admin)
        if let appMetadata = user.appMetadata,
           let isProString = appMetadata["is_pro"],
           isProString == "true" {
            grantManualProAccess()
            print("[SubscriptionManager] Manual Pro access granted for: \(user.email ?? "unknown")")
            return
        }
    }

    /// Grant manual Pro access (for demo/special accounts)
    private func grantManualProAccess() {
        isProUser = true
        isTestMode = true  // Reuse test mode flag to indicate non-StoreKit Pro
        subscriptionState = .active
        currentSubscriptionType = .monthly

        // Persist access
        UserDefaults.standard.set(true, forKey: "manualProAccess")

        print("[SubscriptionManager] Manual Pro access GRANTED - isProUser: \(isProUser)")
    }

    /// Check for persisted manual Pro access on app launch
    private func checkPersistedManualAccess() {
        if UserDefaults.standard.bool(forKey: "manualProAccess") {
            // Re-verify with server on next sign-in, but grant access for now
            isProUser = true
            isTestMode = true
            subscriptionState = .active
            currentSubscriptionType = .monthly
            print("[SubscriptionManager] Restored persisted manual Pro access")
        }
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
        cacheState = .unknown

        // Clear persisted data
        UserDefaults.standard.removeObject(forKey: "testProAccess")
        UserDefaults.standard.removeObject(forKey: "manualProAccess")
        UserDefaults.standard.removeObject(forKey: "subscriptionStatus")
        UserDefaults.standard.removeObject(forKey: "cachedProAccess")
        UserDefaults.standard.removeObject(forKey: cacheStateKey)
        UserDefaults.standard.removeObject(forKey: cacheTimestampKey)

        print("[SubscriptionManager] Pro cache cleared on logout")
        // NOTE: deliberately do NOT re-read StoreKit here. The device's Apple-ID-bound
        // entitlement would re-grant Pro and leak to whoever signs in next on this
        // device. The `observeAuthChanges()` flow owns post-logout / post-login Pro
        // state now (`.signedOut` → resetForSignedOutUser; `.signedIn` →
        // reEvaluateForCurrentUser, which applies the appAccountToken filter).
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
            return "No active subscription found for this Apple ID. If you subscribed with a different account, try signing in with that one."
        case .appStoreConnectionFailed:
            return "We couldn't reach the App Store right now. Please check your connection and try again."
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
    /// True when this transaction is in an introductory (free-trial) offer period.
    let isTrial: Bool

    enum CodingKeys: String, CodingKey {
        case transactionId = "transaction_id"
        case productId = "product_id"
        case purchaseDate = "purchase_date"
        case expiresDate = "expires_date"
        case originalTransactionId = "original_transaction_id"
        case environment
        case autoRenewStatus = "autoRenewStatus"
        case isTrial = "is_trial"
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
