//
//  ProfileView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Updated Sprint 8 - Connected to real Supabase data
//  Updated Sprint 13 - Removed Saved Cities (moved to MyPlansView/Saved tab)
//

import SwiftUI

struct ProfileView: View {
    // Authentication manager for user data
    @ObservedObject private var authManager = AuthenticationManager.shared
    @ObservedObject private var supabaseManager = SupabaseManager.shared
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // Sheet and navigation state
    @State private var showUpgradeSheet = false
    @State private var showSignOutConfirmation = false
    @State private var isSigningOut = false
    @State private var showAccountSettings = false
    @State private var showNotificationSettings = false
    @State private var showHelpSupport = false
    @State private var showAbout = false
    @State private var showSubscriptionManagement = false
    @State private var showGeneratedVibezHistory = false
    @State private var showVibezPaywall = false
    @State private var isRestoring = false
    @State private var showRestoreResult = false
    @State private var restoreResultMessage = ""

    // Computed properties for user data
    private var userName: String {
        if let fullName = supabaseManager.currentUser?.userMetadata?.fullName, !fullName.isEmpty {
            return fullName
        }
        if let email = supabaseManager.currentUser?.email ?? authManager.currentUser?.email {
            return email.components(separatedBy: "@").first ?? "User"
        }
        return "User"
    }

    private var userEmail: String {
        return supabaseManager.currentUser?.email ?? authManager.currentUser?.email ?? "Not signed in"
    }

    private var userPhotoURL: String? {
        return supabaseManager.currentUser?.userMetadata?.avatarUrl
    }

    private var subscriptionTier: SubscriptionTier {
        return subscriptionManager.isProUser ? .pro : .free
    }

    private var isAuthenticated: Bool {
        return authManager.isAuthenticated
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: Spacing.xl) {
                        // Profile Header
                        profileHeader

                        // Settings Section
                        settingsSection

                        // Sign Out Section
                        signOutSection

                        // Bottom padding
                        Spacer()
                            .frame(height: Spacing.xl)
                    }
                    .padding(.top, Spacing.lg)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showUpgradeSheet) {
                upgradeSheet
            }
            .sheet(isPresented: $showAccountSettings) {
                AccountSettingsView()
            }
            .sheet(isPresented: $showNotificationSettings) {
                NotificationsSettingsView()
            }
            .sheet(isPresented: $showHelpSupport) {
                HelpSupportView()
            }
            .sheet(isPresented: $showAbout) {
                AboutView()
            }
            .sheet(isPresented: $showSubscriptionManagement) {
                PaywallView(trigger: .profile)
            }
            .sheet(isPresented: $showVibezPaywall) {
                PaywallView(trigger: .profile)
            }
            .sheet(isPresented: $showGeneratedVibezHistory) {
                GeneratedVibezView()
            }
            .alert("Restore Purchases", isPresented: $showRestoreResult) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(restoreResultMessage)
            }
            .alert("Sign Out", isPresented: $showSignOutConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    performSignOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .refreshable {
                await refreshData()
            }
            .onAppear {
                print("[ProfileView] 🚀 onAppear")
                print("[ProfileView] 📊 User - isAuthenticated: \(authManager.isAuthenticated), isGuest: \(authManager.isGuest)")
                print("[ProfileView] 📊 Subscription - tier: \(subscriptionTier), isProUser: \(subscriptionManager.isProUser)")
            }
            // Note: Pro status is managed centrally by SubscriptionManager
            // Views should read cached isProUser state, not call refresh on every onAppear
        }
    }

    // MARK: - Profile Header
    private var profileHeader: some View {
        VStack(spacing: Spacing.md) {
            // Profile Photo
            ZStack {
                Circle()
                    .fill(Color.surfacePrimary)
                    .frame(width: 100, height: 100)

                if let photoURL = userPhotoURL, let url = URL(string: photoURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            ProgressView()
                                .frame(width: 100, height: 100)
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                        case .failure:
                            Image(systemName: "person.circle.fill")
                                .font(.system(size: 100))
                                .foregroundColor(.accentPrimary)
                        @unknown default:
                            Image(systemName: "person.circle.fill")
                                .font(.system(size: 100))
                                .foregroundColor(.accentPrimary)
                        }
                    }
                } else {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 100))
                        .foregroundColor(.accentPrimary)
                }
            }
            .accessibilityLabel("Profile photo")

            // User Name
            Text(userName)
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            // Email
            Text(userEmail)
                .font(.body)
                .foregroundColor(.textSecondary)

            // Subscription Badge
            subscriptionBadge
        }
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Subscription Badge
    private var subscriptionBadge: some View {
        VStack(spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: subscriptionTier.badgeIcon)
                    .font(.system(size: 14))
                    .foregroundColor(subscriptionTier.badgeColor)
                    .accessibilityHidden(true)

                Text(subscriptionTier.displayName)
                    .font(.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(subscriptionTier.badgeColor)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.xs)
            .background(
                subscriptionTier == .pro
                    ? Color.accentPrimary.opacity(0.15)
                    : Color.surfaceSecondary
            )
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(subscriptionTier.badgeColor.opacity(0.3), lineWidth: 1)
            )
            .accessibilityLabel("Subscription: \(subscriptionTier.displayName)")

            // Upgrade to Pro button - only shown for free tier users
            if subscriptionTier == .free {
                upgradeToProButton
            }
        }
    }

    // MARK: - Upgrade to Pro Button
    private var upgradeToProButton: some View {
        Button(action: {
            HapticManager.shared.light()
            showSubscriptionManagement = true
        }) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "crown.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.textPrimary)

                Text("Upgrade to Pro")
                    .font(.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.sm)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.accentPrimary, Color.accentSecondary]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(20)
            .shadow(color: Color.accentPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("Upgrade to Pro")
        .accessibilityHint("Opens subscription options to upgrade your account")
    }

    // MARK: - Restore Purchases

    /// Restore the user's App Store subscription (re-syncs entitlement + records it server-side).
    private func handleRestorePurchases() {
        guard !isRestoring else { return }
        HapticManager.shared.light()
        isRestoring = true
        Task {
            defer { isRestoring = false }
            do {
                try await subscriptionManager.restorePurchases()
                restoreResultMessage = subscriptionManager.isProUser
                    ? "Your subscription has been restored."
                    : "No active subscription found for this Apple ID."
            } catch {
                restoreResultMessage = subscriptionManager.errorMessage
                    ?? "We couldn't restore your purchases. Please try again."
            }
            showRestoreResult = true
        }
    }

    // MARK: - Settings Section
    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section Header
            Text("Settings")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)
                .accessibilityAddTraits(.isHeader)

            VStack(spacing: Spacing.sm) {
                settingsRow(
                    icon: "person.crop.circle",
                    title: "Account Settings",
                    iconColor: .accentPrimary
                ) {
                    showAccountSettings = true
                }

                settingsRow(
                    icon: "bolt.fill",
                    title: "Generated Vibez",
                    iconColor: .accentPrimary
                ) {
                    if subscriptionManager.isProUser {
                        showGeneratedVibezHistory = true
                    } else {
                        showVibezPaywall = true
                    }
                }

                settingsRow(
                    icon: "arrow.clockwise",
                    title: isRestoring ? "Restoring…" : "Restore Purchases",
                    iconColor: .accentSecondary
                ) {
                    handleRestorePurchases()
                }

                settingsRow(
                    icon: "bell.badge",
                    title: "Notifications",
                    iconColor: .warning
                ) {
                    showNotificationSettings = true
                }

                settingsRow(
                    icon: "questionmark.circle",
                    title: "Help & Support",
                    iconColor: .textSecondary
                ) {
                    showHelpSupport = true
                }

                settingsRow(
                    icon: "info.circle",
                    title: "About LitPlanz",
                    iconColor: .textSecondary
                ) {
                    showAbout = true
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Settings Row
    private func settingsRow(
        icon: String,
        title: String,
        iconColor: Color,
        action: @escaping () -> Void
    ) -> some View {
        StandardCard {
            Button(action: action) {
                HStack(spacing: Spacing.md) {
                    // Icon
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(iconColor)
                        .frame(width: 32, height: 32)

                    // Title
                    Text(title)
                        .font(.body)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    // Chevron
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(.textTertiary)
                }
                .padding(Spacing.md)
                .contentShape(Rectangle())
            }
            .buttonStyle(PlainButtonStyle())
        }
    }

    // MARK: - Upgrade Sheet
    private var upgradeSheet: some View {
        ZStack {
            Color.appBackground
                .ignoresSafeArea()

            VStack(spacing: Spacing.xl) {
                // Header
                HStack {
                    Spacer()
                    Button(action: { showUpgradeSheet = false }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.textTertiary)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.md)

                Spacer()

                // Pro Icon
                Image(systemName: "crown.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.accentPrimary)

                Text("LitPlanz Pro")
                    .font(.displayLarge)
                    .foregroundColor(.textPrimary)

                Text("Unlock the full nightlife experience")
                    .font(.bodyLarge)
                    .foregroundColor(.textSecondary)

                // Features List
                VStack(alignment: .leading, spacing: Spacing.md) {
                    featureRow(icon: "globe.americas.fill", text: "100+ cities worldwide")
                    featureRow(icon: "sparkles", text: "50 plans per city")
                    featureRow(icon: "bookmark.fill", text: "Save your favorite cities")
                    featureRow(icon: "star.fill", text: "Exclusive venues & events")
                    featureRow(icon: "person.3.fill", text: "Advanced group planning")
                }
                .padding(.horizontal, Spacing.xl)

                Spacer()

                // CTA Button
                VStack(spacing: Spacing.sm) {
                    PrimaryButton(title: "Start Free Trial") {
                        showUpgradeSheet = false
                        showSubscriptionManagement = true
                    }

                    Text("$4.99/month or $39.99/year")
                        .font(.caption)
                        .foregroundColor(.textTertiary)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }
        }
    }

    // MARK: - Feature Row
    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.accentPrimary)
                .frame(width: 24)

            Text(text)
                .font(.bodyLarge)
                .foregroundColor(.textPrimary)

            Spacer()
        }
    }

    // MARK: - Sign Out Section
    private var signOutSection: some View {
        VStack(spacing: Spacing.md) {
            Button(action: {
                showSignOutConfirmation = true
            }) {
                HStack(spacing: Spacing.md) {
                    if isSigningOut {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .error))
                            .frame(width: 20, height: 20)
                    } else {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 20))
                            .foregroundColor(.error)
                    }

                    Text(isSigningOut ? "Signing Out..." : "Sign Out")
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(.error)

                    Spacer()
                }
                .padding(Spacing.md)
                .background(Color.surfacePrimary)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.error.opacity(0.3), lineWidth: 1)
                )
            }
            .buttonStyle(PlainButtonStyle())
            .disabled(isSigningOut)
            .accessibilityLabel("Sign out of your account")
            .accessibilityHint("Double tap to sign out")
        }
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Perform Sign Out
    private func performSignOut() {
        isSigningOut = true
        Task {
            await authManager.signOut()
            isSigningOut = false
        }
    }

    // MARK: - Refresh Data
    private func refreshData() async {
        // Refresh subscription status
        await subscriptionManager.checkSubscriptionStatus()

        // Refresh user data
        await authManager.checkAuthState()
    }
}

// MARK: - Preview
#Preview("Pro User") {
    ProfileView()
}
