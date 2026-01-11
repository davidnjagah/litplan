//
//  CacheService.swift
//  Litplan
//
//  Lean cache service - file-based only, no memory caching
//  Optimized for low memory footprint
//

import Foundation

/// Lightweight file-based cache for API responses
class CacheService {
    static let shared = CacheService()

    private let cacheValidityDuration: TimeInterval = 24 * 60 * 60  // 24 hours

    private var cacheDirectory: URL {
        let paths = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
        let dir = paths[0].appendingPathComponent("LitplanCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private init() {}

    // MARK: - Cities

    func cacheCities(_ cities: [City]) {
        guard !cities.isEmpty else { return }
        save(cities, to: "cities.json", timestampKey: "cities")
    }

    func getCachedCities() -> [City]? {
        load([City].self, from: "cities.json", timestampKey: "cities")
    }

    // MARK: - Plans

    func cachePlans(_ plans: [Plan], for cityId: String) {
        guard !plans.isEmpty else { return }
        save(plans, to: "plans_\(cityId).json", timestampKey: "plans_\(cityId)")
    }

    func getCachedPlans(for cityId: String) -> [Plan]? {
        load([Plan].self, from: "plans_\(cityId).json", timestampKey: "plans_\(cityId)")
    }

    // MARK: - Group Flows

    func cacheGroupFlows(_ flows: [GroupFlow], for cityId: String) {
        guard !flows.isEmpty else { return }
        save(flows, to: "groupflows_\(cityId).json", timestampKey: "groupflows_\(cityId)")
    }

    func getCachedGroupFlows(for cityId: String) -> [GroupFlow]? {
        load([GroupFlow].self, from: "groupflows_\(cityId).json", timestampKey: "groupflows_\(cityId)")
    }

    // MARK: - Clear

    func clearAllCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        UserDefaults.standard.removeObject(forKey: "cache_timestamps")
    }

    // MARK: - Private Helpers

    private func save<T: Encodable>(_ data: T, to filename: String, timestampKey: String) {
        let url = cacheDirectory.appendingPathComponent(filename)
        guard let encoded = try? JSONEncoder().encode(data) else { return }
        try? encoded.write(to: url)
        updateTimestamp(for: timestampKey)
    }

    private func load<T: Decodable>(_ type: T.Type, from filename: String, timestampKey: String) -> T? {
        guard isValid(timestampKey: timestampKey) else { return nil }

        let url = cacheDirectory.appendingPathComponent(filename)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private func isValid(timestampKey: String) -> Bool {
        let timestamps = UserDefaults.standard.dictionary(forKey: "cache_timestamps") as? [String: Double] ?? [:]
        guard let ts = timestamps[timestampKey] else { return false }
        return Date().timeIntervalSince1970 - ts < cacheValidityDuration
    }

    private func updateTimestamp(for key: String) {
        var timestamps = UserDefaults.standard.dictionary(forKey: "cache_timestamps") as? [String: Double] ?? [:]
        timestamps[key] = Date().timeIntervalSince1970
        UserDefaults.standard.set(timestamps, forKey: "cache_timestamps")
    }
}
