//
//  Color+Extensions.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Design tokens implementation based on design-brief.md
//

import SwiftUI

extension Color {
    // MARK: - Primary Colors

    /// Pure Black - Main background color
    static let appBackground = Color(hex: "#000000")

    /// Dark Grey - Cards and elevated surfaces
    static let surfacePrimary = Color(hex: "#1C1C1E")

    /// Medium Grey - Secondary surfaces
    static let surfaceSecondary = Color(hex: "#2C2C2E")

    // MARK: - Accent Colors

    /// Electric Cyan - Main CTA and active states
    static let accentPrimary = Color(hex: "#00D9FF")

    /// Purple - Secondary actions and variety
    static let accentSecondary = Color(hex: "#AF52DE")

    // MARK: - Text Colors

    /// White - Primary text
    static let textPrimary = Color(hex: "#FFFFFF")

    /// Light Grey - Secondary text
    static let textSecondary = Color(hex: "#AEAEB2")

    /// Medium Grey - Tertiary text
    static let textTertiary = Color(hex: "#636366")

    // MARK: - Bolt View Gradient Colors (Purple to Pink)

    /// Bolt gradient start - Deep Purple
    static let boltGradientStart = Color(hex: "#6B3FA0")

    /// Bolt gradient middle - Magenta
    static let boltGradientMiddle = Color(hex: "#9B4DCA")

    /// Bolt gradient end - Hot Pink
    static let boltGradientEnd = Color(hex: "#FF6B9D")

    /// Bolt view background gradient
    static var boltGradient: LinearGradient {
        LinearGradient(
            colors: [boltGradientStart, boltGradientMiddle, boltGradientEnd],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    /// Bolt card background - darker variant for 3D card
    static let boltCardBackground = Color(hex: "#1A0A2E")

    /// Bolt card portal glow
    static let boltPortalGlow = Color(hex: "#8B5CF6")

    // MARK: - Semantic Colors

    /// Green - Success states
    static let success = Color(hex: "#30D158")

    /// Yellow - Warning states
    static let warning = Color(hex: "#FFD60A")

    /// Red - Error states
    static let error = Color(hex: "#FF453A")

    // MARK: - Helper Initializer

    /// Initialize Color from hex string
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
