import SwiftUI
import WebKit
import FinTrackCore

@MainActor
final class BrowserModel: NSObject, ObservableObject, WKNavigationDelegate, WKDownloadDelegate {
    let webView: WKWebView
    @Published var loading = false
    @Published var error: String?
    @Published var download: DownloadFile?
    private var requestedURL: URL?
    private var downloadedURL: URL?
    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
    }
    func navigate(_ url: URL) {
        guard FinTrack.isInternal(url), requestedURL != url else { return }
        requestedURL = url; error = nil
        webView.load(URLRequest(url: url))
    }
    func retry() {
        // A safe GET; never automatically replay a failed payment POST.
        webView.load(URLRequest(url: requestedURL ?? FinTrack.home))
    }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { loading = true; error = nil }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loading = false }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(error) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(error) }
    private func failed(_ failure: Error) {
        guard (failure as NSError).code != NSURLErrorCancelled else { return }
        loading = false
        error = "Conexiunea cu FinTrack nu este disponibilă. Verifică internetul înainte de a repeta o înregistrare."
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "blob", url.absoluteString.hasPrefix("blob:" + FinTrack.home.absoluteString + "/"), action.shouldPerformDownload {
            decisionHandler(.download)
        } else if FinTrack.isInternal(url) {
            if action.targetFrame == nil { webView.load(action.request); decisionHandler(.cancel) }
            else { decisionHandler(action.shouldPerformDownload ? .download : .allow) }
        } else if action.targetFrame?.isMainFrame == false {
            decisionHandler(.cancel)
        } else {
            decisionHandler(.cancel)
            if action.navigationType == .linkActivated && ["https", "mailto", "tel"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(response.canShowMIMEType ? .allow : .download)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        do {
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let name = URL(fileURLWithPath: suggestedFilename).lastPathComponent
            let file = folder.appendingPathComponent(name.isEmpty ? "FinTrack-export.csv" : name)
            downloadedURL = file
            completionHandler(file)
        } catch { completionHandler(nil); self.error = "Exportul nu a putut fi pregătit." }
    }
    func downloadDidFinish(_ download: WKDownload) {
        if let downloadedURL { self.download = DownloadFile(url: downloadedURL) }
        downloadedURL = nil; loading = false
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadedURL = nil; loading = false; self.error = "Descărcarea nu a reușit. Încearcă din nou din pagina de rapoarte."
    }
}
struct DownloadFile: Identifiable { let id = UUID(); let url: URL }
struct FinanceBrowser: View {
    let url: URL
    @StateObject private var model = BrowserModel()
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if model.loading { ProgressView().progressViewStyle(.linear).accessibilityLabel("Se încarcă FinTrack") }
                if let error = model.error {
                    VStack(spacing: 12) { Text(error); Button("Reîncarcă pagina") { model.retry() } }.padding()
                }
                BrowserSurface(model: model)
            }
            .navigationTitle("FinTrack").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button { if model.webView.canGoBack { model.webView.goBack() } } label: { Image(systemName: "chevron.backward") }.accessibilityLabel("Înapoi") }
                ToolbarItem(placement: .topBarTrailing) { Button { model.retry() } label: { Image(systemName: "arrow.clockwise") }.accessibilityLabel("Reîncarcă FinTrack") }
            }
            .onAppear { model.navigate(url) }
            .onChange(of: url) { _, value in model.navigate(value) }
            .sheet(item: $model.download) { file in ShareExport(file: file.url) }
        }
    }
}
private struct BrowserSurface: UIViewRepresentable {
    @ObservedObject var model: BrowserModel
    func makeUIView(context: Context) -> WKWebView { model.webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
private struct ShareExport: UIViewControllerRepresentable {
    let file: URL
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        if let popover = controller.popoverPresentationController {
            let view = UIView(); controller.view.addSubview(view)
            popover.sourceView = view; popover.sourceRect = .zero; popover.permittedArrowDirections = []
        }
        controller.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        return controller
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
