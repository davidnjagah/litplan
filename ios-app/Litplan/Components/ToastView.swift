//
//  ToastView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 17 - Toast notification component for non-critical feedback
//  Updated: Sprint 16 - Bolt-themed centered popup style
//

import SwiftUI

// MARK: - Toast Type

enum ToastType {
    case success
    case warning
    case error
    case info
    case retry
    case thinCoverage

    var icon: String {
        switch self {
        case .success:
            return "checkmark.circle.fill"
        case .warning:
            return "exclamationmark.triangle.fill"
        case .error:
            return "xmark.circle.fill"
        case .info:
            return "bolt.circle.fill"
        case .retry:
            return "bolt.circle.fill"
        case .thinCoverage:
            return "map.fill"
        }
    }

    var iconColor: Color {
        switch self {
        case .success:
            return .green
        case .warning:
            return .boltGradientStart
        case .error:
            return .red
        case .info:
            return .boltGradientEnd
        case .retry:
            return .boltGradientEnd
        case .thinCoverage:
            return Color(red: 0.659, green: 0.831, blue: 0.961) // #A8D4F5 sky blue
        }
    }

    // Custom background gradient for non-standard variants (nil = use default dark purple)
    var backgroundGradientColors: [Color]? {
        switch self {
        case .thinCoverage:
            return [
                Color(red: 0.165, green: 0.373, blue: 0.541).opacity(0.85), // #2A5F8A steel blue
                Color(red: 0.102, green: 0.239, blue: 0.361).opacity(0.85)  // #1A3D5C deep blue
            ]
        default:
            return nil
        }
    }
}

// MARK: - Toast Data Model

struct ToastData: Identifiable, Equatable {
    let id = UUID()
    let type: ToastType
    let message: String
    let persistent: Bool

    init(type: ToastType, message: String, persistent: Bool = false) {
        self.type = type
        self.message = message
        self.persistent = persistent
    }

    static func == (lhs: ToastData, rhs: ToastData) -> Bool {
        return lhs.id == rhs.id
    }
}

// MARK: - Bolt-Themed Toast View (Centered Popup)

struct ToastView: View {
    let toast: ToastData
    let onDismiss: () -> Void

    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0

    var body: some View {
        VStack(spacing: 16) {
            // Icon with glow effect
            ZStack {
                // Glow behind icon
                Circle()
                    .fill(toast.type.iconColor.opacity(0.3))
                    .frame(width: 70, height: 70)
                    .blur(radius: 15)

                // Icon
                Image(systemName: toast.type.icon)
                    .font(.system(size: 44, weight: .medium))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [toast.type.iconColor, toast.type.iconColor.opacity(0.7)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }

            // Message
            Text(toast.message)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)

            // Dismiss hint for persistent toasts
            if toast.persistent {
                Text("Tap anywhere to close")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 28)
        .frame(minWidth: 200, maxWidth: 280)
        .background(
            ZStack {
                // Translucent blur background
                RoundedRectangle(cornerRadius: 24)
                    .fill(.ultraThinMaterial)
                    .opacity(0.6)

                // Background gradient overlay (dark purple default; custom per type)
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: toast.type.backgroundGradientColors ?? [
                                Color(red: 0.12, green: 0.05, blue: 0.2).opacity(0.6),
                                Color(red: 0.06, green: 0.02, blue: 0.1).opacity(0.6)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Subtle glow overlay
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        RadialGradient(
                            colors: [
                                toast.type.iconColor.opacity(0.2),
                                Color.clear
                            ],
                            center: .top,
                            startRadius: 0,
                            endRadius: 150
                        )
                    )

                // Border
                RoundedRectangle(cornerRadius: 24)
                    .stroke(
                        LinearGradient(
                            colors: [
                                toast.type.iconColor.opacity(0.6),
                                toast.type.iconColor.opacity(0.3)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 1
                    )
            }
        )
        .shadow(color: toast.type.iconColor.opacity(0.4), radius: 30, x: 0, y: 10)
        .shadow(color: Color.black.opacity(0.5), radius: 20, x: 0, y: 15)
        .scaleEffect(scale)
        .opacity(opacity)
        .onAppear {
            // Pop in animation
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                scale = 1.0
                opacity = 1
            }

            // Auto-dismiss after 3 seconds (unless persistent)
            if !toast.persistent {
                DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                    dismissToast()
                }
            }
        }
        .onTapGesture {
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
            scale = 0.5
            opacity = 0
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            onDismiss()
        }
    }
}

// MARK: - Toast Modifier (Centered)

struct ToastModifier: ViewModifier {
    @Binding var toast: ToastData?

    func body(content: Content) -> some View {
        ZStack {
            content

            // Centered toast overlay
            if let toast = toast {
                // Dim background
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture {
                        dismissToast()
                    }

                // Centered popup
                ToastView(toast: toast) {
                    self.toast = nil
                }
                .zIndex(1001)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: toast != nil)
    }

    private func dismissToast() {
        withAnimation(.easeIn(duration: 0.2)) {
            toast = nil
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
    }
    .toast(.constant(ToastData(type: .success, message: "Plan saved successfully")))
}

#Preview("Warning Toast") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()
    }
    .toast(.constant(ToastData(type: .warning, message: "Select a city and theme to generate")))
}

#Preview("Error Toast") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()
    }
    .toast(.constant(ToastData(type: .error, message: "Failed to generate plan")))
}

#Preview("Info Toast") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()
    }
    .toast(.constant(ToastData(type: .info, message: "No tokens remaining")))
}
