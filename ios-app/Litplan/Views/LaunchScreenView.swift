//
//  LaunchScreenView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 18 - Polished launch screen with animation
//

import SwiftUI

/// Launch screen with animated LitPlanz logo and tagline
struct LaunchScreenView: View {
    @State private var logoOpacity: Double = 0
    @State private var logoScale: CGFloat = 0.8
    @State private var taglineOpacity: Double = 0
    @State private var isAnimationComplete = false

    let onComplete: () -> Void

    var body: some View {
        ZStack {
            // Background
            Color.appBackground
                .ignoresSafeArea()

            VStack(spacing: Spacing.lg) {
                Spacer()

                // Logo
                VStack(spacing: Spacing.md) {
                    // "L" Icon or Logo
                    ZStack {
                        // Outer glow circle
                        Circle()
                            .fill(
                                RadialGradient(
                                    colors: [
                                        Color.accentPrimary.opacity(0.3),
                                        Color.accentPrimary.opacity(0.0)
                                    ],
                                    center: .center,
                                    startRadius: 40,
                                    endRadius: 80
                                )
                            )
                            .frame(width: 160, height: 160)

                        // Logo background circle
                        Circle()
                            .fill(Color.surfaceSecondary)
                            .frame(width: 120, height: 120)

                        // "L" Letter
                        Text("L")
                            .font(.system(size: 72, weight: .bold, design: .rounded))
                            .foregroundColor(.accentPrimary)
                    }
                    .opacity(logoOpacity)
                    .scaleEffect(logoScale)

                    // App name
                    Text("LitPlanz")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.textPrimary)
                        .opacity(logoOpacity)
                }

                // Tagline
                Text("Discover Your Night")
                    .font(.bodyLarge)
                    .foregroundColor(.textSecondary)
                    .opacity(taglineOpacity)
                    .padding(.top, Spacing.xs)

                Spacer()

                // Loading indicator (subtle)
                ProgressView()
                    .tint(.accentPrimary)
                    .opacity(taglineOpacity)
                    .padding(.bottom, Spacing.xxl)
            }
        }
        .onAppear {
            startAnimation()
        }
        .accessibilityLabel("LitPlanz loading")
        .accessibilityHint("App is starting")
    }

    // MARK: - Animation

    private func startAnimation() {
        // Logo fade in and scale (0.0s - 0.6s)
        withAnimation(.easeOut(duration: 0.6)) {
            logoOpacity = 1.0
            logoScale = 1.0
        }

        // Tagline fade in (0.4s - 0.8s)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            withAnimation(.easeIn(duration: 0.4)) {
                taglineOpacity = 1.0
            }
        }

        // Complete animation and transition to main app (1.5s total)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isAnimationComplete = true
            onComplete()
        }
    }
}

// MARK: - Preview

#Preview {
    LaunchScreenView {
        print("Launch animation complete")
    }
}
