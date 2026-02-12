// src-tauri/src/commands/highlight.rs
use tauri::{State, command};
use crate::state::AppState; // 🟢 引入你定义的 AppState
use crate::services::highlight::HighlightService;
use crate::models::highlight::{HighlightRuleSet, HighlightRule, HighlightStyle, CreateRuleDto,SaveStyleDto};

#[command]
pub async fn get_highlight_sets(state: State<'_, AppState>) -> Result<Vec<HighlightRuleSet>, String> {
    // 🟢 通过 state.db 获取 Pool
    HighlightService::get_all_sets(&state.db).await
}

#[command]
pub async fn create_highlight_set(name: String, description: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    HighlightService::create_set(&state.db, name, description).await
}

#[command]
pub async fn get_all_highlight_styles(state: State<'_, AppState>) -> Result<Vec<HighlightStyle>, String> {
    HighlightService::get_all_styles(&state.db).await
}

#[command]
pub async fn get_rules_by_set_id(set_id: String, state: State<'_, AppState>) -> Result<Vec<HighlightRule>, String> {
    HighlightService::get_rules_by_set(&state.db, &set_id).await
}

#[command]
pub async fn save_highlight_rule(rule: CreateRuleDto, state: State<'_, AppState>) -> Result<String, String> {
    HighlightService::create_rule(&state.db, rule).await
}

#[command]
pub async fn delete_highlight_rule(id: String, state: State<'_, AppState>) -> Result<(), String> {
    HighlightService::delete_rule(&state.db, &id).await
}

#[command]
pub async fn save_highlight_style(style: SaveStyleDto, state: State<'_, AppState>) -> Result<String, String> {
    HighlightService::save_style(&state.db, style).await
}

#[command]
pub async fn delete_highlight_style(id: String, state: State<'_, AppState>) -> Result<(), String> {
    HighlightService::delete_style(&state.db, &id).await
}