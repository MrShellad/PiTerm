use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use std::fs::OpenOptions;
use std::io::Write;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use ssh2::KnownHostFileKind;

// 辅助函数：获取 known_hosts 路径
pub fn get_known_hosts_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().home_dir().ok().map(|p| p.join(".ssh").join("known_hosts"))
}

// 检查主机密钥
pub fn check_local_host_key(app: &AppHandle, host: &str, port: u16, host_key: &[u8], known_hosts: &mut ssh2::KnownHosts) -> Result<ssh2::CheckResult, String> {
    let known_hosts_path = get_known_hosts_path(app);

    if let Some(path) = &known_hosts_path {
        if path.exists() {
            let _ = known_hosts.read_file(path, KnownHostFileKind::OpenSSH);
        }
    }

    Ok(known_hosts.check_port(host, port, host_key))
}

// 保存主机密钥到本地磁盘
pub fn save_host_key_to_disk(app: &AppHandle, host: &str, port: u16, key_type: &str, host_key: &[u8]) -> Result<(), String> {
    let key_base64 = BASE64.encode(host_key);
    let line = if port == 22 {
        format!("{} {} {}\n", host, key_type, key_base64)
    } else {
        format!("[{}]:{} {} {}\n", host, port, key_type, key_base64)
    };

    let known_hosts_path = get_known_hosts_path(app)
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    if let Some(parent) = known_hosts_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create .ssh dir: {}", e))?;
        }
    }

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&known_hosts_path)
        .map_err(|e| format!("Failed to open known_hosts: {}", e))?;

    file.write_all(line.as_bytes())
        .map_err(|e| format!("Failed to write to known_hosts: {}", e))?;

    Ok(())
}
