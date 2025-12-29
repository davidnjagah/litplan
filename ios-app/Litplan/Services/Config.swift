//
//  Config.swift
//  Litplan
//
//  Created for Sprint 6 - Supabase Integration
//  App configuration constants and environment settings
//

import Foundation

/// App configuration for API endpoints and Supabase
enum Config {

    // MARK: - Environment

    /// Current environment (development or production)
    enum Environment {
        case development
        case production
    }

    /// Active environment - change this for deployment
    static let environment: Environment = .development

    // MARK: - Supabase Configuration

    /// Supabase project URL
    static let supabaseURL = "https://clktdigankjszupvrsqt.supabase.co"

    /// Supabase anonymous key for public API access
    /// Note: This key is safe to use in client apps - row level security is enforced server-side
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY_HERE"

    // MARK: - API Configuration

    /// Base URL for backend API
    static var apiBaseURL: String {
        switch environment {
        case .development:
            return "http://localhost:3001/api/v2"
        case .production:
            return "https://us-central1-litplan-ai.cloudfunctions.net/api/v2"
        }
    }

    /// Legacy API base URL (for backward compatibility)
    static var legacyAPIBaseURL: String {
        return "https://us-central1-litplan-ai.cloudfunctions.net/api"
    }

    // MARK: - API Endpoints

    enum Endpoints {
        /// Cities endpoint
        static var cities: String {
            return "\(apiBaseURL)/cities"
        }

        /// Plans endpoint (requires authentication)
        static var plans: String {
            return "\(apiBaseURL)/plans"
        }

        /// User profile endpoint
        static var userProfile: String {
            return "\(apiBaseURL)/user/profile"
        }

        /// User sync endpoint (for Supabase user sync)
        static var userSync: String {
            return "\(apiBaseURL)/user/sync"
        }

        /// App config endpoint
        static var appConfig: String {
            return "\(apiBaseURL)/config"
        }

        /// Subscription validation endpoint
        static var subscriptionValidation: String {
            return "\(apiBaseURL)/subscription/validate"
        }

        /// Health check endpoint
        static var health: String {
            return "\(apiBaseURL)/health"
        }
    }

    // MARK: - App Configuration

    /// App Bundle ID
    static let bundleIdentifier = "com.litplan.app"

    /// Minimum iOS version supported
    static let minimumIOSVersion = "15.0"

    /// App version
    static var appVersion: String {
        return Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }

    /// Build number
    static var buildNumber: String {
        return Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    // MARK: - Feature Flags

    /// Enable offline mode fallback to MockDataService
    static let enableOfflineMode = true

    /// Enable debug logging
    static var enableDebugLogging: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    // MARK: - Timeouts

    /// API request timeout in seconds
    static let apiTimeout: TimeInterval = 30

    /// Session refresh interval in seconds
    static let sessionRefreshInterval: TimeInterval = 3600 // 1 hour

    // MARK: - Keychain Keys

    enum KeychainKeys {
        static let accessToken = "com.litplan.accessToken"
        static let refreshToken = "com.litplan.refreshToken"
        static let userId = "com.litplan.userId"
    }

    // MARK: - UserDefaults Keys

    enum UserDefaultsKeys {
        static let isOnboarded = "isOnboarded"
        static let lastSyncTimestamp = "lastSyncTimestamp"
        static let cachedUserId = "cachedUserId"
        static let guestMode = "guestMode"
    }
}
