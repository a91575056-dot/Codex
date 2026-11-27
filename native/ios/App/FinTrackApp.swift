import SwiftUI
import FinTrackCore

@main
struct FinTrackApp: App {
    var body: some Scene {
        WindowGroup { AppView().environment(\.locale, Locale(identifier: "ro_MD")) }
    }
}
struct AppView: View {
    @State private var tab = 0
    @State private var route = FinTrack.home
    var body: some View {
        TabView(selection: $tab) {
            FinanceBrowser(url: route)
                .tabItem { Label("FinTrack", systemImage: "square.grid.2x2") }.tag(0)
            NativeBudgets(open: { url in route = url; tab = 0 })
                .tabItem { Label("Bugete", systemImage: "chart.bar") }.tag(1)
            NavigationStack {
                Form {
                    Section("Contul tău") {
                        Button("Conturi Cash și Card") { route = FinTrack.home.appendingPathComponent("settings"); tab = 0 }
                        Button("Datorii și împrumuturi") { route = FinTrack.home.appendingPathComponent("debts"); tab = 0 }
                        Button("Chei pentru bugete și widget") { route = FinTrack.widgetKeys; tab = 0 }
                    }
                    Section("Widget pe ecranul principal") {
                        Text("Ține apăsat pe ecranul principal → Adaugă widget → FinTrack. Editează widgetul și lipește cheia de citire ft_wg_. Poți alege categoriile, separate prin virgulă.")
                        Text("Cheia din widget este păstrată de iOS în configurarea acelui widget. Permite doar citirea rezumatelor de buget; nu folosi parola contului.").font(.footnote).foregroundStyle(.secondary)
                    }
                    Section { Text("FinTrack folosește contul și datele tale existente. Internetul este necesar pentru încărcarea și salvarea datelor.").font(.footnote) }
                }.navigationTitle("Setări")
            }.tabItem { Label("Setări", systemImage: "gearshape") }.tag(2)
        }.tint(.blue)
        .onOpenURL { url in if url.scheme == "fintrack", url.host == "budgets" { tab = 1 } }
    }
}
