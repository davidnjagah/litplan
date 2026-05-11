//
//  GroupFlow.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 8 - Group Flow data model for multi-activity experiences
//

import Foundation
import SwiftUI

struct GroupFlow: Identifiable, Codable {
    let id: String // groupFlowId
    let cityId: String
    let title: String
    let description: String
    let activities: [Activity]
    let totalDuration: Int // in minutes
    let estimatedCost: EstimatedCost
    let difficulty: String // "easy", "moderate", "intense"
    let bestFor: [String] // ["groups", "couples", "solo"]
    let aiTags: [String]
    var isLocked: Bool? = nil // Optional - from API, indicates if premium-locked

    // Day classification fields (optional with defaults for backwards compatibility)
    var isWeekend: Bool? = nil
    var weekday: String? = nil // "Friday", "Saturday", etc.
    var planType: String? = nil // "couples", "friend_groups", etc.

    // Computed property for convenience
    var groupFlowId: String { id }

    // Computed property for display day
    var displayDay: String {
        if let weekday = weekday {
            return weekday
        }
        // Fallback based on isWeekend
        if let weekend = isWeekend {
            return weekend ? "Weekend" : "Weekday"
        }
        return "Any Day"
    }

    // Computed property for day icon
    var dayIcon: String {
        switch displayDay.lowercased() {
        case "friday", "saturday":
            return "moon.stars.fill"
        case "sunday":
            return "sun.max.fill"
        case "weekend":
            return "moon.stars.fill"
        default:
            return "calendar"
        }
    }

    struct Activity: Identifiable, Codable {
        let id: String // activityId
        let venueName: String
        let location: Location
        let startTime: String // "20:00", "22:00", "01:00"
        let duration: Int // in minutes
        let description: String
        let order: Int // 1, 2, 3

        // Computed property for convenience
        var activityId: String { id }

        // CodingKeys MUST be inside the struct for Codable synthesis to work
        // (not in an extension)
        enum CodingKeys: String, CodingKey {
            case id = "activityId"
            case venueName
            case location
            case startTime
            case duration
            case description
            case order
        }

        struct Location: Codable {
            let address: String
            let coordinates: Coordinates
            // Google Places verified fields (optional for backwards compatibility)
            var googlePlaceId: String?
            var googleMapsUrl: String?
            var isVerified: Bool?
            var confidence: String? // "high", "medium", "low", "not_found"

            struct Coordinates: Codable {
                let latitude: Double
                let longitude: Double
            }

            /// Returns a Google Maps URL for navigation
            /// Uses the verified URL if available, otherwise builds a search URL
            var mapsUrl: URL? {
                if let urlString = googleMapsUrl, let url = URL(string: urlString) {
                    return url
                }
                // Fallback to search by address
                let query = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                return URL(string: "https://www.google.com/maps/search/?api=1&query=\(query)")
            }

            /// Whether the address was verified by Google Places
            var wasVerified: Bool {
                isVerified ?? false
            }
        }
    }

    struct EstimatedCost: Codable {
        let min: Int
        let max: Int
        let currency: String
        var includes: String? // Dynamic description of what's included (e.g., "Entry + 2-3 drinks")

        /// Get includes text with fallback for older API responses
        var includesText: String {
            includes ?? "Entry + activities"
        }
    }

    // Custom CodingKeys to handle backend field name mapping
    enum CodingKeys: String, CodingKey {
        case id = "groupFlowId"
        case cityId
        case title
        case description
        case activities
        case totalDuration
        case estimatedCost
        case difficulty
        case bestFor
        case aiTags
        case isLocked
        case isWeekend
        case weekday
        case planType
    }

    // Computed properties for UI convenience
    var formattedDuration: String {
        let hours = totalDuration / 60
        let minutes = totalDuration % 60
        if minutes == 0 {
            return "\(hours)h"
        } else {
            return "\(hours)h \(minutes)m"
        }
    }

    var formattedCost: String {
        let currencySymbol = currencySymbolFor(estimatedCost.currency)
        return "\(currencySymbol)\(estimatedCost.min)-\(estimatedCost.max)"
    }

    /// Convert currency code to symbol
    private func currencySymbolFor(_ code: String) -> String {
        switch code.uppercased() {
        case "USD": return "$"
        case "EUR": return "€"
        case "GBP": return "£"
        case "JPY": return "¥"
        case "KES": return "KSh"
        case "ZAR": return "R"
        case "AUD": return "A$"
        case "CAD": return "C$"
        case "CHF": return "CHF "
        case "CNY": return "¥"
        case "INR": return "₹"
        case "BRL": return "R$"
        case "MXN": return "MX$"
        case "THB": return "฿"
        case "AED": return "د.إ"
        default:
            // Use system locale if available
            let locale = Locale(identifier: "en_US")
            if let symbol = locale.currencySymbol {
                return symbol
            }
            return code + " "
        }
    }

    var difficultyBadgeColorName: String {
        switch difficulty {
        case "easy":
            return "success"
        case "moderate":
            return "warning"
        case "intense":
            return "error"
        default:
            return "textSecondary"
        }
    }

    /// SwiftUI Color for difficulty badge
    var difficultyColor: Color {
        switch difficulty {
        case "easy":
            return .success
        case "moderate":
            return .warning
        case "intense":
            return .error
        default:
            return .textSecondary
        }
    }

    var sortedActivities: [Activity] {
        activities.sorted { $0.order < $1.order }
    }
}

// MARK: - Sample Data
extension GroupFlow {
    static let sampleNYCFlow = GroupFlow(
        id: "nyc-flow-001",
        cityId: "nyc",
        title: "Ultimate NYC Night Out",
        description: "Brooklyn Brewery → Blue Note Jazz Club → Le Bain at The Standard. A moderate 5-hour experience through NYC's best nightlife.",
        activities: [
            Activity(
                id: "nyc-flow-001-activity-1",
                venueName: "Brooklyn Brewery",
                location: Activity.Location(
                    address: "79 N 11th St, Brooklyn, NY 11249",
                    coordinates: Activity.Location.Coordinates(latitude: 40.7219, longitude: -73.9575)
                ),
                startTime: "20:00",
                duration: 90,
                description: "Start your night with craft beers at Brooklyn Brewery. Enjoy the buzzing atmosphere and local brews.",
                order: 1
            ),
            Activity(
                id: "nyc-flow-001-activity-2",
                venueName: "Blue Note Jazz Club",
                location: Activity.Location(
                    address: "131 W 3rd St, New York, NY 10012",
                    coordinates: Activity.Location.Coordinates(latitude: 40.7308, longitude: -74.0008)
                ),
                startTime: "22:00",
                duration: 120,
                description: "Experience world-class live jazz at Blue Note Jazz Club. An intimate setting with legendary performers.",
                order: 2
            ),
            Activity(
                id: "nyc-flow-001-activity-3",
                venueName: "Le Bain at The Standard",
                location: Activity.Location(
                    address: "848 Washington St, New York, NY 10014",
                    coordinates: Activity.Location.Coordinates(latitude: 40.7409, longitude: -74.0076)
                ),
                startTime: "01:00",
                duration: 90,
                description: "End the night dancing at Le Bain, a rooftop nightclub with incredible city views and hot tub.",
                order: 3
            )
        ],
        totalDuration: 300,
        estimatedCost: EstimatedCost(min: 80, max: 120, currency: "USD"),
        difficulty: "moderate",
        bestFor: ["groups", "solo"],
        aiTags: ["Live Music", "Jazz", "Craft Beer", "Nightclub", "Dancing"],
        isLocked: false,
        isWeekend: true,
        weekday: "Saturday",
        planType: "friend_groups"
    )

    static let sampleLAFlow = GroupFlow(
        id: "la-flow-002",
        cityId: "la",
        title: "West Hollywood Vibes",
        description: "Skybar → The Troubadour. An easy 3-hour experience through LA's best nightlife.",
        activities: [
            Activity(
                id: "la-flow-002-activity-1",
                venueName: "Skybar",
                location: Activity.Location(
                    address: "8440 Sunset Blvd, West Hollywood, CA 90069",
                    coordinates: Activity.Location.Coordinates(latitude: 34.0970, longitude: -118.3768)
                ),
                startTime: "20:00",
                duration: 90,
                description: "Sunset cocktails at the iconic Skybar with stunning city views.",
                order: 1
            ),
            Activity(
                id: "la-flow-002-activity-2",
                venueName: "The Troubadour",
                location: Activity.Location(
                    address: "9081 Santa Monica Blvd, West Hollywood, CA 90069",
                    coordinates: Activity.Location.Coordinates(latitude: 34.0904, longitude: -118.3881)
                ),
                startTime: "22:00",
                duration: 120,
                description: "Catch a live show at The Troubadour, LA's legendary music venue.",
                order: 2
            )
        ],
        totalDuration: 210,
        estimatedCost: EstimatedCost(min: 60, max: 90, currency: "USD"),
        difficulty: "easy",
        bestFor: ["groups", "couples"],
        aiTags: ["Rooftop", "Live Music", "Cocktails", "Sunset"],
        isLocked: false,
        isWeekend: true,
        weekday: "Friday",
        planType: "couples"
    )

    /// Sample group flows
    static let sampleGroupFlows: [GroupFlow] = [
        sampleNYCFlow,
        sampleLAFlow
    ]
}

// Note: Activity.CodingKeys is now defined inside the Activity struct
// (Swift's Codable synthesizer requires CodingKeys inside the struct, not in an extension)
