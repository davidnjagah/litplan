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
        self.decoder.dateDecodingStrategy = .iso8601
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase

        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Generic Request

    /// Make an authenticated API request
    /// - Parameters:
    ///   - endpoint: The API endpoint URL string
    ///   - method: HTTP method
    ///   - body: Optional request body (Encodable)
    ///   - requiresAuth: Whether to include auth header
    /// - Returns: Decoded response
    func request<T: Decodable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: (any Encodable)? = nil,
        requiresAuth: Bool = false
    ) async throws -> T {
        guard let url = URL(string: endpoint) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(Config.appVersion, forHTTPHeaderField: "X-App-Version")
        request.setValue("iOS", forHTTPHeaderField: "X-Platform")

        // Add auth header if required
        if requiresAuth {
            if let token = await SupabaseManager.shared.getAccessToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else if AuthenticationManager.shared.isGuest {
                // Guest mode - some endpoints may allow limited access
                request.setValue("guest", forHTTPHeaderField: "X-Auth-Mode")
            } else {
                throw APIError.unauthorized
            }
        }

        // Add body if present
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        if Config.enableDebugLogging {
            print("[APIService] \(method.rawValue) \(endpoint)")
        }

        do {
            let (data, response) = try await session.data(for: request)

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

    // MARK: - Plans API

    /// Fetch plans for a city (requires authentication)
    func fetchPlans(cityId: String) async throws -> [Plan] {
        let response: PlansResponse = try await request(
            endpoint: "\(Config.Endpoints.plans)?cityId=\(cityId)",
            method: .GET,
            requiresAuth: true
        )
        return response.plans
    }

    /// Fetch a single plan by ID
    func fetchPlan(id: String) async throws -> Plan {
        let response: PlanResponse = try await request(
            endpoint: "\(Config.Endpoints.plans)/\(id)",
            method: .GET,
            requiresAuth: true
        )
        return response.plan
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
    let minimumAppVersion: String
    let latestAppVersion: String
    let maintenanceMode: Bool
    let maintenanceMessage: String?
    let featureFlags: [String: Bool]?
}

struct AppConfigResponse: Codable {
    let config: AppConfig
}

struct HealthResponse: Codable {
    let status: String
    let timestamp: String?
}

// MARK: - Fallback to Mock Data

extension APIService {
    /// Fetch cities with fallback to mock data
    func fetchCitiesWithFallback() async -> [City] {
        // Check network connectivity
        guard NetworkMonitor.shared.isConnected else {
            if Config.enableDebugLogging {
                print("[APIService] No network - using mock data")
            }
            return MockDataService.shared.cities
        }

        do {
            return try await fetchCities()
        } catch {
            if Config.enableDebugLogging {
                print("[APIService] Failed to fetch cities, using mock data: \(error)")
            }
            return MockDataService.shared.cities
        }
    }

    /// Fetch plans with fallback to mock data
    func fetchPlansWithFallback(cityId: String) async -> [Plan] {
        guard NetworkMonitor.shared.isConnected else {
            if Config.enableDebugLogging {
                print("[APIService] No network - using mock data for plans")
            }
            return MockDataService.shared.plans(for: cityId)
        }

        do {
            return try await fetchPlans(cityId: cityId)
        } catch {
            if Config.enableDebugLogging {
                print("[APIService] Failed to fetch plans, using mock data: \(error)")
            }
            return MockDataService.shared.plans(for: cityId)
        }
    }
}

// MARK: - MockDataService Extension

extension MockDataService {
    /// Get plans for a specific city ID
    func plans(for cityId: String) -> [Plan] {
        // Return plans that match the city (in mock data, we use the city prefix)
        return allPlans.filter { $0.id.hasPrefix(cityId.prefix(3).lowercased()) }
    }
}
