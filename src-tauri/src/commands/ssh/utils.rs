use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use tauri::{AppHandle, Manager, Emitter};

pub fn emit_ssh_log(app: &AppHandle, msg: &str) {
    let timestamp = chrono::Local::now().format("%H:%M:%S").to_string();
    let _ = app.emit("ssh-log", format!("[{}] {}", timestamp, msg));
}

pub fn compute_fingerprint(host_key: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(host_key);
    let result = hasher.finalize();
    format!("SHA256:{}", BASE64.encode(result))
}

pub fn clean_private_key(raw_key: &str) -> String {
    let mut key_clean = raw_key.replace("\r\n", "\n").trim().to_string();

    let headers = vec![
        "-----BEGIN RSA PRIVATE KEY-----",
        "-----BEGIN OPENSSH PRIVATE KEY-----",
        "-----BEGIN PRIVATE KEY-----",
        "-----BEGIN EC PRIVATE KEY-----",
        "-----BEGIN DSA PRIVATE KEY-----",
    ];
    let footers = vec![
        "-----END RSA PRIVATE KEY-----",
        "-----END OPENSSH PRIVATE KEY-----",
        "-----END PRIVATE KEY-----",
        "-----END EC PRIVATE KEY-----",
        "-----END DSA PRIVATE KEY-----",
    ];

    let mut matched_header = "";
    let mut matched_footer = "";

    for (i, h) in headers.iter().enumerate() {
        if key_clean.contains(h) {
            matched_header = h;
            matched_footer = footers[i];
            break;
        }
    }

    if !matched_header.is_empty() {
        let payload = key_clean
            .replace(matched_header, "")
            .replace(matched_footer, "")
            .trim()
            .to_string();
        key_clean = format!("{}\n{}\n{}", matched_header, payload, matched_footer);
    }

    if !key_clean.ends_with('\n') {
        key_clean.push('\n');
    }

    key_clean
}
