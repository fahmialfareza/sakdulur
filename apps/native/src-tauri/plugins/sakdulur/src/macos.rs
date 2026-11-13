use std::ffi::{c_char, CStr};

use crate::AppleAuthorization;

extern "C" {
    // macos/AppleSignIn.swift. Blocks until the sheet closes; every out-string is strdup'ed (or null).
    fn sakdulur_apple_authorize(
        nonce: *const c_char,
        out_token: *mut *mut c_char,
        out_code: *mut *mut c_char,
        out_given: *mut *mut c_char,
        out_family: *mut *mut c_char,
        out_error: *mut *mut c_char,
    );
    // macos/WebAuth.swift. Blocks until the sheet closes; every out-string is strdup'ed (or null).
    fn sakdulur_web_auth(url: *const c_char, scheme: *const c_char, out_callback: *mut *mut c_char, out_error: *mut *mut c_char);
    // macos/SavePanel.swift. Runs on the main thread; the chosen path, strdup'ed, or null when cancelled.
    fn sakdulur_save_panel(dir: *const c_char, name: *const c_char) -> *mut c_char;
    fn free(ptr: *mut std::ffi::c_void);
}

unsafe fn take(ptr: *mut c_char) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    let s = CStr::from_ptr(ptr).to_string_lossy().into_owned();
    free(ptr.cast());
    Some(s)
}

pub fn authorize(nonce: &str) -> Result<AppleAuthorization, String> {
    let nonce = std::ffi::CString::new(nonce).map_err(|e| e.to_string())?;
    let mut out: [*mut c_char; 5] = [std::ptr::null_mut(); 5];
    unsafe {
        sakdulur_apple_authorize(nonce.as_ptr(), &mut out[0], &mut out[1], &mut out[2], &mut out[3], &mut out[4]);
        let [token, code, given, family, error] = out.map(|p| take(p));
        if let Some(error) = error {
            return Err(error);
        }
        Ok(AppleAuthorization {
            identity_token: token.ok_or("Apple returned no identity token")?,
            authorization_code: code,
            given_name: given,
            family_name: family,
        })
    }
}

/// The callback URL (the app's scheme) that ended the browser sign-in sheet.
pub fn web_auth(url: &str, scheme: &str) -> Result<String, String> {
    let url = std::ffi::CString::new(url).map_err(|e| e.to_string())?;
    let scheme = std::ffi::CString::new(scheme).map_err(|e| e.to_string())?;
    let mut out: [*mut c_char; 2] = [std::ptr::null_mut(); 2];
    unsafe {
        sakdulur_web_auth(url.as_ptr(), scheme.as_ptr(), &mut out[0], &mut out[1]);
        let [callback, error] = out.map(|p| take(p));
        if let Some(error) = error {
            return Err(error);
        }
        callback.ok_or_else(|| "Sign-in returned nothing".into())
    }
}

/// Asks where to save `name` (the Save panel, opened in `dir`); None when cancelled.
pub fn choose_save_path(dir: &std::path::Path, name: &str) -> Option<std::path::PathBuf> {
    let dir = std::ffi::CString::new(dir.to_string_lossy().as_bytes()).ok()?;
    let name = std::ffi::CString::new(name).ok()?;
    unsafe { take(sakdulur_save_panel(dir.as_ptr(), name.as_ptr())) }.map(std::path::PathBuf::from)
}
