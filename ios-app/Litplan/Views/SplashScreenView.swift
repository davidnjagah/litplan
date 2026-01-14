//
//  SplashScreenView.swift
//  Litplan
//
//  Animated splash screen with smooth pulsing logo
//

import SwiftUI

struct SplashScreenView: View {
    @State private var logoScale: CGFloat = 0.95

    var body: some View {
        ZStack {
            // Dark background matching the logo style
            Color(red: 0.08, green: 0.08, blue: 0.12)
                .ignoresSafeArea()

            // Logo with smooth pulsing animation
            Image("SplashLogo")
                .renderingMode(.original)
                .resizable()
                .scaledToFit()
                .frame(width: 280)
                .scaleEffect(logoScale)
        }
        .onAppear {
            startPulsingAnimation()
        }
    }

    private func startPulsingAnimation() {
        withAnimation(
            .easeInOut(duration: 1.0)
            .repeatForever(autoreverses: true)
        ) {
            logoScale = 1.05
        }
    }
}

// MARK: - Preview
#Preview {
    SplashScreenView()
}
