//
//  DetailedGroupFlowView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 8 - Detailed group flow modal with full itinerary
//  Sprint 14: Added premium gating with restricted content for free users
//

import SwiftUI

struct DetailedGroupFlowView: View {
    let groupFlow: GroupFlow
    let onDismiss: () -> Void
    var onUpgrade: (() -> Void)? = nil

    @State private var scrollOffset: CGFloat = 0
    @State private var isContentReady: Bool = false
    @State private var showPaywall: Bool = false

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // MARK: - Premium Gating Helpers

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

    var body: some View {
        ZStack(alignment: .top) {
            Color.appBackground
                .ignoresSafeArea()

            if isContentReady {
                // Scrollable content
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: Spacing.lg) {
                        // Header with title, badges, and meta info - always visible
                        headerSection
                            .padding(.top, 60) // Space for close button

                        // Summary section - always visible (venue count, duration)
                        summarySection

                        // Description - gated for free users
                        if isProUser {
                            descriptionSection
                        }

                        // Full itinerary with timeline - gated
                        if isProUser {
                            itinerarySection
                        } else {
                            restrictedVenueSection
                        }

                        // AI Tags - always visible
                        tagsSection

                        // Estimated cost breakdown - only for pro users
                        if isProUser {
                            costSection
                        }

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
        .sheet(isPresented: $showPaywall) {
            PaywallView(trigger: .groupFlow(cityName: "")) {
                showPaywall = false
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.easeIn(duration: 0.2)) {
                    isContentReady = true
                }
            }
        }
    }

    // MARK: - Summary Section (Always Visible)
    private var summarySection: some View {
        HStack(spacing: Spacing.md) {
            // Venue count
            HStack(spacing: 6) {
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.accentPrimary)

                Text("\(groupFlow.activities.count) venues")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.textSecondary)
            }

            Text("\u{2022}")
                .foregroundColor(.textTertiary)

            // Duration
            HStack(spacing: 6) {
                Image(systemName: "clock.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.accentPrimary)

                Text(groupFlow.formattedDuration)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            // Pro badge if not pro user
            if !isProUser {
                Text("PRO")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.accentPrimary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.accentPrimary.opacity(0.15))
                    .cornerRadius(6)
            }
        }
        .padding(Spacing.md)
        .background(Color.surfaceSecondary)
        .cornerRadius(12)
    }

    // MARK: - Restricted Venue Section (Free Users)
    private var restrictedVenueSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Itinerary")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)

            ZStack {
                // Blurred placeholder content
                VStack(spacing: Spacing.sm) {
                    ForEach(Array(groupFlow.sortedActivities.prefix(3).enumerated()), id: \.element.id) { index, activity in
                        HStack(alignment: .center, spacing: Spacing.md) {
                            // Step number
                            ZStack {
                                Circle()
                                    .fill(Color.accentPrimary.opacity(0.3))
                                    .frame(width: 36, height: 36)

                                Text("\(activity.order)")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white.opacity(0.6))
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                // Abbreviated venue name
                                Text(abbreviateVenueName(activity.venueName))
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.textPrimary.opacity(0.6))

                                // Obscured description
                                Text(String(repeating: "\u{2022}", count: 12))
                                    .font(.system(size: 14))
                                    .foregroundColor(.textTertiary)
                            }

                            Spacer()

                            // Duration badge
                            Text("\(activity.duration)min")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.textSecondary.opacity(0.6))
                                .padding(.horizontal, Spacing.xs)
                                .padding(.vertical, 4)
                                .background(Color.surfaceSecondary.opacity(0.5))
                                .cornerRadius(6)
                        }
                        .padding(Spacing.md)
                        .background(Color.surfacePrimary.opacity(0.5))
                        .cornerRadius(12)
                    }
                }
                .blur(radius: 6)

                // Premium overlay
                BlurredPremiumOverlay {
                    HapticManager.shared.medium()
                    if let onUpgrade = onUpgrade {
                        onUpgrade()
                    } else {
                        showPaywall = true
                    }
                }
                .cornerRadius(12)
            }
        }
    }

    // MARK: - Header Section
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Title - always visible
            Text(groupFlow.title)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.textPrimary)

            // Badges (difficulty, duration, and cost for pro users only)
            HStack(spacing: Spacing.xs) {
                // Difficulty - always visible
                badgePill(
                    text: groupFlow.difficulty.capitalized,
                    color: difficultyColor,
                    icon: "flame.fill"
                )

                // Duration - always visible
                badgePill(
                    text: groupFlow.formattedDuration,
                    color: .accentPrimary,
                    icon: "clock.fill"
                )

                // Cost - only for pro users (no pricing shown to free users)
                if isProUser {
                    badgePill(
                        text: groupFlow.formattedCost,
                        color: .accentSecondary,
                        icon: "dollarsign.circle.fill"
                    )
                }
            }

            // Best For tags - always visible
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
#Preview("Pro User - NYC Flow") {
    DetailedGroupFlowView(
        groupFlow: .sampleNYCFlow,
        onDismiss: {
            print("Dismissed")
        }
    )
}

#Preview("Pro User - LA Flow") {
    DetailedGroupFlowView(
        groupFlow: .sampleLAFlow,
        onDismiss: {
            print("Dismissed")
        }
    )
}

#Preview("Free User - NYC Flow") {
    // Note: To test free user view, temporarily set isProUser to false
    // or revoke test Pro access in SubscriptionManager
    DetailedGroupFlowView(
        groupFlow: .sampleNYCFlow,
        onDismiss: {
            print("Dismissed")
        },
        onUpgrade: {
            print("Upgrade tapped")
        }
    )
}
