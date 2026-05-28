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
/// Optimized for comfortable phone holding angle (30-45°) with smooth response
@MainActor
final class MotionManager: ObservableObject {
    static let shared = MotionManager()

    private let motionManager = CMMotionManager()

    /// Normalized pitch value (-1 to 1) - tilting device forward/backward
    @Published var pitch: Double = 0

    /// Normalized roll value (-1 to 1) - tilting device left/right
    @Published var roll: Double = 0

    /// Whether motion updates are active
    @Published var isActive: Bool = false

    /// Sensitivity multiplier for motion effect (lower = smoother, less reactive)
    var sensitivity: Double = 4.0

    /// Maximum rotation angle in degrees
    var maxRotation: Double = 12.0

    /// Whether to invert the rotation (phone tilts one way, card tilts opposite)
    var invertRotation: Bool = true

    /// Whether gyroscope/device-tilt drives the card. Disabled by design — the card
    /// now responds ONLY to touch drag. When false, CoreMotion is never started and
    /// the gyro term is dropped from xRotation/yRotation (drag offsets still apply).
    var tiltEnabled: Bool = false

    /// Sensitivity of touch drag in degrees per point
    var dragSensitivity: Double = 0.15

    // MARK: - Touch Offset

    /// Additional rotation from finger drag (degrees), blended on top of gyroscope
    @Published var touchRollOffset: Double = 0
    @Published var touchPitchOffset: Double = 0

    /// Whether a drag gesture is currently active
    @Published var isDragging: Bool = false

    /// Apply touch drag translation to card rotation
    func setTouchOffset(translation: CGSize) {
        isDragging = true
        touchRollOffset = max(-maxRotation, min(maxRotation, Double(translation.width) * dragSensitivity))
        touchPitchOffset = max(-maxRotation, min(maxRotation, Double(translation.height) * dragSensitivity))
    }

    /// Spring the touch offset back to zero on drag end
    func resetTouchOffset() {
        withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
            touchRollOffset = 0
            touchPitchOffset = 0
        }
        // Delay gyro resumption until the spring has settled to avoid conflicting animations
        Task {
            try? await Task.sleep(nanoseconds: 400_000_000) // 0.4s matches spring response
            isDragging = false
        }
    }

    // MARK: - Smooth Motion Configuration

    /// Reference pitch angle in radians (0° = phone flat on a surface)
    /// This is the "neutral" position where the card appears flat
    private let referencePitch: Double = 0.873 // 50 degrees

    /// Deadzone threshold - movements smaller than this are ignored (in radians)
    /// Prevents jittery response to small hand tremors
    private let deadzone: Double = 0.08 // ~4.5 degrees

    /// Smoothing factor for low-pass filter (0-1, higher = smoother but slower)
    private let smoothingFactor: Double = 0.5

    /// Previous smoothed values for interpolation
    private var smoothedPitch: Double = 0
    private var smoothedRoll: Double = 0

    private init() {}

    // MARK: - Public Methods

    /// Start receiving device motion updates
    func startMotionUpdates() {
        // Gyro tilt is disabled — the card reacts to touch drag only. Skip CoreMotion entirely (saves battery).
        guard tiltEnabled else { return }
        guard motionManager.isDeviceMotionAvailable else {
            print("MotionManager: Device motion not available")
            return
        }

        guard !isActive else { return }

        // Lower update rate for smoother, less jittery updates
        motionManager.deviceMotionUpdateInterval = 1.0 / 30.0 // 30 FPS is sufficient for smooth tilt
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let self = self, let motion = motion, error == nil else { return }

            // Get attitude (device orientation relative to reference frame)
            let attitude = motion.attitude

            // Calculate pitch relative to comfortable holding angle (30-45°)
            // When phone is at ~37.5°, relativePitch is 0 (neutral)
            let relativePitch = attitude.pitch - self.referencePitch

            // Apply deadzone - ignore small movements
            let filteredPitch = self.applyDeadzone(relativePitch)
            let filteredRoll = self.applyDeadzone(attitude.roll)

            // Apply low-pass filter for smooth interpolation
            self.smoothedPitch = self.lerp(self.smoothedPitch, filteredPitch, t: self.smoothingFactor)
            self.smoothedRoll = self.lerp(self.smoothedRoll, filteredRoll, t: self.smoothingFactor)

            // Invert roll (left/right) but NOT pitch (up/down)
            // Phone tilts backward → card tilts up (follows phone)
            // Phone tilts left/right → card tilts opposite (natural feel)
            let rollInvertMultiplier = self.invertRotation ? -1.0 : 1.0

            // Apply sensitivity and clamp
            // Pitch: NOT inverted - card follows phone tilt direction
            let newPitch = self.clampedValue(self.smoothedPitch * self.sensitivity)
            let newRoll = self.clampedValue(self.smoothedRoll * self.sensitivity * rollInvertMultiplier)

            // Pause gyroscope updates while finger is dragging to prevent fighting
            guard !self.isDragging else { return }

            withAnimation(.easeOut(duration: 0.3)) {
                self.pitch = newPitch
                self.roll = newRoll
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

    /// Get X rotation angle for 3D effect (touch drag only; gyro term gated by tiltEnabled)
    var xRotation: Double {
        let gyro = tiltEnabled ? clampedRotation(roll) : 0
        return max(-maxRotation, min(maxRotation, gyro + touchRollOffset))
    }

    /// Get Y rotation angle for 3D effect (touch drag only; gyro term gated by tiltEnabled)
    var yRotation: Double {
        let gyro = tiltEnabled ? clampedRotation(pitch) : 0
        return max(-maxRotation, min(maxRotation, gyro + touchPitchOffset))
    }

    // MARK: - Private Helpers

    private func clampedValue(_ value: Double) -> Double {
        return max(-1, min(1, value))
    }

    private func clampedRotation(_ value: Double) -> Double {
        return max(-maxRotation, min(maxRotation, value * maxRotation))
    }

    /// Apply deadzone to filter out small movements
    private func applyDeadzone(_ value: Double) -> Double {
        if abs(value) < deadzone {
            return 0
        }
        // Smoothly ramp from deadzone edge (avoids sudden jump when exiting deadzone)
        let sign = value > 0 ? 1.0 : -1.0
        return sign * (abs(value) - deadzone)
    }

    /// Linear interpolation for smooth transitions
    private func lerp(_ from: Double, _ to: Double, t: Double) -> Double {
        return from + (to - from) * t
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
                perspective: 1.0
            )
            .rotation3DEffect(
                .degrees(motionManager.yRotation * intensity),
                axis: (x: 1, y: 0, z: 0),
                perspective: 1.0
            )
    }

    /// Apply parallax offset for layered depth effect
    /// Uses combined xRotation/yRotation so touch drag moves the layers too.
    func parallaxOffset(_ motionManager: MotionManager, multiplier: CGFloat = 1.0) -> some View {
        self.offset(
            x: CGFloat(motionManager.xRotation / motionManager.maxRotation) * 10 * multiplier,
            y: CGFloat(motionManager.yRotation / motionManager.maxRotation) * 10 * multiplier
        )
    }
}
