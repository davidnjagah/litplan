//
//  BoltView.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/12/26.
//  Sprint 16 - Main Bolt View with 3D Parallax Card, City Search, and Token System
//
//  Features:
//  - 3D portal card that responds to device orientation
//  - Dynamic Island-style theme selector
//  - City search selector for worldwide cities
//  - Token system for Pro users (5/week)
//  - Save button on card
//  - Premium group plan generation
//
//  =============================================================================
//  IMPORTANT: State Management Pattern for Singletons
//  =============================================================================
//
//  When using shared/singleton managers in SwiftUI, you MUST use @ObservedObject
//  (not @StateObject). Here's why:
//
//  @StateObject:
//    - View CREATES and OWNS the object
//    - Object lifecycle is tied to the view
//    - SwiftUI guarantees the object is created only once
//    - Use for: Objects instantiated by this specific view
//
//  @ObservedObject:
//    - View OBSERVES an externally-managed object
//    - Object exists independently of the view
//    - Proper for singletons (.shared) and passed-in objects
//    - Use for: Shared managers, singletons, dependency-injected objects
//
//  Using @StateObject with .shared singletons can cause:
//    1. Observation failures (view doesn't update when state changes)
//    2. Initialization race conditions
//    3. MainActor deadlocks for @MainActor-isolated singletons
//    4. Unpredictable behavior when multiple views use the same singleton
//
//  =============================================================================
//
//  SELECTOR COMPONENTS: CitySearchSelector and DynamicIslandTabSelector
//  =============================================================================
//
//  FIX: Collapsed pills are ALWAYS rendered to maintain HStack layout stability.
//  Expanded content is overlaid separately at the parent level (BoltView).
//
//  - Each selector always renders its collapsed pill (maintains position)
//  - BoltView manages isExpanded state for each selector
//  - onChange handlers ensure only one selector is expanded at a time
//  - Expanded content is overlaid via ZStack at the top level
//
//  =============================================================================

import SwiftUI

struct BoltView: View {
    @EnvironmentObject var subscriptionManager: SubscriptionManager
    @EnvironmentObject var supabaseManager: SupabaseManager

    // MARK: - Shared Managers (use @ObservedObject for singletons)
    //
    // These are externally-managed singletons. Using @ObservedObject ensures:
    // - Proper observation of published properties
    // - No ownership conflicts with the singleton pattern
    // - Correct behavior on @MainActor-isolated types

    /// Motion manager for parallax/gyroscope effects - singleton observed by the view
    @ObservedObject private var motionManager = MotionManager.shared

    /// Token manager for Bolt generation limits - @MainActor singleton
    @ObservedObject private var tokenManager = BoltTokenManager.shared

    // MARK: - UI State
    //
    // These @State properties control the view's behavior. Key states:
    //
    // Loading States (mutually exclusive display states):
    //   - isLoading: Initial data fetch in progress
    //   - isGenerating: Bolt generation in progress
    //   Both show loadingView; when both are false, card or empty state shows
    //
    // Selection States:
    //   - selectedTheme: Currently selected theme tag
    //   - selectedCity: Currently selected city for generation
    //   Both must be set for generation to be enabled
    //
    // Expansion States (managed by BoltView, not the selectors):
    //   - isCitySelectorExpanded: City selector overlay is showing
    //   - isThemeSelectorExpanded: Theme selector overlay is showing
    //   Only one should be true at a time (onChange handlers enforce this)

    /// Currently selected theme tag for plan generation
    @State private var selectedTheme: ThemeTag? = nil

    /// Currently selected city for plan generation
    @State private var selectedCity: SearchedCity? = nil

    /// The current group flow displayed in the card (nil = empty state)
    /// Initialize with sample data directly to avoid async loading issues
    @State private var currentGroupFlow: GroupFlow? = GroupFlow.sampleNYCFlow

    /// Loading state for initial data fetch
    /// Initialize to false since we have sample data immediately
    @State private var isLoading = false

    /// Loading state for Bolt generation - set true during generateGroupFlow()
    @State private var isGenerating = false

    /// Controls fullScreenCover for detailed flow view
    @State private var showDetailedFlow = false

    /// Controls sheet for paywall presentation
    @State private var showPaywall = false

    /// Controls error alert presentation
    @State private var showError = false

    /// Error message to display in alert
    @State private var errorMessage = ""

    /// Whether the current flow is saved/favorited
    @State private var isSaved = false

    /// Toast notification data for transient messages
    @State private var toast: ToastData? = nil

    // MARK: - Animation States

    /// Controls card entrance animation
    /// Initialize to true since we have data immediately
    @State private var cardAppeared = true

    /// Opacity for background glow animation (0.5 to 0.8)
    @State private var backgroundGlowOpacity: Double = 0.5

    // Computed: Whether bolt button can be pressed
    private var canGenerate: Bool {
        selectedCity != nil && selectedTheme != nil && subscriptionManager.isProUser && tokenManager.canGenerate
    }

    // Computed: Reason why generation is disabled
    private var generationDisabledReason: String? {
        if !subscriptionManager.isProUser {
            return "Upgrade to Pro to generate custom plans"
        } else if selectedCity == nil && selectedTheme == nil {
            return "Select a city and theme to generate"
        } else if selectedCity == nil {
            return "Select a city to generate"
        } else if selectedTheme == nil {
            return "Select a theme to generate"
        } else if !tokenManager.canGenerate {
            return "No tokens remaining. Refresh: \(tokenManager.nextRefreshDate)"
        }
        return nil
    }

    // Safe area top inset for positioning below Dynamic Island
    private var safeAreaTop: CGFloat {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }?
            .safeAreaInsets.top ?? 59 // Default for Dynamic Island devices
    }

    var body: some View {
        ZStack {
            // Background
            backgroundView

            // Main content (card stays fixed regardless of selector state)
            VStack(spacing: 0) {
                // Top spacing for selectors (collapsed)
                Spacer()
                    .frame(height: safeAreaTop + 10 + 44 + 20) // safeArea + spacing + collapsed height + gap

                // Center: 3D Parallax Card with save button overlay
                //
                // DISPLAY STATE LOGIC:
                // - isLoading || isGenerating → Show loading spinner
                // - !isLoading && currentGroupFlow != nil → Show card
                // - !isLoading && currentGroupFlow == nil → Show empty state
                //
                // If stuck in loading state, check loadFeaturedGroupFlow() execution
                cardContentView

                Spacer()

                // Token indicator for Pro users
                if subscriptionManager.isProUser {
                    VStack(spacing: 6) {
                        tokenIndicator

                        // Subtle disclaimer
                        Text("Results are best with sizeable cities")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.35))
                    }
                    .padding(.bottom, 8)
                }

                // Bottom padding for tab bar
                Spacer()
                    .frame(height: 100)
            }

            // Floating Action Button (positioned 10pt below card)
            VStack {
                // Same top spacing as card container
                Spacer()
                    .frame(height: safeAreaTop + 10 + 44 + 20 + 480 + 10) // top + selector + gap + card height + 10pt spacing

                HStack {
                    Spacer()
                    boltButton
                        .padding(.trailing, 20)
                }

                Spacer()
            }

            // Selectors - each manages its own expansion state internally
            VStack {
                Spacer()
                    .frame(height: safeAreaTop + 10)

                // Both selectors side by side - each handles its own overlay
                HStack(spacing: 8) {
                    BoltCitySelector(selectedCity: $selectedCity)
                        .disabled(!subscriptionManager.isProUser)
                    BoltThemeSelector(selectedTag: $selectedTheme)
                        .disabled(!subscriptionManager.isProUser)
                }

                Spacer()
            }

            // Pro-only overlay for free users
            if !subscriptionManager.isProUser && !isLoading {
                freeUserOverlay
            }
        }
        .ignoresSafeArea()
        .onAppear {
            startMotionTracking()
            tokenManager.loadTokens()
        }
        .onDisappear {
            stopMotionTracking()
        }
        .onChange(of: selectedTheme) { _, _ in
            // Reset saved state when theme changes
            isSaved = false
        }
        .onChange(of: selectedCity) { _, _ in
            // Reset saved state when city changes
            isSaved = false
        }
        // Note: Selector expansion is handled internally by BoltCitySelector and BoltThemeSelector
        .fullScreenCover(isPresented: $showDetailedFlow) {
            if let flow = currentGroupFlow {
                DetailedGroupFlowView(
                    groupFlow: flow,
                    onDismiss: {
                        showDetailedFlow = false
                    },
                    onUpgrade: {
                        showDetailedFlow = false
                        showPaywall = true
                    }
                )
            }
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView(trigger: .groupFlow(cityName: selectedCity?.name ?? currentGroupFlow.map { getCityName(for: $0) } ?? ""))
        }
        .alert("Generation Failed", isPresented: $showError) {
            Button("Try Again") {
                if canGenerate {
                    generateGroupFlow()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .toast($toast)
    }

    // MARK: - Save Button (Heart)

    private var saveButton: some View {
        Button(action: {
            HapticManager.shared.light()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isSaved.toggle()
            }
            // TODO: Actually save to SavedItemsManager when implemented
        }) {
            Image(systemName: isSaved ? "heart.fill" : "heart")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(isSaved ? .boltGradientEnd : .white)
                .frame(width: 40, height: 40)
                .background(
                    Circle()
                        .fill(Color.black.opacity(0.5))
                        .overlay(
                            Circle()
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                )
        }
    }

    // MARK: - Bolt Button (FAB)

    private var boltButton: some View {
        ZStack {
            // Outer glow ring (pulse animation) - always show gradient
            Circle()
                .fill(Color.boltGradient)
                .frame(width: 76, height: 76)
                .opacity(canGenerate ? 0.3 : 0.15)
                .scaleEffect(1.1)
                .blur(radius: 8)

            // Main button
            Button(action: {
                handleBoltTap()
            }) {
                ZStack {
                    // Background - always gradient, just dimmed when disabled
                    Circle()
                        .fill(Color.boltGradient)
                        .frame(width: 56, height: 56)
                        .opacity(canGenerate ? 1.0 : 0.5)

                    // Highlight overlay
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.3),
                                    Color.clear
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)

                    // Icon
                    if isGenerating {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                            .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                    }
                }
            }
            .disabled(isGenerating)
            .buttonStyle(BoltScaleButtonStyle())
            .shadow(color: Color.boltGradientStart.opacity(canGenerate ? 0.5 : 0.2), radius: 12, x: 0, y: 6)
        }
    }

    // MARK: - Card Content View
    //
    // IMPORTANT: State Initialization Pattern
    // ---------------------------------------
    // This view initializes `currentGroupFlow` and `isLoading` at declaration time
    // rather than loading asynchronously in onAppear. This is because:
    //
    // 1. SwiftUI @State updates from async contexts (Task, DispatchQueue) can fail
    //    to trigger view re-renders in certain edge cases
    // 2. The view may appear/disappear multiple times (tab switching), causing
    //    race conditions with async loading
    // 3. Direct initialization guarantees the view renders correctly on first appear
    //
    // For dynamic data (API calls, generation), update state synchronously
    // from within the view's context when possible.

    @ViewBuilder
    private var cardContentView: some View {
        if isLoading || isGenerating {
            loadingView
        } else if let groupFlow = currentGroupFlow {
            ZStack(alignment: .topTrailing) {
                Parallax3DCard(
                    groupFlow: groupFlow,
                    motionManager: motionManager,
                    onTap: {
                        handleCardTap()
                    }
                )

                // Save button overlay
                saveButton
                    .padding(.top, 16)
                    .padding(.trailing, 16)
            }
        } else {
            emptyStateView
        }
    }

    // MARK: - Token Indicator

    private var tokenIndicator: some View {
        HStack(spacing: 6) {
            Image(systemName: "bolt.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.boltGradientStart)

            Text(tokenManager.formattedTokenCount)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)

            Text("this week")
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.6))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Color.black.opacity(0.6))
                .overlay(
                    Capsule()
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
        )
    }

    // MARK: - Free User Overlay

    private var freeUserOverlay: some View {
        VStack(spacing: 20) {
            Spacer()

            VStack(spacing: 16) {
                Image(systemName: "crown.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.boltGradientStart)

                Text("Vibez is Pro Only")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)

                Text("Upgrade to generate custom\ngroup plans for any city")
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)

                Button(action: {
                    HapticManager.shared.medium()
                    showPaywall = true
                }) {
                    Text("Upgrade to Pro")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.black)
                        .frame(width: 200, height: 50)
                        .background(Color.boltGradient)
                        .cornerRadius(25)
                }
                .padding(.top, 8)
            }
            .padding(.vertical, 30)
            .padding(.horizontal, 24)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color.black.opacity(0.9))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.boltGradientStart.opacity(0.3), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 40)

            Spacer()
                .frame(height: 150)
        }
    }

    // MARK: - Background View

    private var backgroundView: some View {
        ZStack {
            // Base black background
            Color.appBackground

            // Animated gradient glow in center
            RadialGradient(
                colors: [
                    Color.boltPortalGlow.opacity(backgroundGlowOpacity * 0.3),
                    Color.boltGradientStart.opacity(backgroundGlowOpacity * 0.15),
                    Color.clear
                ],
                center: .center,
                startRadius: 50,
                endRadius: 400
            )

            // Subtle top gradient
            LinearGradient(
                colors: [
                    Color.boltGradientStart.opacity(0.2),
                    Color.clear
                ],
                startPoint: .top,
                endPoint: .center
            )
        }
        .ignoresSafeArea()
        .onAppear {
            animateBackgroundGlow()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: Spacing.md) {
            // Animated loading indicator
            ZStack {
                // Outer ring
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Color.boltGradientStart, Color.boltGradientEnd],
                            startPoint: .leading,
                            endPoint: .trailing
                        ),
                        lineWidth: 3
                    )
                    .frame(width: 60, height: 60)
                    .rotationEffect(.degrees(isLoading || isGenerating ? 360 : 0))
                    .animation(
                        .linear(duration: 1.5)
                        .repeatForever(autoreverses: false),
                        value: isLoading || isGenerating
                    )

                // Bolt icon
                Image(systemName: "bolt.fill")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
            }

            Text(isGenerating ? "Generating your plan..." : "Finding perfect plans...")
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.textSecondary)
        }
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: Spacing.lg) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.boltGradient)
                    .frame(width: 80, height: 80)

                Image(systemName: "bolt.slash")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
            }

            VStack(spacing: Spacing.sm) {
                Text("Ready to Generate")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.textPrimary)

                Text("Select a city and theme above\nthen tap the bolt to generate")
                    .font(.system(size: 15))
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - Actions

    private func handleCardTap() {
        HapticManager.shared.medium()

        if subscriptionManager.isProUser {
            showDetailedFlow = true
        } else {
            showPaywall = true
        }
    }

    private func handleBoltTap() {
        // Check if city and theme are selected first - show toast for these
        if selectedCity == nil && selectedTheme == nil {
            HapticManager.shared.warning()
            toast = ToastData(type: .warning, message: "Select a city and theme to generate a plan")
            return
        } else if selectedCity == nil {
            HapticManager.shared.warning()
            toast = ToastData(type: .warning, message: "Select a city to generate a plan")
            return
        } else if selectedTheme == nil {
            HapticManager.shared.warning()
            toast = ToastData(type: .warning, message: "Select a theme to generate a plan")
            return
        }

        // Check other requirements (Pro status, tokens)
        guard canGenerate else {
            if !subscriptionManager.isProUser {
                showPaywall = true
            } else if !tokenManager.canGenerate {
                toast = ToastData(type: .info, message: "No tokens remaining. Refreshes \(tokenManager.nextRefreshDate)")
            }
            return
        }

        HapticManager.shared.heavy()
        generateGroupFlow()
    }

    // MARK: - Generation

    private func generateGroupFlow() {
        guard let city = selectedCity, let theme = selectedTheme else { return }

        // Check if user has tokens BEFORE starting (don't consume yet)
        guard tokenManager.canGenerate else {
            errorMessage = "No tokens available. Please wait until next refresh."
            showError = true
            return
        }

        isGenerating = true
        cardAppeared = false

        Task {
            do {
                // Call the real bolt pipeline API
                let groupFlow = try await callBoltPipeline(city: city, theme: theme)

                await MainActor.run {
                    // SUCCESS: Now consume the token (only after successful generation)
                    _ = tokenManager.consumeToken(cityName: city.name, themeName: theme.name)

                    currentGroupFlow = groupFlow
                    isGenerating = false

                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        withAnimation {
                            cardAppeared = true
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    // FAILURE: Token NOT consumed, user keeps their token
                    isGenerating = false
                    errorMessage = "Failed to generate plan: \(error.localizedDescription)"
                    showError = true
                }
            }
        }
    }

    /// Call the bolt pipeline API
    private func callBoltPipeline(city: SearchedCity, theme: ThemeTag) async throws -> GroupFlow {
        // Get the theme definition for better AI context
        let themeDefinition = ThemeTag.tagDefinitions[theme.name] ?? theme.name

        // Get user ID for tracking
        let userId = supabaseManager.currentUser?.id ?? "anonymous"

        // Call the real bolt pipeline API
        let groupFlow = try await APIService.shared.generateCustomGroupFlow(
            city: city.name,
            country: city.country,
            theme: theme.name,
            themeDefinition: themeDefinition,
            userId: userId
        )

        return groupFlow
    }

    // MARK: - Motion Tracking

    private func startMotionTracking() {
        motionManager.startMotionUpdates()
    }

    private func stopMotionTracking() {
        motionManager.stopMotionUpdates()
    }

    private func getCityName(for flow: GroupFlow) -> String {
        // Map cityId to city name
        switch flow.cityId.lowercased() {
        case "nyc", "new-york", "new_york":
            return "New York"
        case "la", "los-angeles", "los_angeles":
            return "Los Angeles"
        default:
            return flow.cityId.capitalized
        }
    }

    // MARK: - Animations

    private func animateBackgroundGlow() {
        withAnimation(
            .easeInOut(duration: 3.0)
            .repeatForever(autoreverses: true)
        ) {
            backgroundGlowOpacity = 0.8
        }
    }
}

// MARK: - Bolt Scale Button Style

private struct BoltScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.9 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// MARK: - Preview

#Preview("Bolt View") {
    BoltView()
        .environmentObject(SubscriptionManager.shared)
        .environmentObject(SupabaseManager.shared)
}

#Preview("Bolt View - Pro User") {
    let subManager = SubscriptionManager.shared
    // Note: In real preview, you'd set isProUser = true

    return BoltView()
        .environmentObject(subManager)
        .environmentObject(SupabaseManager.shared)
}
