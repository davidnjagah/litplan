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
    case groupPlans = "Vibez"
    case savedCities = "Cities"
    case individualPlans = "Plans"

    var icon: String {
        switch self {
        case .groupPlans:
            return "bolt"
        case .savedCities:
            return "building.2"
        case .individualPlans:
            return "calendar"
        }
    }

    var emptyIcon: String {
        switch self {
        case .groupPlans:
            return "bolt.slash"
        case .savedCities:
            return "heart"
        case .individualPlans:
            return "calendar.badge.plus"
        }
    }

    var emptyTitle: String {
        switch self {
        case .groupPlans:
            return "No saved Vibez yet"
        case .savedCities:
            return "No saved cities yet"
        case .individualPlans:
            return "No saved plans yet"
        }
    }

    var emptyMessage: String {
        switch self {
        case .groupPlans:
            return "No Vibez saved yet. Generate one and tap the heart to save it!"
        case .savedCities:
            return "No cities saved yet. Generate a Vibez to start building your night out!"
        case .individualPlans:
            return "No plans saved yet. Generate a Vibez and save your favourites!"
        }
    }

    var emptyButtonTitle: String {
        return "Create a Vibez"
    }
}

// MARK: - Main View
struct MyPlansView: View {
    // MARK: - State Properties
    @State private var selectedTab: MyPlansTab = .groupPlans
    @State private var isRefreshing: Bool = false

    // Navigation state - using item: binding to prevent race condition
    @State private var selectedCity: City?
    @State private var selectedPlan: Plan?
    @State private var selectedGroupFlow: GroupFlow?
    @State private var paywallTrigger: PaywallTrigger? = nil

    // Subscription manager for premium gating
    @ObservedObject private var subscriptionManager = SubscriptionManager.shared
    @ObservedObject private var authManager = AuthenticationManager.shared

    // SavedItemsManager for real saved data
    @ObservedObject private var savedItemsManager = SavedItemsManager.shared

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

    // Visible items: Pro sees all; free users see only items in their visible slot set
    private var visibleCities: [City] {
        isProUser ? savedCities : savedCities.filter { savedItemsManager.visibleCityIds.contains($0.id) }
    }
    private var overflowCities: [City] {
        isProUser ? [] : savedCities.filter { !savedItemsManager.visibleCityIds.contains($0.id) }
    }
    private var visiblePlans: [Plan] {
        isProUser ? savedPlans : savedPlans.filter { savedItemsManager.visiblePlanIds.contains($0.id) }
    }
    private var overflowPlans: [Plan] {
        isProUser ? [] : savedPlans.filter { !savedItemsManager.visiblePlanIds.contains($0.id) }
    }
    private var visibleGroupFlows: [GroupFlow] {
        isProUser ? savedGroupFlows : savedGroupFlows.filter { savedItemsManager.visibleGroupFlowIds.contains($0.id) }
    }
    private var overflowGroupFlows: [GroupFlow] {
        isProUser ? [] : savedGroupFlows.filter { !savedItemsManager.visibleGroupFlowIds.contains($0.id) }
    }
    private var hasOverflowItems: Bool {
        !overflowCities.isEmpty || !overflowPlans.isEmpty || !overflowGroupFlows.isEmpty
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
                            .safeAreaInset(edge: .bottom) {
                                if !isProUser && !authManager.isGuest && hasOverflowItems {
                                    savesLimitFooter
                                }
                            }
                    }
                }
            }
            .animation(.easeInOut(duration: 0.2), value: isLoading)
            .animation(.easeInOut(duration: 0.25), value: selectedTab)
            .navigationBarHidden(true)
            .fullScreenCover(item: $selectedCity) { city in
                CityDetailsView(city: city) {
                    selectedCity = nil
                }
            }
            .sheet(item: $selectedGroupFlow) { groupFlow in
                DetailedGroupFlowView(groupFlow: groupFlow, onDismiss: {
                    selectedGroupFlow = nil
                })
            }
            .sheet(item: $selectedPlan) { plan in
                PlanDetailView(plan: plan, onDismiss: {
                    selectedPlan = nil
                })
            }
            .sheet(item: $paywallTrigger) { trigger in
                PaywallView(trigger: trigger) {
                    paywallTrigger = nil
                }
                .environmentObject(subscriptionManager)
            }
            .onAppear {
                loadData()
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

    // MARK: - Saves Limit Footer (free users only, after 4th save)
    private var savesLimitFooter: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.accentPrimary)

                Text("3 saves max")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textPrimary)

                Text("per category")
                    .font(.system(size: 12))
                    .foregroundColor(.textSecondary)
            }

            Button(action: {
                HapticManager.shared.light()
                paywallTrigger = .profile
            }) {
                Text("Upgrade to Pro for unlimited saves")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.accentSecondary)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.xl)
        .padding(.bottom, Spacing.lg)
        .background(
            LinearGradient(
                colors: [Color.appBackground.opacity(0), Color.appBackground],
                startPoint: .top,
                endPoint: .center
            )
        )
    }

    // MARK: - Saved Cities Content
    @ViewBuilder
    private var savedCitiesContent: some View {
        if savedCities.isEmpty {
            emptyStateView(for: .savedCities)
        } else {
            ForEach(visibleCities) { city in
                SavedCityCard(city: city) { handleCityTap(city) }
            }
            if !isProUser && !overflowCities.isEmpty {
                ForEach(overflowCities) { city in
                    SavedCityCard(city: city) { }
                        .blur(radius: 6)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
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
            ForEach(visiblePlans) { plan in
                SavedPlanCard(
                    plan: plan,
                    cityName: getCityName(for: plan),
                    isProUser: true
                ) {
                    handlePlanTap(plan)
                }
            }
            if !isProUser && !overflowPlans.isEmpty {
                ForEach(overflowPlans) { plan in
                    SavedPlanCard(
                        plan: plan,
                        cityName: getCityName(for: plan),
                        isProUser: true
                    ) { }
                        .blur(radius: 6)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
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
            ForEach(visibleGroupFlows) { groupFlow in
                SavedGroupFlowCard(
                    groupFlow: groupFlow,
                    cityName: getCityName(for: groupFlow)
                ) {
                    handleGroupFlowTap(groupFlow)
                }
            }
            if !isProUser && !overflowGroupFlows.isEmpty {
                ForEach(overflowGroupFlows) { groupFlow in
                    SavedGroupFlowCard(
                        groupFlow: groupFlow,
                        cityName: getCityName(for: groupFlow)
                    ) { }
                        .blur(radius: 6)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
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

            // Create a Vibez CTA button
            Button(action: {
                HapticManager.shared.medium()
                NotificationCenter.default.post(name: .navigateToVibezWithCity, object: nil)
            }) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "bolt.fill")
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
        guard authManager.isAuthenticated && !authManager.isGuest else { return }
        guard !savedItemsManager.isLoading else { return }
        Task { await savedItemsManager.refresh() }
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
    }

    private func handlePlanTap(_ plan: Plan) {
        HapticManager.shared.medium()
        selectedPlan = plan
    }

    private func handleGroupFlowTap(_ groupFlow: GroupFlow) {
        HapticManager.shared.medium()
        selectedGroupFlow = groupFlow
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
                AsyncImageView(url: URL(string: city.displayAssets.thumbnailUrl), targetSize: CGSize(width: 80, height: 80))
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

    // Fallback image URL for plans without images
    private var planImageUrl: URL? {
        if let firstImage = plan.images.first, !firstImage.isEmpty {
            return URL(string: firstImage)
        }
        return URL(string: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400")
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.sm) {
                // Plan image with Pro badge overlay for free users
                ZStack(alignment: .topTrailing) {
                    AsyncImageView(url: planImageUrl, targetSize: CGSize(width: 80, height: 80))
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
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(groupFlow.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.textPrimary)
                            .lineLimit(2)

                        Text(cityName)
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "heart.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.accentPrimary)
                }

                HStack(spacing: Spacing.md) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)
                        Text(groupFlow.formattedDuration)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)
                        Text("\(groupFlow.activities.count) venues")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "dollarsign.circle")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)
                        Text(groupFlow.formattedCost)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Text(groupFlow.difficulty.capitalized)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(difficultyColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(difficultyColor.opacity(0.15)))
                }
            }
            .padding(Spacing.md)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.surfaceSecondary, lineWidth: 1))
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(groupFlow.title) in \(cityName)")
        .accessibilityHint("Double tap to view full itinerary")
    }

    private var difficultyColor: Color {
        switch groupFlow.difficulty {
        case "easy": return .success
        case "moderate": return .warning
        case "intense": return .error
        default: return .textSecondary
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

        SavedCityCard(city: City.sampleNYC) {
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
                cityName: "New York"
            ) {
                print("Tapped group flow")
            }

            SavedGroupFlowCard(
                groupFlow: GroupFlow.sampleLAFlow,
                cityName: "Los Angeles"
            ) {
                print("Tapped group flow")
            }
        }
        .padding(Spacing.md)
    }
}
