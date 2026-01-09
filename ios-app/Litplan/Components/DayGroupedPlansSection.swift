//
//  DayGroupedPlansSection.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/31/25.
//  Sprint 17E: Day-based plan grouping (Monday through Friday)
//

import SwiftUI

/// Section that groups plans by day of the week
/// Displays section headers for Monday through Friday
struct DayGroupedPlansSection: View {
    let plans: [Plan]
    let onPlanTap: (Plan) -> Void

    // Days of the week in order (excluding weekends)
    private let weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    // Group plans by day of week
    private var plansByDay: [String: [Plan]] {
        Dictionary(grouping: plans) { $0.schedule.dayOfWeek }
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            ForEach(weekdays, id: \.self) { day in
                if let dayPlans = plansByDay[day], !dayPlans.isEmpty {
                    DaySection(
                        day: day,
                        plans: dayPlans,
                        onPlanTap: onPlanTap
                    )
                }
            }
        }
    }
}

// MARK: - Day Section

/// Individual day section with header and plans list
struct DaySection: View {
    let day: String
    let plans: [Plan]
    let onPlanTap: (Plan) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Day header
            daySectionHeader

            // Plans for this day
            VStack(spacing: 0) {
                ForEach(Array(plans.enumerated()), id: \.element.id) { index, plan in
                    VStack(spacing: 0) {
                        PlanListItem(plan: plan, showRank: false)
                            .onTapGesture {
                                HapticManager.shared.medium()
                                onPlanTap(plan)
                            }

                        if index < plans.count - 1 {
                            Divider()
                                .background(Color.surfaceSecondary)
                                .padding(.leading, 62)
                        }
                    }
                }
            }
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
    }

    private var daySectionHeader: some View {
        HStack(spacing: Spacing.xs) {
            // Day icon
            Image(systemName: dayIcon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(dayColor)
                .accessibilityHidden(true)

            // Day name
            Text(day)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.textPrimary)

            Spacer()

            // Plan count
            Text("\(plans.count) \(plans.count == 1 ? "plan" : "plans")")
                .font(.system(size: 13))
                .foregroundColor(.textTertiary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }

    // Icon for each day
    private var dayIcon: String {
        switch day {
        case "Monday":
            return "sunrise.fill"
        case "Tuesday":
            return "sun.max.fill"
        case "Wednesday":
            return "sun.haze.fill"
        case "Thursday":
            return "sunset.fill"
        case "Friday":
            return "moon.stars.fill"
        default:
            return "calendar"
        }
    }

    // Color accent for each day
    private var dayColor: Color {
        switch day {
        case "Monday":
            return .accentPrimary
        case "Tuesday":
            return Color(hex: "#FF9500") // Orange
        case "Wednesday":
            return Color(hex: "#34C759") // Green
        case "Thursday":
            return Color(hex: "#AF52DE") // Purple
        case "Friday":
            return Color(hex: "#FFD60A") // Yellow
        default:
            return .textSecondary
        }
    }
}

// MARK: - Preview

#Preview("DayGroupedPlansSection") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        ScrollView {
            DayGroupedPlansSection(
                plans: [
                    // Create sample plans for different days
                    createSamplePlan(day: "Monday", title: "Monday Jazz Night"),
                    createSamplePlan(day: "Monday", title: "Craft Cocktails"),
                    createSamplePlan(day: "Tuesday", title: "Open Mic Tuesday"),
                    createSamplePlan(day: "Wednesday", title: "Midweek Mixer"),
                    createSamplePlan(day: "Thursday", title: "Throwback Thursday"),
                    createSamplePlan(day: "Friday", title: "Friday Night Fever"),
                    createSamplePlan(day: "Friday", title: "Rooftop Happy Hour"),
                    createSamplePlan(day: "Friday", title: "Late Night Dance")
                ],
                onPlanTap: { plan in
                    print("Tapped: \(plan.title)")
                }
            )
            .padding()
        }
    }
}

// Helper function for preview
private func createSamplePlan(day: String, title: String) -> Plan {
    Plan(
        id: UUID().uuidString,
        title: title,
        venueName: "Sample Venue",
        category: "Bar",
        description: "A great venue for a night out with friends",
        cityName: "New York",
        images: [],
        location: Plan.Location(
            address: "123 Sample St",
            neighborhood: "Downtown",
            coordinates: Plan.Location.Coordinates(latitude: 40.7, longitude: -74.0)
        ),
        schedule: Plan.Schedule(
            date: "2025-12-31T20:00:00Z",
            startTime: "20:00",
            endTime: "02:00",
            dayOfWeek: day,
            isWeekend: day == "Saturday" || day == "Sunday"
        ),
        pricing: Plan.Pricing(
            entryFee: 20.0,
            currency: "USD",
            priceRange: "$$"
        ),
        aiTags: ["Social", "Drinks"],
        flags: Plan.PlanFlags(
            isWeekendPlan: day == "Saturday" || day == "Sunday",
            requiresReservation: false,
            ageRestriction: 21,
            rank: nil
        )
    )
}
