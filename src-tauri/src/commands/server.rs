use crate::commands::vault::{internal_add_secret, internal_record_usage, VaultState}; // 🟢 引入 internal_record_usage
use crate::models::{AuthType, ConnectionType, OsType, ServerConfig};
use crate::state::AppState;
use chrono::Utc;
use sqlx::Row;
use tauri::{command, State};

// =========================================================
// 获取服务器列表
// =========================================================
#[command]
pub async fn list_servers(state: State<'_, AppState>) -> Result<Vec<ServerConfig>, String> {
    let pool = &state.db;

    // 1. 执行查询
    let rows = sqlx::query("SELECT * FROM servers ORDER BY sort ASC")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("数据库查询失败: {}", e))?;

    let mut servers = Vec::new();

    // 2. 手动映射
    for row in rows {
        let tags_str: String = row.try_get("tags").unwrap_or("[]".to_string());
        let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();

        servers.push(ServerConfig {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            icon: row.try_get("icon").unwrap_or_default(),
            provider: row.try_get("provider").unwrap_or_default(),
            sort: row.try_get("sort").unwrap_or_default(),
            ip: row.try_get("ip").unwrap_or_default(),
            port: row.try_get("port").unwrap_or_default(),
            tags,
            connection_type: row
                .try_get("connection_type")
                .unwrap_or(ConnectionType::Direct),
            proxy_id: row.try_get("proxy_id").ok(),
            auth_type: row.try_get("auth_type").unwrap_or(AuthType::Password),
            username: row.try_get("username").unwrap_or_default(),

            password: row.try_get("password").ok(),
            private_key: row.try_get("private_key").ok(),
            passphrase: row.try_get("passphrase").ok(),

            password_id: row.try_get("password_id").ok(),
            password_source: row.try_get("password_source").ok(),
            key_id: row.try_get("key_id").ok(),
            key_source: row.try_get("key_source").ok(),
            private_key_remark: row.try_get("private_key_remark").ok(),

            os: row.try_get("os").unwrap_or(OsType::Linux),
            is_pinned: row.try_get("is_pinned").unwrap_or(false),
            enable_expiration: row.try_get("enable_expiration").unwrap_or(false),
            expire_date: row.try_get("expire_date").ok(),

            created_at: row.try_get("created_at").unwrap_or(0),
            updated_at: row.try_get("updated_at").unwrap_or(0),
            last_connected_at: row.try_get("last_connected_at").ok(),

            connect_timeout: row.try_get("connect_timeout").ok(),
            keep_alive_interval: row.try_get("keep_alive_interval").ok(),
            auto_reconnect: row.try_get("auto_reconnect").ok(),
            max_reconnects: row.try_get("max_reconnects").ok(),
        });
    }

    Ok(servers)
}

// =========================================================
// 保存/更新服务器
// =========================================================
#[command]
pub async fn save_server(
    state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    mut server: ServerConfig,
) -> Result<(), String> {
    let pool = &state.db;

    // 1. 密码处理 (移入 Vault)
    if let Some(plain_password) = &server.password {
        if !plain_password.is_empty() {
            let master_key = {
                let guard = vault_state.0.lock().unwrap();
                guard.as_ref().cloned().ok_or("VAULT_LOCKED")?
            };

            let secret_name = format!("Server Pass: {}", server.name);

            let new_pass_id = internal_add_secret(
                pool,
                &master_key,
                &secret_name,
                "password",
                plain_password,
                Some(server.username.clone()),
                None,
            )
            .await?;

            server.password_id = Some(new_pass_id);
            server.password_source = Some("vault".to_string());
            server.password = None;
        }
    }

    // 2. 私钥处理 (移入 Vault)
    if let Some(plain_key) = &server.private_key {
        if !plain_key.is_empty() {
            let master_key = {
                let guard = vault_state.0.lock().unwrap();
                guard.as_ref().cloned().ok_or("VAULT_LOCKED")?
            };

            let secret_name = format!("Server Key: {}", server.name);

            let new_key_id = internal_add_secret(
                pool,
                &master_key,
                &secret_name,
                "private_key",
                plain_key,
                Some(server.username.clone()),
                None,
            )
            .await?;

            server.key_id = Some(new_key_id);
            server.key_source = Some("vault".to_string());
            server.private_key = None;
        }
    }

    // 时间戳逻辑
    let now = Utc::now().timestamp_millis();
    if server.created_at == 0 {
        server.created_at = now;
    }
    server.updated_at = now;

    // 3. 存入数据库
    let tags_json = serde_json::to_string(&server.tags).unwrap_or("[]".to_string());

    sqlx::query(
        r#"
        INSERT OR REPLACE INTO servers (
            id, name, icon, provider, sort, ip, port, tags, 
            connection_type, proxy_id, auth_type, username, 
            password, private_key, passphrase, 
            password_id, password_source, key_id, key_source, private_key_remark,
            os, is_pinned, enable_expiration, expire_date,
            created_at, updated_at, last_connected_at,
            connect_timeout, keep_alive_interval, auto_reconnect, max_reconnects
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?
        )
        "#,
    )
    .bind(server.id)
    .bind(server.name)
    .bind(server.icon)
    .bind(server.provider)
    .bind(server.sort)
    .bind(server.ip)
    .bind(server.port)
    .bind(tags_json)
    .bind(server.connection_type)
    .bind(server.proxy_id)
    .bind(server.auth_type)
    .bind(server.username)
    .bind(server.password)
    .bind(server.private_key)
    .bind(server.passphrase)
    .bind(server.password_id)
    .bind(server.password_source)
    .bind(server.key_id)
    .bind(server.key_source)
    .bind(server.private_key_remark)
    .bind(server.os)
    .bind(server.is_pinned)
    .bind(server.enable_expiration)
    .bind(server.expire_date)
    .bind(server.created_at)
    .bind(server.updated_at)
    .bind(server.last_connected_at)
    .bind(server.connect_timeout)
    .bind(server.keep_alive_interval)
    .bind(server.auto_reconnect)
    .bind(server.max_reconnects)
    .execute(pool)
    .await
    .map_err(|e| format!("保存服务器失败: {}", e))?;

    Ok(())
}

// =========================================================
// 删除服务器
// =========================================================
#[command]
pub async fn delete_server(state: State<'_, AppState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM servers WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| format!("删除失败: {}", e))?;

    Ok(())
}

// 🟢 [修改] 更新最后连接时间，并记录凭据使用情况
#[command]
pub async fn update_last_connected(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = &state.db;
    let now = Utc::now().timestamp_millis();

    // 1. 更新服务器自身的 last_connected_at
    sqlx::query("UPDATE servers SET last_connected_at = ? WHERE id = ?")
        .bind(now)
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    // 2. 查找该服务器使用的凭据，并记录使用情况
    let row = sqlx::query("SELECT password_id, key_id FROM servers WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(r) = row {
        let password_id: Option<String> = r.try_get("password_id").ok();
        let key_id: Option<String> = r.try_get("key_id").ok();

        // 记录密码使用
        if let Some(pid) = password_id {
            let _ = internal_record_usage(pool, &pid, &id).await;
        }

        // 记录密钥使用
        if let Some(kid) = key_id {
            let _ = internal_record_usage(pool, &kid, &id).await;
        }
    }

    Ok(())
}
