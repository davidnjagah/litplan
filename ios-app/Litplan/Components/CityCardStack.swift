//
//  CityCardStack.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  City card stack component for Home screen
//

import SwiftUI

struct CityCardStack: View {
    let city: City
    let onTap: () -> Void

    // Card dimensions as specified
    private let cardWidth: CGFloat = 280
    private let cardHeight: CGFloat = 360

    // Stack effect offsets
    private let verticalOffset: CGFloat = 8
    private let horizontalOffset: CGFloat = 4

    // Animation state
    @State private var isPressed = false

    // Accessibility - Reduce Motion
    @Environment(\.accessibilityReduceMotion) var reduceMotion

    var body: some View {
        ZStack {
            // Back cards for stack effect (3-4 cards visible)
            // Card 3 (furthest back)
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.surfaceSecondary)
                .frame(width: cardWidth, height: cardHeight)
                .offset(x: horizontalOffset * 2, y: verticalOffset * 2)
                .rotationEffect(.degrees(1.5))
                .accessibilityHidden(true)

            // Card 2 (middle)
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.surfaceSecondary)
                .frame(width: cardWidth, height: cardHeight)
                .offset(x: horizontalOffset, y: verticalOffset)
                .rotationEffect(.degrees(-1))
                .accessibilityHidden(true)

            // Front card (main card with content)
            VStack(spacing: 0) {
                // City image with gradient overlay
                ZStack(alignment: .topTrailing) {
                    // Image
                    AsyncImageView(url: URL(string: city.displayAssets.heroImageUrl))
                        .frame(width: cardWidth, height: cardHeight)
                        .clipped()

                    // Gradient overlay (black 0% → transparent)
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.black.opacity(0.8),
                            Color.black.opacity(0.4),
                            Color.clear
                        ]),
                        startPoint: .bottom,
                        endPoint: .top
                    )

                    // Plan count badge (top-right)
                    Text("\(city.metadata.planCount) plans this week")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.textPrimary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(
                            Capsule()
                                .fill(Color.accentPrimary)
                        )
                        .padding([.top, .trailing], Spacing.md)
                }
                .overlay(alignment: .bottom) {
                    // City info at bottom
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        // City name
                        Text(city.name)
                            .font(.displayMedium)
                            .fontWeight(.bold)
                            .foregroundColor(.textPrimary)

                        // Country with flag
                        HStack(spacing: Spacing.xxs) {
                            Text(city.displayAssets.countryFlag)
                                .font(.callout)
                            Text(city.country)
                                .font(.callout)
                                .foregroundColor(.textSecondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, Spacing.md)
                    .padding(.bottom, Spacing.lg)
                }
            }
            .frame(width: cardWidth, height: cardHeight)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.3), radius: 12, x: 0, y: 4)
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .animation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.75), value: isPressed)
        }
        .accessibilityLabel("\(city.name), \(city.country)")
        .accessibilityHint("Double tap to explore \(city.metadata.planCount) nightlife plans")
        .accessibilityAddTraits(.isButton)
        .onTapGesture {
            // Spring animation on tap
            isPressed = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                isPressed = false
            }
            onTap()
        }
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack {
            CityCardStack(city: City.sampleNYC) {
                print("Tapped New York card")
            }

            Spacer().frame(height: 40)

            CityCardStack(city: City.sampleLondon) {
                print("Tapped London card")
            }
        }
    }
}
