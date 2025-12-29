//
//  ProfileView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Profile tab - Sprint 2, Day 10 implementation
//

import SwiftUI

struct ProfileView: View {
    // Mock user - in production, this would come from UserService
    @State private var user: User = User.mockPro
    @State private var savedCities: [SavedCity] = SavedCity.mockSavedCities
    @State private var showUpgradeSheet = false

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

                if let photoURL = user.profilePhotoURL {
                    // In production, use AsyncImage to load from URL
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 100))
                        .foregroundColor(.accentPrimary)
                } else {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 100))
                        .foregroundColor(.accentPrimary)
                }
            }
            .accessibilityLabel("Profile photo")

            // User Name
            Text(user.name)
                .font(.displayMedium)
                .foregroundColor(.textPrimary)

            // Email
            Text(user.email)
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
            Image(systemName: user.subscriptionTier.badgeIcon)
                .font(.system(size: 14))
                .foregroundColor(user.subscriptionTier.badgeColor)
                .accessibilityHidden(true)

            Text(user.subscriptionTier.displayName)
                .font(.callout)
                .fontWeight(.semibold)
                .foregroundColor(user.subscriptionTier.badgeColor)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.xs)
        .background(
            user.subscriptionTier == .pro
                ? Color.accentPrimary.opacity(0.15)
                : Color.surfaceSecondary
        )
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(user.subscriptionTier.badgeColor.opacity(0.3), lineWidth: 1)
        )
        .accessibilityLabel("Subscription: \(user.subscriptionTier.displayName)")
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

                if user.subscriptionTier == .pro {
                    Text("\(savedCities.count) saved")
                        .font(.callout)
                        .foregroundColor(.textTertiary)
                }
            }
            .padding(.horizontal, Spacing.md)

            // Content based on subscription tier
            if user.subscriptionTier == .pro {
                // Pro users see their saved cities
                if savedCities.isEmpty {
                    emptyStateCard(
                        icon: "bookmark",
                        title: "No saved cities yet",
                        description: "Cities you save will appear here"
                    )
                } else {
                    ForEach(savedCities) { city in
                        savedCityRow(city)
                    }
                    .padding(.horizontal, Spacing.md)
                }
            } else {
                // Free users see upgrade prompt
                upgradeToProCard
            }
        }
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
                    print("Navigate to Account Settings")
                }

                settingsRow(
                    icon: "creditcard",
                    title: "Subscription Management",
                    iconColor: .accentSecondary
                ) {
                    print("Navigate to Subscription Management")
                }

                settingsRow(
                    icon: "bell.badge",
                    title: "Notifications",
                    iconColor: .warning
                ) {
                    print("Navigate to Notifications")
                }

                settingsRow(
                    icon: "questionmark.circle",
                    title: "Help & Support",
                    iconColor: .textSecondary
                ) {
                    print("Navigate to Help & Support")
                }

                settingsRow(
                    icon: "info.circle",
                    title: "About Litplan",
                    iconColor: .textSecondary
                ) {
                    print("Navigate to About")
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
                        print("Start free trial")
                        showUpgradeSheet = false
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
}

// MARK: - Preview
#Preview("Pro User") {
    ProfileView()
}
