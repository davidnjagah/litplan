//
//  APIService.swift
//  Litplan
//
//  Created for Sprint 6 - Supabase Integration
//  HTTP client for backend API with authentication
//

import Foundation

/// API errors
enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case serverError(Int, String?)
    case decodingError(Error)
    case unauthorized
    case notFound
    case rateLimited
    case thinCoverage(String)
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message ?? "Unknown error")"
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        case .unauthorized:
            return "Unauthorized. Please sign in again."
        case .notFound:
            return "Resource not found"
        case .rateLimited:
            return "Too many requests. Please try again later."
        case .thinCoverage(let message):
            return message
        case .unknown(let message):
            return message
        }
    }
}

/// HTTP methods
enum HTTPMethod: String {
    case GET
    case POST
    case PUT
    case PATCH
    case DELETE
}

/// API service for backend communication
@MainActor
class APIService: ObservableObject {

    // MARK: - Singleton

    static let shared = APIService()

    // Date parsers used by the lenient JSON decoder below.
    //
    // Marked `nonisolated(unsafe)` so the `@Sendable` custom-decoder closure can
    // capture them under Swift 6 strict concurrency. Both formatter types are
    // documented as thread-safe for reads since iOS 7+ (`ISO8601DateFormatter`
    // is explicitly thread-safe; `DateFormatter` is thread-safe once configured),
    // so reading these immutable instances from any actor is safe.
    nonisolated(unsafe) fileprivate static let isoWithFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    nonisolated(unsafe) fileprivate static let isoBasic: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
    /// Parses "yyyy-MM-dd'T'HH:mm:ss" (no timezone — Postgres `timestamp without time
    /// zone` over JSON). Forced to UTC so the value matches what the column holds.
    /// `DateFormatter` is Sendable on iOS 26.2+, but the property still needs
    /// `nonisolated` so the `@Sendable` decoder closure can capture it.
    nonisolated fileprivate static let naiveUTC: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    // MARK: - Published Properties

    @Published var isLoading: Bool = false

    // MARK: - Private Properties

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    // MARK: - Initialization

    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = Config.apiTimeout
        configuration.timeoutIntervalForResource = Config.apiTimeout * 2

        self.session = URLSession(configuration: configuration)

        self.decoder = JSONDecoder()
        // Lenient ISO8601 date decoder — accepts dates with fractional seconds, plain
        // ISO with Z, and "naive" timestamps with no timezone (interpreted as UTC).
        // The last is what Postgres `timestamp without time zone` produces when an
        // edge fn returns the raw column value (e.g. "2026-05-26T10:39:32"). Without
        // this fallback, those responses silently fail to decode and downstream logic
        // (Pro reconcile, etc.) treats the call as having errored.
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            if let d = APIService.isoWithFractional.date(from: raw) { return d }
            if let d = APIService.isoBasic.date(from: raw) { return d }
            if let d = APIService.naiveUTC.date(from: raw) { return d }
            // Last-ditch: try appending Z if the string just lacks the designator
            if let d = APIService.isoBasic.date(from: raw + "Z") { return d }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Could not parse date '\(raw)' as ISO8601 or naive UTC"
            )
        }
        // Note: Backend sends camelCase keys (venueName, cityName, etc.)
        // so we don't use .convertFromSnakeCase - keys match Swift properties directly

        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
        // Note: Backend expects camelCase keys, so we don't convert to snake_case
    }

    // MARK: - Generic Request

    /// Make an authenticated API request
    /// - Parameters:
    ///   - endpoint: The API endpoint URL string
    ///   - method: HTTP method
    ///   - body: Optional request body (Encodable)
    ///   - requiresAuth: Whether to include auth header
    ///   - retryWithAnonKey: Internal flag to retry with anon key on 401
    /// - Returns: Decoded response
    func request<T: Decodable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: (any Encodable)? = nil,
        requiresAuth: Bool = false,
        retryWithAnonKey: Bool = false
    ) async throws -> T {
        guard let url = URL(string: endpoint) else {
            throw APIError.invalidURL
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method.rawValue
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")
        urlRequest.setValue(Config.appVersion, forHTTPHeaderField: "X-App-Version")
        urlRequest.setValue("iOS", forHTTPHeaderField: "X-Platform")

        // Always include Supabase API key for edge functions
        urlRequest.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")

        // Add auth header - use user token if available, otherwise use anon key
        // Some edge functions (like group-flows) require Authorization header even for public access
        if requiresAuth {
            if let token = await SupabaseManager.shared.getAccessToken() {
                urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else if AuthenticationManager.shared.isGuest {
                // Guest mode - some endpoints may allow limited access
                urlRequest.setValue("guest", forHTTPHeaderField: "X-Auth-Mode")
                // Also set Authorization with anon key for edge functions that require it
                urlRequest.setValue("Bearer \(Config.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
            } else {
                throw APIError.unauthorized
            }
        } else {
            // For non-auth endpoints, still send Authorization header
            // Use anon key if retrying or if no user token available
            if retryWithAnonKey {
                if Config.enableDebugLogging {
                    print("[APIService] Retrying with anon key after 401")
                }
                urlRequest.setValue("Bearer \(Config.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
            } else if let token = await SupabaseManager.shared.getAccessToken() {
                if Config.enableDebugLogging {
                    print("[APIService] Using user token for non-auth endpoint (token length: \(token.count))")
                }
                urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else {
                if Config.enableDebugLogging {
                    print("[APIService] Using anon key for non-auth endpoint (no user token available)")
                }
                urlRequest.setValue("Bearer \(Config.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
            }
        }

        // Add body if present
        if let body = body {
            urlRequest.httpBody = try encoder.encode(body)
        }

        if Config.enableDebugLogging {
            print("[APIService] \(method.rawValue) \(endpoint)")
        }

        do {
            let (data, response) = try await session.data(for: urlRequest)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown("Invalid response type")
            }

            if Config.enableDebugLogging {
                print("[APIService] Response status: \(httpResponse.statusCode)")
            }

            // Handle different status codes
            switch httpResponse.statusCode {
            case 200...299:
                // Success
                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    if Config.enableDebugLogging {
                        print("[APIService] Decoding error: \(error)")
                        if let json = String(data: data, encoding: .utf8) {
                            print("[APIService] Raw response: \(json)")
                        }
                    }
                    throw APIError.decodingError(error)
                }

            case 401:
                // For non-auth endpoints, retry with anon key if user token failed
                // This handles expired/invalid user tokens gracefully
                if !requiresAuth && !retryWithAnonKey {
                    if Config.enableDebugLogging {
                        print("[APIService] Got 401 on non-auth endpoint, retrying with anon key")
                    }
                    return try await self.request(
                        endpoint: endpoint,
                        method: method,
                        body: body,
                        requiresAuth: false,
                        retryWithAnonKey: true
                    )
                }
                throw APIError.unauthorized

            case 404:
                throw APIError.notFound

            case 429:
                throw APIError.rateLimited

            default:
                // Try to parse error message from response
                let errorMessage = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                let message = errorMessage?["error"] as? String ?? errorMessage?["message"] as? String
                throw APIError.serverError(httpResponse.statusCode, message)
            }

        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    /// Make a request without expecting a response body
    func requestVoid(
        endpoint: String,
        method: HTTPMethod = .POST,
        body: (any Encodable)? = nil,
        requiresAuth: Bool = false
    ) async throws {
        guard let url = URL(string: endpoint) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Config.appVersion, forHTTPHeaderField: "X-App-Version")
        request.setValue("iOS", forHTTPHeaderField: "X-Platform")

        if requiresAuth {
            if let token = await SupabaseManager.shared.getAccessToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else {
                throw APIError.unauthorized
            }
        }

        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        let (_, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown("Invalid response type")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode, nil)
        }
    }

    // MARK: - Cities API

    /// Fetch all cities
    func fetchCities() async throws -> [City] {
        let response: CitiesResponse = try await request(
            endpoint: Config.Endpoints.cities,
            method: .GET
        )
        return response.cities
    }

    /// Fetch a single city by ID
    func fetchCity(id: String) async throws -> City {
        let response: CityResponse = try await request(
            endpoint: "\(Config.Endpoints.cities)/\(id)",
            method: .GET
        )
        return response.city
    }

    /// Search cities
    func searchCities(query: String) async throws -> [City] {
        let endpoint = "\(Config.Endpoints.cities)/search?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)"
        let response: CitiesResponse = try await request(
            endpoint: endpoint,
            method: .GET
        )
        return response.cities
    }

    /// Discover a new city by searching for it using AI validation
    /// - Parameter query: The city name to search for
    /// - Returns: The discovered city if valid
    /// - Throws: APIError if the city is not found or invalid
    func discoverCity(query: String) async throws -> City {
        struct DiscoverCityRequest: Codable {
            let query: String
        }

        struct DiscoverCityResponse: Codable {
            let success: Bool
            let city: City
            let isNew: Bool
        }

        let response: DiscoverCityResponse = try await request(
            endpoint: Config.Endpoints.cityDiscover,
            method: .POST,
            body: DiscoverCityRequest(query: query),
            requiresAuth: false
        )

        return response.city
    }

    // MARK: - Plans API

    /// Fetch plans for a city (public access - no auth required)
    func fetchPlans(cityId: String) async throws -> [Plan] {
        let response: PlansResponse = try await request(
            endpoint: "\(Config.Endpoints.plans)?cityId=\(cityId)",
            method: .GET,
            requiresAuth: false  // Plans are public data
        )
        return response.plans
    }

    /// Fetch a single plan by ID (public access)
    func fetchPlan(id: String) async throws -> Plan {
        let response: PlanResponse = try await request(
            endpoint: "\(Config.Endpoints.plans)/\(id)",
            method: .GET,
            requiresAuth: false  // Plans are public data
        )
        return response.plan
    }

    // MARK: - Group Flows API

    /// Fetch group flows for a city (public access)
    func fetchGroupFlows(cityId: String) async throws -> [GroupFlow] {
        let response: GroupFlowsResponse = try await request(
            endpoint: "\(Config.Endpoints.groupFlows)?cityId=\(cityId)",
            method: .GET,
            requiresAuth: false  // Group flows are public data
        )
        return response.groupFlows
    }

    /// Generate a custom group flow using the Bolt pipeline
    /// - Parameters:
    ///   - city: City name (e.g., "Tokyo")
    ///   - country: Country name (e.g., "Japan")
    ///   - theme: Theme name from ThemeTag (e.g., "Nightlife")
    ///   - themeDefinition: Optional detailed definition of the theme
    ///   - userId: User ID for tracking
    /// - Returns: Generated GroupFlow
    func generateCustomGroupFlow(
        city: String,
        country: String,
        theme: String,
        themeDefinition: String?,
        userId: String
    ) async throws -> GroupFlow {
        if Config.useAsyncBoltPipeline {
            return try await generateCustomGroupFlowAsync(
                city: city, country: country, theme: theme,
                themeDefinition: themeDefinition, userId: userId
            )
        }
        return try await generateCustomGroupFlowSync(
            city: city, country: country, theme: theme,
            themeDefinition: themeDefinition, userId: userId
        )
    }

    /// Legacy synchronous flow — POSTs to bolt-pipeline-v2 and waits up to 180s.
    /// Kept for one-flag rollback via Config.useAsyncBoltPipeline = false.
    private func generateCustomGroupFlowSync(
        city: String,
        country: String,
        theme: String,
        themeDefinition: String?,
        userId: String
    ) async throws -> GroupFlow {
        let requestBody = BoltPipelineRequest(
            city: city, country: country, theme: theme,
            themeDefinition: themeDefinition, userId: userId
        )

        if Config.enableDebugLogging {
            print("[APIService] 🔥 Calling bolt-pipeline-v2 (sync) for \(city), theme: \(theme)")
        }

        let response: BoltPipelineResponse = try await request(
            endpoint: Config.Endpoints.boltPipeline,
            method: .POST,
            body: requestBody,
            requiresAuth: false
        )

        guard response.success, let groupFlow = response.data else {
            let errorMessage = response.error ?? "Failed to generate group flow"
            print("[APIService] 🔴 bolt-pipeline-v2 failed — errorCode: \(response.errorCode ?? "nil"), error: \(errorMessage)")
            if response.errorCode == "THIN_COVERAGE" {
                throw APIError.thinCoverage(errorMessage)
            }
            throw APIError.serverError(500, errorMessage)
        }
        return groupFlow
    }

    /// New async flow — POSTs to bolt-pipeline-v3 trigger (returns jobId in
    /// <500ms or a cached result), then polls bolt-pipeline-status every 2s
    /// until the row reaches a terminal state. Max wait 180s.
    private func generateCustomGroupFlowAsync(
        city: String,
        country: String,
        theme: String,
        themeDefinition: String?,
        userId: String
    ) async throws -> GroupFlow {
        let requestBody = BoltPipelineRequest(
            city: city, country: country, theme: theme,
            themeDefinition: themeDefinition, userId: userId
        )

        if Config.enableDebugLogging {
            print("[APIService] 🚀 Triggering bolt-pipeline-v3 (async) for \(city), theme: \(theme)")
        }

        let trigger: BoltPipelineTriggerResponse = try await request(
            endpoint: Config.Endpoints.boltPipelineTrigger,
            method: .POST,
            body: requestBody,
            requiresAuth: false
        )

        // Cache hit — pipeline result returned inline by the trigger
        if trigger.cached == true, let cached = trigger.result {
            print("[APIService] ⚡ Cache hit for \(city)/\(theme)")
            return try extractGroupFlow(from: cached)
        }

        guard let jobId = trigger.jobId else {
            throw APIError.serverError(500, "Trigger returned no jobId and no cached result")
        }

        print("[APIService] 🆔 Job started: \(jobId) — polling status...")
        return try await pollBoltPipelineJob(jobId: jobId)
    }

    /// Poll bolt-pipeline-status every 2s for up to 180s. Throws on timeout,
    /// thinCoverage, or any terminal failure. Returns the GroupFlow when the
    /// row reaches status=completed.
    private func pollBoltPipelineJob(jobId: String) async throws -> GroupFlow {
        let pollIntervalNanos: UInt64 = 2_000_000_000   // 2s
        let maxWaitSeconds = 180
        let maxAttempts = maxWaitSeconds * 1_000_000_000 / Int(pollIntervalNanos)

        for attempt in 0..<maxAttempts {
            try await Task.sleep(nanoseconds: pollIntervalNanos)

            let statusUrl = "\(Config.Endpoints.boltPipelineStatus)?jobId=\(jobId)"
            let status: BoltPipelineStatusResponse = try await request(
                endpoint: statusUrl,
                method: .GET,
                body: nil,
                requiresAuth: false
            )

            if Config.enableDebugLogging {
                print("[APIService] 🔄 Poll \(attempt + 1)/\(maxAttempts) — status: \(status.status ?? "?")")
            }

            switch status.status {
            case "completed":
                guard let result = status.result else {
                    throw APIError.serverError(500, "Job completed without a result payload")
                }
                return try extractGroupFlow(from: result)

            case "failed":
                let errorMessage = status.result?.error ?? status.error ?? "Pipeline failed"
                if status.result?.errorCode == "THIN_COVERAGE" {
                    throw APIError.thinCoverage(errorMessage)
                }
                throw APIError.serverError(500, errorMessage)

            case "not_found":
                throw APIError.notFound

            default:
                // pending, queued, processing — keep polling
                continue
            }
        }

        throw APIError.serverError(408, "Pipeline timed out after \(maxWaitSeconds) seconds")
    }

    /// Convert a BoltPipelineResponse (success branch) into a GroupFlow,
    /// throwing thinCoverage / serverError on the failure branch.
    private func extractGroupFlow(from response: BoltPipelineResponse) throws -> GroupFlow {
        guard response.success, let groupFlow = response.data else {
            let errorMessage = response.error ?? "Pipeline returned no GroupFlow"
            if response.errorCode == "THIN_COVERAGE" {
                throw APIError.thinCoverage(errorMessage)
            }
            throw APIError.serverError(500, errorMessage)
        }
        return groupFlow
    }

    /// Fetch group flows with fallback to local cache
    /// Priority: 1. API (online) -> cache response, 2. Local cache (offline/error)
    func fetchGroupFlowsWithFallback(cityId: String) async -> [GroupFlow] {
        print("[APIService] 🎯 fetchGroupFlowsWithFallback(cityId: \(cityId)) - network: \(NetworkMonitor.shared.isConnected)")

        // Try API first if online
        if NetworkMonitor.shared.isConnected {
            do {
                print("[APIService] 🌐 Calling fetchGroupFlows(cityId: \(cityId))...")
                let flows = try await fetchGroupFlows(cityId: cityId)
                print("[APIService] ✅ API returned \(flows.count) group flows for city \(cityId)")
                // Cache successful response for offline use
                CacheService.shared.cacheGroupFlows(flows, for: cityId)
                return flows
            } catch {
                print("[APIService] ❌ fetchGroupFlows failed: \(error)")
                // Fall through to cache
            }
        } else {
            print("[APIService] 📴 No network - checking cache for group flows")
        }

        // Fallback to cached data
        if let cachedFlows = CacheService.shared.getCachedGroupFlows(for: cityId) {
            print("[APIService] 💾 Using \(cachedFlows.count) cached group flows for city \(cityId)")
            return cachedFlows
        }

        // No cache available - return empty (views will show appropriate empty state)
        print("[APIService] ⚠️ No cached group flows for city \(cityId) - returning empty")
        return []
    }

    // MARK: - User API

    /// Sync current user with backend
    func syncUser() async throws {
        guard let user = SupabaseManager.shared.currentUser else {
            throw APIError.unauthorized
        }

        let syncData = UserSyncRequest(
            id: user.id,
            email: user.email,
            fullName: user.userMetadata?.fullName,
            provider: user.userMetadata?.provider
        )

        try await requestVoid(
            endpoint: Config.Endpoints.userSync,
            method: .POST,
            body: syncData,
            requiresAuth: true
        )

        if Config.enableDebugLogging {
            print("[APIService] User synced successfully")
        }
    }

    /// Fetch user profile
    func fetchUserProfile() async throws -> UserProfile {
        let response: UserProfileResponse = try await request(
            endpoint: Config.Endpoints.userProfile,
            method: .GET,
            requiresAuth: true
        )
        return response.profile
    }

    /// Update user profile
    func updateUserProfile(_ profile: UserProfileUpdate) async throws -> UserProfile {
        let response: UserProfileResponse = try await request(
            endpoint: Config.Endpoints.userProfile,
            method: .PUT,
            body: profile,
            requiresAuth: true
        )
        return response.profile
    }

    // MARK: - Apple Auth Code API

    /// Send Apple authorization code to backend for refresh token storage (TN3194)
    /// This is fire-and-forget — failures are logged but don't block sign-in
    func sendAppleAuthCode(_ authorizationCode: String) async {
        struct AppleAuthCodeRequest: Codable {
            let authorizationCode: String
        }

        do {
            let response: AppleAuthCodeResponse = try await request(
                endpoint: Config.Endpoints.appleAuthCode,
                method: .POST,
                body: AppleAuthCodeRequest(authorizationCode: authorizationCode),
                requiresAuth: true
            )

            if Config.enableDebugLogging {
                if let warning = response.warning {
                    print("[APIService] Apple auth code warning: \(warning)")
                } else {
                    print("[APIService] Apple auth code exchanged successfully")
                }
            }
        } catch {
            if Config.enableDebugLogging {
                print("[APIService] Apple auth code exchange failed (non-blocking): \(error)")
            }
        }
    }

    // MARK: - Viewed Cities API

    /// Fetch user's viewed cities with pagination
    /// - Parameters:
    ///   - limit: Maximum number of cities to fetch (default: 20)
    ///   - offset: Number of cities to skip for pagination (default: 0)
    /// - Returns: ViewedCitiesResponse containing cities, total count, and hasMore flag
    func fetchViewedCities(limit: Int = 20, offset: Int = 0) async throws -> ViewedCitiesResponse {
        let endpoint = "\(Config.Endpoints.viewedCities)?limit=\(limit)&offset=\(offset)"
        let response: ViewedCitiesResponse = try await request(
            endpoint: endpoint,
            method: .GET,
            requiresAuth: true
        )
        return response
    }

    /// Record a city view - call this when user taps on a city
    /// - Parameter cityId: The ID of the city being viewed
    /// Note: This is an analytics call that works for all users (including guests)
    func recordCityView(cityId: String) async throws {
        try await requestVoid(
            endpoint: Config.Endpoints.recordCityView(cityId: cityId),
            method: .POST,
            requiresAuth: false  // Allow guest users to record views for analytics
        )

        if Config.enableDebugLogging {
            print("[APIService] Recorded city view for: \(cityId)")
        }
    }

    // MARK: - Config API

    /// Fetch app configuration
    func fetchAppConfig() async throws -> AppConfig {
        let response: AppConfigResponse = try await request(
            endpoint: Config.Endpoints.appConfig,
            method: .GET
        )
        return response.config
    }

    // MARK: - Health Check

    /// Check API health
    func healthCheck() async -> Bool {
        do {
            let _: HealthResponse = try await request(
                endpoint: Config.Endpoints.health,
                method: .GET
            )
            return true
        } catch {
            if Config.enableDebugLogging {
                print("[APIService] Health check failed: \(error)")
            }
            return false
        }
    }

    // MARK: - Account Deletion API

    /// Delete the current user's account and all associated data
    func deleteAccount() async throws {
        let endpoint = Config.Endpoints.deleteAccount
        print("[APIService] DELETE account -> \(endpoint)")

        do {
            let response: AccountDeleteResponse = try await request(
                endpoint: endpoint,
                method: .DELETE,
                requiresAuth: true
            )
            print("[APIService] Delete account response: success=\(response.success), message=\(response.data?.message ?? "nil")")
        } catch {
            print("[APIService] Delete account FAILED: \(error)")
            print("[APIService] Error type: \(type(of: error))")
            if let apiError = error as? APIError {
                print("[APIService] APIError details: \(apiError.errorDescription ?? "unknown")")
            }
            throw error
        }
    }

    // MARK: - Subscription API

    /// Get current subscription status from the backend
    /// - Returns: SubscriptionStatusResponse with current subscription state
    func getSubscriptionStatus() async throws -> SubscriptionStatusResponse {
        // The backend returns a nested response with { success, data }
        let apiResponse: SubscriptionStatusAPIResponse = try await request(
            endpoint: Config.Endpoints.subscriptionStatus,
            method: .GET,
            requiresAuth: true
        )

        guard apiResponse.success, let data = apiResponse.data else {
            let message = apiResponse.error?.message ?? "Failed to get subscription status"
            throw APIError.serverError(500, message)
        }

        return SubscriptionStatusResponse(from: data)
    }

    /// Verify subscription with backend using StoreKit 2 transaction data
    /// - Parameter verifyRequest: SubscriptionVerifyRequest with transaction details
    /// - Returns: SubscriptionVerifyAPIResponse with verification result
    func verifySubscription(_ verifyRequest: SubscriptionVerifyRequest) async throws -> SubscriptionVerifyAPIResponse {
        let response: SubscriptionVerifyAPIResponse = try await request(
            endpoint: Config.Endpoints.subscriptionVerify,
            method: .POST,
            body: verifyRequest,
            requiresAuth: true
        )
        return response
    }
}

// MARK: - Subscription Verify Response

/// Response from POST /api/v2/subscription/verify
struct SubscriptionVerifyAPIResponse: Codable {
    let success: Bool
    let data: SubscriptionVerifyData?
    let error: APIErrorData?
}

struct SubscriptionVerifyData: Codable {
    let subscription: SubscriptionInfo?
    let entitlements: SubscriptionEntitlements?
    let isNew: Bool?
    let message: String?
}

struct SubscriptionInfo: Codable {
    let id: String
    let tier: String
    let status: String
    let productId: String?
    let purchaseDate: Date?
    let expiresDate: Date?
    let environment: String?
    let autoRenew: Bool
}

// MARK: - API Response Models

struct CitiesResponse: Codable {
    let cities: [City]
    let total: Int?
}

struct CityResponse: Codable {
    let city: City
}

struct PlansResponse: Codable {
    let plans: [Plan]
    let total: Int?
}

struct PlanResponse: Codable {
    let plan: Plan
}

struct GroupFlowsResponse: Codable {
    let groupFlows: [GroupFlow]
    let total: Int?
}

// MARK: - Bolt Pipeline Models

struct BoltPipelineRequest: Codable {
    let city: String
    let country: String
    let theme: String
    let themeDefinition: String?
    let userId: String
}

struct BoltPipelineResponse: Codable {
    let success: Bool
    let data: GroupFlow?
    let error: String?
    let errorCode: String?
}

/// Response from POST /bolt-pipeline-v3 (the async trigger).
/// Either returns a cached pipeline result inline OR a jobId to poll.
struct BoltPipelineTriggerResponse: Codable {
    let success: Bool
    let cached: Bool?
    let jobId: String?
    let status: String?              // "pending" when cached=false
    let result: BoltPipelineResponse? // populated when cached=true
    let error: String?
}

/// Response from GET /bolt-pipeline-status?jobId=X
/// status ∈ "pending" | "queued" | "processing" | "completed" | "failed" | "not_found"
struct BoltPipelineStatusResponse: Codable {
    let success: Bool
    let status: String?
    let result: BoltPipelineResponse?
    let error: String?
    let flowId: String?
}

struct UserSyncRequest: Codable {
    let id: String
    let email: String?
    let fullName: String?
    let provider: String?
}

struct UserProfile: Codable, Identifiable {
    let id: String
    let email: String?
    let fullName: String?
    let avatarUrl: String?
    let subscriptionTier: String
    let subscriptionExpiresAt: Date?
    let createdAt: Date
    let updatedAt: Date
}

struct UserProfileUpdate: Codable {
    let fullName: String?
    let avatarUrl: String?
}

struct UserProfileResponse: Codable {
    let profile: UserProfile
}

struct AppConfig: Codable {
    // All fields optional so the app is resilient to backend changes / cold-start
    // config misses. AppUpdateManager treats nil latestAppVersion as "no prompt".
    let minimumAppVersion: String?
    let latestAppVersion: String?
    let maintenanceMode: Bool?
    let maintenanceMessage: String?
    let featureFlags: [String: Bool]?
    /// When true, the update prompt is non-dismissible (use for security/critical releases).
    let criticalUpdate: Bool?
    /// Short "What's new" copy shown in the update dialog body.
    let releaseNotes: String?
}

struct AppConfigResponse: Codable {
    let config: AppConfig
}

struct HealthResponse: Codable {
    let status: String
    let timestamp: String?
}

struct AccountDeleteResponse: Codable {
    let success: Bool
    let data: AccountDeleteData?
}

struct AccountDeleteData: Codable {
    let message: String?
}

struct AppleAuthCodeResponse: Codable {
    let success: Bool
    let warning: String?
}

// MARK: - Subscription Response Models

/// Wrapper for API responses with nested data
struct SubscriptionStatusAPIResponse: Codable {
    let success: Bool
    let data: SubscriptionStatusData?
    let error: APIErrorData?
}

struct APIErrorData: Codable {
    let code: String?
    let message: String?
}

/// Data structure from GET /api/v2/subscription/status
struct SubscriptionStatusData: Codable {
    let hasSubscription: Bool
    let isActive: Bool
    let tier: String
    let status: String
    let productId: String?
    let purchaseDate: Date?
    let expiresDate: Date?
    let environment: String?
    let autoRenew: Bool
    let daysUntilExpiry: Int?
    let entitlements: SubscriptionEntitlements?
}

struct SubscriptionEntitlements: Codable {
    let isPro: Bool
    let maxCitiesPerWeek: Int
    let canAccessPremiumContent: Bool
    let canSaveUnlimited: Bool
}

/// Simplified response for backward compatibility
struct SubscriptionStatusResponse {
    let hasActiveSubscription: Bool
    let subscriptionState: String
    let productId: String?
    let expiresAt: Date?
    let willRenew: Bool?
    let daysUntilExpiry: Int?

    /// Create from API response data
    init(from data: SubscriptionStatusData) {
        self.hasActiveSubscription = data.isActive
        self.subscriptionState = data.status
        self.productId = data.productId
        self.expiresAt = data.expiresDate
        self.willRenew = data.autoRenew
        self.daysUntilExpiry = data.daysUntilExpiry
    }
}

// MARK: - Viewed Cities Response Models

struct ViewedCitiesResponse: Codable {
    let cities: [ViewedCityData]
    let total: Int
    let limit: Int?
    let offset: Int?
    let hasMore: Bool
}

struct ViewedCityData: Codable {
    let cityId: String
    let city: City
    let viewCount: Int
    let lastViewedAt: Date

    enum CodingKeys: String, CodingKey {
        case cityId
        case city
        case viewCount
        case lastViewedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Handle cityId - may come from the nested city object or directly
        if let directCityId = try? container.decode(String.self, forKey: .cityId) {
            cityId = directCityId
        } else {
            // Fall back to getting it from the nested city object
            let cityData = try container.decode(City.self, forKey: .city)
            cityId = cityData.id
        }

        city = try container.decode(City.self, forKey: .city)
        viewCount = try container.decode(Int.self, forKey: .viewCount)
        lastViewedAt = try container.decode(Date.self, forKey: .lastViewedAt)
    }
}

struct RecordCityViewRequest: Codable {
    let cityId: String
}

// MARK: - Fallback to Mock Data

extension APIService {
    /// Fetch cities with fallback to local cache
    /// Priority: 1. API (online) -> cache response, 2. Local cache (offline/error)
    func fetchCitiesWithFallback() async -> [City] {
        print("[APIService] fetchCitiesWithFallback() - network: \(NetworkMonitor.shared.isConnected)")

        // Try API first if online
        if NetworkMonitor.shared.isConnected {
            do {
                print("[APIService] Calling fetchCities()...")
                let cities = try await fetchCities()
                print("[APIService] ✅ API returned \(cities.count) cities")
                // Cache successful response for offline use
                CacheService.shared.cacheCities(cities)
                return cities
            } catch {
                print("[APIService] ❌ API fetch failed: \(error)")
                // Fall through to cache
            }
        } else {
            print("[APIService] 📴 No network - checking local cache for cities")
        }

        // Fallback to cached data
        if let cachedCities = CacheService.shared.getCachedCities() {
            print("[APIService] 💾 Using \(cachedCities.count) cached cities (fallback)")
            return cachedCities
        }

        // No cache available - return empty (views will show appropriate empty state)
        print("[APIService] ⚠️ No cached cities available - returning empty array")
        return []
    }

    /// Fetch plans with fallback to local cache
    /// Priority: 1. API (online) -> cache response, 2. Local cache (offline/error)
    func fetchPlansWithFallback(cityId: String) async -> [Plan] {
        print("[APIService] 🎯 fetchPlansWithFallback(cityId: \(cityId)) - network: \(NetworkMonitor.shared.isConnected)")

        // Try API first if online
        if NetworkMonitor.shared.isConnected {
            do {
                print("[APIService] 🌐 Calling fetchPlans(cityId: \(cityId))...")
                let plans = try await fetchPlans(cityId: cityId)
                print("[APIService] ✅ API returned \(plans.count) plans for city \(cityId)")
                // Cache successful response for offline use
                CacheService.shared.cachePlans(plans, for: cityId)
                return plans
            } catch {
                print("[APIService] ❌ fetchPlans failed: \(error)")
                // Fall through to cache
            }
        } else {
            print("[APIService] 📴 No network - checking cache for plans")
        }

        // Fallback to cached data
        if let cachedPlans = CacheService.shared.getCachedPlans(for: cityId) {
            print("[APIService] 💾 Using \(cachedPlans.count) cached plans for city \(cityId)")
            return cachedPlans
        }

        // No cache available - return empty (views will show appropriate empty state)
        print("[APIService] ⚠️ No cached plans for city \(cityId) - returning empty")
        return []
    }
}

