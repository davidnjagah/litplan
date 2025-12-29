//
//  User.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  User model for profile display
//

import SwiftUI

/// Subscription tier options
enum SubscriptionTier: String, Codable {
    case free = "Free"
    case pro = "Pro"

    var displayName: String {
        return self.rawValue
    }

    var badgeColor: Color {
        switch self {
        case .free:
            return .textTertiary
        case .pro:
            return .accentPrimary
        }
    }

    var badgeIcon: String {
        switch self {
        case .free:
            return "person"
        case .pro:
            return "crown.fill"
        }
    }
}

/// User model
struct User: Identifiable, Codable {
    let id: String
    let name: String
    let email: String
    let subscriptionTier: SubscriptionTier
    let profilePhotoURL: String?
    let joinDate: Date

    init(
        id: String,
        name: String,
        email: String,
        subscriptionTier: SubscriptionTier,
        profilePhotoURL: String? = nil,
        joinDate: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.email = email
        self.subscriptionTier = subscriptionTier
        self.profilePhotoURL = profilePhotoURL
        self.joinDate = joinDate
    }
}

// MARK: - Mock Data
extension User {
    static let mockFree = User(
        id: "1",
        name: "Alex Johnson",
        email: "alex.johnson@email.com",
        subscriptionTier: .free
    )

    static let mockPro = User(
        id: "2",
        name: "Jordan Smith",
        email: "jordan.smith@email.com",
        subscriptionTier: .pro
    )
}

/// Saved city model (simplified for profile display)
struct SavedCity: Identifiable, Codable {
    let id: String
    let cityName: String
    let country: String
    let savedDate: Date

    init(id: String, cityName: String, country: String, savedDate: Date = Date()) {
        self.id = id
        self.cityName = cityName
        self.country = country
        self.savedDate = savedDate
    }
}

// MARK: - Mock Saved Cities
extension SavedCity {
    static let mockSavedCities: [SavedCity] = [
        SavedCity(id: "1", cityName: "New York", country: "United States"),
        SavedCity(id: "2", cityName: "London", country: "United Kingdom"),
        SavedCity(id: "3", cityName: "Tokyo", country: "Japan"),
        SavedCity(id: "4", cityName: "Paris", country: "France"),
        SavedCity(id: "5", cityName: "Dubai", country: "United Arab Emirates")
    ]
}
