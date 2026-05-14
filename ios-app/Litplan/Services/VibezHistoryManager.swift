//
//  VibezHistoryManager.swift
//  Litplan
//
//  Persists every generated GroupFlow to Supabase so Pro users can
//  browse their full history from Profile → Generated Vibez.
//  Strategy: write to server on generation (fire-and-forget Task).
//            On login: server fetch replaces local UserDefaults cache.
//            On logout: local cache cleared.
//

import Foundation

struct VibezHistoryItem: Codable, Identifiable {
    let id: String          // mirrors GroupFlow.id
    let groupFlow: GroupFlow
    let generatedAt: Date
}

@MainActor
class VibezHistoryManager: ObservableObject {
    static let shared = VibezHistoryManager()

    @Published private(set) var history: [VibezHistoryItem] = []
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var hasPerformedInitialFetch: Bool = false

    private let maxLocalItems = 50
    private let storageKey = "litplan.vibez.history"
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    // MARK: - Supabase row types

    private struct GeneratedVibezRow: Decodable {
        let id: String
        let userId: String
        let flowId: String
        let flowData: GroupFlow
        let generatedAt: String
        enum CodingKeys: String, CodingKey {
            case id, userId, flowId, flowData, generatedAt
        }
    }

    private struct GeneratedVibezInsert: Encodable {
        let id: String
        let userId: String
        let flowId: String
        let flowData: GroupFlow
        enum CodingKeys: String, CodingKey {
            case id, userId, flowId, flowData
        }
    }

    // MARK: - Init

    private init() {
        loadFromStorage()
        observeAuthChanges()
    }

    private func observeAuthChanges() {
        Task {
            guard let client = SupabaseManager.shared.client else { return }
            for await (event, _) in client.auth.authStateChanges {
                switch event {
                case .signedIn:
                    await fetchFromServer()
                case .signedOut:
                    clearLocalHistory()
                default:
                    break
                }
            }
        }
    }

    // MARK: - Record a generation

    func addGeneration(_ groupFlow: GroupFlow) {
        // Local update first (instant UI)
        history.removeAll { $0.groupFlow.id == groupFlow.id }
        history.insert(VibezHistoryItem(id: groupFlow.id, groupFlow: groupFlow, generatedAt: Date()), at: 0)
        if history.count > maxLocalItems {
            history = Array(history.prefix(maxLocalItems))
        }
        saveToStorage()

        // Background server write
        Task { await serverRecord(groupFlow) }
    }

    // MARK: - Server sync

    func fetchFromServer() async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }

        isLoading = true
        defer { isLoading = false }

        do {
            let rows: [GeneratedVibezRow] = try await client
                .from("GeneratedVibez")
                .select()
                .eq("userId", value: userId)
                .order("generatedAt", ascending: false)
                .limit(100)
                .execute()
                .value

            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let fallbackFormatter = ISO8601DateFormatter()

            let items: [VibezHistoryItem] = rows.map { row in
                let date = isoFormatter.date(from: row.generatedAt)
                    ?? fallbackFormatter.date(from: row.generatedAt)
                    ?? Date()
                return VibezHistoryItem(id: row.flowId, groupFlow: row.flowData, generatedAt: date)
            }

            history = items
            saveToStorage()
            print("[VibezHistoryManager] Fetched \(items.count) items from server")
        } catch {
            print("[VibezHistoryManager] Server fetch failed, using local cache: \(error)")
        }

        hasPerformedInitialFetch = true
    }

    private func serverRecord(_ groupFlow: GroupFlow) async {
        guard let userId = SupabaseManager.shared.currentUser?.id,
              let client = SupabaseManager.shared.client else { return }

        let row = GeneratedVibezInsert(
            id: UUID().uuidString,
            userId: userId,
            flowId: groupFlow.id,
            flowData: groupFlow
        )
        do {
            try await client
                .from("GeneratedVibez")
                .upsert(row, onConflict: "userId,flowId")
                .execute()
            print("[VibezHistoryManager] Recorded generation: \(groupFlow.id)")
        } catch {
            print("[VibezHistoryManager] Failed to record generation on server: \(error)")
        }
    }

    // MARK: - Clear

    func clearHistory() {
        history = []
        UserDefaults.standard.removeObject(forKey: storageKey)
    }

    private func clearLocalHistory() {
        history = []
        hasPerformedInitialFetch = false
        UserDefaults.standard.removeObject(forKey: storageKey)
        print("[VibezHistoryManager] Cleared local history on sign-out")
    }

    // MARK: - Local persistence

    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return }
        do {
            history = try decoder.decode([VibezHistoryItem].self, from: data)
        } catch {
            print("[VibezHistoryManager] Failed to decode local history: \(error)")
        }
    }

    private func saveToStorage() {
        do {
            let data = try encoder.encode(history)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            print("[VibezHistoryManager] Failed to save local history: \(error)")
        }
    }
}
