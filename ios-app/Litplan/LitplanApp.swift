//
//  LitplanApp.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Updated for Sprint 6 - Supabase Integration
//  Updated for Sprint 8 - Google Sign In OAuth Support
//

import SwiftUI

@main
struct LitplanApp: App {
    // Initialize shared singletons at app level to ensure proper lifecycle
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var supabaseManager = SupabaseManager.shared

    init() {
        // Log environment info synchronously (safe)
        if Config.enableDebugLogging {
            print("[LitplanApp] Environment: \(Config.environment)")
            print("[LitplanApp] API Base URL: \(Config.apiBaseURL)")
            print("[LitplanApp] App Version: \(Config.appVersion) (\(Config.buildNumber))")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(networkMonitor)
                .environmentObject(subscriptionManager)
                .environmentObject(authManager)
                .environmentObject(supabaseManager)
                .task {
                    // Pre-load subscription products early for fast paywall loading
                    await subscriptionManager.loadProducts()

                    // Check auth state on app launch
                    await authManager.checkAuthState()

                    // Start listening for auth state changes
                    supabaseManager.listenForAuthChanges()

                    // Preload cities in background AFTER critical UI is ready
                    // This ensures search has cities available without blocking initial load
                    CityPreloadService.shared.preloadCities()
                }
                .onOpenURL { url in
                    // Handle OAuth callback URLs from Google Sign In
                    handleOAuthCallback(url: url)
                }
        }
    }

    // MARK: - OAuth Callback Handler

    /// Handle OAuth callback URLs for Google Sign In
    private func handleOAuthCallback(url: URL) {
        // Check if this is an OAuth callback URL
        guard url.scheme == "com.litplan.app" else {
            if Config.enableDebugLogging {
                print("[LitplanApp] Ignoring non-OAuth URL: \(url)")
            }
            return
        }

        if Config.enableDebugLogging {
            print("[LitplanApp] Received OAuth callback: \(url)")
        }

        // Pass the URL to the authentication manager to handle
        Task {
            await authManager.handleOAuthCallback(url: url)
        }
    }
}
