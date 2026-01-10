//
//  DetailedGroupFlowView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 8 - Detailed group flow modal with full itinerary
//  Sprint 14: Added premium gating with restricted content for free users
//

import SwiftUI
import MapKit

struct DetailedGroupFlowView: View {
    let groupFlow: GroupFlow
    let onDismiss: () -> Void
    var onUpgrade: (() -> Void)? = nil

    @State private var scrollOffset: CGFloat = 0
    @State private var isContentReady: Bool = false
    @State private var showPaywall: Bool = false
    @State private var isSaved: Bool = false
    @State private var showingShareSheet: Bool = false

    // Swipe to dismiss state
    @State private var dragOffset: CGFloat = 0

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // Saved items manager for save functionality
    @ObservedObject private var savedItemsManager = SavedItemsManager.shared

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

            VStack(spacing: 0) {
                // Drag handle indicator for swipe to dismiss
                dragHandle

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

                            // Route map section - only for pro users
                            if isProUser {
                                routeMapSection
                            } else {
                                restrictedRouteMapSection
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
                    .frame(maxHeight: .infinity)
                }
            }

            // Top buttons row (Save on left, Close on right)
            topButtonsRow
        }
        .offset(y: dragOffset)
        .background(Color.appBackground.ignoresSafeArea())
        .sheet(isPresented: $showPaywall) {
            PaywallView(trigger: .groupFlow(cityName: "")) {
                showPaywall = false
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareSheet(items: [shareText])
        }
        .onAppear {
            // Check if already saved
            isSaved = savedItemsManager.isGroupFlowSaved(groupFlow)

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.easeIn(duration: 0.2)) {
                    isContentReady = true
                }
            }
        }
    }

    // MARK: - Drag Handle for Swipe to Dismiss
    private var dragHandle: some View {
        VStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.textTertiary.opacity(0.5))
                .frame(width: 36, height: 5)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .contentShape(Rectangle())
        .gesture(dismissGesture)
    }

    private var dismissGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                if value.translation.height > 0 {
                    // Apply slight resistance (0.8 multiplier) for natural feel
                    dragOffset = value.translation.height * 0.8
                }
            }
            .onEnded { value in
                if value.translation.height > 120 || value.predictedEndTranslation.height > 200 {
                    // Dismiss the view
                    HapticManager.shared.medium()
                    withAnimation(.easeOut(duration: 0.25)) {
                        dragOffset = UIScreen.main.bounds.height
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        onDismiss()
                    }
                } else {
                    // Snap back with spring animation
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        dragOffset = 0
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

            // Best For tags with share button - always visible
            HStack(alignment: .top, spacing: Spacing.sm) {
                // Tags section (scrollable if too many)
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Best for:")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.textSecondary)

                    // Scrollable tags row
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: Spacing.xxs) {
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
                .frame(maxWidth: .infinity, alignment: .leading)

                // Share button (fixed position, far right)
                Button(action: {
                    showingShareSheet = true
                }) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.accentPrimary)
                        .frame(width: 36, height: 36)
                        .background(Color.surfacePrimary)
                        .cornerRadius(8)
                }
                .accessibilityLabel("Share group plan")
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

                // Copyable address with Maps integration
                CopyableAddressView(
                    address: activity.location.address,
                    latitude: activity.location.coordinates.latitude,
                    longitude: activity.location.coordinates.longitude,
                    venueName: activity.venueName
                )

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

    // MARK: - Route Map Section (Pro Users)
    private var routeMapSection: some View {
        RouteMapView(venues: venueLocations, planTitle: groupFlow.title)
    }

    // MARK: - Restricted Route Map Section (Free Users)
    private var restrictedRouteMapSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Route Map")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.textPrimary)

            ZStack {
                // Blurred placeholder map
                ZStack {
                    Rectangle()
                        .fill(Color.surfaceSecondary)
                        .frame(height: 200)

                    // Fake map elements
                    VStack(spacing: Spacing.md) {
                        HStack(spacing: Spacing.lg) {
                            ForEach(1...3, id: \.self) { index in
                                ZStack {
                                    Circle()
                                        .fill(Color.accentPrimary.opacity(0.4))
                                        .frame(width: 30, height: 30)

                                    Text("\(index)")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white.opacity(0.6))
                                }
                            }
                        }

                        // Fake route line
                        Rectangle()
                            .fill(Color.accentPrimary.opacity(0.3))
                            .frame(height: 4)
                            .cornerRadius(2)
                            .frame(maxWidth: 200)
                    }
                }
                .blur(radius: 6)
                .cornerRadius(12)

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
            .frame(height: 200)
        }
    }

    /// Convert group flow activities to venue locations for the map
    private var venueLocations: [VenueLocation] {
        groupFlow.sortedActivities.map { activity in
            VenueLocation(
                id: activity.id,
                name: activity.venueName,
                coordinate: CLLocationCoordinate2D(
                    latitude: activity.location.coordinates.latitude,
                    longitude: activity.location.coordinates.longitude
                ),
                order: activity.order,
                address: activity.location.address
            )
        }
    }

    // MARK: - Top Buttons Row (Save + Close on right)
    private var topButtonsRow: some View {
        HStack {
            Spacer()

            // Save button (heart icon, next to close)
            Button(action: {
                HapticManager.shared.light()
                savedItemsManager.toggleGroupFlowSave(groupFlow)
                isSaved = savedItemsManager.isGroupFlowSaved(groupFlow)
            }) {
                ZStack {
                    Circle()
                        .fill(Color.surfacePrimary.opacity(0.9))
                        .frame(width: 44, height: 44)
                        .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)

                    Image(systemName: isSaved ? "heart.fill" : "heart")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(isSaved ? .accentPrimary : .textPrimary)
                }
            }

            // Close button (far right)
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
        }
        .padding(.top, 50)
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Share Text
    private var shareText: String {
        var text = "\u{1F389} \(groupFlow.title)\n\n"
        text += "Duration: \(groupFlow.formattedDuration)\n"
        text += "Cost: \(groupFlow.formattedCost)\n\n"
        text += "Itinerary:\n"

        for activity in groupFlow.sortedActivities {
            text += "\(activity.order). \(activity.venueName)\n"
            text += "   \u{1F4CD} \(activity.location.address)\n"
            text += "   \u{23F0} \(formatTime(activity.startTime)) (\(activity.duration) min)\n\n"
        }

        text += "---\nShared via Litplan"
        return text
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
