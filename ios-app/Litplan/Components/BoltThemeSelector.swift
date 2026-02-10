//
//  BoltThemeSelector.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/13/26.
//  Sprint 16 - Theme selector with expand-from-pill animation
//
//  The modal expands FROM the pill position to cover the top half of screen.
//  Uses overlay approach for custom animation origin.
//

import SwiftUI

struct BoltThemeSelector: View {
    // MARK: - Bindings

    @Binding var selectedTag: ThemeTag?

    // MARK: - Private State

    @State private var isExpanded = false

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
            print("[BoltThemeSelector] Button tapped! isExpanded was: \(isExpanded)")
            HapticManager.shared.selection()
            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                isExpanded = true
            }
            print("[BoltThemeSelector] isExpanded is now: \(isExpanded)")
        }) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12))
                    .foregroundColor(.boltGradientEnd)

                if let tag = selectedTag {
                    Text(tag.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Button(action: {
                        HapticManager.shared.light()
                        selectedTag = nil
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.6))
                    }
                } else {
                    Text("Select Vibe")
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
                        .frame(width: screenWidth - 10, height: screenHeight * 0.45)
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
                Text("What's your vibe this week?")
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

            // Scrollable theme tags
            ScrollView(.vertical, showsIndicators: false) {
                FlowingTagsLayout(tags: ThemeTag.suggestions, selectedTag: $selectedTag) { tag in
                    HapticManager.shared.medium()
                    selectedTag = tag
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                        closeModal()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
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

    // MARK: - Actions

    private func closeModal() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
            isExpanded = false
        }
    }
}

// MARK: - Flowing Tags Layout

private struct FlowingTagsLayout: View {
    let tags: [ThemeTag]
    @Binding var selectedTag: ThemeTag?
    let onSelect: (ThemeTag) -> Void

    @State private var totalHeight: CGFloat = 300

    var body: some View {
        VStack {
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
        .background(heightReader($totalHeight))
    }

    private func tagButton(_ tag: ThemeTag) -> some View {
        let isRooftop = tag.name == "Rooftop"
        let isSelected = selectedTag?.id == tag.id

        return Button(action: { onSelect(tag) }) {
            HStack(spacing: 6) {
                if isRooftop && !isSelected {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.boltGradientEnd)
                }
                Text(tag.name)
                    .font(.system(size: 15, weight: isRooftop ? .semibold : .medium))
            }
            .foregroundColor(isSelected ? .black : .white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                ZStack {
                    if isSelected {
                        Capsule().fill(Color.white)
                    } else if isRooftop {
                        Capsule().fill(
                            LinearGradient(
                                colors: [Color.boltGradientStart.opacity(0.3), Color.boltGradientEnd.opacity(0.3)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    } else {
                        Capsule().fill(Color.white.opacity(0.1))
                    }
                }
            )
            .overlay(
                Capsule()
                    .stroke(
                        LinearGradient(
                            colors: isSelected
                                ? [Color.clear, Color.clear]
                                : isRooftop
                                    ? [Color.boltGradientStart.opacity(0.8), Color.boltGradientEnd.opacity(0.6)]
                                    : [Color.boltGradientStart.opacity(0.3), Color.boltGradientEnd.opacity(0.2)],
                            startPoint: .leading,
                            endPoint: .trailing
                        ),
                        lineWidth: isRooftop && !isSelected ? 1.5 : 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func heightReader(_ binding: Binding<CGFloat>) -> some View {
        GeometryReader { geometry -> Color in
            DispatchQueue.main.async {
                binding.wrappedValue = max(geometry.frame(in: .local).size.height, 100)
            }
            return Color.clear
        }
    }
}

// MARK: - Preview

#Preview("Theme Selector") {
    ZStack {
        Color.appBackground.ignoresSafeArea()
        VStack {
            HStack {
                Spacer()
                BoltThemeSelector(selectedTag: .constant(nil))
            }
            .padding(.horizontal, 20)
            .padding(.top, 60)
            Spacer()
        }
    }
}
