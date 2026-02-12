pub mod backup;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// =========================================================
// 枚举定义 (添加 sqlx::Type)
// =========================================================

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum OsType {
    Linux,
    Windows,
    MacOs,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "camelCase")]
#[serde(rename_all = "camelCase")]
pub enum AuthType {
    Password,
    PrivateKey,
    Agent, 
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "kebab-case")]
#[serde(rename_all = "kebab-case")]
pub enum ConnectionType {
    Direct,
    Proxy,
    Http,   
    Socks5, 
}

// =========================================================
// ServerConfig 主配置结构体 (用于 CRUD)
// =========================================================

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    pub id: String,
    pub name: String,

    #[serde(default = "default_icon")]
    pub icon: String,

    #[serde(default = "default_provider")]
    pub provider: String,

    #[serde(default)]
    pub sort: i32,

    pub ip: String,

    #[serde(default = "default_port")]
    pub port: u16,

    #[sqlx(skip)] 
    #[serde(default)]
    pub tags: Vec<String>,

    #[serde(default = "default_connection_type")]
    pub connection_type: ConnectionType,

    pub proxy_id: Option<String>,

    #[serde(default = "default_auth_type")]
    pub auth_type: AuthType,

    #[serde(default = "default_username")]
    pub username: String,

    pub password: Option<String>,
    pub private_key: Option<String>,
    pub passphrase: Option<String>,

    pub password_id: Option<String>,
    pub password_source: Option<String>,
    
    pub key_id: Option<String>,
    pub key_source: Option<String>,
    pub private_key_remark: Option<String>,

    #[serde(default = "default_os")]
    pub os: OsType,

    #[serde(default)]
    pub is_pinned: bool,

    #[serde(default)]
    pub enable_expiration: bool,

    pub expire_date: Option<String>,
    
    #[serde(default)]
    pub created_at: i64,

    #[serde(default)]
    pub updated_at: i64,

    pub last_connected_at: Option<i64>,

    // 🟢 [关键修复 1] ServerConfig 必须包含这些字段，才能从数据库读写
    pub connect_timeout: Option<u32>,
    pub keep_alive_interval: Option<u32>,
    pub auto_reconnect: Option<bool>,
    pub max_reconnects: Option<u32>,
}

// 默认值函数
fn default_icon() -> String { "server".to_string() }
fn default_provider() -> String { "Custom".to_string() }
fn default_port() -> u16 { 22 }
fn default_connection_type() -> ConnectionType { ConnectionType::Direct }
fn default_auth_type() -> AuthType { AuthType::Password }
fn default_username() -> String { "root".to_string() }
fn default_os() -> OsType { OsType::Linux }

// =========================================================
// SshConfig (SSH 连接配置核心)
// =========================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SshConfig {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    
    pub password: Option<String>, 
    pub private_key: Option<String>, 
    pub passphrase: Option<String>,
    
    pub password_id: Option<String>,
    pub password_source: Option<String>,

    // 🟢 [关键修复 2] 这里就是报错的根源！必须手动加上这 4 个字段
    pub connect_timeout: Option<u32>,
    pub keep_alive_interval: Option<u32>,
    pub auto_reconnect: Option<bool>,
    pub max_reconnects: Option<u32>,
}

// =========================================================
// 其他结构体 (Snippet, Proxy 等) 保持原样
// =========================================================

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Snippet {
    pub id: String,
    pub title: String,
    pub code: String,
    pub language: String,
    pub tags: String, 
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SnippetDto {
    pub id: String,
    pub title: String,
    pub code: String,
    pub language: String,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Proxy {
    pub id: String,
    pub name: String,
    
    #[sqlx(rename = "proxy_type")]
    pub proxy_type: String,
    
    pub host: String,
    pub port: u16,
    
    pub username: Option<String>,
    pub password: Option<String>,
    
    pub created_at: i64,
    pub updated_at: i64,
}

// ... existing code ...

// 🟢 [新增] 用于接收前端测试连接的 Payload
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestConnectionPayload {
    // 基础信息
    pub ip: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String, // "password" | "key" | "privateKey"

    // 密码相关
    pub password_source: Option<String>, // "manual" | "store"
    pub password_id: Option<String>,
    pub password: Option<String>,        // manual 模式下的明文

    // 密钥相关
    pub key_source: Option<String>,      // "manual" | "store"
    pub key_id: Option<String>,
    pub private_key: Option<String>,     // manual 模式下的明文
    pub passphrase: Option<String>,

    // 高级设置
    pub connect_timeout: Option<u32>,
    pub proxy_id: Option<String>,
}

// =========================================================
// Command History (命令历史记录)
// =========================================================

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CommandHistoryItem {
    pub id: i64,
    pub normalized_command: String,
    pub display_command: String,
    pub global_exec_count: i64,
    pub last_used_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CommandUsageItem {
    pub command: String,          // 从关联表查出来的 display_command
    pub exec_count: i64,
    pub last_used_at: i64,
}

// 敏感词过滤配置 (暂时硬编码结构，后续可存入数据库)
#[derive(Debug, Clone)]
pub struct HistoryFilterConfig {
    pub ignore_short: bool,
    pub min_length: usize,
    pub sensitive_keywords: Vec<String>,
}

impl Default for HistoryFilterConfig {
    fn default() -> Self {
        Self {
            ignore_short: true,
            min_length: 3,
            sensitive_keywords: vec![
                "password".to_string(), 
                "token".to_string(), 
                "secret".to_string(), 
                "export KEY=".to_string(),
                "private_key".to_string(),
                "Bearer ".to_string(),
            ],
        }
    }
}