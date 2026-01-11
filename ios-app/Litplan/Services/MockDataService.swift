//
//  MockDataService.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/26/25.
//  Mock data service with 10 cities and 50 real plans per city
//
//  ⚠️ DEBUG-ONLY: This service is ONLY used for SwiftUI previews and testing.
//  For production data, the app uses:
//  - CacheService: Local file-based caching of real API responses
//  - APIService: Fetches live data from Supabase backend
//
//  Do NOT use MockDataService in production code paths.
//

import Foundation

class MockDataService {
    static let shared = MockDataService()

    // Use eager initialization to avoid thread-safety issues with lazy var
    // private(set) allows reading from other files but prevents external modification
    private(set) var allPlans: [String: [Plan]] = [:]

    private init() {
        // Initialize all plans immediately (not lazily) for thread safety
        initializeAllPlans()
    }

    /// Initialize all plans dictionary - called once during init
    private func initializeAllPlans() {
        allPlans = [
            "cmjrcg43r0000wbxrw025frc8": createNYCPlans(),
            "cmjrcg4di0001wbxr2lumn70c": createLAPlans(),
            "cmjrcg4ib0002wbxr7jc51zza": createMiamiPlans(),
            "cmjrcg4na0003wbxrwuohp2pc": createLondonPlans(),
            "cmjrcg4s50004wbxrpzps2dkw": createParisPlans(),
            "cmjrcg4wy0005wbxrx6vgdmf0": createTokyoPlans(),
            "cmjrcg51s0006wbxr9pbvocrd": createBerlinPlans(),
            "cmjrcg56o0007wbxrxvvkvm1u": createBarcelonaPlans(),
            "cmjrcg5bj0008wbxrnivnx05x": createAmsterdamPlans(),
            "cmjrcg5gc0009wbxrlhu4vdqe": createDubaiPlans(),
            "cmjmk146cwb87qncw": createMadridPlans()
        ]
    }

    // MARK: - Cities Data

    let cities: [City] = [
        // New York City
        City(
            id: "cmjrcg43r0000wbxrw025frc8",
            name: "New York",
            country: "United States",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9",
                thumbnailUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400",
                countryFlag: "🇺🇸"
            ),
            coordinates: City.Coordinates(latitude: 40.7128, longitude: -74.0060),
            metadata: City.CityMetadata(
                timezone: "America/New_York",
                currency: "USD",
                featured: true,
                planCount: 50
            )
        ),

        // Los Angeles
        City(
            id: "cmjrcg4di0001wbxr2lumn70c",
            name: "Los Angeles",
            country: "United States",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1534190239940-9ba8944ea261",
                thumbnailUrl: "https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=400",
                countryFlag: "🇺🇸"
            ),
            coordinates: City.Coordinates(latitude: 34.0522, longitude: -118.2437),
            metadata: City.CityMetadata(
                timezone: "America/Los_Angeles",
                currency: "USD",
                featured: true,
                planCount: 50
            )
        ),

        // Miami
        City(
            id: "cmjrcg4ib0002wbxr7jc51zza",
            name: "Miami",
            country: "United States",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3",
                thumbnailUrl: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=400",
                countryFlag: "🇺🇸"
            ),
            coordinates: City.Coordinates(latitude: 25.7617, longitude: -80.1918),
            metadata: City.CityMetadata(
                timezone: "America/New_York",
                currency: "USD",
                featured: true,
                planCount: 50
            )
        ),

        // London
        City(
            id: "cmjrcg4na0003wbxrwuohp2pc",
            name: "London",
            country: "United Kingdom",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad",
                thumbnailUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400",
                countryFlag: "🇬🇧"
            ),
            coordinates: City.Coordinates(latitude: 51.5074, longitude: -0.1278),
            metadata: City.CityMetadata(
                timezone: "Europe/London",
                currency: "GBP",
                featured: true,
                planCount: 50
            )
        ),

        // Paris
        City(
            id: "cmjrcg4s50004wbxrpzps2dkw",
            name: "Paris",
            country: "France",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34",
                thumbnailUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
                countryFlag: "🇫🇷"
            ),
            coordinates: City.Coordinates(latitude: 48.8566, longitude: 2.3522),
            metadata: City.CityMetadata(
                timezone: "Europe/Paris",
                currency: "EUR",
                featured: true,
                planCount: 50
            )
        ),

        // Tokyo
        City(
            id: "cmjrcg4wy0005wbxrx6vgdmf0",
            name: "Tokyo",
            country: "Japan",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf",
                thumbnailUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
                countryFlag: "🇯🇵"
            ),
            coordinates: City.Coordinates(latitude: 35.6762, longitude: 139.6503),
            metadata: City.CityMetadata(
                timezone: "Asia/Tokyo",
                currency: "JPY",
                featured: true,
                planCount: 50
            )
        ),

        // Berlin
        City(
            id: "cmjrcg51s0006wbxr9pbvocrd",
            name: "Berlin",
            country: "Germany",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1560969184-10fe8719e047",
                thumbnailUrl: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400",
                countryFlag: "🇩🇪"
            ),
            coordinates: City.Coordinates(latitude: 52.5200, longitude: 13.4050),
            metadata: City.CityMetadata(
                timezone: "Europe/Berlin",
                currency: "EUR",
                featured: true,
                planCount: 50
            )
        ),

        // Barcelona
        City(
            id: "cmjrcg56o0007wbxrxvvkvm1u",
            name: "Barcelona",
            country: "Spain",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efded",
                thumbnailUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400",
                countryFlag: "🇪🇸"
            ),
            coordinates: City.Coordinates(latitude: 41.3851, longitude: 2.1734),
            metadata: City.CityMetadata(
                timezone: "Europe/Madrid",
                currency: "EUR",
                featured: true,
                planCount: 50
            )
        ),

        // Madrid
        City(
            id: "cmjmk146cwb87qncw",
            name: "Madrid",
            country: "Spain",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4",
                thumbnailUrl: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400",
                countryFlag: "🇪🇸"
            ),
            coordinates: City.Coordinates(latitude: 40.4168, longitude: -3.7038),
            metadata: City.CityMetadata(
                timezone: "Europe/Madrid",
                currency: "EUR",
                featured: true,
                planCount: 50
            )
        ),

        // Amsterdam
        City(
            id: "cmjrcg5bj0008wbxrnivnx05x",
            name: "Amsterdam",
            country: "Netherlands",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017",
                thumbnailUrl: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400",
                countryFlag: "🇳🇱"
            ),
            coordinates: City.Coordinates(latitude: 52.3676, longitude: 4.9041),
            metadata: City.CityMetadata(
                timezone: "Europe/Amsterdam",
                currency: "EUR",
                featured: true,
                planCount: 50
            )
        ),

        // Dubai
        City(
            id: "cmjrcg5gc0009wbxrlhu4vdqe",
            name: "Dubai",
            country: "United Arab Emirates",
            displayAssets: City.DisplayAssets(
                heroImageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",
                thumbnailUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
                countryFlag: "🇦🇪"
            ),
            coordinates: City.Coordinates(latitude: 25.2048, longitude: 55.2708),
            metadata: City.CityMetadata(
                timezone: "Asia/Dubai",
                currency: "AED",
                featured: true,
                planCount: 50
            )
        )
    ]

    // MARK: - Helper Methods

    func getCity(by id: String) -> City? {
        return cities.first { $0.id == id }
    }

    func getPlans(for cityId: String) -> [Plan] {
        return allPlans[cityId] ?? []
    }

    func getFeaturedCities() -> [City] {
        return cities.filter { $0.metadata.featured }
    }

    // MARK: - Group Flows
    func getGroupFlows(for cityId: String) -> [GroupFlow] {
        // For now, return 2-3 sample group flows per city
        // This will be replaced with real API data in future sprints
        switch cityId {
        case "cmjrcg43r0000wbxrw025frc8":  // NYC
            return createNYCGroupFlows()
        case "cmjrcg4di0001wbxr2lumn70c":  // LA
            return createLAGroupFlows()
        case "cmjmk146cwb87qncw":  // Madrid
            return createMadridGroupFlows()
        default:
            return [] // Other cities will have group flows added later
        }
    }

    private func createNYCGroupFlows() -> [GroupFlow] {
        [
            GroupFlow(
                id: "nyc-flow-001",
                cityId: "cmjrcg43r0000wbxrw025frc8",
                title: "Ultimate NYC Night Out",
                description: "Brooklyn Brewery → Blue Note Jazz Club → Le Bain at The Standard. A moderate 5-hour experience through NYC's best nightlife.",
                activities: [
                    GroupFlow.Activity(
                        id: "nyc-flow-001-activity-1",
                        venueName: "Brooklyn Brewery",
                        location: GroupFlow.Activity.Location(
                            address: "79 N 11th St, Brooklyn, NY 11249",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.7219, longitude: -73.9575)
                        ),
                        startTime: "20:00",
                        duration: 90,
                        description: "Start your night with craft beers at Brooklyn Brewery. Enjoy the buzzing atmosphere and local brews.",
                        order: 1
                    ),
                    GroupFlow.Activity(
                        id: "nyc-flow-001-activity-2",
                        venueName: "Blue Note Jazz Club",
                        location: GroupFlow.Activity.Location(
                            address: "131 W 3rd St, New York, NY 10012",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.7308, longitude: -74.0008)
                        ),
                        startTime: "22:00",
                        duration: 120,
                        description: "Experience world-class live jazz at Blue Note Jazz Club. An intimate setting with legendary performers.",
                        order: 2
                    ),
                    GroupFlow.Activity(
                        id: "nyc-flow-001-activity-3",
                        venueName: "Le Bain at The Standard",
                        location: GroupFlow.Activity.Location(
                            address: "848 Washington St, New York, NY 10014",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.7409, longitude: -74.0076)
                        ),
                        startTime: "01:00",
                        duration: 90,
                        description: "End the night dancing at Le Bain, a rooftop nightclub with incredible city views and hot tub.",
                        order: 3
                    )
                ],
                totalDuration: 300,
                estimatedCost: GroupFlow.EstimatedCost(min: 80, max: 120, currency: "USD"),
                difficulty: "moderate",
                bestFor: ["groups", "solo"],
                aiTags: ["Live Music", "Jazz", "Craft Beer", "Nightclub", "Dancing"],
                isLocked: nil
            ),
            GroupFlow(
                id: "nyc-flow-002",
                cityId: "cmjrcg43r0000wbxrw025frc8",
                title: "Comedy & Cocktails",
                description: "The Dead Rabbit → Comedy Cellar. An easy 3.5-hour experience through NYC's best nightlife.",
                activities: [
                    GroupFlow.Activity(
                        id: "nyc-flow-002-activity-1",
                        venueName: "The Dead Rabbit",
                        location: GroupFlow.Activity.Location(
                            address: "30 Water St, New York, NY 10004",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.7033, longitude: -74.0113)
                        ),
                        startTime: "20:00",
                        duration: 90,
                        description: "Pre-show cocktails at the award-winning Dead Rabbit. Try their famous Irish Coffee.",
                        order: 1
                    ),
                    GroupFlow.Activity(
                        id: "nyc-flow-002-activity-2",
                        venueName: "Comedy Cellar",
                        location: GroupFlow.Activity.Location(
                            address: "117 MacDougal St, New York, NY 10012",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.7298, longitude: -74.0006)
                        ),
                        startTime: "22:00",
                        duration: 120,
                        description: "Laugh the night away at Comedy Cellar, NYC's legendary comedy club featuring top comedians.",
                        order: 2
                    )
                ],
                totalDuration: 210,
                estimatedCost: GroupFlow.EstimatedCost(min: 60, max: 90, currency: "USD"),
                difficulty: "easy",
                bestFor: ["groups", "couples"],
                aiTags: ["Comedy", "Cocktails", "Upscale", "Classic Venue"],
                isLocked: nil
            )
        ]
    }

    private func createLAGroupFlows() -> [GroupFlow] {
        [
            GroupFlow(
                id: "la-flow-001",
                cityId: "cmjrcg4di0001wbxr2lumn70c",
                title: "West Hollywood Vibes",
                description: "Skybar → The Troubadour. An easy 3-hour experience through LA's best nightlife.",
                activities: [
                    GroupFlow.Activity(
                        id: "la-flow-001-activity-1",
                        venueName: "Skybar",
                        location: GroupFlow.Activity.Location(
                            address: "8440 Sunset Blvd, West Hollywood, CA 90069",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 34.0970, longitude: -118.3768)
                        ),
                        startTime: "20:00",
                        duration: 90,
                        description: "Sunset cocktails at the iconic Skybar with stunning city views.",
                        order: 1
                    ),
                    GroupFlow.Activity(
                        id: "la-flow-001-activity-2",
                        venueName: "The Troubadour",
                        location: GroupFlow.Activity.Location(
                            address: "9081 Santa Monica Blvd, West Hollywood, CA 90069",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 34.0904, longitude: -118.3881)
                        ),
                        startTime: "22:00",
                        duration: 120,
                        description: "Catch a live show at The Troubadour, LA's legendary music venue.",
                        order: 2
                    )
                ],
                totalDuration: 210,
                estimatedCost: GroupFlow.EstimatedCost(min: 60, max: 90, currency: "USD"),
                difficulty: "easy",
                bestFor: ["groups", "couples"],
                aiTags: ["Rooftop", "Live Music", "Cocktails", "Sunset"],
                isLocked: nil
            )
        ]
    }

    private func createMadridGroupFlows() -> [GroupFlow] {
        [
            GroupFlow(
                id: "mad-flow-001",
                cityId: "cmjmk146cwb87qncw",
                title: "Authentic Madrid Night",
                description: "La Latina Tapas → Corral de la Morería Flamenco → Kapital Nightclub. A challenging 6-hour experience through Madrid's best nightlife.",
                activities: [
                    GroupFlow.Activity(
                        id: "mad-flow-001-activity-1",
                        venueName: "La Latina Tapas Crawl",
                        location: GroupFlow.Activity.Location(
                            address: "Cava Baja, 28005 Madrid",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.4111, longitude: -3.7089)
                        ),
                        startTime: "21:00",
                        duration: 120,
                        description: "Start with a traditional tapas crawl through La Latina's historic streets. Sample jamón ibérico, croquetas, and vermouth.",
                        order: 1
                    ),
                    GroupFlow.Activity(
                        id: "mad-flow-001-activity-2",
                        venueName: "Corral de la Morería",
                        location: GroupFlow.Activity.Location(
                            address: "Calle de la Morería, 17, 28005 Madrid",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.4133, longitude: -3.7114)
                        ),
                        startTime: "23:30",
                        duration: 120,
                        description: "Experience world-class flamenco at Madrid's most prestigious tablao. Passionate dance, soul-stirring music, and Spanish wine.",
                        order: 2
                    ),
                    GroupFlow.Activity(
                        id: "mad-flow-001-activity-3",
                        venueName: "Teatro Kapital",
                        location: GroupFlow.Activity.Location(
                            address: "Calle de Atocha, 125, 28012 Madrid",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.4089, longitude: -3.6953)
                        ),
                        startTime: "02:00",
                        duration: 120,
                        description: "End the night at Kapital, Madrid's legendary 7-floor megaclub. Dance to electronic, hip-hop, and reggaeton until dawn.",
                        order: 3
                    )
                ],
                totalDuration: 360,
                estimatedCost: GroupFlow.EstimatedCost(min: 100, max: 150, currency: "EUR"),
                difficulty: "challenging",
                bestFor: ["groups", "solo"],
                aiTags: ["Flamenco", "Tapas", "Nightclub", "Cultural", "Late Night"],
                isLocked: nil
            ),
            GroupFlow(
                id: "mad-flow-002",
                cityId: "mad-001",
                title: "Rooftop & Culture",
                description: "Círculo de Bellas Artes → Cardamomo Tablao. A moderate 4-hour cultural evening in Madrid.",
                activities: [
                    GroupFlow.Activity(
                        id: "mad-flow-002-activity-1",
                        venueName: "Círculo de Bellas Artes",
                        location: GroupFlow.Activity.Location(
                            address: "Calle de Alcalá, 42, 28014 Madrid",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.4190, longitude: -3.6965)
                        ),
                        startTime: "20:30",
                        duration: 90,
                        description: "Sunset cocktails on the iconic rooftop terrace with 360° views of Madrid's skyline. Watch the city light up as night falls.",
                        order: 1
                    ),
                    GroupFlow.Activity(
                        id: "mad-flow-002-activity-2",
                        venueName: "Cardamomo Tablao",
                        location: GroupFlow.Activity.Location(
                            address: "Calle de Echegaray, 15, 28014 Madrid",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.4154, longitude: -3.7001)
                        ),
                        startTime: "22:30",
                        duration: 120,
                        description: "Intimate flamenco performance in the heart of the Huertas neighborhood. Feel the duende (spirit) of authentic Spanish culture.",
                        order: 2
                    )
                ],
                totalDuration: 240,
                estimatedCost: GroupFlow.EstimatedCost(min: 70, max: 100, currency: "EUR"),
                difficulty: "moderate",
                bestFor: ["couples", "groups"],
                aiTags: ["Rooftop", "Flamenco", "Cultural", "Sunset", "Traditional"],
                isLocked: nil
            ),
            GroupFlow(
                id: "mad-flow-003",
                cityId: "mad-001",
                title: "Malasaña Alternative Scene",
                description: "Ojalá Beach Bar → Tupperware Club. An easy 4-hour experience through Madrid's hipster neighborhood.",
                activities: [
                    GroupFlow.Activity(
                        id: "mad-flow-003-activity-1",
                        venueName: "Ojalá Beach Bar",
                        location: GroupFlow.Activity.Location(
                            address: "Calle de San Andrés, 1, 28004 Madrid",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.4267, longitude: -3.7046)
                        ),
                        startTime: "21:00",
                        duration: 120,
                        description: "Start at this quirky indoor beach bar with sand floors. Sip creative cocktails in a tropical oasis in the middle of Madrid.",
                        order: 1
                    ),
                    GroupFlow.Activity(
                        id: "mad-flow-003-activity-2",
                        venueName: "Tupperware Club",
                        location: GroupFlow.Activity.Location(
                            address: "Corredera Alta de San Pablo, 26, 28004 Madrid",
                            coordinates: GroupFlow.Activity.Location.Coordinates(latitude: 40.4263, longitude: -3.7033)
                        ),
                        startTime: "23:30",
                        duration: 120,
                        description: "Dance to indie rock, electronic, and alternative music at Malasaña's coolest underground club. Local DJs and eclectic crowd.",
                        order: 2
                    )
                ],
                totalDuration: 240,
                estimatedCost: GroupFlow.EstimatedCost(min: 40, max: 60, currency: "EUR"),
                difficulty: "easy",
                bestFor: ["groups", "solo"],
                aiTags: ["Alternative", "Indie", "Cocktails", "Underground", "Hipster"],
                isLocked: nil
            )
        ]
    }
}

// MARK: - New York City Plans
extension MockDataService {
    private func createNYCPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("Blue Note Jazz Club", "Live Jazz Performance", "Greenwich Village", "Live Music", true, 35.0, ["Live Music", "Jazz", "Intimate", "Classic"]),
            ("The Roof at PUBLIC", "Rooftop Cocktails at Sunset", "Lower East Side", "Rooftop Bar", false, 0.0, ["Rooftop", "Cocktails", "Sunset", "Upscale"]),
            ("Le Bain at The Standard", "Dance the Night Away", "Meatpacking District", "Nightclub", true, 30.0, ["Nightclub", "Dancing", "DJ", "Rooftop Pool"]),
            ("Brooklyn Brewery", "Craft Beer Tasting Tour", "Williamsburg", "Brewery", false, 20.0, ["Craft Beer", "Brewery Tour", "Casual", "Local"]),
            ("Comedy Cellar", "Stand-Up Comedy Night", "West Village", "Comedy Club", false, 25.0, ["Comedy", "Live Show", "Intimate", "Famous"]),
            ("House of Yes", "Immersive Performance Art", "Bushwick", "Performance Venue", true, 25.0, ["Performance", "Immersive", "Circus", "Dance"]),
            ("The Dead Rabbit", "Irish Whiskey & Cocktails", "Financial District", "Cocktail Bar", false, 0.0, ["Cocktails", "Irish", "Award-Winning", "Historic"]),
            ("Elsewhere", "Indie Concert & Dance", "Bushwick", "Music Venue", true, 30.0, ["Live Music", "Indie", "Dancing", "Multi-Floor"]),
            ("Bemelmans Bar", "Piano Bar & Classic Cocktails", "Upper East Side", "Piano Bar", false, 0.0, ["Piano Bar", "Classic", "Luxury", "Jazz"]),
            ("Nowadays", "Outdoor Dance Party", "Ridgewood", "Outdoor Club", true, 20.0, ["Outdoor", "Dancing", "Garden", "Electronic"]),
            ("Cielo", "House Music Night", "Meatpacking District", "Nightclub", true, 25.0, ["House Music", "DJ", "Dancing", "Intimate"]),
            ("Sleep No More", "Immersive Theatre Experience", "Chelsea", "Theatre", true, 120.0, ["Theatre", "Immersive", "Interactive", "Unique"]),
            ("The Box", "Exclusive Cabaret Show", "Lower East Side", "Cabaret", true, 50.0, ["Cabaret", "Exclusive", "Burlesque", "VIP"]),
            ("Output", "Techno & Electronic Music", "Williamsburg", "Nightclub", true, 30.0, ["Techno", "Electronic", "DJ", "Dance Floor"]),
            ("Beauty Bar", "Retro Dance Party", "East Village", "Dance Bar", false, 15.0, ["Retro", "Dancing", "Casual", "Fun"]),
            ("Le Poisson Rouge", "Experimental Music Show", "Greenwich Village", "Music Venue", false, 25.0, ["Experimental", "Live Music", "Eclectic", "Art"]),
            ("230 Fifth Rooftop", "Skyline Views & Cocktails", "Flatiron District", "Rooftop Bar", false, 0.0, ["Rooftop", "Skyline", "Cocktails", "Large"]),
            ("Attaboy", "Speakeasy Cocktail Bar", "Lower East Side", "Speakeasy", false, 0.0, ["Speakeasy", "Craft Cocktails", "Hidden", "Intimate"]),
            ("Brooklyn Bowl", "Bowling & Live Music", "Williamsburg", "Entertainment", true, 35.0, ["Bowling", "Live Music", "Food", "Fun"]),
            ("Marquee", "Main Room DJ Night", "Chelsea", "Nightclub", true, 40.0, ["Nightclub", "DJ", "VIP", "Dancing"]),
            ("Union Pool", "Indie Rock & Outdoor Patio", "Williamsburg", "Bar", false, 10.0, ["Indie Rock", "Outdoor", "Casual", "Local"]),
            ("The Django", "Jazz in Tribeca", "Tribeca", "Jazz Club", false, 30.0, ["Jazz", "Upscale", "Cocktails", "Live Music"]),
            ("Henrietta Hudson", "LGBTQ+ Dance Party", "West Village", "Dance Club", true, 15.0, ["LGBTQ+", "Dancing", "Inclusive", "Fun"]),
            ("The West End Lounge", "Latin Night Dancing", "Upper West Side", "Dance Bar", true, 20.0, ["Latin", "Salsa", "Dancing", "Energetic"]),
            ("Top of the Standard", "Luxe Cocktails & Views", "Meatpacking District", "Rooftop Bar", false, 0.0, ["Rooftop", "Luxury", "Cocktails", "Views"]),
            ("Schimanski", "Electronic Music Warehouse", "Williamsburg", "Nightclub", true, 25.0, ["Electronic", "Warehouse", "DJ", "Industrial"]),
            ("Pianos", "Live Bands & DJ Sets", "Lower East Side", "Music Bar", false, 15.0, ["Live Music", "DJ", "Multi-Floor", "Casual"]),
            ("Up&Down", "Hip Hop Night", "Meatpacking District", "Nightclub", true, 35.0, ["Hip Hop", "DJ", "VIP", "Dancing"]),
            ("The Stand", "Comedy Showcase", "Gramercy", "Comedy Club", false, 20.0, ["Comedy", "Live Show", "Stand-Up", "Casual"]),
            ("Pete's Candy Store", "Open Mic & Indie Music", "Williamsburg", "Bar", false, 10.0, ["Open Mic", "Indie", "Intimate", "Quirky"]),
            ("Le Bain", "Fashion Week After Party", "Meatpacking District", "Nightclub", true, 40.0, ["Fashion", "After Party", "DJ", "Exclusive"]),
            ("The Flatiron Room", "Whiskey Tasting & Jazz", "Flatiron District", "Whiskey Bar", false, 0.0, ["Whiskey", "Jazz", "Upscale", "Tasting"]),
            ("Webster Hall", "Multi-Genre Concert", "East Village", "Concert Hall", true, 45.0, ["Concert", "Multi-Genre", "Historic", "Large"]),
            ("The Bitter End", "Singer-Songwriter Night", "Greenwich Village", "Music Venue", false, 15.0, ["Singer-Songwriter", "Live Music", "Intimate", "Historic"]),
            ("Tao Nightclub", "Asian-Inspired Nightclub", "Midtown", "Nightclub", true, 50.0, ["Nightclub", "Asian", "Upscale", "Restaurant"]),
            ("The Grid", "Underground Dance Party", "Hell's Kitchen", "Dance Club", true, 20.0, ["Underground", "Dancing", "Electronic", "Edgy"]),
            ("Arlene's Grocery", "Punk & Rock Show", "Lower East Side", "Music Venue", false, 10.0, ["Punk", "Rock", "Live Music", "Dive Bar"]),
            ("Bowery Ballroom", "Indie Band Concert", "Lower East Side", "Concert Hall", true, 35.0, ["Indie", "Concert", "Historic", "Mid-Size"]),
            ("Ginny's Supper Club", "Soul Food & Jazz", "Harlem", "Supper Club", false, 40.0, ["Soul", "Jazz", "Dinner", "Harlem"]),
            ("Baby's All Right", "Alternative Music Show", "Williamsburg", "Music Venue", false, 20.0, ["Alternative", "Live Music", "Hipster", "Casual"]),
            ("The Beacon Theatre", "Major Concert Event", "Upper West Side", "Theatre", true, 75.0, ["Concert", "Theatre", "Historic", "Major Acts"]),
            ("Employees Only", "Secret Cocktail Bar", "West Village", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Hidden", "Classic"]),
            ("PHD Terrace", "Rooftop Party", "Meatpacking District", "Rooftop Club", true, 30.0, ["Rooftop", "Party", "DJ", "Views"]),
            ("Good Room", "Minimal Techno Night", "Greenpoint", "Nightclub", true, 20.0, ["Techno", "Minimal", "DJ", "Sound System"]),
            ("The Hall at Elsewhere", "Warehouse Rave", "Bushwick", "Warehouse", true, 35.0, ["Rave", "Warehouse", "Electronic", "Large"]),
            ("Resident", "Underground Techno", "Downtown Brooklyn", "Nightclub", true, 25.0, ["Techno", "Underground", "DJ", "No Photos"]),
            ("The McKittrick Hotel", "Sleep No More Experience", "Chelsea", "Immersive Theatre", true, 120.0, ["Immersive", "Theatre", "Interactive", "Masks"]),
            ("3 Dollar Bill", "Queer Dance Party", "Bushwick", "LGBTQ+ Club", true, 15.0, ["LGBTQ+", "Dancing", "Inclusive", "Outdoor"]),
            ("Brooklyn Mirage", "Outdoor Electronic Festival", "East Williamsburg", "Outdoor Venue", true, 50.0, ["Electronic", "Outdoor", "Festival", "DJ"]),
            ("Avant Gardner", "Multi-Room Club Experience", "East Williamsburg", "Nightclub Complex", true, 40.0, ["Multi-Room", "Electronic", "Large", "Production"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "nyc-plan-\(String(format: "%03d", index + 1))",
                cityId: "nyc-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "USD"
            )
        }
    }
}

// MARK: - Los Angeles Plans
extension MockDataService {
    private func createLAPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("The Troubadour", "Legendary Live Music", "West Hollywood", "Music Venue", true, 35.0, ["Live Music", "Rock", "Historic", "Intimate"]),
            ("Skybar at Mondrian", "Sunset Pool Party", "West Hollywood", "Rooftop Bar", false, 0.0, ["Rooftop", "Pool", "Sunset", "Celeb Spot"]),
            ("Sound Nightclub", "EDM Main Event", "Hollywood", "Nightclub", true, 40.0, ["EDM", "DJ", "Light Show", "Dancing"]),
            ("The Comedy Store", "Stand-Up Comedy Night", "West Hollywood", "Comedy Club", false, 25.0, ["Comedy", "Stand-Up", "Historic", "Famous"]),
            ("Exchange LA", "Warehouse Club Night", "Downtown LA", "Nightclub", true, 35.0, ["Warehouse", "Electronic", "DJ", "Historic"]),
            ("The Viper Room", "Rock & Alternative Show", "West Hollywood", "Music Venue", false, 30.0, ["Rock", "Alternative", "Historic", "Intimate"]),
            ("Perch", "French Rooftop Dining", "Downtown LA", "Rooftop Bar", false, 0.0, ["Rooftop", "French", "Views", "Upscale"]),
            ("Academy LA", "Multi-Room Club", "Hollywood", "Nightclub", true, 35.0, ["Multi-Room", "DJ", "Hip Hop", "Dancing"]),
            ("The Bungalow", "Beach Club Vibes", "Santa Monica", "Beach Bar", true, 20.0, ["Beach", "Cocktails", "Casual", "Outdoor"]),
            ("Catch LA", "Rooftop Dinner & Drinks", "West Hollywood", "Restaurant Bar", false, 0.0, ["Rooftop", "Seafood", "Scene", "Upscale"]),
            ("Avalon Hollywood", "EDM Concert Event", "Hollywood", "Nightclub", true, 50.0, ["EDM", "Concert", "DJ", "Historic"]),
            ("No Vacancy", "Speakeasy Theater Bar", "Hollywood", "Speakeasy", false, 0.0, ["Speakeasy", "Theatre", "Unique", "Cocktails"]),
            ("Create Nightclub", "Hip Hop Night", "Hollywood", "Nightclub", true, 30.0, ["Hip Hop", "DJ", "Dancing", "VIP"]),
            ("The Echo", "Indie Rock Show", "Echo Park", "Music Venue", false, 20.0, ["Indie", "Rock", "Local", "Dive"]),
            ("EP & LP", "Rooftop Asian Fusion", "West Hollywood", "Rooftop Bar", false, 0.0, ["Rooftop", "Asian", "Cocktails", "Views"]),
            ("The Fonda Theatre", "Alternative Concert", "Hollywood", "Theatre", true, 40.0, ["Concert", "Alternative", "Historic", "Mid-Size"]),
            ("Break Room 86", "80s Throwback Party", "Koreatown", "Bar", true, 15.0, ["80s", "Retro", "Dancing", "Fun"]),
            ("The Roxy", "Live Band Performance", "West Hollywood", "Music Venue", false, 30.0, ["Live Music", "Rock", "Historic", "Sunset Strip"]),
            ("The Rooftop at The Standard", "Downtown Pool Party", "Downtown LA", "Rooftop Bar", true, 25.0, ["Rooftop", "Pool", "DJ", "Views"]),
            ("The Wiltern", "Major Concert Event", "Koreatown", "Theatre", true, 60.0, ["Concert", "Historic", "Art Deco", "Large"]),
            ("The Association", "Underground House Music", "Downtown LA", "Nightclub", true, 25.0, ["House", "Underground", "DJ", "Warehouse"]),
            ("Harvard & Stone", "Live Jazz & Blues", "Hollywood", "Bar", false, 10.0, ["Jazz", "Blues", "Live Music", "Dive"]),
            ("The Sayers Club", "Exclusive Live Show", "Hollywood", "Music Venue", true, 35.0, ["Live Music", "Exclusive", "VIP", "Intimate"]),
            ("Le Jardin", "Garden Party Vibes", "Hollywood", "Bar", false, 20.0, ["Garden", "Cocktails", "Outdoor", "Casual"]),
            ("The Mint", "Soul & Funk Night", "West LA", "Music Venue", false, 15.0, ["Soul", "Funk", "Live Music", "Dance"]),
            ("Warwick", "Hip Hop Club Night", "Hollywood", "Nightclub", true, 30.0, ["Hip Hop", "DJ", "Dancing", "Upscale"]),
            ("Seven Grand", "Whiskey Bar", "Downtown LA", "Whiskey Bar", false, 0.0, ["Whiskey", "Dive", "Pool Table", "Casual"]),
            ("Resident DTLA", "Techno Underground", "Downtown LA", "Nightclub", true, 25.0, ["Techno", "Underground", "DJ", "Industrial"]),
            ("The Hi Hat", "Live Music & Cocktails", "Highland Park", "Music Venue", false, 20.0, ["Live Music", "Cocktails", "Retro", "Local"]),
            ("1 Oak LA", "Celebrity Nightclub", "West Hollywood", "Nightclub", true, 50.0, ["Celebrity", "Upscale", "DJ", "VIP"]),
            ("The Echoplex", "Underground Concert", "Echo Park", "Music Venue", false, 25.0, ["Underground", "Concert", "Punk", "Alternative"]),
            ("The Edison", "Steampunk Bar", "Downtown LA", "Bar", false, 0.0, ["Steampunk", "Cocktails", "Unique", "Historic"]),
            ("The Globe Theatre", "Live Band Night", "Downtown LA", "Music Venue", true, 30.0, ["Live Music", "Rock", "Historic", "Bar"]),
            ("The Study", "Cocktail Lounge", "Hollywood", "Lounge", false, 0.0, ["Cocktails", "Upscale", "Intimate", "Vintage"]),
            ("Good Times at Davey Wayne's", "70s Themed Bar", "Hollywood", "Bar", false, 0.0, ["70s", "Retro", "Fun", "Themed"]),
            ("Dirty Laundry", "Speakeasy Cocktails", "Hollywood", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Hidden", "Upscale"]),
            ("The Teragram Ballroom", "Indie Concert Hall", "Downtown LA", "Concert Hall", true, 35.0, ["Indie", "Concert", "Historic", "Mid-Size"]),
            ("The Dresden", "Lounge Singers", "Los Feliz", "Lounge", false, 0.0, ["Lounge", "Live Music", "Retro", "Classic"]),
            ("The Tower Bar", "Sunset Strip Lounge", "West Hollywood", "Lounge", false, 0.0, ["Lounge", "Classic", "Upscale", "Historic"]),
            ("The Three Clubs", "Dive Bar Dancing", "Hollywood", "Dive Bar", false, 10.0, ["Dive", "Dancing", "Casual", "Local"]),
            ("The Rainbow Bar & Grill", "Rock & Roll History", "West Hollywood", "Bar", false, 0.0, ["Rock", "Historic", "Sunset Strip", "Casual"]),
            ("Mom's Bar", "Underground Dance Party", "Hollywood", "Bar", true, 15.0, ["Underground", "Dancing", "Alternative", "Small"]),
            ("Short Stop", "Retro Dance Night", "Echo Park", "Bar", true, 10.0, ["Retro", "Dancing", "Dive", "Fun"]),
            ("La Cita", "Latin Dance Club", "Downtown LA", "Dance Club", true, 15.0, ["Latin", "Salsa", "Dancing", "Dive"]),
            ("The Airliner", "Live Local Bands", "Lincoln Heights", "Bar", false, 10.0, ["Live Music", "Local", "Dive", "Casual"]),
            ("The Prince", "Karaoke Night", "Koreatown", "Bar", false, 0.0, ["Karaoke", "Dive", "Retro", "Fun"]),
            ("Clifton's Republic", "Multi-Floor Adventure", "Downtown LA", "Bar", false, 0.0, ["Multi-Floor", "Unique", "Tiki", "Historic"]),
            ("Sassafras Saloon", "Western Dance Hall", "Hollywood", "Bar", true, 20.0, ["Western", "Line Dancing", "Country", "Fun"]),
            ("The Satellite", "Indie Music Discovery", "Silver Lake", "Music Venue", false, 15.0, ["Indie", "Discovery", "Small", "Local"]),
            ("The Del Monte Speakeasy", "Hidden Cocktail Bar", "Venice", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Hidden", "Beach"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "la-plan-\(String(format: "%03d", index + 1))",
                cityId: "la-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "USD"
            )
        }
    }
}

// MARK: - Miami Plans
extension MockDataService {
    private func createMiamiPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("LIV", "World-Class Nightclub", "Miami Beach", "Nightclub", true, 100.0, ["Nightclub", "EDM", "Celebrity", "VIP"]),
            ("Story", "Multi-Level Club", "Miami Beach", "Nightclub", true, 75.0, ["Multi-Level", "EDM", "Production", "Dancing"]),
            ("E11EVEN", "24-Hour Strip Club", "Downtown Miami", "Nightclub", true, 80.0, ["24-Hour", "Cabaret", "DJ", "Adults Only"]),
            ("WALL Lounge", "Bottle Service Party", "Miami Beach", "Nightclub", true, 60.0, ["Bottle Service", "Hip Hop", "VIP", "South Beach"]),
            ("Basement", "Underground Techno", "Miami Beach", "Nightclub", true, 40.0, ["Techno", "Underground", "DJ", "Minimal"]),
            ("Nikki Beach", "Beach Club Party", "Miami Beach", "Beach Club", true, 50.0, ["Beach", "Pool", "DJ", "Dayclub"]),
            ("Space", "After Hours Club", "Downtown Miami", "Nightclub", true, 40.0, ["After Hours", "Techno", "Legendary", "Terrace"]),
            ("Treehouse", "Rooftop Pool Party", "Miami Beach", "Rooftop Bar", false, 30.0, ["Rooftop", "Pool", "Views", "Cocktails"]),
            ("Hyde Beach", "Pool Party", "Miami Beach", "Beach Club", true, 60.0, ["Pool", "Beach", "DJ", "Dayclub"]),
            ("Club Space Terrace", "Sunrise Set", "Downtown Miami", "Nightclub", true, 50.0, ["Sunrise", "Techno", "Outdoor", "Legendary"]),
            ("Do Not Sit on the Furniture", "House Music Night", "Wynwood", "Nightclub", true, 30.0, ["House", "Local", "Art District", "Underground"]),
            ("Sweet Liberty", "Craft Cocktail Bar", "Miami Beach", "Bar", false, 0.0, ["Cocktails", "Award-Winning", "Beach", "Casual"]),
            ("Mango's Tropical Cafe", "Live Latin Show", "Miami Beach", "Entertainment", false, 20.0, ["Latin", "Live Show", "Dancing", "Salsa"]),
            ("The Wharf Miami", "Outdoor Bar Scene", "Miami River", "Bar", false, 0.0, ["Outdoor", "Dive", "River", "Casual"]),
            ("Ball & Chain", "Live Latin Jazz", "Little Havana", "Music Venue", false, 15.0, ["Latin Jazz", "Live Music", "Historic", "Salsa"]),
            ("Gramps", "Eclectic Bar", "Wynwood", "Bar", false, 10.0, ["Eclectic", "Art", "Casual", "Local"]),
            ("Broken Shaker", "Craft Cocktails", "Miami Beach", "Bar", false, 0.0, ["Cocktails", "Garden", "Award-Winning", "Hip"]),
            ("Dante's HiFi", "Indie Music Dive", "Wynwood", "Bar", false, 10.0, ["Indie", "Dive", "Jukebox", "Retro"]),
            ("Coyo Taco", "Taco Bar Party", "Wynwood", "Bar", false, 0.0, ["Tacos", "Outdoor", "Casual", "Fun"]),
            ("The Anderson", "Rooftop Cocktails", "Downtown Miami", "Rooftop Bar", false, 0.0, ["Rooftop", "Cocktails", "Views", "Upscale"]),
            ("Blackbird Ordinary", "Cocktail Lounge", "Brickell", "Lounge", false, 0.0, ["Cocktails", "Upscale", "Hip", "DJ"]),
            ("Racket", "Multi-Level Venue", "Wynwood", "Nightclub", true, 25.0, ["Multi-Level", "DJ", "Art", "Dancing"]),
            ("Floyd", "Live Music Bar", "Miami Beach", "Bar", false, 15.0, ["Live Music", "Rock", "Dive", "Beach"]),
            ("Jaguar Sun", "Cocktail & Vinyl", "Miami Beach", "Bar", false, 0.0, ["Cocktails", "Vinyl", "Hip", "Small"]),
            ("The Regent Cocktail Club", "Speakeasy Style", "Miami Beach", "Bar", false, 0.0, ["Speakeasy", "Cocktails", "Upscale", "Historic"]),
            ("Mama Tried", "Dive Bar Vibes", "Miami Beach", "Dive Bar", false, 0.0, ["Dive", "Casual", "Cheap", "Fun"]),
            ("Wood Tavern", "Craft Beer Bar", "Wynwood", "Bar", false, 0.0, ["Craft Beer", "Outdoor", "Casual", "Art District"]),
            ("Kill Your Idol", "Punk Rock Bar", "Miami Beach", "Bar", false, 0.0, ["Punk", "Rock", "Dive", "Alternative"]),
            ("Lost Weekend", "Dive Bar Karaoke", "Miami Beach", "Dive Bar", false, 0.0, ["Karaoke", "Dive", "Beach", "Fun"]),
            ("The Citadel", "Haitian Food & Drinks", "Little Haiti", "Bar", false, 0.0, ["Haitian", "Food", "Local", "Casual"]),
            ("Electric Pickle", "Underground Electronic", "Wynwood", "Nightclub", true, 20.0, ["Electronic", "Underground", "DJ", "Art"]),
            ("Purdy Lounge", "Wynwood Party", "Wynwood", "Bar", true, 15.0, ["Party", "Art District", "Dancing", "Casual"]),
            ("Las Rosas", "Rooftop Tequila Bar", "Wynwood", "Rooftop Bar", false, 0.0, ["Rooftop", "Tequila", "Tacos", "Art"]),
            ("Lagniappe", "Wine & Live Music", "Midtown", "Wine Bar", false, 0.0, ["Wine", "Live Music", "Outdoor", "Chill"]),
            ("The Sylvester", "Cocktail Bar", "Miami Beach", "Bar", false, 0.0, ["Cocktails", "Upscale", "Small", "Hip"]),
            ("Abbey Brewing Company", "Craft Beer Gastropub", "Miami Beach", "Brewery", false, 0.0, ["Craft Beer", "Food", "Casual", "Local"]),
            ("Boxelder", "Craft Beer & Vinyl", "Wynwood", "Bar", false, 0.0, ["Craft Beer", "Vinyl", "Art", "Casual"]),
            ("R House", "Rooftop Lounge", "Wynwood", "Rooftop Bar", false, 0.0, ["Rooftop", "Lounge", "Art District", "Views"]),
            ("Veza Sur", "Latin Brewery", "Wynwood", "Brewery", false, 0.0, ["Latin", "Brewery", "Food", "Casual"]),
            ("Concrete Beach Brewery", "Local Craft Beer", "Wynwood", "Brewery", false, 0.0, ["Craft Beer", "Local", "Industrial", "Casual"]),
            ("The Tavern", "Sports Bar Scene", "Miami Beach", "Sports Bar", false, 0.0, ["Sports", "Casual", "Beach", "Fun"]),
            ("Delicias de España", "Flamenco Show", "Coral Gables", "Restaurant Bar", false, 25.0, ["Flamenco", "Spanish", "Live Show", "Dinner"]),
            ("The Doral Yard", "Beer Garden", "Doral", "Beer Garden", false, 0.0, ["Beer Garden", "Outdoor", "Family", "Casual"]),
            ("Salty Donut", "Late Night Donuts & Beer", "Wynwood", "Bar", false, 0.0, ["Donuts", "Beer", "Late Night", "Casual"]),
            ("Kush", "Burgers & Beer", "Wynwood", "Bar", false, 0.0, ["Burgers", "Beer", "Outdoor", "Casual"]),
            ("Mac's Club Deuce", "Historic Dive Bar", "Miami Beach", "Dive Bar", false, 0.0, ["Historic", "Dive", "24-Hour", "Local"]),
            ("Vagabond Pool & Bar", "Retro Pool Bar", "Biscayne Corridor", "Bar", false, 0.0, ["Pool", "Retro", "Outdoor", "Casual"]),
            ("Moxies", "Karaoke Dive", "Miami Beach", "Dive Bar", false, 0.0, ["Karaoke", "Dive", "Beach", "Fun"]),
            ("Seaspice", "Waterfront Dining", "Miami River", "Restaurant Bar", false, 0.0, ["Waterfront", "Upscale", "Mediterranean", "Scene"]),
            ("Zuma", "Japanese Rooftop", "Downtown Miami", "Rooftop Bar", false, 0.0, ["Japanese", "Rooftop", "Upscale", "River Views"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "mia-plan-\(String(format: "%03d", index + 1))",
                cityId: "mia-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "USD"
            )
        }
    }
}

// MARK: - London Plans
extension MockDataService {
    private func createLondonPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("Fabric", "Legendary Techno Club", "Farringdon", "Nightclub", true, 25.0, ["Techno", "Legendary", "DJ", "Bass"]),
            ("Ministry of Sound", "House Music Temple", "Elephant & Castle", "Nightclub", true, 30.0, ["House", "Historic", "DJ", "Dancing"]),
            ("XOYO", "Multi-Genre Club", "Shoreditch", "Nightclub", true, 20.0, ["Multi-Genre", "Electronic", "DJ", "Hip"]),
            ("Ronnie Scott's", "Jazz Club Icon", "Soho", "Jazz Club", false, 35.0, ["Jazz", "Live Music", "Historic", "Legendary"]),
            ("The Box Soho", "Cabaret Show", "Soho", "Cabaret", true, 50.0, ["Cabaret", "Exclusive", "Burlesque", "VIP"]),
            ("Printworks", "Warehouse Club Events", "Surrey Quays", "Nightclub", true, 35.0, ["Warehouse", "Electronic", "Production", "Massive"]),
            ("The Jazz Cafe", "Live Jazz & Soul", "Camden", "Music Venue", false, 25.0, ["Jazz", "Soul", "Live Music", "Intimate"]),
            ("Egg London", "Multi-Room Techno", "Kings Cross", "Nightclub", true, 25.0, ["Techno", "Multi-Room", "DJ", "Garden"]),
            ("Phonox", "House & Techno", "Brixton", "Nightclub", true, 20.0, ["House", "Techno", "DJ", "Sound System"]),
            ("Aqua Shard", "Sky-High Cocktails", "London Bridge", "Bar", false, 0.0, ["Rooftop", "Views", "Cocktails", "Luxury"]),
            ("The Ned", "Members Club Night", "Bank", "Members Club", false, 0.0, ["Members", "Jazz", "Upscale", "Historic"]),
            ("Dalston Superstore", "LGBTQ+ Dance Party", "Dalston", "LGBTQ+ Club", true, 10.0, ["LGBTQ+", "Dancing", "Alternative", "Inclusive"]),
            ("Corsica Studios", "Underground Techno", "Elephant & Castle", "Nightclub", true, 15.0, ["Underground", "Techno", "DJ", "Industrial"]),
            ("The Windmill", "Live Indie Bands", "Brixton", "Music Venue", false, 10.0, ["Indie", "Live Music", "Dive", "Local"]),
            ("Sketch", "Art Installation Bar", "Mayfair", "Bar", false, 0.0, ["Art", "Instagram", "Upscale", "Unique"]),
            ("Mahiki", "Tiki Club Party", "Mayfair", "Nightclub", true, 30.0, ["Tiki", "Upscale", "Celebrity", "Fun"]),
            ("The Glory", "Drag Show Night", "Haggerston", "LGBTQ+ Venue", false, 15.0, ["Drag", "LGBTQ+", "Performance", "Fun"]),
            ("Village Underground", "Warehouse Concerts", "Shoreditch", "Music Venue", true, 25.0, ["Warehouse", "Concert", "Alternative", "Art"]),
            ("Scala", "Multi-Level Club", "Kings Cross", "Nightclub", true, 20.0, ["Multi-Level", "Alternative", "Historic", "Club"]),
            ("The Piano Works", "Live Music Bar", "Farringdon", "Music Bar", false, 15.0, ["Live Music", "Piano", "Requests", "Fun"]),
            ("Tape London", "Hip Hop Club", "Mayfair", "Nightclub", true, 40.0, ["Hip Hop", "VIP", "Celebrity", "Upscale"]),
            ("Paradise by Way of Kensal Green", "Quirky Bar", "Kensal Green", "Bar", false, 0.0, ["Quirky", "Cocktails", "Gothic", "Unique"]),
            ("Chin Chin Labs", "Dessert & Cocktails", "Camden", "Bar", false, 0.0, ["Desserts", "Cocktails", "Science", "Fun"]),
            ("The Ace Hotel", "Shoreditch Bar", "Shoreditch", "Bar", false, 0.0, ["Hotel", "Hip", "Cocktails", "Scene"]),
            ("Cargo", "Club Under Arches", "Shoreditch", "Nightclub", true, 15.0, ["Underground", "Arches", "DJ", "Dancing"]),
            ("The Hawley Arms", "Camden Pub", "Camden", "Pub", false, 0.0, ["Pub", "Rock", "Historic", "Local"]),
            ("Callooh Callay", "Cocktail Speakeasy", "Shoreditch", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Wonderland", "Creative"]),
            ("Radio Rooftop", "ME London Views", "Covent Garden", "Rooftop Bar", false, 0.0, ["Rooftop", "Views", "Cocktails", "Upscale"]),
            ("The Bletchley", "Code-Breaking Bar", "Fitzrovia", "Bar", false, 0.0, ["Themed", "Cocktails", "WWII", "Unique"]),
            ("Bounce", "Ping Pong Bar", "Multiple Locations", "Bar", false, 20.0, ["Ping Pong", "Fun", "Food", "Casual"]),
            ("Flight Club", "Darts Bar", "Shoreditch", "Bar", false, 0.0, ["Darts", "Fun", "Food", "Social"]),
            ("The Mayor of Scaredy Cat Town", "Hidden Speakeasy", "Spitalfields", "Speakeasy", false, 0.0, ["Speakeasy", "Hidden", "Breakfast Club", "Quirky"]),
            ("The Star of Bethnal Green", "Pub & DJ Night", "Bethnal Green", "Pub", true, 10.0, ["Pub", "DJ", "Dancing", "Local"]),
            ("Electric Ballroom", "Camden Concert Hall", "Camden", "Concert Hall", true, 25.0, ["Concert", "Alternative", "Historic", "Large"]),
            ("Koko", "Historic Music Venue", "Camden", "Music Venue", true, 30.0, ["Historic", "Concert", "Victorian", "Multi-Level"]),
            ("The Social", "Underground DJ Bar", "Fitzrovia", "Bar", false, 10.0, ["Underground", "DJ", "Basement", "Alternative"]),
            ("Bussey Building", "Rooftop Bar", "Peckham", "Rooftop Bar", false, 0.0, ["Rooftop", "Art", "Alternative", "Views"]),
            ("The George Tavern", "East End Music Pub", "Stepney", "Pub", false, 10.0, ["Pub", "Live Music", "Historic", "Local"]),
            ("Oslo", "Hackney Music Venue", "Hackney", "Music Venue", false, 15.0, ["Live Music", "Indie", "Club Nights", "Local"]),
            ("Brixton Jamm", "Reggae & Bass", "Brixton", "Nightclub", true, 15.0, ["Reggae", "Bass", "DJ", "Dancing"]),
            ("The Lexington", "Indie Rock Pub", "Kings Cross", "Music Pub", false, 10.0, ["Indie", "Rock", "Live Music", "Casual"]),
            ("Old Blue Last", "Vice Magazine Pub", "Shoreditch", "Pub", false, 10.0, ["Indie", "Hip", "Live Music", "Small"]),
            ("The Victoria", "Dalston Gay Bar", "Dalston", "LGBTQ+ Pub", false, 0.0, ["LGBTQ+", "Pub", "Friendly", "Casual"]),
            ("The Alibi", "Cocktail Bar", "Dalston", "Bar", false, 0.0, ["Cocktails", "Hip", "Small", "Local"]),
            ("The Royal Vauxhall Tavern", "LGBTQ+ Historic Pub", "Vauxhall", "LGBTQ+ Pub", false, 10.0, ["LGBTQ+", "Historic", "Drag", "Cabaret"]),
            ("Heaven", "LGBTQ+ Superclub", "Charing Cross", "Nightclub", true, 15.0, ["LGBTQ+", "Large", "Dancing", "Historic"]),
            ("The Vaults", "Theatre Bar", "Waterloo", "Bar", false, 0.0, ["Theatre", "Arches", "Alternative", "Art"]),
            ("Proud Camden", "Music & Cabaret", "Camden", "Music Venue", true, 20.0, ["Music", "Cabaret", "Alternative", "Stables"]),
            ("The Blues Kitchen", "Live Blues Music", "Camden", "Music Venue", false, 15.0, ["Blues", "Live Music", "BBQ", "Bourbon"]),
            ("Notting Hill Arts Club", "Basement Club", "Notting Hill", "Nightclub", true, 10.0, ["Underground", "DJ", "Alternative", "Small"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "lon-plan-\(String(format: "%03d", index + 1))",
                cityId: "lon-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "GBP"
            )
        }
    }
}

// MARK: - Paris Plans
extension MockDataService {
    private func createParisPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("Rex Club", "Techno Temple", "2nd Arrondissement", "Nightclub", true, 20.0, ["Techno", "Legendary", "DJ", "Sound System"]),
            ("Le Baron", "Exclusive Nightclub", "8th Arrondissement", "Nightclub", true, 25.0, ["Exclusive", "Hip", "DJ", "Small"]),
            ("Concrete", "Floating Nightclub", "13th Arrondissement", "Nightclub", true, 20.0, ["Floating", "Techno", "Seine", "Underground"]),
            ("Silencio", "David Lynch Club", "2nd Arrondissement", "Nightclub", true, 30.0, ["Members", "Art", "DJ", "Exclusive"]),
            ("Le Comptoir Général", "Tropical Bar", "10th Arrondissement", "Bar", false, 0.0, ["Tropical", "Quirky", "Art", "Cultural"]),
            ("Wanderlust", "Seine Side Club", "13th Arrondissement", "Nightclub", true, 15.0, ["Seine", "Electronic", "Outdoor", "Multi-Room"]),
            ("New Morning", "Jazz Club", "10th Arrondissement", "Jazz Club", false, 25.0, ["Jazz", "Live Music", "Historic", "World Music"]),
            ("Le Showcase", "Under Bridge Club", "8th Arrondissement", "Nightclub", true, 25.0, ["Underground", "Bridge", "Electronic", "Unique"]),
            ("La Machine du Moulin Rouge", "Multi-Floor Club", "18th Arrondissement", "Nightclub", true, 20.0, ["Multi-Floor", "Electronic", "Historic", "Garden"]),
            ("Le Perchoir", "Rooftop Cocktails", "11th Arrondissement", "Rooftop Bar", false, 0.0, ["Rooftop", "Cocktails", "Views", "Hip"]),
            ("Le Duc des Lombards", "Jazz & Blues", "1st Arrondissement", "Jazz Club", false, 20.0, ["Jazz", "Blues", "Live Music", "Intimate"]),
            ("Yoyo", "Palais de Tokyo Club", "16th Arrondissement", "Nightclub", true, 20.0, ["Art Museum", "Electronic", "Unique", "Underground"]),
            ("Social Club", "Underground Hip Hop", "2nd Arrondissement", "Nightclub", true, 15.0, ["Hip Hop", "Underground", "DJ", "Alternative"]),
            ("Badaboum", "Alternative Club", "11th Arrondissement", "Nightclub", true, 15.0, ["Alternative", "Electronic", "DJ", "Underground"]),
            ("Le Caveau de la Huchette", "Swing Dancing", "5th Arrondissement", "Jazz Club", false, 15.0, ["Swing", "Jazz", "Dancing", "Historic"]),
            ("Chez Moune", "LGBTQ+ Historic Bar", "9th Arrondissement", "LGBTQ+ Bar", false, 0.0, ["LGBTQ+", "Historic", "Cabaret", "Inclusive"]),
            ("Le Panic Room", "Rock Bar", "11th Arrondissement", "Bar", false, 0.0, ["Rock", "Alternative", "Dive", "Music"]),
            ("La Bellevilloise", "Cultural Venue", "20th Arrondissement", "Music Venue", true, 20.0, ["Cultural", "Live Music", "Art", "Multi-Room"]),
            ("Le Bataclan", "Historic Concert Hall", "11th Arrondissement", "Concert Hall", true, 35.0, ["Concert", "Historic", "Large", "Multi-Genre"]),
            ("Point Ephémère", "Canal Side Venue", "10th Arrondissement", "Music Venue", false, 15.0, ["Canal", "Alternative", "Art", "Live Music"]),
            ("Le Trianon", "Concert Theatre", "18th Arrondissement", "Theatre", true, 30.0, ["Concert", "Theatre", "Historic", "Large"]),
            ("Le Bus Palladium", "Rock Club", "9th Arrondissement", "Nightclub", true, 20.0, ["Rock", "Historic", "DJ", "Dancing"]),
            ("Café A", "Electro Bar", "17th Arrondissement", "Bar", false, 0.0, ["Electro", "DJ", "Casual", "Local"]),
            ("Le China", "Asian Nightclub", "8th Arrondissement", "Nightclub", true, 25.0, ["Asian", "Upscale", "DJ", "Restaurant"]),
            ("La Java", "Historic Dance Hall", "10th Arrondissement", "Dance Hall", true, 15.0, ["Historic", "Dancing", "Live Music", "Retro"]),
            ("La Cigale", "Concert Hall", "18th Arrondissement", "Concert Hall", true, 35.0, ["Concert", "Historic", "Theatre", "Large"]),
            ("Le Carmen", "Mansion Nightclub", "9th Arrondissement", "Nightclub", true, 20.0, ["Mansion", "Historic", "DJ", "Unique"]),
            ("Experimental Cocktail Club", "Speakeasy Bar", "2nd Arrondissement", "Bar", false, 0.0, ["Speakeasy", "Cocktails", "Hip", "Small"]),
            ("Candelaria", "Taqueria Speakeasy", "3rd Arrondissement", "Bar", false, 0.0, ["Speakeasy", "Cocktails", "Tacos", "Hidden"]),
            ("Little Red Door", "Cocktail Bar", "3rd Arrondissement", "Bar", false, 0.0, ["Cocktails", "Creative", "Hip", "Small"]),
            ("Le Syndicat", "French Spirits Bar", "10th Arrondissement", "Bar", false, 0.0, ["Cocktails", "French", "Spirits", "Local"]),
            ("Combat", "Art Bar", "11th Arrondissement", "Bar", false, 0.0, ["Art", "Cocktails", "Hip", "Gallery"]),
            ("Moonshiner", "Pizza Speakeasy", "11th Arrondissement", "Bar", false, 0.0, ["Speakeasy", "Cocktails", "Pizza", "Hidden"]),
            ("Le Mary Celeste", "Cocktail & Oysters", "3rd Arrondissement", "Bar", false, 0.0, ["Cocktails", "Oysters", "Hip", "Small"]),
            ("Bonnie", "Speakeasy", "9th Arrondissement", "Bar", false, 0.0, ["Speakeasy", "Cocktails", "Hidden", "Intimate"]),
            ("Le Ballroom", "Bowling & Club", "18th Arrondissement", "Entertainment", true, 20.0, ["Bowling", "DJ", "Dancing", "Fun"]),
            ("Le Glazart", "Industrial Venue", "19th Arrondissement", "Nightclub", true, 15.0, ["Industrial", "Electronic", "Art", "Outdoor"]),
            ("Supersonic", "Rock & Electronic", "12th Arrondissement", "Bar", true, 10.0, ["Rock", "Electronic", "Alternative", "Dive"]),
            ("La Maroquinerie", "Concert Venue", "20th Arrondissement", "Music Venue", false, 20.0, ["Concert", "Alternative", "Restaurant", "Belleville"]),
            ("Les Caves du Roy", "Tropical Bar", "20th Arrondissement", "Bar", false, 0.0, ["Tropical", "Rum", "Cocktails", "Intimate"]),
            ("La Fée Verte", "Absinthe Bar", "20th Arrondissement", "Bar", false, 0.0, ["Absinthe", "Cocktails", "Retro", "Small"]),
            ("Le Très Particulier", "Secret Garden Bar", "18th Arrondissement", "Bar", false, 0.0, ["Garden", "Cocktails", "Montmartre", "Romantic"]),
            ("La Recyclerie", "Eco Bar", "18th Arrondissement", "Bar", false, 0.0, ["Eco", "Garden", "Food", "Alternative"]),
            ("Le Floréal", "Belleville Bar", "20th Arrondissement", "Bar", false, 0.0, ["Retro", "Cocktails", "Local", "Casual"]),
            ("Chez Jeannette", "Retro Bistro Bar", "10th Arrondissement", "Bar", false, 0.0, ["Retro", "Bistro", "Local", "Hip"]),
            ("Le Flèche d'Or", "Concert Café", "20th Arrondissement", "Music Venue", false, 10.0, ["Concert", "Café", "Alternative", "Local"]),
            ("La Station - Gare des Mines", "Underground Venue", "18th Arrondissement", "Nightclub", true, 15.0, ["Underground", "Electronic", "Industrial", "Art"]),
            ("Le Petit Bain", "Floating Venue", "13th Arrondissement", "Music Venue", false, 15.0, ["Floating", "Seine", "Concert", "Cultural"]),
            ("Fluctuat", "Seine Barge", "13th Arrondissement", "Bar", false, 0.0, ["Barge", "Seine", "Terrace", "Casual"]),
            ("Rosa Bonheur", "Guinguette", "19th Arrondissement", "Bar", false, 0.0, ["Park", "Outdoor", "Dancing", "Casual"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "par-plan-\(String(format: "%03d", index + 1))",
                cityId: "par-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "EUR"
            )
        }
    }
}

// MARK: - Tokyo Plans
extension MockDataService {
    private func createTokyoPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("Womb", "Mega Club Experience", "Shibuya", "Nightclub", true, 3500.0, ["Electronic", "Massive", "DJ", "Multi-Floor"]),
            ("Contact", "Underground Techno", "Shibuya", "Nightclub", true, 3000.0, ["Techno", "Underground", "DJ", "Intimate"]),
            ("Ageha", "Warehouse Mega Club", "Shin-Kiba", "Nightclub", true, 4000.0, ["Warehouse", "Massive", "Pool", "Electronic"]),
            ("Vision", "House & Techno", "Shibuya", "Nightclub", true, 3000.0, ["House", "Techno", "DJ", "Underground"]),
            ("Blue Note Tokyo", "Jazz Club", "Minami-Aoyama", "Jazz Club", false, 8000.0, ["Jazz", "Live Music", "Upscale", "Classic"]),
            ("Billboard Live Tokyo", "Live Music Venue", "Roppongi", "Music Venue", false, 7000.0, ["Live Music", "Dinner", "Upscale", "International"]),
            ("Unit", "Alternative Club", "Daikanyama", "Nightclub", true, 2500.0, ["Alternative", "Electronic", "DJ", "Basement"]),
            ("Air Tokyo", "Tech House Club", "Shibuya", "Nightclub", true, 2500.0, ["Tech House", "DJ", "Underground", "Small"]),
            ("Oath", "Intimate Club", "Shibuya", "Nightclub", true, 3000.0, ["Electronic", "Intimate", "DJ", "Quality"]),
            ("The Bellwood", "Cocktail Bar", "Omotesando", "Bar", false, 0.0, ["Cocktails", "Jazz", "Upscale", "Hidden"]),
            ("Gen Yamamoto", "Omakase Cocktails", "Azabu-Juban", "Bar", false, 0.0, ["Cocktails", "Omakase", "Intimate", "Luxury"]),
            ("Bar High Five", "Classic Cocktails", "Ginza", "Bar", false, 0.0, ["Cocktails", "Classic", "Master", "Upscale"]),
            ("Trunk Bar", "Hotel Bar", "Shibuya", "Bar", false, 0.0, ["Hotel", "Hip", "Cocktails", "Scene"]),
            ("Two Rooms", "Rooftop Bar", "Omotesando", "Rooftop Bar", false, 0.0, ["Rooftop", "Views", "Cocktails", "Upscale"]),
            ("Muse", "LGBTQ+ Club", "Shinjuku", "LGBTQ+ Club", true, 2000.0, ["LGBTQ+", "Dancing", "Inclusive", "Fun"]),
            ("Arty Farty", "LGBTQ+ Dance Bar", "Shinjuku Ni-chome", "LGBTQ+ Bar", false, 1500.0, ["LGBTQ+", "Dancing", "DJ", "Friendly"]),
            ("Advocate Cafe", "LGBTQ+ Bar", "Shinjuku Ni-chome", "LGBTQ+ Bar", false, 0.0, ["LGBTQ+", "Friendly", "Casual", "Social"]),
            ("Bonobo", "Shibuya Dive Bar", "Shibuya", "Bar", false, 0.0, ["Dive", "Alternative", "Cheap", "Local"]),
            ("Oath", "Shibuya Club", "Shibuya", "Nightclub", true, 3000.0, ["Electronic", "DJ", "Underground", "Quality"]),
            ("Sound Museum Vision", "Multi-Room Club", "Shibuya", "Nightclub", true, 3500.0, ["Multi-Room", "Electronic", "DJ", "Large"]),
            ("Circus Tokyo", "Roppongi Club", "Roppongi", "Nightclub", true, 3000.0, ["Hip Hop", "R&B", "International", "Dancing"]),
            ("V2 Tokyo", "Roppongi Nightclub", "Roppongi", "Nightclub", true, 4000.0, ["International", "DJ", "Dancing", "VIP"]),
            ("Ele Tokyo", "Roppongi Club", "Roppongi", "Nightclub", true, 3500.0, ["EDM", "DJ", "International", "Dancing"]),
            ("Sankeys TYO", "Penthouse Club", "Shibuya", "Nightclub", true, 3000.0, ["House", "Techno", "Penthouse", "Views"]),
            ("Ruby Room", "Shibuya Rock Bar", "Shibuya", "Bar", false, 1000.0, ["Rock", "Alternative", "DJ", "Dancing"]),
            ("Tight", "Harajuku Bar", "Harajuku", "Bar", false, 0.0, ["Hip", "Small", "Alternative", "Local"]),
            ("Bar Martha", "Yoyogi Bar", "Yoyogi", "Bar", false, 0.0, ["Dive", "Cheap", "Local", "Casual"]),
            ("Bar Plastic Model", "Retro Game Bar", "Shibuya", "Bar", false, 0.0, ["Retro", "Games", "Fun", "Casual"]),
            ("Bar Albatross", "Shinjuku Dive", "Shinjuku", "Bar", false, 0.0, ["Dive", "Cheap", "Local", "Golden Gai"]),
            ("Champion", "Golden Gai Bar", "Shinjuku", "Bar", false, 0.0, ["Golden Gai", "Tiny", "Local", "Unique"]),
            ("La Jetée", "Golden Gai Cinema Bar", "Shinjuku", "Bar", false, 0.0, ["Cinema", "Golden Gai", "Unique", "Tiny"]),
            ("Cambiare", "Golden Gai Bar", "Shinjuku", "Bar", false, 0.0, ["Golden Gai", "Cozy", "Tiny", "Local"]),
            ("Bauhaus", "Shimokitazawa Live", "Shimokitazawa", "Music Venue", false, 2000.0, ["Live Music", "Indie", "Alternative", "Small"]),
            ("Shelter", "Shimokitazawa Club", "Shimokitazawa", "Nightclub", true, 2500.0, ["Alternative", "Punk", "DJ", "Underground"]),
            ("Three", "Shibuya Lounge", "Shibuya", "Lounge", false, 0.0, ["Lounge", "Hip Hop", "DJ", "Casual"]),
            ("Club Asia", "Shibuya Multi-Floor", "Shibuya", "Nightclub", true, 2500.0, ["Multi-Floor", "Electronic", "DJ", "Dancing"]),
            ("The Room", "Shibuya Bar", "Shibuya", "Bar", false, 0.0, ["Bar", "DJ", "Hip", "Small"]),
            ("Bar Trench", "Ebisu Cocktails", "Ebisu", "Bar", false, 0.0, ["Cocktails", "Award-Winning", "Intimate", "Quality"]),
            ("SG Club", "Roppongi Lounge", "Roppongi", "Lounge", false, 0.0, ["Lounge", "International", "Casual", "Social"]),
            ("Maharaja Roppongi", "Disco Revival", "Roppongi", "Nightclub", true, 3000.0, ["Disco", "Retro", "Dancing", "Fun"]),
            ("Warehouse 702", "Roppongi Hip Hop", "Roppongi", "Nightclub", true, 3000.0, ["Hip Hop", "DJ", "Dancing", "Underground"]),
            ("New Lex Tokyo", "Roppongi Lounge", "Roppongi", "Lounge", false, 0.0, ["Lounge", "International", "DJ", "Casual"]),
            ("Pink Cow", "Roppongi Art Bar", "Roppongi", "Bar", false, 0.0, ["Art", "Alternative", "Food", "Cultural"]),
            ("Super Deluxe", "Art Space", "Roppongi", "Art Venue", false, 2000.0, ["Art", "Performance", "Alternative", "Cultural"]),
            ("Aoyama Tunnel", "Underground Bar", "Aoyama", "Bar", false, 0.0, ["Underground", "Hip", "Small", "Local"]),
            ("Omotesando Koffee", "Late Night Café", "Omotesando", "Café", false, 0.0, ["Café", "Hip", "Minimal", "Late Night"]),
            ("Oath", "Daikanyama Club", "Daikanyama", "Nightclub", true, 3000.0, ["Electronic", "Underground", "DJ", "Quality"]),
            ("Shibuya WWW", "Live Music Venue", "Shibuya", "Music Venue", false, 3000.0, ["Live Music", "Alternative", "Indie", "Hip"]),
            ("WWW X", "Shibuya Concert Hall", "Shibuya", "Music Venue", true, 3500.0, ["Concert", "Alternative", "Large", "Multi-Genre"]),
            ("Club Quattro", "Live House", "Shibuya", "Music Venue", true, 3000.0, ["Live Music", "Concert", "Alternative", "Mid-Size"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "tyo-plan-\(String(format: "%03d", index + 1))",
                cityId: "tyo-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "JPY"
            )
        }
    }
}

// MARK: - Berlin Plans
extension MockDataService {
    private func createBerlinPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("Berghain", "Legendary Techno Temple", "Friedrichshain", "Nightclub", true, 20.0, ["Techno", "Legendary", "Marathon", "Industrial"]),
            ("Watergate", "Spree Side Club", "Kreuzberg", "Nightclub", true, 15.0, ["Techno", "House", "River", "Terrace"]),
            ("Tresor", "Industrial Techno", "Mitte", "Nightclub", true, 15.0, ["Techno", "Industrial", "Legendary", "Vault"]),
            ("About Blank", "Garden Club", "Friedrichshain", "Nightclub", true, 10.0, ["Techno", "Garden", "Inclusive", "Marathon"]),
            ("Sisyphos", "Wonderland Club", "Lichtenberg", "Nightclub", true, 12.0, ["Multi-Room", "Garden", "Art", "Marathon"]),
            ("://about blank", "Raw Techno", "Friedrichshain", "Nightclub", true, 10.0, ["Techno", "Raw", "Garden", "Underground"]),
            ("Kater Blau", "Spree Beach Club", "Friedrichshain", "Nightclub", true, 12.0, ["House", "Beach", "Garden", "Eclectic"]),
            ("Griessmühle", "Industrial Venue", "Neukölln", "Nightclub", true, 10.0, ["Industrial", "Techno", "Warehouse", "Garden"]),
            ("Salon zur Wilden Renate", "House Party Vibe", "Friedrichshain", "Nightclub", true, 10.0, ["House Party", "Multi-Room", "Quirky", "Intimate"]),
            ("Club der Visionaere", "Canal Side Club", "Kreuzberg", "Club", false, 0.0, ["Minimal", "Canal", "Outdoor", "Afternoon"]),
            ("Panorama Bar", "Berghain's Upper Floor", "Friedrichshain", "Club Floor", true, 20.0, ["House", "Panoramic", "Legendary", "Marathon"]),
            ("KitKatClub", "Fetish Party", "Mitte", "Nightclub", true, 15.0, ["Fetish", "LGBTQ+", "Open-Minded", "Extreme"]),
            ("Ritter Butzke", "Multi-Floor Club", "Kreuzberg", "Nightclub", true, 12.0, ["Multi-Floor", "Electronic", "Garden", "Hip"]),
            ("Prince Charles", "Kreuzberg Club", "Kreuzberg", "Nightclub", true, 10.0, ["Techno", "House", "Underground", "Pool"]),
            ("Wilde Renate", "Apartment Club", "Friedrichshain", "Nightclub", true, 10.0, ["Apartment", "House", "Quirky", "Multi-Room"]),
            ("Ipse", "Minimal Techno", "Friedrichshain", "Nightclub", true, 10.0, ["Minimal", "Techno", "Underground", "Small"]),
            ("Suicide Circus", "Raw Industrial", "Friedrichshain", "Nightclub", true, 12.0, ["Industrial", "Techno", "Raw", "Hardcore"]),
            ("Chalet", "Club & Terrace", "Kreuzberg", "Nightclub", true, 10.0, ["Electronic", "Terrace", "Multi-Room", "Alternative"]),
            ("OHM", "Köpenicker Street Club", "Kreuzberg", "Nightclub", true, 10.0, ["Techno", "Industrial", "Underground", "Raw"]),
            ("Void", "Techno Basement", "Mitte", "Nightclub", true, 12.0, ["Techno", "Basement", "Sound System", "Underground"]),
            ("RSO.Berlin", "Multi-Room Complex", "Friedrichshain", "Nightclub", true, 15.0, ["Multi-Room", "Techno", "House", "Large"]),
            ("Anomalie Art Club", "Art & Music", "Kreuzberg", "Nightclub", true, 10.0, ["Art", "Electronic", "Alternative", "Small"]),
            ("Monarch", "Intimate Club", "Kreuzberg", "Nightclub", true, 10.0, ["House", "Techno", "Intimate", "Quality"]),
            ("Klunkerkranich", "Rooftop Bar", "Neukölln", "Rooftop Bar", false, 0.0, ["Rooftop", "Sunset", "Views", "Garden"]),
            ("Birgit & Bier", "Neukölln Bar", "Neukölln", "Bar", false, 0.0, ["Bar", "Cheap", "Local", "Casual"]),
            ("Tausend", "Hidden Club", "Mitte", "Nightclub", false, 15.0, ["Hidden", "Upscale", "Eclectic", "Restaurant"]),
            ("Cookies", "Mitte Club", "Mitte", "Nightclub", true, 12.0, ["Electronic", "Hip", "Dancing", "Basement"]),
            ("Weekend", "Rooftop Club", "Mitte", "Nightclub", true, 15.0, ["Rooftop", "Views", "Electronic", "Upscale"]),
            ("The Sixties Diner", "Retro Diner Bar", "Friedrichshain", "Bar", false, 0.0, ["Retro", "Diner", "American", "Casual"]),
            ("Bohnengold", "Coffee & Cocktails", "Prenzlauer Berg", "Bar", false, 0.0, ["Coffee", "Cocktails", "Hip", "Small"]),
            ("Bar 25 (RIP)", "Legendary Legacy", "Friedrichshain", "Memory", false, 0.0, ["Legendary", "Closed", "Memory", "History"]),
            ("Hoppetosse", "Spree Boat Club", "Kreuzberg", "Boat Club", true, 10.0, ["Boat", "Spree", "Electronic", "Unique"]),
            ("Ficken 3000", "Kreuzberg Bar", "Kreuzberg", "Bar", false, 0.0, ["Dive", "Cheap", "Alternative", "Local"]),
            ("Möbel Olfe", "LGBTQ+ Bar", "Kreuzberg", "LGBTQ+ Bar", false, 0.0, ["LGBTQ+", "Dive", "Friendly", "Casual"]),
            ("SchwuZ", "LGBTQ+ Club", "Neukölln", "LGBTQ+ Club", true, 10.0, ["LGBTQ+", "Dancing", "Inclusive", "Large"]),
            ("Berghain Lab.oratory", "Experimental Floor", "Friedrichshain", "Club Floor", true, 20.0, ["Experimental", "Techno", "Dark", "Hardcore"]),
            ("Zum Schmutzigen Hobby", "Neukölln Dive", "Neukölln", "Bar", false, 0.0, ["Dive", "Cheap", "Local", "Grungy"]),
            ("//:://about blank", "Garden Techno", "Friedrichshain", "Nightclub", true, 10.0, ["Techno", "Garden", "Outdoor", "Marathon"]),
            ("Kosmonaut", "Friedrichshain Club", "Friedrichshain", "Nightclub", true, 10.0, ["Electronic", "Alternative", "Local", "Small"]),
            ("Alte Münze", "Event Space", "Mitte", "Event Space", true, 15.0, ["Events", "Electronic", "Art", "Variable"]),
            ("Renate", "House Party Club", "Friedrichshain", "Nightclub", true, 10.0, ["House", "Multi-Room", "Quirky", "Intimate"]),
            ("Matrix", "Tourist Trap", "Friedrichshain", "Nightclub", true, 10.0, ["Mainstream", "Tourist", "Cheap", "Large"]),
            ("Yaam", "Beach Bar", "Friedrichshain", "Beach Bar", false, 0.0, ["Beach", "Reggae", "Outdoor", "Cultural"]),
            ("Jazzanova Live", "Live Music", "Friedrichshain", "Music Venue", false, 15.0, ["Jazz", "Soul", "Live", "Quality"]),
            ("Crack Bellmer", "Art Bar", "Kreuzberg", "Bar", false, 0.0, ["Art", "Alternative", "Small", "Hip"]),
            ("Südblock", "LGBTQ+ Café", "Kreuzberg", "Café", false, 0.0, ["LGBTQ+", "Café", "Political", "Community"]),
            ("Stattbad Wedding", "Wedding Venue", "Wedding", "Event Space", true, 12.0, ["Events", "Electronic", "Alternative", "Pool"]),
            ("Musik & Frieden", "Kreuzberg Venue", "Kreuzberg", "Music Venue", false, 15.0, ["Live Music", "Alternative", "Concert", "Restaurant"]),
            ("Magnet Club", "Kreuzberg Club", "Kreuzberg", "Nightclub", true, 10.0, ["Electronic", "Alternative", "Small", "Underground"]),
            ("://about blank garden", "Garden Sessions", "Friedrichshain", "Outdoor Club", false, 10.0, ["Garden", "Afternoon", "Techno", "Outdoor"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "ber-plan-\(String(format: "%03d", index + 1))",
                cityId: "ber-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "EUR"
            )
        }
    }
}

// MARK: - Barcelona Plans
extension MockDataService {
    private func createBarcelonaPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("Razzmatazz", "Five Room Mega Club", "Poblenou", "Nightclub", true, 20.0, ["Multi-Room", "Electronic", "Rock", "Massive"]),
            ("Opium Barcelona", "Beach Club", "Barceloneta", "Beach Club", true, 25.0, ["Beach", "Upscale", "DJ", "Restaurant"]),
            ("Pacha Barcelona", "Ibiza Sister Club", "Barceloneta", "Nightclub", true, 30.0, ["Upscale", "Electronic", "Beach", "International"]),
            ("Sala Apolo", "Historic Concert Hall", "Poble Sec", "Concert Hall", true, 20.0, ["Concert", "Historic", "Multi-Genre", "Large"]),
            ("City Hall Barcelona", "Theatre Nightclub", "Eixample", "Nightclub", true, 20.0, ["Theatre", "Electronic", "Historic", "Beautiful"]),
            ("Input", "High Fidelity Club", "Eixample", "Nightclub", true, 15.0, ["Techno", "House", "Sound System", "Quality"]),
            ("Moog", "Electronic Music Bar", "Raval", "Nightclub", false, 10.0, ["Electronic", "Intimate", "Daily", "Underground"]),
            ("Sutton Club Barcelona", "Upscale Nightclub", "Eixample", "Nightclub", true, 25.0, ["Upscale", "VIP", "Terrace", "Exclusive"]),
            ("Shoko Barcelona", "Beach Front Club", "Barceloneta", "Beach Club", true, 20.0, ["Beach", "Asian", "Restaurant", "Club"]),
            ("Macarena Club", "Underground Techno", "Sant Antoni", "Nightclub", true, 12.0, ["Techno", "Underground", "Red Light", "Intimate"]),
            ("Sala Plataforma", "Alternative Club", "Poblenou", "Nightclub", true, 15.0, ["Alternative", "Electronic", "Industrial", "Warehouse"]),
            ("CDLC Barcelona", "Carpe Diem Beach", "Barceloneta", "Beach Club", false, 0.0, ["Beach", "Lounge", "Restaurant", "Upscale"]),
            ("Eclipse Bar", "Rooftop Skybar", "Barceloneta", "Rooftop Bar", false, 0.0, ["Rooftop", "Skyline", "Luxury", "26th Floor"]),
            ("Bobby Gin", "Cocktail Bar", "Eixample", "Bar", false, 0.0, ["Cocktails", "Gin", "Upscale", "Extensive"]),
            ("Paradiso", "Speakeasy Bar", "Born", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Pastrami Bar", "Hidden"]),
            ("Dry Martini", "Classic Cocktail Bar", "Eixample", "Bar", false, 0.0, ["Cocktails", "Classic", "Upscale", "Historic"]),
            ("Two Schmucks", "Award-Winning Bar", "Born", "Bar", false, 0.0, ["Cocktails", "Award-Winning", "Fun", "Creative"]),
            ("Bóveda", "Cocktail Bar", "Raval", "Bar", false, 0.0, ["Cocktails", "Small", "Quality", "Hip"]),
            ("La Terrrazza", "Open Air Club", "Montjuïc", "Nightclub", true, 20.0, ["Open Air", "Summer", "Electronic", "Garden"]),
            ("Jamboree", "Jazz Club", "Gothic Quarter", "Jazz Club", false, 15.0, ["Jazz", "Live Music", "Historic", "Underground"]),
            ("Magic Club", "Gothic Quarter Club", "Gothic Quarter", "Nightclub", true, 15.0, ["Electronic", "Gothic", "Underground", "Multi-Room"]),
            ("Marula Café", "Funk & Soul", "Gothic Quarter", "Bar", false, 10.0, ["Funk", "Soul", "Dancing", "Small"]),
            ("Sidecar Factory Club", "Live Music & Club", "Gothic Quarter", "Music Venue", false, 12.0, ["Live Music", "Rock", "Underground", "Multi-Genre"]),
            ("Manchester", "Alternative Rock Bar", "Gothic Quarter", "Bar", false, 0.0, ["Rock", "Alternative", "Dive", "Music"]),
            ("Polaroid", "Raval Club", "Raval", "Nightclub", true, 10.0, ["Electronic", "Small", "Underground", "Alternative"]),
            ("Sala Upload", "Electronic Club", "Raval", "Nightclub", true, 12.0, ["Electronic", "Techno", "Underground", "Quality"]),
            ("La Fira", "Vintage Carnival Bar", "Poble Sec", "Bar", false, 0.0, ["Vintage", "Quirky", "Carnival", "Fun"]),
            ("Tinta Roja", "Tango Bar", "Poble Sec", "Bar", false, 10.0, ["Tango", "Retro", "Live Music", "Dancing"]),
            ("Bar Marsella", "Absinthe Bar", "Raval", "Bar", false, 0.0, ["Absinthe", "Historic", "1820", "Traditional"]),
            ("Ovella Negra", "Beer Hall", "Raval", "Beer Hall", false, 0.0, ["Beer", "Cheap", "Large", "Student"]),
            ("Nevermind", "Grunge Bar", "Gothic Quarter", "Bar", false, 0.0, ["Grunge", "Rock", "Alternative", "90s"]),
            ("Bar Muy Buenas", "Cocktail Bar", "Raval", "Bar", false, 0.0, ["Cocktails", "Eclectic", "Art", "Hip"]),
            ("Red58", "Vintage Tequila Bar", "Born", "Bar", false, 0.0, ["Tequila", "Mezcal", "Vintage", "Mexican"]),
            ("Espit Chupitos", "Shot Bar", "Gothic Quarter", "Bar", false, 0.0, ["Shots", "Party", "Flaming", "Touristy"]),
            ("Collage Art & Cocktail Social Club", "Art Bar", "Born", "Bar", false, 0.0, ["Art", "Cocktails", "Eclectic", "Quirky"]),
            ("Milk Bar & Bistro", "Brunch & Cocktails", "Gothic Quarter", "Bar", false, 0.0, ["Cocktails", "Brunch", "Retro", "Casual"]),
            ("Tandem Cocktail Bar", "Beach Cocktails", "Barceloneta", "Bar", false, 0.0, ["Beach", "Cocktails", "Terrace", "Sunset"]),
            ("Bananas Barcelona", "Beach Side Bar", "Barceloneta", "Bar", false, 0.0, ["Beach", "Cocktails", "Casual", "Terrace"]),
            ("Catwalk", "Marina Club", "Port Olímpic", "Nightclub", true, 20.0, ["Marina", "Upscale", "Terrace", "Electronic"]),
            ("Bling Bling", "Hip Hop Club", "Port Olímpic", "Nightclub", true, 20.0, ["Hip Hop", "R&B", "VIP", "Marina"]),
            ("Otto Zutz", "Three Floor Club", "Gràcia", "Nightclub", true, 20.0, ["Multi-Floor", "Upscale", "Mixed Music", "VIP"]),
            ("Luz de Gas", "Live Music Venue", "Gràcia", "Music Venue", false, 20.0, ["Live Music", "Jazz", "Soul", "Upscale"]),
            ("Metro Disco", "LGBTQ+ Club", "Eixample", "LGBTQ+ Club", true, 12.0, ["LGBTQ+", "Dancing", "Inclusive", "Multi-Room"]),
            ("Arena Madre", "LGBTQ+ Nightclub", "Eixample", "LGBTQ+ Club", true, 15.0, ["LGBTQ+", "VIP", "Large", "Dancing"]),
            ("Freeday", "Lesbian Bar", "Eixample", "LGBTQ+ Bar", false, 0.0, ["Lesbian", "LGBTQ+", "Small", "Friendly"]),
            ("Punto BCN", "LGBTQ+ Bar", "Eixample", "LGBTQ+ Bar", false, 0.0, ["LGBTQ+", "Bar", "Terrace", "Social"]),
            ("La Chapelle", "LGBTQ+ Bar", "Eixample", "LGBTQ+ Bar", false, 0.0, ["LGBTQ+", "Drag", "Shows", "Fun"]),
            ("Belushi's Barcelona", "Beach Sports Bar", "Barceloneta", "Sports Bar", false, 0.0, ["Sports", "Beach", "Beer", "Casual"]),
            ("Ideal Cocktail Bar", "Classic Bar", "Gothic Quarter", "Bar", false, 0.0, ["Cocktails", "Classic", "1931", "Historic"]),
            ("Garage Beer Co", "Craft Brewery", "Eixample", "Brewery", false, 0.0, ["Craft Beer", "Brewery", "Industrial", "Local"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "bcn-plan-\(String(format: "%03d", index + 1))",
                cityId: "bcn-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "EUR"
            )
        }
    }
}

// MARK: - Amsterdam Plans
extension MockDataService {
    private func createAmsterdamPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("De School", "24-Hour Clubbing", "Amsterdam West", "Nightclub", true, 15.0, ["24-Hour", "Techno", "School", "Garden"]),
            ("Shelter", "Underground Techno", "Amsterdam Noord", "Nightclub", true, 15.0, ["Techno", "Underground", "Bunker", "24-Hour"]),
            ("Radion", "Industrial Warehouse", "Amsterdam Noord", "Nightclub", true, 12.0, ["Warehouse", "Techno", "Industrial", "Garden"]),
            ("Claire", "Elegant Club", "Centrum", "Nightclub", true, 20.0, ["Elegant", "House", "Upscale", "Restaurant"]),
            ("Paradiso", "Church Nightclub", "Centrum", "Nightclub", true, 20.0, ["Church", "Historic", "Concert", "Multi-Genre"]),
            ("Melkweg", "Multi-Venue Complex", "Centrum", "Nightclub", true, 20.0, ["Multi-Room", "Concert", "Cinema", "Cultural"]),
            ("De Marktkantine", "Creative Hub", "Amsterdam West", "Nightclub", true, 10.0, ["Creative", "Alternative", "Art", "Food"]),
            ("Disco Dolly", "Vintage Nightclub", "Centrum", "Nightclub", true, 15.0, ["Vintage", "Disco", "Retro", "Fun"]),
            ("AIR Amsterdam", "Upscale Club", "Centrum", "Nightclub", true, 25.0, ["Upscale", "VIP", "Electronic", "Exclusive"]),
            ("Jimmy Woo", "Asian-Inspired Club", "Centrum", "Nightclub", true, 20.0, ["Asian", "Upscale", "Hip Hop", "Exclusive"]),
            ("Chicago Social Club", "House Music", "Centrum", "Nightclub", true, 15.0, ["House", "Electronic", "Dancing", "Quality"]),
            ("Canvas", "Rooftop Bar", "Oost", "Rooftop Bar", false, 0.0, ["Rooftop", "Views", "Hipster", "Cultural"]),
            ("A'DAM Lookout", "Sky Bar", "Amsterdam Noord", "Rooftop Bar", false, 0.0, ["Rooftop", "360 Views", "Swing", "Tower"]),
            ("SkyLounge Amsterdam", "Rooftop Cocktails", "Centrum", "Rooftop Bar", false, 0.0, ["Rooftop", "Cocktails", "Views", "Upscale"]),
            ("Bar Bukowski", "Literary Bar", "Oost", "Bar", false, 0.0, ["Literary", "Cocktails", "Hip", "Local"]),
            ("Tales & Spirits", "Cocktail Bar", "Centrum", "Bar", false, 0.0, ["Cocktails", "Award-Winning", "Creative", "Quality"]),
            ("Door 74", "Speakeasy", "Centrum", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Hidden", "Reservation"]),
            ("Hiding in Plain Sight", "Secret Bar", "Centrum", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Barbershop", "Hidden"]),
            ("Vesper Bar", "Classic Cocktails", "Centrum", "Bar", false, 0.0, ["Cocktails", "Classic", "James Bond", "Upscale"]),
            ("Café de Dokter", "Smallest Bar", "Centrum", "Bar", false, 0.0, ["Tiny", "Historic", "1798", "Jenever"]),
            ("Café 't Smalle", "Brown Café", "Jordaan", "Café", false, 0.0, ["Brown Café", "Historic", "Canal", "Traditional"]),
            ("Café de Tuin", "Jordaan Café", "Jordaan", "Café", false, 0.0, ["Local", "Cozy", "Traditional", "Beer"]),
            ("De Nieuwe Anita", "Art Bar", "West", "Bar", false, 0.0, ["Art", "Alternative", "Cultural", "Shows"]),
            ("Café Soundgarden", "Rock Bar", "West", "Bar", false, 0.0, ["Rock", "Alternative", "Music", "Dive"]),
            ("Café de Duivel", "Devil Café", "De Pijp", "Café", false, 0.0, ["Dive", "Cheap", "Local", "Beer"]),
            ("Checkpoint Charlie", "Rock Bar", "Centrum", "Bar", false, 0.0, ["Rock", "Dive", "Cheap", "Students"]),
            ("Bourbon Street", "Blues Bar", "Red Light District", "Bar", false, 15.0, ["Blues", "Jazz", "Live Music", "American"]),
            ("Bitterzoet", "Live Music Venue", "Centrum", "Music Venue", false, 15.0, ["Live Music", "DJ", "Alternative", "Mid-Size"]),
            ("OT301", "Squat Venue", "West", "Cultural Center", false, 5.0, ["Squat", "Alternative", "Art", "Political"]),
            ("OCCII", "Anarchist Venue", "West", "Cultural Center", false, 5.0, ["Punk", "Squat", "Alternative", "Political"]),
            ("Q-Factory", "Music Venue", "Oost", "Music Venue", true, 20.0, ["Concert", "Electronic", "Large", "Multi-Genre"]),
            ("Tolhuistuin", "Garden Venue", "Amsterdam Noord", "Cultural Center", false, 10.0, ["Garden", "Cultural", "Ferry", "Alternative"]),
            ("Pllek", "Beach Container Bar", "Amsterdam Noord", "Beach Bar", false, 0.0, ["Beach", "Containers", "Outdoor", "Ferry"]),
            ("Hanneke's Boom", "Canal Beach Bar", "Centrum", "Beach Bar", false, 0.0, ["Beach", "Canal", "Outdoor", "Summer"]),
            ("Blijburg", "Beach Club", "IJburg", "Beach Club", false, 0.0, ["Beach", "Outdoor", "Restaurant", "Summer"]),
            ("Roest", "Urban Beach", "Oost", "Beach Bar", false, 0.0, ["Urban Beach", "Rustic", "Outdoor", "Alternative"]),
            ("Café de Ceuvel", "Sustainable Bar", "Amsterdam Noord", "Bar", false, 0.0, ["Sustainable", "Alternative", "Garden", "Ferry"]),
            ("Noorderlicht Café", "Ferry Bar", "Amsterdam Noord", "Bar", false, 0.0, ["Ferry", "Garden", "Cultural", "Alternative"]),
            ("Trouw Amsterdam", "Closed Legend", "Oost", "Memory", false, 0.0, ["Closed", "Legendary", "Print House", "History"]),
            ("Studio 80", "Techno Club", "Centrum", "Nightclub", true, 15.0, ["Techno", "Underground", "Small", "Quality"]),
            ("De Kroepoek Fabriek", "Alternative Venue", "West", "Cultural Center", false, 5.0, ["Alternative", "Squat", "Art", "Underground"]),
            ("Prik", "LGBTQ+ Bar", "Centrum", "LGBTQ+ Bar", false, 0.0, ["LGBTQ+", "Cocktails", "Pink", "Fun"]),
            ("Church", "LGBTQ+ Club", "Centrum", "LGBTQ+ Club", true, 15.0, ["LGBTQ+", "Church", "Dancing", "Inclusive"]),
            ("Taboo Bar", "LGBTQ+ Bar", "Centrum", "LGBTQ+ Bar", false, 0.0, ["LGBTQ+", "Friendly", "Small", "Social"]),
            ("Café Montmartre", "Jazz Café", "Centrum", "Jazz Café", false, 0.0, ["Jazz", "Historic", "Basement", "Live Music"]),
            ("Bimhuis", "Jazz Venue", "Centrum", "Jazz Venue", false, 20.0, ["Jazz", "Modern", "Waterfront", "Quality"]),
            ("Muziekgebouw", "Classical & Modern", "Centrum", "Concert Hall", false, 25.0, ["Classical", "Modern", "Waterfront", "Upscale"]),
            ("Paradiso Noord", "North Location", "Amsterdam Noord", "Music Venue", true, 15.0, ["Concert", "Alternative", "Ferry", "Mid-Size"]),
            ("Het HEM", "Art Space", "Amsterdam Noord", "Cultural Center", false, 10.0, ["Art", "Cultural", "Former Factory", "Alternative"]),
            ("NDSM", "Cultural Terrain", "Amsterdam Noord", "Cultural Area", false, 0.0, ["Art", "Industrial", "Festivals", "Alternative"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "ams-plan-\(String(format: "%03d", index + 1))",
                cityId: "ams-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "EUR"
            )
        }
    }
}

// MARK: - Dubai Plans
extension MockDataService {
    private func createDubaiPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("WHITE Dubai", "Rooftop Super Club", "DIFC", "Nightclub", true, 300.0, ["Rooftop", "Luxury", "International DJs", "VIP"]),
            ("Base Dubai", "Desert Mega Club", "Dubai Design District", "Nightclub", true, 200.0, ["Mega Club", "Production", "International", "Desert"]),
            ("Soho Garden", "Outdoor Club", "Meydan", "Nightclub", true, 250.0, ["Outdoor", "Garden", "International DJs", "Large"]),
            ("1 OAK Dubai", "Luxury Nightclub", "DIFC", "Nightclub", true, 300.0, ["Luxury", "Celebrity", "VIP", "Exclusive"]),
            ("Cirque Le Soir", "Circus Nightclub", "Fairmont Dubai", "Nightclub", true, 250.0, ["Circus", "Performance", "Exclusive", "Unique"]),
            ("At.mosphere", "Burj Khalifa Bar", "Downtown Dubai", "Sky Bar", false, 0.0, ["Burj Khalifa", "122nd Floor", "Views", "Luxury"]),
            ("Mercury Lounge", "Rooftop Lounge", "Four Seasons DIFC", "Rooftop Bar", false, 0.0, ["Rooftop", "Skyline", "Sophisticated", "DIFC"]),
            ("Penthouse", "Beach Club", "Five Palm Jumeirah", "Beach Club", false, 150.0, ["Beach", "Pool", "DJ", "Luxury"]),
            ("Zero Gravity", "Beach Club", "Dubai Marina", "Beach Club", false, 100.0, ["Beach", "Water Sports", "DJ", "Fun"]),
            ("Nikki Beach Dubai", "Beach Club", "Pearl Jumeira", "Beach Club", true, 200.0, ["Beach", "International", "DJ", "Luxury"]),
            ("Barasti Beach", "Beach Bar", "Le Méridien Mina Seyahi", "Beach Bar", false, 0.0, ["Beach", "Sunset", "Casual", "Sports"]),
            ("CÉ LA VI Dubai", "Rooftop Club", "Address Sky View", "Rooftop Club", false, 150.0, ["Rooftop", "Asian", "Views", "Upscale"]),
            ("Toy Room Dubai", "Playroom Club", "The Meydan Hotel", "Nightclub", true, 200.0, ["Playroom", "Hip Hop", "Eccentric", "VIP"]),
            ("Ushuaïa Dubai", "Beach Club", "Atlantis The Royal", "Beach Club", true, 250.0, ["Beach", "Ibiza Style", "International DJs", "Luxury"]),
            ("Billionaire Dubai", "Italian Luxury Club", "Taj Dubai", "Nightclub", true, 300.0, ["Italian", "Luxury", "VIP", "Exclusive"]),
            ("Drai's Dubai", "Rooftop Pool Party", "One Za'abeel", "Rooftop Club", true, 300.0, ["Rooftop", "Pool", "International", "Luxury"]),
            ("The Penthouse", "Three-Floor Club", "FIVE Palm Jumeirah", "Nightclub", true, 200.0, ["Multi-Floor", "Pool", "Beach", "Luxury"]),
            ("Provocateur Dubai", "Burlesque Club", "FIVE Palm Jumeirah", "Nightclub", true, 250.0, ["Burlesque", "Cabaret", "Performance", "Upscale"]),
            ("Iris Dubai", "Rooftop Lounge", "Oberoi Dubai", "Rooftop Bar", false, 0.0, ["Rooftop", "Skyline", "Cocktails", "Sophisticated"]),
            ("Starlite Lounge", "Rooftop Bar", "JW Marriott Marquis", "Rooftop Bar", false, 0.0, ["Rooftop", "Views", "Live Music", "Upscale"]),
            ("Treehouse Dubai", "Rooftop Lounge", "Taj Dubai", "Rooftop Bar", false, 0.0, ["Rooftop", "DIFC", "Trendy", "Skyline"]),
            ("Candypants", "Quirky Club", "FIVE Palm Jumeirah", "Nightclub", true, 150.0, ["Quirky", "Fun", "Eccentric", "Pool"]),
            ("Blue Marlin Ibiza UAE", "Beach Club", "Ghantoot", "Beach Club", false, 200.0, ["Beach", "Ibiza", "International DJs", "Abu Dhabi Border"]),
            ("Nasimi Beach", "Beach Club", "Atlantis The Palm", "Beach Club", false, 100.0, ["Beach", "Atlantis", "DJ", "Pool"]),
            ("AKA Dubai", "Rooftop Lounge", "Armani Hotel", "Rooftop Bar", false, 0.0, ["Rooftop", "Burj Khalifa", "Armani", "Upscale"]),
            ("Siddharta Lounge", "Buddha Bar Concept", "Grosvenor House", "Lounge", false, 0.0, ["Asian", "Buddha Bar", "Upscale", "Marina"]),
            ("Gold On 27", "Rooftop Lounge", "Burj Al Arab", "Rooftop Bar", false, 0.0, ["Burj Al Arab", "27th Floor", "Luxury", "Exclusive"]),
            ("Skyview Bar", "Burj Al Arab Bar", "Burj Al Arab", "Bar", false, 0.0, ["Burj Al Arab", "Views", "Luxury", "Iconic"]),
            ("Industrial Avenue", "Industrial Venue", "Alserkal Avenue", "Cultural Venue", false, 50.0, ["Industrial", "Art", "Alternative", "Cultural"]),
            ("The Eloquent Elephant", "Indie Bar", "Taj Dubai", "Bar", false, 0.0, ["Indie", "Quirky", "Cocktails", "Hip"]),
            ("Lock Stock & Barrel", "British Gastropub", "JBR", "Pub", false, 0.0, ["British", "Pub", "Live Music", "Casual"]),
            ("McGettigan's", "Irish Pub", "Multiple Locations", "Pub", false, 0.0, ["Irish", "Pub", "Live Music", "Casual"]),
            ("Stereo Arcade", "Retro Gaming Bar", "Dubai Marina", "Bar", false, 0.0, ["Retro", "Gaming", "Arcade", "Fun"]),
            ("The Tap House", "Craft Beer", "Dubai Marina", "Bar", false, 0.0, ["Craft Beer", "Sports", "Casual", "Marina"]),
            ("Belgian Beer Café", "Belgian Bar", "Multiple Locations", "Bar", false, 0.0, ["Belgian", "Beer", "Casual", "Food"]),
            ("Jetty Lounge", "Beach Bar", "One&Only The Palm", "Beach Bar", false, 0.0, ["Beach", "Sunset", "Upscale", "Palm"]),
            ("101 Lounge & Bar", "Marina Lounge", "One&Only The Palm", "Lounge", false, 0.0, ["Marina", "Sophisticated", "Palm", "Upscale"]),
            ("Mint Leaf of London", "Indian Lounge", "DIFC", "Lounge", false, 0.0, ["Indian", "Upscale", "Restaurant", "DIFC"]),
            ("Zuma Dubai", "Japanese Lounge", "DIFC", "Lounge", false, 0.0, ["Japanese", "Upscale", "Scene", "DIFC"]),
            ("Cavalli Club", "Fashion Nightclub", "Fairmont Dubai", "Nightclub", true, 250.0, ["Fashion", "Luxury", "Italian", "Exclusive"]),
            ("Armani/Privé", "Luxury Club", "Burj Khalifa", "Nightclub", true, 300.0, ["Luxury", "Burj Khalifa", "Armani", "Exclusive"]),
            ("VIP Room Dubai", "French Luxury Club", "Rixos The Palm", "Nightclub", true, 250.0, ["French", "Luxury", "VIP", "Beach"]),
            ("Cove Beach", "Beach Club", "Bluewaters Island", "Beach Club", false, 100.0, ["Beach", "Pool", "DJ", "Bluewaters"]),
            ("Azure Beach", "Beach Club", "Rixos The Palm", "Beach Club", false, 150.0, ["Beach", "Pool", "DJ", "Palm"]),
            ("Drift Beach Dubai", "Beach Club", "One&Only Royal Mirage", "Beach Club", false, 150.0, ["Beach", "Bohemian", "DJ", "Sunset"]),
            ("Lucia's", "Italian Restaurant Bar", "DIFC", "Restaurant Bar", false, 0.0, ["Italian", "Scene", "DIFC", "Upscale"]),
            ("Asia Asia", "Pan-Asian Bar", "Pier 7", "Restaurant Bar", false, 0.0, ["Asian", "Marina", "Rooftop", "Upscale"]),
            ("Maiden Shanghai", "Chinese Lounge", "Pier 7", "Lounge", false, 0.0, ["Chinese", "Marina", "Sophisticated", "Upscale"]),
            ("STK Dubai", "Steakhouse Lounge", "JBR", "Restaurant Bar", false, 0.0, ["Steakhouse", "Scene", "DJ", "Upscale"]),
            ("Lucky Voice", "Karaoke Lounge", "Souk Madinat Jumeirah", "Karaoke", false, 100.0, ["Karaoke", "Private Rooms", "Fun", "Upscale"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "dxb-plan-\(String(format: "%03d", index + 1))",
                cityId: "dxb-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "AED"
            )
        }
    }
}

// MARK: - Madrid Plans
extension MockDataService {
    private func createMadridPlans() -> [Plan] {
        let venues: [(String, String, String, String, Bool, Double, [String])] = [
            ("Teatro Kapital", "7-Floor Megaclub Experience", "Atocha", "Nightclub", false, 20.0, ["Nightclub", "7 Floors", "Electronic", "Hip Hop"]),
            ("Corral de la Morería", "Authentic Flamenco Show", "La Latina", "Flamenco", false, 45.0, ["Flamenco", "Live Music", "Traditional", "Dinner"]),
            ("Tupperware Club", "Alternative Underground Scene", "Malasaña", "Nightclub", false, 15.0, ["Alternative", "Indie", "DJ", "Underground"]),
            ("Ojalá", "Beach Bar in the City", "Malasaña", "Bar", false, 0.0, ["Beach Bar", "Cocktails", "Unique", "Sand Floor"]),
            ("Café Central", "Jazz in the Heart of Madrid", "Sol", "Jazz Club", false, 25.0, ["Jazz", "Live Music", "Classic", "Intimate"]),
            ("Joy Eslava", "Historic Nightclub Since 1981", "Centro", "Nightclub", true, 18.0, ["Historic", "Disco", "Dancing", "Iconic"]),
            ("Sala El Sol", "Indie and Alternative Music", "Gran Vía", "Live Music", false, 15.0, ["Indie", "Alternative", "Live Bands", "Rock"]),
            ("Círculo de Bellas Artes", "Rooftop Cultural Bar", "Centro", "Rooftop Bar", false, 0.0, ["Rooftop", "Views", "Cultural", "Cocktails"]),
            ("Cardamomo", "Flamenco in Huertas", "Huertas", "Flamenco", false, 35.0, ["Flamenco", "Traditional", "Tablao", "Intimate"]),
            ("Fabrik", "Massive Electronic Music Club", "Humanes", "Nightclub", true, 25.0, ["Electronic", "Techno", "Warehouse", "Large"]),
            ("Mondo Disko", "70s and 80s Party", "Malasaña", "Disco", false, 10.0, ["Retro", "Disco", "70s", "80s"]),
            ("Cool", "Indie and Alternative DJ Sets", "Malasaña", "Nightclub", false, 12.0, ["Indie", "Alternative", "DJ", "Hipster"]),
            ("Bash Line", "Electronic and House Music", "Chueca", "Nightclub", false, 15.0, ["Electronic", "House", "DJ", "Dancing"]),
            ("La Riviera", "Concert Hall and Club", "Arganzuela", "Concert Hall", true, 30.0, ["Live Music", "Concerts", "Clubbing", "Large"]),
            ("Café La Palma", "Live Music and DJ Sets", "Malasaña", "Live Music", false, 10.0, ["Live Music", "DJ", "Indie", "Eclectic"]),
            ("Costello Café & Niteclub", "Indie Rock Dancing", "Centro", "Nightclub", false, 12.0, ["Indie Rock", "Dancing", "DJ", "Alternative"]),
            ("Museo Chicote", "Historic Cocktail Bar", "Gran Vía", "Cocktail Bar", false, 0.0, ["Cocktails", "Historic", "Classic", "Elegant"]),
            ("Gau & Café", "Quirky Alternative Bar", "Malasaña", "Bar", false, 0.0, ["Quirky", "Alternative", "Artsy", "Casual"]),
            ("El Juglar", "Live Music Venue", "Centro", "Live Music", false, 10.0, ["Live Music", "Rock", "Indie", "Small Venue"]),
            ("Wurlitzer Ballroom", "Rockabilly and Vintage", "Centro", "Dance Club", true, 15.0, ["Rockabilly", "Vintage", "50s", "Dancing"]),
            ("Contraclub", "Electronic Underground", "Centro", "Nightclub", false, 12.0, ["Electronic", "Underground", "DJ", "Techno"]),
            ("Independance Club", "Pop Rock Dancing", "Malasaña", "Nightclub", true, 15.0, ["Pop Rock", "Dancing", "Party", "Fun"]),
            ("The Passenger", "Cocktail Bar", "Barrio de las Letras", "Cocktail Bar", false, 0.0, ["Cocktails", "Craft", "Cozy", "Speakeasy"]),
            ("Salmon Guru", "Award-Winning Cocktails", "Salamanca", "Cocktail Bar", false, 0.0, ["Cocktails", "Craft", "Award-Winning", "Creative"]),
            ("Macera", "Botanical Cocktails", "Barrio de las Letras", "Cocktail Bar", false, 0.0, ["Cocktails", "Botanical", "Unique", "Artisan"]),
            ("1862 Dry Bar", "Prohibition Era Cocktails", "Chueca", "Speakeasy", false, 0.0, ["Speakeasy", "Cocktails", "Prohibition", "Classic"]),
            ("Sala Cats", "Electronic and House Music", "Centro", "Nightclub", false, 15.0, ["Electronic", "House", "DJ", "Dancing"]),
            ("Moby Dick Club", "Rock and Alternative Concerts", "Chamberí", "Concert Hall", true, 25.0, ["Rock", "Alternative", "Concerts", "Live Music"]),
            ("Sala But", "Electronic and Techno", "Arganzuela", "Nightclub", false, 15.0, ["Electronic", "Techno", "DJ", "Underground"]),
            ("New Garamond", "LGBTQ+ Nightclub", "Chueca", "Nightclub", false, 12.0, ["LGBTQ+", "Dancing", "Pop", "Inclusive"]),
            ("Shôko Madrid", "Asian Fusion Restaurant & Club", "Retiro", "Nightclub", true, 20.0, ["Asian", "Restaurant", "Clubbing", "Upscale"]),
            ("Gotham Club", "Hip Hop and R&B", "Centro", "Nightclub", true, 18.0, ["Hip Hop", "R&B", "Urban", "Dancing"]),
            ("Opium Madrid", "Beach Club Atmosphere", "Centro", "Nightclub", true, 20.0, ["Beach Club", "Cocktails", "Dancing", "Upscale"]),
            ("Sala Mon Live", "Live Bands and DJ Sets", "Gran Vía", "Live Music", false, 15.0, ["Live Music", "Bands", "DJ", "Eclectic"]),
            ("Nazca", "Fusion of Music Styles", "Centro", "Nightclub", true, 15.0, ["Fusion", "DJ", "Dancing", "Diverse"]),
            ("Teatro Barceló", "Iconic Madrid Nightclub", "Centro", "Nightclub", true, 20.0, ["Iconic", "Dancing", "DJ", "Historic"]),
            ("El Despertar", "Chill Lounge Bar", "Malasaña", "Lounge", false, 0.0, ["Lounge", "Chill", "Cocktails", "Relaxed"]),
            ("La Boca del Lobo", "Cocktails and DJ", "Barrio de las Letras", "Cocktail Bar", false, 0.0, ["Cocktails", "DJ", "Cozy", "Intimate"]),
            ("Gabana 1800", "Elegant Nightclub", "Retiro", "Nightclub", true, 25.0, ["Elegant", "Upscale", "DJ", "VIP"]),
            ("Charada", "80s and 90s Music", "Arganzuela", "Disco", false, 12.0, ["80s", "90s", "Retro", "Dancing"]),
            ("Palacio de Gaviria", "Palace Nightclub", "Sol", "Nightclub", true, 18.0, ["Palace", "Historic", "Elegant", "Dancing"]),
            ("Coppelia", "Cocktails and Tapas", "Malasaña", "Cocktail Bar", false, 0.0, ["Cocktails", "Tapas", "Cozy", "Casual"]),
            ("La Vía Láctea", "Classic Madrid Nightlife", "Malasaña", "Bar", false, 0.0, ["Classic", "Casual", "Historic", "Drinks"]),
            ("El Perro de la Parte de Atrás del Coche", "Quirky Rock Bar", "Malasaña", "Bar", false, 0.0, ["Rock", "Quirky", "Casual", "Music"]),
            ("Tempo Club", "Electronic Music Venue", "Centro", "Nightclub", false, 15.0, ["Electronic", "DJ", "Techno", "Underground"]),
            ("Sala Changó", "Afrobeat and World Music", "Lavapiés", "Live Music", false, 12.0, ["Afrobeat", "World Music", "Live Bands", "Dancing"]),
            ("Gruta 77", "Underground Alternative Venue", "Cuatro Caminos", "Live Music", false, 10.0, ["Underground", "Alternative", "Live Music", "Indie"]),
            ("Museo del Ron", "Rum Bar with Live Music", "Chamberí", "Bar", false, 0.0, ["Rum", "Cocktails", "Live Music", "Latin"]),
            ("Thundercat Club", "Rock and Metal", "Centro", "Nightclub", false, 12.0, ["Rock", "Metal", "Live Music", "Alternative"]),
            ("Siroco", "Electronic and DJ Culture", "Centro", "Nightclub", false, 15.0, ["Electronic", "DJ", "Techno", "House"])
        ]

        return venues.enumerated().map { index, venue in
            createPlan(
                id: "mad-plan-\(String(format: "%03d", index + 1))",
                cityId: "mad-001",
                venueName: venue.0,
                title: venue.1,
                neighborhood: venue.2,
                category: venue.3,
                isWeekend: venue.4,
                entryFee: venue.5,
                tags: venue.6,
                rank: index < 10 ? index + 1 : nil,
                currency: "EUR"
            )
        }
    }
}

// MARK: - Helper Method
extension MockDataService {
    private func createPlan(
        id: String,
        cityId: String,
        venueName: String,
        title: String,
        neighborhood: String,
        category: String,
        isWeekend: Bool,
        entryFee: Double,
        tags: [String],
        rank: Int?,
        currency: String
    ) -> Plan {
        let imageUrls = [
            "https://images.unsplash.com/photo-1514933651103-005eec06c04b",
            "https://images.unsplash.com/photo-1566737236500-c8ac43014a67"
        ]

        let dayOfWeek = isWeekend ? "Saturday" : "Friday"
        let date = isWeekend ? "2025-12-28T22:00:00Z" : "2025-12-27T20:00:00Z"

        // Generate a description based on the venue and category
        let description = generateDescription(venueName: venueName, category: category, neighborhood: neighborhood, tags: tags)

        // Map cityId to city name
        let cityName = mapCityIdToName(cityId)

        return Plan(
            id: id,
            title: title,
            venueName: venueName,
            category: category,
            description: description,
            cityName: cityName,
            images: imageUrls,
            location: Plan.Location(
                address: "\(neighborhood), \(cityId)",
                neighborhood: neighborhood,
                coordinates: Plan.Location.Coordinates(latitude: 0.0, longitude: 0.0)
            ),
            schedule: Plan.Schedule(
                date: date,
                startTime: "20:00",
                endTime: "02:00",
                dayOfWeek: dayOfWeek,
                isWeekend: isWeekend
            ),
            pricing: Plan.Pricing(
                entryFee: entryFee,
                currency: currency,
                priceRange: entryFee == 0 ? "Free" : entryFee < 20 ? "$" : entryFee < 40 ? "$$" : "$$$"
            ),
            aiTags: tags,
            flags: Plan.PlanFlags(
                isWeekendPlan: isWeekend,
                requiresReservation: entryFee > 50,
                ageRestriction: 21,
                rank: rank
            )
        )
    }

    private func generateDescription(venueName: String, category: String, neighborhood: String, tags: [String]) -> String {
        let tagsList = tags.prefix(3).joined(separator: ", ")
        switch category.lowercased() {
        case "live music", "jazz club":
            return "Experience incredible live performances at \(venueName) in \(neighborhood). Known for \(tagsList), this venue offers an unforgettable night of music and atmosphere."
        case "rooftop bar", "rooftop":
            return "Enjoy stunning views and expertly crafted cocktails at \(venueName). Located in \(neighborhood), this rooftop venue is perfect for \(tagsList)."
        case "nightclub", "club":
            return "Dance the night away at \(venueName) in \(neighborhood). This hotspot is known for \(tagsList) and keeps the energy going until the early hours."
        case "cocktail bar", "bar":
            return "Discover craft cocktails and a sophisticated atmosphere at \(venueName) in \(neighborhood). Perfect for \(tagsList)."
        case "speakeasy":
            return "Step back in time at \(venueName), a hidden gem in \(neighborhood). Experience the thrill of \(tagsList) in an intimate setting."
        default:
            return "Explore \(venueName) in \(neighborhood) for an unforgettable experience. Known for \(tagsList), this is a must-visit destination."
        }
    }

    private func mapCityIdToName(_ cityId: String) -> String {
        switch cityId.lowercased() {
        case "nyc", "nyc-001":
            return "New York"
        case "la", "la-001":
            return "Los Angeles"
        case "mia", "mia-001":
            return "Miami"
        case "chi", "chi-001":
            return "Chicago"
        case "lon", "lon-001":
            return "London"
        case "tyo", "tyo-001":
            return "Tokyo"
        case "par", "par-001":
            return "Paris"
        case "ber", "ber-001":
            return "Berlin"
        default:
            return cityId.capitalized
        }
    }
}
