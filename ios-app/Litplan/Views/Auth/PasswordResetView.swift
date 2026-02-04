//
//  PasswordResetView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Sprint: Email Authentication Flows
//  Screen for setting a new password from recovery link
//

import SwiftUI

/// View for resetting password after clicking recovery link
struct PasswordResetView: View {
    @StateObject private var authManager = AuthenticationManager.shared
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var resetState: ResetState = .input
    @State private var showPassword = false
    @State private var animateSuccess = false

    let tokenHash: String
    let onComplete: (Bool) -> Void

    enum ResetState {
        case input
        case loading
        case success
        case error(String)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                headerSection
                    .padding(.top, Spacing.xxl)

                // Content based on state
                switch resetState {
                case .input, .loading:
                    inputFormSection
                        .padding(.top, Spacing.xl)

                case .success:
                    successSection
                        .padding(.top, Spacing.xl)

                case .error(let message):
                    errorSection(message: message)
                        .padding(.top, Spacing.xl)
                }

                Spacer(minLength: Spacing.xxl)
            }
            .padding(.horizontal, Spacing.lg)
        }
        .background(Color.appBackground)
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.accentPrimary.opacity(0.15))
                    .frame(width: 80, height: 80)

                Image(systemName: resetState == .success ? "checkmark.circle.fill" : "lock.rotation")
                    .font(.system(size: 40))
                    .foregroundColor(resetState == .success ? .success : .accentPrimary)
            }

            // Title
            Text(resetState == .success ? "Password Updated!" : "Create New Password")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            // Subtitle
            Text(resetState == .success
                 ? "Your password has been successfully reset."
                 : "Enter a new password for your LitPlanz account.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Input Form Section

    private var inputFormSection: some View {
        VStack(spacing: Spacing.lg) {
            // New Password Field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("New Password")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                HStack {
                    if showPassword {
                        TextField("", text: $newPassword)
                            .textContentType(.newPassword)
                    } else {
                        SecureField("", text: $newPassword)
                            .textContentType(.newPassword)
                    }

                    Button(action: { showPassword.toggle() }) {
                        Image(systemName: showPassword ? "eye.slash" : "eye")
                            .foregroundColor(.textTertiary)
                    }
                }
                .textFieldStyle(LitplanTextFieldStyle())

                // Password requirements
                passwordRequirements
            }

            // Confirm Password Field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Confirm Password")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                SecureField("", text: $confirmPassword)
                    .textFieldStyle(LitplanTextFieldStyle())
                    .textContentType(.newPassword)

                // Match indicator
                if !confirmPassword.isEmpty {
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: passwordsMatch ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(passwordsMatch ? .success : .error)

                        Text(passwordsMatch ? "Passwords match" : "Passwords don't match")
                            .font(.caption)
                            .foregroundColor(passwordsMatch ? .success : .error)
                    }
                }
            }

            // Reset Button
            PrimaryButton(
                title: "Reset Password",
                action: {
                    Task {
                        await resetPassword()
                    }
                },
                isLoading: resetState == .loading,
                isDisabled: !isFormValid
            )
            .padding(.top, Spacing.md)
        }
    }

    // MARK: - Password Requirements

    private var passwordRequirements: some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            requirementRow(met: newPassword.count >= 8, text: "At least 8 characters")
            requirementRow(met: newPassword.contains(where: { $0.isUppercase }), text: "One uppercase letter")
            requirementRow(met: newPassword.contains(where: { $0.isNumber }), text: "One number")
        }
        .padding(.top, Spacing.xxs)
    }

    private func requirementRow(met: Bool, text: String) -> some View {
        HStack(spacing: Spacing.xxs) {
            Image(systemName: met ? "checkmark.circle.fill" : "circle")
                .font(.caption)
                .foregroundColor(met ? .success : .textTertiary)

            Text(text)
                .font(.caption)
                .foregroundColor(met ? .textSecondary : .textTertiary)
        }
    }

    // MARK: - Success Section

    private var successSection: some View {
        VStack(spacing: Spacing.lg) {
            Text("You can now sign in with your new password.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            PrimaryButton(title: "Continue to Sign In") {
                onComplete(true)
            }
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
                    .frame(width: 80, height: 80)

                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.error)
            }

            Text(message)
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            VStack(spacing: Spacing.md) {
                PrimaryButton(title: "Try Again") {
                    resetState = .input
                    newPassword = ""
                    confirmPassword = ""
                }

                Button(action: { onComplete(false) }) {
                    Text("Back to Login")
                        .font(.body)
                        .foregroundColor(.accentPrimary)
                }
            }
        }
    }

    // MARK: - Validation

    private var passwordsMatch: Bool {
        !newPassword.isEmpty && newPassword == confirmPassword
    }

    private var isPasswordValid: Bool {
        newPassword.count >= 8 &&
        newPassword.contains(where: { $0.isUppercase }) &&
        newPassword.contains(where: { $0.isNumber })
    }

    private var isFormValid: Bool {
        isPasswordValid && passwordsMatch
    }

    // MARK: - Reset Logic

    private func resetPassword() async {
        guard isFormValid else { return }

        resetState = .loading
        HapticManager.shared.light()

        do {
            try await authManager.resetPassword(tokenHash: tokenHash, newPassword: newPassword)
            resetState = .success
        } catch {
            let errorMessage = mapError(error)
            resetState = .error(errorMessage)
            HapticManager.shared.error()
        }
    }

    private func mapError(_ error: Error) -> String {
        let errorString = error.localizedDescription.lowercased()

        if errorString.contains("expired") {
            return "This reset link has expired. Please request a new password reset."
        } else if errorString.contains("invalid") || errorString.contains("not found") {
            return "This reset link is invalid or has already been used."
        } else if errorString.contains("weak") || errorString.contains("password") {
            return "Please choose a stronger password that meets all requirements."
        } else if errorString.contains("network") || errorString.contains("connection") {
            return "Unable to connect. Please check your internet connection."
        } else {
            return "Something went wrong. Please try again or contact support@litplanz.com"
        }
    }
}

// MARK: - Preview

#Preview {
    PasswordResetView(tokenHash: "test123", onComplete: { _ in })
}
