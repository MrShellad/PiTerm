use std::collections::HashMap;
use std::time::Instant;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, State};
use sqlx::Row;
use async_trait::async_trait;
use russh::client;
use russh_keys::key::PublicKey;
use russh_keys::PublicKeyBase64;

use crate::state::AppState;
use crate::models::{ConnectionType, SshConfig};
use super::resolver;
use super::core::establish_tcp_stream;

use super::host_key::{self, HostKeyCheckStatus};
use super::state::{HostKeyVerificationCache, PendingHostKey};
use super::utils;

#[derive(serde::Serialize)]
pub struct HostKeyCheckResult {
    status: String,
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

#[derive(Clone)]
pub struct HostKeyCaptureHandler {
    key_tx: Arc<Mutex<Option<tokio::sync::oneshot::Sender<(PublicKey, String)>>>>,
}

#[async_trait]
impl client::Handler for HostKeyCaptureHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        let key_type = server_public_key.name().to_string();
        if let Ok(mut lock) = self.key_tx.lock() {
            if let Some(tx) = (*lock).take() {
                let tx: tokio::sync::oneshot::Sender<(PublicKey, String)> = tx;
                let _ = tx.send((server_public_key.clone(), key_type));
            }
        }
        Ok(true)
    }
}

#[tauri::command]
pub async fn check_host_key(
    app: AppHandle,
    verification_cache: State<'_, HostKeyVerificationCache>,
    app_state: State<'_, AppState>,
    id: String,
    host: String,
    port: u16,
) -> Result<HostKeyCheckResult, String> {
    utils::emit_ssh_log(
        &app,
        &format!("Checking host identity for {}:{}...", host, port),
    );

    let db_pool = &app_state.db;
    let row = sqlx::query("SELECT connection_type, proxy_id FROM servers WHERE id = ?")
        .bind(&id)
        .fetch_optional(db_pool)
        .await
        .map_err(|e| format!("Database query error: {}", e))?;

    let (connection_type, proxy) = if let Some(r) = row {
        let conn_type: ConnectionType = r.try_get("connection_type").unwrap_or(ConnectionType::Direct);
        let proxy_id: Option<String> = r.try_get("proxy_id").ok();
        let proxy = resolver::load_proxy_for_connection(db_pool, &conn_type, proxy_id.as_deref())
            .await
            .map_err(|e| format!("Proxy resolution error: {}", e))?;
        (conn_type, proxy)
    } else {
        (ConnectionType::Direct, None)
    };

    let config = SshConfig {
        id: id.clone(),
        host: host.clone(),
        port,
        username: "".to_string(),
        connection_type,
        proxy,
        password: None,
        private_key: None,
        passphrase: None,
        password_id: None,
        password_source: None,
        connect_timeout: Some(10),
        keep_alive_interval: None,
        auto_reconnect: None,
        max_reconnects: None,
    };

    utils::emit_ssh_log(&app, "Connecting to target host (TCP)...");
    let tcp = establish_tcp_stream(&config).map_err(|e| {
        let err = format!("Network unreachable: {}", e);
        utils::emit_ssh_log(&app, &err);
        err
    })?;

    utils::emit_ssh_log(&app, "Initiating SSH protocol handshake...");
    tcp.set_nonblocking(true)
        .map_err(|e| format!("Failed to set TCP nonblocking: {}", e))?;
    let async_stream = tokio::net::TcpStream::from_std(tcp)
        .map_err(|e| format!("Failed to convert TCP stream to tokio stream: {}", e))?;

    let client_config = Arc::new(client::Config::default());
    let (key_tx, key_rx) = tokio::sync::oneshot::channel();
    let handler = HostKeyCaptureHandler {
        key_tx: Arc::new(Mutex::new(Some(key_tx))),
    };

    let connect_future = client::connect_stream(client_config, async_stream, handler);

    let captured: Option<(PublicKey, String)> = tokio::select! {
        res = key_rx => {
            match res {
                Ok(key_data) => Some(key_data),
                Err(_) => None,
            }
        }
        res = connect_future => {
            if let Err(e) = res {
                let err = format!("SSH handshake failed: {}", e);
                utils::emit_ssh_log(&app, &err);
                return Err(err);
            }
            None
        }
    };

    let (server_public_key, key_type) = captured.ok_or_else(|| {
        let err = "No host key received from server".to_string();
        utils::emit_ssh_log(&app, &err);
        err
    })?;

    let host_key_bytes = server_public_key.public_key_bytes();

    let fingerprint = utils::compute_fingerprint(&host_key_bytes);
    utils::emit_ssh_log(&app, &format!("Server fingerprint: {}", fingerprint));

    utils::emit_ssh_log(&app, "Comparing with local known_hosts file...");
    let check_result = host_key::check_local_host_key(&app, &host, port, &key_type, &host_key_bytes)?;

    let status = match check_result {
        HostKeyCheckStatus::Match => {
            utils::emit_ssh_log(&app, "✅ Host verification successful.");
            "verified"
        }
        HostKeyCheckStatus::Mismatch => {
            utils::emit_ssh_log(&app, "⚠️ WARNING: HOST IDENTIFICATION HAS CHANGED!");
            "mismatch"
        }
        HostKeyCheckStatus::NotFound => {
            utils::emit_ssh_log(&app, "ℹ️ New host detected, awaiting user trust...");
            "unknown"
        }
    };

    let cache = verification_cache.entries.clone();
    let mut entries = cache.lock().unwrap();
    prune_pending_host_keys(&mut entries);

    if status == "verified" {
        entries.remove(&id);
    } else {
        entries.insert(
            id.clone(),
            PendingHostKey {
                host: host.clone(),
                port,
                key_type: key_type.clone(),
                fingerprint: fingerprint.clone(),
                host_key: host_key_bytes,
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

    let row = sqlx::query("SELECT ip, port FROM servers WHERE id = ?")
        .bind(&id)
        .fetch_optional(db_pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Server not found")?;

    let host: String = row.get("ip");
    let port: u16 = row.get::<i64, _>("port") as u16;

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
}
