import SwiftUI
import WebKit

/// Inline YouTube player (same embed the web app uses).
struct YouTubeEmbed: UIViewRepresentable {
    let videoId: String

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        let web = WKWebView(frame: .zero, configuration: cfg)
        web.scrollView.isScrollEnabled = false
        web.isOpaque = false
        web.backgroundColor = .clear
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        guard context.coordinator.loaded != videoId else { return }
        context.coordinator.loaded = videoId
        // YouTube rejects embeds (error 152) that arrive without a referrer identifying the client.
        var comps = URLComponents(string: "https://www.youtube-nocookie.com/embed/\(videoId)")!
        comps.queryItems = [
            .init(name: "playsinline", value: "1"),
            .init(name: "rel", value: "0"),
            .init(name: "origin", value: "https://aceface90.github.io"),
        ]
        var req = URLRequest(url: comps.url!)
        req.setValue("https://aceface90.github.io/", forHTTPHeaderField: "Referer")
        web.load(req)
    }

    func makeCoordinator() -> Coordinator { Coordinator() }
    final class Coordinator { var loaded: String? }
}
