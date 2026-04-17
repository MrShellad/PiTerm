use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State, Manager, Emitter};
use sqlx::Row;
use serde_json::Value;
use crate::models::{ConnectionType, Proxy, SshConfig, TestConnectionPayload};
use crate::state::AppState;
use crate::commands::vault::{VaultState, internal_get_secret};

// 🟢 [新增] 引入依赖
use ssh2::{CheckResult, KnownHostFileKind};
use std::net::TcpStream;
use std::path::PathBuf;
use std::fs::OpenOptions;
use std::collections::HashMap;
use std::io::Write;
use std::time::Instant;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

// 导出子模块
pub mod core;
pub mod state;

pub use state::{HostKeyVerificationCache, PendingHostKey, SshConnection, SshState};
use core::{
    create_monitor_session, create_sftp_session, create_shell_channel, spawn_shell_reader_thread,configure_legacy_algorithms
};

// ==============================================================================
// 🟢 [新增] 主机密钥验证相关结构体
// ==============================================================================

#[derive(serde::Serialize)]
pub struct HostKeyCheckResult {
    status: String, // "verified", "mismatch", "unknown"
    data: Option<HostKeyData>,
}

#[derive(serde::Serialize)]
pub struct HostKeyData {
    host: String,
    ip: String,
    #[serde(rename = "keyType")]
    key_type: String,
    fingerprint: String,
}

// 辅助函数：获取 known_hosts 路径
fn get_known_hosts_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().home_dir().ok().map(|p| p.join(".ssh").join("known_hosts"))
}

// 辅助函数：计算指纹 (SHA256 Base64)
fn compute_fingerprint(host_key: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(host_key);
    let result = hasher.finalize();
    format!("SHA256:{}", BASE64.encode(result))
}

// 推送连接日志到前端
fn emit_ssh_log(app: &AppHandle, msg: &str) {
    let timestamp = chrono::Local::now().format("%H:%M:%S").to_string();
    let _ = app.emit("ssh-log", format!("[{}] {}", timestamp, msg));
}

fn prune_pending_host_keys(cache: &mut HashMap<String, PendingHostKey>) {
    cache.retain(|_, entry| !entry.is_expired());
}

async fn load_proxy_for_connection(
    db_pool: &sqlx::SqlitePool,
    connection_type: &ConnectionType,
    proxy_id: Option<&str>,
) -> Result<Option<Proxy>, String> {
    if matches!(connection_type, ConnectionType::Direct) {
        return Ok(None);
    }

    let proxy_id = proxy_id
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Proxy mode selected but no proxy profile is configured.".to_string())?;

    sqlx::query_as::<_, Proxy>(
        "SELECT id, name, proxy_type, host, port, username, password, created_at, updated_at
         FROM proxies WHERE id = ?",
    )
    .bind(proxy_id)
    .fetch_optional(db_pool)
    .await
    .map_err(|e| format!("Proxy Query Error: {}", e))?
    .ok_or_else(|| format!("Proxy not found with ID: {}", proxy_id))
    .map(Some)
}

// ==============================================================================
// 🟢 [新增] 命令：检查主机密钥
// ==============================================================================
#[tauri::command]
pub async fn check_host_key(
    app: AppHandle,
    verification_cache: State<'_, HostKeyVerificationCache>,
    _id: String, // 预留服务器 ID 参数
    host: String,
    port: u16
) -> Result<HostKeyCheckResult, String> {
    // 立即向前端发送开始日志
    emit_ssh_log(&app, &format!("Checking host identity for {}:{}...", host, port));

    let cache = verification_cache.entries.clone();

    tauri::async_runtime::spawn_blocking(move || {

        // 1. 尝试建立 TCP 连接
        emit_ssh_log(&app, "Connecting to target host (TCP)...");
        let tcp = TcpStream::connect(format!("{}:{}", host, port))
            .map_err(|e| {
                let err = format!("Network unreachable: {}", e);
                emit_ssh_log(&app, &err);
                err
            })?;
        
        // 2. 发起 SSH 握手 (仅交换密钥，不进行用户认证)
        emit_ssh_log(&app, "Initiating SSH protocol handshake...");
        let mut sess = ssh2::Session::new().map_err(|e| e.to_string())?;
        
        configure_legacy_algorithms(&mut sess);
        sess.set_timeout(10_000);

        sess.set_tcp_stream(tcp);
        sess.handshake().map_err(|e| {
            let err = format!("SSH handshake failed: {}", e);
            emit_ssh_log(&app, &err);
            err
        })?;

        // 3. 获取远程主机密钥
        emit_ssh_log(&app, "Retrieving remote host key...");
        let (host_key, key_type_enum) = sess.host_key().ok_or("No host key received from server")?;
        
        // 映射密钥类型字符串
        let key_type = match key_type_enum {
            ssh2::HostKeyType::Rsa => "ssh-rsa",
            ssh2::HostKeyType::Dss => "ssh-dss",
            ssh2::HostKeyType::Ecdsa256 => "ecdsa-sha2-nistp256", 
            ssh2::HostKeyType::Ecdsa384 => "ecdsa-sha2-nistp384",
            ssh2::HostKeyType::Ecdsa521 => "ecdsa-sha2-nistp521",
            ssh2::HostKeyType::Ed25519 => "ssh-ed25519", 
            _ => "unknown",
        }.to_string();

        let fingerprint = compute_fingerprint(host_key);
        emit_ssh_log(&app, &format!("Server fingerprint: {}", fingerprint));

        // 4. 读取本地 known_hosts 文件进行安全比对
        emit_ssh_log(&app, "Comparing with local known_hosts file...");
        let mut known_hosts = sess.known_hosts().map_err(|e| e.to_string())?;
        let known_hosts_path = get_known_hosts_path(&app);

        if let Some(path) = &known_hosts_path {
            if path.exists() {
                let _ = known_hosts.read_file(path, KnownHostFileKind::OpenSSH);
            }
        }

        // 5. 执行比对
        let check_result = known_hosts.check_port(&host, port, host_key);

        let status = match check_result {
            CheckResult::Match => {
                emit_ssh_log(&app, "✅ Host verification successful.");
                "verified"
            },
            CheckResult::Mismatch => {
                emit_ssh_log(&app, "⚠️ WARNING: HOST IDENTIFICATION HAS CHANGED!");
                "mismatch"
            },
            CheckResult::NotFound | CheckResult::Failure => {
                emit_ssh_log(&app, "ℹ️ New host detected, awaiting user trust...");
                "unknown"
            },
        };

        let mut entries = cache.lock().unwrap();
        prune_pending_host_keys(&mut entries);

        if status == "verified" {
            entries.remove(&_id);
        } else {
            entries.insert(
                _id.clone(),
                PendingHostKey {
                    host: host.clone(),
                    port,
                    key_type: key_type.clone(),
                    fingerprint: fingerprint.clone(),
                    host_key: host_key.to_vec(),
                    cached_at: Instant::now(),
                },
            );
        }

        Ok(HostKeyCheckResult {
            status: status.to_string(),
            data: if status != "verified" {
                Some(HostKeyData {
                    host: host.clone(),
                    ip: host,
                    key_type,
                    fingerprint,
                })
            } else {
                None
            }
        })
    }).await.map_err(|e| format!("Task aborted: {}", e))?
}
// ==============================================================================
// 🟢 [新增] 命令：信任主机密钥 (手动文件写入版)
// ==============================================================================
#[tauri::command]
#[allow(unreachable_code)]
pub async fn trust_host_key(
    app: AppHandle,
    app_state: State<'_, AppState>,
    verification_cache: State<'_, HostKeyVerificationCache>,
    id: String,          
    fingerprint: String, 
    _key_type: String     // 未使用
) -> Result<(), String> {
    
    let db_pool = &app_state.db;
    let cache = verification_cache.entries.clone();

    // 1. 从数据库获取 IP 和 Port (确保安全性，不信任前端传来的 IP)
    let row = sqlx::query("SELECT ip, port FROM servers WHERE id = ?")
        .bind(&id)
        .fetch_optional(db_pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Server not found")?;
    
    let host: String = row.get("ip");
    let port: u16 = row.get::<i64, _>("port") as u16;

    tauri::async_runtime::spawn_blocking(move || {
        let pending = {
            let mut entries = cache.lock().unwrap();
            prune_pending_host_keys(&mut entries);
            entries.remove(&id)
        }
        .ok_or_else(|| "Host verification expired. Please verify the host again.".to_string())?;

        if pending.host != host || pending.port != port {
            return Err("Host verification no longer matches the saved server target.".to_string());
        }

        if pending.fingerprint != fingerprint {
            return Err(format!(
                "Security Warning: Expected fingerprint {}, got cached {}",
                fingerprint, pending.fingerprint
            ));
        }

        let key_base64 = BASE64.encode(&pending.host_key);
        let line = if port == 22 {
            format!("{} {} {}\n", host, pending.key_type, key_base64)
        } else {
            format!("[{}]:{} {} {}\n", host, port, pending.key_type, key_base64)
        };

        let known_hosts_path = get_known_hosts_path(&app)
            .ok_or("Could not determine home directory")?;

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

        return Ok(());

        // 2. 重新连接获取密钥 (为了获取原始密钥数据)
        let tcp = TcpStream::connect(format!("{}:{}", host, port))
            .map_err(|e| format!("Re-connection failed: {}", e))?;
        
        let mut sess = ssh2::Session::new().map_err(|e| e.to_string())?;
        configure_legacy_algorithms(&mut sess);

        sess.set_tcp_stream(tcp);
        sess.handshake().map_err(|e| format!("Handshake failed: {}", e))?;

        let (host_key, key_type_enum) = sess.host_key().ok_or("No host key found")?;
        
        // 二次校验指纹，防止竞争条件下的欺诈
        let current_fingerprint = compute_fingerprint(host_key);
        if current_fingerprint != fingerprint {
            return Err(format!(
                "Security Warning: Key changed during verification! Expected {}, got {}", 
                fingerprint, current_fingerprint
            ));
        }

        // 3. 构造 OpenSSH known_hosts 格式字符串: "host key_type key_base64"
        let key_type_str = match key_type_enum {
            ssh2::HostKeyType::Rsa => "ssh-rsa",
            ssh2::HostKeyType::Dss => "ssh-dss",
            ssh2::HostKeyType::Ecdsa256 => "ecdsa-sha2-nistp256", 
            ssh2::HostKeyType::Ecdsa384 => "ecdsa-sha2-nistp384",
            ssh2::HostKeyType::Ecdsa521 => "ecdsa-sha2-nistp521",
            ssh2::HostKeyType::Ed25519 => "ssh-ed25519", 
            _ => return Err("Unsupported key type to save".to_string()),
        };

        let key_base64 = BASE64.encode(host_key);
        
        // 格式: [host]:port key_type key_base64
        // 如果端口是 22，通常可以省略端口格式，但为了严谨，我们统一使用带端口格式或者根据标准
        let line = if port == 22 {
            format!("{} {} {}\n", host, key_type_str, key_base64)
        } else {
            // 非 22 端口的标准格式: [host]:port
            format!("[{}]:{} {} {}\n", host, port, key_type_str, key_base64)
        };

        // 4. 追加写入 known_hosts 文件
        let known_hosts_path = get_known_hosts_path(&app)
            .ok_or("Could not determine home directory")?;
        
        // 确保 .ssh 目录存在
        if let Some(parent) = known_hosts_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create .ssh dir: {}", e))?;
            }
        }

        // 以追加模式打开文件
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&known_hosts_path)
            .map_err(|e| format!("Failed to open known_hosts: {}", e))?;

        file.write_all(line.as_bytes())
            .map_err(|e| format!("Failed to write to known_hosts: {}", e))?;

        Ok(())
    }).await.map_err(|e| format!("Runtime Error: {}", e))?
}


// ==============================================================================
// 🚀 核心连接命令 (保持原有逻辑)
// ==============================================================================
#[tauri::command]
pub async fn connect_ssh(
    app: AppHandle,
    state: State<'_, SshState>,
    app_state: State<'_, AppState>,      
    vault_state: State<'_, VaultState>,  
    server_id: String,                   
    session_id: String,                  
) -> Result<(), String> {

    let sessions = state.sessions.clone();
    let db_pool = &app_state.db;

    // 1. --- 从数据库查询服务器基础信息 ---
    let row = sqlx::query(
        "SELECT id, ip, port, username, connection_type, proxy_id, auth_type, password_id, key_id, passphrase, private_key, password, 
                connect_timeout, keep_alive_interval, auto_reconnect, max_reconnects 
         FROM servers WHERE id = ?"
    )
    .bind(&server_id) 
    .fetch_optional(db_pool)
    .await
    .map_err(|e| format!("DB Query Error: {}", e))?
    .ok_or(format!("Server not found with ID: {}", server_id))?;

    // 2. --- 解析并解密凭证 ---
    let host: String = row.get("ip");
    let port: u16 = row.get::<i64, _>("port") as u16;
    let username: String = row.get("username");
    let connection_type: ConnectionType = row.try_get("connection_type").unwrap_or(ConnectionType::Direct);
    let proxy_id: Option<String> = row.try_get("proxy_id").ok();
    let auth_type: String = row.get("auth_type");

    let connect_timeout: Option<u32> = row.try_get("connect_timeout").ok();
    let keep_alive_interval: Option<u32> = row.try_get("keep_alive_interval").ok();
    let auto_reconnect: Option<bool> = row.try_get("auto_reconnect").ok();
    let max_reconnects: Option<u32> = row.try_get("max_reconnects").ok();

    let mut final_password: Option<String> = None;
    let mut final_private_key: Option<String> = None;
    let mut final_passphrase: Option<String> = row.get("passphrase");

    // 获取 Master Key
    let master_key = {
        let guard = vault_state.0.lock().unwrap();
        guard.as_ref().cloned().ok_or("VAULT_LOCKED: Please unlock the vault first.")?
    };

    if auth_type == "password" {
        let pwd_id: Option<String> = row.get("password_id");
        if let Some(pid) = pwd_id {
            let decrypted = internal_get_secret(db_pool, &master_key, &pid).await?;
            if let Ok(parsed) = serde_json::from_str::<Value>(&decrypted) {
                if let Some(val) = parsed.get("val").and_then(|v| v.as_str()) {
                    final_password = Some(val.to_string());
                } else {
                    final_password = Some(decrypted);
                }
            } else {
                final_password = Some(decrypted);
            }
        } else {
            final_password = row.get("password"); 
        }
    } 
    // 兼容 "key" 和 "privateKey"
    else if auth_type == "key" || auth_type == "privateKey" {
        let k_id: Option<String> = row.get("key_id");
        if let Some(kid) = k_id {
            let decrypted = internal_get_secret(db_pool, &master_key, &kid).await?;
            
            let mut raw_key = String::new();
            
            if let Ok(parsed) = serde_json::from_str::<Value>(&decrypted) {
                if let Some(val) = parsed.get("val").and_then(|v| v.as_str()) {
                    raw_key = val.to_string();
                    if let Some(pass) = parsed.get("pass").and_then(|v| v.as_str()) {
                          final_passphrase = Some(pass.to_string());
                    }
                } else {
                    raw_key = decrypted; 
                }
            } else {
                raw_key = decrypted;
            }

            // 私钥重组逻辑
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

            final_private_key = Some(key_clean);

        } else {
            if let Some(pk) = row.get::<Option<String>, _>("private_key") {
                let mut key_clean = pk.trim().to_string();
                if !key_clean.is_empty() && !key_clean.ends_with('\n') {
                    key_clean.push('\n');
                }
                final_private_key = Some(key_clean);
            }
        }
    }

    if let Some(ref p) = final_passphrase {
        if p.trim().is_empty() {
            final_passphrase = None;
        }
    }

    if final_password.is_none() && final_private_key.is_none() {
        return Err(format!("Auth Failed: No password or private key resolved from database. (Type: {})", auth_type));
    }

    // 3. --- 组装 SshConfig 对象 ---
    let proxy = load_proxy_for_connection(db_pool, &connection_type, proxy_id.as_deref()).await?;

    let config = SshConfig {
        id: server_id.clone(),
        host,
        port,
        username,
        connection_type,
        proxy,
        password: final_password,
        private_key: final_private_key,
        passphrase: final_passphrase, 
        password_id: None,
        password_source: None,
        connect_timeout,
        keep_alive_interval,
        auto_reconnect,
        max_reconnects,
    };

    let config_monitor = config.clone();
    let config_sftp = config.clone();

    // 4. --- 执行连接 ---
    tauri::async_runtime::spawn_blocking(move || {
        
        // A. 清理旧连接
        {
            let mut map = sessions.lock().unwrap();
            if map.contains_key(&session_id) {
                map.remove(&session_id);
            }
        }

        // B. 建立连接
        let (shell_sess, shell_channel) =
            create_shell_channel(&config).map_err(|e| format!("Shell Connection Failed: {}", e))?;

        let monitor_sess = create_monitor_session(&config_monitor);
        let sftp_sess = create_sftp_session(&config_sftp);

        // C. 存入状态
        let shell_channel_arc = Arc::new(Mutex::new(shell_channel));
        let monitor_session_arc = Arc::new(Mutex::new(monitor_sess));
        let sftp_session_arc = Arc::new(Mutex::new(sftp_sess));

        {
            let mut map = sessions.lock().unwrap();
            map.insert(
                session_id.clone(),
                SshConnection {
                    shell_session: shell_sess.clone(),
                    shell_channel: shell_channel_arc.clone(),
                    monitor_session: monitor_session_arc,
                    sftp_session: sftp_session_arc,
                },
            );
        }

        // D. 启动读取线程
        spawn_shell_reader_thread(app, shell_sess, shell_channel_arc, session_id.clone());

        Ok(())
    })
    .await
    .map_err(|e| format!("Async Error: {}", e))?
}

// ==============================================================================
// ⚠️ 以下命令保持不变
// ==============================================================================

#[tauri::command]
pub fn disconnect_ssh(state: State<'_, SshState>, id: String) -> Result<(), String> {
    let mut map = state.sessions.lock().unwrap();
    if let Some(conn) = map.remove(&id) {
        if let Ok(mut c) = conn.shell_channel.lock() {
            let _ = c.close();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn write_ssh(state: State<'_, SshState>, id: String, data: String) -> Result<(), String> {
    let map = state.sessions.lock().unwrap();
    if let Some(conn) = map.get(&id) {
        if let Ok(mut c) = conn.shell_channel.lock() {
            use std::io::Write;
            c.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
            c.flush().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn resize_ssh(
    state: State<'_, SshState>,
    id: String,
    rows: u32,
    cols: u32,
) -> Result<(), String> {
    let map = state.sessions.lock().unwrap();
    if let Some(conn) = map.get(&id) {
        if let Ok(mut c) = conn.shell_channel.lock() {
            let _ = c.request_pty_size(cols, rows, None, None);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn test_connection(
    app_state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    payload: TestConnectionPayload
) -> Result<String, String> {
    let db_pool = &app_state.db;

    // 1. 解析密码/密钥 (核心逻辑：判断 Source)
    let mut final_password: Option<String> = None;
    let mut final_private_key: Option<String> = None;
    let mut final_passphrase: Option<String> = payload.passphrase.clone();

    let mut master_key = None;
    
    let needs_decryption = (payload.auth_type == "password" && payload.password_source.as_deref() == Some("store")) ||
                           ((payload.auth_type == "key" || payload.auth_type == "privateKey") && payload.key_source.as_deref() == Some("store"));

    if needs_decryption {
        let guard = vault_state.0.lock().unwrap();
        if let Some(key) = guard.as_ref() {
            master_key = Some(key.clone());
        } else {
            return Err("VAULT_LOCKED: Please unlock the vault to use saved credentials.".to_string());
        }
    }

    // --- 处理密码 ---
    if payload.auth_type == "password" {
        if payload.password_source.as_deref() == Some("store") {
            if let Some(pid) = payload.password_id {
                if let Some(mk) = &master_key {
                    let decrypted = internal_get_secret(db_pool, mk, &pid).await?;
                    if let Ok(parsed) = serde_json::from_str::<Value>(&decrypted) {
                        if let Some(val) = parsed.get("val").and_then(|v| v.as_str()) {
                            final_password = Some(val.to_string());
                        } else {
                            final_password = Some(decrypted);
                        }
                    } else {
                        final_password = Some(decrypted);
                    }
                }
            }
        } else {
            final_password = payload.password;
        }
    }
    // --- 处理密钥 ---
    else if payload.auth_type == "key" || payload.auth_type == "privateKey" {
        if payload.key_source.as_deref() == Some("store") {
            if let Some(kid) = payload.key_id {
                if let Some(mk) = &master_key {
                    let decrypted = internal_get_secret(db_pool, mk, &kid).await?;
                    let mut raw_key = String::new();
                    if let Ok(parsed) = serde_json::from_str::<Value>(&decrypted) {
                        if let Some(val) = parsed.get("val").and_then(|v| v.as_str()) {
                            raw_key = val.to_string();
                            if let Some(pass) = parsed.get("pass").and_then(|v| v.as_str()) {
                                final_passphrase = Some(pass.to_string());
                            }
                        } else {
                            raw_key = decrypted;
                        }
                    } else {
                        raw_key = decrypted;
                    }
                    final_private_key = Some(raw_key);
                }
            }
        } else {
            final_private_key = payload.private_key;
        }
    }

    if let Some(pk) = &final_private_key {
        let mut key_clean = pk.trim().to_string();
        if !key_clean.ends_with('\n') {
            key_clean.push('\n');
        }
        final_private_key = Some(key_clean);
    }

    let proxy = load_proxy_for_connection(
        db_pool,
        &payload.connection_type,
        payload.proxy_id.as_deref(),
    )
    .await?;

    let config = SshConfig {
        id: "test_session".to_string(),
        host: payload.ip,
        port: payload.port,
        username: payload.username,
        connection_type: payload.connection_type,
        proxy,
        password: final_password,
        private_key: final_private_key,
        passphrase: final_passphrase,
        password_id: None,
        password_source: None,
        connect_timeout: payload.connect_timeout,
        keep_alive_interval: None,
        auto_reconnect: None,
        max_reconnects: None,
    };

    tauri::async_runtime::spawn_blocking(move || {
        use crate::commands::ssh::core::establish_base_session;
        use std::io::Read;

        let sess = establish_base_session(&config)
            .map_err(|e| format!("连接建立失败: {}", e))?;

        let mut channel = sess.channel_session()
            .map_err(|e| format!("通道创建失败: {}", e))?;
        
        channel.exec("whoami")
            .map_err(|e| format!("命令验证失败: {}", e))?;

        let mut s = String::new();
        channel.read_to_string(&mut s)
            .map_err(|e| format!("结果读取失败: {}", e))?;

        Ok(format!("连接成功! 用户: {}", s.trim()))
    })
    .await
    .map_err(|e| format!("Runtime Error: {}", e))?
}

#[tauri::command]
pub async fn quick_connect(
    app: AppHandle,
    state: State<'_, SshState>,
    id: String,           // 前端的 sessionId
    ip: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    passphrase: Option<String>
) -> Result<(), String> {
    
    // 获取会话锁的引用，准备后续存入
    let sessions = state.sessions.clone();
    let session_id = id; // 重命名以避免歧义

    // 1. 处理私钥格式 (如果存在)
    // 确保私钥以换行符结尾，这是 OpenSSH 库的常见要求
    let final_private_key = if let Some(pk) = private_key {
        let mut key_clean = pk.trim().to_string();
        if !key_clean.is_empty() && !key_clean.ends_with('\n') {
            key_clean.push('\n');
        }
        Some(key_clean)
    } else {
        None
    };

    // 2. 手动构建 SSH 配置对象
    // 使用默认的超时和保活设置，因为快速连接通常没有高级配置
    let config = SshConfig {
        id: "quick_connect".to_string(), // 仅作为标识
        host: ip,
        port,
        username,
        connection_type: ConnectionType::Direct,
        proxy: None,
        password,       
        private_key: final_private_key,    
        passphrase,
        
        // --- 默认值 ---
        password_id: None,
        password_source: None,
        connect_timeout: Some(10),       // 默认 10秒超时
        keep_alive_interval: Some(15),   // 默认 15秒保活
        auto_reconnect: Some(false),     // 快速连接不自动重连
        max_reconnects: Some(0),
    };

    // 克隆配置用于监控和SFTP会话
    let config_monitor = config.clone();
    let config_sftp = config.clone();

    // 3. 执行连接逻辑 (放入 blocking 线程以避免阻塞异步运行时)
    tauri::async_runtime::spawn_blocking(move || {
        
        // A. 清理可能存在的旧连接 (防止 ID 冲突)
        {
            let mut map = sessions.lock().unwrap();
            if map.contains_key(&session_id) {
                map.remove(&session_id);
            }
        }

        // B. 建立 Shell 通道
        // 复用 core 模块中的底层函数
        let (shell_sess, shell_channel) =
            create_shell_channel(&config).map_err(|e| format!("Shell Connection Failed: {}", e))?;

        // C. 建立辅助会话 (监控和文件传输)
        let monitor_sess = create_monitor_session(&config_monitor);
        let sftp_sess = create_sftp_session(&config_sftp);

        // D. 存入全局状态
        let shell_channel_arc = Arc::new(Mutex::new(shell_channel));
        let monitor_session_arc = Arc::new(Mutex::new(monitor_sess));
        let sftp_session_arc = Arc::new(Mutex::new(sftp_sess));

        {
            let mut map = sessions.lock().unwrap();
            map.insert(
                session_id.clone(),
                SshConnection {
                    shell_session: shell_sess.clone(),
                    shell_channel: shell_channel_arc.clone(),
                    monitor_session: monitor_session_arc,
                    sftp_session: sftp_session_arc,
                },
            );
        }

        // E. 启动读取线程 (监听 SSH 输出并发回前端)
        spawn_shell_reader_thread(app, shell_sess, shell_channel_arc, session_id);

        Ok(())
    })
    .await
    .map_err(|e| format!("Async Error: {}", e))?
}
