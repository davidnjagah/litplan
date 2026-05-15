//
//  Parallax3DCard.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/12/26.
//  Sprint 15 - 3D Portal Card with Gyroscope Parallax Effect
//

import SwiftUI

/// A 3D card component that responds to device motion with a portal-like depth effect
/// Features multiple layers that move at different speeds for a parallax illusion
struct Parallax3DCard: View {
    let groupFlow: GroupFlow
    @ObservedObject var motionManager: MotionManager
    var onTap: () -> Void = {}

    // Card dimensions
    private let cardWidth: CGFloat = UIScreen.main.bounds.width - 48
    private let cardHeight: CGFloat = 480

    // Animation state
    @State private var isPressed = false
    @State private var portalPulse: CGFloat = 0.8

    /// Maximum drag distance (points) that still counts as a tap
    private let tapThreshold: CGFloat = 8

    var body: some View {
        ZStack {
            // Layer 1: Background - deep space portal effect
            portalBackground

            // Layer 2: Middle layer - ambient glow
            portalGlow
                .parallaxOffset(motionManager, multiplier: 0.3)

            // Layer 3: Card content - moves more for parallax depth
            cardContent
                .parallaxOffset(motionManager, multiplier: 0.8)
        }
        .frame(width: cardWidth, height: cardHeight)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .parallax3DEffect(motionManager, intensity: 1.0)
        .shadow(color: Color.boltPortalGlow.opacity(0.4), radius: 30, x: 0, y: 15)
        .shadow(color: Color.boltGradientEnd.opacity(0.2), radius: 60, x: 0, y: 30)
        .scaleEffect(isPressed ? 0.96 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    if !isPressed { isPressed = true }
                    motionManager.setTouchOffset(translation: value.translation)
                }
                .onEnded { value in
                    isPressed = false
                    motionManager.resetTouchOffset()

                    // Fire tap only when the finger barely moved
                    let distance = sqrt(
                        pow(value.translation.width, 2) +
                        pow(value.translation.height, 2)
                    )
                    if distance < tapThreshold {
                        HapticManager.shared.medium()
                        onTap()
                    }
                }
        )
        .onAppear {
            startPulseAnimation()
        }
    }

    // MARK: - Portal Background Layer

    private var portalBackground: some View {
        ZStack {
            // Base dark gradient
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    RadialGradient(
                        colors: [
                            Color.boltCardBackground.opacity(0.9),
                            Color.black
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: 300
                    )
                )

            // Animated portal rings
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.boltGradientStart.opacity(0.6 - Double(index) * 0.15),
                                Color.boltGradientEnd.opacity(0.4 - Double(index) * 0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2 - CGFloat(index) * 0.5
                    )
                    .frame(
                        width: 200 + CGFloat(index) * 80,
                        height: 200 + CGFloat(index) * 80
                    )
                    .scaleEffect(portalPulse + CGFloat(index) * 0.1)
                    .opacity(0.8 - Double(index) * 0.2)
            }

            // Inner portal glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color.boltPortalGlow.opacity(0.5),
                            Color.boltPortalGlow.opacity(0.2),
                            Color.clear
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: 120
                    )
                )
                .frame(width: 200, height: 200)
                .scaleEffect(portalPulse)
                .blur(radius: 20)
        }
    }

    // MARK: - Portal Glow Layer

    private var portalGlow: some View {
        ZStack {
            // Floating particles effect
            ForEach(0..<5, id: \.self) { index in
                Circle()
                    .fill(Color.boltGradientEnd.opacity(0.6))
                    .frame(width: 4 + CGFloat(index) * 2, height: 4 + CGFloat(index) * 2)
                    .offset(
                        x: CGFloat.random(in: -100...100),
                        y: CGFloat.random(in: -150...150)
                    )
                    .blur(radius: 2)
            }

            // Gradient overlay for depth
            LinearGradient(
                colors: [
                    Color.boltGradientStart.opacity(0.1),
                    Color.clear,
                    Color.boltGradientEnd.opacity(0.1)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    // MARK: - Card Content Layer (Foreground)

    private var cardContent: some View {
        VStack(spacing: 0) {
            // Top section - Title and tags
            VStack(alignment: .leading, spacing: Spacing.sm) {
                // Bolt badge
                HStack(spacing: 6) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)

                    Text("FEATURED PLAN")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                        .tracking(1.2)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(Color.boltGradient)
                )

                // Title
                Text(groupFlow.title)
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .shadow(color: Color.black.opacity(0.5), radius: 4, x: 0, y: 2)

                // Best for tags
                HStack(spacing: 8) {
                    ForEach(groupFlow.bestFor.prefix(3), id: \.self) { tag in
                        Text(tag.capitalized)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white.opacity(0.9))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(
                                Capsule()
                                    .fill(Color.white.opacity(0.15))
                                    .overlay(
                                        Capsule()
                                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                    )
                            )
                    }
                }
            }
            .padding(.top, 24)
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity, alignment: .leading)

            Spacer()

            // Bottom section - Activities preview
            VStack(spacing: Spacing.sm) {
                // Activity timeline preview
                HStack(spacing: 12) {
                    ForEach(Array(groupFlow.sortedActivities.prefix(3).enumerated()), id: \.element.id) { index, activity in
                        VStack(spacing: 4) {
                            // Step number
                            ZStack {
                                Circle()
                                    .fill(Color.boltGradient)
                                    .frame(width: 28, height: 28)

                                Text("\(activity.order)")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            // Venue name (abbreviated)
                            Text(abbreviatedVenue(activity.venueName))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white.opacity(0.8))
                                .lineLimit(1)
                                .frame(maxWidth: 70)
                        }

                        // Connector arrow (except for last)
                        if index < min(2, groupFlow.sortedActivities.count - 1) {
                            Image(systemName: "arrow.right")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white.opacity(0.5))
                        }
                    }
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.black.opacity(0.3))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )

                // Duration and cost
                HStack(spacing: Spacing.lg) {
                    // Duration
                    Label(groupFlow.formattedDuration, systemImage: "clock")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)

                    // Divider
                    Circle()
                        .fill(Color.white.opacity(0.5))
                        .frame(width: 4, height: 4)

                    // Cost
                    Label(groupFlow.formattedCost, systemImage: "dollarsign.circle")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)

                    // Divider
                    Circle()
                        .fill(Color.white.opacity(0.5))
                        .frame(width: 4, height: 4)

                    // Difficulty
                    Text(groupFlow.difficulty.capitalized)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(groupFlow.difficultyColor)
                }
                .padding(.bottom, 4)

                // Tap to explore hint
                Text("Tap to explore")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private func abbreviatedVenue(_ name: String) -> String {
        let words = name.split(separator: " ")
        if words.count > 2 {
            return words.prefix(2).joined(separator: " ")
        }
        return name
    }

    private func startPulseAnimation() {
        withAnimation(
            .easeInOut(duration: 2.0)
            .repeatForever(autoreverses: true)
        ) {
            portalPulse = 1.0
        }
    }
}

// MARK: - Preview

#Preview("3D Parallax Card") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        Parallax3DCard(
            groupFlow: .sampleNYCFlow,
            motionManager: MotionManager.shared
        )
    }
}
