//
//  ProfileView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Updated Sprint 8 - Connected to real Supabase data
//

import SwiftUI

struct ProfileView: View {
    // Authentication manager for user data
    @ObservedObject private var authManager = AuthenticationManager.shared
    @ObservedObject private var supabaseManager = SupabaseManager.shared
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // State for saved cities (will be fetched from API)
    @State private var savedCities: [SavedCity] = []
    @State private var isLoadingSavedCities: Bool = false
    @State private var savedCitiesError: String? = nil

    // Sheet and navigation state
    @State private var showUpgradeSheet = false
    @State private var showSignOutConfirmation = false
    @State private var isSigningOut = false
    @State private var showAccountSettings = false
    @State private var showNotificationSettings = false
    @State private var showHelpSupport = false
    @State private var showAbout = false
    @State private var showSubscriptionManagement = false

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

                        // Saved Cities Section
                        savedCitiesSection

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
            .alert("Sign Out", isPresented: $showSignOutConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    performSignOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .onAppear {
                loadSavedCities()
            }
            .refreshable {
                await refreshData()
            }
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
    }

    // MARK: - Saved Cities Section
    private var savedCitiesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section Header
            HStack {
                Text("Saved Cities")
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Spacer()

                if subscriptionTier == .pro {
                    Text("\(savedCities.count) saved")
                        .font(.callout)
                        .foregroundColor(.textTertiary)
                }
            }
            .padding(.horizontal, Spacing.md)

            // Content based on subscription tier
            if subscriptionTier == .pro {
                // Pro users see their saved cities
                if isLoadingSavedCities {
                    loadingStateCard
                        .transition(.opacity)
                } else if let error = savedCitiesError {
                    errorStateCard(message: error)
                        .transition(.opacity)
                } else if savedCities.isEmpty {
                    emptyStateCard(
                        icon: "bookmark",
                        title: "No saved cities yet",
                        description: "Cities you save will appear here"
                    )
                    .transition(.opacity)
                } else {
                    ForEach(savedCities) { city in
                        savedCityRow(city)
                    }
                    .padding(.horizontal, Spacing.md)
                    .transition(.opacity)
                }
            } else {
                // Free users see upgrade prompt
                upgradeToProCard
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isLoadingSavedCities)
    }

    // MARK: - Loading State Card
    private var loadingStateCard: some View {
        StandardCard {
            HStack(spacing: Spacing.md) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))

                Text("Loading saved cities...")
                    .font(.body)
                    .foregroundColor(.textSecondary)

                Spacer()
            }
            .padding(Spacing.lg)
        }
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Error State Card
    private func errorStateCard(message: String) -> some View {
        StandardCard {
            VStack(spacing: Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 40))
                    .foregroundColor(.warning)

                Text("Unable to load saved cities")
                    .font(.bodyLarge)
                    .foregroundColor(.textPrimary)

                Text(message)
                    .font(.callout)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)

                Button(action: { loadSavedCities() }) {
                    Text("Try Again")
                        .font(.callout)
                        .fontWeight(.medium)
                        .foregroundColor(.accentPrimary)
                }
            }
            .padding(Spacing.lg)
        }
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Saved City Row
    private func savedCityRow(_ city: SavedCity) -> some View {
        StandardCard {
            HStack(spacing: Spacing.md) {
                // City Icon
                Image(systemName: "building.2.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.accentPrimary)
                    .frame(width: 40, height: 40)
                    .background(Color.surfaceSecondary)
                    .cornerRadius(8)

                // City Info
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(city.cityName)
                        .font(.bodyLarge)
                        .foregroundColor(.textPrimary)

                    Text(city.country)
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.textTertiary)
            }
            .padding(Spacing.md)
        }
    }

    // MARK: - Upgrade to Pro Card
    private var upgradeToProCard: some View {
        StandardCard {
            VStack(spacing: Spacing.md) {
                // Pro Icon
                Image(systemName: "crown.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.accentPrimary)

                Text("Upgrade to Pro")
                    .font(.headline)
                    .foregroundColor(.textPrimary)

                Text("Save unlimited cities and access exclusive features")
                    .font(.callout)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)

                PrimaryButton(title: "Unlock Litplan Pro") {
                    showUpgradeSheet = true
                }
            }
            .padding(Spacing.md)
        }
        .padding(.horizontal, Spacing.md)
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
                    icon: "creditcard",
                    title: "Subscription Management",
                    iconColor: .accentSecondary
                ) {
                    showSubscriptionManagement = true
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
                    title: "About Litplan",
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
            }
            .buttonStyle(PlainButtonStyle())
        }
    }

    // MARK: - Empty State Card
    private func emptyStateCard(icon: String, title: String, description: String) -> some View {
        StandardCard {
            VStack(spacing: Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundColor(.textTertiary)

                Text(title)
                    .font(.bodyLarge)
                    .foregroundColor(.textPrimary)

                Text(description)
                    .font(.callout)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(Spacing.lg)
        }
        .padding(.horizontal, Spacing.md)
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

                Text("Litplan Pro")
                    .font(.displayLarge)
                    .foregroundColor(.textPrimary)

                Text("Unlock the full nightlife experience")
                    .font(.bodyLarge)
                    .foregroundColor(.textSecondary)

                // Features List
                VStack(alignment: .leading, spacing: Spacing.md) {
                    featureRow(icon: "infinity", text: "Unlimited city searches")
                    featureRow(icon: "bookmark.fill", text: "Save unlimited cities")
                    featureRow(icon: "sparkles", text: "50 plans per city")
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

                    Text("$9.99/month after trial")
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

    // MARK: - Load Saved Cities
    private func loadSavedCities() {
        guard subscriptionManager.isProUser else {
            savedCities = []
            return
        }

        isLoadingSavedCities = true
        savedCitiesError = nil

        Task {
            do {
                // Try to fetch saved cities from API
                // Note: If there's no saved cities endpoint yet, use empty array
                let cities = try await fetchSavedCitiesFromAPI()
                await MainActor.run {
                    savedCities = cities
                    isLoadingSavedCities = false
                }
            } catch {
                await MainActor.run {
                    // If API fails, show error but allow retry
                    savedCitiesError = error.localizedDescription
                    isLoadingSavedCities = false

                    // For now, if no endpoint exists, just show empty state
                    if case APIError.notFound = error {
                        savedCitiesError = nil
                        savedCities = []
                    }
                }
            }
        }
    }

    // MARK: - Fetch Saved Cities from API
    private func fetchSavedCitiesFromAPI() async throws -> [SavedCity] {
        // This would call the actual API endpoint for saved cities
        // For now, return empty array since the endpoint may not exist yet
        // The API structure would be similar to:
        // let response: SavedCitiesResponse = try await APIService.shared.request(
        //     endpoint: "\(Config.Endpoints.userProfile)/saved-cities",
        //     method: .GET,
        //     requiresAuth: true
        // )
        // return response.savedCities

        // Return empty for now - saved cities will be implemented when API endpoint is ready
        return []
    }

    // MARK: - Refresh Data
    private func refreshData() async {
        // Refresh subscription status
        await subscriptionManager.checkSubscriptionStatus()

        // Refresh user data
        await authManager.checkAuthState()

        // Reload saved cities
        loadSavedCities()
    }
}

// MARK: - Preview
#Preview("Pro User") {
    ProfileView()
}
