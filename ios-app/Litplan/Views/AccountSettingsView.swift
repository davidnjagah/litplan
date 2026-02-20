//
//  AccountSettingsView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/30/25.
//  Account settings view - Sprint 8 implementation
//

import SwiftUI

struct AccountSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var authManager = AuthenticationManager.shared
    @ObservedObject private var supabaseManager = SupabaseManager.shared

    @State private var displayName: String = ""
    @State private var isEditing: Bool = false
    @State private var isSaving: Bool = false
    @State private var showSaveSuccess: Bool = false
    @State private var errorMessage: String?
    @State private var showDeleteConfirmation: Bool = false
    @State private var showDeleteFinalConfirmation: Bool = false
    @State private var isDeleting: Bool = false
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: Spacing.xl) {
                        // Profile Section
                        profileSection

                        // Account Info Section
                        accountInfoSection

                        // Legal Section
                        legalSection

                        // Danger Zone
                        dangerZoneSection

                        Spacer()
                            .frame(height: Spacing.xl)
                    }
                    .padding(.top, Spacing.lg)
                }
            }
            .navigationTitle("Account Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.accentPrimary)
                }

                if isEditing {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Save") {
                            saveProfile()
                        }
                        .foregroundColor(.accentPrimary)
                        .disabled(isSaving)
                    }
                }
            }
            .onAppear {
                loadUserData()
            }
            .alert("Saved", isPresented: $showSaveSuccess) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Your profile has been updated.")
            }
        }
    }

    // MARK: - Profile Section

    private var profileSection: some View {
        VStack(spacing: Spacing.md) {
            // Profile Photo
            ZStack {
                Circle()
                    .fill(Color.surfacePrimary)
                    .frame(width: 100, height: 100)

                Image(systemName: "person.circle.fill")
                    .font(.system(size: 100))
                    .foregroundColor(.accentPrimary)
            }

            // Edit Name Field
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Display Name")
                    .font(.caption)
                    .foregroundColor(.textSecondary)

                TextField("Enter your name", text: $displayName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .onChange(of: displayName) {
                        isEditing = true
                    }
            }
            .padding(.horizontal, Spacing.md)
        }
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Account Info Section

    private var accountInfoSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Account Information")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                // Email (read-only)
                accountInfoRow(
                    label: "Email",
                    value: supabaseManager.currentUser?.email ?? authManager.currentUser?.email ?? "Not available"
                )

                // User ID
                accountInfoRow(
                    label: "User ID",
                    value: String((supabaseManager.currentUser?.id ?? authManager.currentUser?.id ?? "N/A").prefix(8)) + "..."
                )

                // Member Since
                if let createdAt = supabaseManager.currentUser?.createdAt {
                    accountInfoRow(
                        label: "Member Since",
                        value: formatDate(createdAt)
                    )
                }

                // Auth Provider
                if let provider = supabaseManager.currentUser?.userMetadata?.provider {
                    accountInfoRow(
                        label: "Sign-in Method",
                        value: provider.capitalized
                    )
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private func accountInfoRow(label: String, value: String) -> some View {
        StandardCard {
            HStack {
                Text(label)
                    .font(.body)
                    .foregroundColor(.textSecondary)

                Spacer()

                Text(value)
                    .font(.body)
                    .foregroundColor(.textPrimary)
            }
            .padding(Spacing.md)
        }
    }

    // MARK: - Legal Section

    private var legalSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Legal")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                // Privacy Policy
                Link(destination: URL(string: "https://litplanz.com/privacy")!) {
                    StandardCard {
                        HStack {
                            Image(systemName: "hand.raised.fill")
                                .font(.body)
                                .foregroundColor(.accentPrimary)

                            Text("Privacy Policy")
                                .font(.body)
                                .foregroundColor(.textPrimary)

                            Spacer()

                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.textTertiary)
                        }
                        .padding(Spacing.md)
                    }
                }

                // Terms of Service
                Link(destination: URL(string: "https://litplanz.com/terms")!) {
                    StandardCard {
                        HStack {
                            Image(systemName: "doc.text.fill")
                                .font(.body)
                                .foregroundColor(.accentPrimary)

                            Text("Terms of Service")
                                .font(.body)
                                .foregroundColor(.textPrimary)

                            Spacer()

                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.textTertiary)
                        }
                        .padding(Spacing.md)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Danger Zone Section

    private var dangerZoneSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Danger Zone")
                .font(.headline)
                .foregroundColor(.error)
                .padding(.horizontal, Spacing.md)

            StandardCard {
                VStack(spacing: Spacing.md) {
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text("Delete Account")
                                .font(.body)
                                .foregroundColor(.textPrimary)

                            Text("Permanently delete your account and all data")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }

                        Spacer()

                        Button(action: {
                            showDeleteConfirmation = true
                        }) {
                            if isDeleting {
                                ProgressView()
                                    .tint(.error)
                            } else {
                                Text("Delete")
                                    .font(.callout)
                                    .foregroundColor(.error)
                            }
                        }
                        .disabled(isDeleting)
                    }

                    if let deleteError {
                        Text(deleteError)
                            .font(.caption)
                            .foregroundColor(.error)
                    }
                }
                .padding(Spacing.md)
            }
            .padding(.horizontal, Spacing.md)
        }
        .alert("Delete Account?", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Continue", role: .destructive) {
                showDeleteFinalConfirmation = true
            }
        } message: {
            Text("This will permanently delete your account, saved cities, viewing history, and all associated data. This action cannot be undone.")
        }
        .alert("Are you sure?", isPresented: $showDeleteFinalConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete My Account", role: .destructive) {
                performAccountDeletion()
            }
        } message: {
            Text("Your account and all data will be permanently deleted. You will be signed out immediately.")
        }
    }

    // MARK: - Account Deletion

    private func performAccountDeletion() {
        isDeleting = true
        deleteError = nil

        Task {
            do {
                try await APIService.shared.deleteAccount()

                await MainActor.run {
                    isDeleting = false
                    dismiss()
                }

                // Sign out after dismissing the settings sheet
                await authManager.signOut()
            } catch {
                await MainActor.run {
                    isDeleting = false
                    deleteError = "Failed to delete account. Please try again."
                }
            }
        }
    }

    // MARK: - Helper Methods

    private func loadUserData() {
        if let fullName = supabaseManager.currentUser?.userMetadata?.fullName {
            displayName = fullName
        } else if let user = authManager.currentUser {
            displayName = user.userMetadata?.fullName ?? ""
        }
        isEditing = false
    }

    private func saveProfile() {
        isSaving = true

        Task {
            do {
                let profileUpdate = UserProfileUpdate(fullName: displayName, avatarUrl: nil)
                _ = try await APIService.shared.updateUserProfile(profileUpdate)

                await MainActor.run {
                    isSaving = false
                    isEditing = false
                    showSaveSuccess = true
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

#Preview {
    AccountSettingsView()
}
