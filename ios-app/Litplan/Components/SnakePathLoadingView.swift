//
//  SnakePathLoadingView.swift
//  Litplan
//
//  Loading animation for the async Bolt pipeline. A wide, flowing serpentine
//  road carves smooth S-curves from top to bottom of the card area, picking
//  up 3 drop-pin location markers with a bounce as it passes them, then
//  retreats and crawls again.
//
//  Path uses cubic Bezier curves with G1-continuous control points (each
//  curve's first control point is the mirror of the previous curve's last
//  control point across the join), giving truly smooth flowing turns rather
//  than sharp corner joints.
//

import SwiftUI

struct SnakePathLoadingView: View {
    /// Total length of one forward+reverse cycle in seconds.
    private let cycleSeconds: Double = 3.2

    /// Phase boundaries inside one cycle.
    private let forwardEnd: Double  = 1.5 / 3.2   // draw forward
    private let holdEnd: Double     = 1.7 / 3.2   // hold full
    private let reverseEnd: Double  = 3.0 / 3.2   // retreat
    // remainder (3.0–3.2s) = hold-empty before next loop

    /// Trim progress (0…1 along the path) at which each pin pops in.
    private let pinTriggers: [Double] = [0.20, 0.55, 0.85]

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation(minimumInterval: 1.0 / 60.0)) { context in
                let phase = phase(at: context.date)
                let progress = trimProgress(at: phase)

                ZStack {
                    // Thick "road" — light translucent stroke giving the full
                    // path a soft trail look (always visible, slightly faded)
                    SnakeShape()
                        .stroke(
                            Color(red: 0.55, green: 0.45, blue: 0.95).opacity(0.10),
                            style: StrokeStyle(lineWidth: 14, lineCap: .round, lineJoin: .round)
                        )

                    // Glowing forward stroke — the snake itself
                    SnakeShape()
                        .trim(from: 0, to: progress)
                        .stroke(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.69, green: 0.40, blue: 0.95),  // violet
                                    Color(red: 0.36, green: 0.74, blue: 0.99),  // cyan
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round, lineJoin: .round)
                        )
                        .shadow(color: Color(red: 0.55, green: 0.45, blue: 0.95).opacity(0.55),
                                radius: 12, x: 0, y: 0)

                    // Three drop pins, popping in as the path passes each one
                    ForEach(0..<pinTriggers.count, id: \.self) { idx in
                        let trigger = pinTriggers[idx]
                        let point = pointOnPath(at: trigger, in: geo.size)
                        let appearance = pinAppearance(progress: progress, trigger: trigger)

                        DropPin()
                            .scaleEffect(pinScale(appearance))
                            .opacity(appearance)
                            .position(x: point.x, y: point.y - 22)  // anchor pin tip on path
                            .animation(.spring(response: 0.42, dampingFraction: 0.55),
                                       value: appearance > 0)
                    }
                }
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Generating your plan")
        .accessibilityValue("Searching venues")
        .accessibilityAddTraits(.isImage)
    }

    // MARK: - Phase + progress math

    private func phase(at date: Date) -> Double {
        let t = date.timeIntervalSinceReferenceDate
        return (t.truncatingRemainder(dividingBy: cycleSeconds)) / cycleSeconds
    }

    private func trimProgress(at phase: Double) -> Double {
        if phase < forwardEnd {
            return easeInOut(phase / forwardEnd)
        } else if phase < holdEnd {
            return 1.0
        } else if phase < reverseEnd {
            let r = (phase - holdEnd) / (reverseEnd - holdEnd)
            return 1.0 - easeInOut(r)
        } else {
            return 0.0
        }
    }

    private func pinAppearance(progress: Double, trigger: Double) -> Double {
        let window = 0.05
        if progress < trigger - window { return 0 }
        if progress >= trigger { return 1 }
        return (progress - (trigger - window)) / window
    }

    private func pinScale(_ p: Double) -> CGFloat {
        if p <= 0 { return 0 }
        if p >= 1 { return 1.0 }
        // Slight overshoot peaking mid-appearance for a bounce feel
        let overshoot = sin(p * .pi) * 0.25
        return CGFloat(p + overshoot)
    }

    private func easeInOut(_ t: Double) -> Double {
        t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2
    }

    /// Sample the serpentine path at parametric position t ∈ [0,1].
    private func pointOnPath(at t: Double, in size: CGSize) -> CGPoint {
        let segments = SnakeShape.segments(in: size)
        let perSegment = 1.0 / Double(segments.count)
        let idx = min(Int(t / perSegment), segments.count - 1)
        let localT = (t - Double(idx) * perSegment) / perSegment
        return segments[idx].point(at: localT)
    }
}

// MARK: - Serpentine path (cubic bezier S-curves)

private struct SnakeShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let segs = Self.segments(in: rect.size)
        p.move(to: segs[0].start)
        for s in segs {
            p.addCurve(to: s.end, control1: s.c1, control2: s.c2)
        }
        return p
    }

    /// Four cubic bezier segments that zigzag the snake from top to bottom
    /// with G1-continuous joins (smooth flowing curves, no sharp corners).
    static func segments(in size: CGSize) -> [CubicSegment] {
        let w = size.width
        let h = size.height

        // Y bands (descending)
        let y0 = h * 0.06
        let y1 = h * 0.30
        let y2 = h * 0.54
        let y3 = h * 0.78
        let y4 = h * 0.96

        // Side extremes — the turning points of the S
        let xL = w * 0.18
        let xR = w * 0.82
        let xC = w * 0.50

        // Horizontal pull at each turn — controls how curvy the turns feel.
        // Larger = more bowed; smaller = tighter S.
        let pull = w * 0.30

        // Segment 1: top-center → upper-right
        // Tangent at start: rightward
        // Tangent at end: leftward (so segment 2 enters going left)
        let s1 = CubicSegment(
            start: CGPoint(x: xC, y: y0),
            end:   CGPoint(x: xR, y: y1),
            c1:    CGPoint(x: xC + pull, y: y0),
            c2:    CGPoint(x: xR + pull, y: y1)
        )

        // Segment 2: upper-right → mid-left
        // c1 = mirror of s1.c2 about s1.end → guarantees smooth join
        let s2c1 = mirror(s1.c2, about: s1.end)
        let s2 = CubicSegment(
            start: s1.end,
            end:   CGPoint(x: xL, y: y2),
            c1:    s2c1,
            c2:    CGPoint(x: xL - pull, y: y2)
        )

        // Segment 3: mid-left → lower-right
        let s3c1 = mirror(s2.c2, about: s2.end)
        let s3 = CubicSegment(
            start: s2.end,
            end:   CGPoint(x: xR, y: y3),
            c1:    s3c1,
            c2:    CGPoint(x: xR + pull, y: y3)
        )

        // Segment 4: lower-right → bottom-center
        let s4c1 = mirror(s3.c2, about: s3.end)
        let s4 = CubicSegment(
            start: s3.end,
            end:   CGPoint(x: xC, y: y4),
            c1:    s4c1,
            c2:    CGPoint(x: xC + pull, y: y4)
        )

        return [s1, s2, s3, s4]
    }

    /// Reflect a point across a pivot. Used to compute smooth-join control points.
    private static func mirror(_ p: CGPoint, about pivot: CGPoint) -> CGPoint {
        CGPoint(x: 2 * pivot.x - p.x, y: 2 * pivot.y - p.y)
    }
}

/// Cubic Bezier segment with sampler.
private struct CubicSegment {
    let start: CGPoint
    let end: CGPoint
    let c1: CGPoint
    let c2: CGPoint

    /// Point on the cubic Bezier at parametric t ∈ [0, 1].
    /// B(t) = (1-t)³ P0 + 3(1-t)² t C1 + 3(1-t) t² C2 + t³ P1
    func point(at t: Double) -> CGPoint {
        let u = 1 - t
        let uu = u * u
        let uuu = uu * u
        let tt = t * t
        let ttt = tt * t

        let x = uuu * Double(start.x)
              + 3 * uu * t * Double(c1.x)
              + 3 * u * tt * Double(c2.x)
              + ttt * Double(end.x)
        let y = uuu * Double(start.y)
              + 3 * uu * t * Double(c1.y)
              + 3 * u * tt * Double(c2.y)
              + ttt * Double(end.y)
        return CGPoint(x: x, y: y)
    }
}

// MARK: - Drop pin (teardrop with inset circle)

private struct DropPin: View {
    var body: some View {
        ZStack {
            // Soft outer glow
            DropPinShape()
                .fill(Color(red: 0.36, green: 0.74, blue: 0.99).opacity(0.35))
                .frame(width: 40, height: 50)
                .blur(radius: 10)

            // Pin body — deep violet → indigo gradient
            DropPinShape()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.51, green: 0.31, blue: 0.86),  // violet
                            Color(red: 0.31, green: 0.20, blue: 0.62),  // indigo
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 30, height: 38)
                .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 2)

            // Inner cyan circle
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.45, green: 0.85, blue: 1.0),
                            Color(red: 0.20, green: 0.65, blue: 0.95),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 16, height: 16)
                .offset(y: -7)  // sit inside the bulb portion of the pin
        }
    }
}

/// Teardrop / drop-pin shape — bulb on top, tapered point at bottom.
private struct DropPinShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width
        let r = w / 2                                // bulb radius
        let center = CGPoint(x: rect.midX, y: rect.minY + r)
        let tip = CGPoint(x: rect.midX, y: rect.maxY)

        // Where the tapered tail meets the bulb (angle from horizontal-down)
        let tailAngle: CGFloat = .pi / 5             // 36°
        let leftMeet = CGPoint(
            x: center.x - r * sin(tailAngle),
            y: center.y + r * cos(tailAngle)
        )
        let rightMeet = CGPoint(
            x: center.x + r * sin(tailAngle),
            y: center.y + r * cos(tailAngle)
        )

        // Start at tip, sweep up to right meet via tapered curve
        p.move(to: tip)
        p.addQuadCurve(
            to: rightMeet,
            control: CGPoint(x: rightMeet.x, y: tip.y - (tip.y - rightMeet.y) * 0.35)
        )

        // Arc over the top of the bulb (counter-clockwise visually, so use clockwise:true
        // in SwiftUI's y-down coordinate system which mirrors the convention)
        p.addArc(
            center: center,
            radius: r,
            startAngle: .radians(.pi / 2 - tailAngle),  // bottom-right of bulb
            endAngle:   .radians(.pi / 2 + tailAngle),  // bottom-left of bulb
            clockwise: true                              // sweep over the top
        )

        // Curve back from left meet to tip
        p.addQuadCurve(
            to: tip,
            control: CGPoint(x: leftMeet.x, y: tip.y - (tip.y - leftMeet.y) * 0.35)
        )

        p.closeSubpath()
        return p
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        // Dark Vibez background to match BoltView
        LinearGradient(
            colors: [Color(red: 0.06, green: 0.04, blue: 0.12), .black],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()

        SnakePathLoadingView()
            .frame(width: 300, height: 380)
    }
}
