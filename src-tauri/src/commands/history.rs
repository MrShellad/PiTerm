use crate::models::{CommandHistoryItem, HistoryFilterConfig};
use crate::state::AppState;
use serde::Serialize;
use sqlx::{FromRow, Row};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
// 辅助函数：判断是否应该记录
fn should_record(cmd: &str, config: &HistoryFilterConfig) -> bool {
    let trimmed = cmd.trim();
    if trimmed.is_empty() {
        return false;
    }

    // 1. 长度过滤 (现有逻辑)
    if config.ignore_short && trimmed.len() < config.min_length {
        return false;
    }

    // 2. 前导空格 (现有逻辑)
    if cmd.starts_with(' ') {
        return false;
    }

    // 3. 过滤纯数字 (例如误输入的验证码、ID 等)
    if trimmed.chars().all(|c| c.is_numeric()) {
        return false;
    }

    // 4. 增强型敏感词与密码模式过滤
    // 匹配如 --password=xxx, -p yyy, 或包含 token/secret 的赋值
    let lower = trimmed.to_lowercase();
    let sensitive_patterns = [
        "password",
        "passwd",
        "token",
        "secret",
        "key",
        "auth",
        "mysql_pwd",
        "access_key",
        "credential",
    ];

    for pattern in &sensitive_patterns {
        if lower.contains(pattern) {
            // 如果命令包含敏感词，且看起来像是在传参（包含 = 或 空格）
            if lower.contains('=') || lower.contains(' ') {
                return false;
            }
        }
    }

    // 5. 过滤无意义的“乱码”或键盘手抖 (Entropy/Pattern check)
    // 比如：只有符号没有字母，或者连续重复字符过多
    if is_nonsense(trimmed) {
        return false;
    }

    true
}

// 辅助函数：判断是否为无意义代码
fn is_nonsense(cmd: &str) -> bool {
    // A. 如果全是标点符号且没有字母/数字
    if !cmd.chars().any(|c| c.is_alphanumeric()) {
        return true;
    }

    // B. 过滤常见的误操作输入 (如连续的 asdf, jkl;)
    let junk_patterns = ["asdf", "qwer", "zxcv", "123456"];
    for junk in junk_patterns {
        if cmd.to_lowercase().contains(junk) {
            return true;
        }
    }

    // C. 过于简单的单字符（排除常用命令如 l, g 等）
    if cmd.len() == 1 && !["l", "g", "v"].contains(&cmd) {
        return true;
    }

    false
}

/// 记录一条命令 (核心事务逻辑)
#[tauri::command]
pub async fn record_command_history(
    state: State<'_, AppState>,
    server_id: String,
    command: String,
    source: Option<String>, // default 'user'
) -> Result<(), String> {
    let config = HistoryFilterConfig::default(); // 这里后期可以从 DB 读取配置

    if !should_record(&command, &config) {
        return Ok(());
    }

    let normalized = command.trim().to_string();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let source_str = source.unwrap_or_else(|| "user".to_string());

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // 1. 插入或更新 command_history (Global Dictionary)
    // 使用 ON CONFLICT 更新时间和全局计数
    let history_row = sqlx::query(
        r#"
        INSERT INTO command_history (normalized_command, display_command, created_at, last_used_at, global_exec_count)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(normalized_command) DO UPDATE SET
            last_used_at = excluded.last_used_at,
            global_exec_count = command_history.global_exec_count + 1
        RETURNING id
        "#
    )
    .bind(&normalized)
    .bind(&command)
    .bind(now)
    .bind(now)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let history_id: i64 = history_row.get(0);

    // 2. 插入或更新 command_usage (Per Server Stats)
    sqlx::query(
        r#"
        INSERT INTO command_usage (command_id, server_id, created_at, last_used_at, exec_count)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(command_id, server_id) DO UPDATE SET
            last_used_at = excluded.last_used_at,
            exec_count = command_usage.exec_count + 1
        "#,
    )
    .bind(history_id)
    .bind(&server_id)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // 3. 插入 command_events (Audit Log)
    sqlx::query(
        r#"
        INSERT INTO command_events (command_id, server_id, source, executed_at)
        VALUES (?, ?, ?, ?)
        "#,
    )
    .bind(history_id)
    .bind(&server_id)
    .bind(source_str)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

/// 补全搜索：根据输入前缀返回推荐列表
/// 策略：优先匹配前缀 -> 按全局热度排序 -> 按最近使用排序
#[tauri::command]
pub async fn search_history_autocomplete(
    state: State<'_, AppState>,
    query: String,
    limit: i64,
) -> Result<Vec<CommandHistoryItem>, String> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Ok(vec![]);
    }

    let results = sqlx::query_as::<_, CommandHistoryItem>(
        r#"
        SELECT id, normalized_command, display_command, global_exec_count, last_used_at
        FROM command_history 
        WHERE normalized_command LIKE ? || '%'
        ORDER BY global_exec_count DESC, last_used_at DESC
        LIMIT ?
        "#,
    )
    .bind(normalized_query)
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(results)
}

/// 获取某台服务器的高频命令 (用于上下文推荐)
#[tauri::command]
pub async fn get_server_top_commands(
    state: State<'_, AppState>,
    server_id: String,
    limit: i64,
) -> Result<Vec<String>, String> {
    let results = sqlx::query(
        r#"
        SELECT h.display_command 
        FROM command_usage u
        JOIN command_history h ON u.command_id = h.id
        WHERE u.server_id = ?
        ORDER BY u.exec_count DESC
        LIMIT ?
        "#,
    )
    .bind(server_id)
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let commands: Vec<String> = results.iter().map(|row| row.get(0)).collect();
    Ok(commands)
}

// =========================================================
// 新增：查询与删除逻辑
// =========================================================

// 定义返回给前端的数据结构 (DTO)
#[derive(Debug, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ServerHistoryDto {
    pub id: i64,         // 事件 ID (用于删除)
    pub command: String, // 实际命令内容
    pub created_at: i64, // 执行时间戳
}

/// 获取特定服务器的命令历史 (时间倒序)
#[tauri::command]
pub async fn get_command_history(
    state: State<'_, AppState>,
    server_id: String,
    limit: i64,
) -> Result<Vec<ServerHistoryDto>, String> {
    // 关联查询：从 events 表拿时间，从 history 表拿命令文本
    let results = sqlx::query_as::<_, ServerHistoryDto>(
        r#"
        SELECT 
            e.id as id, 
            h.display_command as command, 
            e.executed_at as created_at
        FROM command_events e
        JOIN command_history h ON e.command_id = h.id
        WHERE e.server_id = ?
        ORDER BY e.executed_at DESC
        LIMIT ?
        "#,
    )
    .bind(server_id)
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(results)
}

/// 删除单条历史记录
#[tauri::command]
pub async fn delete_command_history(
    state: State<'_, AppState>,
    id: i64, // 接收前端传来的 ID
) -> Result<(), String> {
    sqlx::query("DELETE FROM command_events WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
