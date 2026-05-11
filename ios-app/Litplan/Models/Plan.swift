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
    let description: String
    let cityName: String
    let images: [String]
    let location: Location
    let schedule: Schedule
    let pricing: Pricing
    let aiTags: [String]
    let flags: PlanFlags

    // Computed property for convenience
    var planId: String { id }

    // MARK: - Custom Decoder for Backward Compatibility

    enum CodingKeys: String, CodingKey {
        case id, title, venueName, category, description, cityName
        case images, location, schedule, pricing, aiTags, flags
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        venueName = try container.decode(String.self, forKey: .venueName)
        category = try container.decode(String.self, forKey: .category)
        images = try container.decode([String].self, forKey: .images)
        location = try container.decode(Location.self, forKey: .location)
        schedule = try container.decode(Schedule.self, forKey: .schedule)
        pricing = try container.decode(Pricing.self, forKey: .pricing)
        aiTags = try container.decode([String].self, forKey: .aiTags)
        flags = try container.decode(PlanFlags.self, forKey: .flags)

        // Optional fields with fallback defaults for backward compatibility
        description = try container.decodeIfPresent(String.self, forKey: .description)
            ?? "Discover this amazing \(category.lowercased()) experience at \(venueName)."
        cityName = try container.decodeIfPresent(String.self, forKey: .cityName) ?? ""
    }

    // Standard initializer for direct creation
    init(
        id: String,
        title: String,
        venueName: String,
        category: String,
        description: String,
        cityName: String,
        images: [String],
        location: Location,
        schedule: Schedule,
        pricing: Pricing,
        aiTags: [String],
        flags: PlanFlags
    ) {
        self.id = id
        self.title = title
        self.venueName = venueName
        self.category = category
        self.description = description
        self.cityName = cityName
        self.images = images
        self.location = location
        self.schedule = schedule
        self.pricing = pricing
        self.aiTags = aiTags
        self.flags = flags
    }

    // MARK: - Weekly Plan System Computed Properties (Sprint 14)

    /// Whether this plan is an event (vs a permanent venue)
    var isEvent: Bool { schedule.isEvent ?? false }

    /// Whether this plan is a recurring/permanent venue
    var isRecurringVenue: Bool { !isEvent }

    /// The week this plan belongs to (e.g., "2026-W01")
    var yearWeek: String? { schedule.yearWeek }

    /// The week number (1-52)
    var weekNumber: Int? { schedule.weekNumber }

    /// Computed day of week derived from the actual ISO date (single source of truth)
    /// This ensures the day displayed always matches the actual date, regardless of what dayOfWeek field contains
    var computedDayOfWeek: String {
        // Handle various date formats from database
        let dateString = schedule.date
        var parsedDate: Date?

        // Try ISO 8601 with full datetime (e.g., "2026-01-04T21:00:00Z")
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime, .withTimeZone]
        parsedDate = isoFormatter.date(from: dateString)

        // Try ISO 8601 without timezone (e.g., "2026-01-04T21:00:00")
        if parsedDate == nil {
            isoFormatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
            parsedDate = isoFormatter.date(from: dateString)
        }

        // Try simple date format (e.g., "2026-01-04") - most common in our database
        if parsedDate == nil {
            let simpleFormatter = DateFormatter()
            simpleFormatter.dateFormat = "yyyy-MM-dd"
            simpleFormatter.timeZone = TimeZone(identifier: "UTC")
            parsedDate = simpleFormatter.date(from: dateString)
        }

        // If we successfully parsed the date, get the day of week
        if let date = parsedDate {
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "EEEE"
            dayFormatter.locale = Locale(identifier: "en_US_POSIX")  // Force English day names for consistent filtering
            dayFormatter.timeZone = TimeZone(identifier: "UTC")
            return dayFormatter.string(from: date)
        }

        // Fallback to stored value if parsing fails
        return schedule.dayOfWeek
    }

    // MARK: - Computed Properties for Display

    /// Calculate duration from start and end times
    var durationMinutes: Int {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        guard let start = formatter.date(from: schedule.startTime),
              let end = formatter.date(from: schedule.endTime) else {
            return 0
        }
        var duration = Calendar.current.dateComponents([.minute], from: start, to: end).minute ?? 0
        // Handle overnight events (end time is next day)
        if duration < 0 {
            duration += 24 * 60
        }
        return duration
    }

    /// Formatted duration string (e.g., "2h 30m")
    var formattedDuration: String {
        let hours = durationMinutes / 60
        let minutes = durationMinutes % 60
        if hours == 0 {
            return "\(minutes)m"
        } else if minutes == 0 {
            return "\(hours)h"
        } else {
            return "\(hours)h \(minutes)m"
        }
    }

    /// Formatted time range (e.g., "9:00 PM - 11:30 PM")
    var formattedTimeRange: String {
        func formatTo12Hour(_ time: String) -> String {
            let components = time.split(separator: ":")
            guard let hour = Int(components.first ?? "") else { return time }
            let period = hour >= 12 ? "PM" : "AM"
            let displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
            let minutes = components.count > 1 ? String(components[1]) : "00"
            return "\(displayHour):\(minutes) \(period)"
        }
        return "\(formatTo12Hour(schedule.startTime)) - \(formatTo12Hour(schedule.endTime))"
    }

    /// Formatted date (e.g., "Saturday, Dec 28")
    /// Uses UTC timezone to prevent off-by-one-day errors across timezones
    var formattedDate: String {
        let dateString = schedule.date
        var parsedDate: Date?

        // Try ISO 8601 with full datetime (e.g., "2026-01-04T21:00:00Z")
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime, .withTimeZone]
        parsedDate = isoFormatter.date(from: dateString)

        // Try ISO 8601 without timezone
        if parsedDate == nil {
            isoFormatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
            parsedDate = isoFormatter.date(from: dateString)
        }

        // Try simple date format (e.g., "2026-01-04") - most common in our database
        if parsedDate == nil {
            let simpleFormatter = DateFormatter()
            simpleFormatter.dateFormat = "yyyy-MM-dd"
            simpleFormatter.timeZone = TimeZone(identifier: "UTC")
            parsedDate = simpleFormatter.date(from: dateString)
        }

        guard let date = parsedDate else {
            // Fallback to computed day of week for consistency
            return computedDayOfWeek
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "EEEE, MMM d"
        displayFormatter.timeZone = TimeZone(identifier: "UTC")  // Use UTC to prevent timezone shifts
        return displayFormatter.string(from: date)
    }

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

        // Weekly Plan System Fields (Sprint 14)
        let weekNumber: Int?
        let yearWeek: String?       // Format: "2026-W01"
        let isEvent: Bool?          // True for weekly events, false for permanent venues
        let eventDate: String?      // Specific date if this is an event

        // Default values for backward compatibility
        enum CodingKeys: String, CodingKey {
            case date, startTime, endTime, dayOfWeek, isWeekend
            case weekNumber, yearWeek, isEvent, eventDate
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            date = try container.decode(String.self, forKey: .date)
            startTime = try container.decode(String.self, forKey: .startTime)
            endTime = try container.decode(String.self, forKey: .endTime)
            dayOfWeek = try container.decode(String.self, forKey: .dayOfWeek)
            isWeekend = try container.decode(Bool.self, forKey: .isWeekend)
            // Optional new fields
            weekNumber = try container.decodeIfPresent(Int.self, forKey: .weekNumber)
            yearWeek = try container.decodeIfPresent(String.self, forKey: .yearWeek)
            isEvent = try container.decodeIfPresent(Bool.self, forKey: .isEvent)
            eventDate = try container.decodeIfPresent(String.self, forKey: .eventDate)
        }

        init(
            date: String,
            startTime: String,
            endTime: String,
            dayOfWeek: String,
            isWeekend: Bool,
            weekNumber: Int? = nil,
            yearWeek: String? = nil,
            isEvent: Bool? = nil,
            eventDate: String? = nil
        ) {
            self.date = date
            self.startTime = startTime
            self.endTime = endTime
            self.dayOfWeek = dayOfWeek
            self.isWeekend = isWeekend
            self.weekNumber = weekNumber
            self.yearWeek = yearWeek
            self.isEvent = isEvent
            self.eventDate = eventDate
        }
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
        description: "Experience world-class jazz at NYC's most legendary jazz club. The Blue Note has hosted the greatest names in jazz since 1981, offering an intimate setting where you can enjoy exceptional live performances while sipping craft cocktails. Perfect for music lovers seeking an authentic New York experience.",
        cityName: "New York",
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
        description: "Watch the sun set over Manhattan from one of the city's most stunning rooftop venues. The Roof at PUBLIC offers panoramic views, expertly crafted cocktails, and a sophisticated atmosphere. Arrive early to grab the best seats and stay for the transition into night as the city lights come alive.",
        cityName: "New York",
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
        description: "End your night at Le Bain, the iconic rooftop nightclub at The Standard High Line. Known for its eclectic DJ sets, stunning city views, and legendary hot tub on the dance floor, Le Bain offers an unforgettable late-night experience. Dress to impress and get ready to dance until dawn.",
        cityName: "New York",
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

    /// Sample weekend plans
    static let sampleWeekendPlans: [Plan] = [
        sampleBlueNote,
        sampleLeBain
    ]
}
