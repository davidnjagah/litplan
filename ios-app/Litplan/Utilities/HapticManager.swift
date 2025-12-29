//
//  HapticManager.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 3, Day 14 - Centralized haptic feedback manager
//

import UIKit

/// Centralized manager for haptic feedback throughout the app
/// Provides simple methods for common haptic patterns
final class HapticManager {

    // MARK: - Singleton

    static let shared = HapticManager()

    private init() {}

    // MARK: - Impact Feedback

    /// Light impact - for subtle interactions (like toggling favorites)
    func light() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.prepare()
        generator.impactOccurred()
    }

    /// Medium impact - for standard interactions (like tapping cards)
    func medium() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        generator.impactOccurred()
    }

    /// Heavy impact - for important actions (like completing a purchase)
    func heavy() {
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.prepare()
        generator.impactOccurred()
    }

    /// Soft impact - for gentle feedback (iOS 13+)
    @available(iOS 13.0, *)
    func soft() {
        let generator = UIImpactFeedbackGenerator(style: .soft)
        generator.prepare()
        generator.impactOccurred()
    }

    /// Rigid impact - for precise feedback (iOS 13+)
    @available(iOS 13.0, *)
    func rigid() {
        let generator = UIImpactFeedbackGenerator(style: .rigid)
        generator.prepare()
        generator.impactOccurred()
    }

    // MARK: - Notification Feedback

    /// Success notification - for successful actions (like successful purchase)
    func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.success)
    }

    /// Warning notification - for warning states (like approaching limits)
    func warning() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.warning)
    }

    /// Error notification - for errors (like failed purchase)
    func error() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.error)
    }

    // MARK: - Selection Feedback

    /// Selection change - for picker changes or tab switches
    func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
    }

    // MARK: - Custom Patterns

    /// Double tap pattern - two light taps in quick succession
    func doubleTap() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.prepare()
        generator.impactOccurred()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            generator.impactOccurred()
        }
    }

    /// Refresh pattern - light tap for pull-to-refresh
    func refresh() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.prepare()
        generator.impactOccurred()
    }
}

// MARK: - SwiftUI Preview Helper

#if DEBUG
extension HapticManager {
    /// Test all haptic types (for debugging)
    func testAllHaptics() {
        print("Testing all haptics...")

        light()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.medium()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
            self?.heavy()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { [weak self] in
            self?.success()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
            self?.selection()
        }
    }
}
#endif
