//
//  OnboardingPage.swift
//  Litplan
//
//  App Name: LitPlanz
//  Onboarding page model and data
//

import SwiftUI

/// Model representing a single onboarding page
struct OnboardingPage: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let description: String
    let systemIcon: String?
    let emoji: String?
    let accentColor: Color
    let isProPage: Bool
    let isFinalPage: Bool

    init(
        title: String,
        subtitle: String,
        description: String,
        systemIcon: String? = nil,
        emoji: String? = nil,
        accentColor: Color = .accentPrimary,
        isProPage: Bool = false,
        isFinalPage: Bool = false
    ) {
        self.title = title
        self.subtitle = subtitle
        self.description = description
        self.systemIcon = systemIcon
        self.emoji = emoji
        self.accentColor = accentColor
        self.isProPage = isProPage
        self.isFinalPage = isFinalPage
    }
}

/// Static onboarding pages data
extension OnboardingPage {
    static let pages: [OnboardingPage] = [
        // Page 1: Welcome
        OnboardingPage(
            title: "Welcome to LitPlanz",
            subtitle: "Your Night Out, Perfected",
            description: "AI-powered nightlife discovery that curates the perfect venues, plans, and experiences just for you.",
            emoji: "🌃",
            accentColor: .accentPrimary
        ),

        // Page 2: Explore Cities
        OnboardingPage(
            title: "100+ Cities Worldwide",
            subtitle: "Explore Anywhere",
            description: "From New York to Tokyo, Miami to Berlin — discover the hottest bars, clubs, and restaurants in cities across the globe.",
            systemIcon: "globe.americas.fill",
            accentColor: Color(red: 0.2, green: 0.6, blue: 1.0)
        ),

        // Page 3: Vibez
        OnboardingPage(
            title: "Match Your Mood",
            subtitle: "Vibez Mode",
            description: "Chill rooftop drinks? High-energy dancing? Romantic dinner? Tell us your vibe and get instant, personalized recommendations.",
            emoji: "⚡",
            accentColor: Color(red: 0.95, green: 0.5, blue: 0.2)
        ),

        // Page 4: Group Flows
        OnboardingPage(
            title: "Plan the Perfect Night",
            subtitle: "Group Flows",
            description: "Multi-stop itineraries from dinner to drinks to dancing. See time estimates, walking routes, and costs — all planned for you.",
            systemIcon: "point.topleft.down.to.point.bottomright.curvepath.fill",
            accentColor: Color(red: 0.3, green: 0.85, blue: 0.6)
        ),

        // Page 5: Pro Benefits
        OnboardingPage(
            title: "Unlock Everything",
            subtitle: "LitPlanz Pro",
            description: "Get unlimited plans, access all 100+ cities, unlock all vibes, and enjoy priority features with Pro.",
            systemIcon: "crown.fill",
            accentColor: Color(red: 1.0, green: 0.75, blue: 0.2),
            isProPage: true
        ),

        // Page 6: Get Started
        OnboardingPage(
            title: "You're All Set!",
            subtitle: "Let's Go",
            description: "Start exploring and discover your perfect night out. Your next unforgettable experience awaits.",
            emoji: "🎉",
            accentColor: .accentPrimary,
            isFinalPage: true
        )
    ]
}
