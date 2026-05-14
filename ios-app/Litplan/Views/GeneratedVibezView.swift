//
//  GeneratedVibezView.swift
//  Litplan
//
//  Shows the user's past generated Vibez in reverse-chronological order.
//  Accessible from Profile → Generated Vibez.
//

import SwiftUI

struct GeneratedVibezView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var historyManager = VibezHistoryManager.shared
    @ObservedObject private var savedItemsManager = SavedItemsManager.shared

    @State private var selectedGroupFlow: GroupFlow?
    @State private var showClearConfirmation = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                if historyManager.isLoading {
                    LoadingStateView(message: "Loading your Vibez history...")
                } else if historyManager.history.isEmpty {
                    emptyState
                } else {
                    historyList
                }
            }
            .navigationBarHidden(true)
            .sheet(item: $selectedGroupFlow) { groupFlow in
                DetailedGroupFlowView(groupFlow: groupFlow, onDismiss: {
                    selectedGroupFlow = nil
                })
            }
            .alert("Clear History", isPresented: $showClearConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Clear All", role: .destructive) {
                    historyManager.clearHistory()
                }
            } message: {
                Text("This will permanently delete your Vibez generation history.")
            }
        }
    }

    // MARK: - History List

    private var historyList: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                // Header
                HStack(alignment: .top) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.textPrimary)
                            .frame(width: 40, height: 40)
                            .background(Color.surfacePrimary)
                            .cornerRadius(10)
                    }

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Generated Vibez")
                            .font(.displayLarge)
                            .foregroundColor(.textPrimary)

                        Text("\(historyManager.history.count) generation\(historyManager.history.count == 1 ? "" : "s")")
                            .font(.callout)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Button(action: { showClearConfirmation = true }) {
                        Text("Clear")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.textSecondary)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, 60)
                .padding(.bottom, Spacing.lg)

                LazyVStack(spacing: Spacing.md) {
                    ForEach(historyManager.history) { item in
                        VibezHistoryCard(
                            item: item,
                            cityName: savedItemsManager.getCityName(for: item.groupFlow)
                        ) {
                            HapticManager.shared.medium()
                            selectedGroupFlow = item.groupFlow
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 0) {
            // Header
            HStack(alignment: .top) {
                Button(action: { dismiss() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .frame(width: 40, height: 40)
                        .background(Color.surfacePrimary)
                        .cornerRadius(10)
                }

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("Generated Vibez")
                        .font(.displayLarge)
                        .foregroundColor(.textPrimary)

                    Text("Your generation history")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                }

                Spacer()
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, 60)
            .padding(.bottom, Spacing.lg)

            Spacer()

            VStack(spacing: Spacing.lg) {
                Image(systemName: "bolt.slash")
                    .font(.system(size: 60, weight: .light))
                    .foregroundColor(.textTertiary)

                VStack(spacing: Spacing.xs) {
                    Text("No Vibez yet")
                        .font(.headline)
                        .foregroundColor(.textPrimary)

                    Text("Generate your first Vibez and it will appear here.")
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.lg)
                }

                Button(action: {
                    HapticManager.shared.medium()
                    dismiss()
                    NotificationCenter.default.post(name: .navigateToVibezWithCity, object: nil)
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 14, weight: .semibold))
                        Text("Create a Vibez")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .foregroundColor(.textPrimary)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.sm)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color.accentPrimary))
                }
                .buttonStyle(PlainButtonStyle())
            }

            Spacer()
        }
    }
}

// MARK: - Vibez History Card

struct VibezHistoryCard: View {
    let item: VibezHistoryItem
    let cityName: String
    let onTap: () -> Void

    private var relativeDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: item.generatedAt, relativeTo: Date())
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(item.groupFlow.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.textPrimary)
                            .lineLimit(2)

                        HStack(spacing: 4) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 11))
                                .foregroundColor(.accentPrimary)
                            Text(cityName)
                                .font(.callout)
                                .foregroundColor(.textSecondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: Spacing.xs) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.accentPrimary)

                        Text(relativeDate)
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)
                    }
                }

                HStack(spacing: Spacing.md) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)
                        Text(item.groupFlow.formattedDuration)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)
                        Text("\(item.groupFlow.activities.count) venues")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Text(item.groupFlow.difficulty.capitalized)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(difficultyColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(difficultyColor.opacity(0.15)))
                }
            }
            .padding(Spacing.md)
            .background(Color.surfacePrimary)
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.surfaceSecondary, lineWidth: 1))
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var difficultyColor: Color {
        switch item.groupFlow.difficulty {
        case "easy": return .success
        case "moderate": return .warning
        case "intense": return .error
        default: return .textSecondary
        }
    }
}

#Preview("Generated Vibez") {
    GeneratedVibezView()
}
