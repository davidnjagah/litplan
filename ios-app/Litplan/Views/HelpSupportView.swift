//
//  HelpSupportView.swift
//  Litplan
//
//  App Name: LitPlanz
//  Created by UI Designer Agent on 12/30/25.
//  Help & Support view - Sprint 8 implementation
//

import SwiftUI
import MessageUI

struct HelpSupportView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var showMailComposer: Bool = false
    @State private var showMailError: Bool = false
    @State private var expandedFAQ: String? = nil

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: Spacing.xl) {
                        // Contact Section
                        contactSection

                        // FAQ Section
                        faqSection

                        // Resources Section
                        resourcesSection

                        Spacer()
                            .frame(height: Spacing.xl)
                    }
                    .padding(.top, Spacing.lg)
                }
            }
            .navigationTitle("Help & Support")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.accentPrimary)
                }
            }
            .alert("Email Not Available", isPresented: $showMailError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Please email us at support@litplanz.com")
            }
        }
    }

    // MARK: - Contact Section

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Contact Us")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                contactRow(
                    icon: "envelope.fill",
                    title: "Email Support",
                    subtitle: "support@litplanz.com",
                    action: {
                        if MFMailComposeViewController.canSendMail() {
                            showMailComposer = true
                        } else {
                            showMailError = true
                        }
                    }
                )

                contactRow(
                    icon: "globe",
                    title: "Visit Website",
                    subtitle: "www.litplanz.com",
                    action: {
                        if let url = URL(string: "https://www.litplanz.com") {
                            UIApplication.shared.open(url)
                        }
                    }
                )

                contactRow(
                    icon: "bubble.left.and.bubble.right.fill",
                    title: "Social Media",
                    subtitle: "@litplanapp",
                    action: {
                        if let url = URL(string: "https://twitter.com/litplanapp") {
                            UIApplication.shared.open(url)
                        }
                    }
                )
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private func contactRow(
        icon: String,
        title: String,
        subtitle: String,
        action: @escaping () -> Void
    ) -> some View {
        StandardCard {
            Button(action: action) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(.accentPrimary)
                        .frame(width: 32)

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(title)
                            .font(.body)
                            .foregroundColor(.textPrimary)

                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(.textTertiary)
                }
                .padding(Spacing.md)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }

    // MARK: - FAQ Section

    private var faqSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Frequently Asked Questions")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                faqItem(
                    id: "subscription",
                    question: "How do I manage my subscription?",
                    answer: "You can manage your subscription through the Profile tab. Go to Subscription Management to view your current plan, upgrade, or cancel. All billing is handled through the App Store."
                )

                faqItem(
                    id: "cities",
                    question: "How do I save cities?",
                    answer: "Pro subscribers can save unlimited cities. Simply tap the bookmark icon on any city to save it for quick access later. Your saved cities appear in your Profile."
                )

                faqItem(
                    id: "plans",
                    question: "What are nightlife plans?",
                    answer: "Plans are curated itineraries for a night out in each city. They include venue recommendations, timing suggestions, and insider tips to help you explore the local nightlife scene."
                )

                faqItem(
                    id: "offline",
                    question: "Can I use LitPlanz offline?",
                    answer: "Some features require an internet connection. However, we cache recently viewed cities and plans so you can access them even when offline."
                )

                faqItem(
                    id: "account",
                    question: "How do I delete my account?",
                    answer: "You can delete your account from Account Settings. Go to your Profile, tap Account Settings, and scroll to the Danger Zone section. Tap Delete to permanently remove your account and all associated data."
                )
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private func faqItem(id: String, question: String, answer: String) -> some View {
        StandardCard {
            VStack(alignment: .leading, spacing: 0) {
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        if expandedFAQ == id {
                            expandedFAQ = nil
                        } else {
                            expandedFAQ = id
                        }
                    }
                }) {
                    HStack {
                        Text(question)
                            .font(.body)
                            .foregroundColor(.textPrimary)
                            .multilineTextAlignment(.leading)

                        Spacer()

                        Image(systemName: expandedFAQ == id ? "chevron.up" : "chevron.down")
                            .font(.system(size: 14))
                            .foregroundColor(.textTertiary)
                    }
                    .padding(Spacing.md)
                }
                .buttonStyle(PlainButtonStyle())

                if expandedFAQ == id {
                    Text(answer)
                        .font(.callout)
                        .foregroundColor(.textSecondary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.bottom, Spacing.md)
                }
            }
        }
    }

    // MARK: - Resources Section

    private var resourcesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Resources")
                .font(.headline)
                .foregroundColor(.textPrimary)
                .padding(.horizontal, Spacing.md)

            VStack(spacing: Spacing.sm) {
                resourceRow(
                    icon: "doc.text",
                    title: "Terms of Service",
                    action: {
                        if let url = URL(string: "https://www.litplanz.com/terms") {
                            UIApplication.shared.open(url)
                        }
                    }
                )

                resourceRow(
                    icon: "lock.shield",
                    title: "Privacy Policy",
                    action: {
                        if let url = URL(string: "https://www.litplanz.com/privacy") {
                            UIApplication.shared.open(url)
                        }
                    }
                )
            }
            .padding(.horizontal, Spacing.md)
        }
    }

    private func resourceRow(
        icon: String,
        title: String,
        action: @escaping () -> Void
    ) -> some View {
        StandardCard {
            Button(action: action) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(.textSecondary)
                        .frame(width: 32)

                    Text(title)
                        .font(.body)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 14))
                        .foregroundColor(.textTertiary)
                }
                .padding(Spacing.md)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
}

#Preview {
    HelpSupportView()
}
