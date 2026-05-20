use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::fs::OpenOptions;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Status of host key check
#[derive(Debug, PartialEq, Eq, Clone, serde::Serialize)]
pub enum HostKeyCheckStatus {
    Match,
    Mismatch,
    NotFound,
}

// 辅助函数：获取 known_hosts 路径
pub fn get_known_hosts_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .home_dir()
        .ok()
        .map(|p| p.join(".ssh").join("known_hosts"))
}

// 检查主机密钥
pub fn check_local_host_key(
    app: &AppHandle,
    host: &str,
    port: u16,
    key_type: &str,
    host_key: &[u8],
) -> Result<HostKeyCheckStatus, String> {
    let known_hosts_path = get_known_hosts_path(app);
    let path = match known_hosts_path {
        Some(p) if p.exists() => p,
        _ => return Ok(HostKeyCheckStatus::NotFound),
    };

    let file = std::fs::File::open(path)
        .map_err(|e| format!("Failed to open known_hosts: {}", e))?;
    let reader = BufReader::new(file);

    let target_host = if port == 22 {
        host.to_string()
    } else {
        format!("[{}]:{}", host, port)
    };

    let mut found_host = false;

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => continue,
        };
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let hosts_part = parts[0];
        let key_type_part = parts[1];
        let b64_part = parts[2];

        // Check if our target_host matches any in the hosts_part (comma-separated)
        let matches_host = hosts_part.split(',').any(|h| h == target_host);
        if matches_host {
            found_host = true;
            if key_type_part == key_type {
                if let Ok(decoded_key) = BASE64.decode(b64_part) {
                    if decoded_key == host_key {
                        return Ok(HostKeyCheckStatus::Match);
                    }
                }
            }
        }
    }

    if found_host {
        Ok(HostKeyCheckStatus::Mismatch)
    } else {
        Ok(HostKeyCheckStatus::NotFound)
    }
}

// 保存主机密钥到本地磁盘
pub fn save_host_key_to_disk(
    app: &AppHandle,
    host: &str,
    port: u16,
    key_type: &str,
    host_key: &[u8],
) -> Result<(), String> {
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
