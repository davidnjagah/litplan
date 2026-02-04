//
//  OnboardingPageView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Individual onboarding page component with animations
//

import SwiftUI

/// Individual onboarding page view
struct OnboardingPageView: View {
    let page: OnboardingPage
    let pageIndex: Int
    @Binding var currentPage: Int

    @State private var animateIcon = false
    @State private var animateContent = false

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                Spacer()

                // Icon Section
                iconSection
                    .frame(height: geometry.size.height * 0.35)

                // Content Section
                contentSection
                    .padding(.horizontal, Spacing.xl)

                Spacer()
                Spacer()
            }
        }
        .onAppear {
            if currentPage == pageIndex {
                startAnimations()
            }
        }
        .onChange(of: currentPage) { _, newValue in
            if newValue == pageIndex {
                startAnimations()
            } else {
                resetAnimations()
            }
        }
    }

    // MARK: - Icon Section

    private var iconSection: some View {
        ZStack {
            // Background glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            page.accentColor.opacity(0.3),
                            page.accentColor.opacity(0.1),
                            Color.clear
                        ],
                        center: .center,
                        startRadius: 20,
                        endRadius: 150
                    )
                )
                .frame(width: 300, height: 300)
                .scaleEffect(animateIcon ? 1.1 : 0.9)
                .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: animateIcon)

            // Icon container
            ZStack {
                // Outer ring
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [page.accentColor, page.accentColor.opacity(0.5)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 3
                    )
                    .frame(width: 140, height: 140)
                    .rotationEffect(.degrees(animateIcon ? 360 : 0))
                    .animation(.linear(duration: 20).repeatForever(autoreverses: false), value: animateIcon)

                // Inner circle
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                page.accentColor.opacity(0.2),
                                page.accentColor.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 120, height: 120)

                // Icon or Emoji
                if let emoji = page.emoji {
                    Text(emoji)
                        .font(.system(size: 60))
                        .scaleEffect(animateIcon ? 1.0 : 0.8)
                        .animation(.spring(response: 0.6, dampingFraction: 0.6), value: animateIcon)
                } else if let systemIcon = page.systemIcon {
                    Image(systemName: systemIcon)
                        .font(.system(size: 50, weight: .medium))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [page.accentColor, page.accentColor.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .scaleEffect(animateIcon ? 1.0 : 0.8)
                        .animation(.spring(response: 0.6, dampingFraction: 0.6), value: animateIcon)
                }
            }
        }
    }

    // MARK: - Content Section

    private var contentSection: some View {
        VStack(spacing: Spacing.md) {
            // Subtitle badge
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
                .opacity(animateContent ? 1 : 0)
                .offset(y: animateContent ? 0 : 20)
                .animation(.easeOut(duration: 0.5).delay(0.1), value: animateContent)

            // Title
            Text(page.title)
                .font(.displayMedium)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
                .multilineTextAlignment(.center)
                .opacity(animateContent ? 1 : 0)
                .offset(y: animateContent ? 0 : 20)
                .animation(.easeOut(duration: 0.5).delay(0.2), value: animateContent)

            // Description
            Text(page.description)
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, Spacing.sm)
                .opacity(animateContent ? 1 : 0)
                .offset(y: animateContent ? 0 : 20)
                .animation(.easeOut(duration: 0.5).delay(0.3), value: animateContent)
        }
    }

    // MARK: - Animation Helpers

    private func startAnimations() {
        withAnimation {
            animateIcon = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation {
                animateContent = true
            }
        }
    }

    private func resetAnimations() {
        animateIcon = false
        animateContent = false
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        Color.appBackground.ignoresSafeArea()
        OnboardingPageView(
            page: OnboardingPage.pages[2],
            pageIndex: 0,
            currentPage: .constant(0)
        )
    }
}
