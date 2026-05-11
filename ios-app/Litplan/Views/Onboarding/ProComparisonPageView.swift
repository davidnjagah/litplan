//
//  ProComparisonPageView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Onboarding page showing Free vs Pro comparison
//

import SwiftUI

/// Pro subscription comparison view for onboarding
struct ProComparisonPageView: View {
    let page: OnboardingPage
    let pageIndex: Int
    @Binding var currentPage: Int

    @State private var animateContent = false

    var body: some View {
        GeometryReader { geometry in
            ScrollView(showsIndicators: false) {
                VStack(spacing: Spacing.lg) {
                    Spacer(minLength: Spacing.xl)

                    // Header
                    headerSection

                    // Comparison cards
                    comparisonSection

                    // Pro benefits list
                    benefitsList

                    Spacer(minLength: Spacing.xxl)
                }
                .padding(.horizontal, Spacing.lg)
            }
        }
        .onAppear {
            if currentPage == pageIndex {
                withAnimation(.easeOut(duration: 0.5)) {
                    animateContent = true
                }
            }
        }
        .onChange(of: currentPage) { _, newValue in
            if newValue == pageIndex {
                withAnimation(.easeOut(duration: 0.5)) {
                    animateContent = true
                }
            } else {
                animateContent = false
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: Spacing.md) {
            // Crown icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                page.accentColor.opacity(0.3),
                                page.accentColor.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)

                Image(systemName: "crown.fill")
                    .font(.system(size: 45))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [page.accentColor, page.accentColor.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }
            .scaleEffect(animateContent ? 1 : 0.5)
            .opacity(animateContent ? 1 : 0)

            // Title
            Text(page.subtitle)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(page.accentColor)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.xs)
                .background(
                    Capsule()
                        .fill(page.accentColor.opacity(0.15))
                )

            Text(page.title)
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .multilineTextAlignment(.center)

            Text(page.description)
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .opacity(animateContent ? 1 : 0)
        .offset(y: animateContent ? 0 : 20)
    }

    // MARK: - Comparison Section

    private var comparisonSection: some View {
        HStack(spacing: Spacing.md) {
            // Free tier
            comparisonCard(
                title: "Free",
                features: [
                    ComparisonFeature(text: "1 Vibez/week (email)", included: true),
                    ComparisonFeature(text: "3 cities", included: true),
                    ComparisonFeature(text: "Save up to 10 plans", included: true),
                    ComparisonFeature(text: "Unlimited Vibez", included: false),
                    ComparisonFeature(text: "All cities", included: false)
                ],
                isPro: false
            )

            // Pro tier
            comparisonCard(
                title: "Pro",
                features: [
                    ComparisonFeature(text: "Unlimited Vibez", included: true),
                    ComparisonFeature(text: "All 100+ cities", included: true),
                    ComparisonFeature(text: "Unlimited saves", included: true),
                    ComparisonFeature(text: "Priority support", included: true),
                    ComparisonFeature(text: "Early access", included: true)
                ],
                isPro: true
            )
        }
        .opacity(animateContent ? 1 : 0)
        .offset(y: animateContent ? 0 : 30)
        .animation(.easeOut(duration: 0.5).delay(0.2), value: animateContent)
    }

    private func comparisonCard(title: String, features: [ComparisonFeature], isPro: Bool) -> some View {
        VStack(spacing: Spacing.md) {
            // Header
            Text(title)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(isPro ? page.accentColor : .textPrimary)

            // Features
            VStack(alignment: .leading, spacing: Spacing.sm) {
                ForEach(features) { feature in
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: feature.included ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.subheadline)
                            .foregroundColor(feature.included ? .success : .textTertiary)

                        Text(feature.text)
                            .font(.caption)
                            .foregroundColor(feature.included ? .textPrimary : .textTertiary)

                        Spacer()
                    }
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(isPro ? page.accentColor.opacity(0.1) : Color.surfaceSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(isPro ? page.accentColor.opacity(0.3) : Color.clear, lineWidth: 2)
                )
        )
    }

    // MARK: - Benefits List

    private var benefitsList: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Why Go Pro?")
                .font(.headline)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                benefitRow(icon: "bolt.fill", text: "Unlimited Vibez — generate as many as you want")
                benefitRow(icon: "globe.americas.fill", text: "Access all 100+ cities for Vibez")
                benefitRow(icon: "sparkles", text: "Unlock all 26 vibe themes")
                benefitRow(icon: "star.fill", text: "Get early access to new features")
            }
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.surfaceSecondary)
        )
        .opacity(animateContent ? 1 : 0)
        .offset(y: animateContent ? 0 : 30)
        .animation(.easeOut(duration: 0.5).delay(0.3), value: animateContent)
    }

    private func benefitRow(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(page.accentColor)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)
                .foregroundColor(.textSecondary)

            Spacer()
        }
    }
}

// MARK: - Comparison Feature Model

struct ComparisonFeature: Identifiable {
    let id = UUID()
    let text: String
    let included: Bool
}

// MARK: - Preview

#Preview {
    ZStack {
        Color.appBackground.ignoresSafeArea()
        ProComparisonPageView(
            page: OnboardingPage.pages[3],
            pageIndex: 3,
            currentPage: .constant(3)
        )
    }
}
