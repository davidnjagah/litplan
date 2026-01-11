//
//  ViewedCityCard.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 2, Day 9 - City card for recently viewed cities list
//

import SwiftUI

struct ViewedCityCard: View {
    let viewedCity: ViewedCity
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.sm) {
                // Left: City thumbnail image (80x80pt per design-brief.md)
                AsyncImageView(url: URL(string: viewedCity.displayAssets.thumbnailUrl ?? ""), targetSize: CGSize(width: 80, height: 80))
                    .frame(width: 80, height: 80)
                    .cornerRadius(12)
                    .clipped()

                // Right: City info
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    // City name
                    Text(viewedCity.name)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)

                    // Country with flag
                    HStack(spacing: 4) {
                        Text(viewedCity.displayAssets.countryFlag)
                            .font(.system(size: 14))

                        Text(viewedCity.country)
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // View count and timestamp
                    HStack(spacing: Spacing.sm) {
                        // View count
                        HStack(spacing: 4) {
                            Image(systemName: "eye.fill")
                                .font(.system(size: 11))
                                .foregroundColor(.textTertiary)

                            Text("\(viewedCity.viewCount) view\(viewedCity.viewCount == 1 ? "" : "s")")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }

                        // Separator
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.textTertiary)

                        // Last viewed timestamp
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.system(size: 11))
                                .foregroundColor(.textTertiary)

                            Text(viewedCity.viewedAt.shortRelativeString)
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Right chevron indicator
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textTertiary)
            }
            .padding(Spacing.sm)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack(spacing: Spacing.md) {
            ViewedCityCard(viewedCity: ViewedCity.sampleNYC) {
                print("Tapped NYC")
            }

            ViewedCityCard(viewedCity: ViewedCity.sampleLondon) {
                print("Tapped London")
            }

            ViewedCityCard(viewedCity: ViewedCity.sampleTokyo) {
                print("Tapped Tokyo")
            }
        }
        .padding(Spacing.md)
    }
}
