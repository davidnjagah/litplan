//
//  WeekSelectorView.swift
//  Litplan
//
//  Created for Sprint 24 - Week Selection UI
//  Horizontal scrollable date selector for 4 weeks
//

import SwiftUI

/// Week selector component for filtering plans by date
struct WeekSelectorView: View {
    @Binding var selectedDate: Date
    let availableWeeks: Int

    @State private var scrollProxy: ScrollViewProxy?

    /// Generate dates for the available weeks
    private var dates: [Date] {
        var result: [Date] = []
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        // Generate dates for N weeks (7 days per week)
        for dayOffset in 0..<(availableWeeks * 7) {
            if let date = calendar.date(byAdding: .day, value: dayOffset, to: today) {
                result.append(date)
            }
        }

        return result
    }

    init(selectedDate: Binding<Date>, availableWeeks: Int = 4) {
        self._selectedDate = selectedDate
        self.availableWeeks = availableWeeks
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    ForEach(dates, id: \.self) { date in
                        DateTabButton(
                            date: date,
                            isSelected: isSameDay(date, selectedDate),
                            isToday: isSameDay(date, Date()),
                            onTap: {
                                withAnimation(.spring(response: 0.3)) {
                                    selectedDate = date
                                    HapticManager.shared.light()
                                }
                            }
                        )
                        .id(date)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.xs)
            }
            .onAppear {
                scrollProxy = proxy
                // Scroll to selected date on appear
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    withAnimation(.easeOut(duration: 0.3)) {
                        proxy.scrollTo(selectedDate, anchor: .center)
                    }
                }
            }
            .onChange(of: selectedDate) { _, newDate in
                withAnimation(.easeOut(duration: 0.3)) {
                    proxy.scrollTo(newDate, anchor: .center)
                }
            }
        }
        .background(Color.surfacePrimary.opacity(0.95))
    }

    /// Check if two dates are the same day
    private func isSameDay(_ date1: Date, _ date2: Date) -> Bool {
        Calendar.current.isDate(date1, inSameDayAs: date2)
    }
}

/// Individual date button in the week selector
struct DateTabButton: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let onTap: () -> Void

    private var dayOfWeek: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }

    private var monthAbbrev: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"
        return formatter.string(from: date)
    }

    private var isWeekend: Bool {
        let weekday = Calendar.current.component(.weekday, from: date)
        return weekday == 1 || weekday == 7 // Sunday or Saturday
    }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                // Day of week
                Text(dayOfWeek)
                    .font(.system(size: 11, weight: isSelected ? .semibold : .medium))
                    .foregroundColor(isSelected ? .white : .textSecondary)

                // Day number
                Text(dayNumber)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(isSelected ? .white : .textPrimary)

                // Month abbreviation
                Text(monthAbbrev)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(isSelected ? .white.opacity(0.9) : .textTertiary)

                // Today indicator dot
                if isToday && !isSelected {
                    Circle()
                        .fill(Color.accentPrimary)
                        .frame(width: 5, height: 5)
                } else {
                    Spacer().frame(height: 5)
                }
            }
            .frame(width: 52, height: 72)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(backgroundColor)
                    .shadow(color: isSelected ? Color.accentPrimary.opacity(0.3) : .clear, radius: 4, y: 2)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(borderColor, lineWidth: isSelected ? 0 : 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
        .accessibilityLabel(accessibilityLabel)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private var backgroundColor: Color {
        if isSelected {
            return isWeekend ? Color(hex: "#FF6B6B") : Color.accentPrimary
        }
        return Color.surfaceSecondary.opacity(0.5)
    }

    private var borderColor: Color {
        if isToday && !isSelected {
            return Color.accentPrimary.opacity(0.5)
        }
        return Color.surfaceSecondary
    }

    private var accessibilityLabel: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        var label = formatter.string(from: date)
        if isToday {
            label += ", Today"
        }
        return label
    }
}

/// Scale button style for tactile feedback
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Compact Week Selector (Alternative Style)

/// Compact version showing only current week
struct CompactWeekSelectorView: View {
    @Binding var selectedDate: Date

    private var weekDates: [Date] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        // Get start of week (Monday)
        var weekStart = today
        if let start = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)) {
            weekStart = start
        }

        // Generate 7 days
        return (0..<7).compactMap { offset in
            calendar.date(byAdding: .day, value: offset, to: weekStart)
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(weekDates, id: \.self) { date in
                CompactDateButton(
                    date: date,
                    isSelected: Calendar.current.isDate(date, inSameDayAs: selectedDate),
                    isToday: Calendar.current.isDateInToday(date)
                ) {
                    selectedDate = date
                    HapticManager.shared.light()
                }
            }
        }
        .padding(.horizontal, Spacing.sm)
        .background(Color.surfaceSecondary.opacity(0.3))
        .cornerRadius(12)
    }
}

struct CompactDateButton: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 2) {
                Text(dayLetter)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.textSecondary)

                Text(dayNumber)
                    .font(.system(size: 14, weight: isSelected ? .bold : .semibold))
                    .foregroundColor(isSelected ? .white : .textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xs)
            .background(
                isSelected
                    ? RoundedRectangle(cornerRadius: 8).fill(Color.accentPrimary)
                    : nil
            )
        }
        .buttonStyle(.plain)
    }

    private var dayLetter: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEEE" // Single letter
        return formatter.string(from: date)
    }

    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }
}

// MARK: - Preview

#Preview("WeekSelectorView") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        VStack(spacing: Spacing.lg) {
            Text("4 Week Selector")
                .font(.headline)
                .foregroundColor(.textPrimary)

            WeekSelectorView(
                selectedDate: .constant(Date()),
                availableWeeks: 4
            )

            Divider()

            Text("Compact Week Selector")
                .font(.headline)
                .foregroundColor(.textPrimary)

            CompactWeekSelectorView(selectedDate: .constant(Date()))
                .padding(.horizontal)
        }
    }
}
