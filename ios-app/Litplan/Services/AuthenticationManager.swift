//
//  AuthenticationManager.swift
//  Litplan
//
//  Created for Sprint 6 - Supabase Integration
//  Manages user authentication with Sign in with Apple, email/password, and guest mode
//

import Foundation
import SwiftUI
import AuthenticationServices
import Supabase
import SafariServices

/// Authentication state for the app
enum AuthState {
    case unknown
    case authenticated
    case unauthenticated
    case guest
}

/// Authentication errors
enum AuthError: LocalizedError {
    case signInFailed(String)
    case signUpFailed(String)
    case signOutFailed(String)
    case sessionExpired
    case networkError
    case invalidCredentials
    case emailNotVerified
    case userCancelled
    case appleSignInFailed(String)
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .signInFailed(let message):
            return "Sign in failed: \(message)"
        case .signUpFailed(let message):
            return "Sign up failed: \(message)"
        case .signOutFailed(let message):
            return "Sign out failed: \(message)"
        case .sessionExpired:
            return "Your session has expired. Please sign in again."
        case .networkError:
            return "Network error. Please check your connection."
        case .invalidCredentials:
            return "Invalid email or password."
        case .emailNotVerified:
            return "Please verify your email before signing in."
        case .userCancelled:
            return "Sign in was cancelled."
        case .appleSignInFailed(let message):
            return "Apple Sign In failed: \(message)"
        case .unknown(let message):
            return message
        }
    }
}

/// Manages user authentication
@MainActor
class AuthenticationManager: NSObject, ObservableObject {

    // MARK: - Singleton

    static let shared = AuthenticationManager()

    // MARK: - Published Properties

    @Published var authState: AuthState = .unknown
    @Published var currentUser: SupabaseUser? = nil
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    // MARK: - Private Properties

    private let supabaseManager = SupabaseManager.shared

    // MARK: - Initialization

    override private init() {
        super.init()

        // Check for existing session on init
        Task {
            await checkAuthState()
        }
    }

    // MARK: - Auth State

    /// Check current authentication state
    func checkAuthState() async {
        isLoading = true

        // Check for guest mode
        if UserDefaults.standard.bool(forKey: Config.UserDefaultsKeys.guestMode) {
            authState = .guest
            isLoading = false
            return
        }

        // Check for existing session
        await supabaseManager.checkExistingSession()

        if let session = supabaseManager.currentSession {
            currentUser = supabaseManager.currentUser
            authState = .authenticated

            // Sync user with backend
            await syncUserWithBackend()

            if Config.enableDebugLogging {
                print("[AuthenticationManager] User authenticated: \(session.userId)")
            }
        } else {
            authState = .unauthenticated
        }

        isLoading = false
    }

    /// Check if user is authenticated
    var isAuthenticated: Bool {
        return authState == .authenticated
    }

    /// Check if user is in guest mode
    var isGuest: Bool {
        return authState == .guest
    }

    // MARK: - Sign In with Apple

    /// Handle Sign in with Apple request
    func handleSignInWithAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        request.requestedScopes = [.fullName, .email]
    }

    /// Handle Sign in with Apple completion
    func handleSignInWithAppleCompletion(_ result: Result<ASAuthorization, Error>) async {
        isLoading = true
        errorMessage = nil

        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                errorMessage = "Invalid Apple ID credential"
                isLoading = false
                return
            }

            guard let identityToken = appleIDCredential.identityToken,
                  let tokenString = String(data: identityToken, encoding: .utf8) else {
                errorMessage = "Could not get identity token"
                isLoading = false
                return
            }

            do {
                let session = try await supabaseManager.client.auth.signInWithIdToken(
                    credentials: .init(
                        provider: .apple,
                        idToken: tokenString
                    )
                )

                // Update session
                supabaseManager.updateSession(Session(from: session))
                supabaseManager.updateUser(SupabaseUser(from: session.user))

                self.currentUser = SupabaseUser(from: session.user)
                self.authState = .authenticated

                // Sync with backend
                await syncUserWithBackend()

                if Config.enableDebugLogging {
                    print("[AuthenticationManager] Apple Sign In successful for user: \(session.user.id)")
                }
            } catch {
                self.errorMessage = "Apple Sign In failed: \(error.localizedDescription)"
                if Config.enableDebugLogging {
                    print("[AuthenticationManager] Apple Sign In error: \(error)")
                }
            }

        case .failure(let error):
            if (error as NSError).code == ASAuthorizationError.canceled.rawValue {
                // User cancelled - don't show error
                if Config.enableDebugLogging {
                    print("[AuthenticationManager] Apple Sign In cancelled by user")
                }
            } else {
                errorMessage = "Apple Sign In failed: \(error.localizedDescription)"
                if Config.enableDebugLogging {
                    print("[AuthenticationManager] Apple Sign In error: \(error)")
                }
            }
        }

        isLoading = false
    }

    // MARK: - Sign In with Google

    /// Handle Sign in with Google using ASWebAuthenticationSession
    /// This opens a secure in-app browser sheet that handles redirects automatically
    func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil

        do {
            // Use the bundle ID as the callback scheme (no registration needed for ASWebAuthenticationSession)
            let callbackScheme = "com.litplan.app"
            let redirectURL = URL(string: "\(callbackScheme)://oauth-callback")!

            // Get the OAuth sign in URL for Google provider
            let oauthURL = try supabaseManager.client.auth.getOAuthSignInURL(
                provider: .google,
                redirectTo: redirectURL
            )

            if Config.enableDebugLogging {
                print("[AuthenticationManager] Starting Google OAuth with URL: \(oauthURL)")
            }

            // Use ASWebAuthenticationSession for secure in-app OAuth
            let callbackURL = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
                let session = ASWebAuthenticationSession(
                    url: oauthURL,
                    callbackURLScheme: callbackScheme
                ) { callbackURL, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let callbackURL = callbackURL {
                        continuation.resume(returning: callbackURL)
                    } else {
                        continuation.resume(throwing: AuthError.unknown("No callback URL received"))
                    }
                }

                session.presentationContextProvider = self
                session.prefersEphemeralWebBrowserSession = false // Allow SSO

                DispatchQueue.main.async {
                    session.start()
                }
            }

            if Config.enableDebugLogging {
                print("[AuthenticationManager] OAuth callback received: \(callbackURL)")
            }

            // Extract the session from the callback URL
            let session = try await supabaseManager.client.auth.session(from: callbackURL)

            // Update session
            supabaseManager.updateSession(Session(from: session))
            supabaseManager.updateUser(SupabaseUser(from: session.user))

            self.currentUser = SupabaseUser(from: session.user)
            self.authState = .authenticated

            // Sync with backend
            await syncUserWithBackend()

            UserDefaults.standard.set(false, forKey: Config.UserDefaultsKeys.guestMode)

            if Config.enableDebugLogging {
                print("[AuthenticationManager] Google Sign In successful for user: \(session.user.id)")
            }
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            // User cancelled - don't show error
            if Config.enableDebugLogging {
                print("[AuthenticationManager] Google Sign In cancelled by user")
            }
        } catch {
            self.errorMessage = "Google Sign In failed: \(error.localizedDescription)"
            if Config.enableDebugLogging {
                print("[AuthenticationManager] Google Sign In error: \(error)")
            }
        }

        isLoading = false
    }

    /// Handle OAuth callback URL from Google Sign In
    func handleOAuthCallback(url: URL) async {
        isLoading = true
        errorMessage = nil

        do {
            // Extract the session from the callback URL
            let session = try await supabaseManager.client.auth.session(from: url)

            // Update session
            supabaseManager.updateSession(Session(from: session))
            supabaseManager.updateUser(SupabaseUser(from: session.user))

            self.currentUser = SupabaseUser(from: session.user)
            self.authState = .authenticated

            // Sync with backend
            await syncUserWithBackend()

            UserDefaults.standard.set(false, forKey: Config.UserDefaultsKeys.guestMode)

            if Config.enableDebugLogging {
                print("[AuthenticationManager] Google Sign In successful for user: \(session.user.id)")
            }
        } catch {
            self.errorMessage = "OAuth callback failed: \(error.localizedDescription)"
            if Config.enableDebugLogging {
                print("[AuthenticationManager] OAuth callback error: \(error)")
            }
        }

        isLoading = false
    }

    // MARK: - Email/Password Authentication

    /// Sign in with email and password
    func signIn(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil

        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter email and password"
            isLoading = false
            throw AuthError.invalidCredentials
        }

        do {
            let session = try await supabaseManager.client.auth.signIn(
                email: email,
                password: password
            )

            supabaseManager.updateSession(Session(from: session))
            supabaseManager.updateUser(SupabaseUser(from: session.user))

            self.currentUser = SupabaseUser(from: session.user)
            self.authState = .authenticated

            // Sync with backend
            await syncUserWithBackend()

            UserDefaults.standard.set(false, forKey: Config.UserDefaultsKeys.guestMode)

            if Config.enableDebugLogging {
                print("[AuthenticationManager] Email sign in successful for: \(email)")
            }
        } catch {
            self.errorMessage = "Sign in failed: \(error.localizedDescription)"
            isLoading = false
            throw AuthError.signInFailed(error.localizedDescription)
        }

        isLoading = false
    }

    /// Sign up with email and password
    func signUp(email: String, password: String, fullName: String? = nil) async throws {
        isLoading = true
        errorMessage = nil

        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter email and password"
            isLoading = false
            throw AuthError.invalidCredentials
        }

        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            isLoading = false
            throw AuthError.signUpFailed("Password must be at least 8 characters")
        }

        do {
            var metadata: [String: AnyJSON] = [:]
            if let fullName = fullName, !fullName.isEmpty {
                metadata["full_name"] = .string(fullName)
            }

            let response = try await supabaseManager.client.auth.signUp(
                email: email,
                password: password,
                data: metadata
            )

            if let session = response.session {
                supabaseManager.updateSession(Session(from: session))
                supabaseManager.updateUser(SupabaseUser(from: session.user))

                self.currentUser = SupabaseUser(from: session.user)
                self.authState = .authenticated

                // Sync with backend
                await syncUserWithBackend()

                if Config.enableDebugLogging {
                    print("[AuthenticationManager] Sign up successful for: \(email)")
                }
            } else {
                // Email confirmation required
                self.errorMessage = "Please check your email to confirm your account."
                if Config.enableDebugLogging {
                    print("[AuthenticationManager] Sign up requires email confirmation for: \(email)")
                }
            }

            UserDefaults.standard.set(false, forKey: Config.UserDefaultsKeys.guestMode)
        } catch {
            self.errorMessage = "Sign up failed: \(error.localizedDescription)"
            isLoading = false
            throw AuthError.signUpFailed(error.localizedDescription)
        }

        isLoading = false
    }

    // MARK: - Password Reset

    /// Request password reset email
    func resetPassword(email: String) async throws {
        isLoading = true
        errorMessage = nil

        guard !email.isEmpty else {
            errorMessage = "Please enter your email"
            isLoading = false
            throw AuthError.invalidCredentials
        }

        do {
            try await supabaseManager.client.auth.resetPasswordForEmail(email)
            if Config.enableDebugLogging {
                print("[AuthenticationManager] Password reset email sent to: \(email)")
            }
        } catch {
            self.errorMessage = "Password reset failed: \(error.localizedDescription)"
            isLoading = false
            throw AuthError.unknown(error.localizedDescription)
        }

        isLoading = false
    }

    // MARK: - Guest Mode

    /// Continue as guest (limited features)
    func continueAsGuest() {
        authState = .guest
        currentUser = nil
        UserDefaults.standard.set(true, forKey: Config.UserDefaultsKeys.guestMode)

        if Config.enableDebugLogging {
            print("[AuthenticationManager] Continuing as guest")
        }
    }

    /// Exit guest mode
    /// Note: Does NOT clear Pro cache since StoreKit subscriptions are tied to Apple ID,
    /// not authentication state. Users can have valid subscriptions while in guest mode.
    func exitGuestMode() {
        UserDefaults.standard.set(false, forKey: Config.UserDefaultsKeys.guestMode)
        authState = .unauthenticated

        // Refresh Pro status to check for valid StoreKit entitlements
        // This ensures Pro access is preserved for users with valid Apple ID subscriptions
        Task {
            await SubscriptionManager.shared.refreshProStatus()
        }

        if Config.enableDebugLogging {
            print("[AuthenticationManager] Exited guest mode")
        }
    }

    // MARK: - Sign Out

    /// Sign out the current user
    func signOut() async {
        isLoading = true
        errorMessage = nil

        await supabaseManager.clearSession()

        currentUser = nil
        authState = .unauthenticated

        UserDefaults.standard.set(false, forKey: Config.UserDefaultsKeys.guestMode)
        UserDefaults.standard.removeObject(forKey: Config.UserDefaultsKeys.cachedUserId)

        // Clear Pro features cache to revert to free account settings
        SubscriptionManager.shared.clearProCache()

        if Config.enableDebugLogging {
            print("[AuthenticationManager] User signed out")
        }

        isLoading = false
    }

    // MARK: - Backend Sync

    /// Sync user with backend after authentication
    private func syncUserWithBackend() async {
        guard let user = currentUser else { return }

        do {
            try await APIService.shared.syncUser()
            if Config.enableDebugLogging {
                print("[AuthenticationManager] User synced with backend")
            }
        } catch {
            if Config.enableDebugLogging {
                print("[AuthenticationManager] Failed to sync user with backend: \(error)")
            }
            // Don't fail auth if backend sync fails
        }

        // Store user ID locally for quick access
        UserDefaults.standard.set(user.id, forKey: Config.UserDefaultsKeys.cachedUserId)

        // Check if user should have test Pro access (for testing without payment)
        SubscriptionManager.shared.checkTestProAccess()
    }

    // MARK: - Helper Methods

    /// Clear any error messages
    func clearError() {
        errorMessage = nil
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AuthenticationManager: ASAuthorizationControllerDelegate {
    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        Task { @MainActor in
            await handleSignInWithAppleCompletion(.success(authorization))
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        Task { @MainActor in
            await handleSignInWithAppleCompletion(.failure(error))
        }
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

extension AuthenticationManager: ASAuthorizationControllerPresentationContextProviding {
    @MainActor
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Get the key window for presenting the Apple Sign In sheet
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return UIWindow()
        }
        return window
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension AuthenticationManager: ASWebAuthenticationPresentationContextProviding {
    @MainActor
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Get the key window for presenting the web authentication sheet
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return UIWindow()
        }
        return window
    }
}
