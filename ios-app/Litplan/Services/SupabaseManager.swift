//
//  SupabaseManager.swift
//  Litplan
//
//  Created for Sprint 6 - Supabase Integration
//  Manages Supabase client initialization and session handling
//
//  IMPORTANT: Add Supabase Swift SDK via Swift Package Manager:
//  1. In Xcode: File > Add Package Dependencies
//  2. Enter: https://github.com/supabase-community/supabase-swift
//  3. Select version 2.0.0 or later
//

import Foundation
// Uncomment after adding Supabase SDK:
// import Supabase

/// Manages Supabase client and session
@MainActor
class SupabaseManager: ObservableObject {

    // MARK: - Singleton

    static let shared = SupabaseManager()

    // MARK: - Published Properties

    @Published var isInitialized: Bool = false
    @Published var currentSession: Session? = nil
    @Published var currentUser: SupabaseUser? = nil

    // MARK: - Supabase Client

    // Uncomment after adding Supabase SDK:
    // private(set) var client: SupabaseClient!

    // MARK: - Initialization

    private init() {
        initializeClient()
    }

    /// Initialize the Supabase client
    private func initializeClient() {
        // Uncomment after adding Supabase SDK:
        /*
        client = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseURL)!,
            supabaseKey: Config.supabaseAnonKey
        )
        */

        isInitialized = true

        if Config.enableDebugLogging {
            print("[SupabaseManager] Initialized with URL: \(Config.supabaseURL)")
        }

        // Check for existing session
        Task {
            await checkExistingSession()
        }
    }

    // MARK: - Session Management

    /// Check for existing session on app launch
    func checkExistingSession() async {
        // Uncomment after adding Supabase SDK:
        /*
        do {
            let session = try await client.auth.session
            self.currentSession = Session(from: session)
            self.currentUser = SupabaseUser(from: session.user)

            if Config.enableDebugLogging {
                print("[SupabaseManager] Existing session found for user: \(session.user.id)")
            }
        } catch {
            // No existing session
            self.currentSession = nil
            self.currentUser = nil

            if Config.enableDebugLogging {
                print("[SupabaseManager] No existing session found")
            }
        }
        */

        // Placeholder until SDK is added
        if Config.enableDebugLogging {
            print("[SupabaseManager] Checking for existing session...")
        }
    }

    /// Get the current access token for API calls
    /// - Returns: The access token if available
    func getAccessToken() async -> String? {
        // Uncomment after adding Supabase SDK:
        /*
        do {
            let session = try await client.auth.session
            return session.accessToken
        } catch {
            if Config.enableDebugLogging {
                print("[SupabaseManager] Failed to get access token: \(error)")
            }
            return nil
        }
        */

        // Placeholder until SDK is added
        return currentSession?.accessToken
    }

    /// Refresh the current session
    func refreshSession() async throws {
        // Uncomment after adding Supabase SDK:
        /*
        let session = try await client.auth.refreshSession()
        self.currentSession = Session(from: session)
        self.currentUser = SupabaseUser(from: session.user)

        if Config.enableDebugLogging {
            print("[SupabaseManager] Session refreshed successfully")
        }
        */

        if Config.enableDebugLogging {
            print("[SupabaseManager] Session refresh requested")
        }
    }

    /// Clear the current session (logout)
    func clearSession() async {
        currentSession = nil
        currentUser = nil

        // Uncomment after adding Supabase SDK:
        /*
        do {
            try await client.auth.signOut()
            if Config.enableDebugLogging {
                print("[SupabaseManager] Session cleared")
            }
        } catch {
            if Config.enableDebugLogging {
                print("[SupabaseManager] Error clearing session: \(error)")
            }
        }
        */

        if Config.enableDebugLogging {
            print("[SupabaseManager] Session cleared")
        }
    }

    /// Update session from authentication result
    func updateSession(_ session: Session) {
        self.currentSession = session
        if Config.enableDebugLogging {
            print("[SupabaseManager] Session updated")
        }
    }

    /// Update current user
    func updateUser(_ user: SupabaseUser) {
        self.currentUser = user
        if Config.enableDebugLogging {
            print("[SupabaseManager] User updated: \(user.id)")
        }
    }

    // MARK: - Auth State Listener

    /// Listen for auth state changes
    func listenForAuthChanges() {
        // Uncomment after adding Supabase SDK:
        /*
        Task {
            for await event in client.auth.authStateChanges {
                await MainActor.run {
                    switch event {
                    case .initialSession(let session):
                        if let session = session {
                            self.currentSession = Session(from: session)
                            self.currentUser = SupabaseUser(from: session.user)
                        }
                    case .signedIn(let session):
                        self.currentSession = Session(from: session)
                        self.currentUser = SupabaseUser(from: session.user)
                    case .signedOut:
                        self.currentSession = nil
                        self.currentUser = nil
                    case .tokenRefreshed(let session):
                        self.currentSession = Session(from: session)
                    case .userUpdated(let user):
                        self.currentUser = SupabaseUser(from: user)
                    case .passwordRecovery:
                        break
                    case .mfaChallengeVerified:
                        break
                    @unknown default:
                        break
                    }
                }
            }
        }
        */

        if Config.enableDebugLogging {
            print("[SupabaseManager] Auth state listener started")
        }
    }
}

// MARK: - Session Model

/// Represents a Supabase session
struct Session: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date?
    let userId: String

    // Uncomment after adding Supabase SDK:
    /*
    init(from supabaseSession: Supabase.Session) {
        self.accessToken = supabaseSession.accessToken
        self.refreshToken = supabaseSession.refreshToken
        self.expiresAt = supabaseSession.expiresAt
        self.userId = supabaseSession.user.id.uuidString
    }
    */

    init(accessToken: String, refreshToken: String, expiresAt: Date?, userId: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.userId = userId
    }
}

// MARK: - Supabase User Model

/// Represents a Supabase user
struct SupabaseUser: Codable, Identifiable {
    let id: String
    let email: String?
    let phone: String?
    let createdAt: Date?
    let updatedAt: Date?
    let appMetadata: [String: String]?
    let userMetadata: UserMetadata?

    struct UserMetadata: Codable {
        let fullName: String?
        let avatarUrl: String?
        let provider: String?

        enum CodingKeys: String, CodingKey {
            case fullName = "full_name"
            case avatarUrl = "avatar_url"
            case provider
        }
    }

    // Uncomment after adding Supabase SDK:
    /*
    init(from supabaseUser: Supabase.User) {
        self.id = supabaseUser.id.uuidString
        self.email = supabaseUser.email
        self.phone = supabaseUser.phone
        self.createdAt = supabaseUser.createdAt
        self.updatedAt = supabaseUser.updatedAt
        self.appMetadata = nil
        self.userMetadata = UserMetadata(
            fullName: supabaseUser.userMetadata["full_name"]?.stringValue,
            avatarUrl: supabaseUser.userMetadata["avatar_url"]?.stringValue,
            provider: supabaseUser.appMetadata["provider"]?.stringValue
        )
    }
    */

    init(id: String, email: String?, phone: String? = nil, createdAt: Date? = nil, updatedAt: Date? = nil, appMetadata: [String: String]? = nil, userMetadata: UserMetadata? = nil) {
        self.id = id
        self.email = email
        self.phone = phone
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.appMetadata = appMetadata
        self.userMetadata = userMetadata
    }
}
