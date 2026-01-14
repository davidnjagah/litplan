//
//  CopyableAddressView.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/05/26.
//  Reusable component for displaying copyable addresses with Maps integration
//

import SwiftUI
import MapKit

struct CopyableAddressView: View {
    let address: String
    var coordinates: CLLocationCoordinate2D? = nil
    var venueName: String? = nil
    var googleMapsUrl: URL? = nil  // Verified Google Maps URL from Places API

    @State private var showCopiedToast: Bool = false
    @State private var toastData: ToastData? = nil

    /// Whether the address can be opened in Maps (has coordinates or Google Maps URL)
    private var canOpenInMaps: Bool {
        coordinates != nil || googleMapsUrl != nil
    }

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            // Address text - tappable to open in Maps
            if canOpenInMaps {
                Button(action: openInMaps) {
                    addressContent
                }
                .buttonStyle(.plain)
            } else {
                addressContent
            }

            Spacer()

            // Copy button
            Button(action: copyAddress) {
                Image(systemName: "doc.on.doc")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.accentPrimary)
                    .frame(width: 32, height: 32)
                    .background(Color.accentPrimary.opacity(0.15))
                    .cornerRadius(8)
            }
            .accessibilityLabel("Copy address")
            .accessibilityHint("Double tap to copy address to clipboard")
        }
        .toast($toastData)
    }

    // MARK: - Address Content

    private var addressContent: some View {
        HStack(alignment: .top, spacing: Spacing.xs) {
            if canOpenInMaps {
                Image(systemName: "map.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.accentPrimary)
                    .frame(width: 20)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(address)
                    .font(.system(size: 14))
                    .foregroundColor(canOpenInMaps ? .accentPrimary : .textSecondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                if canOpenInMaps {
                    Text("Tap to open in Maps")
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .accessibilityLabel(address)
        .accessibilityHint(canOpenInMaps ? "Double tap to open in Maps" : "")
    }

    // MARK: - Actions

    private func copyAddress() {
        // Copy to clipboard
        UIPasteboard.general.string = address

        // Haptic feedback
        HapticManager.shared.light()

        // Show toast
        toastData = ToastData(type: .success, message: "Address copied to clipboard")
    }

    private func openInMaps() {
        HapticManager.shared.medium()

        // Prefer Google Maps URL if available (more accurate, verified address)
        if let googleMapsUrl = googleMapsUrl {
            UIApplication.shared.open(googleMapsUrl)
            return
        }

        // Fallback to Apple Maps with coordinates
        guard let coordinates = coordinates else { return }

        let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: coordinates))
        mapItem.name = venueName ?? "Location"
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
        ])
    }
}

// MARK: - Convenience Initializers

extension CopyableAddressView {
    /// Initialize with just an address string (no Maps integration)
    init(address: String) {
        self.address = address
        self.coordinates = nil
        self.venueName = nil
        self.googleMapsUrl = nil
    }

    /// Initialize with address, coordinates, and optional venue name for Maps integration
    init(address: String, latitude: Double, longitude: Double, venueName: String? = nil) {
        self.address = address
        self.coordinates = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        self.venueName = venueName
        self.googleMapsUrl = nil
    }

    /// Initialize with address, coordinates, venue name, and Google Maps URL
    /// The Google Maps URL takes priority over coordinates when opening in maps
    init(address: String, latitude: Double, longitude: Double, venueName: String? = nil, googleMapsUrl: URL?) {
        self.address = address
        self.coordinates = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        self.venueName = venueName
        self.googleMapsUrl = googleMapsUrl
    }
}

// MARK: - Preview

#Preview("With Maps Integration") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack(spacing: 20) {
            CopyableAddressView(
                address: "131 W 3rd St, New York, NY 10012",
                latitude: 40.7308,
                longitude: -74.0008,
                venueName: "Blue Note Jazz Club"
            )
            .padding()
            .background(Color.surfacePrimary)
            .cornerRadius(12)

            CopyableAddressView(
                address: "848 Washington St, New York, NY 10014",
                latitude: 40.7409,
                longitude: -74.0076,
                venueName: "Le Bain"
            )
            .padding()
            .background(Color.surfacePrimary)
            .cornerRadius(12)
        }
        .padding()
    }
}

#Preview("Without Maps Integration") {
    ZStack {
        Color.appBackground
            .ignoresSafeArea()

        VStack(spacing: 20) {
            CopyableAddressView(address: "131 W 3rd St, New York, NY 10012")
                .padding()
                .background(Color.surfacePrimary)
                .cornerRadius(12)
        }
        .padding()
    }
}
