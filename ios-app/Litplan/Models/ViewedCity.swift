//
//  ViewedCity.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 2, Day 9 - ViewedCity data model for recently viewed cities
//

import Foundation

struct ViewedCity: Identifiable, Codable {
    let cityId: String
    let name: String
    let country: String
    let viewedAt: ViewedTimestamp
    let viewCount: Int
    let displayAssets: DisplayAssets

    // Plan count from API - single source of truth for city plan counts
    let planCount: Int?

    // Computed property for ID conformance
    var id: String { cityId }

    struct DisplayAssets: Codable {
        let heroImageUrl: String?
        let thumbnailUrl: String?
        let countryFlag: String

        enum CodingKeys: String, CodingKey {
            case heroImageUrl
            case thumbnailUrl
            case countryFlag
        }
    }

    // Custom timestamp handling for Firestore compatibility
    struct ViewedTimestamp: Codable {
        let seconds: Int64
        let nanoseconds: Int

        var date: Date {
            Date(timeIntervalSince1970: TimeInterval(seconds))
        }

        // Format for display: "2 days ago", "Just now", etc.
        var relativeString: String {
            let now = Date()
            let interval = now.timeIntervalSince(date)

            if interval < 60 {
                return "Just now"
            } else if interval < 3600 {
                let minutes = Int(interval / 60)
                return "\(minutes) minute\(minutes == 1 ? "" : "s") ago"
            } else if interval < 86400 {
                let hours = Int(interval / 3600)
                return "\(hours) hour\(hours == 1 ? "" : "s") ago"
            } else if interval < 604800 {
                let days = Int(interval / 86400)
                return "\(days) day\(days == 1 ? "" : "s") ago"
            } else {
                let weeks = Int(interval / 604800)
                return "\(weeks) week\(weeks == 1 ? "" : "s") ago"
            }
        }

        // Short format for display: "2d ago", "5h ago"
        var shortRelativeString: String {
            let now = Date()
            let interval = now.timeIntervalSince(date)

            if interval < 60 {
                return "Now"
            } else if interval < 3600 {
                let minutes = Int(interval / 60)
                return "\(minutes)m ago"
            } else if interval < 86400 {
                let hours = Int(interval / 3600)
                return "\(hours)h ago"
            } else if interval < 604800 {
                let days = Int(interval / 86400)
                return "\(days)d ago"
            } else {
                let weeks = Int(interval / 604800)
                return "\(weeks)w ago"
            }
        }
    }

    enum CodingKeys: String, CodingKey {
        case cityId
        case name
        case country
        case viewedAt
        case viewCount
        case displayAssets
        case planCount
    }
}

// MARK: - Sample Data for Previews
extension ViewedCity {
    static let sampleNYC = ViewedCity(
        cityId: "nyc-001",
        name: "New York",
        country: "United States",
        viewedAt: ViewedTimestamp(
            seconds: Int64(Date().timeIntervalSince1970 - 7200), // 2 hours ago
            nanoseconds: 0
        ),
        viewCount: 3,
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9",
            thumbnailUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400",
            countryFlag: "🇺🇸"
        ),
        planCount: 50
    )

    static let sampleLondon = ViewedCity(
        cityId: "lon-001",
        name: "London",
        country: "United Kingdom",
        viewedAt: ViewedTimestamp(
            seconds: Int64(Date().timeIntervalSince1970 - 172800), // 2 days ago
            nanoseconds: 0
        ),
        viewCount: 1,
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad",
            thumbnailUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400",
            countryFlag: "🇬🇧"
        ),
        planCount: 50
    )

    static let sampleTokyo = ViewedCity(
        cityId: "tyo-001",
        name: "Tokyo",
        country: "Japan",
        viewedAt: ViewedTimestamp(
            seconds: Int64(Date().timeIntervalSince1970 - 604800), // 1 week ago
            nanoseconds: 0
        ),
        viewCount: 5,
        displayAssets: DisplayAssets(
            heroImageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf",
            thumbnailUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
            countryFlag: "🇯🇵"
        ),
        planCount: 50
    )

    static let samples = [sampleNYC, sampleLondon, sampleTokyo]
}
