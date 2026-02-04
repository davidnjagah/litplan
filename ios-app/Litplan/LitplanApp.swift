//
//  LitplanApp.swift
//  Litplan
//
//  App Name: LitPlanz - Discover your perfect night out
//  Note: The user-facing app name is "LitPlanz" (capital L and P)
//
//  Created by UI Designer Agent on 12/26/25.
//  Updated for Sprint 6 - Supabase Integration
//  Updated for Sprint 8 - Google Sign In OAuth Support
//  Updated for Sprint Email Flows - Deep Link Handling
//  Updated for Onboarding Flow
//

import SwiftUI

@main
struct LitplanApp: App {
    // Initialize shared singletons at app level to ensure proper lifecycle
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var deepLinkHandler = DeepLinkHandler.shared

    // Splash screen state
    @State private var showSplash = true

    // Onboarding state - persisted to UserDefaults
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showOnboarding = false

    init() {
        // Log environment info synchronously (safe)
        if Config.enableDebugLogging {
            print("[LitPlanz] Environment: \(Config.environment)")
            print("[LitPlanz] API Base URL: \(Config.apiBaseURL)")
            print("[LitPlanz] App Version: \(Config.appVersion) (\(Config.buildNumber))")
        }
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                ContentView()
                    .environmentObject(networkMonitor)
                    .environmentObject(subscriptionManager)
                    .environmentObject(authManager)
                    .environmentObject(supabaseManager)

                // Splash screen overlay
                if showSplash {
                    SplashScreenView()
                        .transition(.opacity)
                        .zIndex(1)
                }
            }
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

                // Dismiss splash screen after animations complete
                try? await Task.sleep(nanoseconds: 2_500_000_000) // 2.5 seconds
                withAnimation(.easeOut(duration: 0.5)) {
                    showSplash = false
                }

                // Show onboarding if not completed
                if !hasCompletedOnboarding {
                    try? await Task.sleep(nanoseconds: 300_000_000) // 0.3 seconds delay
                    showOnboarding = true
                }
            }
            .onOpenURL { url in
                // Handle all deep links through centralized handler
                handleDeepLink(url: url)
            }
            .fullScreenCover(isPresented: $deepLinkHandler.showAuthFlow) {
                if let deepLink = deepLinkHandler.activeDeepLink {
                    AuthFlowContainerView(deepLinkType: deepLink)
                        .environmentObject(authManager)
                }
            }
            .fullScreenCover(isPresented: $showOnboarding) {
                OnboardingView(hasCompletedOnboarding: $hasCompletedOnboarding)
            }
            .onChange(of: hasCompletedOnboarding) { _, completed in
                if completed {
                    showOnboarding = false
                }
            }
        }
    }

    // MARK: - Deep Link Handler

    /// Handle all incoming deep links
    private func handleDeepLink(url: URL) {
        // Check if this is our URL scheme
        guard url.scheme == "com.litplanz.app" else {
            if Config.enableDebugLogging {
                print("[LitPlanz] Ignoring URL with unknown scheme: \(url)")
            }
            return
        }

        if Config.enableDebugLogging {
            print("[LitPlanz] Received deep link: \(url)")
        }

        // Use the centralized deep link handler
        deepLinkHandler.handleURL(url)
    }
}
