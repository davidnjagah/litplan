//
//  PrimaryButton.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Primary CTA button with accent background
//

import SwiftUI

struct PrimaryButton: View {
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
                        .progressViewStyle(CircularProgressViewStyle(tint: .textPrimary))
                        .scaleEffect(0.8)
                }

                Text(title)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(
                (isDisabled || isLoading) ? Color.accentPrimary.opacity(0.5) : Color.accentPrimary
            )
            .cornerRadius(Spacing.sm)
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - Preview
#Preview("Default") {
    VStack(spacing: Spacing.md) {
        PrimaryButton(title: "Subscribe Now", action: {
            print("Button tapped")
        })

        PrimaryButton(title: "Loading...", action: {}, isLoading: true)

        PrimaryButton(title: "Disabled", action: {}, isDisabled: true)
    }
    .padding(Spacing.md)
    .background(Color.appBackground)
}

#Preview("Dark Background") {
    VStack(spacing: Spacing.lg) {
        Text("Primary Button Examples")
            .font(.displayMedium)
            .foregroundColor(.textPrimary)

        PrimaryButton(title: "Unlock Litplan Pro", action: {})

        PrimaryButton(title: "Start Free Trial", action: {})

        PrimaryButton(title: "View Details", action: {})
    }
    .padding(Spacing.lg)
    .background(Color.appBackground)
}
