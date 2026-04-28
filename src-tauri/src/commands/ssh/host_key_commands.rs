use std::collections::HashMap;
use std::net::TcpStream;
use std::time::Instant;

use ssh2::CheckResult;
use tauri::{AppHandle, State};

use crate::state::AppState;

use super::core::configure_legacy_algorithms;
use super::host_key;
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
