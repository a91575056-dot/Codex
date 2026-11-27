import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public enum FinTrack {
    public static let home = URL(string: "https://fintrack-dionis.netlify.app")!
    public static let budgets = home.appendingPathComponent("budgets")
    public static let widgetKeys = URL(string: "https://fintrack-dionis.netlify.app/iphone#widgets")!
    public static func isInternal(_ url: URL) -> Bool {
        url.scheme == "https" && url.host?.lowercased() == home.host && (url.port == nil || url.port == 443) && url.user == nil && url.password == nil
    }
    public static func validToken(_ token: String) -> Bool {
        token.utf8.count == 70 && token.range(of: "^ft_wg_[a-f0-9]{64}$", options: .regularExpression) != nil
    }
    public static func money(_ minor: Int64) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "ro_MD")
        formatter.numberStyle = .currency
        formatter.currencyCode = "MDL"
        formatter.currencySymbol = "MDL"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSDecimalNumber(decimal: Decimal(minor) / 100)) ?? "—"
    }
}
public struct Budget: Decodable, Identifiable, Sendable {
    public let id: UUID
    public let name: String
    public let limitMinor: Int64
    public let spentMinor: Int64
    public let remainingMinor: Int64
    public let remainingPercent: Double?
    public let enabled: Bool
    enum CodingKeys: String, CodingKey {
        case id, name, enabled
        case limitMinor = "limit_minor", spentMinor = "spent_minor", remainingMinor = "remaining_minor", remainingPercent = "remaining_percent"
    }
    public var progress: Double { min(1, max(0, (remainingPercent ?? 0) / 100)) }
    public var percentText: String {
        guard let percent = remainingPercent else { return "—" }
        return percent.formatted(.number.locale(Locale(identifier: "ro_MD")).precision(.fractionLength(0...1))) + "%"
    }
}
public struct BudgetSnapshot: Decodable, Sendable {
    public let currency: String
    public let source: String
    public let updatedAt: Date
    public let budgets: [Budget]
    enum CodingKeys: String, CodingKey { case currency, source, budgets; case updatedAt = "updated_at" }
    public static func decode(_ data: Data) throws -> Self {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let value = try decoder.singleValueContainer().decode(String.self)
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: value) { return date }
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: value) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Dată invalidă"))
        }
        let result = try decoder.decode(Self.self, from: data)
        guard result.currency == "MDL", ["monthly", "allocations"].contains(result.source), result.budgets.allSatisfy({ $0.limitMinor >= 0 && $0.spentMinor >= 0 && abs(Double($0.limitMinor)) <= 9_007_199_254_740_991 && abs(Double($0.spentMinor)) <= 9_007_199_254_740_991 && ($0.remainingPercent?.isFinite ?? true) && $0.remainingMinor == $0.limitMinor - $0.spentMinor }) else { throw BudgetError.invalidResponse }
        return result
    }
    public func selected(_ names: String, limit: Int) -> [Budget] {
        let requested = names.split(separator: ",").map { Self.normalized(String($0)) }.filter { !$0.isEmpty }
        if requested.isEmpty { return Array(budgets.prefix(limit)) }
        var seen = Set<UUID>()
        return Array(requested.compactMap { name in budgets.first { Self.normalized($0.name) == name || $0.id.uuidString.lowercased() == name } }.filter { seen.insert($0.id).inserted }.prefix(limit))
    }
    private static func normalized(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "ro_MD"))
    }
}
public enum BudgetError: LocalizedError {
    case invalidToken, unauthorized, rateLimited, unavailable, invalidResponse
    public var errorDescription: String? {
        switch self {
        case .invalidToken: "Lipește cheia widgetului care începe cu ft_wg_."
        case .unauthorized: "Cheia a expirat sau a fost revocată. Reconectează bugetele."
        case .rateLimited: "Prea multe actualizări. Încearcă peste un minut."
        case .unavailable: "Bugetele nu sunt disponibile momentan. Verifică internetul."
        case .invalidResponse: "FinTrack a trimis date nevalide. Încearcă din nou."
        }
    }
}
public struct BudgetClient {
    private let session: URLSession
    public init(session: URLSession = .shared) { self.session = session }
    public func fetch(token: String) async throws -> BudgetSnapshot {
        guard FinTrack.validToken(token) else { throw BudgetError.invalidToken }
        var request = URLRequest(url: FinTrack.home.appendingPathComponent("api/widget/budgets"))
        request.httpMethod = "GET"
        request.timeoutInterval = 20
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let data: Data
        let response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch { throw BudgetError.unavailable }
        guard let response = response as? HTTPURLResponse else { throw BudgetError.invalidResponse }
        switch response.statusCode {
        case 200:
            do { return try BudgetSnapshot.decode(data) }
            catch { throw BudgetError.invalidResponse }
        case 401, 403: throw BudgetError.unauthorized
        case 429: throw BudgetError.rateLimited
        default: throw BudgetError.unavailable
        }
    }
}
