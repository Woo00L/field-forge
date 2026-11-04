import AppKit
import WebKit
import UniformTypeIdentifiers

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var pageURL: URL!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.appearance = NSAppearance(named: .aqua)
        createMenu()
        guard let resource = Bundle.main.url(forResource: "index", withExtension: "html") else {
            showFailure("找不到内置页面，请重新安装字段工坊。")
            return
        }
        pageURL = resource.standardizedFileURL
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "fieldForge")
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 1000)
        let size = NSSize(width: min(1240, screen.width - 60), height: min(900, screen.height - 60))
        window = NSWindow(contentRect: NSRect(origin: .zero, size: size),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "字段工坊"
        window.minSize = NSSize(width: 860, height: 640)
        window.isReleasedWhenClosed = false
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        webView.loadFileURL(pageURL, allowingReadAccessTo: pageURL)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window?.makeKeyAndOrderFront(nil)
        return true
    }

    private func createMenu() {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        let appMenu = NSMenu(title: "字段工坊")
        appMenu.addItem(withTitle: "关于字段工坊", action: #selector(showAbout), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "隐藏字段工坊", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: "显示全部", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "退出字段工坊", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        menu.addItem(appItem)
        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = editMenu.addItem(withTitle: "重做", action: Selector(("redo:")), keyEquivalent: "Z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "复制", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu
        menu.addItem(editItem)
        let windowItem = NSMenuItem()
        let windowMenu = NSMenu(title: "窗口")
        windowMenu.addItem(withTitle: "最小化", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "缩放", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        windowItem.submenu = windowMenu
        menu.addItem(windowItem)
        NSApp.windowsMenu = windowMenu
        let helpItem = NSMenuItem()
        let helpMenu = NSMenu(title: "帮助")
        helpMenu.addItem(withTitle: "使用说明", action: #selector(showHelp), keyEquivalent: "?")
        helpItem.submenu = helpMenu
        menu.addItem(helpItem)
        NSApp.mainMenu = menu
    }

    @objc private func showAbout() {
        NSApp.orderFrontStandardAboutPanel(options: [
            .applicationName: "字段工坊",
            .applicationVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
            .version: Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "",
            .credits: NSAttributedString(string: "中文名称转拼音字段 · 完全离线\n支持批量转换、相对年份、复制和 CSV 导出")
        ])
    }

    @objc private func showHelp() {
        window.makeKeyAndOrderFront(nil)
        webView.evaluateJavaScript("document.getElementById('help').click()", completionHandler: nil)
    }

    // 仅允许应用自身的主页面访问系统剪贴板和保存窗口。
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              let url = message.frameInfo.request.url,
              url.isFileURL, url.standardizedFileURL.path == pageURL.path,
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            replyHandler(nil, "无法处理此页面的请求"); return
        }
        switch action {
        case "readClipboard":
            replyHandler(NSPasteboard.general.string(forType: .string) ?? "", nil)
        case "writeClipboard":
            guard let text = body["text"] as? String else {
                replyHandler(nil, "没有可复制的内容"); return
            }
            NSPasteboard.general.clearContents()
            let success = NSPasteboard.general.setString(text, forType: .string)
            replyHandler(success ? true : nil, success ? nil : "复制失败，请重试")
        case "saveCsv":
            guard let text = body["text"] as? String else {
                replyHandler(nil, "没有可导出的内容"); return
            }
            let panel = NSSavePanel()
            panel.title = "导出字段转换结果"
            panel.nameFieldStringValue = "字段转换结果.csv"
            panel.allowedContentTypes = [.commaSeparatedText]
            panel.canCreateDirectories = true
            panel.beginSheetModal(for: window) { response in
                guard response == .OK, let url = panel.url else {
                    replyHandler(false, nil); return
                }
                do {
                    try text.write(to: url, atomically: true, encoding: .utf8)
                    replyHandler(true, nil)
                } catch { replyHandler(nil, "保存失败：\(error.localizedDescription)") }
            }
        default: replyHandler(nil, "不支持的操作")
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url,
              url.isFileURL, url.standardizedFileURL.path == pageURL.path else {
            decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showFailure("页面加载失败：\(error.localizedDescription)")
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
    private func showFailure(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "字段工坊暂时无法打开"
        alert.informativeText = message
        alert.runModal()
    }
}

@main
struct FieldForgeMain {
    @MainActor static func main() {
        let application = NSApplication.shared
        let delegate = AppDelegate()
        application.delegate = delegate
        withExtendedLifetime(delegate) { application.run() }
    }
}
