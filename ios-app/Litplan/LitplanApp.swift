//
//  LitplanApp.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//

import SwiftUI

@main
struct LitplanApp: App {
    // Initialize shared singletons at app level to ensure proper lifecycle
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var subscriptionManager = SubscriptionManager.shared

    init() {
        // Force synchronous pre-initialization on background thread during app launch
        // This ensures MockDataService.allPlans is ready before any view accesses it
        let initQueue = DispatchQueue.global(qos: .userInitiated)
        initQueue.sync {
            let planCount = MockDataService.shared.allPlans.count
            DispatchQueue.main.async {
                print("[LitplanApp] MockDataService pre-initialized with \(planCount) cities")
            }
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(networkMonitor)
                .environmentObject(subscriptionManager)
        }
    }
}
