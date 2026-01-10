//
//  PaywallView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/30/25.
//  Full-screen subscription paywall modal - Sprint 3, Day 11
//

import SwiftUI
import StoreKit

struct PaywallView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @EnvironmentObject private var subscriptionManager: SubscriptionManager
    @StateObject private var authManager = AuthenticationManager.shared
    @State private var selectedPlan: SubscriptionPlan = .yearly
    @State private var isProcessing = false
    @State private var showError = false
    @State private var showSuccess = false
    @State private var showGuestLoginPrompt = false
    @State private var showEmailLogin = false
    @State private var pendingPurchaseAfterLogin = false

    // Optional trigger for context-specific messaging
    let trigger: PaywallTrigger?
    let onDismiss: (() -> Void)?

    init(trigger: PaywallTrigger? = nil, onDismiss: (() -> Void)? = nil) {
        self.trigger = trigger
        self.onDismiss = onDismiss
    }

    var body: some View {
        ZStack {
            // Background
            Color.surfacePrimary
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Header section (context-aware)
                    if let trigger = trigger {
                        triggerHeaderSection(trigger)
                    } else {
                        headerSection
                    }

                    // Benefits list
                    benefitsSection

                    // Pricing cards
                    pricingSection

                    // CTA Buttons
                    ctaSection

                    // Legal text
                    legalSection
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xl)
                .padding(.bottom, Spacing.xxl)
            }
            .onAppear {
                // Always attempt to load products when paywall appears
                // Force load if products are empty, otherwise use cache check
                let shouldForceLoad = subscriptionManager.availableProducts.isEmpty

                Task {
                    await subscriptionManager.loadProducts(force: shouldForceLoad)
                }
            }

            // Success overlay
            if showSuccess {
                successOverlay
            }

            // Close button
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        HapticManager.shared.light()
                        onDismiss?()
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.textTertiary)
                    }
                    .accessibilityLabel("Close")
                    .accessibilityHint("Dismiss paywall")
                    .frame(minWidth: 44, minHeight: 44)
                    .padding(.top, Spacing.md)
                    .padding(.trailing, Spacing.md)
                }
                Spacer()
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            if let errorMessage = subscriptionManager.errorMessage {
                Text(errorMessage)
            } else {
                Text("An error occurred. Please try again.")
            }
        }
        .sheet(isPresented: $showGuestLoginPrompt) {
            GuestLoginPromptView(
                showEmailLogin: $showEmailLogin,
                onLoginSuccess: {
                    showGuestLoginPrompt = false
                    // Automatically attempt purchase after successful login
                    if pendingPurchaseAfterLogin {
                        pendingPurchaseAfterLogin = false
                        Task {
                            await handleSubscribe()
                        }
                    }
                },
                onCancel: {
                    showGuestLoginPrompt = false
                    pendingPurchaseAfterLogin = false
                }
            )
        }
        .sheet(isPresented: $showEmailLogin) {
            EmailLoginSheet(
                onLoginSuccess: {
                    showEmailLogin = false
                    showGuestLoginPrompt = false
                    // Automatically attempt purchase after successful login
                    if pendingPurchaseAfterLogin {
                        pendingPurchaseAfterLogin = false
                        Task {
                            await handleSubscribe()
                        }
                    }
                },
                onCancel: {
                    showEmailLogin = false
                }
            )
        }
        .onChange(of: authManager.authState) { _, newState in
            // If user successfully authenticated while login prompt is showing
            if newState == .authenticated && (showGuestLoginPrompt || showEmailLogin) {
                showGuestLoginPrompt = false
                showEmailLogin = false
                // Attempt purchase if we were waiting for login
                if pendingPurchaseAfterLogin {
                    pendingPurchaseAfterLogin = false
                    Task {
                        await handleSubscribe()
                    }
                }
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: Spacing.md) {
            // Crown icon
            Image(systemName: "crown.fill")
                .font(.system(size: 60))
                .foregroundColor(.accentPrimary)
                .symbolEffect(.bounce, value: UUID())
                .accessibilityHidden(true)

            // Title
            Text("Unlock Litplan Pro")
                .font(.displayLarge)
                .foregroundColor(.textPrimary)
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)

            // Subtitle
            Text("Get unlimited access to the best nightlife experiences worldwide")
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.md)
        }
        .padding(.bottom, Spacing.md)
    }

    // MARK: - Trigger-Specific Header

    private func triggerHeaderSection(_ trigger: PaywallTrigger) -> some View {
        VStack(spacing: Spacing.md) {
            // Trigger-specific icon
            Image(systemName: trigger.icon)
                .font(.system(size: 60))
                .foregroundColor(.accentPrimary)
                .symbolEffect(.bounce, value: UUID())

            // Trigger-specific title
            Text(trigger.title)
                .font(.displayLarge)
                .foregroundColor(.textPrimary)
                .multilineTextAlignment(.center)

            // Trigger-specific message
            Text(trigger.message)
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.md)
        }
        .padding(.bottom, Spacing.md)
    }

    // MARK: - Benefits Section

    private var benefitsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            BenefitRow(
                icon: "globe.americas.fill",
                title: "100+ cities worldwide",
                description: "Explore nightlife in cities across the globe"
            )

            BenefitRow(
                icon: "list.bullet.rectangle.fill",
                title: "Up to 50 plans per city",
                description: "Access the full catalog of curated experiences"
            )

            BenefitRow(
                icon: "arrow.triangle.2.circlepath",
                title: "Plans updated every week",
                description: "Fresh recommendations with new venues and events"
            )

            BenefitRow(
                icon: "calendar.badge.clock",
                title: "Weekend plans included",
                description: "Never miss the hottest weekend events"
            )

            BenefitRow(
                icon: "heart.fill",
                title: "Save favorite cities",
                description: "Quick access to your most-visited destinations"
            )

            BenefitRow(
                icon: "person.3.fill",
                title: "Group flow experiences",
                description: "Full-night itineraries with multiple venues"
            )
        }
        .padding(.vertical, Spacing.md)
    }

    // MARK: - Pricing Section

    /// Whether products are currently loading (for skeleton UI)
    private var isLoadingProducts: Bool {
        return subscriptionManager.isLoading && subscriptionManager.availableProducts.isEmpty
    }

    private var pricingSection: some View {
        VStack(spacing: Spacing.md) {
            // Yearly plan (recommended)
            PricingCard(
                plan: .yearly,
                product: subscriptionManager.yearlyProduct,
                isSelected: selectedPlan == .yearly,
                isLoading: isLoadingProducts,
                onSelect: {
                    HapticManager.shared.selection()
                    withAnimation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.75)) {
                        selectedPlan = .yearly
                    }
                }
            )

            // Monthly plan
            PricingCard(
                plan: .monthly,
                product: subscriptionManager.monthlyProduct,
                isSelected: selectedPlan == .monthly,
                isLoading: isLoadingProducts,
                onSelect: {
                    HapticManager.shared.selection()
                    withAnimation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.75)) {
                        selectedPlan = .monthly
                    }
                }
            )
        }
        .padding(.vertical, Spacing.md)
    }

    // MARK: - CTA Section

    private var ctaSection: some View {
        VStack(spacing: Spacing.md) {
            // Primary CTA
            PrimaryButton(
                title: ctaButtonTitle,
                action: {
                    Task {
                        await handleSubscribe()
                    }
                },
                isLoading: isProcessing || (subscriptionManager.isLoading && !authManager.isGuest)
            )
            .disabled(!isSubscribeButtonEnabled)
            .opacity(isSubscribeButtonEnabled ? 1.0 : 0.6)

            // Show retry button when products not loaded (only for authenticated users)
            if !authManager.isGuest && !hasProductsLoaded && !subscriptionManager.isLoading {
                Button(action: {
                    Task {
                        await subscriptionManager.loadProducts(force: true)
                    }
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "arrow.clockwise")
                            .font(.caption)
                        Text("Tap to retry loading prices")
                            .font(.caption)
                    }
                    .foregroundColor(.accentPrimary)
                    .padding(.vertical, Spacing.xs)
                    .padding(.horizontal, Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Spacing.xs)
                            .stroke(Color.accentPrimary.opacity(0.5), lineWidth: 1)
                    )
                }
            }

            // Secondary dismissal button
            Button(action: {
                onDismiss?()
                dismiss()
            }) {
                Text("Maybe Later")
                    .font(.body)
                    .foregroundColor(.textSecondary)
                    .underline()
            }
            .padding(.top, Spacing.xs)
        }
        .padding(.top, Spacing.md)
    }

    // MARK: - Helper Properties

    /// Check if products have been loaded from App Store
    private var hasProductsLoaded: Bool {
        return (selectedPlan == .yearly && subscriptionManager.yearlyProduct != nil) ||
               (selectedPlan == .monthly && subscriptionManager.monthlyProduct != nil)
    }

    /// Check if the subscribe button should be enabled
    /// - Guests: always enabled (they get login prompt)
    /// - Authenticated users: only enabled when App Store products are loaded
    private var isSubscribeButtonEnabled: Bool {
        // Guests can always tap to get the login prompt
        if authManager.isGuest {
            return true
        }
        // Authenticated users: only enable when products are actually loaded from App Store
        return hasProductsLoaded
    }

    /// Dynamic CTA button title
    private var ctaButtonTitle: String {
        // For guests, show sign-in prompt
        if authManager.isGuest {
            return "Sign in to Subscribe"
        }
        // If products loaded, show appropriate CTA
        if hasProductsLoaded {
            return selectedPlan == .yearly ? "Start Free Trial" : "Subscribe Now"
        }
        // If still loading or not loaded yet
        return "Loading Prices..."
    }

    // MARK: - Legal Section

    private var legalSection: some View {
        VStack(spacing: Spacing.xs) {
            if selectedPlan == .yearly {
                Text("3-day free trial, then $39.99/year")
                    .font(.caption)
                    .foregroundColor(.textTertiary)
                    .multilineTextAlignment(.center)
            }

            Text("Subscriptions auto-renew unless canceled 24 hours before the period ends.")
                .font(.caption)
                .foregroundColor(.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.md)

            HStack(spacing: Spacing.md) {
                Link("Terms of Service", destination: URL(string: "https://litplan.app/terms")!)
                    .font(.caption)
                    .foregroundColor(.accentPrimary)

                Text("•")
                    .foregroundColor(.textTertiary)

                Link("Privacy Policy", destination: URL(string: "https://litplan.app/privacy")!)
                    .font(.caption)
                    .foregroundColor(.accentPrimary)

                Text("•")
                    .foregroundColor(.textTertiary)

                Button(action: {
                    Task {
                        await handleRestorePurchases()
                    }
                }) {
                    Text("Restore")
                        .font(.caption)
                        .foregroundColor(.accentPrimary)
                }
            }
            .padding(.top, Spacing.xs)
        }
        .padding(.top, Spacing.md)
    }

    // MARK: - Actions

    private func handleSubscribe() async {
        // Check if user is a guest - prompt login first
        if authManager.isGuest {
            pendingPurchaseAfterLogin = true
            showGuestLoginPrompt = true
            return
        }

        isProcessing = true

        // Get the product based on selected plan
        var product = selectedPlan == .yearly
            ? subscriptionManager.yearlyProduct
            : subscriptionManager.monthlyProduct

        // If product not loaded, try one more time
        if product == nil {
            await subscriptionManager.loadProducts(force: true)
            // Wait a moment for products to be available
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds

            // Try again
            product = selectedPlan == .yearly
                ? subscriptionManager.yearlyProduct
                : subscriptionManager.monthlyProduct
        }

        guard let product = product else {
            // Products still not available - show helpful error
            HapticManager.shared.error()
            subscriptionManager.errorMessage = "Unable to connect to App Store. Please check your internet connection and try again."
            showError = true
            isProcessing = false
            return
        }

        do {
            // Attempt purchase
            let transaction = try await subscriptionManager.purchase(product)

            // Check if purchase was successful
            if transaction != nil {
                // Haptic feedback for success
                HapticManager.shared.success()

                // Show success animation
                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                    showSuccess = true
                }

                // Wait for animation then dismiss
                try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds

                dismiss()
            } else {
                // User cancelled - no error needed
                isProcessing = false
            }
        } catch {
            // Haptic feedback for error
            HapticManager.shared.error()
            // Show error alert
            showError = true
            isProcessing = false
        }
    }

    private func handleRestorePurchases() async {
        do {
            try await subscriptionManager.restorePurchases()

            // Check if restoration found a subscription
            if subscriptionManager.isProUser {
                // Haptic feedback for success
                HapticManager.shared.success()
                // Show success and dismiss
                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                    showSuccess = true
                }

                try? await Task.sleep(nanoseconds: 1_500_000_000)
                dismiss()
            } else {
                // Haptic feedback for no subscriptions found
                HapticManager.shared.warning()
                // Show error (no subscriptions found)
                showError = true
            }
        } catch {
            // Haptic feedback for error
            HapticManager.shared.error()
            // Show error alert
            showError = true
        }
    }

    // MARK: - Success Overlay

    private var successOverlay: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: Spacing.lg) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.success)
                    .symbolEffect(.bounce, value: UUID())
                    .scaleEffect(showSuccess ? 1.0 : 0.5)
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: showSuccess)

                Text("Welcome to Litplan Pro!")
                    .font(.displayMedium)
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)

                Text("You now have unlimited access to all features")
                    .font(.bodyLarge)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }
            .padding(Spacing.xl)
            .background(
                RoundedRectangle(cornerRadius: Spacing.md)
                    .fill(Color.surfacePrimary)
            )
            .padding(Spacing.lg)
            .scaleEffect(showSuccess ? 1.0 : 0.8)
            .opacity(showSuccess ? 1.0 : 0.0)
            .animation(.spring(response: 0.4, dampingFraction: 0.7), value: showSuccess)
        }
    }
}

// MARK: - Supporting Views

/// Individual benefit row with icon and description
struct BenefitRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            // Icon with background
            ZStack {
                Circle()
                    .fill(Color.success.opacity(0.15))
                    .frame(width: 48, height: 48)

                Image(systemName: icon)
                    .font(.system(size: 22))
                    .foregroundColor(.success)
            }
            .accessibilityHidden(true)

            // Text content
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.bodyLarge)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)

                Text(description)
                    .font(.callout)
                    .foregroundColor(.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()
        }
        .accessibilityElement(children: .combine)
    }
}

/// Pricing card for subscription plans
struct PricingCard: View {
    let plan: SubscriptionPlan
    let product: Product?
    let isSelected: Bool
    let onSelect: () -> Void
    let isLoading: Bool

    init(plan: SubscriptionPlan, product: Product?, isSelected: Bool, isLoading: Bool = false, onSelect: @escaping () -> Void) {
        self.plan = plan
        self.product = product
        self.isSelected = isSelected
        self.isLoading = isLoading
        self.onSelect = onSelect
    }

    var body: some View {
        Button(action: onSelect) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack {
                        Text(plan.title)
                            .font(.headline)
                            .foregroundColor(.textPrimary)

                        if plan.badge != nil {
                            Text(plan.badge!)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal, Spacing.xs)
                                .padding(.vertical, Spacing.xxs)
                                .background(Color.accentPrimary)
                                .cornerRadius(Spacing.xxs)
                        }

                        Spacer()
                    }

                    Text(plan.subtitle)
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: Spacing.xxs) {
                    // Show skeleton price while loading, real price when available
                    if let product = product {
                        Text(product.displayPrice)
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                    } else if isLoading {
                        // Skeleton placeholder price
                        Text(plan.skeletonPrice)
                            .font(.headline)
                            .foregroundColor(.textTertiary)
                            .redacted(reason: .placeholder)
                    } else {
                        // Fallback static price
                        Text(plan.price)
                            .font(.headline)
                            .foregroundColor(.textTertiary)
                    }

                    if let savings = plan.savings {
                        Text(savings)
                            .font(.caption)
                            .foregroundColor(.success)
                            .opacity(product != nil ? 1.0 : 0.5)
                    }
                }

                // Selection indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? .accentPrimary : .textTertiary)
                    .padding(.leading, Spacing.xs)
            }
            .padding(Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: Spacing.sm)
                    .stroke(
                        isSelected ? Color.accentPrimary : Color.surfaceSecondary,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .background(
                RoundedRectangle(cornerRadius: Spacing.sm)
                    .fill(isSelected ? Color.accentPrimary.opacity(0.1) : Color.surfaceSecondary)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("\(plan.title) plan, \(product?.displayPrice ?? plan.price)")
        .accessibilityHint(plan.badge != nil ? "\(plan.badge!). \(plan.savings ?? "")" : plan.subtitle)
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }
}

// MARK: - Subscription Plans

enum SubscriptionPlan {
    case monthly
    case yearly

    var title: String {
        switch self {
        case .monthly:
            return "Monthly"
        case .yearly:
            return "Yearly"
        }
    }

    var subtitle: String {
        switch self {
        case .monthly:
            return "Billed monthly"
        case .yearly:
            return "Billed annually"
        }
    }

    var price: String {
        switch self {
        case .monthly:
            return "$4.99/mo"
        case .yearly:
            return "$39.99/yr"
        }
    }

    /// Skeleton placeholder price shown while loading
    var skeletonPrice: String {
        switch self {
        case .monthly:
            return "$-.--/mo"
        case .yearly:
            return "$--.--/yr"
        }
    }

    var badge: String? {
        switch self {
        case .monthly:
            return nil
        case .yearly:
            return "BEST VALUE"
        }
    }

    var savings: String? {
        switch self {
        case .monthly:
            return nil
        case .yearly:
            return "Save $20/year"
        }
    }
}

// MARK: - Guest Login Prompt View

/// Login prompt shown to guest users attempting to subscribe
struct GuestLoginPromptView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var authManager = AuthenticationManager.shared
    @Binding var showEmailLogin: Bool
    let onLoginSuccess: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surfacePrimary
                    .ignoresSafeArea()

                VStack(spacing: Spacing.xl) {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(Color.accentPrimary.opacity(0.15))
                            .frame(width: 80, height: 80)

                        Image(systemName: "person.crop.circle.badge.plus")
                            .font(.system(size: 40))
                            .foregroundColor(.accentPrimary)
                    }
                    .padding(.top, Spacing.xl)

                    // Title and subtitle
                    VStack(spacing: Spacing.sm) {
                        Text("Sign in to Continue")
                            .font(.displayMedium)
                            .foregroundColor(.textPrimary)
                            .multilineTextAlignment(.center)

                        Text("Create an account to subscribe and unlock Pro features")
                            .font(.bodyLarge)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.md)
                    }

                    Spacer()

                    // Login options
                    VStack(spacing: Spacing.md) {
                        // Google Sign In button
                        Button(action: {
                            Task {
                                await authManager.signInWithGoogle()
                                if authManager.isAuthenticated {
                                    onLoginSuccess()
                                }
                            }
                        }) {
                            HStack(spacing: Spacing.sm) {
                                GoogleLogoView()
                                    .frame(width: 16, height: 16)

                                Text("Sign in with Google")
                                    .font(.system(size: 17, weight: .medium))
                                    .foregroundColor(.black)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.white)
                            .cornerRadius(Spacing.sm)
                        }
                        .disabled(authManager.isLoading)

                        // Email button
                        SecondaryButton(title: "Continue with Email") {
                            dismiss()
                            // Small delay to allow sheet dismissal animation
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                showEmailLogin = true
                            }
                        }
                        .disabled(authManager.isLoading)
                    }
                    .padding(.horizontal, Spacing.lg)

                    Spacer()

                    // Cancel button
                    Button(action: {
                        onCancel()
                        dismiss()
                    }) {
                        Text("Cancel")
                            .font(.body)
                            .foregroundColor(.textSecondary)
                            .underline()
                    }
                    .padding(.bottom, Spacing.xl)
                }
                .padding(.horizontal, Spacing.lg)

                // Loading overlay
                if authManager.isLoading {
                    ZStack {
                        Color.black.opacity(0.5)
                            .ignoresSafeArea()

                        VStack(spacing: Spacing.md) {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                                .scaleEffect(1.5)

                            Text("Signing in...")
                                .font(.callout)
                                .foregroundColor(.textPrimary)
                        }
                        .padding(Spacing.xl)
                        .background(Color.surfacePrimary)
                        .cornerRadius(Spacing.md)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        onCancel()
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.textTertiary)
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Email Login Sheet

/// Email login sheet for guest users
struct EmailLoginSheet: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var authManager = AuthenticationManager.shared
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var isSignUp = false
    @State private var showForgotPassword = false

    let onLoginSuccess: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surfacePrimary
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Spacing.lg) {
                        // Header
                        VStack(spacing: Spacing.sm) {
                            Text(isSignUp ? "Create Account" : "Sign In")
                                .font(.displayMedium)
                                .foregroundColor(.textPrimary)

                            Text(isSignUp ? "Sign up to subscribe to Pro" : "Sign in to continue with your subscription")
                                .font(.body)
                                .foregroundColor(.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, Spacing.xl)

                        // Sign up: Full name field
                        if isSignUp {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text("Full Name")
                                    .font(.callout)
                                    .foregroundColor(.textSecondary)

                                TextField("", text: $fullName)
                                    .textFieldStyle(LitplanTextFieldStyle())
                                    .textContentType(.name)
                            }
                        }

                        // Email field
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("Email")
                                .font(.callout)
                                .foregroundColor(.textSecondary)

                            TextField("", text: $email)
                                .textFieldStyle(LitplanTextFieldStyle())
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                        }

                        // Password field
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            HStack {
                                Text("Password")
                                    .font(.callout)
                                    .foregroundColor(.textSecondary)
                                Spacer()
                                if isSignUp {
                                    Text("Min 8 characters")
                                        .font(.caption)
                                        .foregroundColor(.textTertiary)
                                }
                            }

                            SecureField("", text: $password)
                                .textFieldStyle(LitplanTextFieldStyle())
                                .textContentType(isSignUp ? .newPassword : .password)
                        }

                        // Forgot password (sign in only)
                        if !isSignUp {
                            HStack {
                                Spacer()
                                Button(action: {
                                    showForgotPassword = true
                                }) {
                                    Text("Forgot Password?")
                                        .font(.callout)
                                        .foregroundColor(.accentPrimary)
                                }
                            }
                        }

                        // Primary action button
                        PrimaryButton(
                            title: isSignUp ? "Create Account" : "Sign In",
                            action: {
                                Task {
                                    do {
                                        if isSignUp {
                                            try await authManager.signUp(
                                                email: email,
                                                password: password,
                                                fullName: fullName.isEmpty ? nil : fullName
                                            )
                                        } else {
                                            try await authManager.signIn(email: email, password: password)
                                        }
                                        if authManager.isAuthenticated {
                                            onLoginSuccess()
                                            dismiss()
                                        }
                                    } catch {
                                        // Error is handled by authManager.errorMessage
                                    }
                                }
                            },
                            isLoading: authManager.isLoading,
                            isDisabled: isSignUp ? (email.isEmpty || password.count < 8) : (email.isEmpty || password.isEmpty)
                        )

                        // Toggle between sign in and sign up
                        HStack {
                            Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                                .font(.callout)
                                .foregroundColor(.textSecondary)

                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    isSignUp.toggle()
                                    password = "" // Clear password when switching
                                }
                            }) {
                                Text(isSignUp ? "Sign In" : "Sign Up")
                                    .font(.callout)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.accentPrimary)
                            }
                        }
                        .padding(.top, Spacing.sm)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.xl)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        onCancel()
                        dismiss()
                    }
                    .foregroundColor(.accentPrimary)
                }
            }
        }
        .alert("Error", isPresented: .constant(authManager.errorMessage != nil)) {
            Button("OK") {
                authManager.clearError()
            }
        } message: {
            Text(authManager.errorMessage ?? "")
        }
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordSheet(email: $email)
        }
    }
}

// MARK: - Preview

#Preview("Paywall View") {
    PaywallView()
        .environmentObject(SubscriptionManager.shared)
}

#Preview("Dark Theme") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack {
            Text("App Background")
                .foregroundColor(.textPrimary)

            Button("Show Paywall") {
                // Preview only
            }
            .padding()
        }
    }
    .sheet(isPresented: .constant(true)) {
        PaywallView()
            .environmentObject(SubscriptionManager.shared)
    }
}

#Preview("Guest Login Prompt") {
    GuestLoginPromptView(
        showEmailLogin: .constant(false),
        onLoginSuccess: {},
        onCancel: {}
    )
}

#Preview("Email Login Sheet") {
    EmailLoginSheet(
        onLoginSuccess: {},
        onCancel: {}
    )
}
