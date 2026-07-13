use crate::commands::ssh::state::{SshState, SshWriteRequest, SshResizeRequest};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Listener, Emitter};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_hdr_async;
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use tokio_tungstenite::tungstenite::protocol::Message;

#[derive(Deserialize, Debug)]
struct AgentRequest {
    action: String,
    session_id: Option<String>,
    data: Option<String>,
    cols: Option<u32>,
    rows: Option<u32>,
}

#[derive(Serialize, Debug)]
struct SessionInfo {
    id: String,
    host: String,
    user: String,
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
