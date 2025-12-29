//
//  SecondaryButton.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Secondary button with accent border and transparent background
//

import SwiftUI

struct SecondaryButton: View {
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
                        .scaleEffect(0.8)
                }

                Text(title)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(
                        (isDisabled || isLoading) ? Color.accentPrimary.opacity(0.5) : Color.accentPrimary
                    )
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.sm)
                    .stroke(
                        (isDisabled || isLoading) ? Color.accentPrimary.opacity(0.5) : Color.accentPrimary,
                        lineWidth: 2
                    )
            )
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - Preview
#Preview("Default") {
    VStack(spacing: Spacing.md) {
        SecondaryButton(title: "Maybe Later", action: {
            print("Button tapped")
        })

        SecondaryButton(title: "Loading...", action: {}, isLoading: true)

        SecondaryButton(title: "Disabled", action: {}, isDisabled: true)
    }
    .padding(Spacing.md)
    .background(Color.appBackground)
}

#Preview("Dark Background") {
    VStack(spacing: Spacing.lg) {
        Text("Secondary Button Examples")
            .font(.displayMedium)
            .foregroundColor(.textPrimary)

        SecondaryButton(title: "View All Plans", action: {})

        SecondaryButton(title: "Learn More", action: {})

        SecondaryButton(title: "Cancel", action: {})
    }
    .padding(Spacing.lg)
    .background(Color.appBackground)
}
