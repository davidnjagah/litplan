//
//  EmailVerificationView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Sprint: Email Authentication Flows
//  Screen shown when user verifies their email from confirmation link
//

import SwiftUI

/// View displayed after user taps email verification link
struct EmailVerificationView: View {
    @StateObject private var authManager = AuthenticationManager.shared
    @State private var verificationState: VerificationState = .loading
    @State private var animateSuccess = false

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

            // Action button (only shown after loading)
            if case .loading = verificationState {
                // No button during loading
            } else {
                actionButton
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.xxl)
            }
        }
        .background(Color.appBackground)
        .task {
            await verifyEmail()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                .scaleEffect(1.5)

            Text("Verifying your email...")
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)
        }
    }

    // MARK: - Success View

    private var successView: some View {
        VStack(spacing: Spacing.lg) {
            // Success icon with glow effect
            ZStack {
                Circle()
                    .fill(Color.success.opacity(0.15))
                    .frame(width: 120, height: 120)
                    .scaleEffect(animateSuccess ? 1.1 : 1.0)
                    .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: animateSuccess)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 70))
                    .foregroundColor(.success)
                    .scaleEffect(animateSuccess ? 1.0 : 0.5)
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: animateSuccess)
            }

            Text("Email Verified!")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            Text("Your email has been successfully verified. You can now enjoy all the features of LitPlanz.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)

            // Feature highlights
            VStack(alignment: .leading, spacing: Spacing.sm) {
                featureRow(icon: "globe.americas.fill", text: "Explore 100+ cities")
                featureRow(icon: "sparkles", text: "AI-curated nightlife plans")
                featureRow(icon: "person.3.fill", text: "Group flow experiences")
            }
            .padding(.top, Spacing.md)
        }
        .onAppear {
            animateSuccess = true
            HapticManager.shared.success()
        }
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.accentPrimary)
                .frame(width: 24)

            Text(text)
                .font(.callout)
                .foregroundColor(.textSecondary)
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

            Text("Verification Failed")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)
        }
    }

    // MARK: - Action Button

    private var actionButton: some View {
        VStack(spacing: Spacing.md) {
            if case .success = verificationState {
                PrimaryButton(title: "Continue to App") {
                    onComplete(true)
                }
            } else if case .error = verificationState {
                PrimaryButton(title: "Back to Login") {
                    onComplete(false)
                }

                Button(action: {
                    Task {
                        await verifyEmail()
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

    private func verifyEmail() async {
        verificationState = .loading

        do {
            try await authManager.verifyEmail(tokenHash: tokenHash)
            verificationState = .success
        } catch {
            let errorMessage = mapError(error)
            verificationState = .error(errorMessage)
            HapticManager.shared.error()
        }
    }

    private func mapError(_ error: Error) -> String {
        let errorString = error.localizedDescription.lowercased()

        if errorString.contains("expired") {
            return "This verification link has expired. Please sign up again to receive a new link."
        } else if errorString.contains("invalid") || errorString.contains("not found") {
            return "This verification link is invalid or has already been used."
        } else if errorString.contains("network") || errorString.contains("connection") {
            return "Unable to connect. Please check your internet connection and try again."
        } else {
            return "Something went wrong. Please try again or contact support at support@litplanz.com"
        }
    }
}

// MARK: - Preview

#Preview("Loading") {
    EmailVerificationView(tokenHash: "test123", onComplete: { _ in })
}

#Preview("Success") {
    EmailVerificationView(tokenHash: "test123", onComplete: { _ in })
}
