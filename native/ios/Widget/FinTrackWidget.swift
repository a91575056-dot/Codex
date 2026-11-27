import SwiftUI
import WidgetKit
import AppIntents
import FinTrackCore

struct BudgetConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Bugete FinTrack"
    static var description = IntentDescription("Alege bugetele afișate și cheia de citire din FinTrack. Nu introduce parola contului.")
    @Parameter(title: "Cheia widgetului ft_wg_") var readKey: String?
    @Parameter(title: "Categorii (separate prin virgulă)", default: "") var categories: String
}
struct BudgetEntry: TimelineEntry {
    let date: Date
    let snapshot: BudgetSnapshot?
    let categories: String
    let error: String?
}
struct BudgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> BudgetEntry { .init(date: .now, snapshot: nil, categories: "", error: "Bugetele tale în MDL") }
    func snapshot(for configuration: BudgetConfiguration, in context: Context) async -> BudgetEntry { await entry(configuration) }
    func timeline(for configuration: BudgetConfiguration, in context: Context) async -> Timeline<BudgetEntry> {
        Timeline(entries: [await entry(configuration)], policy: .after(.now.addingTimeInterval(1800)))
    }
    private func entry(_ configuration: BudgetConfiguration) async -> BudgetEntry {
        let key = (configuration.readKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { return .init(date: .now, snapshot: nil, categories: configuration.categories, error: "Editează widgetul și adaugă cheia de citire din FinTrack.") }
        do { return .init(date: .now, snapshot: try await BudgetClient().fetch(token: key), categories: configuration.categories, error: nil) }
        catch { return .init(date: .now, snapshot: nil, categories: configuration.categories, error: error.localizedDescription) }
    }
}
struct BudgetWidgetView: View {
    let entry: BudgetEntry
    @Environment(\.widgetFamily) private var family
    private var rowLimit: Int { family == .systemSmall ? 2 : family == .systemLarge ? 6 : 3 }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack { Text("FinTrack").font(.headline); Spacer(); Text("MDL").font(.caption).foregroundStyle(.secondary) }
            if let snapshot = entry.snapshot {
                let rows = snapshot.selected(entry.categories, limit: rowLimit)
                if rows.isEmpty { Text("Nu ai bugete în MDL sau categoriile alese nu există.").font(.caption) }
                ForEach(rows) { budget in
                    VStack(alignment: .leading, spacing: 2) {
                        HStack { Text(budget.name).lineLimit(1); Spacer(minLength: 3); Text(budget.percentText).monospacedDigit().foregroundStyle(budget.remainingMinor < 0 ? .red : .blue) }.font(.caption).fontWeight(.semibold)
                        Text((budget.remainingMinor < 0 ? "Depășit · " : budget.limitMinor == 0 ? "Nealimentat · " : "Rămas · ") + FinTrack.money(budget.remainingMinor)).font(.caption2).monospacedDigit().lineLimit(1).minimumScaleFactor(0.8)
                        GeometryReader { proxy in
                            ZStack(alignment: .leading) {
                                Capsule().fill(.quaternary)
                                Capsule().fill(budget.remainingMinor < 0 ? Color.red : Color.blue).frame(width: proxy.size.width * budget.progress)
                            }
                        }.frame(height: 3)
                    }.privacySensitive()
                }
                Spacer(minLength: 0)
                Text("Actualizat \(snapshot.updatedAt.formatted(date: .omitted, time: .shortened))").font(.system(size: 9)).foregroundStyle(.secondary)
            } else {
                Text(entry.error ?? "Conectează bugetele în FinTrack.").font(.caption).foregroundStyle(.secondary)
                Spacer(minLength: 0)
            }
        }
        .environment(\.locale, Locale(identifier: "ro_MD"))
        .containerBackground(.background, for: .widget)
        .widgetURL(URL(string: "fintrack://budgets")!)
    }
}
@main
struct FinTrackBudgetWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "FinTrackBudgets", intent: BudgetConfiguration.self, provider: BudgetProvider()) { entry in BudgetWidgetView(entry: entry) }
            .configurationDisplayName("Bugete FinTrack")
            .description("Procente și sume rămase din bugetele tale în MDL.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
