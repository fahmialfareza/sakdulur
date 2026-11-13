import AppKit
import Foundation

// Where to save a download on macOS, for src/macos.rs: the standard Save panel, opened in `dir` with `name` filled
// in. The sandboxed Mac App Store build may write only where the user chose (files.user-selected.read-write).
// Runs on the main thread (the app's download handler is called there); returns null when cancelled.
@_cdecl("sakdulur_save_panel")
public func sakdulurSavePanel(dir: UnsafePointer<CChar>, name: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>? {
  let dir = String(cString: dir)
  let name = String(cString: name)
  let choose = { () -> String? in
    let panel = NSSavePanel()
    panel.canCreateDirectories = true
    panel.nameFieldStringValue = name
    if !dir.isEmpty {
      panel.directoryURL = URL(fileURLWithPath: dir, isDirectory: true)
    }
    return panel.runModal() == .OK ? panel.url?.path : nil
  }
  let path = Thread.isMainThread ? choose() : DispatchQueue.main.sync(execute: choose)
  return path.map { strdup($0) }
}
