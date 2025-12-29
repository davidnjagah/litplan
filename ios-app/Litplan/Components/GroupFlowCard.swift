//
//  GroupFlowCard.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 8 - Full GroupFlowCard component with timeline and real data
//

import SwiftUI

struct GroupFlowCard: View {
    let groupFlow: GroupFlow
    let isProUser: Bool
    let onTapViewItinerary: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Title and badges
            header

            // Timeline visual with 2-3 connected activities
            timeline

            // Footer with duration, cost, and CTA
            footer
        }
        .padding(Spacing.md)
        .background(Color.surfacePrimary)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isProUser ? Color.accentPrimary.opacity(0.3) : Color.surfaceSecondary,
                    lineWidth: isProUser ? 2 : 1
                )
        )
        .opacity(isProUser ? 1.0 : 0.6)
        .accessibilityLabel("\(groupFlow.title), \(groupFlow.difficulty) difficulty")
        .accessibilityHint(isProUser ? "Double tap to view full itinerary. \(groupFlow.formattedDuration) total, \(groupFlow.formattedCost) estimated cost" : "Group flows require Litplan Pro. Double tap to unlock")
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Header (Title and Badges)
    private var header: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(groupFlow.title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)

                // Tags (bestFor)
                HStack(spacing: Spacing.xxs) {
                    ForEach(groupFlow.bestFor, id: \.self) { tag in
                        Text(tag.capitalized)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.textSecondary)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 4)
                            .background(Color.surfaceSecondary)
                            .cornerRadius(8)
                    }
                }
            }

            Spacer()

            // Difficulty badge
            difficultyBadge
        }
    }

    private var difficultyBadge: some View {
        Text(groupFlow.difficulty.capitalized)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(difficultyColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 6)
            .background(difficultyColor.opacity(0.15))
            .cornerRadius(8)
    }

    private var difficultyColor: Color {
        switch groupFlow.difficulty {
        case "easy":
            return .success
        case "moderate":
            return .warning
        case "intense":
            return .error
        default:
            return .textSecondary
        }
    }

    // MARK: - Timeline Visual
    private var timeline: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            ForEach(Array(groupFlow.sortedActivities.enumerated()), id: \.element.id) { index, activity in
                HStack(alignment: .top, spacing: Spacing.sm) {
                    // Step indicator
                    VStack(spacing: 4) {
                        // Circle with number
                        ZStack {
                            Circle()
                                .fill(Color.accentPrimary)
                                .frame(width: 32, height: 32)

                            Text("\(activity.order)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }

                        // Connecting line to next activity (if not last)
                        if index < groupFlow.sortedActivities.count - 1 {
                            Rectangle()
                                .fill(Color.accentPrimary.opacity(0.3))
                                .frame(width: 2, height: 40)
                        }
                    }

                    // Activity info
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: Spacing.xxs) {
                            // Time
                            HStack(spacing: 4) {
                                Image(systemName: "clock.fill")
                                    .font(.system(size: 11))
                                    .foregroundColor(.accentPrimary)

                                Text(formatTime(activity.startTime))
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.accentPrimary)
                            }

                            Text("•")
                                .foregroundColor(.textTertiary)

                            // Duration
                            Text("\(activity.duration)min")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.textSecondary)
                        }

                        // Venue name
                        Text(activity.venueName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.textPrimary)
                            .lineLimit(1)

                        // Description
                        Text(activity.description)
                            .font(.system(size: 14))
                            .foregroundColor(.textSecondary)
                            .lineLimit(2)
                    }
                    .padding(.top, 4)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Footer (Duration, Cost, CTA)
    private var footer: some View {
        VStack(spacing: Spacing.sm) {
            // Duration and cost
            HStack(spacing: Spacing.md) {
                // Total duration
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)

                    Text(groupFlow.formattedDuration)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)

                    Text("total")
                        .font(.system(size: 13))
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Estimated cost
                HStack(spacing: 6) {
                    Image(systemName: "dollarsign.circle")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)

                    Text(groupFlow.formattedCost)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)

                    Text("est")
                        .font(.system(size: 13))
                        .foregroundColor(.textSecondary)
                }
            }
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(Color.surfaceSecondary)
            .cornerRadius(8)

            // CTA button
            ctaButton
        }
    }

    private var ctaButton: some View {
        Button(action: {
            if isProUser {
                onTapViewItinerary()
            } else {
                // Free users see the lock - will show paywall in Sprint 3
                print("🔒 Paywall: Group Flows are Pro-only")
            }
        }) {
            HStack(spacing: Spacing.xs) {
                if !isProUser {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 14))
                }

                Text(isProUser ? "View Full Itinerary" : "Unlock with Pro")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundColor(isProUser ? .white : .accentPrimary)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(isProUser ? Color.accentPrimary : Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.accentPrimary, lineWidth: isProUser ? 0 : 2)
            )
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Helper Functions
    private func formatTime(_ time: String) -> String {
        // Convert 24-hour format to 12-hour format with AM/PM
        let components = time.split(separator: ":")
        guard let hour = Int(components[0]) else { return time }

        let period = hour >= 12 ? "PM" : "AM"
        let displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)

        return "\(displayHour)\(period)"
    }
}

// MARK: - Preview
#Preview("Pro User - NYC Flow") {
    GroupFlowCard(
        groupFlow: .sampleNYCFlow,
        isProUser: true,
        onTapViewItinerary: {
            print("View Itinerary tapped")
        }
    )
    .padding()
    .background(Color.appBackground)
}

#Preview("Free User - NYC Flow") {
    GroupFlowCard(
        groupFlow: .sampleNYCFlow,
        isProUser: false,
        onTapViewItinerary: {
            print("View Itinerary tapped")
        }
    )
    .padding()
    .background(Color.appBackground)
}

#Preview("Pro User - LA Flow") {
    GroupFlowCard(
        groupFlow: .sampleLAFlow,
        isProUser: true,
        onTapViewItinerary: {
            print("View Itinerary tapped")
        }
    )
    .padding()
    .background(Color.appBackground)
}
