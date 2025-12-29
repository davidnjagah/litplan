//
//  TertiaryButton.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Tertiary button with text only, accent color
//

import SwiftUI

struct TertiaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    var body: some View {
        Button(action: {
            if !isDisabled && !isLoading {
                action()
            }
        }) {
            HStack(spacing: Spacing.xs) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .accentPrimary))
                        .scaleEffect(0.7)
                }

                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(
                        (isDisabled || isLoading) ? Color.accentPrimary.opacity(0.5) : Color.accentPrimary
                    )
            }
            .frame(height: 44)
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - Preview
#Preview("Default") {
    VStack(spacing: Spacing.md) {
        TertiaryButton(title: "Skip", action: {
            print("Button tapped")
        })

        TertiaryButton(title: "Loading...", action: {}, isLoading: true)

        TertiaryButton(title: "Disabled", action: {}, isDisabled: true)
    }
    .padding(Spacing.md)
    .background(Color.appBackground)
}

#Preview("Dark Background") {
    VStack(spacing: Spacing.lg) {
        Text("Tertiary Button Examples")
            .font(.displayMedium)
            .foregroundColor(.textPrimary)

        TertiaryButton(title: "Maybe Later", action: {})

        TertiaryButton(title: "View Terms & Conditions", action: {})

        TertiaryButton(title: "Restore Purchases", action: {})

        HStack(spacing: Spacing.lg) {
            TertiaryButton(title: "Cancel", action: {})
            TertiaryButton(title: "Learn More", action: {})
        }
    }
    .padding(Spacing.lg)
    .background(Color.appBackground)
}
