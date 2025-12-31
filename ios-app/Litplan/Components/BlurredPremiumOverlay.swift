//
//  BlurredPremiumOverlay.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/31/25.
//  Sprint 14: Premium gating overlay for group plan details
//

import SwiftUI

/// A blurred overlay component that prompts free users to upgrade to Pro
/// Used to obscure premium content like venue details in group plans
struct BlurredPremiumOverlay: View {
    let onUpgrade: () -> Void

    var body: some View {
        ZStack {
            // Blur effect background
            Rectangle()
                .fill(.ultraThinMaterial)
                .background(Color.appBackground.opacity(0.3))

            // Upgrade prompt content
            VStack(spacing: Spacing.md) {
                // Lock icon
                Image(systemName: "lock.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.accentPrimary)
                    .accessibilityHidden(true)

                // Title
                Text("Unlock Full Details")
                    .font(.headline)
                    .foregroundColor(.textPrimary)

                // Description
                Text("Upgrade to Pro to see venue names, pricing, and more")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.md)

                // Upgrade button
                Button(action: {
                    HapticManager.shared.medium()
                    onUpgrade()
                }) {
                    Text("Upgrade to Pro")
                        .font(.callout)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.sm)
                        .background(Color.accentPrimary)
                        .cornerRadius(Spacing.sm)
                }
                .accessibilityLabel("Upgrade to Pro")
                .accessibilityHint("Double tap to view subscription options")
            }
            .padding(Spacing.lg)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Premium content locked")
        .accessibilityHint("Upgrade to Pro to unlock full venue details")
    }
}

/// A compact version of the premium overlay for smaller spaces
struct CompactPremiumOverlay: View {
    let onUpgrade: () -> Void

    var body: some View {
        ZStack {
            // Blur effect background
            Rectangle()
                .fill(.ultraThinMaterial)
                .background(Color.appBackground.opacity(0.3))

            // Compact upgrade prompt
            HStack(spacing: Spacing.sm) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.accentPrimary)
                    .accessibilityHidden(true)

                Text("Unlock with Pro")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.textPrimary)

                Button(action: {
                    HapticManager.shared.medium()
                    onUpgrade()
                }) {
                    Text("Upgrade")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color.accentPrimary)
                        .cornerRadius(6)
                }
            }
            .padding(Spacing.md)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Premium content locked")
        .accessibilityHint("Upgrade to Pro to unlock")
    }
}

// MARK: - Previews

#Preview("BlurredPremiumOverlay") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            // Sample content behind overlay
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Brooklyn Brewery")
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                Text("79 N 11th St, Brooklyn, NY")
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
                Text("$80-120 estimated")
                    .font(.caption)
                    .foregroundColor(.textTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
        .padding()
        .blur(radius: 6)

        BlurredPremiumOverlay {
            print("Upgrade tapped")
        }
    }
}

#Preview("CompactPremiumOverlay") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        VStack {
            Text("Some premium content here")
                .foregroundColor(.textPrimary)
        }
        .frame(height: 100)
        .frame(maxWidth: .infinity)
        .background(Color.surfacePrimary)
        .blur(radius: 4)

        CompactPremiumOverlay {
            print("Upgrade tapped")
        }
        .frame(height: 100)
    }
    .padding()
}
