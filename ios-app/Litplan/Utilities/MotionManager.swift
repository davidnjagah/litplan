//
//  MotionManager.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/12/26.
//  Sprint 15 - 3D Parallax Card Effect with CoreMotion
//

import Foundation
import CoreMotion
import SwiftUI

/// Manages device motion data (gyroscope/accelerometer) for 3D parallax effects
/// Provides pitch and roll values that can be used for card rotation effects
final class MotionManager: ObservableObject {
    static let shared = MotionManager()

    private let motionManager = CMMotionManager()

    /// Normalized pitch value (-1 to 1) - tilting device forward/backward
    @Published var pitch: Double = 0

    /// Normalized roll value (-1 to 1) - tilting device left/right
    @Published var roll: Double = 0

    /// Whether motion updates are active
    @Published var isActive: Bool = false

    /// Sensitivity multiplier for motion effect (higher = more responsive)
    var sensitivity: Double = 12.0

    /// Maximum rotation angle in degrees
    var maxRotation: Double = 18.0

    /// Whether to invert the rotation (phone tilts one way, card tilts opposite)
    var invertRotation: Bool = true

    private init() {}

    // MARK: - Public Methods

    /// Start receiving device motion updates
    func startMotionUpdates() {
        guard motionManager.isDeviceMotionAvailable else {
            print("MotionManager: Device motion not available")
            return
        }

        guard !isActive else { return }

        motionManager.deviceMotionUpdateInterval = 1.0 / 60.0 // 60 FPS
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let self = self, let motion = motion, error == nil else { return }

            // Get attitude (device orientation relative to reference frame)
            let attitude = motion.attitude

            // Apply sensitivity and clamp values
            // Pitch: forward/backward tilt (negative = tilted toward user)
            // Roll: left/right tilt
            // Invert: phone tilts anticlockwise -> card tilts clockwise
            let invertMultiplier = self.invertRotation ? -1.0 : 1.0

            // Use smoother animation with higher response time and damping
            withAnimation(.spring(response: 0.25, dampingFraction: 0.85, blendDuration: 0.1)) {
                self.pitch = self.clampedValue(attitude.pitch * self.sensitivity * invertMultiplier)
                self.roll = self.clampedValue(attitude.roll * self.sensitivity * invertMultiplier)
            }
        }

        isActive = true
    }

    /// Stop receiving device motion updates
    func stopMotionUpdates() {
        motionManager.stopDeviceMotionUpdates()
        isActive = false

        // Reset to neutral position
        withAnimation(.easeOut(duration: 0.3)) {
            pitch = 0
            roll = 0
        }
    }

    /// Get X rotation angle for 3D effect (based on roll)
    var xRotation: Double {
        return clampedRotation(roll)
    }

    /// Get Y rotation angle for 3D effect (based on pitch)
    var yRotation: Double {
        return clampedRotation(pitch)
    }

    // MARK: - Private Helpers

    private func clampedValue(_ value: Double) -> Double {
        return max(-1, min(1, value))
    }

    private func clampedRotation(_ value: Double) -> Double {
        return max(-maxRotation, min(maxRotation, value * maxRotation))
    }
}

// MARK: - SwiftUI View Extension

extension View {
    /// Apply 3D parallax rotation effect based on device motion
    /// - Parameters:
    ///   - motionManager: The MotionManager instance to use
    ///   - intensity: Multiplier for the effect intensity (0-1)
    /// - Returns: Modified view with 3D rotation applied
    func parallax3DEffect(_ motionManager: MotionManager, intensity: Double = 1.0) -> some View {
        self
            .rotation3DEffect(
                .degrees(motionManager.xRotation * intensity),
                axis: (x: 0, y: 1, z: 0),
                perspective: 0.5
            )
            .rotation3DEffect(
                .degrees(motionManager.yRotation * intensity),
                axis: (x: 1, y: 0, z: 0),
                perspective: 0.5
            )
    }

    /// Apply parallax offset for layered depth effect
    /// - Parameters:
    ///   - motionManager: The MotionManager instance to use
    ///   - multiplier: How much this layer moves (higher = more movement for foreground)
    /// - Returns: Modified view with parallax offset
    func parallaxOffset(_ motionManager: MotionManager, multiplier: CGFloat = 1.0) -> some View {
        self.offset(
            x: CGFloat(motionManager.roll) * 10 * multiplier,
            y: CGFloat(motionManager.pitch) * 10 * multiplier
        )
    }
}
