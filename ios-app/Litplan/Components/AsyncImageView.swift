//
//  AsyncImageView.swift
//  Litplan
//
//  Optimized for low memory usage (<200MB total app memory)
//

import SwiftUI
import UIKit

// MARK: - Lightweight Image Cache (Memory Only)

/// Minimal memory cache - relies on system URL cache for disk
class ImageCacheManager {
    static let shared = ImageCacheManager()

    private let cache: NSCache<NSString, UIImage>

    private init() {
        cache = NSCache<NSString, UIImage>()
        // Balanced: 25MB memory limit, max 50 images
        // NSCache will auto-evict when memory pressure increases
        cache.totalCostLimit = 25 * 1024 * 1024
        cache.countLimit = 50

        // Clear on memory warning
        NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.cache.removeAllObjects()
        }

        // Clear when app goes to background
        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.cache.removeAllObjects()
        }
    }

    func image(forKey key: String) -> UIImage? {
        cache.object(forKey: key as NSString)
    }

    func setImage(_ image: UIImage, forKey key: String) {
        // Only cache small images (< 500KB estimated)
        let estimatedSize = Int(image.size.width * image.size.height * 4)
        if estimatedSize < 500_000 {
            cache.setObject(image, forKey: key as NSString, cost: estimatedSize)
        }
    }

    func clearCache() {
        cache.removeAllObjects()
    }
}

// MARK: - Lean Async Image View

/// Memory-efficient async image loading with aggressive downsampling
struct AsyncImageView: View {
    let url: URL?
    let contentMode: ContentMode
    let targetSize: CGSize

    @State private var loadedImage: UIImage?
    @State private var isLoading = false

    init(url: URL?, contentMode: ContentMode = .fill, targetSize: CGSize = CGSize(width: 200, height: 200)) {
        self.url = url
        self.contentMode = contentMode
        self.targetSize = targetSize
    }

    var body: some View {
        Group {
            if let image = loadedImage {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
            } else {
                // Simple placeholder - no shimmer animation (saves memory)
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
            }
        }
        .onAppear { loadImage() }
        // Note: Don't clear images on disappear - causes flickering during scroll
        // Memory is managed by NSCache limits and memory warning notifications
    }

    private func loadImage() {
        guard let url = url, !isLoading else { return }

        let cacheKey = url.absoluteString

        // Check memory cache
        if let cached = ImageCacheManager.shared.image(forKey: cacheKey) {
            loadedImage = cached
            return
        }

        isLoading = true

        Task(priority: .userInitiated) {
            guard let image = await downloadAndDownsample(url: url, targetSize: targetSize) else {
                await MainActor.run { isLoading = false }
                return
            }

            ImageCacheManager.shared.setImage(image, forKey: cacheKey)

            await MainActor.run {
                loadedImage = image
                isLoading = false
            }
        }
    }

    /// Download and downsample in one pass for minimal memory usage
    private func downloadAndDownsample(url: URL, targetSize: CGSize) async -> UIImage? {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)

            // Downsample during decode to avoid loading full image into memory
            let maxDimension = max(targetSize.width, targetSize.height) * UIScreen.main.scale

            let options: [CFString: Any] = [
                kCGImageSourceShouldCache: false,
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: maxDimension
            ]

            guard let source = CGImageSourceCreateWithData(data as CFData, nil),
                  let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
                return nil
            }

            return UIImage(cgImage: cgImage)
        } catch {
            return nil
        }
    }
}

// MARK: - Convenience Initializers

extension AsyncImageView {
    /// Thumbnail - 120x120
    static func thumbnail(url: URL?) -> some View {
        AsyncImageView(url: url, targetSize: CGSize(width: 120, height: 120))
            .frame(width: 120, height: 120)
            .cornerRadius(12)
            .clipped()
    }

    /// Card - custom size
    static func card(url: URL?, width: CGFloat = 280, height: CGFloat = 200) -> some View {
        AsyncImageView(url: url, targetSize: CGSize(width: width, height: height))
            .frame(width: width, height: height)
            .cornerRadius(16)
            .clipped()
    }

    /// Hero - full width
    static func hero(url: URL?, height: CGFloat = 200) -> some View {
        GeometryReader { geo in
            AsyncImageView(url: url, targetSize: CGSize(width: geo.size.width, height: height))
        }
        .frame(height: height)
        .clipped()
    }
}
