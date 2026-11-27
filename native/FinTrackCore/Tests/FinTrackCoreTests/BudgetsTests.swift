import XCTest
@testable import FinTrackCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

private let readToken = "ft_wg_" + String(repeating: "a", count: 64)
private func payload(_ currency: String = "MDL") -> Data {
    Data("""
    {"currency":"\(currency)","source":"allocations","updated_at":"2026-11-27T09:00:00.123456+00:00","budgets":[
    {"id":"00000000-0000-4000-8000-000000000001","name":"Alimente","limit_minor":10000,"spent_minor":2500,"remaining_minor":7500,"remaining_percent":75,"enabled":true},
    {"id":"00000000-0000-4000-8000-000000000002","name":"Distracții","limit_minor":10000,"spent_minor":12500,"remaining_minor":-2500,"remaining_percent":-25,"enabled":true},
    {"id":"00000000-0000-4000-8000-000000000003","name":"Investiții","limit_minor":0,"spent_minor":0,"remaining_minor":0,"remaining_percent":null,"enabled":false}]}
    """.utf8)
}
final class BudgetsTests: XCTestCase {
    func testOnlyReadCredentialsAreAccepted() {
        XCTAssertTrue(FinTrack.validToken(readToken))
        for token in ["", "ft_sc_" + String(repeating: "a", count: 64), readToken + "\n", " " + readToken, "ft_wg_" + String(repeating: "A", count: 64)] { XCTAssertFalse(FinTrack.validToken(token)) }
    }
    func testNavigationNeverTreatsOtherOriginsAsFinTrack() {
        XCTAssertTrue(FinTrack.isInternal(FinTrack.home))
        XCTAssertTrue(FinTrack.isInternal(FinTrack.widgetKeys))
        for url in ["http://fintrack-dionis.netlify.app", "https://fintrack-dionis.netlify.app.evil.invalid", "https://fintrack-dionis.netlify.app:444", "javascript:alert(1)", "https://attacker@fintrack-dionis.netlify.app"] { XCTAssertFalse(FinTrack.isInternal(URL(string: url)!)) }
    }
    func testRealMoneyOverspendingAndUnfundedValues() throws {
        let snapshot = try BudgetSnapshot.decode(payload())
        XCTAssertEqual(snapshot.budgets[0].remainingMinor, 7500)
        XCTAssertEqual(snapshot.budgets[0].progress, 0.75)
        XCTAssertEqual(snapshot.budgets[1].remainingMinor, -2500)
        XCTAssertEqual(snapshot.budgets[1].progress, 0)
        XCTAssertEqual(snapshot.budgets[1].percentText, "-25%")
        XCTAssertEqual(snapshot.budgets[2].percentText, "—")
        XCTAssertTrue(FinTrack.money(12345).contains("123,45"))
        XCTAssertTrue(FinTrack.money(12345).contains("MDL"))
        XCTAssertThrowsError(try BudgetSnapshot.decode(payload("EUR")))
    }
    func testCategorySelectionPreservesOrderAndIgnoresDiacritics() throws {
        let snapshot = try BudgetSnapshot.decode(payload())
        XCTAssertEqual(snapshot.selected("distractii, Alimente, distractii", limit: 3).map(\.name), ["Distracții", "Alimente"])
        XCTAssertEqual(snapshot.selected("", limit: 2).count, 2)
        XCTAssertEqual(snapshot.selected("Inexistentă", limit: 3).count, 0)
    }
    func testClientUsesOnlyReadEndpointAndHeaderCredentials() async throws {
        MockProtocol.handler = { request in
            XCTAssertEqual(request.httpMethod, "GET")
            XCTAssertEqual(request.url?.absoluteString, "https://fintrack-dionis.netlify.app/api/widget/budgets")
            XCTAssertNil(request.url?.query)
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer " + readToken)
            return (200, payload())
        }
        let client = BudgetClient(session: session())
        let snapshot = try await client.fetch(token: readToken)
        XCTAssertEqual(snapshot.budgets.count, 3)
    }
    func testRevokedAndRateLimitedCredentialsDoNotReturnBudgets() async {
        for status in [401, 403, 429, 503] {
            MockProtocol.handler = { _ in (status, payload()) }
            do { _ = try await BudgetClient(session: session()).fetch(token: readToken); XCTFail("Should fail") }
            catch { XCTAssertTrue(error is BudgetError) }
        }
    }
    func testInvalidTokenNeverReachesNetwork() async {
        MockProtocol.handler = { _ in XCTFail("Invalid key sent over network"); return (200, payload()) }
        do { _ = try await BudgetClient(session: session()).fetch(token: "invalid"); XCTFail("Should fail") }
        catch { XCTAssertTrue(error is BudgetError) }
    }
    private func session() -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockProtocol.self]
        return URLSession(configuration: config)
    }
}
private final class MockProtocol: URLProtocol {
    static var handler: ((URLRequest) -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard let handler = Self.handler, let url = request.url else { return }
        let (status, data) = handler(request)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: ["Content-Type":"application/json"])!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
