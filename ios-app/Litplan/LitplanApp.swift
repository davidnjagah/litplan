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
//  Updated for Push Notifications - City Discovery Feature
//

import SwiftUI
import UIKit

@main
struct LitplanApp: App {
    // AppDelegate for APNs registration
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    // Initialize shared singletons at app level to ensure proper lifecycle
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var deepLinkHandler = DeepLinkHandler.shared
    @StateObject private var pushNotificationManager = PushNotificationManager.shared
    @ObservedObject private var appUpdateManager = AppUpdateManager.shared

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

                // Register for push notifications (non-blocking)
                // Will prompt user if not already determined
                await pushNotificationManager.checkPermissionStatus()
                if pushNotificationManager.notificationPermissionStatus == .authorized {
                    // Re-send token to backend in case it changed
                    await pushNotificationManager.resendTokenAfterLogin()
                }

                // Check for an available app update (once per launch — foreground
                // returns won't re-fire this).
                await appUpdateManager.checkOnLaunch()

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
            .sheet(item: $appUpdateManager.pendingPrompt) { prompt in
                UpdateAvailableView(manager: appUpdateManager, prompt: prompt)
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

// MARK: - App Update Manager + View
//
// Soft-update prompt driven by the backend `/health` config (table: AppVersionConfig).
// • Fires ONCE per launch (in-memory `didCheckThisLaunch`) — foreground returns
//   don't re-fire it. A full app restart re-checks.
// • Per-version snooze: "Remind me later" hides the prompt for 3 days.
// • Nag cap: after 3 shows of the same target version, never shown again for
//   that version. A new `latestAppVersion` resets the counter.
// • Hard-block path: when current < minimumAppVersion (or backend marks the
//   release `criticalUpdate: true`), the sheet becomes non-dismissible.
// • "Update Now" opens `itms-apps://` for direct App Store handoff.

@MainActor
final class AppUpdateManager: ObservableObject {
    static let shared = AppUpdateManager()

    /// Drives the sheet shown by LitplanApp. Identifiable so `.sheet(item:)` works.
    @Published var pendingPrompt: PendingPrompt?

    /// Once-per-process gate — survives foreground returns, reset only on app restart.
    private static var didCheckThisLaunch = false

    // UserDefaults keys for per-version tracking
    private let targetVersionKey = "update_prompt_target_version"
    private let showCountKey     = "update_prompt_show_count"
    private let remindAfterKey   = "update_prompt_remind_after"

    private let maxShowsBeforeDismiss = 3
    private let snoozeDays = 3
    /// LitPlanz App Store numeric ID (see /docs and the App Store URL).
    private let appStoreId = "6758998992"

    struct PendingPrompt: Identifiable {
        let id = UUID()
        let latestVersion: String
        let currentVersion: String
        let releaseNotes: String?
        /// When true the sheet is non-dismissible (only "Update Now" is shown).
        let isCritical: Bool
    }

    private init() {}

    /// Called once on app launch. Idempotent within a process lifecycle.
    func checkOnLaunch() async {
        guard !Self.didCheckThisLaunch else { return }
        Self.didCheckThisLaunch = true

        do {
            let config = try await APIService.shared.fetchAppConfig()
            guard let latest = config.latestAppVersion, !latest.isEmpty else { return }
            let minimum = config.minimumAppVersion ?? "0"
            let current = Config.appVersion
            let critical = config.criticalUpdate ?? false
            let releaseNotes = config.releaseNotes

            // Hard block: below the minimum supported version.
            if isOlder(current, than: minimum) {
                pendingPrompt = PendingPrompt(latestVersion: latest, currentVersion: current,
                                              releaseNotes: releaseNotes, isCritical: true)
                return
            }

            // On or beyond the latest available → nothing to prompt; clean stored state.
            if !isOlder(current, than: latest) {
                clearStoredState()
                return
            }

            // Soft path: apply nag-cap + snooze gates.
            let target = UserDefaults.standard.string(forKey: targetVersionKey)
            if target != latest {
                // New target version → reset count + snooze
                UserDefaults.standard.set(latest, forKey: targetVersionKey)
                UserDefaults.standard.set(0, forKey: showCountKey)
                UserDefaults.standard.removeObject(forKey: remindAfterKey)
            }

            let shows = UserDefaults.standard.integer(forKey: showCountKey)
            if shows >= maxShowsBeforeDismiss { return } // user has been nagged enough

            if let remindAfter = UserDefaults.standard.object(forKey: remindAfterKey) as? Date,
               remindAfter > Date() {
                return // still snoozed
            }

            // Show it. Count this impression so the cap eventually fires.
            UserDefaults.standard.set(shows + 1, forKey: showCountKey)
            pendingPrompt = PendingPrompt(latestVersion: latest, currentVersion: current,
                                          releaseNotes: releaseNotes, isCritical: critical)
        } catch {
            print("[AppUpdateManager] config fetch failed — skipping prompt: \(error)")
        }
    }

    // MARK: User actions

    func dismissForNow() {
        let when = Calendar.current.date(byAdding: .day, value: snoozeDays, to: Date())
            ?? Date().addingTimeInterval(TimeInterval(snoozeDays * 86_400))
        UserDefaults.standard.set(when, forKey: remindAfterKey)
        pendingPrompt = nil
    }

    func openAppStore() {
        // itms-apps:// opens the App Store app directly (no Safari handoff).
        if let url = URL(string: "itms-apps://itunes.apple.com/app/id\(appStoreId)"),
           UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        } else if let webURL = URL(string: "https://apps.apple.com/app/id\(appStoreId)") {
            UIApplication.shared.open(webURL)
        }
        pendingPrompt = nil
    }

    // MARK: Internals

    private func clearStoredState() {
        UserDefaults.standard.removeObject(forKey: targetVersionKey)
        UserDefaults.standard.removeObject(forKey: showCountKey)
        UserDefaults.standard.removeObject(forKey: remindAfterKey)
    }

    /// Compare dotted version strings (missing components → 0). True iff `a < b`.
    private func isOlder(_ a: String, than b: String) -> Bool {
        let ap = a.split(separator: ".").map { Int($0) ?? 0 }
        let bp = b.split(separator: ".").map { Int($0) ?? 0 }
        let n = max(ap.count, bp.count)
        for i in 0..<n {
            let l = i < ap.count ? ap[i] : 0
            let r = i < bp.count ? bp[i] : 0
            if l < r { return true }
            if l > r { return false }
        }
        return false
    }
}

// MARK: - Update Available View

struct UpdateAvailableView: View {
    @ObservedObject var manager: AppUpdateManager
    let prompt: AppUpdateManager.PendingPrompt

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.accentPrimary.opacity(0.18))
                    .frame(width: 88, height: 88)
                Image(systemName: "arrow.down.app.fill")
                    .font(.system(size: 40, weight: .semibold))
                    .foregroundColor(.accentPrimary)
            }
            .padding(.top, Spacing.xl)

            VStack(spacing: Spacing.sm) {
                Text("LitPlanz \(prompt.latestVersion) is available")
                    .font(.title2.weight(.bold))
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.md)

                Text(prompt.isCritical
                     ? "This update is required to keep using LitPlanz."
                     : "Update for the latest features and fixes.")
                    .font(.callout)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }

            if let notes = prompt.releaseNotes, !notes.isEmpty {
                ScrollView {
                    Text(notes)
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(Spacing.md)
                }
                .background(Color.surfaceSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .frame(maxHeight: 180)
                .padding(.horizontal, Spacing.md)
            }

            Spacer(minLength: 0)

            VStack(spacing: Spacing.sm) {
                Button(action: { manager.openAppStore() }) {
                    Text("Update Now")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.md)
                        .background(Color.accentPrimary)
                        .clipShape(Capsule())
                }
                .accessibilityLabel("Update LitPlanz now in the App Store")

                if !prompt.isCritical {
                    Button(action: { manager.dismissForNow() }) {
                        Text("Remind me later")
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.sm)
                    }
                    .accessibilityLabel("Remind me in three days")
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.xl)
        }
        .background(Color.appBackground.ignoresSafeArea())
        // Critical updates can't be swiped to dismiss either.
        .interactiveDismissDisabled(prompt.isCritical)
    }
}
