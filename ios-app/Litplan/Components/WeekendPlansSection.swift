//
//  WeekendPlansSection.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/31/25.
//  Sprint 17E: Weekend Plans section with premium blocking for free users
//  Updated: Day-based grouping with events shown first
//

import SwiftUI

/// Weekend Plans section displayed at the top of the city plans list
/// FREE users: See 2 plans fully visible (tap shows paywall), rest are blurred
/// PRO users: See all weekend plans without restrictions
struct WeekendPlansSection: View {
    let plans: [Plan]
    let isProUser: Bool
    let onPlanTap: (Plan) -> Void
    let onUpgrade: () -> Void

    // Number of visible plans for free users
    private let freeUserVisibleCount = 2

    // Number of plans to show per day before "See More"
    private let plansPerDayLimit = 3

    // Track which days are expanded
    @State private var expandedDays: Set<String> = []

    // Weekend days in order
    private let weekendDays = ["Friday", "Saturday", "Sunday"]

    // Group plans by day, sorted with events first
    private var plansByDay: [(day: String, plans: [Plan])] {
        var result: [(day: String, plans: [Plan])] = []

        for day in weekendDays {
            let dayPlans = plans.filter { $0.computedDayOfWeek == day }
            if !dayPlans.isEmpty {
                // Sort: events first, then by start time
                let sorted = dayPlans.sorted { plan1, plan2 in
                    if plan1.isEvent != plan2.isEvent {
                        return plan1.isEvent // Events first
                    }
                    return plan1.schedule.startTime < plan2.schedule.startTime
                }
                result.append((day: day, plans: sorted))
            }
        }

        return result
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Section header
            sectionHeader

            // Plans content grouped by day
            VStack(spacing: 0) {
                if isProUser {
                    // Pro users see all plans grouped by day
                    allPlansView
                } else {
                    // Free users see limited plans + blurred section
                    freeTierPlansView
                }
            }
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.accentPrimary.opacity(0.3), lineWidth: 1)
            )
        }
        .padding(.horizontal, Spacing.sm)
    }

    // MARK: - Section Header

    private var sectionHeader: some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: "sparkles")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.accentPrimary)
                .accessibilityHidden(true)

            Text("Weekend Plans")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.textPrimary)

            Text("Fri-Sun")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.surfaceSecondary)
                .cornerRadius(4)

            Spacer()

            if !isProUser {
                proBadge
            }

            Text("\(plans.count) plans")
                .font(.system(size: 13))
                .foregroundColor(.textTertiary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }

    private var proBadge: some View {
        Text("PRO")
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(.accentPrimary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.accentPrimary.opacity(0.15))
            .cornerRadius(4)
    }

    // MARK: - Day Header

    private func dayHeader(for day: String, planCount: Int) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: dayIcon(for: day))
                .font(.system(size: 14))
                .foregroundColor(dayColor(for: day))

            Text(day)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.textPrimary)

            Spacer()

            Text("\(planCount)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.textTertiary)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.surfaceSecondary)
                .cornerRadius(10)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.surfaceSecondary.opacity(0.5))
    }

    private func dayIcon(for day: String) -> String {
        switch day {
        case "Friday": return "moon.stars.fill"
        case "Saturday": return "sparkles"
        case "Sunday": return "sun.max.fill"
        default: return "calendar"
        }
    }

    private func dayColor(for day: String) -> Color {
        switch day {
        case "Friday": return Color(hex: "#FFD60A") // Yellow
        case "Saturday": return .accentPrimary
        case "Sunday": return Color(hex: "#FF9500") // Orange
        default: return .textSecondary
        }
    }

    // MARK: - Pro User View (All Plans with See More)

    private var allPlansView: some View {
        VStack(spacing: 0) {
            ForEach(Array(plansByDay.enumerated()), id: \.element.day) { dayIndex, dayGroup in
                let isExpanded = expandedDays.contains(dayGroup.day)
                let visiblePlans = isExpanded ? dayGroup.plans : Array(dayGroup.plans.prefix(plansPerDayLimit))
                let hasMorePlans = dayGroup.plans.count > plansPerDayLimit

                // Day header
                dayHeader(for: dayGroup.day, planCount: dayGroup.plans.count)

                // Plans for this day (show limited or all based on expanded state)
                ForEach(Array(visiblePlans.enumerated()), id: \.element.id) { index, plan in
                    VStack(spacing: 0) {
                        PlanListItem(plan: plan, showRank: false)
                            .onTapGesture {
                                HapticManager.shared.medium()
                                onPlanTap(plan)
                            }

                        if index < visiblePlans.count - 1 {
                            Divider()
                                .background(Color.surfaceSecondary)
                                .padding(.leading, 62)
                        }
                    }
                }

                // "See More" button if there are more plans
                if hasMorePlans {
                    seeMoreButton(for: dayGroup.day, isExpanded: isExpanded, remainingCount: dayGroup.plans.count - plansPerDayLimit)
                }

                // Divider between days
                if dayIndex < plansByDay.count - 1 {
                    Divider()
                        .background(Color.surfaceSecondary)
                }
            }
        }
    }

    // MARK: - See More Button

    private func seeMoreButton(for day: String, isExpanded: Bool, remainingCount: Int) -> some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                if isExpanded {
                    expandedDays.remove(day)
                } else {
                    expandedDays.insert(day)
                }
            }
            HapticManager.shared.light()
        }) {
            HStack(spacing: Spacing.xs) {
                Text(isExpanded ? "Show Less" : "See \(remainingCount) More")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.accentPrimary)

                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.accentPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.sm)
            .background(Color.surfaceSecondary.opacity(0.5))
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Free Tier View (Limited + Blurred)

    private var freeTierPlansView: some View {
        VStack(spacing: 0) {
            // Flatten plans maintaining day order with events first
            let allSortedPlans = plansByDay.flatMap { $0.plans }
            let visiblePlans = Array(allSortedPlans.prefix(freeUserVisibleCount))

            // Show visible plans with their day headers
            var currentDay = ""
            ForEach(Array(visiblePlans.enumerated()), id: \.element.id) { index, plan in
                VStack(spacing: 0) {
                    // Show day header if this is a new day
                    if plan.computedDayOfWeek != currentDay {
                        let dayPlans = visiblePlans.filter { $0.computedDayOfWeek == plan.computedDayOfWeek }
                        dayHeader(for: plan.computedDayOfWeek, planCount: dayPlans.count)
                    }

                    PlanListItem(plan: plan, showRank: false)
                        .onTapGesture {
                            // Even visible plans trigger paywall for free users
                            HapticManager.shared.warning()
                            onUpgrade()
                        }

                    Divider()
                        .background(Color.surfaceSecondary)
                        .padding(.leading, 62)
                }
                .onAppear {
                    currentDay = plan.computedDayOfWeek
                }
            }

            // Blurred section for remaining plans
            if plans.count > freeUserVisibleCount {
                blurredPlansOverlay
            }
        }
    }

    // MARK: - Blurred Plans Overlay

    private var blurredPlansOverlay: some View {
        ZStack {
            // Background blurred content preview
            VStack(spacing: 0) {
                // Show preview of blurred plans
                let allSortedPlans = plansByDay.flatMap { $0.plans }
                let hiddenPlans = Array(allSortedPlans.dropFirst(freeUserVisibleCount).prefix(3))
                ForEach(Array(hiddenPlans.enumerated()), id: \.element.id) { index, plan in
                    CompactPlanListItem(plan: plan)
                        .blur(radius: 6)

                    if index < hiddenPlans.count - 1 {
                        Divider()
                            .background(Color.surfaceSecondary)
                    }
                }
            }

            // Overlay with unlock prompt
            VStack(spacing: Spacing.md) {
                // Arrow down icon in circle
                ZStack {
                    Circle()
                        .fill(Color.accentPrimary)
                        .frame(width: 48, height: 48)

                    Image(systemName: "arrow.down.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.textPrimary)
                }
                .shadow(color: Color.accentPrimary.opacity(0.4), radius: 8, x: 0, y: 4)

                VStack(spacing: Spacing.xxs) {
                    Text("Unlock \(plans.count - freeUserVisibleCount) More Weekend Plans")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textPrimary)

                    Text("Upgrade to Pro for full weekend access")
                        .font(.system(size: 13))
                        .foregroundColor(.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                LinearGradient(
                    colors: [
                        Color.surfacePrimary.opacity(0.7),
                        Color.surfacePrimary.opacity(0.95)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .contentShape(Rectangle())
            .onTapGesture {
                HapticManager.shared.medium()
                onUpgrade()
            }
        }
        .frame(minHeight: 150)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Unlock \(plans.count - freeUserVisibleCount) more weekend plans")
        .accessibilityHint("Double tap to upgrade to Pro")
        .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Preview

#Preview("WeekendPlansSection - Free User") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        ScrollView {
            WeekendPlansSection(
                plans: [Plan.sampleBlueNote, Plan.sampleLeBain, Plan.sampleBlueNote, Plan.sampleLeBain],
                isProUser: false,
                onPlanTap: { plan in
                    print("Tapped: \(plan.title)")
                },
                onUpgrade: {
                    print("Upgrade tapped")
                }
            )
            .padding()
        }
    }
}

#Preview("WeekendPlansSection - Pro User") {
    ZStack {
        Color.appBackground.ignoresSafeArea()

        ScrollView {
            WeekendPlansSection(
                plans: [Plan.sampleBlueNote, Plan.sampleLeBain],
                isProUser: true,
                onPlanTap: { plan in
                    print("Tapped: \(plan.title)")
                },
                onUpgrade: {
                    print("Upgrade tapped")
                }
            )
            .padding()
        }
    }
}
