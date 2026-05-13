//
//  SupabaseManager.swift
//  Litplan
//
//  Created for Sprint 6 - Supabase Integration
//  Manages Supabase client initialization and session handling
//

import Foundation
import Supabase

/// Manages Supabase client and session
@MainActor
class SupabaseManager: ObservableObject {

    // MARK: - Singleton

    static let shared = SupabaseManager()

    // MARK: - Published Properties

    @Published var isInitialized: Bool = false
    @Published var currentSession: Session? = nil
    @Published var currentUser: SupabaseUser? = nil
    /// True when the signed-in user's primary provider is email/password.
    /// Derived from raw Supabase.User.identities — more reliable than appMetadata parsing.
    @Published var isEmailUser: Bool = false

    // MARK: - Supabase Client

    private(set) var client: SupabaseClient!

    // MARK: - Initialization

    private init() {
        initializeClient()
    }

    /// Initialize the Supabase client
    private func initializeClient() {
        client = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseURL)!,
            supabaseKey: Config.supabaseAnonKey
        )

        isInitialized = true

        if Config.enableDebugLogging {
            print("[SupabaseManager] Initialized with URL: \(Config.supabaseURL)")
        }

        // Check for existing session
        Task {
            await checkExistingSession()
        }
    }

    // MARK: - User Helpers

    /// Set currentUser and isEmailUser together from the raw Supabase user object.
    /// Always call this instead of assigning currentUser directly so isEmailUser stays in sync.
    func setCurrentUser(from rawUser: Supabase.User) {
        self.currentUser = SupabaseUser(from: rawUser)
        self.isEmailUser = checkIsEmailUser(rawUser)
        print("[SupabaseManager] setCurrentUser — provider:\(rawUser.appMetadata["provider"]?.stringValue ?? "nil") identities:\(rawUser.identities?.map { $0.provider } ?? []) isEmailUser:\(self.isEmailUser)")
    }

    /// Determine whether the user's primary identity is email/password.
    /// Prefers identities array (authoritative) over appMetadata parsing.
    private func checkIsEmailUser(_ user: Supabase.User) -> Bool {
        if let identities = user.identities, !identities.isEmpty {
            return identities.contains { $0.provider == "email" }
        }
        return user.appMetadata["provider"]?.stringValue == "email"
    }

    // MARK: - Session Management

    /// Check for existing session on app launch
    func checkExistingSession() async {
        do {
            let session = try await client.auth.session
            self.currentSession = Session(from: session)
            setCurrentUser(from: session.user)

            if Config.enableDebugLogging {
                print("[SupabaseManager] Existing session found for user: \(session.user.id)")
            }
        } catch {
            // No existing session
            self.currentSession = nil
            self.currentUser = nil
            self.isEmailUser = false

            if Config.enableDebugLogging {
                print("[SupabaseManager] No existing session found")
            }
        }
    }

    /// Get the current access token for API calls
    /// Automatically attempts a session refresh if the initial token fetch fails
    /// - Returns: The access token if available
    func getAccessToken() async -> String? {
        do {
            let session = try await client.auth.session
            print("[SupabaseManager] Got access token, length: \(session.accessToken.count), user: \(session.user.id)")
            return session.accessToken
        } catch {
            print("[SupabaseManager] Failed to get access token: \(error)")
            print("[SupabaseManager] Attempting session refresh...")

            // Try refreshing the session before giving up
            do {
                let refreshedSession = try await client.auth.refreshSession()
                print("[SupabaseManager] Session refreshed, new token length: \(refreshedSession.accessToken.count)")
                self.currentSession = Session(from: refreshedSession)
                setCurrentUser(from: refreshedSession.user)
                return refreshedSession.accessToken
            } catch {
                print("[SupabaseManager] Session refresh also failed: \(error)")
                return nil
            }
        }
    }

    /// Refresh the current session
    func refreshSession() async throws {
        let session = try await client.auth.refreshSession()
        self.currentSession = Session(from: session)
        setCurrentUser(from: session.user)

        if Config.enableDebugLogging {
            print("[SupabaseManager] Session refreshed successfully")
        }
    }

    /// Clear the current session (logout)
    func clearSession() async {
        currentSession = nil
        currentUser = nil
        isEmailUser = false

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
    }

    /// Update session from authentication result
    func updateSession(_ session: Session) {
        self.currentSession = session
        if Config.enableDebugLogging {
            print("[SupabaseManager] Session updated")
        }
    }

    /// Update current user (legacy path — prefer setCurrentUser(from:) for raw Supabase.User)
    func updateUser(_ user: SupabaseUser) {
        self.currentUser = user
        self.isEmailUser = user.appMetadata?["provider"] == "email" ||
                           user.userMetadata?.provider == "email"
        if Config.enableDebugLogging {
            print("[SupabaseManager] User updated: \(user.id)")
        }
    }

    // MARK: - Auth State Listener

    /// Listen for auth state changes
    func listenForAuthChanges() {
        Task {
            for await (event, session) in client.auth.authStateChanges {
                await MainActor.run {
                    switch event {
                    case .initialSession:
                        if let session = session {
                            self.currentSession = Session(from: session)
                            self.setCurrentUser(from: session.user)
                        }
                    case .signedIn:
                        if let session = session {
                            self.currentSession = Session(from: session)
                            self.setCurrentUser(from: session.user)
                        }
                    case .signedOut:
                        self.currentSession = nil
                        self.currentUser = nil
                        self.isEmailUser = false
                    case .tokenRefreshed:
                        if let session = session {
                            self.currentSession = Session(from: session)
                        }
                    case .userUpdated:
                        if let session = session {
                            self.setCurrentUser(from: session.user)
                        }
                    case .passwordRecovery:
                        break
                    case .mfaChallengeVerified:
                        break
                    case .userDeleted:
                        self.currentSession = nil
                        self.currentUser = nil
                        self.isEmailUser = false
                    }
                }
            }
        }

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

    init(from supabaseSession: Supabase.Session) {
        self.accessToken = supabaseSession.accessToken
        self.refreshToken = supabaseSession.refreshToken
        self.expiresAt = Date(timeIntervalSince1970: supabaseSession.expiresAt)
        self.userId = supabaseSession.user.id.uuidString
    }

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

    init(from supabaseUser: Supabase.User) {
        self.id = supabaseUser.id.uuidString
        self.email = supabaseUser.email
        self.phone = supabaseUser.phone
        self.createdAt = supabaseUser.createdAt
        self.updatedAt = supabaseUser.updatedAt

        // Extract app_metadata including is_pro flag
        var extractedAppMetadata: [String: String] = [:]
        if let isPro = supabaseUser.appMetadata["is_pro"]?.boolValue {
            extractedAppMetadata["is_pro"] = isPro ? "true" : "false"
        }
        if let subscriptionType = supabaseUser.appMetadata["subscription_type"]?.stringValue {
            extractedAppMetadata["subscription_type"] = subscriptionType
        }
        if let provider = supabaseUser.appMetadata["provider"]?.stringValue {
            extractedAppMetadata["provider"] = provider
        }
        self.appMetadata = extractedAppMetadata.isEmpty ? nil : extractedAppMetadata

        self.userMetadata = UserMetadata(
            fullName: supabaseUser.userMetadata["full_name"]?.stringValue,
            avatarUrl: supabaseUser.userMetadata["avatar_url"]?.stringValue,
            provider: supabaseUser.appMetadata["provider"]?.stringValue
        )
    }

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
