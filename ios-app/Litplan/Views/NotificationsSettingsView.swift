//
//  NotificationsSettingsView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/30/25.
//  Notification settings view - Sprint 8 implementation
//

import SwiftUI
import UserNotifications

struct NotificationsSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var pushNotificationsEnabled: Bool = false
    @State private var planReminders: Bool = true
    @State private var newCityAlerts: Bool = true
    @State private var promotionalEmails: Bool = false
    @State private var weeklyDigest: Bool = true
    @State private var isCheckingPermission: Bool = true
    @State private var showPermissionAlert: Bool = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: Spacing.xl) {
                        // Push Notifications Section
                        pushNotificationsSection

                        // Notification Types Section
                        if pushNotificationsEnabled {
                            notificationTypesSection
                        }

                        // Email Preferences Section
                        emailPreferencesSection

                        Spacer()
                            .frame(height: Spacing.xl)
                    }
                    .padding(.top, Spacing.lg)
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.accentPrimary)
                }
            }
            .onAppear {
                checkNotificationPermission()
            }
            .alert("Enable Notifications", isPresented: $showPermissionAlert) {
                Button("Open Settings") {
                    openAppSettings()
                }
                Button("Cancel", role: .cancel) {
                    pushNotificationsEnabled = false
                }
            } message: {
                Text("To receive notifications, please enable them in Settings.")
            }
        }
    }

    // MARK: - Push Notifications Section

    private var pushNotificationsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Push Notifications")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            StandardCard {
                VStack(spacing: Spacing.sm) {
                    if isCheckingPermission {
                        HStack {
                            Text("Checking permission...")
                                .font(.body)
                                .foregroundColor(.textSecondary)
                            Spacer()
                            ProgressView()
                        }
                        .padding(Spacing.md)
                    } else {
                        Toggle(isOn: $pushNotificationsEnabled) {
                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                Text("Allow Notifications")
                                    .font(.body)
                                    .foregroundColor(.textPrimary)

                                Text("Get updates about your plans and saved cities")
                                    .font(.caption)
                                    .foregroundColor(.textSecondary)
                            }
                        }
                        .toggleStyle(SwitchToggleStyle(tint: .accentPrimary))
                        .padding(Spacing.md)
                        .onChange(of: pushNotificationsEnabled) { oldValue, newValue in
                            handleNotificationToggle(newValue)
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Notification Types Section

    private var notificationTypesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Notification Types")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                notificationToggleRow(
                    title: "Plan Reminders",
                    subtitle: "Get reminded about upcoming plans",
                    isOn: $planReminders,
                    icon: "calendar.badge.clock"
                )

                notificationToggleRow(
                    title: "New City Alerts",
                    subtitle: "Be notified when new cities are added",
                    isOn: $newCityAlerts,
                    icon: "building.2"
                )
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Email Preferences Section

    private var emailPreferencesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Email Preferences")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                notificationToggleRow(
                    title: "Weekly Digest",
                    subtitle: "Receive weekly nightlife highlights",
                    isOn: $weeklyDigest,
                    icon: "envelope"
                )

                notificationToggleRow(
                    title: "Promotional Emails",
                    subtitle: "Special offers and updates",
                    isOn: $promotionalEmails,
                    icon: "tag"
                )
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    // MARK: - Toggle Row

    private func notificationToggleRow(
        title: String,
        subtitle: String,
        isOn: Binding<Bool>,
        icon: String
    ) -> some View {
        StandardCard {
            Toggle(isOn: isOn) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(.accentPrimary)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(title)
                            .font(.body)
                            .foregroundColor(.textPrimary)

                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: .accentPrimary))
            .padding(Spacing.md)
        }
    }

    // MARK: - Helper Methods

    private func checkNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                isCheckingPermission = false
                pushNotificationsEnabled = settings.authorizationStatus == .authorized
            }
        }
    }

    private func handleNotificationToggle(_ enabled: Bool) {
        if enabled {
            requestNotificationPermission()
        }
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if !granted {
                    showPermissionAlert = true
                }
                pushNotificationsEnabled = granted
            }
        }
    }

    private func openAppSettings() {
        if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(settingsURL)
        }
    }
}

#Preview {
    NotificationsSettingsView()
}
