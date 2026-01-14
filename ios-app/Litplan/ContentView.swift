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
            // Home (Explore) Tab
            HomeView(onNavigateToSearch: {
                selectedTab = 1
            })
                .tabItem {
                    Image(systemName: selectedTab == 0 ? "house.fill" : "house")
                    Text("Explore")
                }
                .tag(0)

            // Search Tab
            SearchView()
                .tabItem {
                    Image(systemName: selectedTab == 1 ? "magnifyingglass.circle.fill" : "magnifyingglass")
                    Text("Search")
                }
                .tag(1)

            // Bolt Tab (NEW - Center position with 3D card)
            BoltView()
                .tabItem {
                    Image(systemName: selectedTab == 2 ? "bolt.fill" : "bolt")
                    Text("Bolt")
                }
                .tag(2)

            // Saved / My Plans Tab
            MyPlansView()
                .tabItem {
                    Image(systemName: selectedTab == 3 ? "heart.fill" : "heart")
                    Text("Saved")
                }
                .tag(3)

            // Profile Tab
            ProfileView()
                .tabItem {
                    Image(systemName: selectedTab == 4 ? "person.fill" : "person")
                    Text("Profile")
                }
                .tag(4)
        }
        .accentColor(.accentPrimary) // Electric Cyan for active tab
        .overlay(alignment: .top) {
            // Guest mode banner
            if authManager.isGuest {
                guestModeBanner
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
