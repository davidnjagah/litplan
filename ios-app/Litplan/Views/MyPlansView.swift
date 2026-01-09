//
//  MyPlansView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/31/25.
//  Sprint 13 - Transform "Viewed Cities" to "My Plans & Saved" Screen
//  Shows saved cities, individual plans, and group plans in tabbed interface
//
//  Sprint 17C Updates:
//  - Added encouraging empty state messages with "Start Exploring" CTA
//  - FREE users CAN save cities (no restriction)
//  - FREE users CANNOT save individual plans or group plans (paywall shown)
//  - Previously saved items remain visible for downgraded users
//  - Pro badge/lock icons on plan cards for free users
//
//  Sprint 18C Updates:
//  - Changed from mock data to real saved data using SavedItemsManager
//  - Data persisted in UserDefaults (local storage)
//  - Empty states shown when no items are actually saved
//

import SwiftUI

// MARK: - Tab Enum
enum MyPlansTab: String, CaseIterable {
    case savedCities = "Cities"
    case individualPlans = "Plans"
    case groupPlans = "Groups"

    var icon: String {
        switch self {
        case .savedCities:
            return "building.2"
        case .individualPlans:
            return "calendar"
        case .groupPlans:
            return "person.3"
        }
    }

    var emptyIcon: String {
        switch self {
        case .savedCities:
            return "heart"
        case .individualPlans:
            return "calendar.badge.plus"
        case .groupPlans:
            return "person.3.sequence"
        }
    }

    var emptyTitle: String {
        switch self {
        case .savedCities:
            return "No saved cities yet"
        case .individualPlans:
            return "No saved plans yet"
        case .groupPlans:
            return "No saved group plans yet"
        }
    }

    var emptyMessage: String {
        switch self {
        case .savedCities:
            return "No cities saved yet. Start exploring to find your next adventure!"
        case .individualPlans:
            return "No plans saved yet. Discover amazing plans in cities you love!"
        case .groupPlans:
            return "No group plans saved yet. Find the perfect group experience!"
        }
    }

    var emptyButtonTitle: String {
        return "Start Exploring"
    }
}

// MARK: - Main View
struct MyPlansView: View {
    // MARK: - State Properties
    @State private var selectedTab: MyPlansTab = .savedCities
    @State private var isRefreshing: Bool = false

    // Navigation state
    @State private var selectedCity: City?
    @State private var showCityDetails: Bool = false
    @State private var selectedPlan: Plan?
    @State private var showPlanDetails: Bool = false
    @State private var selectedGroupFlow: GroupFlow?
    @State private var showGroupFlowDetails: Bool = false
    @State private var paywallTrigger: PaywallTrigger? = nil

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared
    @ObservedObject private var authManager = AuthenticationManager.shared

    // SavedItemsManager for real saved data
    @ObservedObject private var savedItemsManager = SavedItemsManager.shared

    // Callback to switch to Home/Explore tab
    var onSwitchToExplore: (() -> Void)?

    private var isProUser: Bool {
        subscriptionManager.isProUser
    }

    // Use real data from SavedItemsManager
    private var savedCities: [City] {
        savedItemsManager.savedCities
    }

    private var savedPlans: [Plan] {
        savedItemsManager.savedPlans
    }

    private var savedGroupFlows: [GroupFlow] {
        savedItemsManager.savedGroupFlows
    }

    private var isLoading: Bool {
        savedItemsManager.isLoading
    }

    private var totalSavedCount: Int {
        savedItemsManager.totalSavedCount
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    headerView

                    // Segment Control
                    segmentControl

                    // Content
                    if isLoading {
                        loadingView
                            .transition(.opacity)
                    } else {
                        contentView
                            .transition(.opacity)
                    }
                }
            }
            .animation(.easeInOut(duration: 0.2), value: isLoading)
            .animation(.easeInOut(duration: 0.25), value: selectedTab)
            .navigationBarHidden(true)
            .fullScreenCover(isPresented: $showCityDetails) {
                if let city = selectedCity {
                    CityDetailsView(city: city) {
                        showCityDetails = false
                    }
                }
            }
            .sheet(isPresented: $showGroupFlowDetails) {
                if let groupFlow = selectedGroupFlow {
                    DetailedGroupFlowView(groupFlow: groupFlow, onDismiss: {
                        showGroupFlowDetails = false
                    })
                }
            }
            .sheet(isPresented: $showPlanDetails) {
                if let plan = selectedPlan {
                    PlanDetailView(plan: plan, onDismiss: {
                        showPlanDetails = false
                    })
                }
            }
            .sheet(item: $paywallTrigger) { trigger in
                PaywallView(trigger: trigger) {
                    paywallTrigger = nil
                }
                .environmentObject(subscriptionManager)
            }
            .onAppear {
                loadData()

                // Check pro status for all users (including guests)
                Task {
                    await subscriptionManager.refreshProStatus()
                }
            }
        }
    }

    // MARK: - Header View
    private var headerView: some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            Text("Saved")
                .font(.displayLarge)
                .foregroundColor(.textPrimary)

            Text("\(totalSavedCount) saved item\(totalSavedCount == 1 ? "" : "s")")
                .font(.callout)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Spacing.md)
        .padding(.top, 60) // Account for safe area
        .padding(.bottom, Spacing.md)
    }

    // MARK: - Segment Control
    private var segmentControl: some View {
        HStack(spacing: Spacing.xs) {
            ForEach(MyPlansTab.allCases, id: \.self) { tab in
                segmentButton(for: tab)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.bottom, Spacing.md)
    }

    private func segmentButton(for tab: MyPlansTab) -> some View {
        let isSelected = selectedTab == tab
        let count = countForTab(tab)

        return Button(action: {
            HapticManager.shared.light()
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = tab
            }
        }) {
            HStack(spacing: Spacing.xxs) {
                Image(systemName: tab.icon)
                    .font(.system(size: 12, weight: .medium))

                Text(tab.rawValue)
                    .font(.system(size: 14, weight: .semibold))

                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(isSelected ? .appBackground : .textSecondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(isSelected ? Color.textPrimary.opacity(0.3) : Color.surfaceSecondary)
                        )
                }
            }
            .foregroundColor(isSelected ? .textPrimary : .textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isSelected ? Color.accentPrimary : Color.surfacePrimary)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Color.clear : Color.surfaceSecondary, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(tab.rawValue), \(count) items")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func countForTab(_ tab: MyPlansTab) -> Int {
        switch tab {
        case .savedCities:
            return savedCities.count
        case .individualPlans:
            return savedPlans.count
        case .groupPlans:
            return savedGroupFlows.count
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        LoadingStateView(message: "Loading your saved items...")
    }

    // MARK: - Content View
    private var contentView: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: Spacing.md) {
                switch selectedTab {
                case .savedCities:
                    savedCitiesContent
                case .individualPlans:
                    savedPlansContent
                case .groupPlans:
                    savedGroupFlowsContent
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.xl)
        }
        .refreshable {
            await refreshData()
        }
    }

    // MARK: - Saved Cities Content
    @ViewBuilder
    private var savedCitiesContent: some View {
        if savedCities.isEmpty {
            emptyStateView(for: .savedCities)
        } else {
            ForEach(savedCities) { city in
                SavedCityCard(city: city) {
                    handleCityTap(city)
                }
            }
        }
    }

    // MARK: - Saved Plans Content
    @ViewBuilder
    private var savedPlansContent: some View {
        if savedPlans.isEmpty {
            emptyStateView(for: .individualPlans)
        } else {
            // Note for free users: Previously saved plans remain visible
            // but free users cannot add new plans to saved
            ForEach(Array(savedPlans.enumerated()), id: \.element.id) { index, plan in
                SavedPlanCard(
                    plan: plan,
                    cityName: getCityName(for: plan),
                    isProUser: isProUser
                ) {
                    handlePlanTap(plan)
                }
            }
        }
    }

    // MARK: - Saved Group Flows Content
    @ViewBuilder
    private var savedGroupFlowsContent: some View {
        if savedGroupFlows.isEmpty {
            emptyStateView(for: .groupPlans)
        } else {
            // Note for free users: Previously saved group plans remain visible
            // but free users cannot add new group plans to saved
            ForEach(savedGroupFlows) { groupFlow in
                SavedGroupFlowCard(
                    groupFlow: groupFlow,
                    cityName: getCityName(for: groupFlow),
                    isProUser: isProUser
                ) {
                    handleGroupFlowTap(groupFlow)
                }
            }
        }
    }

    // MARK: - Empty State View
    private func emptyStateView(for tab: MyPlansTab) -> some View {
        VStack(spacing: Spacing.lg) {
            Spacer()
                .frame(height: Spacing.xxl)

            Image(systemName: tab.emptyIcon)
                .font(.system(size: 60, weight: .light))
                .foregroundColor(.textTertiary)

            VStack(spacing: Spacing.xs) {
                Text(tab.emptyTitle)
                    .font(.headline)
                    .foregroundColor(.textPrimary)

                Text(tab.emptyMessage)
                    .font(.callout)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }

            // Start Exploring CTA button
            Button(action: {
                HapticManager.shared.medium()
                onSwitchToExplore?()
            }) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "safari")
                        .font(.system(size: 14, weight: .semibold))

                    Text(tab.emptyButtonTitle)
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.accentPrimary)
                )
            }
            .buttonStyle(PlainButtonStyle())
            .padding(.top, Spacing.sm)

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
    }

    // MARK: - Data Loading
    private func loadData() {
        // Check if user is authenticated
        guard authManager.isAuthenticated || authManager.isGuest else {
            return
        }

        // Load saved items from local storage via SavedItemsManager
        // Data is already loaded on init, but refresh to ensure we have latest
        savedItemsManager.loadFromLocalStorage()
    }

    private func refreshData() async {
        isRefreshing = true

        // Refresh saved items from SavedItemsManager
        await savedItemsManager.refresh()

        await MainActor.run {
            isRefreshing = false
        }
    }

    // MARK: - Helper Functions
    private func getCityName(for plan: Plan) -> String {
        // Use SavedItemsManager to get city name
        savedItemsManager.getCityName(for: plan)
    }

    private func getCityName(for groupFlow: GroupFlow) -> String {
        // Use SavedItemsManager to get city name
        savedItemsManager.getCityName(for: groupFlow)
    }

    // MARK: - Tap Handlers
    private func handleCityTap(_ city: City) {
        HapticManager.shared.medium()
        selectedCity = city
        showCityDetails = true
    }

    private func handlePlanTap(_ plan: Plan) {
        HapticManager.shared.medium()
        selectedPlan = plan
        showPlanDetails = true
    }

    private func handleGroupFlowTap(_ groupFlow: GroupFlow) {
        HapticManager.shared.medium()

        if isProUser {
            selectedGroupFlow = groupFlow
            showGroupFlowDetails = true
        } else {
            HapticManager.shared.warning()
            paywallTrigger = .groupFlow(cityName: getCityName(for: groupFlow))
        }
    }
}

// MARK: - Saved City Card Component
struct SavedCityCard: View {
    let city: City
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.sm) {
                // City thumbnail
                AsyncImageView(url: URL(string: city.displayAssets.thumbnailUrl))
                    .frame(width: 80, height: 80)
                    .cornerRadius(12)
                    .clipped()

                // City info
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    // City name
                    Text(city.name)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)

                    // Country with flag
                    HStack(spacing: 4) {
                        Text(city.displayAssets.countryFlag)
                            .font(.system(size: 14))

                        Text(city.country)
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Plan count - hardcoded for performance
                    HStack(spacing: Spacing.sm) {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.system(size: 11))
                                .foregroundColor(.textTertiary)

                            Text("50 plans")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                            // Original: Text("\(city.metadata.displayPlanCount) plans")
                        }

                        if city.metadata.featured {
                            Text("Featured")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.accentPrimary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule()
                                        .fill(Color.accentPrimary.opacity(0.15))
                                )
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Heart icon and chevron
                VStack {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.accentPrimary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.textTertiary)
                }
            }
            .padding(Spacing.sm)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(city.name), \(city.country)")
        .accessibilityHint("Double tap to view 50 nightlife plans")
    }
}

// MARK: - Saved Plan Card Component
struct SavedPlanCard: View {
    let plan: Plan
    let cityName: String
    let isProUser: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.sm) {
                // Plan image with Pro badge overlay for free users
                ZStack(alignment: .topTrailing) {
                    AsyncImageView(url: URL(string: plan.images.first ?? ""))
                        .frame(width: 80, height: 80)
                        .cornerRadius(12)
                        .clipped()

                    // Pro badge for free users
                    if !isProUser {
                        HStack(spacing: 2) {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 8, weight: .bold))

                            Text("PRO")
                                .font(.system(size: 8, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 3)
                        .background(
                            Capsule()
                                .fill(Color.accentPrimary)
                        )
                        .offset(x: 4, y: -4)
                    }
                }

                // Plan info
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    // Title
                    Text(plan.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(2)

                    // Venue name
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)

                        Text(plan.venueName)
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // City and category
                    HStack(spacing: Spacing.xs) {
                        Text(cityName)
                            .font(.caption)
                            .foregroundColor(.textSecondary)

                        Text("•")
                            .font(.caption)
                            .foregroundColor(.textTertiary)

                        Text(plan.category)
                            .font(.caption)
                            .foregroundColor(.accentPrimary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Heart icon, lock icon for free users, and chevron
                VStack {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.accentPrimary)

                    if !isProUser {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.textTertiary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.textTertiary)
                }
            }
            .padding(Spacing.sm)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isProUser ? Color.surfaceSecondary : Color.accentPrimary.opacity(0.3), lineWidth: isProUser ? 1 : 1.5)
            )
            .opacity(isProUser ? 1.0 : 0.85)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(plan.title) at \(plan.venueName)")
        .accessibilityHint(isProUser ? "Double tap to view plan details" : "Pro subscription required to save new plans")
    }
}

// MARK: - Saved Group Flow Card Component
struct SavedGroupFlowCard: View {
    let groupFlow: GroupFlow
    let cityName: String
    let isProUser: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                // Header row
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        // Title with Pro badge for free users
                        HStack(spacing: Spacing.xs) {
                            Text(groupFlow.title)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.textPrimary)
                                .lineLimit(2)

                            // Pro badge for free users
                            if !isProUser {
                                HStack(spacing: 2) {
                                    Image(systemName: "lock.fill")
                                        .font(.system(size: 8, weight: .bold))

                                    Text("PRO")
                                        .font(.system(size: 8, weight: .bold))
                                }
                                .foregroundColor(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 3)
                                .background(
                                    Capsule()
                                        .fill(Color.accentPrimary)
                                )
                            }
                        }

                        // City
                        Text(cityName)
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    // Heart and lock icons
                    VStack(spacing: Spacing.xs) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.accentPrimary)

                        if !isProUser {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.textTertiary)
                        }
                    }
                }

                // Details row
                HStack(spacing: Spacing.md) {
                    // Duration
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)

                        Text(groupFlow.formattedDuration)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    // Venue count
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)

                        Text("\(groupFlow.activities.count) venues")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    // Cost
                    HStack(spacing: 4) {
                        Image(systemName: "dollarsign.circle")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)

                        Text(groupFlow.formattedCost)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    // Difficulty badge
                    Text(groupFlow.difficulty.capitalized)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(difficultyColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(difficultyColor.opacity(0.15))
                        )
                }
            }
            .padding(Spacing.md)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isProUser ? Color.surfaceSecondary : Color.accentPrimary.opacity(0.3), lineWidth: isProUser ? 1 : 1.5)
            )
            .opacity(isProUser ? 1.0 : 0.85)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(groupFlow.title) in \(cityName)")
        .accessibilityHint(isProUser ? "Double tap to view full itinerary" : "Pro subscription required to save new group plans")
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
}

// MARK: - Preview
#Preview("My Plans - Saved Tab") {
    MyPlansView()
        .environmentObject(SubscriptionManager.shared)
        .environmentObject(AuthenticationManager.shared)
}

#Preview("Saved City Card") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        SavedCityCard(city: MockDataService.shared.cities[0]) {
            print("Tapped NYC")
        }
        .padding(Spacing.md)
    }
}

#Preview("Saved Plan Card") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            SavedPlanCard(plan: Plan.sampleBlueNote, cityName: "New York", isProUser: true) {
                print("Tapped plan (Pro)")
            }

            SavedPlanCard(plan: Plan.sampleTheRoof, cityName: "New York", isProUser: false) {
                print("Tapped plan (Free)")
            }
        }
        .padding(Spacing.md)
    }
}

#Preview("Saved Group Flow Card") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            SavedGroupFlowCard(
                groupFlow: GroupFlow.sampleNYCFlow,
                cityName: "New York",
                isProUser: true
            ) {
                print("Tapped group flow")
            }

            SavedGroupFlowCard(
                groupFlow: GroupFlow.sampleLAFlow,
                cityName: "Los Angeles",
                isProUser: false
            ) {
                print("Tapped locked group flow")
            }
        }
        .padding(Spacing.md)
    }
}
