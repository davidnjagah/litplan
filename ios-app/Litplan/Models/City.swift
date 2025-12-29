//
//  City.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  City data model
//

import Foundation

struct City: Identifiable, Codable {
    let id: String
    let name: String
    let country: String
    let displayAssets: DisplayAssets
    let coordinates: Coordinates
    let metadata: CityMetadata

    // Computed property for convenience
    var cityId: String { id }

    struct DisplayAssets: Codable {
        let heroImageUrl: String
        let thumbnailUrl: String
        let countryFlag: String // Emoji or URL
    }

    struct Coordinates: Codable {
        let latitude: Double
        let longitude: Double
    }

    struct CityMetadata: Codable {
        let timezone: String
        let currency: String
        let featured: Bool
        let planCount: Int
    }
}

// MARK: - Sample Data
extension City {
    static let sampleNYC = City(
        id: "nyc-001",
        name: "New York",
        country: "United States",
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9",
            thumbnailUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400",
            countryFlag: "🇺🇸"
        ),
        coordinates: Coordinates(latitude: 40.7128, longitude: -74.0060),
        metadata: CityMetadata(
            timezone: "America/New_York",
            currency: "USD",
            featured: true,
            planCount: 50
        )
    )

    static let sampleLondon = City(
        id: "lon-001",
        name: "London",
        country: "United Kingdom",
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad",
            thumbnailUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400",
            countryFlag: "🇬🇧"
        ),
        coordinates: Coordinates(latitude: 51.5074, longitude: -0.1278),
        metadata: CityMetadata(
            timezone: "Europe/London",
            currency: "GBP",
            featured: true,
            planCount: 50
        )
    )

    static let sampleTokyo = City(
        id: "tyo-001",
        name: "Tokyo",
        country: "Japan",
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf",
            thumbnailUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
            countryFlag: "🇯🇵"
        ),
        coordinates: Coordinates(latitude: 35.6762, longitude: 139.6503),
        metadata: CityMetadata(
            timezone: "Asia/Tokyo",
            currency: "JPY",
            featured: true,
            planCount: 50
        )
    )
}
