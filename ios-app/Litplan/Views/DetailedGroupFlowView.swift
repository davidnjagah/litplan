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

    init(groupFlow: GroupFlow, onDismiss: @escaping () -> Void, onUpgrade: (() -> Void)? = nil) {
        self.groupFlow = groupFlow
        self.onDismiss = onDismiss
        self.onUpgrade = onUpgrade
        print("[DetailedGroupFlowView] 🏗️ INIT called for groupFlow: \(groupFlow.title) (id: \(groupFlow.id))")
    }

    @State private var scrollOffset: CGFloat = 0
    @State private var isContentReady: Bool = true  // Show content immediately - data is already available
    @State private var isSaved: Bool = false
    @State private var showingShareSheet: Bool = false
    @State private var showPaywall: Bool = false

    // Swipe to dismiss state
    @State private var dragOffset: CGFloat = 0

    // Saved items manager for save functionality
    @ObservedObject private var savedItemsManager = SavedItemsManager.shared

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

                            descriptionSection

                            itinerarySection

                            // AI Tags
                            tagsSection

                            costSection

                            routeMapSection

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
        .sheet(isPresented: $showingShareSheet) {
            ShareSheet(items: [shareText])
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView(trigger: .groupFlow(cityName: groupFlow.cityId))
        }
        .onAppear {
            print("[DetailedGroupFlowView] 🚀 onAppear - groupFlow: \(groupFlow.title)")
            print("[DetailedGroupFlowView] 📊 GroupFlow data - id: \(groupFlow.id), activities: \(groupFlow.activities.count)")
            print("[DetailedGroupFlowView] 📊 isContentReady: \(isContentReady)")

            // Check if already saved
            isSaved = savedItemsManager.isGroupFlowSaved(groupFlow)
            // Content is ready immediately - no delay needed since GroupFlow data is passed in
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
        }
        .padding(Spacing.md)
        .background(Color.surfaceSecondary)
        .cornerRadius(12)
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
                    color: groupFlow.difficultyColor,
                    icon: "flame.fill"
                )

                // Duration - always visible
                badgePill(
                    text: groupFlow.formattedDuration,
                    color: .accentPrimary,
                    icon: "clock.fill"
                )

                badgePill(
                    text: groupFlow.formattedCost,
                    color: .accentSecondary,
                    icon: "dollarsign.circle.fill"
                )
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
                // Uses verified Google Maps URL when available for accurate navigation
                CopyableAddressView(
                    address: activity.location.address,
                    latitude: activity.location.coordinates.latitude,
                    longitude: activity.location.coordinates.longitude,
                    venueName: activity.venueName,
                    googleMapsUrl: activity.location.mapsUrl
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
        // Use plan type and time to determine appropriate labels
        let planType = groupFlow.planType?.lowercased() ?? ""
        let isNightPlan = isNightlifePlan()

        // Night plans use Pre-Game/Main Event/After Party
        if isNightPlan {
            switch order {
            case 1: return "Pre-Game"
            case 2: return "Main Event"
            case 3: return "After Party"
            default: return "Stop \(order)"
            }
        }

        // Family/daytime plans use different labels
        if planType.contains("family") || planType.contains("free") {
            switch order {
            case 1: return "First Stop"
            case 2: return "Main Activity"
            case 3: return "Wrap Up"
            default: return "Stop \(order)"
            }
        }

        // Adventure/exploration plans
        if groupFlow.title.lowercased().contains("adventure") ||
           groupFlow.title.lowercased().contains("explor") ||
           groupFlow.title.lowercased().contains("conquering") {
            switch order {
            case 1: return "Kickoff"
            case 2: return "Adventure"
            case 3: return "Finale"
            default: return "Stop \(order)"
            }
        }

        // Couples/romantic plans
        if planType.contains("couple") || planType.contains("romantic") {
            switch order {
            case 1: return "Begin"
            case 2: return "Highlight"
            case 3: return "Nightcap"
            default: return "Stop \(order)"
            }
        }

        // Default generic labels
        switch order {
        case 1: return "Start"
        case 2: return "Main"
        case 3: return "Finish"
        default: return "Stop \(order)"
        }
    }

    /// Check if this is a nightlife plan based on start time
    private func isNightlifePlan() -> Bool {
        guard let firstActivity = groupFlow.sortedActivities.first else { return false }
        let components = firstActivity.startTime.split(separator: ":")
        guard let hour = Int(components.first ?? "") else { return false }
        // If first activity starts at 6pm or later, it's a night plan
        return hour >= 18
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

                    Text(groupFlow.estimatedCost.includesText)
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

        // Plan description
        text += "\(groupFlow.description)\n\n"

        // Plan details
        text += "\u{23F1} Duration: \(groupFlow.formattedDuration)\n"
        text += "\u{1F4B0} Estimated Cost: \(groupFlow.formattedCost)\n"
        text += "\u{1F465} Best for: \(groupFlow.bestFor.joined(separator: ", "))\n\n"

        // Vibes/tags
        if !groupFlow.aiTags.isEmpty {
            text += "\u{2728} Vibes: \(groupFlow.aiTags.joined(separator: " \u{2022} "))\n\n"
        }

        text += "---\n\n"
        text += "\u{1F5FA} ITINERARY\n\n"

        for activity in groupFlow.sortedActivities {
            let stepLabel = stepLabel(for: activity.order)
            text += "\(activity.order). \(activity.venueName) [\(stepLabel)]\n"
            text += "   \u{23F0} \(formatTime(activity.startTime)) (\(activity.duration) min)\n"
            text += "   \u{1F4CD} \(activity.location.address)\n"
            text += "   \n"
            text += "   \(activity.description)\n\n"
        }

        text += "---\n"
        text += "Plan your perfect night out with LitPlanz\n"
        text += "Download: https://litplanz.com"
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
