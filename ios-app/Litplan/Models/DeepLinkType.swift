//
//  DeepLinkType.swift
//  Litplan
//
//  App Name: LitPlanz
//  Sprint: Email Authentication Flows
//  Enum for handling all deep link types in the app
//

import Foundation

/// Represents the different types of deep links the app can handle
enum DeepLinkType: Equatable {
    case emailVerification(tokenHash: String)
    case passwordReset(tokenHash: String)
    case magicLink(tokenHash: String)
    case invite(tokenHash: String)
    case oauthCallback(url: URL)
    case unknown

    /// Parse a URL into a DeepLinkType
    /// - Parameter url: The URL to parse
    /// - Returns: The corresponding DeepLinkType, or .unknown if not recognized
    static func from(url: URL) -> DeepLinkType {
        guard let scheme = url.scheme,
              scheme == "com.litplanz.app" else {
            return .unknown
        }

        let host = url.host ?? ""
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let queryItems = components?.queryItems ?? []

        // Extract common parameters
        let tokenHash = queryItems.first(where: { $0.name == "token_hash" || $0.name == "token" })?.value
        let type = queryItems.first(where: { $0.name == "type" })?.value

        // Route based on host or type parameter
        switch host {
        case "email-verified", "verify":
            if let token = tokenHash {
                return .emailVerification(tokenHash: token)
            }
            // Check type parameter as fallback
            if type == "signup" || type == "email", let token = tokenHash {
                return .emailVerification(tokenHash: token)
            }

        case "password-reset", "reset":
            if let token = tokenHash {
                return .passwordReset(tokenHash: token)
            }
            if type == "recovery", let token = tokenHash {
                return .passwordReset(tokenHash: token)
            }

        case "magic-link", "login":
            if let token = tokenHash {
                return .magicLink(tokenHash: token)
            }
            if type == "magiclink", let token = tokenHash {
                return .magicLink(tokenHash: token)
            }

        case "invite-accept", "invite":
            if let token = tokenHash {
                return .invite(tokenHash: token)
            }
            if type == "invite", let token = tokenHash {
                return .invite(tokenHash: token)
            }

        case "auth-callback", "callback":
            // Check for type parameter to determine specific flow
            if let typeValue = type {
                switch typeValue {
                case "signup", "email":
                    if let token = tokenHash {
                        return .emailVerification(tokenHash: token)
                    }
                case "recovery":
                    if let token = tokenHash {
                        return .passwordReset(tokenHash: token)
                    }
                case "magiclink":
                    if let token = tokenHash {
                        return .magicLink(tokenHash: token)
                    }
                case "invite":
                    if let token = tokenHash {
                        return .invite(tokenHash: token)
                    }
                default:
                    break
                }
            }
            // Fallback to OAuth callback
            return .oauthCallback(url: url)

        default:
            // Check type parameter as final fallback
            if let typeValue = type, let token = tokenHash {
                switch typeValue {
                case "signup", "email":
                    return .emailVerification(tokenHash: token)
                case "recovery":
                    return .passwordReset(tokenHash: token)
                case "magiclink":
                    return .magicLink(tokenHash: token)
                case "invite":
                    return .invite(tokenHash: token)
                default:
                    break
                }
            }
        }

        // If we have any token-related query params, it might be an OAuth callback
        if queryItems.contains(where: { $0.name == "access_token" || $0.name == "refresh_token" }) {
            return .oauthCallback(url: url)
        }

        return .unknown
    }

    /// Human-readable title for this deep link type
    var title: String {
        switch self {
        case .emailVerification:
            return "Email Verification"
        case .passwordReset:
            return "Password Reset"
        case .magicLink:
            return "Magic Link Sign In"
        case .invite:
            return "Invitation"
        case .oauthCallback:
            return "Sign In"
        case .unknown:
            return "Unknown"
        }
    }

    /// Extract the token hash if present
    var tokenHash: String? {
        switch self {
        case .emailVerification(let token),
             .passwordReset(let token),
             .magicLink(let token),
             .invite(let token):
            return token
        case .oauthCallback, .unknown:
            return nil
        }
    }
}
