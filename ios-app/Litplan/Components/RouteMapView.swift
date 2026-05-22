//
//  RouteMapView.swift
//  Litplan
//
//  Created by UI Designer Agent on 01/03/26.
//  Sprint 18D - Route map component for group plan visualization
//

import SwiftUI
import MapKit

/// A venue location for the route map
struct VenueLocation: Identifiable {
    let id: String
    let name: String
    let coordinate: CLLocationCoordinate2D
    let order: Int
    var address: String = ""
}

/// A map view that displays multiple venues with a route connecting them
struct RouteMapView: View {
    let venues: [VenueLocation]
    var planTitle: String = "Route Plan"

    @State private var cameraPosition: MapCameraPosition = .automatic
    @State private var routePolylines: [MKRoute] = []
    @State private var isLoadingRoutes: Bool = true
    @State private var routeLoadError: String? = nil
    @State private var showingShareSheet: Bool = false

    private let routeColor = Color.accentPrimary

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header
            HStack {
                Text("Route Map")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.textPrimary)

                Spacer()

                if isLoadingRoutes {
                    ProgressView()
                        .tint(.accentPrimary)
                        .scaleEffect(0.8)
                }

                // Share button
                Button(action: {
                    showingShareSheet = true
                }) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.accentPrimary)
                        .frame(width: 36, height: 36)
                        .background(Color.surfacePrimary)
                        .cornerRadius(8)
                }
                .accessibilityLabel("Share route")
            }

            // Map
            ZStack(alignment: .topTrailing) {
                Map(position: $cameraPosition) {
                    // Draw route polylines
                    ForEach(routePolylines, id: \.self) { route in
                        MapPolyline(route.polyline)
                            .stroke(routeColor, lineWidth: 4)
                    }

                    // Venue markers
                    ForEach(venues.sorted(by: { $0.order < $1.order })) { venue in
                        Annotation(
                            venue.name,
                            coordinate: venue.coordinate,
                            anchor: .bottom
                        ) {
                            VenueMarker(order: venue.order, name: venue.name)
                        }
                    }
                }
                .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .including([.restaurant, .nightlife, .cafe, .brewery, .winery])))
                .mapControls {
                    MapCompass()
                    MapScaleView()
                    MapUserLocationButton()
                }
                .onTapGesture {
                    openDirectionsInAppleMaps()
                }

                // Directions button — top right corner
                Button(action: openDirectionsInAppleMaps) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(Color.surfacePrimary.opacity(0.95)))
                        .shadow(color: Color.black.opacity(0.2), radius: 4, x: 0, y: 2)
                }
                .padding(12)
                .accessibilityLabel("Get directions in Apple Maps")
            }
            .frame(height: 300)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.surfaceSecondary, lineWidth: 1)
            )

            // Route legend
            if venues.count > 1 {
                routeLegend
            }
        }
        .onAppear {
            calculateRoutes()
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareSheet(items: [shareText])
        }
    }

    // MARK: - Share Text

    private var shareText: String {
        let sortedVenues = venues.sorted { $0.order < $1.order }
        var text = "\u{1F5FA} \(planTitle)\n\n"

        text += "\u{1F4CD} \(sortedVenues.count) stops on this route\n\n"

        text += "---\n\n"
        text += "\u{1F6A9} ROUTE ITINERARY\n\n"

        for (index, venue) in sortedVenues.enumerated() {
            let venueNumber = index + 1
            let stepLabel = venueNumber == 1 ? "Start" : (venueNumber == sortedVenues.count ? "Final Stop" : "Stop \(venueNumber)")

            text += "\(venueNumber). \(venue.name) [\(stepLabel)]\n"
            if !venue.address.isEmpty {
                text += "   \u{1F4CD} \(venue.address)\n"
            }
            text += "   \u{1F517} maps://maps.apple.com/?daddr=\(venue.coordinate.latitude),\(venue.coordinate.longitude)\n\n"
        }

        text += "---\n"
        text += "Plan your perfect night out with LitPlanz\n"
        text += "Download: https://litplanz.com"
        return text
    }

    // MARK: - Open Directions in Apple Maps

    /// Opens a walking route between the venues in Apple Maps, starting from
    /// the FIRST venue (not the user's current location).
    ///
    /// Apple Maps' URL scheme support for multi-stop is inconsistent: `+to:`
    /// waypoints work reliably with address strings but are often dropped
    /// when the destination is `lat,lng`. We do two things to make this as
    /// robust as possible:
    ///
    ///   1. Set `saddr` to the first venue so Apple Maps doesn't try to use
    ///      the user's current location as the start (which would route them
    ///      from where they are to venue 1 — wrong behaviour for a saved plan).
    ///
    ///   2. Chain remaining venues in `daddr` with `+to:` separators. Apple
    ///      Maps will honour the first leg at minimum. If their parser later
    ///      improves to accept coordinate waypoints, all stops light up
    ///      automatically.
    ///
    /// For the user's visual reference, the embedded RouteMapView in the
    /// plan card already draws the full connected route — Apple Maps is for
    /// turn-by-turn navigation between adjacent stops.
    private func openDirectionsInAppleMaps() {
        guard !venues.isEmpty else { return }
        let sortedVenues = venues.sorted { $0.order < $1.order }

        // Single-venue fallback — no route, just open the pin
        if sortedVenues.count == 1, let only = sortedVenues.first {
            let item = MKMapItem(placemark: MKPlacemark(coordinate: only.coordinate))
            item.name = only.name
            item.openInMaps(launchOptions: [
                MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
            ])
            return
        }

        // Two or more venues — build the URL with saddr=first, daddr=rest chained
        let coordString: (CLLocationCoordinate2D) -> String = { c in
            "\(c.latitude),\(c.longitude)"
        }
        let saddr = coordString(sortedVenues[0].coordinate)
        let daddr = sortedVenues
            .dropFirst()
            .map { coordString($0.coordinate) }
            .joined(separator: "+to:")
        let urlString = "https://maps.apple.com/?saddr=\(saddr)&daddr=\(daddr)&dirflg=w"

        guard let url = URL(string: urlString) else { return }
        UIApplication.shared.open(url)
    }

    // MARK: - Route Legend

    private var routeLegend: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            ForEach(venues.sorted(by: { $0.order < $1.order })) { venue in
                HStack(spacing: Spacing.sm) {
                    // Order number
                    ZStack {
                        Circle()
                            .fill(Color.accentPrimary)
                            .frame(width: 24, height: 24)

                        Text("\(venue.order)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                    }

                    Text(venue.name)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)

                    Spacer()

                    // Arrow to next venue (except last)
                    if venue.order < venues.count {
                        Image(systemName: "arrow.right")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.textTertiary)
                    }
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.surfacePrimary)
        .cornerRadius(12)
    }

    // MARK: - Route Calculation

    private func calculateRoutes() {
        guard venues.count > 1 else {
            isLoadingRoutes = false
            fitMapToVenues()
            return
        }

        let sortedVenues = venues.sorted { $0.order < $1.order }
        var loadedRoutes: [MKRoute] = []
        var failedRoutes = 0
        let routePairs = sortedVenues.count - 1

        for i in 0..<routePairs {
            let source = sortedVenues[i]
            let destination = sortedVenues[i + 1]

            calculateRoute(from: source.coordinate, to: destination.coordinate) { route in
                DispatchQueue.main.async {
                    if let route = route {
                        loadedRoutes.append(route)
                    } else {
                        failedRoutes += 1
                    }

                    // Check if all routes are processed
                    if loadedRoutes.count + failedRoutes == routePairs {
                        self.routePolylines = loadedRoutes
                        self.isLoadingRoutes = false

                        // Silently omit routes that couldn't be computed —
                        // venue pins are still shown so the map stays useful.

                        // Fit map to show all venues and routes
                        self.fitMapToVenues()
                    }
                }
            }
        }
    }

    private func calculateRoute(
        from source: CLLocationCoordinate2D,
        to destination: CLLocationCoordinate2D,
        completion: @escaping (MKRoute?) -> Void
    ) {
        // Skip invalid coordinates
        guard CLLocationCoordinate2DIsValid(source), CLLocationCoordinate2DIsValid(destination),
              source.latitude != 0 || source.longitude != 0,
              destination.latitude != 0 || destination.longitude != 0 else {
            completion(nil)
            return
        }

        attemptRoute(from: source, to: destination, transportType: .automobile) { route in
            if let route = route {
                completion(route)
            } else {
                // Automobile routing unavailable — try walking (better global coverage)
                self.attemptRoute(from: source, to: destination, transportType: .walking) { route in
                    completion(route) // nil is fine; pins are still shown on map
                }
            }
        }
    }

    private func attemptRoute(
        from source: CLLocationCoordinate2D,
        to destination: CLLocationCoordinate2D,
        transportType: MKDirectionsTransportType,
        completion: @escaping (MKRoute?) -> Void
    ) {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: source))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = transportType
        request.requestsAlternateRoutes = false

        MKDirections(request: request).calculate { response, error in
            if let error = error {
                print("[RouteMapView] \(transportType == .automobile ? "Automobile" : "Walking") route error: \(error.localizedDescription)")
            }
            completion(response?.routes.first)
        }
    }

    private func fitMapToVenues() {
        guard !venues.isEmpty else { return }

        // Calculate bounding region for all venues
        let coordinates = venues.map { $0.coordinate }

        var minLat = coordinates[0].latitude
        var maxLat = coordinates[0].latitude
        var minLon = coordinates[0].longitude
        var maxLon = coordinates[0].longitude

        for coord in coordinates {
            minLat = min(minLat, coord.latitude)
            maxLat = max(maxLat, coord.latitude)
            minLon = min(minLon, coord.longitude)
            maxLon = max(maxLon, coord.longitude)
        }

        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2

        // Add padding to the span
        let latDelta = max((maxLat - minLat) * 1.5, 0.02)
        let lonDelta = max((maxLon - minLon) * 1.5, 0.02)

        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
            span: MKCoordinateSpan(latitudeDelta: latDelta, longitudeDelta: lonDelta)
        )

        withAnimation(.easeInOut(duration: 0.5)) {
            cameraPosition = .region(region)
        }
    }
}

// MARK: - Venue Marker View

struct VenueMarker: View {
    let order: Int
    let name: String

    @State private var isExpanded: Bool = false

    var body: some View {
        VStack(spacing: 0) {
            // Marker bubble
            ZStack {
                // Background
                Circle()
                    .fill(Color.accentPrimary)
                    .frame(width: 40, height: 40)
                    .shadow(color: Color.black.opacity(0.3), radius: 4, x: 0, y: 2)

                // Order number
                Text("\(order)")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
            }

            // Pin tail
            VenueMarkerTail()
                .fill(Color.accentPrimary)
                .frame(width: 14, height: 10)
                .offset(y: -2)
        }
        .onTapGesture {
            withAnimation(.spring(response: 0.3)) {
                isExpanded.toggle()
            }
        }
    }
}

// MARK: - Venue Marker Tail Shape

struct VenueMarkerTail: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Preview

#Preview("NYC Route") {
    RouteMapView(venues: [
        VenueLocation(
            id: "1",
            name: "Brooklyn Brewery",
            coordinate: CLLocationCoordinate2D(latitude: 40.7219, longitude: -73.9575),
            order: 1
        ),
        VenueLocation(
            id: "2",
            name: "Blue Note Jazz Club",
            coordinate: CLLocationCoordinate2D(latitude: 40.7308, longitude: -74.0008),
            order: 2
        ),
        VenueLocation(
            id: "3",
            name: "Le Bain at The Standard",
            coordinate: CLLocationCoordinate2D(latitude: 40.7409, longitude: -74.0076),
            order: 3
        )
    ])
    .padding()
    .background(Color.appBackground)
}

#Preview("LA Route") {
    RouteMapView(venues: [
        VenueLocation(
            id: "1",
            name: "Skybar",
            coordinate: CLLocationCoordinate2D(latitude: 34.0970, longitude: -118.3768),
            order: 1
        ),
        VenueLocation(
            id: "2",
            name: "The Troubadour",
            coordinate: CLLocationCoordinate2D(latitude: 34.0904, longitude: -118.3881),
            order: 2
        )
    ])
    .padding()
    .background(Color.appBackground)
}

#Preview("Single Venue") {
    RouteMapView(venues: [
        VenueLocation(
            id: "1",
            name: "Blue Note Jazz Club",
            coordinate: CLLocationCoordinate2D(latitude: 40.7308, longitude: -74.0008),
            order: 1
        )
    ])
    .padding()
    .background(Color.appBackground)
}
