use std::sync::Arc;

use tauri::{AppHandle, Emitter, State};

use crate::commands::vault::VaultState;
use crate::models::{SshConfig, TestConnectionPayload};
use crate::state::AppState;
use crate::utils::ssh_log::{self, SshLogRecord};

use super::background::spawn_background_session_connector;
use super::core::{create_shell_channel, spawn_shell_reader_thread, spawn_shell_writer_thread};
use super::resolver;
use super::runtime::{
    run_blocking_ssh_task, SSH_BLOCKING_OPERATION_TIMEOUT, SSH_WRITE_QUEUE_CAPACITY,
};
use super::state::{
    remove_ssh_session, SshConnection, SshResizeRequest, SshState, SshWriteRequest,
    TerminalExitEvent,
};
use super::utils;

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

    let (shell_sess, shell_channel) = create_shell_channel(&config, Some(&session_id)).await
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

    let shell_sess = Arc::new(shell_sess);
    let shell_channel_id = shell_channel.id();
    let (shell_write_tx, shell_write_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
    let (shell_resize_tx, shell_resize_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
    let connection = SshConnection::new(
        config.clone(),
        shell_sess.clone(),
        shell_channel_id,
        shell_write_tx,
        shell_resize_tx,
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

    let write_half = shell_channel.make_writer();

    spawn_shell_writer_thread(
        write_half,
        sessions.clone(),
        session_id.clone(),
        connection_instance_id,
        shell_write_rx,
    );
    spawn_shell_reader_thread(
        app.clone(),
        shell_channel,
        sessions.clone(),
        session_id.clone(),
        connection_instance_id,
        shell_resize_rx,
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
    let resize_tx = {
        let map = state.sessions.lock().map_err(|e| e.to_string())?;
        let conn = match map.get(&id) {
            Some(c) => c,
            None => {
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
                return Err("SSH connection not active".to_string());
            }
        };

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
        conn.shell_resize_tx.clone()
    };

    let resize_result = tokio::time::timeout(SSH_BLOCKING_OPERATION_TIMEOUT, async move {
        let (result_tx, result_rx) = tokio::sync::oneshot::channel();
        resize_tx
            .send(SshResizeRequest {
                rows,
                cols,
                result_tx,
            })
            .await
            .map_err(|_| "SSH shell not active".to_string())?;

        result_rx
            .await
            .map_err(|_| "SSH resize worker stopped".to_string())?
    })
    .await
    .map_err(|_| {
        format!(
            "SSH resize timed out after {}s",
            SSH_BLOCKING_OPERATION_TIMEOUT.as_secs()
        )
    })?;

    resize_result?;

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

    use crate::commands::ssh::core::establish_base_session;
    use tokio::io::AsyncReadExt;

    let sess = establish_base_session(&config, None, "test")
        .await
        .map_err(|e| format!("连接建立失败: {}", e))?;

    let channel = sess
        .channel_open_session()
        .await
        .map_err(|e| format!("通道创建失败: {}", e))?;

    channel
        .exec(true, "whoami")
        .await
        .map_err(|e| format!("命令验证失败: {}", e))?;

    let mut s = String::new();
    let stream = channel.into_stream();
    let (mut read_half, _) = tokio::io::split(stream);
    read_half
        .read_to_string(&mut s)
        .await
        .map_err(|e| format!("结果读取失败: {}", e))?;

    Ok(format!("连接成功! 用户: {}", s.trim()))
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
        name: None,
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

    let (shell_sess, shell_channel) = create_shell_channel(&config, Some(&session_id)).await
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

    let shell_sess = Arc::new(shell_sess);
    let shell_channel_id = shell_channel.id();
    let (shell_write_tx, shell_write_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
    let (shell_resize_tx, shell_resize_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
    let connection = SshConnection::new(
        config.clone(),
        shell_sess.clone(),
        shell_channel_id,
        shell_write_tx,
        shell_resize_tx,
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

    let write_half = shell_channel.make_writer();

    spawn_shell_writer_thread(
        write_half,
        sessions.clone(),
        session_id.clone(),
        connection_instance_id,
        shell_write_rx,
    );
    spawn_shell_reader_thread(
        app.clone(),
        shell_channel,
        sessions.clone(),
        session_id.clone(),
        connection_instance_id,
        shell_resize_rx,
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
}

pub fn handle_auto_reconnect(
    app: AppHandle,
    sessions: Arc<std::sync::Mutex<std::collections::HashMap<String, SshConnection>>>,
    session_id: String,
    instance_id: u64,
) {
    tokio::spawn(async move {
        let conn = {
            let map = match sessions.lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            let Some(conn) = map.get(&session_id) else {
                return;
            };
            if conn.instance_id != instance_id {
                return;
            }
            conn.clone()
        };

        let config = conn.config.clone();
        let max_attempts = config.max_reconnects.unwrap_or(3);

        let _ = app.emit(
            &format!("term-data-{}", session_id),
            "\r\n\x1b[33m[PiTerm] Connection lost. Attempting to auto-reconnect...\x1b[0m\r\n".to_string(),
        );

        for attempt in 1..=max_attempts {
            {
                let map = match sessions.lock() {
                    Ok(g) => g,
                    Err(p) => p.into_inner(),
                };
                let Some(c) = map.get(&session_id) else {
                    return;
                };
                if c.instance_id != instance_id {
                    return;
                }
            }

            let _ = app.emit(
                &format!("term-data-{}", session_id),
                format!("\x1b[33m[PiTerm] Reconnecting (attempt {}/{})...\x1b[0m\r\n", attempt, max_attempts),
            );

            match create_shell_channel(&config, Some(&session_id)).await {
                Ok((shell_sess, shell_channel)) => {
                    let old_conn = remove_ssh_session(&sessions, &session_id);
                    if let Some(c) = old_conn {
                        let _ = c.shutdown("PiTerm auto-reconnect replaced session");
                    }

                    let shell_sess = Arc::new(shell_sess);
                    let shell_channel_id = shell_channel.id();
                    let (shell_write_tx, shell_write_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
                    let (shell_resize_tx, shell_resize_rx) = tokio::sync::mpsc::channel(SSH_WRITE_QUEUE_CAPACITY);
                    let new_conn = SshConnection::new(
                        config.clone(),
                        shell_sess.clone(),
                        shell_channel_id,
                        shell_write_tx,
                        shell_resize_tx,
                    );
                    let new_instance_id = new_conn.instance_id;

                    {
                        let mut map = match sessions.lock() {
                            Ok(g) => g,
                            Err(p) => p.into_inner(),
                        };
                        map.insert(session_id.clone(), new_conn);
                    }

                    let write_half = shell_channel.make_writer();

                    spawn_shell_writer_thread(
                        write_half,
                        sessions.clone(),
                        session_id.clone(),
                        new_instance_id,
                        shell_write_rx,
                    );

                    spawn_shell_reader_thread(
                        app.clone(),
                        shell_channel,
                        sessions.clone(),
                        session_id.clone(),
                        new_instance_id,
                        shell_resize_rx,
                    );

                    spawn_background_session_connector(
                        app.clone(),
                        sessions.clone(),
                        config.clone(),
                        session_id.clone(),
                        "auto_reconnect".to_string(),
                        new_instance_id,
                    );

                    let _ = app.emit(
                        &format!("term-data-{}", session_id),
                        "\x1b[32m[PiTerm] Connection re-established successfully!\x1b[0m\r\n\r\n".to_string(),
                    );
                    return;
                }
                Err(err) => {
                    let _ = app.emit(
                        &format!("term-data-{}", session_id),
                        format!("\x1b[31m[PiTerm] Reconnect attempt failed: {}\x1b[0m\r\n", err),
                    );
                    if attempt < max_attempts {
                        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    }
                }
            }
        }

        let _ = app.emit(
            &format!("term-data-{}", session_id),
            "\x1b[31m[PiTerm] Auto-reconnect failed. Session terminated.\x1b[0m\r\n".to_string(),
        );

        let _ = app.emit(
            &format!("term-exit-{}", session_id),
            TerminalExitEvent {
                session_active: false,
                reason: "reconnect_failed".to_string(),
            },
        );

        let _ = remove_ssh_session(&sessions, &session_id);
    });
}
