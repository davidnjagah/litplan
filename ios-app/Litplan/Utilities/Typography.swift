//
//  Typography.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Typography scale using SF Pro (iOS system font)
//  Updated: 12/28/25 - Added dynamic type support for accessibility
//

import SwiftUI

extension Font {
    // MARK: - Display Styles (Dynamic Type Enabled)

    /// 34pt Bold - Screen titles (scales with user's text size preference)
    static let displayLarge = Font.system(.largeTitle, design: .default).weight(.bold)

    /// 28pt Bold - Section headers (scales with user's text size preference)
    static let displayMedium = Font.system(.title, design: .default).weight(.bold)

    // MARK: - Content Styles (Dynamic Type Enabled)

    /// 22pt Semibold - Card titles (scales with user's text size preference)
    static let headline = Font.system(.title3, design: .default).weight(.semibold)

    /// 18pt Regular - Primary content (scales with user's text size preference)
    static let bodyLarge = Font.system(.body, design: .default).weight(.regular)

    /// 16pt Regular - Standard text (scales with user's text size preference)
    static let body = Font.system(.body, design: .default).weight(.regular)

    /// 14pt Regular - Secondary text (scales with user's text size preference)
    static let callout = Font.system(.callout, design: .default).weight(.regular)

    /// 12pt Regular - Metadata, timestamps (scales with user's text size preference)
    static let caption = Font.system(.caption, design: .default).weight(.regular)
}
