//
//  AuthFlowContainerView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Sprint: Email Authentication Flows
//  Container view that routes to the appropriate auth flow screen
//

import SwiftUI

/// Container view that displays the appropriate auth flow based on deep link type
struct AuthFlowContainerView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var deepLinkHandler = DeepLinkHandler.shared
    @StateObject private var authManager = AuthenticationManager.shared

    let deepLinkType: DeepLinkType

    var body: some View {
        ZStack {
            Color.appBackground
                .ignoresSafeArea()

            // Route to appropriate view based on deep link type
            switch deepLinkType {
            case .emailVerification(let tokenHash):
                EmailVerificationView(tokenHash: tokenHash, onComplete: handleCompletion)

            case .passwordReset(let tokenHash):
                PasswordResetView(tokenHash: tokenHash, onComplete: handleCompletion)

            case .magicLink(let tokenHash):
                MagicLinkVerifyView(tokenHash: tokenHash, onComplete: handleCompletion)

            case .invite(let tokenHash):
                InviteAcceptView(tokenHash: tokenHash, onComplete: handleCompletion)

            case .oauthCallback, .city, .unknown:
                // These shouldn't reach this view, but handle gracefully
                unknownStateView
            }
        }
    }

    // MARK: - Unknown State View

    private var unknownStateView: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "questionmark.circle")
                .font(.system(size: 60))
                .foregroundColor(.textTertiary)

            Text("Unknown Link")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            Text("This link couldn't be recognized. Please try again or contact support.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)

            PrimaryButton(title: "Close") {
                handleCompletion(success: false)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.md)
        }
    }

    // MARK: - Helpers

    private func handleCompletion(success: Bool) {
        deepLinkHandler.completeAuthFlow(success: success)
        dismiss()
    }
}

// MARK: - Preview

#Preview {
    AuthFlowContainerView(deepLinkType: .emailVerification(tokenHash: "test123"))
}
