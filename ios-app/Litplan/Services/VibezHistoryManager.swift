//
//  VibezHistoryManager.swift
//  Litplan
//
//  Persists the last 50 generated GroupFlows locally so users can revisit their history.
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

    private let maxItems = 50
    private let storageKey = "litplan.vibez.history"
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private init() {
        loadFromStorage()
    }

    func addGeneration(_ groupFlow: GroupFlow) {
        history.removeAll { $0.groupFlow.id == groupFlow.id }
        history.insert(VibezHistoryItem(id: groupFlow.id, groupFlow: groupFlow, generatedAt: Date()), at: 0)
        if history.count > maxItems {
            history = Array(history.prefix(maxItems))
        }
        saveToStorage()
    }

    func clearHistory() {
        history = []
        UserDefaults.standard.removeObject(forKey: storageKey)
    }

    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return }
        do {
            history = try decoder.decode([VibezHistoryItem].self, from: data)
        } catch {
            print("[VibezHistoryManager] Failed to decode history: \(error)")
        }
    }

    private func saveToStorage() {
        do {
            let data = try encoder.encode(history)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            print("[VibezHistoryManager] Failed to encode history: \(error)")
        }
    }
}
