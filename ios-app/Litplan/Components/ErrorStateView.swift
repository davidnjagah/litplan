//
//  ErrorStateView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 16-17 - Reusable error state component for API failures
//  Day 17: Added error code parsing and user-friendly messages
//

import SwiftUI

// MARK: - Backend Error Codes
enum BackendErrorCode: String {
    case rateLimitExceeded = "RATE_LIMIT_EXCEEDED"
    case authenticationError = "AUTHENTICATION_ERROR"
    case authorizationError = "AUTHORIZATION_ERROR"
    case notFound = "NOT_FOUND"
    case externalServiceError = "EXTERNAL_SERVICE_ERROR"
    case databaseError = "DATABASE_ERROR"
    case networkError = "NETWORK_ERROR"
    case unknown = "UNKNOWN_ERROR"

    var userFriendlyMessage: (icon: String, title: String, message: String) {
        switch self {
        case .rateLimitExceeded:
            return (
                icon: "clock.badge.exclamationmark",
                title: "Slow Down",
                message: "Too many requests. Please wait a moment and try again."
            )
        case .authenticationError:
            return (
                icon: "person.crop.circle.badge.xmark",
                title: "Session Expired",
                message: "Your session has expired. Please sign in again to continue."
            )
        case .authorizationError:
            return (
                icon: "lock.shield",
                title: "Premium Feature",
                message: "This feature requires LitPlanz Pro. Upgrade to unlock unlimited access."
            )
        case .notFound:
            return (
                icon: "doc.text.magnifyingglass",
                title: "Not Found",
                message: "The content you're looking for is not available right now."
            )
        case .externalServiceError:
            return (
                icon: "server.rack",
                title: "Service Unavailable",
                message: "Our service is temporarily unavailable. We're working to restore it."
            )
        case .databaseError:
            return (
                icon: "exclamationmark.triangle",
                title: "Something Went Wrong",
                message: "We encountered an unexpected error. Please try again in a moment."
            )
        case .networkError:
            return (
                icon: "wifi.slash",
                title: "Connection Lost",
                message: "Unable to connect. Please check your internet connection and try again."
            )
        case .unknown:
            return (
                icon: "xmark.circle",
                title: "Error",
                message: "An unexpected error occurred. Please try again."
            )
        }
    }
}

struct ErrorStateView: View {
    let icon: String
    let title: String
    let message: String
    let retryButtonText: String
    let onRetry: () -> Void

    // MARK: - Initializers

    /// Default initializer with manual error details
    init(
        icon: String = "wifi.slash",
        title: String = "Connection Lost",
        message: String = "Unable to load plans. Please check your connection and try again.",
        retryButtonText: String = "Retry",
        onRetry: @escaping () -> Void
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.retryButtonText = retryButtonText
        self.onRetry = onRetry
    }

    /// Convenience initializer with error code parsing
    init(
        errorCode: String,
        retryButtonText: String = "Retry",
        onRetry: @escaping () -> Void
    ) {
        let backendError = BackendErrorCode(rawValue: errorCode) ?? .unknown
        let errorInfo = backendError.userFriendlyMessage

        self.icon = errorInfo.icon
        self.title = errorInfo.title
        self.message = errorInfo.message
        self.retryButtonText = retryButtonText
        self.onRetry = onRetry
    }

    /// Convenience initializer with Error object parsing
    init(
        error: Error,
        retryButtonText: String = "Retry",
        onRetry: @escaping () -> Void
    ) {
        // Try to parse error code from error description
        let errorDescription = error.localizedDescription

        // Check for specific error patterns
        let backendError: BackendErrorCode
        if errorDescription.contains("RATE_LIMIT") || errorDescription.contains("429") {
            backendError = .rateLimitExceeded
        } else if errorDescription.contains("AUTHENTICATION") || errorDescription.contains("401") {
            backendError = .authenticationError
        } else if errorDescription.contains("AUTHORIZATION") || errorDescription.contains("403") {
            backendError = .authorizationError
        } else if errorDescription.contains("NOT_FOUND") || errorDescription.contains("404") {
            backendError = .notFound
        } else if errorDescription.contains("EXTERNAL_SERVICE") || errorDescription.contains("503") {
            backendError = .externalServiceError
        } else if errorDescription.contains("DATABASE") || errorDescription.contains("500") {
            backendError = .databaseError
        } else if errorDescription.contains("network") || errorDescription.contains("NSURLError") {
            backendError = .networkError
        } else {
            backendError = .unknown
        }

        let errorInfo = backendError.userFriendlyMessage
        self.icon = errorInfo.icon
        self.title = errorInfo.title
        self.message = errorInfo.message
        self.retryButtonText = retryButtonText
        self.onRetry = onRetry
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Error icon
            Image(systemName: icon)
                .font(.system(size: 80, weight: .light))
                .foregroundColor(.error)
                .padding(.top, Spacing.xxl)
                .accessibilityHidden(true)

            // Error text content
            VStack(spacing: Spacing.xs) {
                Text(title)
                    .font(.displayMedium)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)
                    .multilineTextAlignment(.center)

                Text(message)
                    .font(.bodyLarge)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Retry button
            Button(action: {
                HapticManager.shared.warning()
                onRetry()
            }) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16, weight: .semibold))

                    Text(retryButtonText)
                        .font(.body)
                        .fontWeight(.semibold)
                }
                .foregroundColor(.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.md)
                .background(Color.accentPrimary)
                .cornerRadius(12)
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .accessibilityLabel(retryButtonText)
            .accessibilityHint("Retry loading data")
            .accessibilityAddTraits(.isButton)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(title)
        .accessibilityHint(message)
    }
}

// MARK: - Preview
#Preview("Connection Lost") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        ErrorStateView {
            print("Retry tapped")
        }
    }
}

#Preview("Server Error") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        ErrorStateView(
            icon: "exclamationmark.triangle",
            title: "Server Error",
            message: "Something went wrong on our end. We're working to fix it.",
            retryButtonText: "Try Again"
        ) {
            print("Retry tapped")
        }
    }
}

#Preview("Data Load Failed") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        ErrorStateView(
            icon: "xmark.circle",
            title: "Failed to Load Plans",
            message: "We couldn't retrieve the nightlife plans. Please try again.",
            retryButtonText: "Reload"
        ) {
            print("Retry tapped")
        }
    }
}

#Preview("No Internet") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        ErrorStateView(
            icon: "antenna.radiowaves.left.and.right.slash",
            title: "No Internet Connection",
            message: "Connect to the internet to load nightlife plans.",
            retryButtonText: "Try Again"
        ) {
            print("Retry tapped")
        }
    }
}
