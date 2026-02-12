// src-tauri/src/models/highlight.rs
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// 🟢 [修改] 添加 Clone
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)] 
#[serde(rename_all = "camelCase")]
pub struct HighlightRuleSet {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_default: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

// 🟢 [修改] 核心修复：必须添加 Clone，否则 .cloned() 会报错
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)] 
#[serde(rename_all = "camelCase")]
pub struct HighlightStyle {
    pub id: String,
    pub name: String,
    pub foreground: Option<String>,
    pub background: Option<String>,
    pub is_bold: bool,
    pub is_italic: bool,
    pub is_underline: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

// 🟢 [修改] 建议也加上 Clone
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HighlightRule {
    pub id: String,
    pub set_id: String,
    pub style_id: String,
    pub pattern: String,
    pub is_regex: bool,
    pub is_case_sensitive: bool,
    pub priority: i32,
    #[sqlx(skip)] 
    pub style: Option<HighlightStyle>, 
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRuleDto {
    pub set_id: String,
    pub style_id: String,
    pub pattern: String,
    pub is_regex: bool,
    pub is_case_sensitive: bool,
    pub priority: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveStyleDto {
    pub id: Option<String>, // 有 ID 为更新，无 ID 为创建
    pub name: String,
    pub foreground: Option<String>,
    pub background: Option<String>,
    pub is_bold: bool,
    pub is_italic: bool,
    pub is_underline: bool,
}