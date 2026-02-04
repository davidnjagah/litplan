//
//  DeepLinkHandler.swift
//  Litplan
//
//  App Name: LitPlanz
//  Sprint: Email Authentication Flows
//  Centralized deep link routing and processing
//

import Foundation
import SwiftUI

/// Handles deep link routing for the LitPlanz app
@MainActor
class DeepLinkHandler: ObservableObject {

    /// Shared singleton instance
    static let shared = DeepLinkHandler()

    /// Currently active deep link awaiting handling
    @Published var activeDeepLink: DeepLinkType?

    /// Whether to show the auth flow container
    @Published var showAuthFlow: Bool = false

    /// Error message if deep link handling failed
    @Published var errorMessage: String?

    private init() {}

    // MARK: - URL Handling

    /// Parse and handle an incoming URL
    /// - Parameter url: The URL to handle
    /// - Returns: True if the URL was recognized and handled
    @discardableResult
    func handleURL(_ url: URL) -> Bool {
        let deepLinkType = DeepLinkType.from(url: url)

        if Config.enableDebugLogging {
            print("[DeepLinkHandler] Received URL: \(url)")
            print("[DeepLinkHandler] Parsed as: \(deepLinkType.title)")
        }

        switch deepLinkType {
        case .unknown:
            if Config.enableDebugLogging {
                print("[DeepLinkHandler] Unknown deep link, ignoring")
            }
            return false

        case .oauthCallback(let callbackURL):
            // Delegate OAuth callbacks to AuthenticationManager
            Task {
                await AuthenticationManager.shared.handleOAuthCallback(url: callbackURL)
            }
            return true

        case .emailVerification, .passwordReset, .magicLink, .invite:
            // Show the auth flow UI for these types
            activeDeepLink = deepLinkType
            showAuthFlow = true
            return true
        }
    }

    /// Clear the current deep link state
    func clearDeepLink() {
        activeDeepLink = nil
        showAuthFlow = false
        errorMessage = nil
    }

    /// Handle completion of an auth flow
    /// - Parameter success: Whether the flow completed successfully
    func completeAuthFlow(success: Bool) {
        if success {
            // Dismiss the auth flow
            showAuthFlow = false
            activeDeepLink = nil

            // Provide haptic feedback
            HapticManager.shared.success()
        }
    }

    /// Set an error state
    /// - Parameter message: The error message to display
    func setError(_ message: String) {
        errorMessage = message
        HapticManager.shared.error()
    }
}
