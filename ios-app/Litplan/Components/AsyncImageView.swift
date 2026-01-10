//
//  AsyncImageView.swift
//  Litplan
//
//  Created by UI Designer Agent on 12/28/25.
//  Sprint 4, Day 18 - Optimized async image loading with caching and performance improvements
//

import SwiftUI
import UIKit

// MARK: - Shimmer Effect Modifier

/// Animated shimmer effect for loading placeholders
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.clear,
                            Color.white.opacity(0.3),
                            Color.clear
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + (phase * geometry.size.width * 2))
                }
            )
            .mask(content)
            .onAppear {
                withAnimation(
                    Animation.linear(duration: 1.5)
                        .repeatForever(autoreverses: false)
                ) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}

// MARK: - Image Cache Manager

/// Centralized image cache using NSCache for memory-efficient caching
class ImageCacheManager {
    static let shared = ImageCacheManager()

    private let cache: NSCache<NSString, UIImage>
    private let fileManager = FileManager.default
    private let diskCacheURL: URL

    private init() {
        cache = NSCache<NSString, UIImage>()
        // Set memory limit to 50MB (50 * 1024 * 1024 bytes)
        cache.totalCostLimit = 50 * 1024 * 1024
        // Set count limit to 100 images
        cache.countLimit = 100

        // Disk cache directory
        let cachesDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        diskCacheURL = cachesDirectory.appendingPathComponent("ImageCache")

        // Create disk cache directory if it doesn't exist
        try? fileManager.createDirectory(at: diskCacheURL, withIntermediateDirectories: true)

        // Listen for memory warnings
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(clearMemoryCache),
            name: UIApplication.didReceiveMemoryWarningNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Memory Cache

    func setImage(_ image: UIImage, forKey key: String) {
        let cost = image.jpegData(compressionQuality: 1.0)?.count ?? 0
        cache.setObject(image, forKey: key as NSString, cost: cost)
    }

    func image(forKey key: String) -> UIImage? {
        return cache.object(forKey: key as NSString)
    }

    @objc private func clearMemoryCache() {
        cache.removeAllObjects()
    }

    // MARK: - Disk Cache

    func diskCacheURL(forKey key: String) -> URL {
        let filename = key.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? key
        return diskCacheURL.appendingPathComponent(filename)
    }

    func saveToDisk(_ image: UIImage, forKey key: String) {
        let url = diskCacheURL(forKey: key)
        if let data = image.jpegData(compressionQuality: 0.8) {
            try? data.write(to: url)
        }
    }

    func loadFromDisk(forKey key: String) -> UIImage? {
        let url = diskCacheURL(forKey: key)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }

    // MARK: - Cache Management

    func clearDiskCache() {
        try? fileManager.removeItem(at: diskCacheURL)
        try? fileManager.createDirectory(at: diskCacheURL, withIntermediateDirectories: true)
    }

    func getCacheSize() -> Int64 {
        guard let files = try? fileManager.contentsOfDirectory(at: diskCacheURL, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }

        return files.reduce(0) { total, url in
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
            return total + Int64(size)
        }
    }

    // MARK: - Image Prefetching

    /// Prefetch images in the background for faster loading
    /// - Parameter urls: Array of URLs to prefetch
    func prefetchImages(_ urls: [URL]) {
        for url in urls {
            let cacheKey = url.absoluteString

            // Skip if already cached
            if image(forKey: cacheKey) != nil { continue }
            if loadFromDisk(forKey: cacheKey) != nil { continue }

            // Download in background
            Task(priority: .low) {
                do {
                    let (data, _) = try await URLSession.shared.data(from: url)
                    if let image = UIImage(data: data) {
                        setImage(image, forKey: cacheKey)
                        saveToDisk(image, forKey: cacheKey)
                        #if DEBUG
                        print("[ImageCache] Prefetched: \(url.lastPathComponent)")
                        #endif
                    }
                } catch {
                    #if DEBUG
                    print("[ImageCache] Prefetch failed for \(url.lastPathComponent): \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    /// Check if an image is already cached (memory or disk)
    func isCached(forKey key: String) -> Bool {
        return image(forKey: key) != nil || loadFromDisk(forKey: key) != nil
    }
}

// MARK: - Async Image View

/// Optimized async image view with caching, downsampling, and progressive loading
struct AsyncImageView: View {
    let url: URL?
    let contentMode: ContentMode
    let showPlaceholder: Bool
    let downsampleSize: CGSize?

    @State private var isLoaded = false
    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    @State private var hasError = false

    init(
        url: URL?,
        contentMode: ContentMode = .fill,
        showPlaceholder: Bool = true,
        downsampleSize: CGSize? = nil
    ) {
        self.url = url
        self.contentMode = contentMode
        self.showPlaceholder = showPlaceholder
        self.downsampleSize = downsampleSize
    }

    var body: some View {
        Group {
            if let image = loadedImage {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
                    .opacity(isLoaded ? 1.0 : 0.0)
                    .onAppear {
                        withAnimation(.easeIn(duration: 0.3)) {
                            isLoaded = true
                        }
                    }
            } else if hasError {
                errorState
            } else if isLoading {
                loadingState
            } else {
                loadingState
                    .onAppear {
                        loadImage()
                    }
            }
        }
        .onDisappear {
            // Cancel loading when view disappears
            isLoading = false
        }
    }

    // MARK: - Loading State (Shimmer Effect)

    private var loadingState: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [
                        Color.surfaceSecondary,
                        Color.surfaceSecondary.opacity(0.7),
                        Color.surfaceSecondary
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .shimmer()
    }

    // MARK: - Error State

    private var errorState: some View {
        Color.surfaceSecondary
            .overlay {
                if showPlaceholder {
                    VStack(spacing: 4) {
                        Image(systemName: "photo")
                            .foregroundColor(.textTertiary)
                            .font(.system(size: 24))
                    }
                }
            }
    }

    // MARK: - Image Loading

    private func loadImage() {
        guard let url = url else {
            hasError = true
            return
        }

        let cacheKey = url.absoluteString

        // Check memory cache first (instant load)
        if let cachedImage = ImageCacheManager.shared.image(forKey: cacheKey) {
            self.loadedImage = cachedImage
            self.isLoaded = true // Skip animation for cached images
            return
        }

        // Check disk cache (fast load)
        if let diskImage = ImageCacheManager.shared.loadFromDisk(forKey: cacheKey) {
            ImageCacheManager.shared.setImage(diskImage, forKey: cacheKey)
            self.loadedImage = diskImage
            self.isLoaded = true // Skip animation for cached images
            return
        }

        // Download image from network
        isLoading = true
        hasError = false

        Task {
            do {
                let (data, response) = try await URLSession.shared.data(from: url)

                // Validate HTTP response
                if let httpResponse = response as? HTTPURLResponse,
                   !(200...299).contains(httpResponse.statusCode) {
                    await MainActor.run {
                        self.hasError = true
                        self.isLoading = false
                    }
                    return
                }

                // Only process if still loading (view hasn't disappeared)
                guard isLoading else { return }

                var image: UIImage?

                // Downsample if size specified (memory optimization)
                if let targetSize = downsampleSize {
                    image = downsampleImage(data: data, to: targetSize)
                } else {
                    image = UIImage(data: data)
                }

                guard let finalImage = image else {
                    await MainActor.run {
                        self.hasError = true
                        self.isLoading = false
                    }
                    return
                }

                // Cache image for future use
                ImageCacheManager.shared.setImage(finalImage, forKey: cacheKey)
                ImageCacheManager.shared.saveToDisk(finalImage, forKey: cacheKey)

                await MainActor.run {
                    self.loadedImage = finalImage
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.hasError = true
                    self.isLoading = false
                    #if DEBUG
                    print("[AsyncImageView] Failed to load image: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    // MARK: - Downsampling

    /// Downsample image for memory efficiency (avoids loading full-resolution into memory)
    private func downsampleImage(data: Data, to targetSize: CGSize) -> UIImage? {
        let imageSourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let imageSource = CGImageSourceCreateWithData(data as CFData, imageSourceOptions) else {
            return nil
        }

        let maxDimensionInPixels = max(targetSize.width, targetSize.height) * UIScreen.main.scale

        let downsampleOptions = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDimensionInPixels
        ] as CFDictionary

        guard let downsampledImage = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, downsampleOptions) else {
            return nil
        }

        return UIImage(cgImage: downsampledImage)
    }
}

// MARK: - Convenience Extensions

extension AsyncImageView {

    /// Thumbnail style - 120x120pt square with downsampling
    static func thumbnail(url: URL?) -> some View {
        AsyncImageView(
            url: url,
            contentMode: .fill,
            showPlaceholder: true,
            downsampleSize: CGSize(width: 120, height: 120)
        )
        .frame(width: 120, height: 120)
        .cornerRadius(12)
        .clipped()
    }

    /// Card style - flexible width with downsampling for performance
    static func card(url: URL?, width: CGFloat = 280, height: CGFloat = 200) -> some View {
        AsyncImageView(
            url: url,
            contentMode: .fill,
            showPlaceholder: true,
            downsampleSize: CGSize(width: width, height: height)
        )
        .frame(width: width, height: height)
        .cornerRadius(16)
        .clipped()
    }

    /// Hero style - full width with downsampling
    static func hero(url: URL?, height: CGFloat = 200) -> some View {
        GeometryReader { geometry in
            AsyncImageView(
                url: url,
                contentMode: .fill,
                showPlaceholder: true,
                downsampleSize: CGSize(width: geometry.size.width, height: height)
            )
            .frame(width: geometry.size.width, height: height)
            .clipped()
        }
        .frame(height: height)
    }

    /// Circular avatar style with downsampling
    static func avatar(url: URL?, size: CGFloat = 80) -> some View {
        AsyncImageView(
            url: url,
            contentMode: .fill,
            showPlaceholder: true,
            downsampleSize: CGSize(width: size, height: size)
        )
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}

// MARK: - Preview

#Preview("Thumbnail") {
    VStack(spacing: 20) {
        AsyncImageView.thumbnail(url: URL(string: "https://picsum.photos/200"))

        AsyncImageView.thumbnail(url: URL(string: "https://invalid-url.com/image.jpg"))
    }
    .padding()
    .background(Color.appBackground)
}

#Preview("Card") {
    VStack(spacing: 20) {
        AsyncImageView.card(
            url: URL(string: "https://picsum.photos/400/300"),
            width: 300,
            height: 220
        )

        AsyncImageView.card(
            url: URL(string: "https://invalid-url.com/image.jpg"),
            width: 300,
            height: 220
        )
    }
    .padding()
    .background(Color.appBackground)
}

#Preview("Hero") {
    VStack(spacing: 20) {
        AsyncImageView.hero(
            url: URL(string: "https://picsum.photos/800/400"),
            height: 250
        )

        AsyncImageView.hero(
            url: URL(string: "https://invalid-url.com/image.jpg"),
            height: 250
        )
    }
    .background(Color.appBackground)
}

#Preview("Avatar") {
    VStack(spacing: 20) {
        AsyncImageView.avatar(
            url: URL(string: "https://picsum.photos/200"),
            size: 100
        )

        AsyncImageView.avatar(
            url: URL(string: "https://invalid-url.com/image.jpg"),
            size: 100
        )
    }
    .padding()
    .background(Color.appBackground)
}
