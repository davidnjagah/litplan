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

        // Live count from API (optional, overrides planCount when available)
        let totalPlansThisWeek: Int?

        // MARK: - Hardcoded Plan Count (Performance Optimization)
        // Hardcoded to 50 to avoid database queries on every screen load
        // This significantly improves initial app load time
        var displayPlanCount: Int {
            50 // Hardcoded for performance - removes API dependency
        }

        // MARK: - Original Dynamic Implementation (Preserved for Future Use)
        // Uncomment below and comment out the hardcoded version above to restore dynamic counts
        // var displayPlanCount: Int {
        //     totalPlansThisWeek ?? planCount
        // }

        // Custom decoder to handle optional field
        enum CodingKeys: String, CodingKey {
            case timezone, currency, featured, planCount, totalPlansThisWeek
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            timezone = try container.decode(String.self, forKey: .timezone)
            currency = try container.decode(String.self, forKey: .currency)
            featured = try container.decode(Bool.self, forKey: .featured)
            planCount = try container.decode(Int.self, forKey: .planCount)
            totalPlansThisWeek = try container.decodeIfPresent(Int.self, forKey: .totalPlansThisWeek)
        }

        init(timezone: String, currency: String, featured: Bool, planCount: Int, totalPlansThisWeek: Int? = nil) {
            self.timezone = timezone
            self.currency = currency
            self.featured = featured
            self.planCount = planCount
            self.totalPlansThisWeek = totalPlansThisWeek
        }
    }
}

// MARK: - Sample Data
extension City {
    static let sampleNYC = City(
        id: "cmjrcg43r0000wbxrw025frc8",
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
        id: "cmjrcg4na0003wbxrwuohp2pc",
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
        id: "cmjrcg4wy0005wbxrx6vgdmf0",
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

    static let sampleParis = City(
        id: "cmjrcg4s50004wbxrpzps2dkw",
        name: "Paris",
        country: "France",
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34",
            thumbnailUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
            countryFlag: "🇫🇷"
        ),
        coordinates: Coordinates(latitude: 48.8566, longitude: 2.3522),
        metadata: CityMetadata(
            timezone: "Europe/Paris",
            currency: "EUR",
            featured: true,
            planCount: 50
        )
    )

    static let sampleMiami = City(
        id: "cmjrcg4ib0002wbxr7jc51zza",
        name: "Miami",
        country: "United States",
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2",
            thumbnailUrl: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=400",
            countryFlag: "🇺🇸"
        ),
        coordinates: Coordinates(latitude: 25.7617, longitude: -80.1918),
        metadata: CityMetadata(
            timezone: "America/New_York",
            currency: "USD",
            featured: true,
            planCount: 50
        )
    )

    static let sampleBerlin = City(
        id: "cmjrcg51s0006wbxr9pbvocrd",
        name: "Berlin",
        country: "Germany",
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1560969184-10fe8719e047",
            thumbnailUrl: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400",
            countryFlag: "🇩🇪"
        ),
        coordinates: Coordinates(latitude: 52.5200, longitude: 13.4050),
        metadata: CityMetadata(
            timezone: "Europe/Berlin",
            currency: "EUR",
            featured: true,
            planCount: 50
        )
    )

    // MARK: - Hardcoded Trending Cities (for instant display)
    /// These 6 cities are displayed immediately in the Trending section
    /// without waiting for API calls, ensuring fast app load times
    static let trendingCities: [City] = [
        sampleNYC,
        sampleLondon,
        sampleTokyo,
        sampleParis,
        sampleMiami,
        sampleBerlin
    ]
}
