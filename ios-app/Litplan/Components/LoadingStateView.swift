//
//  LoadingStateView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 16 - Reusable loading state component for AI plan refresh
//

import SwiftUI

struct LoadingStateView: View {
    let message: String

    @State private var isAnimating = false

    // Accessibility - Reduce Motion
    @Environment(\.accessibilityReduceMotion) var reduceMotion

    init(message: String = "Loading plans...") {
        self.message = message
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Animated spinner
            ZStack {
                // Outer ring
                Circle()
                    .stroke(Color.surfaceSecondary, lineWidth: 4)
                    .frame(width: 60, height: 60)

                // Animated arc
                Circle()
                    .trim(from: 0, to: 0.7)
                    .stroke(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.accentPrimary,
                                Color.accentPrimary.opacity(0.3)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        style: StrokeStyle(lineWidth: 4, lineCap: .round)
                    )
                    .frame(width: 60, height: 60)
                    .rotationEffect(Angle(degrees: isAnimating ? 360 : 0))
                    .animation(
                        reduceMotion ? .none : .linear(duration: 1.0).repeatForever(autoreverses: false),
                        value: isAnimating
                    )
            }
            .accessibilityHidden(true)

            // Loading message
            Text(message)
                .font(.bodyLarge)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading")
        .accessibilityHint(message)
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Preview
#Preview("Default Loading") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        LoadingStateView()
    }
}

#Preview("Custom Message") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        LoadingStateView(message: "Refreshing your cities...")
    }
}

#Preview("Loading Plans") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        LoadingStateView(message: "Loading nightlife plans...")
    }
}
