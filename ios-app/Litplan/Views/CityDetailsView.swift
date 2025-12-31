//
//  CityDetailsView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 6 - City Details with parallax hero, tabs, and plan lists
//

import SwiftUI

struct CityDetailsView: View {
    let city: City
    let onDismiss: () -> Void

    @State private var selectedTab: PlanTab = .individual
    @State private var scrollOffset: CGFloat = 0
    @State private var plans: [Plan] = []
    @State private var groupFlows: [GroupFlow] = []
    @State private var isLoading: Bool = true
    @State private var isFavorited: Bool = false
    @State private var selectedGroupFlow: GroupFlow?

    // Paywall trigger state
    @State private var paywallTrigger: PaywallTrigger? = nil
    @State private var viewedPlansCount: Int = 0
    @State private var selectedPlan: Plan? = nil
    @State private var showPlanDetails: Bool = false

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared

    // Pro feature - connected to SubscriptionManager
    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // Accessibility - Reduce Motion
    @Environment(\.accessibilityReduceMotion) var reduceMotion

    // Hero image dimensions
    private let heroImageHeight: CGFloat = 200
    private let maxParallaxOffset: CGFloat = 100

    enum PlanTab: String, CaseIterable {
        case individual = "Individual Plans"
        case group = "Group Plans"
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.appBackground
                .ignoresSafeArea()

            // Scrollable content
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Hero image with parallax effect
                    heroImageSection

                    // Tab switcher
                    tabSwitcher
                        .padding(.top, Spacing.md)

                    // Plans list based on selected tab
                    plansListSection
                }
            }
            .coordinateSpace(name: "scroll")

            // Top overlay buttons (back and favorite)
            topButtons
        }
        .navigationBarHidden(true)
        .sheet(item: $paywallTrigger) { trigger in
            PaywallView(trigger: trigger) {
                paywallTrigger = nil
            }
        }
        .fullScreenCover(item: $selectedGroupFlow) { groupFlow in
            DetailedGroupFlowView(groupFlow: groupFlow) {
                selectedGroupFlow = nil
            }
        }
        .fullScreenCover(isPresented: $showPlanDetails) {
            if let plan = selectedPlan {
                PlanDetailsView(plan: plan) {
                    showPlanDetails = false
                }
            }
        }
        .task {
            // Load data asynchronously to avoid blocking UI
            isLoading = true
            await loadPlansAsync()
            await loadGroupFlowsAsync()
            isLoading = false
        }
    }

    // MARK: - Hero Image Section
    private var heroImageSection: some View {
        GeometryReader { geometry in
            let offset = geometry.frame(in: .named("scroll")).minY

            ZStack {
                AsyncImageView(url: URL(string: city.displayAssets.heroImageUrl))
                    .frame(width: geometry.size.width, height: heroImageHeight + max(0, offset))
                    .offset(y: -offset)
                    .clipped()
            }
            .overlay(
                // Gradient overlay for text readability
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.black.opacity(0.6),
                        Color.black.opacity(0.3),
                        Color.clear
                    ]),
                    startPoint: .bottom,
                    endPoint: .top
                )
            )
            .overlay(
                // City name at bottom of hero
                VStack {
                    Spacer()
                    HStack {
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text(city.name)
                                .font(.system(size: 34, weight: .bold))
                                .foregroundColor(.textPrimary)

                            Text("\(city.displayAssets.countryFlag) \(city.country)")
                                .font(.system(size: 16))
                                .foregroundColor(.textSecondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.md)
                }
            )
        }
        .frame(height: heroImageHeight)
    }

    // MARK: - Top Buttons
    private var topButtons: some View {
        HStack {
            // Back button (top-left)
            Button(action: {
                HapticManager.shared.light()
                onDismiss()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.surfacePrimary.opacity(0.9))
                    )
                    .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
            }
            .accessibilityLabel("Back")
            .accessibilityHint("Return to previous screen")

            Spacer()

            // Favorite button (top-right, Pro only)
            Button(action: handleSaveTap) {
                Image(systemName: isFavorited ? "heart.fill" : "heart")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(isFavorited ? .accentPrimary : .textPrimary)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.surfacePrimary.opacity(0.9))
                    )
                    .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
            }
            .accessibilityLabel(isFavorited ? "Saved" : "Save city")
            .accessibilityHint(isFavorited ? "Double tap to remove from favorites" : "Double tap to save to favorites")
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, 50) // Account for safe area
    }

    // MARK: - Tab Switcher
    private var tabSwitcher: some View {
        HStack(spacing: Spacing.md) {
            ForEach(PlanTab.allCases, id: \.self) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.bottom, Spacing.sm)
    }

    private func tabButton(for tab: PlanTab) -> some View {
        Button(action: {
            withAnimation(reduceMotion ? .none : .spring(response: 0.3, dampingFraction: 0.8)) {
                selectedTab = tab
            }
        }) {
            VStack(spacing: Spacing.xs) {
                Text(tab.rawValue)
                    .font(.system(size: 16, weight: selectedTab == tab ? .semibold : .regular))
                    .foregroundColor(selectedTab == tab ? .textPrimary : .textSecondary)

                // Active indicator
                Rectangle()
                    .fill(selectedTab == tab ? Color.accentPrimary : Color.clear)
                    .frame(height: 3)
                    .cornerRadius(1.5)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityLabel(tab.rawValue)
        .accessibilityAddTraits(selectedTab == tab ? [.isButton, .isSelected] : .isButton)
    }

    // MARK: - Plans List Section
    private var plansListSection: some View {
        VStack(spacing: Spacing.md) {
            if isLoading {
                // Loading state - shown while data is being fetched
                VStack(spacing: 20) {
                    ProgressView()
                        .tint(.accentPrimary)
                        .scaleEffect(1.5)
                    Text("Loading nightlife plans...")
                        .font(.system(size: 16))
                        .foregroundColor(.textSecondary)
                }
                .frame(height: 200)
                .accessibilityLabel("Loading plans")
                .accessibilityValue("Please wait")
            } else if plans.isEmpty {
                // Empty state - shown if no plans available for this city
                VStack(spacing: 12) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 40))
                        .foregroundColor(.textSecondary)
                    Text("No plans available yet")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.textPrimary)
                    Text("Check back soon for curated nightlife experiences")
                        .font(.system(size: 14))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(height: 200)
                .padding(.horizontal, Spacing.lg)
            } else {
                if selectedTab == .individual {
                    individualPlansList
                } else {
                    groupPlansList
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.md)
    }

    // MARK: - Individual Plans List
    private var individualPlansList: some View {
        LazyVStack(spacing: Spacing.md) {
            // Regular plans (non-weekend)
            let regularPlans = plans.filter { !$0.flags.isWeekendPlan }
            ForEach(Array(regularPlans.enumerated()), id: \.offset) { index, plan in
                IndividualPlanCard(plan: plan, rank: index + 1)
                    .accessibilityLabel("\(plan.title) at \(plan.venueName)")
                    .accessibilityHint("Double tap to view plan details. \(plan.schedule.dayOfWeek), \(plan.schedule.startTime)")
                    .accessibilityAddTraits(.isButton)
                    .onTapGesture {
                        handlePlanTap(plan)
                    }
            }

            // Weekend plans section (if any)
            if hasWeekendPlans {
                weekendPlansSection
            }
        }
    }

    // Weekend plans section
    private var weekendPlansSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(.accentPrimary)
                    .accessibilityHidden(true)
                Text("Weekend Plans")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.textPrimary)
                Spacer()
                if !isProUser {
                    Text("PRO")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.accentPrimary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.accentPrimary.opacity(0.15))
                        .cornerRadius(6)
                        .accessibilityLabel("Pro feature")
                }
            }
            .padding(.top, Spacing.md)
            .accessibilityAddTraits(.isHeader)

            ForEach(Array(weekendPlans.enumerated()), id: \.offset) { index, plan in
                IndividualPlanCard(plan: plan, rank: regularPlansCount + index + 1)
                    .opacity(isProUser ? 1.0 : 0.6)
                    .accessibilityLabel("\(plan.title) at \(plan.venueName)")
                    .accessibilityHint(isProUser ? "Double tap to view weekend plan details" : "Weekend plans require Litplan Pro. Double tap to upgrade")
                    .accessibilityAddTraits(.isButton)
                    .onTapGesture {
                        handleWeekendPlanTap(plan)
                    }
            }
        }
    }

    // Computed properties for weekend plans
    private var hasWeekendPlans: Bool {
        plans.contains { $0.flags.isWeekendPlan }
    }

    private var weekendPlans: [Plan] {
        plans.filter { $0.flags.isWeekendPlan }
    }

    private var regularPlansCount: Int {
        plans.filter { !$0.flags.isWeekendPlan }.count
    }

    // MARK: - Group Plans List
    private var groupPlansList: some View {
        LazyVStack(spacing: Spacing.md) {
            if groupFlows.isEmpty {
                // Empty state for group plans
                VStack(spacing: Spacing.md) {
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.textTertiary)

                    Text("Group Plans Coming Soon")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.textPrimary)

                    Text("We're working on creating awesome group experiences for \(city.name)")
                        .font(.system(size: 16))
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xxl)
            } else {
                // Show first 3-5 group flows
                let displayCount = isProUser ? min(groupFlows.count, 5) : min(groupFlows.count, 3)

                ForEach(groupFlows.prefix(displayCount)) { groupFlow in
                    GroupFlowCard(
                        groupFlow: groupFlow,
                        isProUser: isProUser,
                        onTapViewItinerary: {
                            selectedGroupFlow = groupFlow
                        },
                        onTapUnlock: {
                            paywallTrigger = .groupFlow(cityName: city.name)
                        }
                    )
                }

                // Paywall card for free users after showing 3 group plans
                if !isProUser && groupFlows.count > 3 {
                    GroupPlansPaywallCard {
                        paywallTrigger = .groupFlow(cityName: city.name)
                    }
                }
            }
        }
    }

    // MARK: - Helper Functions
    private func loadPlansAsync() async {
        // Load plans asynchronously off the main thread to avoid blocking UI
        let loadedPlans = await Task.detached(priority: .userInitiated) {
            MockDataService.shared.getPlans(for: city.id)
        }.value

        // Update state on main actor
        await MainActor.run {
            plans = loadedPlans
        }
    }

    private func loadGroupFlowsAsync() async {
        // Load group flows asynchronously off the main thread
        let loadedGroupFlows = await Task.detached(priority: .userInitiated) {
            MockDataService.shared.getGroupFlows(for: city.id)
        }.value

        // Update state on main actor
        await MainActor.run {
            groupFlows = loadedGroupFlows
        }
    }

    // MARK: - Action Handlers

    private func handlePlanTap(_ plan: Plan) {
        // Haptic feedback on plan tap
        HapticManager.shared.medium()

        // Free users: check plan limit
        if !isProUser {
            viewedPlansCount += 1

            if viewedPlansCount > 10 {
                // Haptic feedback for limit reached
                HapticManager.shared.warning()
                paywallTrigger = .planLimit(cityName: city.name)
                return
            }
        }

        // Show plan details
        selectedPlan = plan
        showPlanDetails = true
    }

    private func handleWeekendPlanTap(_ plan: Plan) {
        // Haptic feedback
        HapticManager.shared.medium()

        if !isProUser {
            HapticManager.shared.warning()
            paywallTrigger = .weekendPlan(cityName: city.name)
            return
        }

        selectedPlan = plan
        showPlanDetails = true
    }

    private func handleSaveTap() {
        if !isProUser {
            HapticManager.shared.warning()
            paywallTrigger = .saveCity(cityName: city.name)
            return
        }

        // Toggle saved state
        isFavorited.toggle()

        // Haptic feedback - success for save, light for unsave
        if isFavorited {
            HapticManager.shared.success()
        } else {
            HapticManager.shared.light()
        }

        // TODO: Persist to backend
        if isFavorited {
            print("Saving city: \(city.name)")
            // Call API: POST /cities/save
        } else {
            print("Unsaving city: \(city.name)")
            // Call API: DELETE /cities/save
        }
    }
}

// MARK: - PlanDetailsView Placeholder
// TODO: This will be implemented in a future sprint
struct PlanDetailsView: View {
    let plan: Plan
    let onDismiss: () -> Void

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.appBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    Text(plan.title)
                        .font(.displayLarge)
                        .foregroundColor(.textPrimary)

                    Text(plan.venueName)
                        .font(.bodyLarge)
                        .foregroundColor(.textSecondary)

                    Text("Plan details will be displayed here")
                        .font(.body)
                        .foregroundColor(.textTertiary)
                }
                .padding(Spacing.lg)
            }

            // Close button
            Button(action: onDismiss) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 30))
                    .foregroundColor(.textTertiary)
            }
            .padding(Spacing.md)
        }
    }
}

// MARK: - Group Plans Paywall Card
struct GroupPlansPaywallCard: View {
    var onTapUpgrade: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "crown.fill")
                .font(.system(size: 40))
                .foregroundColor(.accentPrimary)

            Text("Unlock Group Experiences")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)

            Text("Upgrade to Litplan Pro to access curated group flows and premium experiences")
                .font(.system(size: 14))
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.md)

            Button(action: {
                HapticManager.shared.medium()
                onTapUpgrade?()
            }) {
                Text("Upgrade to Pro")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.accentPrimary)
                    .cornerRadius(12)
            }
            .padding(.horizontal, Spacing.md)
        }
        .padding(.vertical, Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.surfacePrimary)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.accentPrimary.opacity(0.3), lineWidth: 2)
                )
        )
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        CityDetailsView(city: City.sampleNYC) {
            print("Dismissed")
        }
    }
}
