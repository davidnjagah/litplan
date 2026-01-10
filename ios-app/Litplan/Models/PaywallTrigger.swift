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
    case groupFlow(cityName: String)      // Trying to view group flow itinerary
    case profile                          // Opened from profile subscription settings

    var title: String {
        switch self {
        case .planLimit:
            return "Unlock More Plans"
        case .weekendPlan:
            return "Weekend Plans Are Pro-Only"
        case .saveCity:
            return "Save Your Favorite Cities"
        case .groupFlow:
            return "Unlock Group Experiences"
        case .profile:
            return "Upgrade to Litplan Pro"
        }
    }

    var message: String {
        switch self {
        case .planLimit(let city):
            return "You've viewed 10 plans in \(city). Upgrade to Pro to see up to 50 plans per city."
        case .weekendPlan(let city):
            return "Weekend plans in \(city) are exclusive to Pro members. Upgrade to access premium weekend experiences."
        case .saveCity(let city):
            return "Save \(city) to your favorites for quick access. This feature is available with Litplan Pro."
        case .groupFlow(let city):
            return "Group flow itineraries in \(city) are exclusive to Pro members. Upgrade to unlock curated multi-venue experiences."
        case .profile:
            return "Get full access to all plans, save favorites, and unlock premium nightlife experiences."
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
            return "person.3.fill"
        case .profile:
            return "crown.fill"
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
        }
    }
}
