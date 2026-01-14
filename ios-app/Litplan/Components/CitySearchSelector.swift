//
//  CitySearchSelector.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/13/26.
//  Sprint 16 - City selector with worldwide search and Dynamic Island-style animation
//
//  Uses binding-based approach for expand/collapse state.
//

import SwiftUI

/// City selector with search functionality and Dynamic Island spread animation
struct CitySearchSelector: View {
    @Binding var selectedCity: SearchedCity?
    @Binding var isExpanded: Bool

    @StateObject private var searchManager = CitySearchManager.shared

    // Layout constants
    private let collapsedHeight: CGFloat = 40
    private let expandedHeight: CGFloat = UIScreen.main.bounds.height * 0.5
    private let screenWidth = UIScreen.main.bounds.width

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
            print("[CitySearchSelector] Collapsed pill tapped, expanding")
            HapticManager.shared.selection()
            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                isExpanded = true
            }
        }) {
            HStack(spacing: 8) {
                Image(systemName: "location.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.boltGradientStart)

                if let selected = selectedCity {
                    Text(selected.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Button(action: {
                        HapticManager.shared.light()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            selectedCity = nil
                            searchManager.clearSelection()
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.6))
                    }
                } else {
                    Text("select city")
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

    // MARK: - Expanded Content

    private var expandedContent: some View {
        VStack(spacing: 0) {
            // Header with search bar
            VStack(spacing: 12) {
                HStack {
                    Text("Search City")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)

                    Spacer()

                    Button(action: {
                        HapticManager.shared.light()
                        searchManager.reset()
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
                        Button(action: {
                            searchManager.searchQuery = ""
                        }) {
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
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 16)

            // Search Results
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 0) {
                    if searchManager.searchResults.isEmpty && !searchManager.searchQuery.isEmpty && !searchManager.isSearching {
                        emptyResultsView
                    } else if searchManager.searchResults.isEmpty && searchManager.searchQuery.isEmpty {
                        searchPromptView
                    } else {
                        ForEach(searchManager.searchResults) { city in
                            cityResultRow(city)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
        .frame(width: screenWidth - 10, height: expandedHeight)
        .background(expandedBackground)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: Color.black.opacity(0.6), radius: 30, x: 0, y: 15)
        .transition(.asymmetric(
            insertion: .scale(scale: 0.3, anchor: .top).combined(with: .opacity),
            removal: .scale(scale: 0.5, anchor: .top).combined(with: .opacity)
        ))
        .onChange(of: searchManager.selectedCity) { _, newCity in
            if let city = newCity {
                selectedCity = city
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                    closeSelector()
                }
            }
        }
    }

    // MARK: - Expanded Background

    private var expandedBackground: some View {
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

    // MARK: - City Result Row

    private func cityResultRow(_ city: SearchedCity) -> some View {
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

    private func closeSelector() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
            isExpanded = false
        }
    }
}

// MARK: - Preview

#Preview("City Selector") {
    ZStack {
        Color(red: 0.05, green: 0, blue: 0.08).ignoresSafeArea()
        VStack {
            HStack {
                CitySearchSelector(
                    selectedCity: .constant(nil),
                    isExpanded: .constant(false)
                )
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 60)
            Spacer()
        }
    }
}
