// src-tauri/src/services/highlight.rs
use sqlx::{Pool, Sqlite};
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::models::highlight::{HighlightRule, HighlightRuleSet, HighlightStyle, CreateRuleDto, SaveStyleDto};

pub struct HighlightService;

impl HighlightService {
    fn now() -> i64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64
    }

    // === Rule Sets (Profile) ===

    pub async fn get_all_sets(pool: &Pool<Sqlite>) -> Result<Vec<HighlightRuleSet>, String> {
        sqlx::query_as::<_, HighlightRuleSet>(
            "SELECT * FROM highlight_rule_sets ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())
    }

    pub async fn create_set(pool: &Pool<Sqlite>, name: String, desc: Option<String>) -> Result<String, String> {
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

    // === Styles ===

    pub async fn get_all_styles(pool: &Pool<Sqlite>) -> Result<Vec<HighlightStyle>, String> {
        sqlx::query_as::<_, HighlightStyle>(
            "SELECT * FROM highlight_styles ORDER BY name ASC"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())
    }

    pub async fn save_style(pool: &Pool<Sqlite>, dto: SaveStyleDto) -> Result<String, String> {
        let now = Self::now();
        
        if let Some(id) = dto.id {
            // Update
            sqlx::query(
                "UPDATE highlight_styles SET name=?, foreground=?, background=?, is_bold=?, is_italic=?, is_underline=?, updated_at=? WHERE id=?"
            )
            .bind(dto.name)
            .bind(dto.foreground)
            .bind(dto.background)
            .bind(dto.is_bold)
            .bind(dto.is_italic)
            .bind(dto.is_underline)
            .bind(now)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
            
            Ok(id)
        } else {
            // Create
            let id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO highlight_styles (id, name, foreground, background, is_bold, is_italic, is_underline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(dto.name)
            .bind(dto.foreground)
            .bind(dto.background)
            .bind(dto.is_bold)
            .bind(dto.is_italic)
            .bind(dto.is_underline)
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

    pub async fn get_rules_by_set(pool: &Pool<Sqlite>, set_id: &str) -> Result<Vec<HighlightRule>, String> {
        // 1. 获取所有规则
        let rules = sqlx::query_as::<_, HighlightRule>(
            "SELECT * FROM highlight_rules WHERE set_id = ? ORDER BY priority DESC, created_at ASC"
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
            "INSERT INTO highlight_rules (id, set_id, style_id, pattern, is_regex, is_case_sensitive, priority, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(dto.set_id)
        .bind(dto.style_id)
        .bind(dto.pattern)
        .bind(dto.is_regex)
        .bind(dto.is_case_sensitive)
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
}