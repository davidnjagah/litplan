//
//  AboutView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/30/25.
//  About LitPlanz view - Sprint 8 implementation
//

import SwiftUI

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: Spacing.xl) {
                        // App Logo & Name
                        appHeaderSection

                        // Version Info
                        versionSection

                        // About Section
                        aboutTextSection

                        // Team Section
                        teamSection

                        // Legal Section
                        legalSection

                        // Footer
                        footerSection

                        Spacer()
                            .frame(height: Spacing.xl)
                    }
                    .padding(.top, Spacing.lg)
                }
            }
            .navigationTitle("About LitPlanz")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.accentPrimary)
                }
            }
        }
    }

    // MARK: - App Header Section

    private var appHeaderSection: some View {
        VStack(spacing: Spacing.md) {
            // App Icon Placeholder
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: [.accentPrimary, .accentSecondary],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)

                Image(systemName: "moon.stars.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.white)
            }

            Text("LitPlanz")
                .font(.displayLarge)
                .foregroundColor(.textPrimary)

            Text("Your Nightlife Companion")
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)
        }
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Version Section

    private var versionSection: some View {
        VStack(spacing: Spacing.sm) {
            StandardCard {
                VStack(spacing: Spacing.sm) {
                    infoRow(label: "Version", value: Config.appVersion)

                    Divider()
                        .background(Color.surfaceSecondary)

                    infoRow(label: "Build", value: Config.buildNumber)

                    Divider()
                        .background(Color.surfaceSecondary)

                    infoRow(label: "Platform", value: "iOS \(Config.minimumIOSVersion)+")
                }
                .padding(Spacing.md)
            }
        }
        .padding(.horizontal, Spacing.md)
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.body)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.body)
                .foregroundColor(.textPrimary)
        }
    }

    // MARK: - About Text Section

    private var aboutTextSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Our Mission")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            StandardCard {
                Text("LitPlanz is your ultimate guide to nightlife around the world. We curate the best venues, events, and experiences so you can discover amazing nights out wherever you are.\n\nOur team of local experts and AI-powered recommendations help you find the perfect plan for any occasion, whether you're looking for a quiet cocktail bar or the hottest club in town.")
                    .font(.body)
                    .foregroundColor(.textSecondary)
                    .lineSpacing(4)
                    .padding(Spacing.md)
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Team Section

    private var teamSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("The Team")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            StandardCard {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Built with love by the LitPlanz team")
                        .font(.body)
                        .foregroundColor(.textPrimary)

                    Text("We're a passionate group of nightlife enthusiasts, developers, and designers dedicated to helping you have unforgettable experiences.")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }
                .padding(Spacing.md)
            }
            .padding(.horizontal, Spacing.md)
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
                legalRow(title: "Terms of Service") {
                    if let url = URL(string: "https://www.litplanz.com/terms") {
                        UIApplication.shared.open(url)
                    }
                }

                legalRow(title: "Privacy Policy") {
                    if let url = URL(string: "https://www.litplanz.com/privacy") {
                        UIApplication.shared.open(url)
                    }
                }

                legalRow(title: "Open Source Licenses") {
                    if let url = URL(string: "https://www.litplanz.com/licenses") {
                        UIApplication.shared.open(url)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private func legalRow(title: String, action: @escaping () -> Void) -> some View {
        StandardCard {
            Button(action: action) {
                HStack {
                    Text(title)
                        .font(.body)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 14))
                        .foregroundColor(.textTertiary)
                }
                .padding(Spacing.md)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }

    // MARK: - Footer Section

    private var footerSection: some View {
        VStack(spacing: Spacing.sm) {
            Text("Made with love for nightlife lovers everywhere")
                .font(.caption)
                .foregroundColor(.textTertiary)

            Text("\u{00A9} 2024-2025 LitPlanz Inc. All rights reserved.")
                .font(.caption)
                .foregroundColor(.textTertiary)
        }
        .multilineTextAlignment(.center)
        .padding(.horizontal, Spacing.md)
    }
}

#Preview {
    AboutView()
}
