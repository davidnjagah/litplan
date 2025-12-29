//
//  Plan.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Plan data model
//

import Foundation

struct Plan: Identifiable, Codable {
    let id: String
    let title: String
    let venueName: String
    let category: String
    let images: [String]
    let location: Location
    let schedule: Schedule
    let pricing: Pricing
    let aiTags: [String]
    let flags: PlanFlags

    // Computed property for convenience
    var planId: String { id }

    struct Location: Codable {
        let address: String
        let neighborhood: String
        let coordinates: Coordinates

        struct Coordinates: Codable {
            let latitude: Double
            let longitude: Double
        }
    }

    struct Schedule: Codable {
        let date: String // ISO 8601 format
        let startTime: String
        let endTime: String
        let dayOfWeek: String
        let isWeekend: Bool
    }

    struct Pricing: Codable {
        let entryFee: Double
        let currency: String
        let priceRange: String // e.g., "$$", "$$$"
    }

    struct PlanFlags: Codable {
        let isWeekendPlan: Bool
        let requiresReservation: Bool
        let ageRestriction: Int?
        let rank: Int? // Top 1, Top 2, etc.
    }
}

// MARK: - Sample Data
extension Plan {
    static let sampleBlueNote = Plan(
        id: "nyc-plan-001",
        title: "Live Jazz at Blue Note",
        venueName: "Blue Note Jazz Club",
        category: "Live Music",
        images: [
            "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae",
            "https://images.unsplash.com/photo-1511192336575-5a79af67a629"
        ],
        location: Location(
            address: "131 W 3rd St, New York, NY 10012",
            neighborhood: "Greenwich Village",
            coordinates: Location.Coordinates(latitude: 40.7308, longitude: -74.0008)
        ),
        schedule: Schedule(
            date: "2025-12-28T21:00:00Z",
            startTime: "21:00",
            endTime: "23:30",
            dayOfWeek: "Saturday",
            isWeekend: true
        ),
        pricing: Pricing(
            entryFee: 35.0,
            currency: "USD",
            priceRange: "$$$"
        ),
        aiTags: ["Live Music", "Jazz", "Intimate Setting", "Classic Venue"],
        flags: PlanFlags(
            isWeekendPlan: true,
            requiresReservation: true,
            ageRestriction: 21,
            rank: 1
        )
    )

    static let sampleTheRoof = Plan(
        id: "nyc-plan-002",
        title: "Rooftop Cocktails at Sunset",
        venueName: "The Roof at PUBLIC",
        category: "Rooftop Bar",
        images: [
            "https://images.unsplash.com/photo-1514933651103-005eec06c04b",
            "https://images.unsplash.com/photo-1470337458703-46ad1756a187"
        ],
        location: Location(
            address: "215 Chrystie St, New York, NY 10002",
            neighborhood: "Lower East Side",
            coordinates: Location.Coordinates(latitude: 40.7231, longitude: -73.9911)
        ),
        schedule: Schedule(
            date: "2025-12-27T18:00:00Z",
            startTime: "18:00",
            endTime: "23:00",
            dayOfWeek: "Friday",
            isWeekend: false
        ),
        pricing: Pricing(
            entryFee: 0.0,
            currency: "USD",
            priceRange: "$$$$"
        ),
        aiTags: ["Rooftop", "Cocktails", "Sunset Views", "Upscale"],
        flags: PlanFlags(
            isWeekendPlan: false,
            requiresReservation: false,
            ageRestriction: 21,
            rank: 2
        )
    )

    static let sampleLeBain = Plan(
        id: "nyc-plan-003",
        title: "Dance the Night Away",
        venueName: "Le Bain at The Standard",
        category: "Nightclub",
        images: [
            "https://images.unsplash.com/photo-1566737236500-c8ac43014a67",
            "https://images.unsplash.com/photo-1571266028243-d220c6b2f08b"
        ],
        location: Location(
            address: "848 Washington St, New York, NY 10014",
            neighborhood: "Meatpacking District",
            coordinates: Location.Coordinates(latitude: 40.7409, longitude: -74.0076)
        ),
        schedule: Schedule(
            date: "2025-12-28T22:00:00Z",
            startTime: "22:00",
            endTime: "04:00",
            dayOfWeek: "Saturday",
            isWeekend: true
        ),
        pricing: Pricing(
            entryFee: 30.0,
            currency: "USD",
            priceRange: "$$$"
        ),
        aiTags: ["Nightclub", "Dancing", "DJ", "Rooftop Pool"],
        flags: PlanFlags(
            isWeekendPlan: true,
            requiresReservation: false,
            ageRestriction: 21,
            rank: 3
        )
    )
}
