// src-tauri/src/services/highlight.rs
use crate::models::highlight::{
    CreateRuleDto, HighlightAssignment, HighlightRule, HighlightRuleSet, HighlightStyle,
    SaveStyleDto,
};
use sqlx::{Pool, Sqlite};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub struct HighlightService;

impl HighlightService {
    fn now() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64
    }

    // === Rule Sets (Profile) ===

    pub async fn get_all_sets(pool: &Pool<Sqlite>) -> Result<Vec<HighlightRuleSet>, String> {
        sqlx::query_as::<_, HighlightRuleSet>(
            "SELECT * FROM highlight_rule_sets ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())
    }

    pub async fn create_set(
        pool: &Pool<Sqlite>,
        name: String,
        desc: Option<String>,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let now = Self::now();

        sqlx::query(
            "INSERT INTO highlight_rule_sets (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(name)
        .bind(desc)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(id)
    }
    // 🟢 [新增] 重命名/更新 Profile
    pub async fn update_set(
        pool: &Pool<Sqlite>,
        id: &str,
        name: String,
        desc: Option<String>,
    ) -> Result<(), String> {
        let now = Self::now();
        sqlx::query(
            "UPDATE highlight_rule_sets SET name = ?, description = ?, updated_at = ? WHERE id = ?",
        )
        .bind(name)
        .bind(desc)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // 🟢 [新增] 删除 Profile (级联删除规则由数据库外键负责)
    pub async fn delete_set(pool: &Pool<Sqlite>, id: &str) -> Result<(), String> {
        // 防止删除默认项 (可选逻辑，根据需求决定是否保留)
        // let is_default: bool = sqlx::query_scalar("SELECT is_default FROM highlight_rule_sets WHERE id = ?")
        //    .bind(id).fetch_optional(pool).await.map_err(|e| e.to_string())?.unwrap_or(false);
        // if is_default { return Err("Cannot delete default profile".into()); }

        sqlx::query("DELETE FROM highlight_rule_sets WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    // === Styles ===

    pub async fn get_all_styles(pool: &Pool<Sqlite>) -> Result<Vec<HighlightStyle>, String> {
        sqlx::query_as::<_, HighlightStyle>("SELECT * FROM highlight_styles ORDER BY name ASC")
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn save_style(pool: &Pool<Sqlite>, dto: SaveStyleDto) -> Result<String, String> {
        let now = Self::now();

        if let Some(id) = dto.id {
            // Update: 移除 boolean 字段的更新
            sqlx::query(
                "UPDATE highlight_styles SET name=?, foreground=?, background=?, updated_at=? WHERE id=?"
            )
            .bind(dto.name)
            .bind(dto.foreground)
            .bind(dto.background)
            .bind(now)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

            Ok(id)
        } else {
            // Create: 移除 boolean 字段的插入 (数据库会自动填默认值 0)
            let id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO highlight_styles (id, name, foreground, background, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(dto.name)
            .bind(dto.foreground)
            .bind(dto.background)
            .bind(now)
            .bind(now)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

            Ok(id)
        }
    }

    // 🟢 [新增] 删除样式
    pub async fn delete_style(pool: &Pool<Sqlite>, id: &str) -> Result<(), String> {
        // 注意：如果样式被规则引用，SQL可能会报错 (取决于是否有外键约束)。
        // 这里的表定义有外键但没有级联删除，所以删除被引用的样式会失败，这是符合预期的保护机制。
        sqlx::query("DELETE FROM highlight_styles WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // === Rules (联表查询) ===

    pub async fn get_rules_by_set(
        pool: &Pool<Sqlite>,
        set_id: &str,
    ) -> Result<Vec<HighlightRule>, String> {
        // 1. 获取所有规则
        let rules = sqlx::query_as::<_, HighlightRule>(
            "SELECT * FROM highlight_rules WHERE set_id = ? ORDER BY priority DESC, created_at ASC",
        )
        .bind(set_id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        // 2. 获取所有样式 (缓存优化)
        let styles = Self::get_all_styles(pool).await?;

        // 3. 在内存中组装 (避免复杂的 SQL Join 映射逻辑)
        let mut result = Vec::new();
        for mut rule in rules {
            rule.style = styles.iter().find(|s| s.id == rule.style_id).cloned();
            result.push(rule);
        }

        Ok(result)
    }

    pub async fn create_rule(pool: &Pool<Sqlite>, dto: CreateRuleDto) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let now = Self::now();

        sqlx::query(
            "INSERT INTO highlight_rules (
            id, set_id, style_id, pattern, description, 
            is_regex, is_case_sensitive, is_enabled, -- 🟢 确保包含 is_enabled
            priority, created_at, updated_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(dto.set_id)
        .bind(dto.style_id)
        .bind(dto.pattern)
        .bind(dto.description)
        .bind(dto.is_regex)
        .bind(dto.is_case_sensitive)
        .bind(true) // 🟢 新规则默认启用
        .bind(dto.priority)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(id)
    }

    pub async fn delete_rule(pool: &Pool<Sqlite>, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM highlight_rules WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    //[新增] 批量重排序规则
    pub async fn reorder_rules(pool: &Pool<Sqlite>, rule_ids: Vec<String>) -> Result<(), String> {
        let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

        let total = rule_ids.len() as i32;

        // 遍历 ID 列表，索引越小（越靠前），优先级越高
        for (index, id) in rule_ids.iter().enumerate() {
            let priority = total - (index as i32);
            sqlx::query("UPDATE highlight_rules SET priority = ? WHERE id = ?")
                .bind(priority)
                .bind(id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }

        tx.commit().await.map_err(|e| e.to_string())?;
        Ok(())
    }
    pub async fn toggle_rule_enabled(
        pool: &Pool<Sqlite>,
        id: &str,
        enabled: bool,
    ) -> Result<(), String> {
        // 获取当前时间戳 (假设你有一个 Self::now() 辅助函数，如果没有直接用 chrono)
        let now = chrono::Utc::now().timestamp_millis();

        sqlx::query("UPDATE highlight_rules SET is_enabled = ?, updated_at = ? WHERE id = ?")
            .bind(enabled)
            .bind(now)
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    //[新增 1] 获取所有分配记录
    pub async fn get_assignments(
        pool: &sqlx::Pool<sqlx::Sqlite>,
    ) -> Result<Vec<HighlightAssignment>, String> {
        let assignments =
            sqlx::query_as::<_, HighlightAssignment>("SELECT * FROM highlight_assignments")
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?;

        Ok(assignments)
    }

    //[新增 2] 为目标分配规则集 (使用 INSERT OR REPLACE 确保一个 target 只有一条记录)
    pub async fn assign_set(
        pool: &sqlx::Pool<sqlx::Sqlite>,
        target_id: &str,
        target_type: &str,
        set_id: &str,
    ) -> Result<(), String> {
        let now = chrono::Utc::now().timestamp_millis();

        sqlx::query(
            "INSERT OR REPLACE INTO highlight_assignments (target_id, target_type, set_id, created_at) 
             VALUES (?, ?, ?, ?)"
        )
        .bind(target_id)
        .bind(target_type)
        .bind(set_id)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    //[新增 3] 取消目标的规则集分配
    pub async fn unassign_set(
        pool: &sqlx::Pool<sqlx::Sqlite>,
        target_id: &str,
    ) -> Result<(), String> {
        sqlx::query("DELETE FROM highlight_assignments WHERE target_id = ?")
            .bind(target_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
