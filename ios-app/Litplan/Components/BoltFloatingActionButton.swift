//
//  BoltFloatingActionButton.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/12/26.
//  Sprint 15 - Floating Action Button with Bolt Icon and Gradient Style
//

import SwiftUI

/// Floating Action Button styled to match the BoltView aesthetic
/// Features gradient background, bolt icon, and scale animation on tap
struct BoltFloatingActionButton: View {
    var action: () -> Void

    @State private var isPressed = false
    @State private var pulseScale: CGFloat = 1.0

    // Button dimensions
    private let buttonSize: CGFloat = 56

    var body: some View {
        ZStack {
            // Outer glow ring (pulse animation)
            Circle()
                .fill(Color.boltGradient)
                .frame(width: buttonSize + 20, height: buttonSize + 20)
                .opacity(0.3)
                .scaleEffect(pulseScale)
                .blur(radius: 8)

            // Main button
            Button(action: {
                HapticManager.shared.medium()
                action()
            }) {
                ZStack {
                    // Gradient background
                    Circle()
                        .fill(Color.boltGradient)
                        .frame(width: buttonSize, height: buttonSize)

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
                        .frame(width: buttonSize, height: buttonSize)

                    // Bolt icon
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                        .shadow(color: Color.black.opacity(0.3), radius: 2, x: 0, y: 1)
                }
            }
            .buttonStyle(BoltScaleButtonStyle())
            .shadow(color: Color.boltGradientStart.opacity(0.5), radius: 12, x: 0, y: 6)
            .shadow(color: Color.boltGradientEnd.opacity(0.3), radius: 20, x: 0, y: 10)
        }
        .onAppear {
            startPulseAnimation()
        }
    }

    private func startPulseAnimation() {
        withAnimation(
            .easeInOut(duration: 1.5)
            .repeatForever(autoreverses: true)
        ) {
            pulseScale = 1.15
        }
    }
}

/// Custom button style with scale effect for Bolt FAB
private struct BoltScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.9 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// MARK: - Preview

#Preview("Floating Action Button") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        VStack {
            Spacer()

            HStack {
                Spacer()

                BoltFloatingActionButton {
                    print("FAB tapped!")
                }
                .padding(.trailing, 20)
                .padding(.bottom, 100)
            }
        }
    }
}
