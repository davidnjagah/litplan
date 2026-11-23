//
//  TikTokTrackingManager.swift
//  Litplan
//
//  Wraps the TikTok Business (App Events) SDK for install/event attribution.
//  - SDK init happens once at launch (from AppDelegate.didFinishLaunchingWithOptions)
//  - App Tracking Transparency is requested after the app becomes active so the
//    SDK can access IDFA for attribution (iOS 14+ requirement).
//
//  TikTok App ID: 7647234213485363220  (from TikTok Events Manager)
//  appId:          6758998992          (this app's App Store ID)
//

import Foundation
import AppTrackingTransparency
import TikTokBusinessSDK

/// Centralised entry point for TikTok app-event tracking.
enum TikTokTrackingManager {

    // MARK: - Identifiers

    /// This app's numeric App Store ID (matches `appStoreId` in LitplanApp).
    private static let appId = "6758998992"

    /// TikTok App ID from TikTok Events Manager (confirms ownership of the app).
    private static let tiktokAppId = "7647234213485363220"

    private static var didInitialize = false

    // MARK: - Initialization

    /// Initialise the TikTok SDK. Safe to call once, early in the app lifecycle.
    /// Automatic tracking (install / launch / 2D-retention) is handled by the SDK.
    static func initialize() {
        guard !didInitialize else { return }
        didInitialize = true

        // Uses the non-deprecated factory with an empty access token. Per the SDK
        // source, configWithAccessToken: with "" is identical to the old
        // initWithAppId:tiktokAppId: (it sets accessToken = ""), and avoids the
        // deprecation warning. The access token is only for the server-side Events
        // API / advanced matching, which we don't use client-side — set a real
        // token here only if that ever changes.
        guard let config = TikTokConfig(accessToken: "", appId: appId, tiktokAppId: tiktokAppId) else {
            if Config.enableDebugLogging {
                print("[TikTokTracking] Failed to create TikTokConfig")
            }
            return
        }

        if Config.enableDebugLogging {
            config.setLogLevel(TikTokLogLevelVerbose)
            config.enableDebugMode()
        }

        TikTokBusiness.initializeSdk(config) { success, error in
            if Config.enableDebugLogging {
                if success {
                    print("[TikTokTracking] SDK initialized")
                } else {
                    print("[TikTokTracking] SDK init error: \(error?.localizedDescription ?? "unknown")")
                }
            }
        }
    }

    // MARK: - App Tracking Transparency

    /// Request ATT permission so the SDK can use IDFA for attribution.
    /// Call once the UI is active (e.g. applicationDidBecomeActive). The system
    /// only shows the prompt the first time; afterwards this is a no-op.
    static func requestTrackingAuthorization() {
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
        TikTokBusiness.requestTrackingAuthorization { status in
            if Config.enableDebugLogging {
                print("[TikTokTracking] ATT status: \(status)")
            }
        }
    }

    // MARK: - Event Tracking

    /// Track a TikTok standard event (e.g. .registration, .subscribe, .purchase).
    static func track(_ eventType: TTEventName, properties: [String: Any] = [:]) {
        let event = TikTokBaseEvent(eventName: eventType.rawValue)
        for (key, value) in properties {
            event.addProperty(withKey: key, value: value)
        }
        TikTokBusiness.trackTTEvent(event)
    }

    /// Track a fully custom event by name.
    static func trackCustom(_ name: String, properties: [String: Any] = [:]) {
        let event = TikTokBaseEvent(eventName: name)
        for (key, value) in properties {
            event.addProperty(withKey: key, value: value)
        }
        TikTokBusiness.trackTTEvent(event)
    }

    // MARK: - Domain Events

    private static let registrationFiredKeyPrefix = "tiktok_registration_fired_"

    /// Fire a TikTok Registration event for a genuinely new signup — at most once
    /// per user. Safe to call from any auth success path (including returning
    /// logins): the recency guard means only freshly-created accounts fire, and
    /// the per-user flag prevents duplicates.
    /// - Parameters:
    ///   - userId: Supabase user id (dedup key).
    ///   - createdAt: account creation date; only accounts < 10 min old count as new.
    ///   - method: registration method (e.g. "apple", "google", "email").
    static func trackRegistration(userId: String, createdAt: Date?, method: String) {
        let key = registrationFiredKeyPrefix + userId
        guard !UserDefaults.standard.bool(forKey: key) else { return }

        // Only a brand-new account is a registration. A returning login flows
        // through the same code path, so guard on creation recency.
        guard let createdAt, Date().timeIntervalSince(createdAt) < 600 else {
            // Returning user (or unknown age): mark handled so we stop re-checking.
            UserDefaults.standard.set(true, forKey: key)
            return
        }

        UserDefaults.standard.set(true, forKey: key)
        track(.registration, properties: ["registration_method": method])

        if Config.enableDebugLogging {
            print("[TikTokTracking] Registration fired (method: \(method))")
        }
    }

    /// Fire a subscription conversion. Uses StartTrial when the purchase begins a
    /// free trial, otherwise Subscribe. Includes value/currency/content_id so the
    /// event can drive Value-Based Optimization in TikTok Ads Manager.
    static func trackSubscription(productId: String, price: Decimal, currency: String, isTrial: Bool) {
        let eventName: TTEventName = isTrial ? .startTrial : .subscribe
        track(eventName, properties: [
            "content_id": productId,
            "currency": currency,
            "value": NSDecimalNumber(decimal: price).doubleValue,
        ])

        if Config.enableDebugLogging {
            print("[TikTokTracking] \(isTrial ? "StartTrial" : "Subscribe") fired: \(productId) \(price) \(currency)")
        }
    }
}
