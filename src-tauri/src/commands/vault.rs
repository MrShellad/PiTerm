use crate::state::AppState;
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Utc;
use hmac::Hmac;
use pbkdf2::pbkdf2;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, Pool, Row, Sqlite}; // 🟢 确保引入 FromRow
use std::sync::Mutex;
use tauri::{command, State};

// --- 常量 ---
const AUTH_CHECK_TEXT: &[u8] = b"VALID_PASSWORD_CHECK";

// --- 状态定义 ---

pub struct VaultState(pub Mutex<Option<Key<Aes256Gcm>>>);

#[derive(Serialize)]
pub struct VaultStatus {
    pub is_initialized: bool,
    pub is_locked: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EncryptedData {
    pub iv: String,
    pub data: String,
    pub salt: String,
}

// 🟢 [新增] 对应前端 KeyEntry 中的 lastUsed 对象
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LastUsedInfo {
    pub server_name: String,
    pub server_ip: String,
    pub timestamp: i64,
}

// 🟢 [修改] 增加 last_used 字段
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct KeyEntry {
    pub id: String,
    pub name: String,

    #[serde(rename = "type")]
    pub key_type: String,

    pub username: Option<String>,

    #[serde(rename = "content")]
    pub encrypted_content: String,

    pub salt: String,

    pub algorithm: Option<String>,

    #[serde(rename = "createdAt")]
    pub created_at: i64,

    #[serde(rename = "updatedAt")]
    pub updated_at: i64,

    // 🟢 新增字段
    #[serde(rename = "lastUsed")]
    pub last_used: Option<LastUsedInfo>,
}

// 🟢 [新增] 临时结构体：用于接收 SQL 联表查询的扁平结果
#[derive(FromRow)]
struct KeyEntryRow {
    id: String,
    name: String,
    key_type: String,
    username: Option<String>,
    encrypted_content: String,
    salt: String,
    algorithm: Option<String>,
    created_at: i64,
    updated_at: i64,
    // 下面是联表查询出来的字段 (可能为空)
    last_used_at: Option<i64>,
    server_name: Option<String>,
    server_ip: Option<String>,
}

// 🟢 [新增] 关联服务器信息 (用于删除前检查)
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct KeyAssociation {
    pub server_id: String,
    pub server_name: String,
    pub last_used_at: Option<i64>,
}

// 🟢 [新增] 密钥使用统计
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyUsageStats {
    pub key_id: String,
    pub total_count: i32,
    pub associated_servers: Vec<KeyAssociation>,
}

// =========================================================
// 调试辅助函数
// =========================================================
fn get_key_fingerprint(key: &Key<Aes256Gcm>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key);
    let result = hasher.finalize();
    format!("{:x}", result)[..8].to_string()
}

// =========================================================
// 核心工具函数 (加密/解密)
// =========================================================

fn derive_key(password: &str, salt: &[u8]) -> Key<Aes256Gcm> {
    let mut key = [0u8; 32];
    let _ = pbkdf2::<Hmac<Sha256>>(password.as_bytes(), salt, 100_000, &mut key);
    *Key::<Aes256Gcm>::from_slice(&key)
}

fn encrypt_data(key: &Key<Aes256Gcm>, plaintext: &[u8]) -> Result<String, String> {
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let cipher = Aes256Gcm::new(key);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let json = serde_json::to_string(&EncryptedData {
        iv: BASE64.encode(nonce),
        data: BASE64.encode(ciphertext),
        salt: "".to_string(),
    })
    .map_err(|e| e.to_string())?;

    Ok(json)
}

fn decrypt_data(key: &Key<Aes256Gcm>, json_str: &str) -> Result<Vec<u8>, String> {
    let enc_data: EncryptedData =
        serde_json::from_str(json_str).map_err(|e| format!("Invalid encrypted format: {}", e))?;

    let nonce_bytes = BASE64
        .decode(&enc_data.iv)
        .map_err(|_| "Invalid IV".to_string())?;
    let ciphertext_bytes = BASE64
        .decode(&enc_data.data)
        .map_err(|_| "Invalid Ciphertext".to_string())?;

    let nonce = Nonce::from_slice(&nonce_bytes);
    let cipher = Aes256Gcm::new(key);

    cipher
        .decrypt(nonce, ciphertext_bytes.as_ref())
        .map_err(|_| "Decryption failed".to_string())
}

// =========================================================
// 内部 API
// =========================================================

// 🟢 [新增] 记录密钥使用情况 (供 server.rs 调用)
pub async fn internal_record_usage(
    pool: &Pool<Sqlite>,
    key_id: &str,
    server_id: &str,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();

    // 使用 INSERT OR REPLACE 确保更新最后使用时间
    sqlx::query(
        "INSERT OR REPLACE INTO key_usages (key_id, server_id, last_used_at) VALUES (?, ?, ?)",
    )
    .bind(key_id)
    .bind(server_id)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to record key usage: {}", e))?;

    Ok(())
}

pub async fn internal_add_secret(
    pool: &Pool<Sqlite>,
    master_key: &Key<Aes256Gcm>,
    name: &str,
    key_type: &str,
    content: &str,
    username: Option<String>,
    algorithm: Option<String>,
) -> Result<String, String> {
    println!(
        "🔐 [Internal Add] Encrypting with Key Fingerprint: {}",
        get_key_fingerprint(master_key)
    );

    let encrypted_json = encrypt_data(master_key, content.as_bytes())?;
    let new_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();

    sqlx::query(
        "INSERT INTO vault_keys (id, name, key_type, username, encrypted_content, salt, algorithm, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&new_id)
    .bind(name)
    .bind(key_type)
    .bind(username)
    .bind(&encrypted_json)
    .bind("") 
    .bind(algorithm)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    println!("✅ [Internal Add] Secret saved with ID: {}", new_id);
    Ok(new_id)
}

pub async fn internal_get_secret(
    pool: &Pool<Sqlite>,
    master_key: &Key<Aes256Gcm>,
    id: &str,
) -> Result<String, String> {
    let row = sqlx::query("SELECT encrypted_content FROM vault_keys WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(r) => {
            let enc_json: String = r.get(0);
            let plaintext = decrypt_data(master_key, &enc_json)?;
            String::from_utf8(plaintext).map_err(|_| "Invalid UTF-8 content".to_string())
        }
        None => Err("Secret not found".to_string()),
    }
}

// =========================================================
// Tauri Commands
// =========================================================

#[command]
pub async fn check_key_associations(
    state: State<'_, AppState>,
    id: String,
) -> Result<KeyUsageStats, String> {
    let pool = &state.db;

    let associations = sqlx::query_as::<_, KeyAssociation>(
        r#"
        SELECT 
            s.id as server_id, 
            s.name as server_name,
            ku.last_used_at
        FROM servers s
        LEFT JOIN key_usages ku ON s.id = ku.server_id AND ku.key_id = ?
        WHERE s.password_id = ? OR s.key_id = ?
        ORDER BY ku.last_used_at DESC
        "#,
    )
    .bind(&id)
    .bind(&id)
    .bind(&id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(KeyUsageStats {
        key_id: id,
        total_count: associations.len() as i32,
        associated_servers: associations,
    })
}

#[command]
pub async fn get_vault_status(
    state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
) -> Result<VaultStatus, String> {
    let pool = &state.db;

    let initialized = sqlx::query("SELECT 1 FROM vault_config WHERE key = 'vault_salt'")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .is_some();

    let has_key = vault_state.0.lock().unwrap().is_some();

    Ok(VaultStatus {
        is_initialized: initialized,
        is_locked: initialized && !has_key,
    })
}

#[command]
pub async fn init_vault(
    state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    password: String,
) -> Result<(), String> {
    let pool = &state.db;

    let exists = sqlx::query("SELECT 1 FROM vault_config WHERE key = 'vault_salt'")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .is_some();

    if exists {
        return Err("Vault is already initialized".to_string());
    }

    let mut salt_bytes = [0u8; 16];
    OsRng.fill_bytes(&mut salt_bytes);
    let salt_str = BASE64.encode(salt_bytes);

    let key = derive_key(&password, &salt_bytes);
    let auth_check_json = encrypt_data(&key, AUTH_CHECK_TEXT)?;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO vault_config (key, value) VALUES (?, ?)")
        .bind("vault_salt")
        .bind(&salt_str)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO vault_config (key, value) VALUES (?, ?)")
        .bind("auth_check")
        .bind(&auth_check_json)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;

    *vault_state.0.lock().unwrap() = Some(key);
    Ok(())
}

#[command]
pub async fn unlock_vault(
    state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    password: String,
) -> Result<bool, String> {
    let pool = &state.db;

    let salt_row = sqlx::query("SELECT value FROM vault_config WHERE key = 'vault_salt'")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;
    let auth_row = sqlx::query("SELECT value FROM vault_config WHERE key = 'auth_check'")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if salt_row.is_none() || auth_row.is_none() {
        return Err("Vault not initialized".to_string());
    }

    let salt_str: String = salt_row.unwrap().get(0);
    let auth_check_str: String = auth_row.unwrap().get(0);

    let salt_bytes = BASE64
        .decode(salt_str)
        .map_err(|_| "Invalid Salt".to_string())?;
    let key = derive_key(&password, &salt_bytes);

    match decrypt_data(&key, &auth_check_str) {
        Ok(decrypted) if decrypted == AUTH_CHECK_TEXT => {
            *vault_state.0.lock().unwrap() = Some(key);
            Ok(true)
        }
        _ => Ok(false),
    }
}

#[command]
pub fn lock_vault(vault_state: State<'_, VaultState>) {
    *vault_state.0.lock().unwrap() = None;
}

#[command]
pub async fn add_key(
    state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    name: String,
    key_type: String,
    content: String,
    username: Option<String>,
    algorithm: Option<String>,
) -> Result<KeyEntry, String> {
    let master_key = {
        let guard = vault_state.0.lock().unwrap();
        guard.as_ref().cloned().ok_or("VAULT_LOCKED")?
    };

    let new_id = internal_add_secret(
        &state.db,
        &master_key,
        &name,
        &key_type,
        &content,
        username.clone(),
        algorithm.clone(),
    )
    .await?;

    let now = Utc::now().timestamp_millis();

    Ok(KeyEntry {
        id: new_id,
        name,
        key_type,
        username,
        encrypted_content: "".to_string(),
        salt: "".to_string(),
        algorithm,
        created_at: now,
        updated_at: now,
        last_used: None, // 新建的密钥没有使用记录
    })
}

#[command]
pub async fn delete_key(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = &state.db;

    // 1. 删除使用记录
    sqlx::query("DELETE FROM key_usages WHERE key_id = ?")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete key usage records: {}", e))?;

    // 2. 删除密钥本体
    sqlx::query("DELETE FROM vault_keys WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete key: {}", e))?;

    Ok(())
}

// 🟢 [核心修改] 关联查询使用记录
#[command]
pub async fn get_all_keys(state: State<'_, AppState>) -> Result<Vec<KeyEntry>, String> {
    let pool = &state.db;

    // 使用子查询获取每个密钥的“最新一条”使用记录
    let rows = sqlx::query_as::<_, KeyEntryRow>(
        r#"
        SELECT 
            vk.*,
            ku_latest.last_used_at,
            s.name as server_name,
            s.ip as server_ip
        FROM vault_keys vk
        LEFT JOIN (
            SELECT key_id, server_id, last_used_at
            FROM key_usages
            WHERE (key_id, last_used_at) IN (
                SELECT key_id, MAX(last_used_at)
                FROM key_usages
                GROUP BY key_id
            )
        ) ku_latest ON vk.id = ku_latest.key_id
        LEFT JOIN servers s ON ku_latest.server_id = s.id
        ORDER BY vk.created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    // 将 Row 转换为嵌套的 KeyEntry 结构
    let keys = rows
        .into_iter()
        .map(|row| {
            let last_used = if let (Some(ts), Some(name), Some(ip)) =
                (row.last_used_at, row.server_name, row.server_ip)
            {
                Some(LastUsedInfo {
                    timestamp: ts,
                    server_name: name,
                    server_ip: ip,
                })
            } else {
                None
            };

            KeyEntry {
                id: row.id,
                name: row.name,
                key_type: row.key_type,
                username: row.username,
                encrypted_content: row.encrypted_content,
                salt: row.salt,
                algorithm: row.algorithm,
                created_at: row.created_at,
                updated_at: row.updated_at,
                last_used, // 赋值
            }
        })
        .collect();

    Ok(keys)
}

#[command]
pub async fn get_decrypted_content(
    state: State<'_, AppState>,
    vault_state: State<'_, VaultState>,
    id: String,
) -> Result<String, String> {
    let pool = &state.db;
    let master_key = {
        let guard = vault_state.0.lock().unwrap();
        guard.as_ref().cloned().ok_or("VAULT_LOCKED")?
    };
    internal_get_secret(pool, &master_key, &id).await
}
