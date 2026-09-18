import AppKit

// Native entry point for Developer ID signing. Python/model dependencies are external.
final class Launcher: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    let log = NSTextView()
    let model = NSPopUpButton()
    var process: Process?
    var controls: [NSButton] = []
    func applicationDidFinishLaunching(_ notification: Notification) {
        if Bundle.main.bundleURL.pathComponents.contains(where: { $0 == ".Trash" || $0 == ".Trashes" }) {
            let alert = NSAlert(); alert.messageText = "휴지통에서 앱을 실행할 수 없습니다."
            alert.informativeText = "Finder에서 앱을 복원하거나 다운로드한 ZIP을 일반 폴더에 새로 풀어주세요. 보안 설정을 끄지 마세요."
            alert.runModal(); NSApp.terminate(nil); return
        }
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 720, height: 520), styleMask: [.titled,.closable,.miniaturizable,.resizable], backing: .buffered, defer: false)
        window.title = "BOTTOPIA · PC 연결기"
        let stack = NSStackView(); stack.orientation = .vertical; stack.spacing = 14; stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false
        window.contentView!.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor, constant: 24), stack.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor, constant: -24), stack.topAnchor.constraint(equalTo: window.contentView!.topAnchor, constant: 24), stack.bottomAnchor.constraint(equalTo: window.contentView!.bottomAnchor, constant: -24)])
        let title = NSTextField(labelWithString: "BOTTOPIA Qwen 연결기"); title.font = .boldSystemFont(ofSize: 24); stack.addArrangedSubview(title)
        let help = NSTextField(wrappingLabelWithString: "Python 3.11 별도 설치 필요 · 모델 설치 후 연결을 시작하세요.\n연결 코드는 홈페이지에만 입력하고 다른 사람에게 공유하지 마세요.")
        stack.addArrangedSubview(help)
        model.addItems(withTitles: ["CustomVoice · 목소리 선택", "VoiceDesign · 목소리 디자인"]); stack.addArrangedSubview(model)
        let row = NSStackView(); row.spacing = 10
        for (name, action) in [("모델 설치", #selector(installModel)), ("연결 시작", #selector(serve)), ("중단", #selector(stop)), ("Python 받기", #selector(pythonHelp)), ("라이선스", #selector(licenses))] {
            let button = NSButton(title: name, target: self, action: action); button.bezelStyle = .rounded; row.addArrangedSubview(button)
            if name == "모델 설치" || name == "연결 시작" { controls.append(button) }
        }
        stack.addArrangedSubview(row)
        let scroll = NSScrollView(); scroll.hasVerticalScroller = true; scroll.borderType = .bezelBorder
        log.isEditable = false; log.isSelectable = true; log.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        log.autoresizingMask = [.width]; log.textContainer?.widthTracksTextView = true; scroll.documentView = log
        stack.addArrangedSubview(scroll); scroll.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        scroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 260).isActive = true
        append("준비됨. Python은 python.org에서 설치할 수 있습니다. 설치 버튼은 외부 패키지·모델 다운로드를 시작합니다.\n")
        window.center(); window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    }
    func append(_ text: String) { log.textStorage?.append(NSAttributedString(string: text)); log.scrollToEndOfDocument(nil) }
    func run(_ args: [String]) {
        guard process == nil else { return }
        let candidates = ["/Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11", "/opt/homebrew/bin/python3.11", "/usr/local/bin/python3.11"]
        guard let python = candidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }), let resource = Bundle.main.resourceURL else { append("Python 3.11을 찾을 수 없습니다. python.org에서 설치한 뒤 다시 실행하세요.\n"); return }
        let task = Process(); let pipe = Pipe()
        task.executableURL = URL(fileURLWithPath: python)
        task.arguments = [resource.appendingPathComponent("connector/connector.py").path] + args
        task.currentDirectoryURL = resource.appendingPathComponent("connector")
        var env = ProcessInfo.processInfo.environment
        env["PYTHONUNBUFFERED"] = "1"; env["PYTHONDONTWRITEBYTECODE"] = "1"
        env["PATH"] = "/Library/Frameworks/Python.framework/Versions/3.11/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
        task.environment = env; task.standardOutput = pipe; task.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if data.isEmpty { handle.readabilityHandler = nil; return }
            let text = String(decoding: data, as: UTF8.self)
            DispatchQueue.main.async { self?.append(text) }
        }
        task.terminationHandler = { [weak self] task in
            pipe.fileHandleForReading.readabilityHandler = nil
            DispatchQueue.main.async { self?.process = nil; self?.controls.forEach { $0.isEnabled = true }; self?.append("\n프로세스 종료 (코드 \(task.terminationStatus))\n") }
        }
        do { try task.run(); process = task; controls.forEach { $0.isEnabled = false } }
        catch { pipe.fileHandleForReading.readabilityHandler = nil; append("실행 실패: \(error.localizedDescription)\n") }
    }
    @objc func installModel() { run(["install", model.indexOfSelectedItem == 0 ? "qwen-custom" : "qwen-design"]) }
    @objc func serve() { run(["serve"]) }
    @objc func stop() { process?.interrupt() }
    @objc func pythonHelp() { NSWorkspace.shared.open(URL(string: "https://www.python.org/downloads/")!) }
    @objc func licenses() { if let url = Bundle.main.resourceURL?.appendingPathComponent("connector/QWEN-THIRD-PARTY-NOTICES.md") { NSWorkspace.shared.open(url) } }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { process?.interrupt() }
}
let app = NSApplication.shared
let delegate = Launcher()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
