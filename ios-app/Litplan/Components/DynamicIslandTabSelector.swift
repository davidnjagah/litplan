//
//  DynamicIslandTabSelector.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/12/26.
//  Sprint 15 - Theme Selector with Flowing Layout and Island Spread Animation
//
//  FIX: Collapsed pill is ALWAYS rendered to maintain HStack layout stability.
//  Expanded content is overlaid separately and doesn't affect the pill's position.
//

import SwiftUI

/// Theme tags for group plan suggestions
struct ThemeTag: Identifiable, Equatable {
    let id = UUID()
    let name: String

    /// 26 curated theme suggestions with in-depth definitions for AI
    static let suggestions: [ThemeTag] = [
        ThemeTag(name: "Nightlife"),
        ThemeTag(name: "Date Night"),
        ThemeTag(name: "Bar Hopping"),
        ThemeTag(name: "Live Music"),
        ThemeTag(name: "Foodie"),
        ThemeTag(name: "Brunch"),
        ThemeTag(name: "Jazz"),
        ThemeTag(name: "Afro House"),
        ThemeTag(name: "Rooftop"),
        ThemeTag(name: "Afro Beats"),
        ThemeTag(name: "Adventure"),
        ThemeTag(name: "Chill"),
        ThemeTag(name: "Culture"),
        ThemeTag(name: "Comedy"),
        ThemeTag(name: "Cocktails"),
        ThemeTag(name: "Dancing"),
        ThemeTag(name: "Sunset"),
        ThemeTag(name: "Art"),
        ThemeTag(name: "Wine"),
        ThemeTag(name: "Beach"),
        ThemeTag(name: "Party"),
        ThemeTag(name: "Speakeasy"),
        ThemeTag(name: "Equestrian"),
        ThemeTag(name: "Excitement"),
        ThemeTag(name: "Activities"),
        ThemeTag(name: "Low Budget")
    ]

    /// In-depth definitions for each tag (used by AI pipeline)
    static let tagDefinitions: [String: String] = [
        "Nightlife": "High-energy clubs, lounges, and late-night venues. Focus on dancing, bottle service, VIP experiences, and venues that stay open past midnight.",
        "Date Night": "Romantic venues perfect for couples - intimate restaurants, cozy wine bars, scenic viewpoints, and places with mood lighting and good ambiance.",
        "Bar Hopping": "Multiple bar stops in walkable distance. Mix of craft cocktail bars, dive bars, rooftop bars, and local favorites. Easy transitions between venues.",
        "Live Music": "Venues featuring live performances - jazz clubs, rock venues, indie stages, acoustic sets. Focus on the music experience and artist discovery.",
        "Foodie": "Culinary adventures through the city's best restaurants, food markets, street food, and unique dining experiences. Focus on flavor and variety.",
        "Brunch": "Late morning to early afternoon experiences with bottomless mimosas, eggs benedict, and social dining. Weekend vibes and Instagram-worthy spots.",
        "Rooftop": "Elevated venues with city views - rooftop bars, sky lounges, terrace restaurants. Sunset timing and skyline photography opportunities.",
        "Jazz": "Classic jazz clubs, speakeasies with live jazz, and venues celebrating the jazz tradition. Sophisticated atmosphere and world-class musicians.",
        "Adventure": "Unique and unconventional experiences - escape rooms, karaoke, arcade bars, immersive experiences, and activities beyond standard nightlife.",
        "Chill": "Low-key hangouts for relaxed conversation - cozy cafes, quiet bars, lounges with comfortable seating. No pressure, easy vibes.",
        "Culture": "Cultural immersion through local traditions, ethnic neighborhoods, historic venues, and experiences that showcase the city's unique character.",
        "Comedy": "Stand-up comedy clubs, improv theaters, and venues featuring comedic performances. Laughter-focused entertainment.",
        "Cocktails": "Craft cocktail bars and mixology experiences. Focus on artisan drinks, creative menus, and bartender expertise.",
        "Dancing": "Dance-focused venues - clubs with good DJs, salsa nights, dance halls, and places where movement is the main attraction.",
        "Sunset": "Venues and locations optimized for sunset viewing. West-facing patios, waterfront spots, and timed experiences around golden hour.",
        "Art": "Galleries, art walks, creative spaces, and venues with artistic ambiance. Culture meets nightlife.",
        "Wine": "Wine bars, wine tastings, and venues specializing in grape varieties. Sophisticated and educational.",
        "Beach": "Coastal venues - beach bars, seaside restaurants, and waterfront experiences. Sand, surf, and sea breeze.",
        "Party": "High-energy celebration mode - birthday worthy venues, champagne, confetti, and maximum fun. Go big or go home.",
        "Speakeasy": "Hidden bars, secret entrances, password-required venues, and prohibition-era themed experiences. Mystery and exclusivity.",
        "Afro House": "Afro house music experiences - clubs and bars playing afro house, amapiano, and African electronic music. African restaurants, afro house DJ events happening this week, dance parties with African beats, and venues known for African music culture.",
        "Afro Beats": "Afrobeats music experiences - clubs playing Nigerian and West African pop music, afrobeats dance nights, venues hosting afrobeats artists, African nightlife spots, and parties featuring Burna Boy, Wizkid, Davido style music. High-energy African pop culture vibes.",
        "Equestrian": "Horse riding experiences and equestrian culture - riding schools offering lessons, equestrian centers with trail rides, ranch experiences, and horseback adventures. For hands-on riding experiences.",
        "Excitement": "Thrilling daytime and evening experiences - amusement parks, fun fairs, circuses, gondola rides, ferris wheels, theme parks, water parks, and unique city attractions. Perfect for groups wanting excitement and Instagram-worthy moments.",
        "Activities": "Interactive group activities - 2 fun competitive activities like bowling, paintball, laser tag, escape rooms, go-karting, mini golf, or arcades. Plus 1 final venue for winding down with drinks or a nice meal.",
        "Low Budget": "Budget-friendly experiences under $50 per person - happy hours, free entry venues, affordable eats, public spaces, free events, and wallet-friendly fun without sacrificing quality."
    ]
}

/// Theme selector with flowing tags and Dynamic Island spread animation
/// Note: BoltThemeSelector is the preferred component for BoltView.
/// This component is kept for backwards compatibility.
struct DynamicIslandTabSelector: View {
    @Binding var selectedTag: ThemeTag?
    @Binding var isExpanded: Bool
    let tags: [ThemeTag]

    // Layout constants
    private let collapsedHeight: CGFloat = 40
    private let expandedHeight: CGFloat = UIScreen.main.bounds.height * 0.42

    var body: some View {
        ZStack {
            if isExpanded {
                expandedContent
            } else {
                collapsedContent
            }
        }
    }

    // MARK: - Collapsed Content

    private var collapsedContent: some View {
        Button(action: {
            print("[DynamicIslandTabSelector] Collapsed pill tapped, expanding")
            HapticManager.shared.selection()
            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                isExpanded = true
            }
        }) {
            HStack(spacing: 8) {
                if let selected = selectedTag {
                    Text(selected.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)

                    // X button to clear selection
                    Button(action: {
                        HapticManager.shared.light()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            selectedTag = nil
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.6))
                    }
                } else {
                    Text("select theme")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            .padding(.horizontal, 16)
            .frame(height: collapsedHeight)
            .background(
                Capsule()
                    .fill(Color.black)
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Expanded Content (Spread from Island animation)

    private var expandedContent: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("What's your vibe this week?")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                Button(action: {
                    HapticManager.shared.light()
                    closeSelector()
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white.opacity(0.7))
                        .frame(width: 32, height: 32)
                        .background(
                            Circle()
                                .fill(Color.white.opacity(0.15))
                        )
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 16)

            // Flowing tags with auto-width
            ScrollView(.vertical, showsIndicators: false) {
                FlowingTagsView(
                    tags: tags,
                    selectedTag: $selectedTag,
                    onSelect: { tag in
                        HapticManager.shared.medium()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            selectedTag = tag
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                            closeSelector()
                        }
                    }
                )
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
        .frame(width: UIScreen.main.bounds.width - 10, height: expandedHeight)
        .background(
            ZStack {
                // Portal-themed gradient background
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.1, green: 0.04, blue: 0.18),
                                Color(red: 0.05, green: 0, blue: 0.08)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Subtle portal glow
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.boltPortalGlow.opacity(0.15),
                                Color.clear
                            ],
                            center: .top,
                            startRadius: 0,
                            endRadius: 300
                        )
                    )

                // Border glow
                RoundedRectangle(cornerRadius: 24)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.boltGradientStart.opacity(0.4),
                                Color.boltGradientEnd.opacity(0.2)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
        )
        .shadow(color: Color.boltPortalGlow.opacity(0.3), radius: 30, x: 0, y: 10)
        .transition(.asymmetric(
            insertion: .scale(scale: 0.3, anchor: .top).combined(with: .opacity),
            removal: .scale(scale: 0.5, anchor: .top).combined(with: .opacity)
        ))
    }

    // MARK: - Actions

    private func closeSelector() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
            isExpanded = false
        }
    }
}

// MARK: - Flowing Tags View (Auto-width, wrapping layout)

struct FlowingTagsView: View {
    let tags: [ThemeTag]
    @Binding var selectedTag: ThemeTag?
    let onSelect: (ThemeTag) -> Void

    @State private var totalHeight: CGFloat = .zero

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            GeometryReader { geometry in
                self.generateContent(in: geometry)
            }
        }
        .frame(height: totalHeight)
    }

    private func generateContent(in geometry: GeometryProxy) -> some View {
        var width = CGFloat.zero
        var height = CGFloat.zero

        return ZStack(alignment: .topLeading) {
            ForEach(tags) { tag in
                tagButton(tag)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 5)
                    .alignmentGuide(.leading) { dimension in
                        if abs(width - dimension.width) > geometry.size.width {
                            width = 0
                            height -= dimension.height
                        }
                        let result = width
                        if tag.id == tags.last?.id {
                            width = 0
                        } else {
                            width -= dimension.width
                        }
                        return result
                    }
                    .alignmentGuide(.top) { _ in
                        let result = height
                        if tag.id == tags.last?.id {
                            height = 0
                        }
                        return result
                    }
            }
        }
        .background(viewHeightReader($totalHeight))
    }

    private func tagButton(_ tag: ThemeTag) -> some View {
        Button(action: {
            onSelect(tag)
        }) {
            Text(tag.name)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(selectedTag == tag ? .black : .white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    Capsule()
                        .fill(selectedTag == tag ? Color.white : Color.white.opacity(0.1))
                )
                .overlay(
                    Capsule()
                        .stroke(
                            LinearGradient(
                                colors: selectedTag == tag
                                    ? [Color.clear, Color.clear]
                                    : [Color.boltGradientStart.opacity(0.3), Color.boltGradientEnd.opacity(0.2)],
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            lineWidth: 1
                        )
                )
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func viewHeightReader(_ binding: Binding<CGFloat>) -> some View {
        GeometryReader { geometry -> Color in
            DispatchQueue.main.async {
                binding.wrappedValue = geometry.frame(in: .local).size.height
            }
            return Color.clear
        }
    }
}

// MARK: - Preview

#Preview("Theme Selector - Collapsed") {
    ZStack {
        Color(red: 0.05, green: 0, blue: 0.08).ignoresSafeArea()

        VStack {
            Spacer().frame(height: 60)

            DynamicIslandTabSelector(
                selectedTag: .constant(nil),
                isExpanded: .constant(false),
                tags: ThemeTag.suggestions
            )

            Spacer()
        }
    }
}

#Preview("Theme Selector - With Selection") {
    ZStack {
        Color(red: 0.05, green: 0, blue: 0.08).ignoresSafeArea()

        VStack {
            Spacer().frame(height: 60)

            DynamicIslandTabSelector(
                selectedTag: .constant(ThemeTag.suggestions[3]),
                isExpanded: .constant(false),
                tags: ThemeTag.suggestions
            )

            Spacer()
        }
    }
}
