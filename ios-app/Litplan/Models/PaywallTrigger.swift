//
//  PaywallTrigger.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 3, Day 13 - Paywall trigger types with user-facing messaging
//

import Foundation

enum PaywallTrigger: Equatable {
    case planLimit(cityName: String)      // 11th plan in a city
    case weekendPlan(cityName: String)    // Trying to view weekend plan
    case saveCity(cityName: String)       // Trying to save a city
    case groupFlow(cityName: String)      // Trying to generate a Vibez / view group flow
    case profile                          // Opened from profile subscription settings
    case cityDiscovery                    // Free Vibez limit reached

    var title: String {
        switch self {
        case .planLimit:
            return "Unlock More Plans"
        case .weekendPlan:
            return "Weekend Plans Are Pro-Only"
        case .saveCity:
            return "Save Your Favorite Cities"
        case .groupFlow:
            return "Unlock 7 Vibez/Week"
        case .profile:
            return "Upgrade to LitPlanz Pro"
        case .cityDiscovery:
            return "Unlock 7 Vibez/Week"
        }
    }

    var message: String {
        switch self {
        case .planLimit(let city):
            return "You've viewed 10 plans in \(city). Upgrade to Pro to see up to 50 plans per city."
        case .weekendPlan(let city):
            return "Weekend plans in \(city) are exclusive to Pro members. Upgrade to access premium weekend experiences."
        case .saveCity(let city):
            return "Save \(city) to your favorites for quick access. This feature is available with LitPlanz Pro."
        case .groupFlow(let city):
            return "Upgrade to Pro for 7 Vibez/week in \(city) and every other city — any vibe, any time."
        case .profile:
            return "Get 7 Vibez/week, access all 100+ cities, unlock every vibe theme, and save unlimited plans."
        case .cityDiscovery:
            return "You've used your free Vibez for this week. Upgrade to Pro for 7 generations/week, any city, any time."
        }
    }

    var icon: String {
        switch self {
        case .planLimit:
            return "calendar.badge.exclamationmark"
        case .weekendPlan:
            return "star.fill"
        case .saveCity:
            return "heart.fill"
        case .groupFlow:
            return "bolt.fill"
        case .profile:
            return "crown.fill"
        case .cityDiscovery:
            return "bolt.fill"
        }
    }
}

// MARK: - Identifiable conformance for .sheet(item:) binding
extension PaywallTrigger: Identifiable {
    var id: String {
        switch self {
        case .planLimit(let city):
            return "planLimit_\(city)"
        case .weekendPlan(let city):
            return "weekendPlan_\(city)"
        case .saveCity(let city):
            return "saveCity_\(city)"
        case .groupFlow(let city):
            return "groupFlow_\(city)"
        case .profile:
            return "profile"
        case .cityDiscovery:
            return "cityDiscovery"
        }
    }
}
