use crate::commands::ssh::state::{SshState, SshWriteRequest, SshResizeRequest};
use crate::commands::vault::VaultState;
use crate::commands::fs::filesystem::FileEntry;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Listener, Emitter};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_hdr_async;
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use tokio_tungstenite::tungstenite::protocol::Message;
use sqlx::Row;

#[derive(Deserialize, Debug)]
struct AgentRequest {
    action: String,
    session_id: Option<String>,
    server_id: Option<String>,
    server_name: Option<String>,
    data: Option<String>,
    cols: Option<u32>,
    rows: Option<u32>,
    path: Option<String>,
    content: Option<String>,
}

#[derive(Serialize, Debug)]
struct SessionInfo {
    id: String,
    name: String,
    host: String,
    user: String,
}

#[derive(Serialize, Debug)]
struct AgentServerInfo {
    id: String,
    name: String,
    ip: String,
    port: u16,
    username: String,
}

#[derive(Serialize, Debug)]
struct AgentResponse {
    status: String,
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    sessions: Option<Vec<SessionInfo>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Debug)]
struct AgentServerListResponse {
    status: String,
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    servers: Option<Vec<AgentServerInfo>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Debug)]
struct AgentCommandResponse {
    status: String,
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Debug)]
struct AgentFileListResponse {
    status: String,
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    files: Option<Vec<FileEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Debug)]
struct AgentVaultStatusResponse {
    status: String,
    action: String,
    is_initialized: bool,
    is_locked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Debug)]
struct AgentConnectResponse {
    status: String,
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Debug)]
struct AgentTerminalContentResponse {
    status: String,
    action: String,
    session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Debug)]
struct StreamDataResponse {
    event: String,
    session_id: String,
    data: String,
}

struct AgentServerManager {
    token: String,
    current_port: u16,
    current_enabled: bool,
    server_task: Option<tauri::async_runtime::JoinHandle<()>>,
}

fn load_agent_settings(app: &AppHandle) -> (bool, u16) {
    let mut enabled = false;
    let mut port = 18133;

    if let Ok(config_dir) = app.path().app_config_dir() {
        let settings_path = config_dir.join("settings.json");
        if settings_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&settings_path) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                    let state = if parsed.get("meta").is_some() && parsed.get("state").is_some() {
                        parsed.get("state")
                    } else {
                        Some(&parsed)
                    };

                    if let Some(state_obj) = state.and_then(|s| s.as_object()) {
                        let settings_map = state_obj.get("state")
                            .and_then(|s| s.get("settings"))
                            .and_then(|s| s.as_object());

                        let target_map = if let Some(m) = settings_map {
                            Some(m)
                        } else {
                            Some(state_obj)
                        };

                        if let Some(m) = target_map {
                            if let Some(enabled_val) = m.get("connection.agentWsEnabled") {
                                if let Some(b) = enabled_val.as_bool() {
                                    enabled = b;
                                }
                            }
                            if let Some(port_val) = m.get("connection.agentWsPort") {
                                if let Some(p_str) = port_val.as_str() {
                                    if let Ok(p) = p_str.parse::<u16>() {
                                        port = p;
                                    }
                                } else if let Some(p_num) = port_val.as_u64() {
                                    port = p_num as u16;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    (enabled, port)
}

pub fn start_agent_server(app: AppHandle) {
    // Generate a secure token using UUID
    let expected_token = uuid::Uuid::new_v4().to_string();

    // Write token to local directory
    let token_path = std::path::PathBuf::from(r"C:\Users\fakba\.gemini\antigravity\agent_token.txt");
    if let Some(parent) = token_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Err(e) = std::fs::write(&token_path, &expected_token) {
        eprintln!("[AgentWS] Failed to write agent token to file: {:?}", e);
    } else {
        println!("[AgentWS] Wrote secure agent token to: {:?}", token_path);
    }

    let (initial_enabled, initial_port) = load_agent_settings(&app);

    let manager = Arc::new(Mutex::new(AgentServerManager {
        token: expected_token,
        current_port: initial_port,
        current_enabled: false,
        server_task: None,
    }));

    if initial_enabled {
        run_server(app.clone(), manager.clone(), initial_port);
    } else {
        println!("[AgentWS] WebSocket server disabled by default in settings.");
    }

    // Listen for settings change events from frontend
    let manager_clone = manager.clone();
    let app_clone = app.clone();
    app.listen("app:settings-change", move |event| {
        let payload_str = event.payload();
        let settings_obj = if let Ok(new_settings) = serde_json::from_str::<serde_json::Value>(payload_str) {
            if new_settings.is_string() {
                serde_json::from_str::<serde_json::Value>(new_settings.as_str().unwrap()).ok()
            } else {
                Some(new_settings)
            }
        } else {
            None
        };

        if let Some(state_obj) = settings_obj.and_then(|s| s.as_object().cloned()) {
            let mut enabled = false;
            let mut port = 18133;

            if let Some(enabled_val) = state_obj.get("connection.agentWsEnabled") {
                if let Some(b) = enabled_val.as_bool() {
                    enabled = b;
                }
            }
            if let Some(port_val) = state_obj.get("connection.agentWsPort") {
                if let Some(p_str) = port_val.as_str() {
                    if let Ok(p) = p_str.parse::<u16>() {
                        port = p;
                    }
                } else if let Some(p_num) = port_val.as_u64() {
                    port = p_num as u16;
                }
            }

            let mut mgr = manager_clone.lock().unwrap();
            if mgr.current_enabled != enabled || mgr.current_port != port {
                println!(
                    "[AgentWS] Settings changed. Enabled: {}, Port: {}. Updating server state...",
                    enabled, port
                );
                
                // Stop current server if running
                if let Some(task) = mgr.server_task.take() {
                    task.abort();
                }
                mgr.current_enabled = enabled;
                mgr.current_port = port;

                // Start new server if enabled
                if enabled {
                    run_server(app_clone.clone(), manager_clone.clone(), port);
                } else {
                    println!("[AgentWS] WebSocket server stopped.");
                }
            }
        }
    });
}

fn run_server(app: AppHandle, manager: Arc<Mutex<AgentServerManager>>, port: u16) {
    let token = {
        let mgr = manager.lock().unwrap();
        mgr.token.clone()
    };

    let app_handle_for_task = app.clone();
    let token_for_task = token.clone();

    let task = tauri::async_runtime::spawn(async move {
        let addr = format!("127.0.0.1:{}", port);
        let listener = match TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                let err_msg = format!("Failed to bind to {}: {:?}", addr, e);
                eprintln!("[AgentWS] {}", err_msg);
                let _ = app_handle_for_task.emit("agent-ws-error", err_msg);
                return;
            }
        };
        println!("[AgentWS] WebSocket server listening on {}", addr);

        let token_arc = Arc::new(token_for_task);

        while let Ok((stream, _)) = listener.accept().await {
            let app_handle = app_handle_for_task.clone();
            let token = token_arc.clone();

            tokio::spawn(async move {
                // Token verification callback during handshake
                let mut is_token_valid = false;
                let callback = |req: &Request, response: Response| {
                    if let Some(query) = req.uri().query() {
                        for pair in query.split('&') {
                            let mut parts = pair.splitn(2, '=');
                            if let (Some("token"), Some(val)) = (parts.next(), parts.next()) {
                                if val == token.as_str() {
                                    is_token_valid = true;
                                    break;
                                }
                            }
                        }
                    }
                    if is_token_valid {
                        Ok(response)
                    } else {
                        let unauthorized_resp = Response::builder()
                            .status(tokio_tungstenite::tungstenite::http::StatusCode::UNAUTHORIZED)
                            .body(None)
                            .unwrap();
                        Err(unauthorized_resp)
                    }
                };

                let ws_stream = match accept_hdr_async(stream, callback).await {
                    Ok(ws) => ws,
                    Err(e) => {
                        eprintln!("[AgentWS] Handshake failed or rejected: {:?}", e);
                        return;
                    }
                };

                let (mut ws_sender, mut ws_receiver) = ws_stream.split();
                
                // MPSC channel to forward messages to WebSocket sender
                let (tx, mut rx) = tokio::sync::mpsc::channel::<Message>(32);

                tokio::spawn(async move {
                    while let Some(msg) = rx.recv().await {
                        if ws_sender.send(msg).await.is_err() {
                            break;
                        }
                    }
                });

                // Track active subscriptions to clean them up on disconnect
                let active_subscriptions = Arc::new(Mutex::new(HashMap::<String, tauri::EventId>::new()));

                while let Some(Ok(Message::Text(text))) = ws_receiver.next().await {
                    let req: AgentRequest = match serde_json::from_str(&text) {
                        Ok(r) => r,
                        Err(e) => {
                            let resp = AgentResponse {
                                status: "error".to_string(),
                                action: "unknown".to_string(),
                                sessions: None,
                                error: Some(format!("Invalid JSON: {:?}", e)),
                            };
                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                            continue;
                        }
                    };

                    match req.action.as_str() {
                        "list_sessions" => {
                            let ssh_state = app_handle.state::<SshState>();
                            let sessions_list = match ssh_state.sessions.lock() {
                                Ok(map) => {
                                    let list: Vec<SessionInfo> = map.iter().map(|(id, conn)| {
                                        SessionInfo {
                                            id: id.clone(),
                                            name: conn.config.name.clone().unwrap_or_default(),
                                            host: conn.config.host.clone(),
                                            user: conn.config.username.clone(),
                                        }
                                    }).collect();
                                    Some(list)
                                }
                                Err(_) => None,
                            };

                            let resp = if let Some(sessions) = sessions_list {
                                AgentResponse {
                                    status: "success".to_string(),
                                    action: "list_sessions".to_string(),
                                    sessions: Some(sessions),
                                    error: None,
                                }
                            } else {
                                AgentResponse {
                                    status: "error".to_string(),
                                    action: "list_sessions".to_string(),
                                    sessions: None,
                                    error: Some("Failed to lock SSH sessions map".to_string()),
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "list_servers" => {
                            let app_state = app_handle.state::<crate::state::AppState>();
                            let db_pool = &app_state.db;
                            let query_res = sqlx::query("SELECT id, name, ip, port, username FROM servers ORDER BY sort ASC")
                                .fetch_all(db_pool)
                                .await;

                            let resp = match query_res {
                                Ok(rows) => {
                                    let servers_list: Vec<AgentServerInfo> = rows.into_iter().map(|row| {
                                        AgentServerInfo {
                                            id: row.try_get("id").unwrap_or_default(),
                                            name: row.try_get("name").unwrap_or_default(),
                                            ip: row.try_get("ip").unwrap_or_default(),
                                            port: row.try_get("port").unwrap_or(22),
                                            username: row.try_get("username").unwrap_or_default(),
                                        }
                                    }).collect();
                                    AgentServerListResponse {
                                        status: "success".to_string(),
                                        action: "list_servers".to_string(),
                                        servers: Some(servers_list),
                                        error: None,
                                    }
                                }
                                Err(e) => {
                                    AgentServerListResponse {
                                        status: "error".to_string(),
                                        action: "list_servers".to_string(),
                                        servers: None,
                                        error: Some(format!("Database query failed: {:?}", e)),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "exec_command" => {
                            let (Some(session_id), Some(command)) = (req.session_id, req.data) else {
                                let resp = AgentCommandResponse {
                                    status: "error".to_string(),
                                    action: "exec_command".to_string(),
                                    output: None,
                                    error: Some("Missing session_id or data (command)".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let conn_opt = {
                                let map = ssh_state.sessions.lock().unwrap();
                                map.get(&session_id).cloned()
                            };

                            let resp = match conn_opt {
                                Some(conn) => {
                                    conn.touch_client_heartbeat();
                                    if let Some(bg_sess) = conn.bg_session_arc() {
                                        match crate::commands::monitor::exec_ssh_command(&bg_sess, &command).await {
                                            Ok(output) => {
                                                AgentCommandResponse {
                                                    status: "success".to_string(),
                                                    action: "exec_command".to_string(),
                                                    output: Some(output),
                                                    error: None,
                                                }
                                            }
                                            Err(e) => {
                                                AgentCommandResponse {
                                                    status: "error".to_string(),
                                                    action: "exec_command".to_string(),
                                                    output: None,
                                                    error: Some(format!("Failed to execute command: {}", e)),
                                                }
                                            }
                                        }
                                    } else {
                                        AgentCommandResponse {
                                            status: "error".to_string(),
                                            action: "exec_command".to_string(),
                                            output: None,
                                            error: Some("Background SSH session not ready or unavailable".to_string()),
                                        }
                                    }
                                }
                                None => {
                                    AgentCommandResponse {
                                        status: "error".to_string(),
                                        action: "exec_command".to_string(),
                                        output: None,
                                        error: Some("Session not found or not active".to_string()),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "disconnect" => {
                            let Some(session_id) = req.session_id else {
                                let resp = AgentResponse {
                                    status: "error".to_string(),
                                    action: "disconnect".to_string(),
                                    sessions: None,
                                    error: Some("Missing session_id".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let conn = crate::commands::ssh::remove_ssh_session(&ssh_state.sessions, &session_id);

                            let resp = match conn {
                                Some(conn) => {
                                    let _ = conn.shutdown("Agent WS disconnect");
                                    AgentResponse {
                                        status: "success".to_string(),
                                        action: "disconnect".to_string(),
                                        sessions: None,
                                        error: None,
                                    }
                                }
                                None => {
                                    AgentResponse {
                                        status: "error".to_string(),
                                        action: "disconnect".to_string(),
                                        sessions: None,
                                        error: Some("Session not found or not active".to_string()),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "sftp_list_dir" => {
                            let (Some(session_id), Some(path)) = (req.session_id, req.path) else {
                                let resp = AgentFileListResponse {
                                    status: "error".to_string(),
                                    action: "sftp_list_dir".to_string(),
                                    files: None,
                                    error: Some("Missing session_id or path".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let resp = match crate::commands::fs::list_ssh_files(ssh_state, session_id, path).await {
                                Ok(files) => {
                                    AgentFileListResponse {
                                        status: "success".to_string(),
                                        action: "sftp_list_dir".to_string(),
                                        files: Some(files),
                                        error: None,
                                    }
                                }
                                Err(e) => {
                                    AgentFileListResponse {
                                        status: "error".to_string(),
                                        action: "sftp_list_dir".to_string(),
                                        files: None,
                                        error: Some(e),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "sftp_read_file" => {
                            let (Some(session_id), Some(path)) = (req.session_id, req.path) else {
                                let resp = AgentCommandResponse {
                                    status: "error".to_string(),
                                    action: "sftp_read_file".to_string(),
                                    output: None,
                                    error: Some("Missing session_id or path".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let resp = match crate::commands::fs::sftp_read_file(ssh_state, session_id, path).await {
                                Ok(content) => {
                                    AgentCommandResponse {
                                        status: "success".to_string(),
                                        action: "sftp_read_file".to_string(),
                                        output: Some(content),
                                        error: None,
                                    }
                                }
                                Err(e) => {
                                    AgentCommandResponse {
                                        status: "error".to_string(),
                                        action: "sftp_read_file".to_string(),
                                        output: None,
                                        error: Some(e),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "sftp_write_file" => {
                            let (Some(session_id), Some(path), Some(content)) = (req.session_id, req.path, req.content) else {
                                let resp = AgentResponse {
                                    status: "error".to_string(),
                                    action: "sftp_write_file".to_string(),
                                    sessions: None,
                                    error: Some("Missing session_id, path, or content".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let resp = match crate::commands::fs::sftp_write_file(ssh_state, session_id, path, content).await {
                                Ok(_) => {
                                    AgentResponse {
                                        status: "success".to_string(),
                                        action: "sftp_write_file".to_string(),
                                        sessions: None,
                                        error: None,
                                    }
                                }
                                Err(e) => {
                                    AgentResponse {
                                        status: "error".to_string(),
                                        action: "sftp_write_file".to_string(),
                                        sessions: None,
                                        error: Some(e),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "get_vault_status" => {
                            let app_state = app_handle.state::<crate::state::AppState>();
                            let vault_state = app_handle.state::<VaultState>();
                            
                            let resp = match crate::commands::vault::get_vault_status(app_state, vault_state).await {
                                Ok(status) => {
                                    AgentVaultStatusResponse {
                                        status: "success".to_string(),
                                        action: "get_vault_status".to_string(),
                                        is_initialized: status.is_initialized,
                                        is_locked: status.is_locked,
                                        error: None,
                                    }
                                }
                                Err(e) => {
                                    AgentVaultStatusResponse {
                                        status: "error".to_string(),
                                        action: "get_vault_status".to_string(),
                                        is_initialized: false,
                                        is_locked: true,
                                        error: Some(e),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "unlock_vault" => {
                            let Some(password) = req.data else {
                                let resp = AgentResponse {
                                    status: "error".to_string(),
                                    action: "unlock_vault".to_string(),
                                    sessions: None,
                                    error: Some("Missing master password in 'data' field".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let app_state = app_handle.state::<crate::state::AppState>();
                            let vault_state = app_handle.state::<VaultState>();

                            let resp = match crate::commands::vault::unlock_vault(app_state, vault_state, password).await {
                                Ok(success) => {
                                    if success {
                                        AgentResponse {
                                            status: "success".to_string(),
                                            action: "unlock_vault".to_string(),
                                            sessions: None,
                                            error: None,
                                        }
                                    } else {
                                        AgentResponse {
                                            status: "error".to_string(),
                                            action: "unlock_vault".to_string(),
                                            sessions: None,
                                            error: Some("Invalid master password".to_string()),
                                        }
                                    }
                                }
                                Err(e) => {
                                    AgentResponse {
                                        status: "error".to_string(),
                                        action: "unlock_vault".to_string(),
                                        sessions: None,
                                        error: Some(e),
                                    }
                                }
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "connect" => {
                            let server_id_opt = req.server_id;
                            let server_name_opt = req.server_name;

                            // Resolve server_id if only server_name is provided
                            let mut target_server_id = server_id_opt;
                            if target_server_id.is_none() {
                                if let Some(ref name) = server_name_opt {
                                    let app_state = app_handle.state::<crate::state::AppState>();
                                    let db_pool = &app_state.db;
                                    let query_res = sqlx::query("SELECT id FROM servers WHERE name = ?")
                                        .bind(name)
                                        .fetch_optional(db_pool)
                                        .await;
                                    if let Ok(Some(row)) = query_res {
                                        target_server_id = Some(row.get::<String, _>("id"));
                                    }
                                }
                            }

                            let Some(server_id) = target_server_id else {
                                let resp = AgentConnectResponse {
                                    status: "error".to_string(),
                                    action: "connect".to_string(),
                                    session_id: None,
                                    error: Some("Server not found or invalid server_id/server_name".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            // Generate new unique session_id
                            let session_id = uuid::Uuid::new_v4().to_string();
                            
                            // Call connect_ssh in background
                            let app_handle_clone = app_handle.clone();
                            let session_id_clone = session_id.clone();
                            let tx_clone = tx.clone();

                             tauri::async_runtime::spawn(async move {
                                 let app_for_connect = app_handle_clone.clone();
                                 let ssh_state = app_handle_clone.state::<SshState>();
                                 let app_state = app_handle_clone.state::<crate::state::AppState>();
                                 let vault_state = app_handle_clone.state::<VaultState>();

                                 match crate::commands::ssh::connect_ssh(
                                     app_for_connect,
                                     ssh_state,
                                     app_state,
                                     vault_state,
                                     server_id,
                                     session_id_clone.clone(),
                                 ).await {
                                    Ok(_) => {
                                        let resp = AgentConnectResponse {
                                            status: "success".to_string(),
                                            action: "connect".to_string(),
                                            session_id: Some(session_id_clone),
                                            error: None,
                                        };
                                        if let Ok(resp_text) = serde_json::to_string(&resp) {
                                            let _ = tx_clone.send(Message::Text(resp_text)).await;
                                        }
                                    }
                                    Err(e) => {
                                        let resp = AgentConnectResponse {
                                            status: "error".to_string(),
                                            action: "connect".to_string(),
                                            session_id: None,
                                            error: Some(e),
                                        };
                                        if let Ok(resp_text) = serde_json::to_string(&resp) {
                                            let _ = tx_clone.send(Message::Text(resp_text)).await;
                                        }
                                    }
                                }
                            });
                        }
                        "get_terminal_content" => {
                            let Some(session_id) = req.session_id else {
                                let resp = AgentTerminalContentResponse {
                                    status: "error".to_string(),
                                    action: "get_terminal_content".to_string(),
                                    session_id: String::new(),
                                    content: None,
                                    error: Some("Missing session_id".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let content_res = {
                                let map = ssh_state.sessions.lock().unwrap();
                                map.get(&session_id).map(|conn| {
                                    conn.output_history.lock().map(|h| h.clone()).unwrap_or_default()
                                })
                            };

                            let resp = match content_res {
                                Some(content) => AgentTerminalContentResponse {
                                    status: "success".to_string(),
                                    action: "get_terminal_content".to_string(),
                                    session_id: session_id.clone(),
                                    content: Some(content),
                                    error: None,
                                },
                                None => AgentTerminalContentResponse {
                                    status: "error".to_string(),
                                    action: "get_terminal_content".to_string(),
                                    session_id: session_id.clone(),
                                    content: None,
                                    error: Some("Session not found or not active".to_string()),
                                },
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "subscribe" => {
                            let Some(session_id) = req.session_id else {
                                let resp = AgentResponse {
                                    status: "error".to_string(),
                                    action: "subscribe".to_string(),
                                    sessions: None,
                                    error: Some("Missing session_id".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            // Check if already subscribed
                            let is_already_subscribed = {
                                let subs = active_subscriptions.lock().unwrap();
                                subs.contains_key(&session_id)
                            };

                            if is_already_subscribed {
                                let resp = AgentResponse {
                                    status: "success".to_string(),
                                    action: "subscribe".to_string(),
                                    sessions: None,
                                    error: None,
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            }

                            // Setup Tauri listener for term-data-<session_id>
                            let tx_clone = tx.clone();
                            let session_id_clone = session_id.clone();
                            let event_name = format!("term-data-{}", session_id);
                            
                            let event_id = app_handle.listen(&event_name, move |event| {
                                let data_str = event.payload().to_string();
                                // payload might have quotes around it due to tauri serialization, strip them if present
                                let clean_data = if data_str.starts_with('"') && data_str.ends_with('"') && data_str.len() >= 2 {
                                    data_str[1..data_str.len()-1].replace("\\r", "\r").replace("\\n", "\n")
                                } else {
                                    data_str
                                };

                                let stream_resp = StreamDataResponse {
                                    event: "data".to_string(),
                                    session_id: session_id_clone.clone(),
                                    data: clean_data,
                                };

                                if let Ok(resp_text) = serde_json::to_string(&stream_resp) {
                                    let _ = tx_clone.try_send(Message::Text(resp_text));
                                }
                            });

                            active_subscriptions.lock().unwrap().insert(session_id, event_id);

                            let resp = AgentResponse {
                                status: "success".to_string(),
                                action: "subscribe".to_string(),
                                sessions: None,
                                error: None,
                            };
                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "write" => {
                            let (Some(session_id), Some(data)) = (req.session_id, req.data) else {
                                let resp = AgentResponse {
                                    status: "error".to_string(),
                                    action: "write".to_string(),
                                    sessions: None,
                                    error: Some("Missing session_id or data".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let write_tx_res = {
                                let map = ssh_state.sessions.lock().unwrap();
                                map.get(&session_id).map(|conn| {
                                    if !conn.shell_is_active() {
                                        return Err("SSH shell not active".to_string());
                                    }
                                    conn.touch_client_heartbeat();
                                    Ok(conn.shell_write_tx.clone())
                                })
                            };

                            let resp = match write_tx_res {
                                Some(Ok(write_tx)) => {
                                    let (result_tx, result_rx) = tokio::sync::oneshot::channel();
                                    let request = SshWriteRequest { data, result_tx };
                                    if write_tx.send(request).await.is_ok() && result_rx.await.is_ok() {
                                        AgentResponse {
                                            status: "success".to_string(),
                                            action: "write".to_string(),
                                            sessions: None,
                                            error: None,
                                        }
                                    } else {
                                        AgentResponse {
                                            status: "error".to_string(),
                                            action: "write".to_string(),
                                            sessions: None,
                                            error: Some("Failed to write to SSH session channel".to_string()),
                                        }
                                    }
                                }
                                Some(Err(e)) => AgentResponse {
                                    status: "error".to_string(),
                                    action: "write".to_string(),
                                    sessions: None,
                                    error: Some(e),
                                },
                                None => AgentResponse {
                                    status: "error".to_string(),
                                    action: "write".to_string(),
                                    sessions: None,
                                    error: Some("Session not found or not active".to_string()),
                                },
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        "resize" => {
                            let (Some(session_id), Some(cols), Some(rows)) = (req.session_id, req.cols, req.rows) else {
                                let resp = AgentResponse {
                                    status: "error".to_string(),
                                    action: "resize".to_string(),
                                    sessions: None,
                                    error: Some("Missing session_id, cols, or rows".to_string()),
                                };
                                if let Ok(resp_text) = serde_json::to_string(&resp) {
                                    let _ = tx.send(Message::Text(resp_text)).await;
                                }
                                continue;
                            };

                            let ssh_state = app_handle.state::<SshState>();
                            let resize_tx_res = {
                                let map = ssh_state.sessions.lock().unwrap();
                                map.get(&session_id).map(|conn| {
                                    if !conn.shell_is_active() {
                                        return Err("SSH shell not active".to_string());
                                    }
                                    conn.touch_client_heartbeat();
                                    Ok(conn.shell_resize_tx.clone())
                                })
                            };

                            let resp = match resize_tx_res {
                                Some(Ok(resize_tx)) => {
                                    let (result_tx, result_rx) = tokio::sync::oneshot::channel();
                                    let request = SshResizeRequest { cols, rows, result_tx };
                                    if resize_tx.send(request).await.is_ok() && result_rx.await.is_ok() {
                                        AgentResponse {
                                            status: "success".to_string(),
                                            action: "resize".to_string(),
                                            sessions: None,
                                            error: None,
                                        }
                                    } else {
                                        AgentResponse {
                                            status: "error".to_string(),
                                            action: "resize".to_string(),
                                            sessions: None,
                                            error: Some("Failed to resize SSH session channel".to_string()),
                                        }
                                    }
                                }
                                Some(Err(e)) => AgentResponse {
                                    status: "error".to_string(),
                                    action: "resize".to_string(),
                                    sessions: None,
                                    error: Some(e),
                                },
                                None => AgentResponse {
                                    status: "error".to_string(),
                                    action: "resize".to_string(),
                                    sessions: None,
                                    error: Some("Session not found or not active".to_string()),
                                },
                            };

                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                        _ => {
                            let resp = AgentResponse {
                                status: "error".to_string(),
                                action: req.action,
                                sessions: None,
                                error: Some("Unknown action".to_string()),
                            };
                            if let Ok(resp_text) = serde_json::to_string(&resp) {
                                let _ = tx.send(Message::Text(resp_text)).await;
                            }
                        }
                    }
                }

                // Cleanup all subscriptions for this connection upon disconnect
                let subs = {
                    let mut lock = active_subscriptions.lock().unwrap();
                    std::mem::take(&mut *lock)
                };
                for (_, event_id) in subs {
                    app_handle.unlisten(event_id);
                }
                println!("[AgentWS] Connection closed, cleaned up subscriptions");
            });
        }
    });

    // Store task handle in manager
    let mut mgr = manager.lock().unwrap();
    mgr.server_task = Some(task);
    mgr.current_enabled = true;
}
