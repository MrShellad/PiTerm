use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use std::net::TcpStream;
use tauri::{AppHandle, State};
use std::collections::HashMap;

use crate::models::TestConnectionPayload;
use crate::state::AppState;
use crate::commands::vault::VaultState;

pub mod core;
pub mod state;
pub mod utils;
pub mod host_key;
pub mod resolver;

pub use state::{
    HostKeyVerificationCache, PendingHostKey, SshConnection, SshState,
    remove_ssh_session, remove_ssh_session_if_instance, spawn_ssh_session_cleanup_task,
};
use core::{
    create_shell_channel, spawn_shell_reader_thread, configure_legacy_algorithms
};
use ssh2::CheckResult;

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

fn prune_pending_host_keys(cache: &mut HashMap<String, PendingHostKey>) {
    cache.retain(|_, entry| !entry.is_expired());
}

const SSH_BLOCKING_OPERATION_TIMEOUT: Duration = Duration::from_secs(10);

async fn run_blocking_ssh_task<T, F>(operation_name: &'static str, task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tokio::time::timeout(
        SSH_BLOCKING_OPERATION_TIMEOUT,
        async move { tauri::async_runtime::spawn_blocking(task).await },
    )
    .await
    .map_err(|_| {
        format!(
            "SSH {} timed out after {}s",
            operation_name,
            SSH_BLOCKING_OPERATION_TIMEOUT.as_secs()
        )
    })?
    .map_err(|e| format!("SSH {} task failed: {}", operation_name, e))?
}

#[tauri::command]
pub async fn check_host_key(
    app: AppHandle,
    verification_cache: State<'_, HostKeyVerificationCache>,
    _id: String,
    host: String,
    port: u16
) -> Result<HostKeyCheckResult, String> {
    utils::emit_ssh_log(&app, &format!("Checking host identity for {}:{}...", host, port));

    let cache = verification_cache.entries.clone();

    tauri::async_runtime::spawn_blocking(move || {
        utils::emit_ssh_log(&app, "Connecting to target host (TCP)...");
        let tcp = TcpStream::connect(format!("{}:{}", host, port))
            .map_err(|e| {
                let err = format!("Network unreachable: {}", e);
                utils::emit_ssh_log(&app, &err);
                err
            })?;
        
        utils::emit_ssh_log(&app, "Initiating SSH protocol handshake...");
        let mut sess = ssh2::Session::new().map_err(|e| e.to_string())?;
        
        configure_legacy_algorithms(&mut sess);
        sess.set_timeout(10_000);

        sess.set_tcp_stream(tcp);
        sess.handshake().map_err(|e| {
            let err = format!("SSH handshake failed: {}", e);
            utils::emit_ssh_log(&app, &err);
            err
        })?;

        utils::emit_ssh_log(&app, "Retrieving remote host key...");
        let (host_key_bytes, key_type_enum) = sess.host_key().ok_or("No host key received from server")?;
        
        let key_type = match key_type_enum {
            ssh2::HostKeyType::Rsa => "ssh-rsa",
            ssh2::HostKeyType::Dss => "ssh-dss",
            ssh2::HostKeyType::Ecdsa256 => "ecdsa-sha2-nistp256", 
            ssh2::HostKeyType::Ecdsa384 => "ecdsa-sha2-nistp384",
            ssh2::HostKeyType::Ecdsa521 => "ecdsa-sha2-nistp521",
            ssh2::HostKeyType::Ed25519 => "ssh-ed25519", 
            _ => "unknown",
        }.to_string();

        let fingerprint = utils::compute_fingerprint(host_key_bytes);
        utils::emit_ssh_log(&app, &format!("Server fingerprint: {}", fingerprint));

        utils::emit_ssh_log(&app, "Comparing with local known_hosts file...");
        let mut known_hosts = sess.known_hosts().map_err(|e| e.to_string())?;

        let check_result = host_key::check_local_host_key(&app, &host, port, host_key_bytes, &mut known_hosts)?;

        let status = match check_result {
            CheckResult::Match => {
                utils::emit_ssh_log(&app, "✅ Host verification successful.");
                "verified"
            },
            CheckResult::Mismatch => {
                utils::emit_ssh_log(&app, "⚠️ WARNING: HOST IDENTIFICATION HAS CHANGED!");
                "mismatch"
            },
            CheckResult::NotFound | CheckResult::Failure => {
                utils::emit_ssh_log(&app, "ℹ️ New host detected, awaiting user trust...");
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
                    host_key: host_key_bytes.to_vec(),
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

#[tauri::command]
pub async fn trust_host_key(
    app: AppHandle,
    app_state: State<'_, AppState>,
    verification_cache: State<'_, HostKeyVerificationCache>,
    id: String,          
    fingerprint: String, 
    _key_type: String
) -> Result<(), String> {
    let db_pool = &app_state.db;
    let cache = verification_cache.entries.clone();

    use sqlx::Row;
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

        host_key::save_host_key_to_disk(&app, &host, port, &pending.key_type, &pending.host_key)?;

        Ok(())
    }).await.map_err(|e| format!("Runtime Error: {}", e))?
}

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

    let master_key = {
        let guard = vault_state.0.lock().unwrap();
        guard.as_ref().cloned().ok_or("VAULT_LOCKED: Please unlock the vault first.")?
    };

    let config = resolver::resolve_config(db_pool, &master_key, &server_id).await?;

    tauri::async_runtime::spawn_blocking(move || {
        let existing = remove_ssh_session(&sessions, &session_id);
        drop(existing);

        let (shell_sess, shell_channel) =
            create_shell_channel(&config).map_err(|e| format!("Shell Connection Failed: {}", e))?;

        let bg_sess = core::establish_base_session(&config)
            .map_err(|e| format!("Background Connection Failed: {}", e))?;

        let shell_channel_arc = Arc::new(Mutex::new(shell_channel));
        let shell_session_arc = Arc::new(Mutex::new(shell_sess.clone()));
        let bg_session_arc = Arc::new(Mutex::new(bg_sess));

        let connection = SshConnection::new(
            shell_session_arc.clone(),
            bg_session_arc,
            shell_channel_arc.clone(),
        );
        let connection_instance_id = connection.instance_id;

        {
            let mut map = sessions.lock().unwrap();
            map.insert(
                session_id.clone(),
                connection,
            );
        }

        spawn_shell_reader_thread(
            app,
            shell_sess,
            shell_channel_arc,
            sessions.clone(),
            session_id,
            connection_instance_id,
        );

        Ok(())
    })
    .await
    .map_err(|e| format!("Async Error: {}", e))?
}

#[tauri::command]
pub async fn disconnect_ssh(state: State<'_, SshState>, id: String) -> Result<(), String> {
    let conn = remove_ssh_session(&state.sessions, &id);

    if let Some(conn) = conn {
        run_blocking_ssh_task("disconnect", move || {
            drop(conn);
            Ok(())
        })
        .await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn write_ssh(state: State<'_, SshState>, id: String, data: String) -> Result<(), String> {
    let channel = {
        let map = state.sessions.lock().map_err(|e| e.to_string())?;
        map.get(&id)
            .map(|conn| {
                conn.touch_client_heartbeat();
                conn.shell_channel.clone()
            })
            .ok_or_else(|| "SSH connection not active".to_string())?
    };

    run_blocking_ssh_task("write", move || {
        use std::io::Write;

        let mut channel = channel
            .lock()
            .map_err(|e| format!("SSH channel lock failed: {}", e))?;

        channel
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        channel.flush().map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn resize_ssh(
    state: State<'_, SshState>,
    id: String,
    rows: u32,
    cols: u32,
) -> Result<(), String> {
    let channel = {
        let map = state.sessions.lock().map_err(|e| e.to_string())?;
        map.get(&id)
            .map(|conn| {
                conn.touch_client_heartbeat();
                conn.shell_channel.clone()
            })
            .ok_or_else(|| "SSH connection not active".to_string())?
    };

    run_blocking_ssh_task("resize", move || {
        let mut channel = channel
            .lock()
            .map_err(|e| format!("SSH channel lock failed: {}", e))?;

        channel
            .request_pty_size(cols, rows, None, None)
            .map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub fn touch_ssh_session(state: State<'_, SshState>, id: String) -> Result<(), String> {
    let map = state.sessions.lock().map_err(|e| e.to_string())?;
    let conn = map
        .get(&id)
        .ok_or_else(|| "SSH connection not active".to_string())?;
    conn.touch_client_heartbeat();
    Ok(())
}

#[tauri::command]
pub async fn test_connection(
    app_state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    payload: TestConnectionPayload
) -> Result<String, String> {
    let db_pool = &app_state.db;

    let needs_decryption = (payload.auth_type == "password" && payload.password_source.as_deref() == Some("store")) ||
                           ((payload.auth_type == "key" || payload.auth_type == "privateKey") && payload.key_source.as_deref() == Some("store"));

    let master_key = if needs_decryption {
        let guard = vault_state.0.lock().unwrap();
        if let Some(key) = guard.as_ref() {
            Some(key.clone())
        } else {
            return Err("VAULT_LOCKED: Please unlock the vault to use saved credentials.".to_string());
        }
    } else {
        None
    };

    let config = resolver::resolve_test_config(db_pool, master_key.as_ref(), payload).await?;

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
    id: String,
    ip: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    passphrase: Option<String>
) -> Result<(), String> {
    let sessions = state.sessions.clone();
    let session_id = id;

    let final_private_key = private_key.map(|pk| utils::clean_private_key(&pk));

    use crate::models::{ConnectionType, SshConfig};
    let config = SshConfig {
        id: "quick_connect".to_string(),
        host: ip,
        port,
        username,
        connection_type: ConnectionType::Direct,
        proxy: None,
        password,       
        private_key: final_private_key,    
        passphrase,
        
        password_id: None,
        password_source: None,
        connect_timeout: Some(10),
        keep_alive_interval: Some(15),
        auto_reconnect: Some(false),
        max_reconnects: Some(0),
    };

    tauri::async_runtime::spawn_blocking(move || {
        let existing = remove_ssh_session(&sessions, &session_id);
        drop(existing);

        let (shell_sess, shell_channel) =
            create_shell_channel(&config).map_err(|e| format!("Shell Connection Failed: {}", e))?;

        let bg_sess = core::establish_base_session(&config)
            .map_err(|e| format!("Background Connection Failed: {}", e))?;

        let shell_channel_arc = Arc::new(Mutex::new(shell_channel));
        let shell_session_arc = Arc::new(Mutex::new(shell_sess.clone()));
        let bg_session_arc = Arc::new(Mutex::new(bg_sess));

        let connection = SshConnection::new(
            shell_session_arc.clone(),
            bg_session_arc,
            shell_channel_arc.clone(),
        );
        let connection_instance_id = connection.instance_id;

        {
            let mut map = sessions.lock().unwrap();
            map.insert(
                session_id.clone(),
                connection,
            );
        }

        spawn_shell_reader_thread(
            app,
            shell_sess,
            shell_channel_arc,
            sessions.clone(),
            session_id,
            connection_instance_id,
        );

        Ok(())
    })
    .await
    .map_err(|e| format!("Async Error: {}", e))?
}
