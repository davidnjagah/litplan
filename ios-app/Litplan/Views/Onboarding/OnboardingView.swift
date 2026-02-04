//
//  OnboardingView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Main onboarding container with TabView and navigation
//

import SwiftUI

/// Main onboarding view container
struct OnboardingView: View {
    @State private var currentPage = 0
    @State private var showProComparison = false
    @Binding var hasCompletedOnboarding: Bool

    let pages = OnboardingPage.pages

    var body: some View {
        ZStack {
            // Background
            Color.appBackground
                .ignoresSafeArea()

            // Animated background particles
            backgroundParticles

            VStack(spacing: 0) {
                // Skip button
                skipButton
                    .padding(.top, Spacing.md)
                    .padding(.horizontal, Spacing.lg)

                // Page content
                TabView(selection: $currentPage) {
                    ForEach(Array(pages.enumerated()), id: \.element.id) { index, page in
                        if page.isProPage {
                            ProComparisonPageView(
                                page: page,
                                pageIndex: index,
                                currentPage: $currentPage
                            )
                            .tag(index)
                        } else {
                            OnboardingPageView(
                                page: page,
                                pageIndex: index,
                                currentPage: $currentPage
                            )
                            .tag(index)
                        }
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut(duration: 0.3), value: currentPage)

                // Bottom section
                bottomSection
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.xl)
            }
        }
        .onChange(of: currentPage) { _, _ in
            HapticManager.shared.light()
        }
    }

    // MARK: - Skip Button

    private var skipButton: some View {
        HStack {
            Spacer()

            if currentPage < pages.count - 1 {
                Button(action: {
                    completeOnboarding()
                }) {
                    Text("Skip")
                        .font(.callout)
                        .fontWeight(.medium)
                        .foregroundColor(.textTertiary)
                }
            }
        }
    }

    // MARK: - Background Particles

    private var backgroundParticles: some View {
        GeometryReader { geometry in
            ForEach(0..<15, id: \.self) { index in
                Circle()
                    .fill(pages[currentPage].accentColor.opacity(0.1))
                    .frame(width: CGFloat.random(in: 4...12))
                    .position(
                        x: CGFloat.random(in: 0...geometry.size.width),
                        y: CGFloat.random(in: 0...geometry.size.height)
                    )
                    .animation(
                        .easeInOut(duration: Double.random(in: 3...6))
                        .repeatForever(autoreverses: true)
                        .delay(Double(index) * 0.2),
                        value: currentPage
                    )
            }
        }
    }

    // MARK: - Bottom Section

    private var bottomSection: some View {
        VStack(spacing: Spacing.lg) {
            // Progress dots
            progressDots

            // Action button
            actionButton
        }
    }

    // MARK: - Progress Dots

    private var progressDots: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(0..<pages.count, id: \.self) { index in
                Circle()
                    .fill(index == currentPage ? pages[currentPage].accentColor : Color.textTertiary.opacity(0.3))
                    .frame(width: index == currentPage ? 24 : 8, height: 8)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: currentPage)
            }
        }
    }

    // MARK: - Action Button

    private var actionButton: some View {
        let isLastPage = currentPage == pages.count - 1
        let currentPageData = pages[currentPage]

        return Button(action: {
            if isLastPage {
                completeOnboarding()
            } else {
                withAnimation {
                    currentPage += 1
                }
            }
        }) {
            HStack(spacing: Spacing.sm) {
                Text(isLastPage ? "Get Started" : (currentPageData.isProPage ? "Continue" : "Next"))
                    .font(.body)
                    .fontWeight(.semibold)

                if !isLastPage {
                    Image(systemName: "arrow.right")
                        .font(.body)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                LinearGradient(
                    colors: [currentPageData.accentColor, currentPageData.accentColor.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(16)
            .shadow(color: currentPageData.accentColor.opacity(0.3), radius: 10, y: 5)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private func completeOnboarding() {
        HapticManager.shared.success()
        withAnimation(.easeOut(duration: 0.3)) {
            hasCompletedOnboarding = true
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingView(hasCompletedOnboarding: .constant(false))
}
