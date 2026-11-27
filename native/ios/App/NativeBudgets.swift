import SwiftUI
import Security
import FinTrackCore

private enum BudgetKey {
    static let service = "md.fintrack.personal.budgets"
    static var query: [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "widget-readonly"] }
    static func read() -> String? {
        var q = query; q[kSecReturnData as String] = true
        var result: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func save(_ value: String) throws {
        var q = query; q[kSecValueData as String] = Data(value.utf8); q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        if status == errSecDuplicateItem {
            guard SecItemUpdate(query as CFDictionary, [kSecValueData as String: Data(value.utf8)] as CFDictionary) == errSecSuccess else { throw BudgetError.unavailable }
        } else if status != errSecSuccess { throw BudgetError.unavailable }
    }
    static func remove() { SecItemDelete(query as CFDictionary) }
}
struct NativeBudgets: View {
    let open: (URL) -> Void
    @State private var token = BudgetKey.read() ?? ""
    @State private var input = ""
    @State private var snapshot: BudgetSnapshot?
    @State private var error: String?
    @State private var loading = false
    @State private var revoked = false
    var body: some View {
        NavigationStack {
            List {
                if token.isEmpty || revoked {
                    Section("Conectează bugetele") {
                        Text("Creează o cheie de citire în FinTrack → iPhone și scurtături → Widget cu bugetele tale.")
                        Button("Deschide pagina de conectare") { open(FinTrack.widgetKeys) }
                        SecureField("Cheia ft_wg_", text: $input).textInputAutocapitalization(.never).autocorrectionDisabled()
                        PasteButton(payloadType: String.self) { values in input = values.first?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "" }
                        Button("Conectează") { Task { await connect() } }.disabled(loading || input.isEmpty)
                    }
                }
                if loading { ProgressView("Se încarcă…") }
                if let error { Section { Text(error).foregroundStyle(.red); Button("Încearcă din nou") { Task { await refresh() } }.disabled(loading) } }
                if let snapshot {
                    Section(snapshot.source == "allocations" ? "Alocările tale · MDL" : "Bugetele lunii · MDL") {
                        if snapshot.budgets.isEmpty { Text("Nu ai bugete în MDL. Configurează-le în FinTrack.") }
                        ForEach(snapshot.budgets) { budget in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack { Text(budget.name).font(.headline); Spacer(); Text(budget.percentText).monospacedDigit() }
                                ProgressView(value: budget.progress).tint(budget.remainingMinor < 0 ? .red : .blue)
                                Text((budget.remainingMinor < 0 ? "Depășit · " : budget.limitMinor == 0 ? "Nealimentat · " : "Rămas · ") + FinTrack.money(budget.remainingMinor)).font(.subheadline).monospacedDigit()
                                if !budget.enabled { Text("Alocare în pauză").font(.caption).foregroundStyle(.secondary) }
                            }.padding(.vertical, 8).privacySensitive()
                        }
                    }
                    Section { Text("Actualizat: \(snapshot.updatedAt.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary) }
                }
                if !token.isEmpty {
                    Section {
                        Button("Gestionează bugetele în FinTrack") { open(FinTrack.budgets) }
                        Button("Copiază cheia pentru widget") { UIPasteboard.general.setItems([[UIPasteboard.typeAutomatic: token]], options: [.localOnly: true, .expirationDate: Date().addingTimeInterval(120)]) }
                        Button("Deconectează bugetele pe acest dispozitiv", role: .destructive) { BudgetKey.remove(); token = ""; input = ""; snapshot = nil; error = nil; revoked = false }
                    }
                }
            }.navigationTitle("Bugete")
                .refreshable { await refresh() }
                .task { if !token.isEmpty { await refresh() } }
        }
    }
    private func connect() async {
        let candidate = input.trimmingCharacters(in: .whitespacesAndNewlines)
        loading = true; error = nil
        defer { loading = false }
        do {
            let result = try await BudgetClient().fetch(token: candidate)
            try BudgetKey.save(candidate)
            token = candidate; input = ""; snapshot = result; revoked = false
        } catch { self.error = error.localizedDescription }
    }
    private func refresh() async {
        guard !token.isEmpty, !loading else { return }
        loading = true; error = nil
        defer { loading = false }
        do { snapshot = try await BudgetClient().fetch(token: token); revoked = false }
        catch {
            self.error = error.localizedDescription
            // Remove visible financial data on every failed fetch; never label stale data as current.
            snapshot = nil
            if case BudgetError.unauthorized = error { revoked = true; BudgetKey.remove() }
        }
    }
}
