//
//  PushNotificationManager.swift
//  Litplan
//
//  Manages push notification registration, device token storage, and notification handling
//

import Foundation
import UserNotifications
import UIKit

/// Manages push notifications for the app
/// Handles APNs registration, device token storage, and notification handling
@MainActor
class PushNotificationManager: NSObject, ObservableObject {

    // MARK: - Singleton

    static let shared = PushNotificationManager()

    // MARK: - Published Properties

    @Published var isRegistered: Bool = false
    @Published var deviceToken: String?
    @Published var notificationPermissionStatus: UNAuthorizationStatus = .notDetermined
    @Published var pendingNotification: PushNotificationPayload?

    // MARK: - Private Properties

    private let deviceTokenKey = "deviceToken"
    private let tokenSentKey = "deviceTokenSentToBackend"

    // MARK: - Initialization

    private override init() {
        super.init()
        loadCachedToken()
    }

    // MARK: - Permission & Registration

    /// Request notification permissions and register for remote notifications
    func requestPermissionAndRegister() async -> Bool {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])

            if granted {
                // Register for remote notifications on main thread
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                print("[PushNotificationManager] Permission granted, registered for remote notifications")
            } else {
                print("[PushNotificationManager] Permission denied")
            }

            // Update status
            await checkPermissionStatus()

            return granted
        } catch {
            print("[PushNotificationManager] Permission request failed: \(error.localizedDescription)")
            return false
        }
    }

    /// Check current notification permission status
    func checkPermissionStatus() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        await MainActor.run {
            self.notificationPermissionStatus = settings.authorizationStatus
            self.isRegistered = settings.authorizationStatus == .authorized
        }
    }

    /// Open system settings for the app
    func openSettings() {
        guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(settingsURL)
    }

    // MARK: - Device Token Handling

    /// Called when APNs registration succeeds
    func didRegisterForRemoteNotifications(deviceToken: Data) {
        // Convert token to string
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()

        print("[PushNotificationManager] Device token received: \(tokenString.prefix(20))...")

        // Update state
        self.deviceToken = tokenString
        self.isRegistered = true

        // Cache token locally
        UserDefaults.standard.set(tokenString, forKey: deviceTokenKey)

        // Send to backend
        Task {
            await sendTokenToBackend(tokenString)
        }
    }

    /// Called when APNs registration fails
    func didFailToRegisterForRemoteNotifications(error: Error) {
        print("[PushNotificationManager] Failed to register: \(error.localizedDescription)")
        self.isRegistered = false
    }

    /// Load cached token from UserDefaults
    private func loadCachedToken() {
        if let cachedToken = UserDefaults.standard.string(forKey: deviceTokenKey) {
            self.deviceToken = cachedToken
            print("[PushNotificationManager] Loaded cached token: \(cachedToken.prefix(20))...")
        }
    }

    // MARK: - Backend Sync

    /// Send device token to backend for storage
    func sendTokenToBackend(_ token: String) async {
        guard let accessToken = await SupabaseManager.shared.getAccessToken() else {
            print("[PushNotificationManager] No auth token, skipping backend sync")
            return
        }

        do {
            let deviceInfo = getDeviceInfo()

            let body: [String: Any] = [
                "token": token,
                "platform": "ios",
                "appVersion": Config.appVersion,
                "deviceModel": deviceInfo.model,
                "osVersion": deviceInfo.osVersion,
            ]

            guard let url = URL(string: "\(Config.supabaseURL)/functions/v1/user/device-token") else {
                print("[PushNotificationManager] Invalid URL")
                return
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                UserDefaults.standard.set(true, forKey: tokenSentKey)
                print("[PushNotificationManager] Token sent to backend successfully")
            } else {
                let responseString = String(data: data, encoding: .utf8) ?? "No response"
                print("[PushNotificationManager] Failed to send token: \(responseString)")
            }
        } catch {
            print("[PushNotificationManager] Error sending token: \(error.localizedDescription)")
        }
    }

    /// Resend token to backend after login
    func resendTokenAfterLogin() async {
        guard let token = deviceToken else {
            print("[PushNotificationManager] No token to resend")
            return
        }

        await sendTokenToBackend(token)
    }

    /// Remove token from backend on logout
    func removeTokenOnLogout() async {
        guard let token = deviceToken,
              let accessToken = await SupabaseManager.shared.getAccessToken() else {
            return
        }

        do {
            guard let url = URL(string: "\(Config.supabaseURL)/functions/v1/user/device-token?token=\(token)") else {
                return
            }

            var request = URLRequest(url: url)
            request.httpMethod = "DELETE"
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

            let (_, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                UserDefaults.standard.set(false, forKey: tokenSentKey)
                print("[PushNotificationManager] Token removed from backend")
            }
        } catch {
            print("[PushNotificationManager] Error removing token: \(error.localizedDescription)")
        }
    }

    // MARK: - Notification Handling

    /// Handle received notification when app is in foreground
    func handleForegroundNotification(_ notification: UNNotification) {
        let userInfo = notification.request.content.userInfo
        print("[PushNotificationManager] Foreground notification received: \(userInfo)")

        // Parse and handle notification
        if let payload = parseNotificationPayload(userInfo) {
            handleNotificationPayload(payload)
        }
    }

    /// Handle notification tap (user opened app from notification)
    func handleNotificationResponse(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        print("[PushNotificationManager] Notification tapped: \(userInfo)")

        // Parse and handle notification
        if let payload = parseNotificationPayload(userInfo) {
            // Store pending notification for deep linking
            self.pendingNotification = payload
            handleNotificationPayload(payload)
        }
    }

    /// Parse notification payload from userInfo
    private func parseNotificationPayload(_ userInfo: [AnyHashable: Any]) -> PushNotificationPayload? {
        guard let type = userInfo["type"] as? String else {
            return nil
        }

        return PushNotificationPayload(
            type: type,
            cityName: userInfo["cityName"] as? String,
            action: userInfo["action"] as? String,
            data: userInfo as? [String: Any]
        )
    }

    /// Handle notification payload (trigger deep link, show UI, etc.)
    private func handleNotificationPayload(_ payload: PushNotificationPayload) {
        switch payload.type {
        case "city_discovery":
            handleCityDiscoveryNotification(payload)
        default:
            print("[PushNotificationManager] Unknown notification type: \(payload.type)")
        }
    }

    /// Handle city discovery notification
    private func handleCityDiscoveryNotification(_ payload: PushNotificationPayload) {
        guard let cityName = payload.cityName else { return }

        if payload.action == "discovery_complete" {
            print("[PushNotificationManager] City discovery complete: \(cityName)")
            // Trigger navigation to city
            NotificationCenter.default.post(
                name: .cityDiscoveryComplete,
                object: nil,
                userInfo: ["cityName": cityName]
            )
        } else if payload.action == "discovery_failed" {
            print("[PushNotificationManager] City discovery failed: \(cityName)")
            // Show error message
            NotificationCenter.default.post(
                name: .cityDiscoveryFailed,
                object: nil,
                userInfo: ["cityName": cityName]
            )
        }
    }

    /// Clear pending notification after handling
    func clearPendingNotification() {
        pendingNotification = nil
    }

    // MARK: - Helpers

    private func getDeviceInfo() -> (model: String, osVersion: String) {
        let device = UIDevice.current
        return (
            model: device.model,
            osVersion: device.systemVersion
        )
    }
}

// MARK: - Notification Payload

struct PushNotificationPayload {
    let type: String
    let cityName: String?
    let action: String?
    let data: [String: Any]?
}

// MARK: - Notification Names

extension Notification.Name {
    static let cityDiscoveryComplete = Notification.Name("cityDiscoveryComplete")
    static let cityDiscoveryFailed = Notification.Name("cityDiscoveryFailed")
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationManager: UNUserNotificationCenterDelegate {

    /// Called when notification is received while app is in foreground
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        Task { @MainActor in
            self.handleForegroundNotification(notification)
        }

        // Show notification even when app is in foreground
        completionHandler([.banner, .badge, .sound])
    }

    /// Called when user taps on notification
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task { @MainActor in
            self.handleNotificationResponse(response)
        }

        completionHandler()
    }
}
