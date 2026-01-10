//
//  StandardCard.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Standard card component with surface primary background
//

import SwiftUI

struct StandardCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .background(Color.surfacePrimary)
            .cornerRadius(Spacing.sm)
            .shadow(
                color: Color.black.opacity(0.3),
                radius: 8,
                x: 0,
                y: 4
            )
    }
}

// MARK: - Preview
#Preview("Basic Card") {
    VStack(spacing: Spacing.md) {
        StandardCard {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Plan Title")
                    .font(.headline)
                    .foregroundColor(.textPrimary)

                Text("Venue Name")
                    .font(.body)
                    .foregroundColor(.textSecondary)

                Text("Entry: $20")
                    .font(.callout)
                    .foregroundColor(.accentPrimary)
            }
            .padding(Spacing.md)
        }

        StandardCard {
            HStack(spacing: Spacing.md) {
                // Image placeholder
                RoundedRectangle(cornerRadius: Spacing.xs)
                    .fill(Color.surfaceSecondary)
                    .frame(width: 80, height: 80)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("Blue Note Jazz Club")
                        .font(.bodyLarge)
                        .foregroundColor(.textPrimary)

                    Text("Greenwich Village")
                        .font(.callout)
                        .foregroundColor(.textSecondary)

                    Text("Tonight at 9:00 PM")
                        .font(.caption)
                        .foregroundColor(.textTertiary)
                }

                Spacer()
            }
            .padding(Spacing.md)
        }
    }
    .padding(Spacing.md)
    .background(Color.appBackground)
}

#Preview("Card Variations") {
    ScrollView {
        VStack(spacing: Spacing.md) {
            // Small card
            StandardCard {
                Text("Small Card")
                    .font(.body)
                    .foregroundColor(.textPrimary)
                    .padding(Spacing.sm)
            }

            // Medium card
            StandardCard {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Medium Card")
                        .font(.headline)
                        .foregroundColor(.textPrimary)

                    Text("With multiple lines of content")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.md)
            }

            // Large card with image
            StandardCard {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    RoundedRectangle(cornerRadius: Spacing.xs)
                        .fill(Color.surfaceSecondary)
                        .frame(height: 140)

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Large Card")
                            .font(.headline)
                            .foregroundColor(.textPrimary)

                        Text("The Roof at PUBLIC")
                            .font(.body)
                            .foregroundColor(.textSecondary)

                        HStack {
                            Text("Rooftop Bar")
                                .font(.caption)
                                .foregroundColor(.textTertiary)
                                .padding(.horizontal, Spacing.xs)
                                .padding(.vertical, Spacing.xxs)
                                .background(Color.surfaceSecondary)
                                .cornerRadius(Spacing.xs)

                            Text("Lower East Side")
                                .font(.caption)
                                .foregroundColor(.textTertiary)
                                .padding(.horizontal, Spacing.xs)
                                .padding(.vertical, Spacing.xxs)
                                .background(Color.surfaceSecondary)
                                .cornerRadius(Spacing.xs)
                        }
                    }
                    .padding(Spacing.sm)
                }
            }

            // Card with button
            StandardCard {
                VStack(spacing: Spacing.md) {
                    Text("Upgrade to Pro")
                        .font(.headline)
                        .foregroundColor(.textPrimary)

                    Text("Unlock 50 plans per city and premium features")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)

                    PrimaryButton(title: "Start Free Trial", action: {})
                }
                .padding(Spacing.md)
            }
        }
        .padding(Spacing.md)
    }
    .background(Color.appBackground)
}
