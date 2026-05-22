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
    static let environment: Environment = .production

    // MARK: - Supabase Configuration

    /// Supabase project URL (using custom domain)
    static let supabaseURL = "https://auth.litplanz.com"

    /// Supabase anonymous key for public API access
    /// Note: This key is safe to use in client apps - row level security is enforced server-side
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3RkaWdhbmtqc3p1cHZyc3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTY0MzcsImV4cCI6MjA4MjU5MjQzN30.lxRTafWUnKoQ4DBDTQEC9oioxYDejqtkT3apMC2Ervk"

    // MARK: - API Configuration

    /// Base URL for Supabase Edge Functions
    static var apiBaseURL: String {
        return "\(supabaseURL)/functions/v1"
    }

    /// Legacy API base URL (for backward compatibility - deprecated)
    static var legacyAPIBaseURL: String {
        return "https://us-central1-litplan-ai.cloudfunctions.net/api"
    }

    /// Railway API base URL (for AI pipelines with longer timeouts)
    static var railwayAPIBaseURL: String {
        return "https://litplan-production.up.railway.app"
    }

    // MARK: - API Endpoints

    enum Endpoints {
        /// Cities endpoint - Supabase Edge Function
        static var cities: String {
            return "\(apiBaseURL)/cities"
        }

        /// Plans endpoint - Supabase Edge Function (requires authentication)
        static var plans: String {
            return "\(apiBaseURL)/plans"
        }

        /// User profile endpoint - Supabase Edge Function
        static var userProfile: String {
            return "\(apiBaseURL)/user/profile"
        }

        /// User sync endpoint - Supabase Edge Function
        static var userSync: String {
            return "\(apiBaseURL)/user/sync"
        }

        /// App config endpoint (served from health for now)
        static var appConfig: String {
            return "\(apiBaseURL)/health"
        }

        /// Subscription validation endpoint (legacy - use verify instead)
        static var subscriptionValidation: String {
            return "\(apiBaseURL)/subscription/verify"
        }

        /// Subscription verify endpoint - Supabase Edge Function
        /// Syncs StoreKit 2 transactions with backend
        static var subscriptionVerify: String {
            return "\(apiBaseURL)/subscription/verify"
        }

        /// Get subscription status endpoint - Supabase Edge Function
        static var subscriptionStatus: String {
            return "\(apiBaseURL)/subscription/status"
        }

        /// Health check endpoint - Supabase Edge Function
        static var health: String {
            return "\(apiBaseURL)/health"
        }

        /// Viewed cities endpoint - Supabase Edge Function
        static var viewedCities: String {
            return "\(apiBaseURL)/user/viewed-cities"
        }

        /// Record city view endpoint - Supabase Edge Function
        static func recordCityView(cityId: String) -> String {
            return "\(apiBaseURL)/user/viewed-cities/\(cityId)"
        }

        /// Delete user account endpoint - Supabase Edge Function
        static var deleteAccount: String {
            return "\(apiBaseURL)/user/account"
        }

        /// Apple auth code exchange endpoint - Supabase Edge Function
        /// Sends Apple authorization code to backend for refresh token storage (TN3194)
        static var appleAuthCode: String {
            return "\(apiBaseURL)/user/apple-auth-code"
        }

        /// Group flows endpoint - Supabase Edge Function
        static var groupFlows: String {
            return "\(apiBaseURL)/group-flows"
        }

        /// City discovery endpoint - Supabase Edge Function
        /// Discovers and creates new cities on-demand using AI validation
        static var cityDiscover: String {
            return "\(apiBaseURL)/cities-discover"
        }

        /// Bolt pipeline endpoint — legacy synchronous Supabase function (v2)
        /// Kept for one-flag rollback. Used when Config.useAsyncBoltPipeline = false.
        static var boltPipeline: String {
            return "\(apiBaseURL)/bolt-pipeline-v2"
        }

        /// Async bolt pipeline trigger (v3) — returns a jobId in <500ms
        /// Used when Config.useAsyncBoltPipeline = true.
        static var boltPipelineTrigger: String {
            return "\(apiBaseURL)/bolt-pipeline-v3"
        }

        /// Status polling endpoint for the async pipeline
        static var boltPipelineStatus: String {
            return "\(apiBaseURL)/bolt-pipeline-status"
        }
    }

    /// Feature flag — toggle between the legacy synchronous bolt pipeline (v2)
    /// and the new async one (v3 trigger + Railway worker + polling). Set to
    /// false for instant rollback to the proven path.
    /// See: scaling/railway-async-architecture.md
    static let useAsyncBoltPipeline: Bool = true

    // MARK: - App Configuration

    /// App Bundle ID
    static let bundleIdentifier = "com.litplanz.app"

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

    /// Enable offline mode fallback to CacheService (local cached data)
    /// When enabled, the app will use locally cached API responses when offline
    static let enableOfflineMode = true

    /// Enable debug logging
    static var enableDebugLogging: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    /// Enable StoreKit testing mode (bypasses real payments)
    /// Set to false for production - only enable for local development testing
    static let enableStoreKitTesting = false

    /// Test user emails that should automatically get Pro access
    /// Note: Only works when enableStoreKitTesting = true
    static let testProUserEmails: [String] = [
        "davidwoguya@gmail.com",
        "iamcallanhughes@gmail.com",
        "demo@litplanz.com"
    ]

    // MARK: - Timeouts

    /// API request timeout in seconds
    /// Set to 180s because the bolt pipeline runs multiple GPT calls + Google Places lookups
    /// and routinely takes 60–120s end-to-end. Shorter timeout would cut off legitimate runs.
    static let apiTimeout: TimeInterval = 180

    /// Session refresh interval in seconds
    static let sessionRefreshInterval: TimeInterval = 3600 // 1 hour

    // MARK: - Keychain Keys

    enum KeychainKeys {
        static let accessToken = "com.litplanz.accessToken"
        static let refreshToken = "com.litplanz.refreshToken"
        static let userId = "com.litplanz.userId"
    }

    // MARK: - UserDefaults Keys

    enum UserDefaultsKeys {
        static let isOnboarded = "isOnboarded"
        static let lastSyncTimestamp = "lastSyncTimestamp"
        static let cachedUserId = "cachedUserId"
        static let guestMode = "guestMode"
    }
}
