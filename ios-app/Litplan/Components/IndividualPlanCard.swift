//
//  IndividualPlanCard.swift
//  Litplan
//
//  Created by Standardization Agent on 12/29/25.
//

import SwiftUI

struct IndividualPlanCard: View {
    let plan: Plan
    let rank: Int

    @State private var isFavorited: Bool = false

    var body: some View {
        HStack(spacing: Spacing.sm) {
            // Left: Image (120x120pt)
            AsyncImageView.thumbnail(url: URL(string: plan.images.first ?? ""))

            // Right: Content
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Title with ranking badge and event tag
                HStack(alignment: .top, spacing: Spacing.xs) {
                    if rank <= 3 {
                        Text("Top \(rank)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.appBackground)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                Capsule()
                                    .fill(Color.accentPrimary)
                            )
                    }

                    // EVENT tag for event-type plans (Sprint 14)
                    if plan.isEvent {
                        HStack(spacing: 3) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 8))
                            Text("EVENT")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundColor(.warning)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(Color.warning.opacity(0.15))
                        )
                    }

                    Text(plan.title)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(2)

                    Spacer()

                    // Favorite icon
                    Button(action: {
                        isFavorited.toggle()
                        HapticManager.shared.light()
                    }) {
                        Image(systemName: isFavorited ? "heart.fill" : "heart")
                            .font(.system(size: 16))
                            .foregroundColor(isFavorited ? .accentPrimary : .textTertiary)
                    }
                }

                // Venue with pin icon
                HStack(spacing: 4) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)

                    Text(plan.venueName)
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)
                }

                // Date/Time
                HStack(spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)

                    Text("\(plan.schedule.dayOfWeek) • \(plan.schedule.startTime)")
                        .font(.system(size: 12))
                        .foregroundColor(.textSecondary)
                }

                // Tags (horizontal scroll, max 4)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(plan.aiTags.prefix(4), id: \.self) { tag in
                            Text(tag)
                                .font(.system(size: 11))
                                .foregroundColor(.textSecondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule()
                                        .fill(Color.surfaceSecondary)
                                )
                        }
                    }
                }

                // Entry fee badge
                if plan.pricing.entryFee > 0 {
                    Text("\(plan.pricing.currency) \(String(format: "%.0f", plan.pricing.entryFee))")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.accentPrimary)
                } else {
                    Text("Free Entry")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.success)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.sm)
        .background(Color.surfacePrimary)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.surfaceSecondary, lineWidth: 1)
        )
    }
}
