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

        // Page 2: Vibez Mode
        OnboardingPage(
            title: "Pick a Vibe, Build Your Night",
            subtitle: "Your Night Starts Here",
            description: "Choose a city, pick a mood — AI builds your perfect night out. From rooftop drinks to late-night dancing, your night is one tap away. Email members get one free Vibez every week.",
            emoji: "⚡",
            accentColor: Color(red: 0.95, green: 0.5, blue: 0.2)
        ),

        // Page 3: Your Plans
        OnboardingPage(
            title: "Your Plans, Saved",
            subtitle: "Save Everything",
            description: "Every Vibez you generate can be saved to your plans. Cities, itineraries, group flows — all in one place, ready when you are.",
            systemIcon: "heart.fill",
            accentColor: Color(red: 0.3, green: 0.85, blue: 0.6)
        ),

        // Page 4: Pro Benefits
        OnboardingPage(
            title: "Unlock Everything",
            subtitle: "LitPlanz Pro",
            description: "Get 7 Vibez/week, access all 100+ cities, unlock every vibe theme, and enjoy priority features with Pro.",
            systemIcon: "crown.fill",
            accentColor: Color(red: 1.0, green: 0.75, blue: 0.2),
            isProPage: true
        ),

        // Page 5: Get Started
        OnboardingPage(
            title: "You're All Set!",
            subtitle: "Let's Go",
            description: "Your first Vibez is waiting. Pick a city, choose your mood, and let AI plan your night.",
            emoji: "🎉",
            accentColor: .accentPrimary,
            isFinalPage: true
        )
    ]
}
