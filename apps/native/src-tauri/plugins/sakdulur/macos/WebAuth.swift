import AppKit
import AuthenticationServices
import Foundation

// Browser sign-in (Google; Apple without the native sheet) on macOS for src/macos.rs: an ASWebAuthenticationSession
// sheet over the app window, which ends at the app's URL scheme. Blocks the calling (non-main) thread until it does.
private final class WebAuthCoordinator: NSObject, ASWebAuthenticationPresentationContextProviding {
  private let done = DispatchSemaphore(value: 0)
  private var session: ASWebAuthenticationSession?
  var callback: String?
  var error: String?

  func run(url: URL, scheme: String) {
    DispatchQueue.main.async {
      let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { callback, error in
        defer { self.done.signal() }
        if let callback {
          self.callback = callback.absoluteString
        } else if let e = error as? ASWebAuthenticationSessionError, e.code == .canceledLogin {
          self.error = "canceled"
        } else {
          self.error = error?.localizedDescription ?? "Sign-in failed"
        }
      }
      session.presentationContextProvider = self
      self.session = session
      if !session.start() {
        self.error = "Sign-in could not start"
        self.done.signal()
      }
    }
    done.wait()
    session = nil
  }

  func presentationAnchor(for _: ASWebAuthenticationSession) -> ASPresentationAnchor {
    NSApplication.shared.keyWindow ?? NSApplication.shared.windows.first ?? ASPresentationAnchor()
  }
}

@_cdecl("sakdulur_web_auth")
public func sakdulurWebAuth(
  url: UnsafePointer<CChar>,
  scheme: UnsafePointer<CChar>,
  outCallback: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>,
  outError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) {
  guard let start = URL(string: String(cString: url)) else {
    outError.pointee = strdup("invalid url")
    return
  }
  let c = WebAuthCoordinator()
  c.run(url: start, scheme: String(cString: scheme))
  outCallback.pointee = c.callback.map { strdup($0) }
  outError.pointee = c.error.map { strdup($0) }
}
