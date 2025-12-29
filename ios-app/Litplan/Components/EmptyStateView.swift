//
//  EmptyStateView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 16 - Reusable empty state component for various scenarios
//

import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let ctaText: String?
    let ctaAction: (() -> Void)?

    init(
        icon: String = "building.2.crop.circle",
        title: String,
        message: String,
        ctaText: String? = nil,
        ctaAction: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.ctaText = ctaText
        self.ctaAction = ctaAction
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 80, weight: .light))
                .foregroundColor(.textTertiary)
                .padding(.top, Spacing.xxl)
                .accessibilityHidden(true)

            // Text content
            VStack(spacing: Spacing.xs) {
                Text(title)
                    .font(.displayMedium)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)

                Text(message)
                    .font(.bodyLarge)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Optional CTA button
            if let ctaText = ctaText, let ctaAction = ctaAction {
                Button(action: {
                    HapticManager.shared.light()
                    ctaAction()
                }) {
                    Text(ctaText)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(Color.accentPrimary)
                        .cornerRadius(12)
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.md)
                .accessibilityLabel(ctaText)
                .accessibilityAddTraits(.isButton)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(title)
        .accessibilityHint(message)
    }
}

// MARK: - Preview
#Preview("No Plans Available") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        EmptyStateView(
            icon: "calendar.badge.clock",
            title: "No Plans Available",
            message: "Check back soon! Fresh nightlife plans are generated every Monday.",
            ctaText: "Explore Other Cities",
            ctaAction: {
                print("Navigate to explore")
            }
        )
    }
}

#Preview("No Cities Viewed") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        EmptyStateView(
            icon: "building.2.crop.circle",
            title: "No Cities Viewed Yet",
            message: "Start exploring cities to see your viewing history here"
        )
    }
}

#Preview("No Saved Cities") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        EmptyStateView(
            icon: "star.circle",
            title: "No Saved Cities",
            message: "Save your favorite cities for quick access",
            ctaText: "Browse Cities",
            ctaAction: {
                print("Navigate to browse")
            }
        )
    }
}

#Preview("No Search Results") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        EmptyStateView(
            icon: "magnifyingglass.circle",
            title: "No Results Found",
            message: "Try searching for another city or check your spelling",
            ctaText: "Clear Search",
            ctaAction: {
                print("Clear search")
            }
        )
    }
}
