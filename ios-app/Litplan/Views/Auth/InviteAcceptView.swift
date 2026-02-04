//
//  InviteAcceptView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Sprint: Email Authentication Flows
//  Welcome screen for users accepting an invitation
//

import SwiftUI

/// View displayed when user accepts an invitation link
struct InviteAcceptView: View {
    @StateObject private var authManager = AuthenticationManager.shared
    @State private var acceptState: AcceptState = .welcome
    @State private var displayName = ""
    @State private var animateConfetti = false

    let tokenHash: String
    let onComplete: (Bool) -> Void

    enum AcceptState {
        case welcome
        case loading
        case success
        case error(String)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Content based on state
                switch acceptState {
                case .welcome:
                    welcomeSection

                case .loading:
                    loadingSection

                case .success:
                    successSection

                case .error(let message):
                    errorSection(message: message)
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.xxl)
        }
        .background(Color.appBackground)
    }

    // MARK: - Welcome Section

    private var welcomeSection: some View {
        VStack(spacing: Spacing.lg) {
            // Party icon
            ZStack {
                Circle()
                    .fill(Color.accentPrimary.opacity(0.15))
                    .frame(width: 100, height: 100)

                Text("🎉")
                    .font(.system(size: 50))
            }

            Text("You're Invited!")
                .font(.displayLarge)
                .foregroundColor(.textPrimary)

            Text("Welcome to LitPlanz - your guide to discovering the best nightlife experiences worldwide.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            // Features list
            featuresSection
                .padding(.top, Spacing.md)

            // Optional name input
            nameInputSection
                .padding(.top, Spacing.lg)

            // Accept button
            PrimaryButton(title: "Join LitPlanz") {
                Task {
                    await acceptInvite()
                }
            }
            .padding(.top, Spacing.lg)

            // Skip link
            Button(action: { onComplete(false) }) {
                Text("Maybe Later")
                    .font(.callout)
                    .foregroundColor(.textTertiary)
            }
            .padding(.top, Spacing.sm)
        }
    }

    // MARK: - Features Section

    private var featuresSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("What you'll get:")
                .font(.headline)
                .foregroundColor(.textPrimary)

            featureRow(icon: "globe.americas.fill", title: "100+ Cities", description: "Explore nightlife worldwide")
            featureRow(icon: "sparkles", title: "AI-Curated Plans", description: "Personalized recommendations")
            featureRow(icon: "person.3.fill", title: "Group Flows", description: "Multi-stop itineraries")
            featureRow(icon: "bolt.fill", title: "Vibez", description: "Custom plans for your mood")
        }
        .padding(Spacing.md)
        .background(Color.surfaceSecondary)
        .cornerRadius(Spacing.sm)
    }

    private func featureRow(icon: String, title: String, description: String) -> some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(Color.success.opacity(0.15))
                    .frame(width: 40, height: 40)

                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(.success)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)

                Text(description)
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }

            Spacer()
        }
    }

    // MARK: - Name Input Section

    private var nameInputSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("What should we call you? (Optional)")
                .font(.callout)
                .foregroundColor(.textSecondary)

            TextField("Your name", text: $displayName)
                .textFieldStyle(LitplanTextFieldStyle())
                .textContentType(.name)
        }
    }

    // MARK: - Loading Section

    private var loadingSection: some View {
        VStack(spacing: Spacing.lg) {
            Spacer()

            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                .scaleEffect(1.5)

            Text("Setting up your account...")
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)

            Spacer()
        }
        .frame(minHeight: 400)
    }

    // MARK: - Success Section

    private var successSection: some View {
        VStack(spacing: Spacing.lg) {
            // Confetti-style success
            ZStack {
                Circle()
                    .fill(Color.success.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 70))
                    .foregroundColor(.success)
            }

            Text("Welcome to LitPlanz!")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            if !displayName.isEmpty {
                Text("Great to have you here, \(displayName)!")
                    .font(.body)
                    .foregroundColor(.textSecondary)
            } else {
                Text("Your account is ready. Let's discover your perfect night out!")
                    .font(.body)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }

            PrimaryButton(title: "Start Exploring") {
                onComplete(true)
            }
            .padding(.top, Spacing.md)
        }
        .onAppear {
            HapticManager.shared.success()
        }
    }

    // MARK: - Error Section

    private func errorSection(message: String) -> some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .fill(Color.error.opacity(0.15))
                    .frame(width: 100, height: 100)

                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.error)
            }

            Text("Couldn't Accept Invite")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            VStack(spacing: Spacing.md) {
                PrimaryButton(title: "Try Again") {
                    Task {
                        await acceptInvite()
                    }
                }

                Button(action: { onComplete(false) }) {
                    Text("Back to Login")
                        .font(.body)
                        .foregroundColor(.accentPrimary)
                }
            }
            .padding(.top, Spacing.md)
        }
    }

    // MARK: - Accept Logic

    private func acceptInvite() async {
        acceptState = .loading
        HapticManager.shared.light()

        do {
            try await authManager.acceptInvite(tokenHash: tokenHash, displayName: displayName.isEmpty ? nil : displayName)
            acceptState = .success
        } catch {
            let errorMessage = mapError(error)
            acceptState = .error(errorMessage)
            HapticManager.shared.error()
        }
    }

    private func mapError(_ error: Error) -> String {
        let errorString = error.localizedDescription.lowercased()

        if errorString.contains("expired") {
            return "This invitation has expired. Please ask for a new invite."
        } else if errorString.contains("invalid") || errorString.contains("not found") {
            return "This invitation link is invalid or has already been used."
        } else if errorString.contains("network") || errorString.contains("connection") {
            return "Unable to connect. Please check your internet connection."
        } else {
            return "Something went wrong. Please try again or contact support@litplanz.com"
        }
    }
}

// MARK: - Preview

#Preview {
    InviteAcceptView(tokenHash: "test123", onComplete: { _ in })
}
