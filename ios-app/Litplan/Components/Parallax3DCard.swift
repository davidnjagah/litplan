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
    /// When true, the card plays a "new plan ready" attention effect: a pulsing glow
    /// border, a NEW badge, and emphasised tap CTA copy. Cleared by the parent after a
    /// few seconds (or on tap).
    var highlightNew: Bool = false
    /// When true, plays a first-time "hand double-taps the card" hint in the centre,
    /// then reveals a "Tap here" label. Parent gates this to a new user's first N generations.
    var showTapHint: Bool = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // Card dimensions
    private let cardWidth: CGFloat = UIScreen.main.bounds.width - 48
    private let cardHeight: CGFloat = 480

    // Animation state
    @State private var isPressed = false
    @State private var portalPulse: CGFloat = 0.8
    @State private var attentionGlow = false   // oscillates while pulseActive is true
    @State private var pulseActive = false     // gates the breathing zoom + border glow
    @State private var pulseTask: Task<Void, Never>?
    @State private var attentionHasPlayed = false  // one-shot guard so the pulse doesn't replay on every onAppear

    // First-time tap-hint animation state
    @State private var tapHintHandOffsetY: CGFloat = -10
    @State private var tapHintHandScale: CGFloat = 1.0
    @State private var tapHintRippleScale: CGFloat = 0.3
    @State private var tapHintRippleOpacity: Double = 0
    @State private var tapHintShowText = false
    @State private var tapHintTask: Task<Void, Never>?

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

            // First-time hand "tap here" hint, centred over the card.
            // Loops until the card is tapped (overlay removed → onDisappear cancels the loop).
            if showTapHint {
                tapHintOverlay
                    .onAppear { playTapHint() }
                    .onDisappear { tapHintTask?.cancel() }
            }
        }
        .frame(width: cardWidth, height: cardHeight)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(attentionBorder)
        .parallax3DEffect(motionManager, intensity: 1.0)
        .shadow(color: Color.boltPortalGlow.opacity(0.4), radius: 30, x: 0, y: 15)
        .shadow(color: Color.boltGradientEnd.opacity(0.2), radius: 60, x: 0, y: 30)
        .scaleEffect(isPressed ? 0.96 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        // Whole-card "breathing" zoom while a freshly generated plan awaits a tap.
        // Kept to 3% (card has a 24pt side margin, so it never reaches the screen edges).
        // Driven by an explicit pulseTask, NOT a `.animation(.repeatForever, value:)` modifier
        // (which would re-fire when we tried to stop it on tap).
        .scaleEffect(pulseActive && attentionGlow ? 1.03 : 1.0)
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
                        // Definitively stop the new-plan pulse (cancels the task loop and
                        // eases everything back to rest). The NEW badge stays because it
                        // is gated on `highlightNew`, which the parent keeps true.
                        stopAttentionPulse()
                        onTap()
                    }
                }
        )
        .onAppear {
            startPulseAnimation()
            if highlightNew { playAttention() }
        }
    }

    // MARK: - First-time tap hint (animated hand)

    private var tapHintOverlay: some View {
        VStack(spacing: 12) {
            ZStack {
                // Ripple that radiates on each tap
                Circle()
                    .stroke(Color.white.opacity(0.8), lineWidth: 2.5)
                    .frame(width: 64, height: 64)
                    .scaleEffect(tapHintRippleScale)
                    .opacity(tapHintRippleOpacity)

                // The tapping hand
                Image(systemName: "hand.tap.fill")
                    .font(.system(size: 46, weight: .semibold))
                    .foregroundColor(.white)
                    .scaleEffect(tapHintHandScale)
                    .offset(y: tapHintHandOffsetY)
                    .shadow(color: .black.opacity(0.45), radius: 8, x: 0, y: 4)
            }

            // "Tap here" appears after the first double-tap cycle
            if tapHintShowText {
                Text("Tap here")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(Capsule().fill(Color.black.opacity(0.6)))
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .allowsHitTesting(false) // taps fall through to the card
    }

    /// Loop the hand double-tap + "Tap here" reveal until the hint is dismissed
    /// (overlay removed on tap → onDisappear cancels this task).
    private func playTapHint() {
        tapHintTask?.cancel()

        // Reset to the starting pose.
        tapHintShowText = false
        tapHintHandOffsetY = -10
        tapHintHandScale = 1.0
        tapHintRippleScale = 0.3
        tapHintRippleOpacity = 0

        guard !reduceMotion else {
            // Reduced motion: skip the motion, just show the static hand + label.
            tapHintShowText = true
            return
        }

        tapHintTask = Task { @MainActor in
            while !Task.isCancelled {
                // Reset pose at the top of each cycle
                withAnimation(.easeOut(duration: 0.2)) {
                    tapHintShowText = false
                    tapHintHandOffsetY = -10
                    tapHintHandScale = 1.0
                    tapHintRippleScale = 0.3
                    tapHintRippleOpacity = 0
                }
                try? await Task.sleep(nanoseconds: 250_000_000)
                if Task.isCancelled { break }

                // Double tap onto the centre of the card
                for _ in 0..<2 {
                    withAnimation(.easeIn(duration: 0.16)) {
                        tapHintHandScale = 0.82
                        tapHintHandOffsetY = 6
                        tapHintRippleScale = 0.3
                        tapHintRippleOpacity = 0.9
                    }
                    try? await Task.sleep(nanoseconds: 160_000_000)
                    if Task.isCancelled { break }

                    withAnimation(.easeOut(duration: 0.34)) {
                        tapHintHandScale = 1.0
                        tapHintHandOffsetY = -10
                        tapHintRippleScale = 1.7
                        tapHintRippleOpacity = 0
                    }
                    try? await Task.sleep(nanoseconds: 340_000_000)
                    if Task.isCancelled { break }
                }
                if Task.isCancelled { break }

                // Reveal the label (hand rests slightly up), hold, then loop
                withAnimation(.easeOut(duration: 0.3)) {
                    tapHintShowText = true
                }
                try? await Task.sleep(nanoseconds: 1_400_000_000)
            }
        }
    }

    // MARK: - New-plan attention border

    private var attentionBorder: some View {
        RoundedRectangle(cornerRadius: 24)
            .stroke(
                LinearGradient(
                    colors: [Color.boltGradientStart, Color.success, Color.boltGradientEnd],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 3
            )
            // Opacity/shadow are driven by the pulseTask's withAnimation calls — no
            // .animation(value:) modifier here, so stopping the pulse actually stops it.
            .opacity(pulseActive ? (attentionGlow ? 0.95 : 0.3) : 0)
            .shadow(color: Color.boltPortalGlow.opacity(pulseActive ? 0.8 : 0), radius: attentionGlow ? 22 : 8)
            .allowsHitTesting(false)
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
                // Badges row
                HStack(spacing: 8) {
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
                    .background(Capsule().fill(Color.boltGradient))

                    // NEW badge — only while the plan is freshly generated
                    if highlightNew {
                        HStack(spacing: 4) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 11, weight: .bold))
                            Text("NEW")
                                .font(.system(size: 11, weight: .bold))
                                .tracking(1.2)
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(Color.success))
                        .transition(.scale.combined(with: .opacity))
                    }
                }

                // Title
                Text(groupFlow.title)
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .shadow(color: Color.black.opacity(0.5), radius: 4, x: 0, y: 2)

                // Theme + best-for tags
                HStack(spacing: 8) {
                    // Vibez theme tag (highlighted) — what this plan was generated for
                    if let theme = groupFlow.theme, !theme.isEmpty {
                        Text(theme)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Capsule().fill(Color.boltGradient))
                    }

                    ForEach(groupFlow.bestFor.prefix(2), id: \.self) { tag in
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

                // Time + budget — grouped together and centred in the card, with a single dot divider
                HStack(spacing: Spacing.md) {
                    Label(groupFlow.formattedDuration, systemImage: "clock")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)

                    Circle()
                        .fill(Color.white.opacity(0.5))
                        .frame(width: 4, height: 4)

                    Label(groupFlow.formattedCost, systemImage: "dollarsign.circle")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                }
                .padding(.bottom, Spacing.xs)

                // End-time pill — answers the "when does this wrap?" question that
                // duration + cost don't. Hidden when the data isn't parseable.
                if let endTime = groupFlow.endTime12h {
                    HStack(spacing: 6) {
                        Image(systemName: "moon.stars.fill")
                            .font(.system(size: 12, weight: .semibold))
                        Text("Ends \(endTime)")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.15))
                            .overlay(Capsule().stroke(Color.white.opacity(0.4), lineWidth: 1.5))
                    )
                }
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

    /// One-shot "new plan ready" cue: success haptic, then drive the glow border +
    /// breathing zoom from an explicit task loop. Stopped by `stopAttentionPulse()`
    /// when the user taps the card. `attentionHasPlayed` prevents re-pulsing on
    /// returns from the detail sheet.
    private func playAttention() {
        guard !attentionHasPlayed else { return }
        attentionHasPlayed = true
        HapticManager.shared.success()
        guard !reduceMotion else { return }
        pulseActive = true
        pulseTask?.cancel()
        pulseTask = Task { @MainActor in
            while !Task.isCancelled && pulseActive {
                withAnimation(.easeInOut(duration: 0.7)) { attentionGlow = true }
                try? await Task.sleep(nanoseconds: 700_000_000)
                if Task.isCancelled || !pulseActive { break }
                withAnimation(.easeInOut(duration: 0.7)) { attentionGlow = false }
                try? await Task.sleep(nanoseconds: 700_000_000)
            }
        }
    }

    /// Cancel the pulse loop and ease the border + breathing zoom back to rest.
    /// Called from the tap gesture so the card sits still after the user opens the plan.
    private func stopAttentionPulse() {
        pulseTask?.cancel()
        pulseTask = nil
        withAnimation(.easeOut(duration: 0.3)) {
            pulseActive = false
            attentionGlow = false
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
