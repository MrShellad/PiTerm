use std::collections::HashMap;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

use crate::commands::vault::VaultState;
use crate::models::{SshConfig, TestConnectionPayload};
use crate::state::AppState;
use crate::utils::ssh_log::{self, SshLogRecord};

pub mod core;
pub mod host_key;
pub mod resolver;
pub mod state;
pub mod utils;

use core::{
    configure_legacy_algorithms, create_shell_channel, spawn_shell_reader_thread,
    spawn_shell_writer_thread,
};
use ssh2::CheckResult;
pub use state::{
    get_ssh_session_if_instance, remove_ssh_session, remove_ssh_session_if_instance,
    spawn_ssh_session_cleanup_task, BackgroundSessionEvent, HostKeyVerificationCache,
    PendingHostKey, SshConnection, SshState, SshWriteRequest, TerminalExitEvent,
};

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
const SSH_BACKGROUND_CONNECT_RETRY_DELAY: Duration = Duration::from_secs(3);
const SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS: u8 = 3;
const SSH_WRITE_QUEUE_CAPACITY: usize = 1024;

fn emit_background_session_event(
    app: &AppHandle,
    session_id: &str,
    status: &str,
    reason: Option<String>,
) {
    let _ = app.emit(
        &format!("bg-session-{}", session_id),
        BackgroundSessionEvent {
            status: status.to_string(),
            reason,
        },
    );
}

fn spawn_background_session_connector(
    app: AppHandle,
    sessions: Arc<Mutex<HashMap<String, SshConnection>>>,
    config: SshConfig,
    session_id: String,
    server_id: String,
    instance_id: u64,
) {
    thread::spawn(move || {
        emit_background_session_event(&app, &session_id, "connecting", None);

        for attempt in 1..=SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS {
            let Some(conn) = get_ssh_session_if_instance(&sessions, &session_id, instance_id)
            else {
                ssh_log::debug(
                    SshLogRecord::new(
                        "ssh.command",
                        "background_session_connect_abandoned",
                        "Stopped background SSH session establishment because the parent session was replaced or removed",
                    )
                    .session_id(session_id.clone())
                    .server_id(server_id.clone())
                    .instance_id(instance_id)
                    .field("attempt", attempt)
                    .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS),
                );
                return;
            };
            conn.mark_bg_connecting();

            ssh_log::info(
                SshLogRecord::new(
                    "ssh.command",
                    "background_session_connect_started",
                    "Attempting to establish background SSH session",
                )
                .session_id(session_id.clone())
                .server_id(server_id.clone())
                .instance_id(instance_id)
                .field("attempt", attempt)
                .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS),
            );

            match core::establish_base_session(&config, Some(&session_id), "background") {
                Ok(bg_session) => {
                    let Some(conn) =
                        get_ssh_session_if_instance(&sessions, &session_id, instance_id)
                    else {
                        let _ = bg_session.disconnect(
                            None,
                            "PiTerm background session abandoned",
                            None,
                        );
                        ssh_log::debug(
                            SshLogRecord::new(
                                "ssh.command",
                                "background_session_connect_abandoned",
                                "Discarded a completed background SSH session because the parent session was replaced or removed",
                            )
                            .session_id(session_id.clone())
                            .server_id(server_id.clone())
                            .instance_id(instance_id)
                            .field("attempt", attempt),
                        );
                        return;
                    };

                    conn.install_bg_session(bg_session);
                    ssh_log::info(
                        SshLogRecord::new(
                            "ssh.command",
                            "background_session_ready",
                            "Background SSH session established successfully",
                        )
                        .session_id(session_id.clone())
                        .server_id(server_id.clone())
                        .instance_id(instance_id)
                        .field("attempt", attempt),
                    );
                    emit_background_session_event(&app, &session_id, "ready", None);
                    return;
                }
                Err(err) => {
                    let error = format!("Background Connection Failed: {}", err);
                    let will_retry = attempt < SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS;

                    if will_retry {
                        ssh_log::warn(
                            SshLogRecord::new(
                                "ssh.command",
                                "background_session_retry_scheduled",
                                "Background SSH session attempt failed; retry scheduled",
                            )
                            .session_id(session_id.clone())
                            .server_id(server_id.clone())
                            .instance_id(instance_id)
                            .field("attempt", attempt)
                            .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS)
                            .field(
                                "retry_delay_secs",
                                SSH_BACKGROUND_CONNECT_RETRY_DELAY.as_secs(),
                            )
                            .field("error", error),
                        );
                        thread::sleep(SSH_BACKGROUND_CONNECT_RETRY_DELAY);
                        continue;
                    }

                    if let Some(conn) =
                        get_ssh_session_if_instance(&sessions, &session_id, instance_id)
                    {
                        conn.mark_bg_unavailable();
                    }

                    ssh_log::error(
                        SshLogRecord::new(
                            "ssh.command",
                            "background_session_unavailable",
                            "Background SSH session could not be established",
                        )
                        .session_id(session_id.clone())
                        .server_id(server_id.clone())
                        .instance_id(instance_id)
                        .field("attempt", attempt)
                        .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS)
                        .field("error", error.clone()),
                    );
                    emit_background_session_event(&app, &session_id, "unavailable", Some(error));
                    return;
                }
            }
        }
    });
}

async fn run_blocking_ssh_task<T, F>(operation_name: &'static str, task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tokio::time::timeout(SSH_BLOCKING_OPERATION_TIMEOUT, async move {
        tauri::async_runtime::spawn_blocking(task).await
    })
    .await
    .map_err(|_| {
        let err = format!(
            "SSH {} timed out after {}s",
            operation_name,
            SSH_BLOCKING_OPERATION_TIMEOUT.as_secs()
        );
        ssh_log::warn(
            SshLogRecord::new(
                "ssh.command",
                "blocking_operation_timeout",
                "Blocking SSH helper task timed out",
            )
            .field("operation", operation_name)
            .field("timeout_secs", SSH_BLOCKING_OPERATION_TIMEOUT.as_secs())
            .field("error", err.clone()),
        );
        err
    })?
    .map_err(|e| {
        let err = format!("SSH {} task failed: {}", operation_name, e);
        ssh_log::error(
            SshLogRecord::new(
                "ssh.command",
                "blocking_operation_failed",
                "Blocking SSH helper task failed",
            )
            .field("operation", operation_name)
            .field("error", err.clone()),
        );
        err
    })?
}

#[tauri::command]
pub async fn check_host_key(
    app: AppHandle,
    verification_cache: State<'_, HostKeyVerificationCache>,
    _id: String,
    host: String,
    port: u16,
) -> Result<HostKeyCheckResult, String> {
    utils::emit_ssh_log(
        &app,
        &format!("Checking host identity for {}:{}...", host, port),
    );

    let cache = verification_cache.entries.clone();

    tauri::async_runtime::spawn_blocking(move || {
        utils::emit_ssh_log(&app, "Connecting to target host (TCP)...");
        let tcp = TcpStream::connect(format!("{}:{}", host, port)).map_err(|e| {
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
        let (host_key_bytes, key_type_enum) =
            sess.host_key().ok_or("No host key received from server")?;

        let key_type = match key_type_enum {
            ssh2::HostKeyType::Rsa => "ssh-rsa",
            ssh2::HostKeyType::Dss => "ssh-dss",
            ssh2::HostKeyType::Ecdsa256 => "ecdsa-sha2-nistp256",
            ssh2::HostKeyType::Ecdsa384 => "ecdsa-sha2-nistp384",
            ssh2::HostKeyType::Ecdsa521 => "ecdsa-sha2-nistp521",
            ssh2::HostKeyType::Ed25519 => "ssh-ed25519",
            _ => "unknown",
        }
        .to_string();

        let fingerprint = utils::compute_fingerprint(host_key_bytes);
        utils::emit_ssh_log(&app, &format!("Server fingerprint: {}", fingerprint));

        utils::emit_ssh_log(&app, "Comparing with local known_hosts file...");
        let mut known_hosts = sess.known_hosts().map_err(|e| e.to_string())?;

        let check_result =
            host_key::check_local_host_key(&app, &host, port, host_key_bytes, &mut known_hosts)?;

        let status = match check_result {
            CheckResult::Match => {
                utils::emit_ssh_log(&app, "✅ Host verification successful.");
                "verified"
            }
            CheckResult::Mismatch => {
                utils::emit_ssh_log(&app, "⚠️ WARNING: HOST IDENTIFICATION HAS CHANGED!");
                "mismatch"
            }
            CheckResult::NotFound | CheckResult::Failure => {
                utils::emit_ssh_log(&app, "ℹ️ New host detected, awaiting user trust...");
                "unknown"
            }
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
            },
        })
    })
    .await
    .map_err(|e| format!("Task aborted: {}", e))?
}

#[tauri::command]
pub async fn trust_host_key(
    app: AppHandle,
    app_state: State<'_, AppState>,
    verification_cache: State<'_, HostKeyVerificationCache>,
    id: String,
    fingerprint: String,
    _key_type: String,
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
    })
    .await
    .map_err(|e| format!("Runtime Error: {}", e))?
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
    ssh_log::info(
        SshLogRecord::new(
            "ssh.command",
            "connect_requested",
            "Received SSH connection request",
        )
        .session_id(session_id.clone())
        .server_id(server_id.clone()),
    );

    let master_key = {
        let guard = vault_state.0.lock().unwrap();
        guard
            .as_ref()
            .cloned()
            .ok_or("VAULT_LOCKED: Please unlock the vault first.")?
    };

    let config = resolver::resolve_config(db_pool, &master_key, &server_id).await?;
    ssh_log::info(
        SshLogRecord::new(
            "ssh.command",
            "config_resolved",
            "Resolved SSH configuration for connection request",
        )
        .session_id(session_id.clone())
        .server_id(server_id.clone())
        .field("host", config.host.clone())
        .field("port", config.port)
        .field("username", config.username.clone())
        .field("connection_type", format!("{:?}", config.connection_type))
        .field("auth_method", utils::auth_method_label(&config))
        .field(
            "proxy_type",
            config
                .proxy
                .as_ref()
                .map(|proxy| proxy.proxy_type.clone())
                .unwrap_or_else(|| "none".to_string()),
        ),
    );
    let session_id_for_join = session_id.clone();
    let server_id_for_join = server_id.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let existing = remove_ssh_session(&sessions, &session_id);
        if existing.is_some() {
            ssh_log::warn(
                SshLogRecord::new(
                    "ssh.command",
                    "replacing_existing_session",
                    "Replacing an existing SSH session with the same session id",
                )
                .session_id(session_id.clone())
                .server_id(server_id.clone()),
            );
        }
        if let Some(conn) = existing {
            let _ = conn.shutdown("PiTerm replaced session");
        }

        let (shell_sess, shell_channel) = create_shell_channel(&config, Some(&session_id))
            .map_err(|e| {
                let err = format!("Shell Connection Failed: {}", e);
                ssh_log::error(
                    SshLogRecord::new(
                        "ssh.command",
                        "shell_session_failed",
                        "Failed to create shell SSH session",
                    )
                    .session_id(session_id.clone())
                    .server_id(server_id.clone())
                    .field("error", err.clone()),
                );
                err
            })?;

        let shell_channel_arc = Arc::new(Mutex::new(shell_channel));
        let shell_session_arc = Arc::new(Mutex::new(shell_sess.clone()));
        let (shell_write_tx, shell_write_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
        let connection = SshConnection::new(
            shell_session_arc.clone(),
            shell_channel_arc.clone(),
            shell_write_tx,
        );
        let connection_instance_id = connection.instance_id;

        let active_sessions = {
            let mut map = sessions.lock().unwrap();
            map.insert(session_id.clone(), connection);
            map.len()
        };
        ssh_log::info(
            SshLogRecord::new(
                "ssh.command",
                "session_registered",
                "Registered SSH connection in session state",
            )
            .session_id(session_id.clone())
            .server_id(server_id.clone())
            .instance_id(connection_instance_id)
            .field("active_session_count", active_sessions),
        );

        spawn_shell_writer_thread(
            shell_channel_arc.clone(),
            sessions.clone(),
            session_id.clone(),
            connection_instance_id,
            shell_write_rx,
        );
        spawn_shell_reader_thread(
            app.clone(),
            shell_sess,
            shell_channel_arc,
            sessions.clone(),
            session_id.clone(),
            connection_instance_id,
        );
        spawn_background_session_connector(
            app,
            sessions.clone(),
            config.clone(),
            session_id.clone(),
            server_id.clone(),
            connection_instance_id,
        );

        ssh_log::info(
            SshLogRecord::new(
                "ssh.command",
                "connect_completed",
                "SSH connection setup completed",
            )
            .session_id(session_id)
            .server_id(server_id)
            .instance_id(connection_instance_id)
            .field("active_session_count", active_sessions)
            .field("background_status", "connecting"),
        );

        Ok(())
    })
    .await
    .map_err(|e| {
        let err = format!("Async Error: {}", e);
        ssh_log::error(
            SshLogRecord::new(
                "ssh.command",
                "connect_task_failed",
                "SSH connection worker task failed",
            )
            .session_id(session_id_for_join)
            .server_id(server_id_for_join)
            .field("error", err.clone()),
        );
        err
    })?
}

#[tauri::command]
pub async fn disconnect_ssh(state: State<'_, SshState>, id: String) -> Result<(), String> {
    ssh_log::info(
        SshLogRecord::new(
            "ssh.command",
            "disconnect_requested",
            "Received SSH disconnect request",
        )
        .session_id(id.clone()),
    );
    let conn = remove_ssh_session(&state.sessions, &id);

    if let Some(conn) = conn {
        run_blocking_ssh_task("disconnect", move || {
            let _ = conn.shutdown("PiTerm disconnect");
            Ok(())
        })
        .await?;
        ssh_log::info(
            SshLogRecord::new(
                "ssh.command",
                "disconnect_completed",
                "SSH session disconnected",
            )
            .session_id(id),
        );
    } else {
        ssh_log::debug(
            SshLogRecord::new(
                "ssh.command",
                "disconnect_skipped",
                "Disconnect request ignored because the SSH session was already absent",
            )
            .session_id(id),
        );
    }

    Ok(())
}

#[tauri::command]
pub async fn write_ssh(state: State<'_, SshState>, id: String, data: String) -> Result<(), String> {
    let payload_len = data.len();
    let contains_newline = data.contains('\n') || data.contains('\r');
    let contains_control = data
        .chars()
        .any(|ch| ch.is_control() && ch != '\n' && ch != '\r' && ch != '\t');
    let write_tx = {
        let map = state.sessions.lock().map_err(|e| e.to_string())?;
        map.get(&id)
            .ok_or_else(|| {
                ssh_log::debug(
                    SshLogRecord::new(
                        "ssh.command",
                        "write_skipped_inactive_session",
                        "SSH write skipped because the session is not active",
                    )
                    .session_id(id.clone())
                    .field("payload_len", payload_len),
                );
                "SSH connection not active".to_string()
            })
            .and_then(|conn| {
                if !conn.shell_is_active() {
                    ssh_log::debug(
                        SshLogRecord::new(
                            "ssh.command",
                            "write_skipped_inactive_shell",
                            "SSH write skipped because the shell channel is no longer active",
                        )
                        .session_id(id.clone())
                        .field("payload_len", payload_len),
                    );
                    return Err("SSH shell not active".to_string());
                }
                conn.touch_client_heartbeat();
                Ok(conn.shell_write_tx.clone())
            })?
    };

    let write_result = tokio::time::timeout(SSH_BLOCKING_OPERATION_TIMEOUT, async move {
        let (result_tx, result_rx) = tokio::sync::oneshot::channel();
        write_tx
            .send(SshWriteRequest { data, result_tx })
            .await
            .map_err(|_| "SSH shell not active".to_string())?;

        result_rx
            .await
            .map_err(|_| "SSH write worker stopped".to_string())?
    })
    .await
    .map_err(|_| {
        format!(
            "SSH write timed out after {}s",
            SSH_BLOCKING_OPERATION_TIMEOUT.as_secs()
        )
    })?;

    write_result.map_err(|err| {
        ssh_log::warn(
            SshLogRecord::new(
                "ssh.command",
                "write_failed",
                "Failed to write payload to SSH shell channel",
            )
            .session_id(id)
            .field("payload_len", payload_len)
            .field("contains_newline", contains_newline)
            .field("contains_control_chars", contains_control)
            .field("error", err.clone()),
        );
        err
    })
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
            .ok_or_else(|| {
                ssh_log::debug(
                    SshLogRecord::new(
                        "ssh.command",
                        "resize_skipped_inactive_session",
                        "SSH resize skipped because the session is not active",
                    )
                    .session_id(id.clone())
                    .field("rows", rows)
                    .field("cols", cols),
                );
                "SSH connection not active".to_string()
            })
            .and_then(|conn| {
                if !conn.shell_is_active() {
                    ssh_log::debug(
                        SshLogRecord::new(
                            "ssh.command",
                            "resize_skipped_inactive_shell",
                            "SSH resize skipped because the shell channel is no longer active",
                        )
                        .session_id(id.clone())
                        .field("rows", rows)
                        .field("cols", cols),
                    );
                    return Err("SSH shell not active".to_string());
                }
                conn.touch_client_heartbeat();
                Ok(conn.shell_channel.clone())
            })?
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
    .map_err(|err| {
        ssh_log::warn(
            SshLogRecord::new(
                "ssh.command",
                "resize_failed",
                "Failed to resize SSH shell PTY",
            )
            .session_id(id.clone())
            .field("rows", rows)
            .field("cols", cols)
            .field("error", err.clone()),
        );
        err
    })?;

    ssh_log::debug(
        SshLogRecord::new("ssh.command", "resize_completed", "Resized SSH shell PTY")
            .session_id(id)
            .field("rows", rows)
            .field("cols", cols),
    );

    Ok(())
}

#[tauri::command]
pub fn touch_ssh_session(state: State<'_, SshState>, id: String) -> Result<(), String> {
    let map = state.sessions.lock().map_err(|e| e.to_string())?;
    let conn = map.get(&id).ok_or_else(|| {
        ssh_log::debug(
            SshLogRecord::new(
                "ssh.command",
                "heartbeat_touch_failed",
                "Heartbeat touch failed because the SSH session was not active",
            )
            .session_id(id.clone()),
        );
        "SSH connection not active".to_string()
    })?;
    if !conn.shell_is_active() {
        ssh_log::debug(
            SshLogRecord::new(
                "ssh.command",
                "heartbeat_touch_skipped_inactive_shell",
                "Heartbeat touch skipped because the shell channel is no longer active",
            )
            .session_id(id),
        );
        return Err("SSH shell not active".to_string());
    }
    conn.touch_client_heartbeat();
    Ok(())
}

#[tauri::command]
pub async fn test_connection(
    app_state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    payload: TestConnectionPayload,
) -> Result<String, String> {
    let db_pool = &app_state.db;

    let needs_decryption = (payload.auth_type == "password"
        && payload.password_source.as_deref() == Some("store"))
        || ((payload.auth_type == "key" || payload.auth_type == "privateKey")
            && payload.key_source.as_deref() == Some("store"));

    let master_key = if needs_decryption {
        let guard = vault_state.0.lock().unwrap();
        if let Some(key) = guard.as_ref() {
            Some(key.clone())
        } else {
            return Err(
                "VAULT_LOCKED: Please unlock the vault to use saved credentials.".to_string(),
            );
        }
    } else {
        None
    };

    let config = resolver::resolve_test_config(db_pool, master_key.as_ref(), payload).await?;

    tauri::async_runtime::spawn_blocking(move || {
        use crate::commands::ssh::core::establish_base_session;
        use std::io::Read;

        let sess = establish_base_session(&config, None, "test")
            .map_err(|e| format!("连接建立失败: {}", e))?;

        let mut channel = sess
            .channel_session()
            .map_err(|e| format!("通道创建失败: {}", e))?;

        channel
            .exec("whoami")
            .map_err(|e| format!("命令验证失败: {}", e))?;

        let mut s = String::new();
        channel
            .read_to_string(&mut s)
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
    passphrase: Option<String>,
) -> Result<(), String> {
    let sessions = state.sessions.clone();
    let session_id = id;
    ssh_log::info(
        SshLogRecord::new(
            "ssh.command",
            "quick_connect_requested",
            "Received quick-connect SSH request",
        )
        .session_id(session_id.clone())
        .server_id("quick_connect"),
    );

    let final_private_key = private_key.map(|pk| utils::clean_private_key(&pk));

    use crate::models::ConnectionType;
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
    ssh_log::info(
        SshLogRecord::new(
            "ssh.command",
            "quick_connect_config_ready",
            "Prepared quick-connect SSH configuration",
        )
        .session_id(session_id.clone())
        .server_id("quick_connect")
        .field("host", config.host.clone())
        .field("port", config.port)
        .field("username", config.username.clone())
        .field("connection_type", format!("{:?}", config.connection_type))
        .field("auth_method", utils::auth_method_label(&config)),
    );
    let session_id_for_join = session_id.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let existing = remove_ssh_session(&sessions, &session_id);
        if existing.is_some() {
            ssh_log::warn(
                SshLogRecord::new(
                    "ssh.command",
                    "quick_connect_replacing_existing_session",
                    "Replacing an existing quick-connect SSH session",
                )
                .session_id(session_id.clone())
                .server_id("quick_connect"),
            );
        }
        if let Some(conn) = existing {
            let _ = conn.shutdown("PiTerm replaced session");
        }

        let (shell_sess, shell_channel) = create_shell_channel(&config, Some(&session_id))
            .map_err(|e| {
                let err = format!("Shell Connection Failed: {}", e);
                ssh_log::error(
                    SshLogRecord::new(
                        "ssh.command",
                        "quick_connect_shell_session_failed",
                        "Failed to create quick-connect shell SSH session",
                    )
                    .session_id(session_id.clone())
                    .server_id("quick_connect")
                    .field("error", err.clone()),
                );
                err
            })?;

        let shell_channel_arc = Arc::new(Mutex::new(shell_channel));
        let shell_session_arc = Arc::new(Mutex::new(shell_sess.clone()));
        let (shell_write_tx, shell_write_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
        let connection = SshConnection::new(
            shell_session_arc.clone(),
            shell_channel_arc.clone(),
            shell_write_tx,
        );
        let connection_instance_id = connection.instance_id;

        let active_sessions = {
            let mut map = sessions.lock().unwrap();
            map.insert(session_id.clone(), connection);
            map.len()
        };
        ssh_log::info(
            SshLogRecord::new(
                "ssh.command",
                "quick_connect_registered",
                "Registered quick-connect SSH session",
            )
            .session_id(session_id.clone())
            .server_id("quick_connect")
            .instance_id(connection_instance_id)
            .field("active_session_count", active_sessions),
        );

        spawn_shell_writer_thread(
            shell_channel_arc.clone(),
            sessions.clone(),
            session_id.clone(),
            connection_instance_id,
            shell_write_rx,
        );
        spawn_shell_reader_thread(
            app.clone(),
            shell_sess,
            shell_channel_arc,
            sessions.clone(),
            session_id.clone(),
            connection_instance_id,
        );
        spawn_background_session_connector(
            app,
            sessions.clone(),
            config.clone(),
            session_id.clone(),
            "quick_connect".to_string(),
            connection_instance_id,
        );

        ssh_log::info(
            SshLogRecord::new(
                "ssh.command",
                "quick_connect_completed",
                "Quick-connect SSH setup completed",
            )
            .session_id(session_id)
            .server_id("quick_connect")
            .instance_id(connection_instance_id)
            .field("active_session_count", active_sessions)
            .field("background_status", "connecting"),
        );

        Ok(())
    })
    .await
    .map_err(|e| {
        let err = format!("Async Error: {}", e);
        ssh_log::error(
            SshLogRecord::new(
                "ssh.command",
                "quick_connect_task_failed",
                "Quick-connect SSH worker task failed",
            )
            .session_id(session_id_for_join)
            .server_id("quick_connect")
            .field("error", err.clone()),
        );
        err
    })?
}
