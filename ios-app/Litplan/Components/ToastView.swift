//
//  ToastView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 17 - Toast notification component for non-critical feedback
//

import SwiftUI

// MARK: - Toast Type

enum ToastType {
    case success
    case warning
    case error
    case info

    var icon: String {
        switch self {
        case .success:
            return "checkmark.circle.fill"
        case .warning:
            return "exclamationmark.triangle.fill"
        case .error:
            return "xmark.circle.fill"
        case .info:
            return "info.circle.fill"
        }
    }

    var iconColor: Color {
        switch self {
        case .success:
            return .success
        case .warning:
            return .warning
        case .error:
            return .error
        case .info:
            return .accentPrimary
        }
    }
}

// MARK: - Toast Data Model

struct ToastData: Identifiable, Equatable {
    let id = UUID()
    let type: ToastType
    let message: String

    static func == (lhs: ToastData, rhs: ToastData) -> Bool {
        return lhs.id == rhs.id
    }
}

// MARK: - Toast View

struct ToastView: View {
    let toast: ToastData
    let onDismiss: () -> Void

    @State private var offsetY: CGFloat = -100
    @State private var opacity: Double = 0

    var body: some View {
        HStack(spacing: Spacing.sm) {
            // Icon
            Image(systemName: toast.type.icon)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(toast.type.iconColor)
                .accessibilityHidden(true)

            // Message
            Text(toast.message)
                .font(.body)
                .fontWeight(.medium)
                .foregroundColor(.textPrimary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            Spacer()

            // Dismiss button
            Button(action: {
                dismissToast()
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textSecondary)
                    .frame(width: 24, height: 24)
            }
            .accessibilityLabel("Dismiss notification")
            .accessibilityHint("Tap to dismiss")
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.surfacePrimary)
                .shadow(color: Color.black.opacity(0.3), radius: 12, x: 0, y: 4)
        )
        .padding(.horizontal, Spacing.md)
        .offset(y: offsetY)
        .opacity(opacity)
        .onAppear {
            // Slide in animation with ease-out timing
            withAnimation(.easeOut(duration: 0.3)) {
                offsetY = 0
                opacity = 1
            }

            // Auto-dismiss after 3 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                dismissToast()
            }
        }
        .onTapGesture {
            // Tap to dismiss
            dismissToast()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(toast.message)
        .accessibilityAddTraits(.isButton)
        .accessibilityHint("Tap to dismiss")
    }

    // MARK: - Dismiss Animation

    private func dismissToast() {
        withAnimation(.easeIn(duration: 0.2)) {
            offsetY = -100
            opacity = 0
        }

        // Call onDismiss after animation completes
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            onDismiss()
        }
    }
}

// MARK: - Toast Modifier

struct ToastModifier: ViewModifier {
    @Binding var toast: ToastData?

    func body(content: Content) -> some View {
        ZStack {
            content

            // Toast overlay
            if let toast = toast {
                VStack {
                    ToastView(toast: toast) {
                        self.toast = nil
                    }
                    .padding(.top, Spacing.md)

                    Spacer()
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(999)
            }
        }
    }
}

// MARK: - View Extension

extension View {
    /// Show a toast notification
    /// - Parameter toast: The toast data to display
    func toast(_ toast: Binding<ToastData?>) -> some View {
        modifier(ToastModifier(toast: toast))
    }
}

// MARK: - Preview

#Preview("Success Toast") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack {
            Spacer()
        }
    }
    .toast(.constant(ToastData(type: .success, message: "Plan saved successfully")))
}

#Preview("Warning Toast") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack {
            Spacer()
        }
    }
    .toast(.constant(ToastData(type: .warning, message: "Connection restored")))
}

#Preview("Error Toast") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack {
            Spacer()
        }
    }
    .toast(.constant(ToastData(type: .error, message: "Failed to save plan. Please try again.")))
}

#Preview("Info Toast") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack {
            Spacer()
        }
    }
    .toast(.constant(ToastData(type: .info, message: "Purchase successful! Welcome to Litplan Pro.")))
}
