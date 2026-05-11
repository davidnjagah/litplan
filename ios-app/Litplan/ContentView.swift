//
//  ContentView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Updated for Sprint 6 - Supabase Integration
//  Main tab bar navigation with authentication gate
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var selectedTab = 0
    @State private var showingLaunchScreen = true
    @State private var pendingVibezCity: SearchedCity? = nil

    var body: some View {
        ZStack {
            // Main content based on auth state
            switch authManager.authState {
            case .unknown:
                // Show loading while determining auth state
                LaunchScreenView(onComplete: {})

            case .unauthenticated:
                // Show login view
                LoginView()

            case .authenticated, .guest:
                // Show main app
                mainTabView
            }

            // Launch screen overlay during app initialization
            if showingLaunchScreen {
                LaunchScreenView(onComplete: {})
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .onAppear {
            // Hide launch screen after a brief delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.easeOut(duration: 0.3)) {
                    showingLaunchScreen = false
                }
            }

            // Configure tab bar appearance
            configureTabBarAppearance()
        }
    }

    // MARK: - Main Tab View

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            // Vibez Tab (default landing screen)
            BoltView(pendingCity: $pendingVibezCity)
                .tabItem {
                    Image(systemName: selectedTab == 0 ? "bolt.fill" : "bolt")
                    Text("Vibez")
                }
                .tag(0)

            // Saved / My Plans Tab
            MyPlansView()
                .tabItem {
                    Image(systemName: selectedTab == 1 ? "heart.fill" : "heart")
                    Text("Saved")
                }
                .tag(1)

            // Profile Tab
            ProfileView()
                .tabItem {
                    Image(systemName: selectedTab == 2 ? "person.fill" : "person")
                    Text("Profile")
                }
                .tag(2)
        }
        .accentColor(.accentPrimary)
        .overlay(alignment: .top) {
            if authManager.isGuest {
                guestModeBanner
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToVibezWithCity)) { notification in
            if let city = notification.userInfo?["city"] as? SearchedCity {
                pendingVibezCity = city
            }
            withAnimation {
                selectedTab = 0
            }
        }
    }

    // MARK: - Guest Mode Banner

    private var guestModeBanner: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 16))

            Text("Guest Mode - Sign in for full access")
                .font(.caption)

            Spacer()

            Button(action: {
                authManager.exitGuestMode()
            }) {
                Text("Sign In")
                    .font(.caption)
                    .fontWeight(.semibold)
            }
        }
        .foregroundColor(.textPrimary)
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.accentSecondary.opacity(0.9))
        .ignoresSafeArea(edges: .top)
    }

    // MARK: - Tab Bar Configuration

    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.surfacePrimary)

        // Customize tab bar item colors
        appearance.stackedLayoutAppearance.normal.iconColor = UIColor(Color.textTertiary)
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor(Color.textTertiary)
        ]

        appearance.stackedLayoutAppearance.selected.iconColor = UIColor(Color.accentPrimary)
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor(Color.accentPrimary)
        ]

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

#Preview("Authenticated") {
    ContentView()
        .environmentObject(NetworkMonitor.shared)
        .environmentObject(SubscriptionManager.shared)
        .environmentObject(AuthenticationManager.shared)
        .environmentObject(SupabaseManager.shared)
}

#Preview("Unauthenticated") {
    ContentView()
        .environmentObject(NetworkMonitor.shared)
        .environmentObject(SubscriptionManager.shared)
        .environmentObject(AuthenticationManager.shared)
        .environmentObject(SupabaseManager.shared)
}
