//
//  ContentView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Main tab bar navigation
//

import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Home (Explore) Tab
            HomeView()
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

            // Viewed Cities Tab
            ViewedCitiesView()
                .tabItem {
                    Image(systemName: selectedTab == 2 ? "clock.fill" : "clock")
                    Text("Viewed")
                }
                .tag(2)

            // Profile Tab
            ProfileView()
                .tabItem {
                    Image(systemName: selectedTab == 3 ? "person.fill" : "person")
                    Text("Profile")
                }
                .tag(3)
        }
        .accentColor(.accentPrimary) // Electric Cyan for active tab
        .onAppear {
            // Configure tab bar appearance
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
}

#Preview {
    ContentView()
        .environmentObject(NetworkMonitor.shared)
        .environmentObject(SubscriptionManager.shared)
}
