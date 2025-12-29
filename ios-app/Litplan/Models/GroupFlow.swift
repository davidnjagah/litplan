//
//  GroupFlow.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/27/25.
//  Sprint 2, Day 8 - Group Flow data model for multi-activity experiences
//

import Foundation

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

    // Computed property for convenience
    var groupFlowId: String { id }

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

        struct Location: Codable {
            let address: String
            let coordinates: Coordinates

            struct Coordinates: Codable {
                let latitude: Double
                let longitude: Double
            }
        }
    }

    struct EstimatedCost: Codable {
        let min: Int
        let max: Int
        let currency: String
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
        "$\(estimatedCost.min)-\(estimatedCost.max)"
    }

    var difficultyBadgeColor: String {
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
        aiTags: ["Live Music", "Jazz", "Craft Beer", "Nightclub", "Dancing"]
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
        aiTags: ["Rooftop", "Live Music", "Cocktails", "Sunset"]
    )
}

// MARK: - Activity CodingKeys
extension GroupFlow.Activity {
    enum CodingKeys: String, CodingKey {
        case id = "activityId"
        case venueName
        case location
        case startTime
        case duration
        case description
        case order
    }
}
