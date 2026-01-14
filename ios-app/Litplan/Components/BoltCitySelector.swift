//
//  BoltCitySelector.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/13/26.
//  Sprint 16 - City selector with expand-from-pill animation
//
//  The modal expands FROM the pill position to cover the top half of screen.
//  Uses overlay approach for custom animation origin.
//

import SwiftUI

struct BoltCitySelector: View {
    // MARK: - Bindings

    @Binding var selectedCity: SearchedCity?

    // MARK: - Private State

    @State private var isExpanded = false
    @ObservedObject private var searchManager = CitySearchManager.shared

    // MARK: - Layout Constants

    private let collapsedHeight: CGFloat = 40
    private let screenWidth = UIScreen.main.bounds.width
    private let screenHeight = UIScreen.main.bounds.height

    // MARK: - Body

    var body: some View {
        collapsedPill
    }

    // MARK: - Collapsed Pill

    private var collapsedPill: some View {
        Button(action: {
            print("[BoltCitySelector] Button tapped! isExpanded was: \(isExpanded)")
            HapticManager.shared.selection()
            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                isExpanded = true
            }
            print("[BoltCitySelector] isExpanded is now: \(isExpanded)")
        }) {
            HStack(spacing: 8) {
                Image(systemName: "location.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.boltGradientStart)

                if let city = selectedCity {
                    Text(city.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Button(action: {
                        HapticManager.shared.light()
                        selectedCity = nil
                        searchManager.clearSelection()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.6))
                    }
                } else {
                    Text("Select City")
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
            .contentShape(Capsule())
        }
        .buttonStyle(PlainButtonStyle())
        .zIndex(isExpanded ? 1000 : 0)
        .overlay {
            if isExpanded {
                expandedOverlay
            }
        }
    }

    // MARK: - Expanded Overlay (Animates from pill)

    private var expandedOverlay: some View {
        GeometryReader { pillGeometry in
            let pillFrame = pillGeometry.frame(in: .global)

            // Offset needed to move from pill position to screen origin (0,0)
            let offsetToOriginX = -pillFrame.minX
            let offsetToOriginY = -pillFrame.minY

            ZStack {
                // Shadow/dim background - full screen
                Color.black.opacity(0.5)
                    .onTapGesture {
                        closeModal()
                    }

                // Expanded modal - centered horizontally, near top
                VStack {
                    expandedContent
                        .frame(width: screenWidth - 10, height: screenHeight * 0.48)
                        .background(modalBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .shadow(color: Color.black.opacity(0.6), radius: 30, x: 0, y: 15)
                        .padding(.top, pillFrame.minY - 5)

                    Spacer()
                }
            }
            .frame(width: screenWidth, height: screenHeight)
            .offset(x: offsetToOriginX, y: offsetToOriginY)
            .transition(.asymmetric(
                insertion: .scale(scale: 0.3, anchor: .top).combined(with: .opacity),
                removal: .scale(scale: 0.5, anchor: .top).combined(with: .opacity)
            ))
        }
        .ignoresSafeArea()
    }

    // MARK: - Expanded Content

    private var expandedContent: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Search City")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                Button(action: { closeModal() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white.opacity(0.7))
                        .frame(width: 32, height: 32)
                        .background(Circle().fill(Color.white.opacity(0.15)))
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 16)

            // Search bar
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.5))

                TextField("Type a city name...", text: $searchManager.searchQuery)
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.words)

                if searchManager.isSearching {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.8)
                } else if !searchManager.searchQuery.isEmpty {
                    Button(action: { searchManager.searchQuery = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 20)
            .padding(.bottom, 16)

            // Results
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 0) {
                    if searchManager.searchResults.isEmpty && !searchManager.searchQuery.isEmpty && !searchManager.isSearching {
                        emptyResultsView
                    } else if searchManager.searchResults.isEmpty && searchManager.searchQuery.isEmpty {
                        searchPromptView
                    } else {
                        ForEach(searchManager.searchResults) { city in
                            cityRow(city)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
        .onChange(of: searchManager.selectedCity) { _, newCity in
            if let city = newCity {
                selectedCity = city
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                    closeModal()
                }
            }
        }
    }

    // MARK: - Modal Background

    private var modalBackground: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.1, green: 0.04, blue: 0.18), Color(red: 0.05, green: 0, blue: 0.08)],
                startPoint: .top,
                endPoint: .bottom
            )

            RadialGradient(
                colors: [Color.boltPortalGlow.opacity(0.15), Color.clear],
                center: .top,
                startRadius: 0,
                endRadius: 300
            )

            RoundedRectangle(cornerRadius: 24)
                .stroke(
                    LinearGradient(
                        colors: [Color.boltGradientStart.opacity(0.5), Color.boltGradientEnd.opacity(0.3)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        }
    }

    // MARK: - City Row

    private func cityRow(_ city: SearchedCity) -> some View {
        Button(action: {
            HapticManager.shared.medium()
            searchManager.selectCity(city)
        }) {
            HStack(spacing: 12) {
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.boltGradientStart)

                VStack(alignment: .leading, spacing: 2) {
                    Text(city.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)

                    if !city.country.isEmpty {
                        Text(city.country)
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }

                Spacer()

                if selectedCity?.displayName == city.displayName {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.boltGradientStart)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(selectedCity?.displayName == city.displayName ? Color.white.opacity(0.1) : Color.clear)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Empty/Prompt Views

    private var emptyResultsView: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 32))
                .foregroundColor(.white.opacity(0.3))
            Text("No cities found")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white.opacity(0.6))
            Text("Try a different search term")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private var searchPromptView: some View {
        VStack(spacing: 16) {
            Image(systemName: "globe")
                .font(.system(size: 40))
                .foregroundColor(.boltGradientStart.opacity(0.6))
            Text("Search any city worldwide")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
            Text("Type a city name to get started")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Actions

    private func closeModal() {
        searchManager.reset()
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
            isExpanded = false
        }
    }
}

// MARK: - Preview

#Preview("City Selector") {
    ZStack {
        Color.appBackground.ignoresSafeArea()
        VStack {
            HStack {
                BoltCitySelector(selectedCity: .constant(nil))
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 60)
            Spacer()
        }
    }
}
