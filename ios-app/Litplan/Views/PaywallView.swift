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
    @State private var selectedPlan: SubscriptionPlan = .yearly
    @State private var isProcessing = false
    @State private var showError = false
    @State private var showSuccess = false

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
                // Load products when view appears
                Task {
                    await subscriptionManager.loadProducts()
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
                title: "Unlimited cities",
                description: "Explore nightlife in every city worldwide"
            )

            BenefitRow(
                icon: "list.bullet.rectangle.fill",
                title: "Up to 50 plans per city",
                description: "Access the full catalog of curated experiences"
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

    private var pricingSection: some View {
        VStack(spacing: Spacing.md) {
            // Yearly plan (recommended)
            if let yearlyProduct = subscriptionManager.yearlyProduct {
                PricingCard(
                    plan: .yearly,
                    product: yearlyProduct,
                    isSelected: selectedPlan == .yearly,
                    onSelect: {
                        HapticManager.shared.selection()
                        withAnimation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.75)) {
                            selectedPlan = .yearly
                        }
                    }
                )
            } else {
                PricingCard(
                    plan: .yearly,
                    product: nil,
                    isSelected: selectedPlan == .yearly,
                    onSelect: {
                        HapticManager.shared.selection()
                        withAnimation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.75)) {
                            selectedPlan = .yearly
                        }
                    }
                )
            }

            // Monthly plan
            if let monthlyProduct = subscriptionManager.monthlyProduct {
                PricingCard(
                    plan: .monthly,
                    product: monthlyProduct,
                    isSelected: selectedPlan == .monthly,
                    onSelect: {
                        HapticManager.shared.selection()
                        withAnimation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.75)) {
                            selectedPlan = .monthly
                        }
                    }
                )
            } else {
                PricingCard(
                    plan: .monthly,
                    product: nil,
                    isSelected: selectedPlan == .monthly,
                    onSelect: {
                        HapticManager.shared.selection()
                        withAnimation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.75)) {
                            selectedPlan = .monthly
                        }
                    }
                )
            }
        }
        .padding(.vertical, Spacing.md)
    }

    // MARK: - CTA Section

    private var ctaSection: some View {
        VStack(spacing: Spacing.md) {
            // Primary CTA
            PrimaryButton(
                title: selectedPlan == .yearly ? "Start Free Trial" : "Subscribe Now",
                action: {
                    Task {
                        await handleSubscribe()
                    }
                },
                isLoading: isProcessing || subscriptionManager.isLoading
            )

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

    // MARK: - Legal Section

    private var legalSection: some View {
        VStack(spacing: Spacing.xs) {
            if selectedPlan == .yearly {
                Text("7-day free trial, then $79.99/year")
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
        isProcessing = true

        // Get the product based on selected plan
        let product = selectedPlan == .yearly
            ? subscriptionManager.yearlyProduct
            : subscriptionManager.monthlyProduct

        guard let product = product else {
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
                    // Use real product price if available, otherwise use fallback
                    if let product = product {
                        Text(product.displayPrice)
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                    } else {
                        Text(plan.price)
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                    }

                    if let savings = plan.savings {
                        Text(savings)
                            .font(.caption)
                            .foregroundColor(.success)
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
            return "$9.99/mo"
        case .yearly:
            return "$79.99/yr"
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
            return "Save $40/year"
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
