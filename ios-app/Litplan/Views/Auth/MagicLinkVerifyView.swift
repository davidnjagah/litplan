//
//  MagicLinkVerifyView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Sprint: Email Authentication Flows
//  Screen shown during magic link verification (passwordless login)
//

import SwiftUI

/// View displayed while verifying magic link sign-in
struct MagicLinkVerifyView: View {
    @StateObject private var authManager = AuthenticationManager.shared
    @State private var verificationState: VerificationState = .loading
    @State private var animateBolt = false

    let tokenHash: String
    let onComplete: (Bool) -> Void

    enum VerificationState {
        case loading
        case success
        case error(String)
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Content based on state
            switch verificationState {
            case .loading:
                loadingView

            case .success:
                successView

            case .error(let message):
                errorView(message: message)
            }

            Spacer()

            // Action buttons (only shown after loading)
            if case .loading = verificationState {
                // No button during loading
            } else {
                actionButtons
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.xxl)
            }
        }
        .background(Color.appBackground)
        .task {
            await verifyMagicLink()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: Spacing.lg) {
            // Animated bolt icon
            ZStack {
                Circle()
                    .fill(Color.accentPrimary.opacity(0.15))
                    .frame(width: 120, height: 120)
                    .scaleEffect(animateBolt ? 1.2 : 1.0)
                    .opacity(animateBolt ? 0.5 : 1.0)
                    .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: animateBolt)

                Image(systemName: "bolt.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.accentPrimary)
                    .rotationEffect(.degrees(animateBolt ? 10 : -10))
                    .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: animateBolt)
            }

            Text("Signing you in...")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            Text("Please wait while we verify your login link.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)

            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                .padding(.top, Spacing.md)
        }
        .onAppear {
            animateBolt = true
        }
    }

    // MARK: - Success View

    private var successView: some View {
        VStack(spacing: Spacing.lg) {
            // Success icon
            ZStack {
                Circle()
                    .fill(Color.success.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 70))
                    .foregroundColor(.success)
            }

            Text("Welcome Back!")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            Text("You've been successfully signed in to LitPlanz.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)
        }
        .onAppear {
            HapticManager.shared.success()

            // Auto-dismiss after short delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                onComplete(true)
            }
        }
    }

    // MARK: - Error View

    private func errorView(message: String) -> some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .fill(Color.error.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 70))
                    .foregroundColor(.error)
            }

            Text("Sign In Failed")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: Spacing.md) {
            if case .success = verificationState {
                PrimaryButton(title: "Continue") {
                    onComplete(true)
                }
            } else if case .error = verificationState {
                PrimaryButton(title: "Back to Login") {
                    onComplete(false)
                }

                Button(action: {
                    Task {
                        await verifyMagicLink()
                    }
                }) {
                    Text("Try Again")
                        .font(.body)
                        .foregroundColor(.accentPrimary)
                }
            }
        }
    }

    // MARK: - Verification Logic

    private func verifyMagicLink() async {
        verificationState = .loading
        animateBolt = true

        do {
            try await authManager.verifyMagicLink(tokenHash: tokenHash)
            verificationState = .success
        } catch {
            animateBolt = false
            let errorMessage = mapError(error)
            verificationState = .error(errorMessage)
            HapticManager.shared.error()
        }
    }

    private func mapError(_ error: Error) -> String {
        let errorString = error.localizedDescription.lowercased()

        if errorString.contains("expired") {
            return "This login link has expired. Please request a new magic link."
        } else if errorString.contains("invalid") || errorString.contains("not found") {
            return "This login link is invalid or has already been used."
        } else if errorString.contains("network") || errorString.contains("connection") {
            return "Unable to connect. Please check your internet connection and try again."
        } else {
            return "Something went wrong. Please try signing in again."
        }
    }
}

// MARK: - Preview

#Preview {
    MagicLinkVerifyView(tokenHash: "test123", onComplete: { _ in })
}
