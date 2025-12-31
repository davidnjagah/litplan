//
//  LoginView.swift
//  Litplan
//
//  Created for Sprint 6 - Supabase Integration
//  Authentication view with Sign in with Apple, email/password, and guest mode
//

import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var showEmailLogin = false
    @State private var showSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var showForgotPassword = false

    var body: some View {
        ZStack {
            // Background
            Color.appBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header with logo
                headerSection

                Spacer()

                // Main content
                if showEmailLogin {
                    emailLoginSection
                } else if showSignUp {
                    signUpSection
                } else {
                    mainAuthSection
                }

                Spacer()

                // Footer
                footerSection
            }
            .padding(.horizontal, Spacing.lg)

            // Loading overlay
            if authManager.isLoading {
                loadingOverlay
            }
        }
        .alert("Error", isPresented: .constant(authManager.errorMessage != nil)) {
            Button("OK") {
                authManager.clearError()
            }
        } message: {
            Text(authManager.errorMessage ?? "")
        }
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordSheet(email: $email)
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: Spacing.md) {
            // App Icon/Logo placeholder
            ZStack {
                Circle()
                    .fill(Color.accentPrimary.opacity(0.2))
                    .frame(width: 100, height: 100)

                Image(systemName: "sparkles")
                    .font(.system(size: 40))
                    .foregroundColor(.accentPrimary)
            }
            .padding(.top, Spacing.xxl)

            Text("Litplan")
                .font(.displayLarge)
                .foregroundColor(.textPrimary)

            Text("Discover your perfect night out")
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)
        }
    }

    // MARK: - Main Auth Section

    private var mainAuthSection: some View {
        VStack(spacing: Spacing.lg) {
            // Sign in with Apple
            SignInWithAppleButton(.signIn) { request in
                authManager.handleSignInWithAppleRequest(request)
            } onCompletion: { result in
                Task {
                    await authManager.handleSignInWithAppleCompletion(result)
                }
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 50)
            .cornerRadius(Spacing.sm)

            // Sign in with Google (matches Apple button style)
            Button(action: {
                Task {
                    await authManager.signInWithGoogle()
                }
            }) {
                HStack(spacing: Spacing.sm) {
                    // Google "G" logo using custom view
                    GoogleLogoView()
                        .frame(width: 16, height: 16)

                    Text("Sign in with Google")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(.black)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.white)
                .cornerRadius(Spacing.sm)
            }

            // Divider
            HStack {
                Rectangle()
                    .fill(Color.surfaceSecondary)
                    .frame(height: 1)

                Text("or")
                    .font(.callout)
                    .foregroundColor(.textTertiary)
                    .padding(.horizontal, Spacing.md)

                Rectangle()
                    .fill(Color.surfaceSecondary)
                    .frame(height: 1)
            }

            // Email login button
            SecondaryButton(title: "Continue with Email") {
                withAnimation(.easeInOut(duration: 0.3)) {
                    showEmailLogin = true
                }
            }

            // Guest mode button
            Button(action: {
                authManager.continueAsGuest()
            }) {
                Text("Continue as Guest")
                    .font(.body)
                    .foregroundColor(.textSecondary)
                    .underline()
            }
            .padding(.top, Spacing.sm)
        }
    }

    // MARK: - Email Login Section

    private var emailLoginSection: some View {
        VStack(spacing: Spacing.lg) {
            // Back button
            HStack {
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showEmailLogin = false
                        clearFields()
                    }
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                    .font(.body)
                    .foregroundColor(.accentPrimary)
                }
                Spacer()
            }

            Text("Sign In")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            // Email field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Email")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                TextField("", text: $email)
                    .textFieldStyle(LitplanTextFieldStyle())
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
            }

            // Password field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Password")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                SecureField("", text: $password)
                    .textFieldStyle(LitplanTextFieldStyle())
                    .textContentType(.password)
            }

            // Forgot password
            HStack {
                Spacer()
                Button(action: {
                    showForgotPassword = true
                }) {
                    Text("Forgot Password?")
                        .font(.callout)
                        .foregroundColor(.accentPrimary)
                }
            }

            // Sign in button
            PrimaryButton(
                title: "Sign In",
                action: {
                    Task {
                        try? await authManager.signIn(email: email, password: password)
                    }
                },
                isLoading: authManager.isLoading,
                isDisabled: email.isEmpty || password.isEmpty
            )

            // Switch to sign up
            HStack {
                Text("Don't have an account?")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showEmailLogin = false
                        showSignUp = true
                    }
                }) {
                    Text("Sign Up")
                        .font(.callout)
                        .fontWeight(.semibold)
                        .foregroundColor(.accentPrimary)
                }
            }
        }
    }

    // MARK: - Sign Up Section

    private var signUpSection: some View {
        VStack(spacing: Spacing.lg) {
            // Back button
            HStack {
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showSignUp = false
                        clearFields()
                    }
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                    .font(.body)
                    .foregroundColor(.accentPrimary)
                }
                Spacer()
            }

            Text("Create Account")
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            // Full name field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Full Name")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                TextField("", text: $fullName)
                    .textFieldStyle(LitplanTextFieldStyle())
                    .textContentType(.name)
            }

            // Email field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Email")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                TextField("", text: $email)
                    .textFieldStyle(LitplanTextFieldStyle())
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
            }

            // Password field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text("Password")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                    Spacer()
                    Text("Min 8 characters")
                        .font(.caption)
                        .foregroundColor(.textTertiary)
                }

                SecureField("", text: $password)
                    .textFieldStyle(LitplanTextFieldStyle())
                    .textContentType(.newPassword)
            }

            // Sign up button
            PrimaryButton(
                title: "Create Account",
                action: {
                    Task {
                        try? await authManager.signUp(
                            email: email,
                            password: password,
                            fullName: fullName.isEmpty ? nil : fullName
                        )
                    }
                },
                isLoading: authManager.isLoading,
                isDisabled: email.isEmpty || password.count < 8
            )

            // Switch to sign in
            HStack {
                Text("Already have an account?")
                    .font(.callout)
                    .foregroundColor(.textSecondary)

                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showSignUp = false
                        showEmailLogin = true
                    }
                }) {
                    Text("Sign In")
                        .font(.callout)
                        .fontWeight(.semibold)
                        .foregroundColor(.accentPrimary)
                }
            }
        }
    }

    // MARK: - Footer Section

    private var footerSection: some View {
        VStack(spacing: Spacing.sm) {
            Text("By continuing, you agree to our")
                .font(.caption)
                .foregroundColor(.textTertiary)

            HStack(spacing: Spacing.xs) {
                Button(action: {
                    // Open Terms of Service
                    if let url = URL(string: "https://litplan.app/terms") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    Text("Terms of Service")
                        .font(.caption)
                        .foregroundColor(.accentPrimary)
                }

                Text("and")
                    .font(.caption)
                    .foregroundColor(.textTertiary)

                Button(action: {
                    // Open Privacy Policy
                    if let url = URL(string: "https://litplan.app/privacy") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    Text("Privacy Policy")
                        .font(.caption)
                        .foregroundColor(.accentPrimary)
                }
            }
        }
        .padding(.bottom, Spacing.xl)
    }

    // MARK: - Loading Overlay

    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()

            VStack(spacing: Spacing.md) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                    .scaleEffect(1.5)

                Text("Please wait...")
                    .font(.callout)
                    .foregroundColor(.textPrimary)
            }
            .padding(Spacing.xl)
            .background(Color.surfacePrimary)
            .cornerRadius(Spacing.md)
        }
    }

    // MARK: - Helper Methods

    private func clearFields() {
        email = ""
        password = ""
        fullName = ""
    }
}

// MARK: - Custom Text Field Style

struct LitplanTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.body)
            .foregroundColor(.textPrimary)
            .padding(Spacing.md)
            .background(Color.surfaceSecondary)
            .cornerRadius(Spacing.sm)
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.sm)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )
    }
}

// MARK: - Forgot Password Sheet

struct ForgotPasswordSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthenticationManager
    @Binding var email: String
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                VStack(spacing: Spacing.lg) {
                    if showSuccess {
                        // Success state
                        VStack(spacing: Spacing.md) {
                            Image(systemName: "envelope.badge.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.success)

                            Text("Check Your Email")
                                .font(.displayMedium)
                                .foregroundColor(.textPrimary)

                            Text("We've sent password reset instructions to \(email)")
                                .font(.body)
                                .foregroundColor(.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, Spacing.xxl)

                        Spacer()

                        PrimaryButton(title: "Done") {
                            dismiss()
                        }
                    } else {
                        // Email input state
                        VStack(spacing: Spacing.lg) {
                            Text("Reset Password")
                                .font(.displayMedium)
                                .foregroundColor(.textPrimary)

                            Text("Enter your email and we'll send you instructions to reset your password")
                                .font(.body)
                                .foregroundColor(.textSecondary)
                                .multilineTextAlignment(.center)

                            TextField("Email", text: $email)
                                .textFieldStyle(LitplanTextFieldStyle())
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                        }
                        .padding(.top, Spacing.xxl)

                        Spacer()

                        PrimaryButton(
                            title: "Send Reset Link",
                            action: {
                                Task {
                                    try? await authManager.resetPassword(email: email)
                                    withAnimation {
                                        showSuccess = true
                                    }
                                }
                            },
                            isLoading: authManager.isLoading,
                            isDisabled: email.isEmpty
                        )
                    }
                }
                .padding(Spacing.lg)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.accentPrimary)
                }
            }
        }
    }
}

// MARK: - Google Logo View

/// Custom Google "G" logo using SwiftUI shapes to match brand guidelines
struct GoogleLogoView: View {
    var body: some View {
        ZStack {
            // Blue section (top-right)
            Circle()
                .trim(from: 0.0, to: 0.25)
                .stroke(Color(red: 66/255, green: 133/255, blue: 244/255), style: StrokeStyle(lineWidth: 4, lineCap: .butt))

            // Green section (bottom-right)
            Circle()
                .trim(from: 0.25, to: 0.5)
                .stroke(Color(red: 52/255, green: 168/255, blue: 83/255), style: StrokeStyle(lineWidth: 4, lineCap: .butt))

            // Yellow section (bottom-left)
            Circle()
                .trim(from: 0.5, to: 0.75)
                .stroke(Color(red: 251/255, green: 188/255, blue: 5/255), style: StrokeStyle(lineWidth: 4, lineCap: .butt))

            // Red section (top-left)
            Circle()
                .trim(from: 0.75, to: 1.0)
                .stroke(Color(red: 234/255, green: 67/255, blue: 53/255), style: StrokeStyle(lineWidth: 4, lineCap: .butt))

            // Horizontal bar for the "G"
            Rectangle()
                .fill(Color(red: 66/255, green: 133/255, blue: 244/255))
                .frame(width: 8, height: 4)
                .offset(x: 3, y: 0)
        }
        .rotationEffect(.degrees(-90))
    }
}

// MARK: - Preview

#Preview("Login View") {
    LoginView()
        .environmentObject(AuthenticationManager.shared)
}

#Preview("Email Login") {
    LoginView()
        .environmentObject(AuthenticationManager.shared)
}

#Preview("Google Logo") {
    GoogleLogoView()
        .frame(width: 40, height: 40)
        .padding()
        .background(Color.white)
}
