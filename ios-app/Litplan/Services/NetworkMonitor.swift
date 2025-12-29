//
//  NetworkMonitor.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 17 - Network reachability monitoring service
//

import Foundation
import Network
import Combine

/// Monitors network connectivity and publishes connection status changes
@MainActor
class NetworkMonitor: ObservableObject {

    // MARK: - Singleton

    static let shared = NetworkMonitor()

    // MARK: - Published Properties

    /// Current network connection status
    @Published var isConnected: Bool = true

    /// Whether we were previously connected (for detecting transitions)
    @Published var wasConnected: Bool = true

    /// Show offline banner
    @Published var showOfflineBanner: Bool = false

    // MARK: - Private Properties

    private let monitor: NWPathMonitor
    private let queue = DispatchQueue(label: "com.litplan.networkmonitor")

    /// Failed requests to retry when connection is restored
    private var pendingRetries: [() -> Void] = []

    // MARK: - Initialization

    private init() {
        monitor = NWPathMonitor()
        // Defer monitoring start to avoid @MainActor initialization issues
        Task { @MainActor in
            self.startMonitoring()
        }
    }

    deinit {
        stopMonitoring()
    }

    // MARK: - Network Monitoring

    /// Start monitoring network status
    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }

            Task { @MainActor in
                let connected = path.status == .satisfied
                let previouslyConnected = self.wasConnected

                // Update connection status
                self.isConnected = connected
                self.wasConnected = connected

                // Handle connection state changes
                if connected && !previouslyConnected {
                    // Connection restored
                    self.handleConnectionRestored()
                } else if !connected && previouslyConnected {
                    // Connection lost
                    self.handleConnectionLost()
                }
            }
        }

        monitor.start(queue: queue)
    }

    /// Stop monitoring network status
    nonisolated func stopMonitoring() {
        monitor.cancel()
    }

    // MARK: - Connection State Handlers

    /// Handle connection lost event
    private func handleConnectionLost() {
        showOfflineBanner = true

        // Log for debugging
        print("[NetworkMonitor] Connection lost")
    }

    /// Handle connection restored event
    private func handleConnectionRestored() {
        showOfflineBanner = false

        // Log for debugging
        print("[NetworkMonitor] Connection restored")

        // Retry pending requests
        retryPendingRequests()
    }

    // MARK: - Retry Management

    /// Add a request to retry when connection is restored
    /// - Parameter retryAction: The closure to execute when connection is restored
    func addPendingRetry(_ retryAction: @escaping () -> Void) {
        pendingRetries.append(retryAction)
    }

    /// Retry all pending requests
    private func retryPendingRequests() {
        guard !pendingRetries.isEmpty else { return }

        print("[NetworkMonitor] Retrying \(pendingRetries.count) pending requests")

        // Execute all pending retries
        for retry in pendingRetries {
            retry()
        }

        // Clear pending retries
        pendingRetries.removeAll()
    }

    /// Clear all pending retries (use when user manually retries)
    func clearPendingRetries() {
        pendingRetries.removeAll()
    }

    // MARK: - Helper Methods

    /// Check if currently connected (synchronous)
    var currentlyConnected: Bool {
        return isConnected
    }

    /// Get current connection type (Wi-Fi, Cellular, etc.)
    var connectionType: NWInterface.InterfaceType? {
        if monitor.currentPath.usesInterfaceType(.wifi) {
            return .wifi
        } else if monitor.currentPath.usesInterfaceType(.cellular) {
            return .cellular
        } else if monitor.currentPath.usesInterfaceType(.wiredEthernet) {
            return .wiredEthernet
        }
        return nil
    }

    /// Check if connection is expensive (cellular)
    var isExpensive: Bool {
        return monitor.currentPath.isExpensive
    }
}
