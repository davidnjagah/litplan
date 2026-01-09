//
//  PlanListItem.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/31/25.
//  Sprint 17E: Modern text-focused plan list item (no images)
//

import SwiftUI

/// A modern, text-focused plan list item component
/// Designed for clean, scannable list layouts without images
struct PlanListItem: View {
    let plan: Plan
    let showRank: Bool
    let rank: Int?

    @State private var isFavorited: Bool = false

    init(plan: Plan, showRank: Bool = false, rank: Int? = nil) {
        self.plan = plan
        self.showRank = showRank
        self.rank = rank
    }

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            // Left: Timeline indicator
            VStack(spacing: Spacing.xxs) {
                // Time badge
                Text(plan.schedule.startTime)
                    .font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .foregroundColor(.accentPrimary)

                // Vertical line connector
                Rectangle()
                    .fill(Color.surfaceSecondary)
                    .frame(width: 2)
                    .frame(maxHeight: .infinity)
            }
            .frame(width: 50)

            // Right: Plan content
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Header row: Title + Rank badge (if applicable)
                HStack(alignment: .top, spacing: Spacing.xs) {
                    // Rank badge for top plans
                    if showRank, let rank = rank, rank <= 3 {
                        Text("Top \(rank)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.appBackground)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(
                                Capsule()
                                    .fill(Color.accentPrimary)
                            )
                    }

                    Text(plan.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)

                    Spacer()

                    // Favorite button
                    Button(action: {
                        isFavorited.toggle()
                        HapticManager.shared.light()
                    }) {
                        Image(systemName: isFavorited ? "heart.fill" : "heart")
                            .font(.system(size: 16))
                            .foregroundColor(isFavorited ? .accentPrimary : .textTertiary)
                    }
                    .buttonStyle(PlainButtonStyle())
                }

                // Venue name with location pin
                HStack(spacing: Spacing.xxs) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)

                    Text(plan.venueName)
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)

                    // Neighborhood tag
                    Text(plan.location.neighborhood)
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.surfaceSecondary.opacity(0.6))
                        .cornerRadius(4)
                }

                // Duration and category info
                HStack(spacing: Spacing.sm) {
                    // Time range
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)

                        Text("\(plan.schedule.startTime) - \(plan.schedule.endTime)")
                            .font(.system(size: 12))
                            .foregroundColor(.textSecondary)
                    }

                    // Separator
                    Circle()
                        .fill(Color.textTertiary)
                        .frame(width: 3, height: 3)

                    // Category
                    Text(plan.category)
                        .font(.system(size: 12))
                        .foregroundColor(.textSecondary)
                }

                // Price and tags row
                HStack(spacing: Spacing.sm) {
                    // Price indicator
                    priceIndicator

                    // Age restriction if applicable
                    if let age = plan.flags.ageRestriction {
                        Text("\(age)+")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.textTertiary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.surfaceSecondary)
                            .cornerRadius(4)
                    }

                    // Reservation required indicator
                    if plan.flags.requiresReservation {
                        HStack(spacing: 2) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 9))
                            Text("RSVP")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(.warning)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.warning.opacity(0.15))
                        .cornerRadius(4)
                    }

                    Spacer()

                    // Price range indicator
                    Text(plan.pricing.priceRange)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, Spacing.md)
        .padding(.horizontal, Spacing.sm)
        .background(Color.surfacePrimary)
        .contentShape(Rectangle())
    }

    // MARK: - Price Indicator

    private var priceIndicator: some View {
        Group {
            if plan.pricing.entryFee > 0 {
                HStack(spacing: 4) {
                    Text(plan.pricing.currency)
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)
                    Text(String(format: "%.0f", plan.pricing.entryFee))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.accentPrimary)
                    Text("entry")
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)
                }
            } else {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 11))
                        .foregroundColor(.success)
                    Text("Free Entry")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.success)
                }
            }
        }
    }
}

// MARK: - Compact Variant

/// A more compact version of PlanListItem for tighter layouts
struct CompactPlanListItem: View {
    let plan: Plan

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Time
            Text(plan.schedule.startTime)
                .font(.system(size: 13, weight: .medium, design: .monospaced))
                .foregroundColor(.accentPrimary)
                .frame(width: 45, alignment: .leading)

            // Vertical divider
            Rectangle()
                .fill(Color.surfaceSecondary)
                .frame(width: 2, height: 40)

            // Content
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(plan.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .lineLimit(1)

                HStack(spacing: Spacing.xs) {
                    Text(plan.venueName)
                        .font(.system(size: 13))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)

                    if plan.pricing.entryFee > 0 {
                        Text("\(plan.pricing.currency) \(String(format: "%.0f", plan.pricing.entryFee))")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.accentPrimary)
                    } else {
                        Text("Free")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.success)
                    }
                }
            }

            Spacer()

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.textTertiary)
        }
        .padding(.vertical, Spacing.sm)
        .padding(.horizontal, Spacing.md)
        .background(Color.surfacePrimary)
        .contentShape(Rectangle())
    }
}

// MARK: - Preview

#Preview("PlanListItem") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        ScrollView {
            VStack(spacing: 1) {
                PlanListItem(plan: Plan.sampleBlueNote, showRank: true, rank: 1)

                Divider()
                    .background(Color.surfaceSecondary)

                PlanListItem(plan: Plan.sampleTheRoof, showRank: true, rank: 2)

                Divider()
                    .background(Color.surfaceSecondary)

                PlanListItem(plan: Plan.sampleLeBain)
            }
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .padding()
        }
    }
}

#Preview("CompactPlanListItem") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        VStack(spacing: 1) {
            CompactPlanListItem(plan: Plan.sampleBlueNote)

            Divider()
                .background(Color.surfaceSecondary)

            CompactPlanListItem(plan: Plan.sampleTheRoof)
        }
        .background(Color.surfacePrimary)
        .cornerRadius(12)
        .padding()
    }
}
