// LitPlanz — App Store Preview video resizer
//
// Letterboxes a source video into a target Apple App Preview resolution
// without cropping (preserves all content; adds black bars top/bottom or
// left/right as needed for the aspect difference).
//
// Usage:
//   swift tools/resize-app-preview.swift INPUT OUTPUT WIDTH HEIGHT
//
// Example (886 × 1920 — Apple's universal preview size accepted on 6.7",
// 6.5", and 6.1" iPhone slots):
//   swift tools/resize-app-preview.swift \
//     ~/Desktop/preview-raw.mov \
//     ~/Desktop/preview-886x1920.mp4 \
//     886 1920
//
// Other accepted sizes (per Apple):
//   886 × 1920    — universal preview (best fit for most submissions)
//   1290 × 2796   — iPhone 6.7" Pro Max native
//   1170 × 2532   — iPhone 6.1" native
//   1242 × 2688   — iPhone 6.5" notched (deprecated)

import AVFoundation
import CoreMedia
import Foundation

guard CommandLine.arguments.count == 5,
      let targetW = Double(CommandLine.arguments[3]),
      let targetH = Double(CommandLine.arguments[4]) else {
    print("Usage: swift resize-app-preview.swift INPUT OUTPUT WIDTH HEIGHT")
    exit(1)
}
let inputPath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let targetSize = CGSize(width: targetW, height: targetH)

try? FileManager.default.removeItem(atPath: outputPath)

let inputURL = URL(fileURLWithPath: inputPath)
let outputURL = URL(fileURLWithPath: outputPath)
let asset = AVURLAsset(url: inputURL)

guard let videoTrack = asset.tracks(withMediaType: .video).first else {
    print("❌ No video track in \(inputPath)"); exit(1)
}

let sourceSize = videoTrack.naturalSize.applying(videoTrack.preferredTransform)
let sourceW = abs(sourceSize.width)
let sourceH = abs(sourceSize.height)
print("Source: \(Int(sourceW)) × \(Int(sourceH))")
print("Target: \(Int(targetSize.width)) × \(Int(targetSize.height))")

let scale = min(targetSize.width / sourceW, targetSize.height / sourceH)
let scaledW = sourceW * scale
let scaledH = sourceH * scale
let offsetX = (targetSize.width - scaledW) / 2
let offsetY = (targetSize.height - scaledH) / 2

if offsetY > 0 {
    print("Letterbox: \(Int(offsetY))px top + bottom")
} else if offsetX > 0 {
    print("Pillarbox: \(Int(offsetX))px left + right")
} else {
    print("No padding needed — exact aspect match")
}

let composition = AVMutableComposition()
guard let compVideoTrack = composition.addMutableTrack(
        withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
      let _ = try? compVideoTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: asset.duration),
        of: videoTrack, at: .zero) else {
    print("❌ Couldn't build video composition"); exit(1)
}

if let audioTrack = asset.tracks(withMediaType: .audio).first,
   let compAudio = composition.addMutableTrack(
        withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    try? compAudio.insertTimeRange(
        CMTimeRange(start: .zero, duration: asset.duration),
        of: audioTrack, at: .zero)
}

var transform = CGAffineTransform.identity
transform = transform.translatedBy(x: offsetX, y: offsetY)
transform = transform.scaledBy(x: scale, y: scale)
let combined = videoTrack.preferredTransform.concatenating(transform)

let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: compVideoTrack)
layer.setTransform(combined, at: .zero)

let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)
instruction.layerInstructions = [layer]
instruction.backgroundColor = CGColor(red: 0, green: 0, blue: 0, alpha: 1)

let composition2 = AVMutableVideoComposition()
composition2.renderSize = targetSize
composition2.frameDuration = CMTime(value: 1, timescale: 30)
composition2.instructions = [instruction]

guard let exporter = AVAssetExportSession(
        asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    print("❌ Couldn't create exporter"); exit(1)
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.videoComposition = composition2

let sem = DispatchSemaphore(value: 0)
exporter.exportAsynchronously {
    switch exporter.status {
    case .completed:
        print("✅ Wrote \(outputPath)")
    case .failed:
        print("❌ Export failed: \(exporter.error?.localizedDescription ?? "unknown")")
    case .cancelled:
        print("⚠️ Cancelled")
    default:
        print("State: \(exporter.status.rawValue)")
    }
    sem.signal()
}
sem.wait()
