//
//  CityDiscoveryManager.swift
//  Litplan
//
//  Manages city discovery requests for Pro users
//

import Foundation

/// Manages city discovery - allows Pro users to discover cities not yet in the system
@MainActor
class CityDiscoveryManager: ObservableObject {

    // MARK: - Singleton

    static let shared = CityDiscoveryManager()

    // MARK: - Published Properties

    @Published var activeDiscoveries: [String: DiscoveryJob] = [:] // cityName -> job
    @Published var isLoading: Bool = false
    @Published var error: String?

    // MARK: - Types

    struct DiscoveryJob: Codable {
        let jobId: String
        let cityName: String
        let country: String
        let status: DiscoveryStatus
        let startedAt: Date?
        let estimatedTime: String?

        enum DiscoveryStatus: String, Codable {
            case started
            case inProgress = "in_progress"
            case available
            case failed
        }
    }

    struct DiscoverCityResponse: Codable {
        let success: Bool
        let status: String
        let message: String
        let jobId: String?
        let cityId: String?
        let plans: [GroupFlow]?
        let startedAt: String?
        let estimatedTime: String?
    }

    // MARK: - Private Properties

    private let cacheKey = "activeDiscoveries"

    // MARK: - Initialization

    private init() {
        loadCachedDiscoveries()
        setupNotificationObservers()
    }

    // MARK: - Public Methods

    /// Check if a city has an active discovery job
    func isDiscoveryInProgress(for cityName: String) -> Bool {
        guard let job = activeDiscoveries[cityName.lowercased()] else { return false }
        return job.status == .started || job.status == .inProgress
    }

    /// Get the discovery job for a city
    func getDiscoveryJob(for cityName: String) -> DiscoveryJob? {
        return activeDiscoveries[cityName.lowercased()]
    }

    /// Request discovery of a new city (Pro users only)
    func discoverCity(cityName: String, country: String) async -> Result<DiscoverCityResponse, Error> {
        guard let accessToken = await SupabaseManager.shared.getAccessToken() else {
            return .failure(DiscoveryError.notAuthenticated)
        }

        // Check Pro status
        guard SubscriptionManager.shared.isProUser else {
            return .failure(DiscoveryError.proRequired)
        }

        isLoading = true
        error = nil

        do {
            guard let url = URL(string: "\(Config.supabaseURL)/functions/v1/discover-city") else {
                throw DiscoveryError.invalidURL
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

            let body = [
                "cityName": cityName,
                "country": country,
                "notifyPush": true,
                "notifyEmail": true
            ] as [String: Any]

            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw DiscoveryError.invalidResponse
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            if httpResponse.statusCode == 200 || httpResponse.statusCode == 202 {
                let discoveryResponse = try decoder.decode(DiscoverCityResponse.self, from: data)

                // Update active discoveries
                if let jobId = discoveryResponse.jobId,
                   discoveryResponse.status == "started" || discoveryResponse.status == "in_progress" {
                    let job = DiscoveryJob(
                        jobId: jobId,
                        cityName: cityName,
                        country: country,
                        status: discoveryResponse.status == "started" ? .started : .inProgress,
                        startedAt: Date(),
                        estimatedTime: discoveryResponse.estimatedTime
                    )
                    activeDiscoveries[cityName.lowercased()] = job
                    saveDiscoveriesToCache()
                }

                isLoading = false
                return .success(discoveryResponse)

            } else if httpResponse.statusCode == 403 {
                isLoading = false
                return .failure(DiscoveryError.proRequired)
            } else {
                // Try to parse error response
                if let errorResponse = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorMessage = errorResponse["error"] as? String {
                    isLoading = false
                    error = errorMessage
                    return .failure(DiscoveryError.serverError(errorMessage))
                }
                isLoading = false
                return .failure(DiscoveryError.serverError("Request failed with status \(httpResponse.statusCode)"))
            }

        } catch {
            isLoading = false
            self.error = error.localizedDescription
            return .failure(error)
        }
    }

    /// Mark a discovery as complete (called when notification received)
    func markDiscoveryComplete(cityName: String) {
        if var job = activeDiscoveries[cityName.lowercased()] {
            activeDiscoveries[cityName.lowercased()] = DiscoveryJob(
                jobId: job.jobId,
                cityName: job.cityName,
                country: job.country,
                status: .available,
                startedAt: job.startedAt,
                estimatedTime: nil
            )
            saveDiscoveriesToCache()
        }
    }

    /// Mark a discovery as failed
    func markDiscoveryFailed(cityName: String) {
        activeDiscoveries.removeValue(forKey: cityName.lowercased())
        saveDiscoveriesToCache()
    }

    /// Clear a completed discovery
    func clearDiscovery(cityName: String) {
        activeDiscoveries.removeValue(forKey: cityName.lowercased())
        saveDiscoveriesToCache()
    }

    // MARK: - Private Methods

    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            forName: .cityDiscoveryComplete,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let cityName = notification.userInfo?["cityName"] as? String {
                self?.markDiscoveryComplete(cityName: cityName)
            }
        }

        NotificationCenter.default.addObserver(
            forName: .cityDiscoveryFailed,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let cityName = notification.userInfo?["cityName"] as? String {
                self?.markDiscoveryFailed(cityName: cityName)
            }
        }
    }

    private func loadCachedDiscoveries() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else { return }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let cached = try decoder.decode([String: DiscoveryJob].self, from: data)

            // Filter out old completed/failed jobs (keep in_progress for 24h max)
            let cutoff = Date().addingTimeInterval(-24 * 60 * 60)
            activeDiscoveries = cached.filter { _, job in
                if job.status == .started || job.status == .inProgress {
                    return (job.startedAt ?? Date()) > cutoff
                }
                return false
            }
        } catch {
            print("[CityDiscoveryManager] Failed to load cached discoveries: \(error)")
        }
    }

    private func saveDiscoveriesToCache() {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(activeDiscoveries)
            UserDefaults.standard.set(data, forKey: cacheKey)
        } catch {
            print("[CityDiscoveryManager] Failed to save discoveries: \(error)")
        }
    }
}

// MARK: - Errors

enum DiscoveryError: LocalizedError {
    case notAuthenticated
    case proRequired
    case invalidURL
    case invalidResponse
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to discover cities"
        case .proRequired:
            return "Pro subscription required to discover new cities"
        case .invalidURL:
            return "Invalid server configuration"
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let message):
            return message
        }
    }
}
