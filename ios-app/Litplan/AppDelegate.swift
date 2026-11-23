//
//  AppDelegate.swift
//  Litplan
//
//  Handles APNs registration and push notification callbacks
//

import UIKit
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Initialize TikTok app-events SDK for install/event attribution.
        // ATT permission is requested later, in applicationDidBecomeActive.
        TikTokTrackingManager.initialize()

        // Set notification center delegate
        UNUserNotificationCenter.current().delegate = PushNotificationManager.shared

        // Check if launched from notification
        if let notification = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
            print("[AppDelegate] Launched from notification: \(notification)")
        }

        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Request App Tracking Transparency so TikTok's SDK can use IDFA for
        // attribution. The system only shows the prompt once; subsequent calls
        // are no-ops. Done here (not at launch) so it appears over live UI.
        TikTokTrackingManager.requestTrackingAuthorization()
    }

    // MARK: - Push Notification Registration

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushNotificationManager.shared.didRegisterForRemoteNotifications(deviceToken: deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            PushNotificationManager.shared.didFailToRegisterForRemoteNotifications(error: error)
        }
    }

    // MARK: - Silent Push Notifications

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // Handle silent push notifications for background updates
        print("[AppDelegate] Received silent notification: \(userInfo)")

        // Check if this is a content-available notification
        if let aps = userInfo["aps"] as? [String: Any],
           aps["content-available"] as? Int == 1 {
            // Handle background fetch
            handleBackgroundNotification(userInfo)
        }

        completionHandler(.newData)
    }

    private func handleBackgroundNotification(_ userInfo: [AnyHashable: Any]) {
        // Handle background data sync, etc.
        print("[AppDelegate] Processing background notification")
    }
}
