//
//  GroupFlowCard.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 8 - Full GroupFlowCard component with timeline and real data
//  Sprint 14: Added premium gating with abbreviated venue names for free users
//

import SwiftUI

struct GroupFlowCard: View {
    let groupFlow: GroupFlow
    let isProUser: Bool
    let onTapViewItinerary: () -> Void
    var onTapUnlock: (() -> Void)? = nil
    var cityName: String? = nil // Optional city name for badge display

    // MARK: - Premium Gating Computed Properties

    /// Title is always shown for all users
    private var displayTitle: String {
        groupFlow.title
    }

    /// Venue count summary for free users
    private var displayVenueCount: String {
        "\(groupFlow.activities.count) venues"
    }

    /// Duration summary
    private var displayDuration: String {
        let hours = groupFlow.totalDuration / 60
        return "\(hours) hours"
    }

    /// Abbreviate venue name for free users (e.g., "Brooklyn Brewery" -> "B*** B***")
    private func abbreviateVenueName(_ name: String) -> String {
        guard !isProUser else { return name }
        let words = name.split(separator: " ")
        return words.map { word in
            if word.count > 2 {
                return String(word.prefix(1)) + String(repeating: "*", count: min(word.count - 1, 3))
            }
            return String(word)
        }.joined(separator: " ")
    }

    /// Obscure description for free users
    private func obscureDescription(_ description: String) -> String {
        guard !isProUser else { return description }
        return String(repeating: "*", count: 8)
    }

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
        .opacity(isProUser ? 1.0 : 0.85)
        .accessibilityLabel("\(groupFlow.title), \(groupFlow.difficulty) difficulty")
        .accessibilityHint(isProUser ? "Double tap to view full itinerary. \(groupFlow.formattedDuration) total, \(groupFlow.formattedCost) estimated cost" : "Group flows require LitPlanz Pro. Double tap to unlock")
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Header (Title and Badges)
    private var header: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                // City badge (if city name is provided)
                if let cityName = cityName, !cityName.isEmpty {
                    cityBadge(cityName)
                }

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

    // MARK: - City Badge
    private func cityBadge(_ name: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "mappin.circle.fill")
                .font(.system(size: 10))
                .foregroundColor(.accentPrimary)

            Text(name)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.accentPrimary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.accentPrimary.opacity(0.12))
        .cornerRadius(6)
    }

    private var difficultyBadge: some View {
        Text(groupFlow.difficulty.capitalized)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(groupFlow.difficultyColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 6)
            .background(groupFlow.difficultyColor.opacity(0.15))
            .cornerRadius(8)
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
                                .fill(isProUser ? Color.accentPrimary : Color.accentPrimary.opacity(0.5))
                                .frame(width: 32, height: 32)

                            Text("\(activity.order)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }

                        // Connecting line to next activity (if not last)
                        if index < groupFlow.sortedActivities.count - 1 {
                            Rectangle()
                                .fill(Color.accentPrimary.opacity(isProUser ? 0.3 : 0.2))
                                .frame(width: 2, height: 40)
                        }
                    }

                    // Activity info
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: Spacing.xxs) {
                            // Time - shown normally for all users
                            HStack(spacing: 4) {
                                Image(systemName: "clock.fill")
                                    .font(.system(size: 11))
                                    .foregroundColor(.accentPrimary)

                                Text(formatTime(activity.startTime))
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.accentPrimary)
                            }

                            Text("\u{2022}")
                                .foregroundColor(.textTertiary)

                            // Duration - shown normally for all users
                            Text("\(activity.duration)min")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.textSecondary)
                        }

                        // Venue name - abbreviated for free users
                        Text(abbreviateVenueName(activity.venueName))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.textPrimary)
                            .lineLimit(1)

                        // Description - hidden for free users
                        Text(obscureDescription(activity.description))
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
            // Duration and cost (cost hidden for free users)
            HStack(spacing: Spacing.md) {
                // Total duration - always shown
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

                // Venue count for free users, or cost for pro users
                Spacer()

                if isProUser {
                    // Estimated cost - only for pro users
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
                } else {
                    // Venue count for free users (no pricing shown)
                    HStack(spacing: 6) {
                        Image(systemName: "mappin.circle")
                            .font(.system(size: 14))
                            .foregroundColor(.textSecondary)

                        Text(displayVenueCount)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.textPrimary)
                    }
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
                // Free users see the lock - show paywall
                HapticManager.shared.warning()
                onTapUnlock?()
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
        },
        cityName: "New York"
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
        },
        cityName: "New York"
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
        },
        cityName: "Los Angeles"
    )
    .padding()
    .background(Color.appBackground)
}
