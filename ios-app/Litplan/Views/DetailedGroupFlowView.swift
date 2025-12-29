//
//  DetailedGroupFlowView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 8 - Detailed group flow modal with full itinerary
//

import SwiftUI

struct DetailedGroupFlowView: View {
    let groupFlow: GroupFlow
    let onDismiss: () -> Void

    @State private var scrollOffset: CGFloat = 0
    @State private var isContentReady: Bool = false

    var body: some View {
        ZStack(alignment: .top) {
            Color.appBackground
                .ignoresSafeArea()

            if isContentReady {
                // Scrollable content
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: Spacing.lg) {
                        // Header with title, badges, and meta info
                        headerSection
                            .padding(.top, 60) // Space for close button

                        // Description
                        descriptionSection

                        // Full itinerary with timeline
                        itinerarySection

                        // AI Tags
                        tagsSection

                        // Estimated cost breakdown
                        costSection

                        // Bottom padding
                        Color.clear.frame(height: Spacing.xl)
                    }
                    .padding(.horizontal, Spacing.md)
                }
                .transition(.opacity)
            } else {
                // Loading state
                VStack(spacing: 20) {
                    ProgressView()
                        .tint(.accentPrimary)
                        .scaleEffect(1.5)
                    Text("Loading itinerary...")
                        .font(.system(size: 16))
                        .foregroundColor(.textSecondary)
                }
            }

            // Close button (always visible)
            closeButton
        }
        .background(Color.appBackground.ignoresSafeArea())
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.easeIn(duration: 0.2)) {
                    isContentReady = true
                }
            }
        }
    }

    // MARK: - Header Section
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Title
            Text(groupFlow.title)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.textPrimary)

            // Badges (difficulty, bestFor, duration, cost)
            HStack(spacing: Spacing.xs) {
                // Difficulty
                badgePill(
                    text: groupFlow.difficulty.capitalized,
                    color: difficultyColor,
                    icon: "flame.fill"
                )

                // Duration
                badgePill(
                    text: groupFlow.formattedDuration,
                    color: .accentPrimary,
                    icon: "clock.fill"
                )

                // Cost
                badgePill(
                    text: groupFlow.formattedCost,
                    color: .accentSecondary,
                    icon: "dollarsign.circle.fill"
                )
            }

            // Best For tags
            HStack(spacing: Spacing.xxs) {
                Text("Best for:")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.textSecondary)

                ForEach(groupFlow.bestFor, id: \.self) { tag in
                    Text(tag.capitalized)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.textPrimary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 6)
                        .background(Color.surfaceSecondary)
                        .cornerRadius(8)
                }
            }
        }
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

    private func badgePill(text: String, color: Color, icon: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12))

            Text(text)
                .font(.system(size: 13, weight: .semibold))
        }
        .foregroundColor(color)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, 6)
        .background(color.opacity(0.15))
        .cornerRadius(8)
    }

    // MARK: - Description Section
    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Experience")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.textPrimary)

            Text(groupFlow.description)
                .font(.system(size: 15))
                .foregroundColor(.textSecondary)
                .lineSpacing(4)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfacePrimary)
        .cornerRadius(12)
    }

    // MARK: - Itinerary Section
    private var itinerarySection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Itinerary")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)

            ForEach(Array(groupFlow.sortedActivities.enumerated()), id: \.element.id) { index, activity in
                activityDetailCard(activity: activity, index: index)
            }
        }
    }

    private func activityDetailCard(activity: GroupFlow.Activity, index: Int) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Time and step indicator
            HStack(spacing: Spacing.sm) {
                // Step number
                ZStack {
                    Circle()
                        .fill(Color.accentPrimary)
                        .frame(width: 40, height: 40)

                    Text("\(activity.order)")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(formatTime(activity.startTime))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.accentPrimary)

                    Text("\(activity.duration) minutes")
                        .font(.system(size: 13))
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Step label
                Text(stepLabel(for: activity.order))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.accentPrimary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(Color.accentPrimary.opacity(0.15))
                    .cornerRadius(8)
            }

            // Venue info
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(activity.venueName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.textPrimary)

                HStack(spacing: 4) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 13))
                        .foregroundColor(.textTertiary)

                    Text(activity.location.address)
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                        .lineLimit(2)
                }

                Text(activity.description)
                    .font(.system(size: 15))
                    .foregroundColor(.textSecondary)
                    .lineSpacing(4)
                    .padding(.top, Spacing.xs)
            }
            .padding(.top, Spacing.md)

            // Connecting arrow (if not last activity)
            if index < groupFlow.sortedActivities.count - 1 {
                HStack {
                    Spacer()
                    Image(systemName: "arrow.down")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.accentPrimary.opacity(0.4))
                        .padding(.vertical, Spacing.sm)
                    Spacer()
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.surfacePrimary)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.accentPrimary.opacity(0.2), lineWidth: 1)
        )
    }

    private func stepLabel(for order: Int) -> String {
        switch order {
        case 1:
            return "Pre-Game"
        case 2:
            return "Main Event"
        case 3:
            return "After Party"
        default:
            return "Step \(order)"
        }
    }

    // MARK: - Tags Section
    private var tagsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Vibes")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.xs) {
                    ForEach(groupFlow.aiTags, id: \.self) { tag in
                        Text(tag)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.xs)
                            .background(Color.surfaceSecondary)
                            .cornerRadius(8)
                    }
                }
            }
        }
    }

    // MARK: - Cost Section
    private var costSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Estimated Cost")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.textPrimary)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total per person")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)

                    Text(groupFlow.formattedCost)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.accentPrimary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Includes")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)

                    Text("Entry + 2-3 drinks")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.textPrimary)
                }
            }
            .padding(Spacing.md)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
    }

    // MARK: - Close Button
    private var closeButton: some View {
        HStack {
            Button(action: onDismiss) {
                ZStack {
                    Circle()
                        .fill(Color.surfacePrimary.opacity(0.9))
                        .frame(width: 44, height: 44)
                        .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)

                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.textPrimary)
                }
            }
            .padding(.top, 50)
            .padding(.leading, Spacing.md)

            Spacer()
        }
    }

    // MARK: - Helper Functions
    private func formatTime(_ time: String) -> String {
        // Convert 24-hour format to 12-hour format with AM/PM
        let components = time.split(separator: ":")
        guard let hour = Int(components[0]) else { return time }

        let period = hour >= 12 ? "PM" : "AM"
        let displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)

        return "\(displayHour):00 \(period)"
    }
}

// MARK: - Preview
#Preview("NYC Flow") {
    DetailedGroupFlowView(
        groupFlow: .sampleNYCFlow,
        onDismiss: {
            print("Dismissed")
        }
    )
}

#Preview("LA Flow") {
    DetailedGroupFlowView(
        groupFlow: .sampleLAFlow,
        onDismiss: {
            print("Dismissed")
        }
    )
}
