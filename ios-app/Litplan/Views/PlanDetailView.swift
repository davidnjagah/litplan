//
//  PlanDetailView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/31/25.
//  Sprint 17D - Comprehensive Plan Details with MapKit and Share functionality
//

import SwiftUI
import MapKit

struct PlanDetailView: View {
    let plan: Plan
    let onDismiss: () -> Void

    @State private var isContentReady: Bool = true  // Show content immediately - data is already available
    @State private var isSaved: Bool = false
    @State private var mapCameraPosition: MapCameraPosition
    @State private var showPaywall: Bool = false

    // Swipe to dismiss state
    @State private var dragOffset: CGFloat = 0

    @ObservedObject private var savedItemsManager = SavedItemsManager.shared

    // Hero image dimensions
    private let heroImageHeight: CGFloat = 280

    init(plan: Plan, onDismiss: @escaping () -> Void) {
        self.plan = plan
        self.onDismiss = onDismiss
        print("[PlanDetailView] 🏗️ INIT called for plan: \(plan.title) (id: \(plan.id))")
        // Initialize map camera position centered on venue
        let coordinate = CLLocationCoordinate2D(
            latitude: plan.location.coordinates.latitude,
            longitude: plan.location.coordinates.longitude
        )
        _mapCameraPosition = State(initialValue: .region(MKCoordinateRegion(
            center: coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )))
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.appBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Drag handle indicator for swipe to dismiss
                dragHandle

                if isContentReady {
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 0) {
                            // Hero image section
                            heroImageSection

                            // Content sections
                            VStack(alignment: .leading, spacing: Spacing.lg) {
                                // Title and venue header
                                headerSection

                                // Quick info badges (duration, price, category)
                                quickInfoSection

                                // Description
                                descriptionSection

                                // Tags section
                                tagsSection

                                // Schedule details
                                scheduleSection

                                // Venue information
                                venueInfoSection

                                // Map section
                                mapSection

                                // Bottom padding for safe area
                                Color.clear.frame(height: Spacing.xxl)
                            }
                            .padding(.horizontal, Spacing.md)
                            .padding(.top, Spacing.lg)
                        }
                    }
                    .transition(.opacity)
                } else {
                    // Loading state
                    VStack(spacing: 20) {
                        ProgressView()
                            .tint(.accentPrimary)
                            .scaleEffect(1.5)
                        Text("Loading plan details...")
                            .font(.system(size: 16))
                            .foregroundColor(.textSecondary)
                    }
                    .frame(maxHeight: .infinity)
                }
            }

            // Top navigation bar with back and share buttons
            topNavigationBar
        }
        .offset(y: dragOffset)
        .background(Color.appBackground.ignoresSafeArea())
        .sheet(isPresented: $showPaywall) {
            PaywallView(trigger: .planLimit(cityName: plan.cityName))
        }
        .onAppear {
            print("[PlanDetailView] 🚀 onAppear - plan: \(plan.title)")
            print("[PlanDetailView] 📊 Plan data - id: \(plan.id), venue: \(plan.venueName), images: \(plan.images.count)")
            print("[PlanDetailView] 📊 isContentReady: \(isContentReady)")

            // Check initial saved state from SavedItemsManager
            isSaved = savedItemsManager.isPlanSaved(plan)
            // Content is ready immediately - no delay needed since Plan data is passed in
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

    // Fallback image URL for plans without images
    private var planImageUrl: URL? {
        if let firstImage = plan.images.first, !firstImage.isEmpty {
            return URL(string: firstImage)
        }
        // Fallback to a nightlife placeholder
        return URL(string: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800")
    }

    // MARK: - Hero Image Section

    private var heroImageSection: some View {
        ZStack(alignment: .bottom) {
            // Main hero image
            AsyncImageView(url: planImageUrl, targetSize: CGSize(width: 400, height: heroImageHeight))
                .frame(height: heroImageHeight)
                .clipped()

            // Gradient overlay for text readability
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.black.opacity(0.7),
                    Color.black.opacity(0.3),
                    Color.clear
                ]),
                startPoint: .bottom,
                endPoint: .top
            )

            // Category badge at bottom left
            HStack {
                Text(plan.category)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(Color.accentPrimary.opacity(0.9))
                    .cornerRadius(8)

                Spacer()

                // Price range badge
                Text(plan.pricing.priceRange)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.accentPrimary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 6)
                    .background(Color.surfacePrimary.opacity(0.9))
                    .cornerRadius(8)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.md)
        }
        .frame(height: heroImageHeight)
    }

    // MARK: - Top Navigation Bar

    private var topNavigationBar: some View {
        HStack {
            // Back button
            Button(action: {
                HapticManager.shared.light()
                onDismiss()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.surfacePrimary.opacity(0.9))
                    )
                    .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
            }
            .accessibilityLabel("Back")
            .accessibilityHint("Return to previous screen")

            Spacer()

            // Share button
            ShareLink(item: shareText) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.surfacePrimary.opacity(0.9))
                    )
                    .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
            }
            .accessibilityLabel("Share plan")
            .accessibilityHint("Share this plan with others")

            // Save button (heart icon)
            Button(action: {
                HapticManager.shared.light()
                let saved = savedItemsManager.togglePlanSave(plan)
                if saved {
                    isSaved = savedItemsManager.isPlanSaved(plan)
                } else {
                    showPaywall = true
                }
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
            .accessibilityLabel(isSaved ? "Remove from saved" : "Save plan")
            .accessibilityHint(isSaved ? "Removes this plan from your saved items" : "Saves this plan for later")
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, 50)
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // City name
            HStack(spacing: 4) {
                Image(systemName: "location.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.accentPrimary)

                Text(plan.cityName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.accentPrimary)
            }

            // Plan title
            Text(plan.title)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.textPrimary)
                .lineLimit(3)

            // Venue name
            HStack(spacing: 4) {
                Image(systemName: "building.2.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.textTertiary)

                Text(plan.venueName)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.textSecondary)
            }
        }
    }

    // MARK: - Quick Info Section

    private var quickInfoSection: some View {
        HStack(spacing: Spacing.sm) {
            // Duration badge
            quickInfoBadge(
                icon: "clock.fill",
                text: plan.formattedDuration,
                color: .accentPrimary
            )

            // Price badge
            if plan.pricing.entryFee > 0 {
                quickInfoBadge(
                    icon: "dollarsign.circle.fill",
                    text: "\(plan.pricing.currency) \(String(format: "%.0f", plan.pricing.entryFee))",
                    color: .accentSecondary
                )
            } else {
                quickInfoBadge(
                    icon: "dollarsign.circle.fill",
                    text: "Free Entry",
                    color: .success
                )
            }

            // Reservation badge (if required)
            if plan.flags.requiresReservation {
                compactBadge(
                    icon: "calendar.badge.clock",
                    text: "RSVP",
                    color: .warning
                )
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(Color.surfacePrimary)
        .cornerRadius(12)
    }

    private func quickInfoBadge(icon: String, text: String, color: Color) -> some View {
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

    private func compactBadge(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))

            Text(text)
                .font(.system(size: 11, weight: .semibold))
        }
        .foregroundColor(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 5)
        .background(color.opacity(0.15))
        .cornerRadius(6)
    }

    // MARK: - Description Section

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("About")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.textPrimary)

            Text(plan.description)
                .font(.system(size: 15))
                .foregroundColor(.textSecondary)
                .lineSpacing(4)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfacePrimary)
        .cornerRadius(12)
    }

    // MARK: - Tags Section

    private var tagsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Vibes")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.textPrimary)

            FlowLayout(spacing: Spacing.xs) {
                ForEach(plan.aiTags, id: \.self) { tag in
                    Text(tag)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.textPrimary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.xs)
                        .background(Color.surfaceSecondary)
                        .cornerRadius(20)
                }
            }
        }
    }

    // MARK: - Schedule Section

    private var scheduleSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("When")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                // Date row
                scheduleRow(
                    icon: "calendar",
                    title: "Date",
                    value: plan.formattedDate
                )

                Divider()
                    .background(Color.surfaceSecondary)

                // Time row
                scheduleRow(
                    icon: "clock",
                    title: "Time",
                    value: plan.formattedTimeRange
                )

                Divider()
                    .background(Color.surfaceSecondary)

                // Duration row
                scheduleRow(
                    icon: "hourglass",
                    title: "Duration",
                    value: plan.formattedDuration
                )

                // Age restriction (if any)
                if let ageRestriction = plan.flags.ageRestriction {
                    Divider()
                        .background(Color.surfaceSecondary)

                    scheduleRow(
                        icon: "person.badge.shield.checkmark",
                        title: "Age Requirement",
                        value: "\(ageRestriction)+"
                    )
                }
            }
            .padding(Spacing.md)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
    }

    private func scheduleRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.accentPrimary)
                .frame(width: 24)

            Text(title)
                .font(.system(size: 15))
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.textPrimary)
        }
    }

    // MARK: - Venue Info Section

    private var venueInfoSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Location")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.textPrimary)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                // Venue name
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.accentPrimary)
                        .frame(width: 24)

                    Text(plan.venueName)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.textPrimary)
                }

                // Neighborhood
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.accentPrimary)
                        .frame(width: 24)

                    Text(plan.location.neighborhood)
                        .font(.system(size: 15))
                        .foregroundColor(.textSecondary)
                }

                // Full address with copy functionality
                CopyableAddressView(
                    address: plan.location.address,
                    latitude: plan.location.coordinates.latitude,
                    longitude: plan.location.coordinates.longitude,
                    venueName: plan.venueName
                )

                // Open in Maps button
                Button(action: openInMaps) {
                    HStack {
                        Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                            .font(.system(size: 14))

                        Text("Get Directions")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(.accentPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.accentPrimary.opacity(0.15))
                    .cornerRadius(8)
                }
                .padding(.top, Spacing.xs)
            }
            .padding(Spacing.md)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
    }

    // MARK: - Map Section

    private var mapSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Map")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.textPrimary)

            ZStack(alignment: .topTrailing) {
                Map(position: $mapCameraPosition) {
                    // Venue marker annotation
                    Annotation(
                        plan.venueName,
                        coordinate: CLLocationCoordinate2D(
                            latitude: plan.location.coordinates.latitude,
                            longitude: plan.location.coordinates.longitude
                        )
                    ) {
                        VStack(spacing: 0) {
                            ZStack {
                                Circle()
                                    .fill(Color.accentPrimary)
                                    .frame(width: 36, height: 36)
                                    .shadow(color: Color.black.opacity(0.3), radius: 4, x: 0, y: 2)

                                Image(systemName: "mappin")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            // Pin tail
                            Triangle()
                                .fill(Color.accentPrimary)
                                .frame(width: 12, height: 8)
                                .offset(y: -2)
                        }
                    }
                }
                .mapStyle(.standard(elevation: .realistic))
                .mapControls {
                    MapCompass()
                    MapScaleView()
                }
                .onTapGesture {
                    openDirectionsFromCurrentLocation()
                }

                // Directions button - top right corner
                Button(action: {
                    openDirectionsFromCurrentLocation()
                }) {
                    Image(systemName: "map")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.accentPrimary)
                        .frame(width: 36, height: 36)
                        .background(Color.surfacePrimary)
                        .cornerRadius(8)
                }
                .padding(12)
                .accessibilityLabel("Get directions")
                .accessibilityHint("Opens Apple Maps with directions from current location")
            }
            .frame(height: 250)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )

            // Tap map prompt
            Text("Tap map to see directions")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)
                .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Open Directions from Current Location

    private func openDirectionsFromCurrentLocation() {
        HapticManager.shared.medium()
        let coordinate = CLLocationCoordinate2D(
            latitude: plan.location.coordinates.latitude,
            longitude: plan.location.coordinates.longitude
        )
        let destination = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
        destination.name = plan.venueName
        MKMapItem.openMaps(with: [destination], launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
        ])
    }

    // MARK: - Share Text

    private var shareText: String {
        var text = "\u{1F389} \(plan.title)\n\n"

        // Plan description
        text += "\(plan.description)\n\n"

        text += "---\n\n"
        text += "\u{1F3AF} VENUE DETAILS\n\n"

        // Venue info
        text += "\u{1F3DB} \(plan.venueName)\n"
        text += "\u{1F4CD} \(plan.location.address)\n"
        if !plan.location.neighborhood.isEmpty {
            text += "\u{1F3D9} Neighborhood: \(plan.location.neighborhood)\n"
        }
        text += "\n"

        // Timing
        text += "\u{1F4C5} When: \(plan.formattedDate)\n"
        text += "\u{23F0} Time: \(plan.formattedTimeRange)\n"
        text += "\u{23F1} Duration: \(plan.formattedDuration)\n\n"

        // Pricing
        if plan.pricing.entryFee > 0 {
            text += "\u{1F3AB} Entry: \(plan.pricing.currency) \(String(format: "%.0f", plan.pricing.entryFee))\n"
        } else {
            text += "\u{1F3AB} Entry: Free\n"
        }
        text += "\u{1F4B5} Price Range: \(plan.pricing.priceRange)\n\n"

        // Category
        text += "\u{1F3AD} Category: \(plan.category)\n\n"

        // Vibes/tags
        if !plan.aiTags.isEmpty {
            text += "\u{2728} Vibes: \(plan.aiTags.joined(separator: " \u{2022} "))\n\n"
        }

        // Directions link
        text += "\u{1F5FA} Get Directions:\n"
        text += "maps://maps.apple.com/?daddr=\(plan.location.coordinates.latitude),\(plan.location.coordinates.longitude)&saddr=Current%20Location\n\n"

        text += "---\n"
        text += "Plan your perfect night out with LitPlanz\n"
        text += "Download: https://litplanz.com"

        return text
    }

    // MARK: - Helper Functions

    private func openInMaps() {
        HapticManager.shared.medium()
        let coordinate = CLLocationCoordinate2D(
            latitude: plan.location.coordinates.latitude,
            longitude: plan.location.coordinates.longitude
        )
        let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
        mapItem.name = plan.venueName
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
        ])
    }
}

// MARK: - Triangle Shape for Map Pin
struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

// MARK: - Flow Layout for Tags

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                       y: bounds.minY + result.positions[index].y),
                          proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + rowHeight)
        }
    }
}

// MARK: - Preview

#Preview("Blue Note Jazz") {
    PlanDetailView(plan: .sampleBlueNote) {
        print("Dismissed")
    }
}

#Preview("Rooftop Cocktails") {
    PlanDetailView(plan: .sampleTheRoof) {
        print("Dismissed")
    }
}

#Preview("Le Bain Nightclub") {
    PlanDetailView(plan: .sampleLeBain) {
        print("Dismissed")
    }
}
