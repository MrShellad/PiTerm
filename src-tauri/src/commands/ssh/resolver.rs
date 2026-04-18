use sqlx::{SqlitePool, Row};
use serde_json::Value;
use crate::models::{ConnectionType, Proxy, SshConfig, TestConnectionPayload};
use crate::commands::vault::internal_get_secret;
use super::utils::clean_private_key;
use aes_gcm::{Aes256Gcm, Key};

pub async fn load_proxy_for_connection(
    db_pool: &SqlitePool,
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

pub async fn resolve_config(
    db_pool: &SqlitePool,
    master_key: &Key<Aes256Gcm>,
    server_id: &str,
) -> Result<SshConfig, String> {
    let row = sqlx::query(
        "SELECT id, ip, port, username, connection_type, proxy_id, auth_type, password_id, key_id, passphrase, private_key, password, 
                connect_timeout, keep_alive_interval, auto_reconnect, max_reconnects 
         FROM servers WHERE id = ?"
    )
    .bind(server_id) 
    .fetch_optional(db_pool)
    .await
    .map_err(|e| format!("DB Query Error: {}", e))?
    .ok_or_else(|| format!("Server not found with ID: {}", server_id))?;

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

    if auth_type == "password" {
        let pwd_id: Option<String> = row.get("password_id");
        if let Some(pid) = pwd_id {
            let decrypted = internal_get_secret(db_pool, master_key, &pid).await?;
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
    else if auth_type == "key" || auth_type == "privateKey" {
        let k_id: Option<String> = row.get("key_id");
        if let Some(kid) = k_id {
            let decrypted = internal_get_secret(db_pool, master_key, &kid).await?;
            
            let raw_key = if let Ok(parsed) = serde_json::from_str::<Value>(&decrypted) {
                if let Some(val) = parsed.get("val").and_then(|v| v.as_str()) {
                    if let Some(pass) = parsed.get("pass").and_then(|v| v.as_str()) {
                          final_passphrase = Some(pass.to_string());
                    }
                    val.to_string()
                } else {
                    decrypted
                }
            } else {
                decrypted
            };

            final_private_key = Some(clean_private_key(&raw_key));

        } else {
            if let Some(pk) = row.get::<Option<String>, _>("private_key") {
                final_private_key = Some(clean_private_key(&pk));
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

    let proxy = load_proxy_for_connection(db_pool, &connection_type, proxy_id.as_deref()).await?;

    Ok(SshConfig {
        id: server_id.to_string(),
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
    })
}

pub async fn resolve_test_config(
    db_pool: &SqlitePool,
    master_key: Option<&Key<Aes256Gcm>>,
    payload: TestConnectionPayload
) -> Result<SshConfig, String> {
    let mut final_password: Option<String> = None;
    let mut final_private_key: Option<String> = None;
    let mut final_passphrase: Option<String> = payload.passphrase.clone();

    // --- 处理密码 ---
    if payload.auth_type == "password" {
        if payload.password_source.as_deref() == Some("store") {
            if let Some(pid) = payload.password_id {
                if let Some(mk) = master_key {
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
                if let Some(mk) = master_key {
                    let decrypted = internal_get_secret(db_pool, mk, &kid).await?;
                    let raw_key = if let Ok(parsed) = serde_json::from_str::<Value>(&decrypted) {
                        if let Some(val) = parsed.get("val").and_then(|v| v.as_str()) {
                            if let Some(pass) = parsed.get("pass").and_then(|v| v.as_str()) {
                                final_passphrase = Some(pass.to_string());
                            }
                            val.to_string()
                        } else {
                            decrypted
                        }
                    } else {
                        decrypted
                    };
                    final_private_key = Some(clean_private_key(&raw_key));
                }
            }
        } else {
            if let Some(pk) = payload.private_key {
               final_private_key = Some(clean_private_key(&pk));
            }
        }
    }

    let proxy = load_proxy_for_connection(
        db_pool,
        &payload.connection_type,
        payload.proxy_id.as_deref(),
    )
    .await?;

    Ok(SshConfig {
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
    })
}
