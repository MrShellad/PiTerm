// src-tauri/src/commands/highlight.rs
use tauri::{State, command};
use crate::state::AppState; // 🟢 引入你定义的 AppState
use crate::services::highlight::HighlightService;
use crate::models::highlight::{HighlightRuleSet, HighlightRule, HighlightStyle, CreateRuleDto,SaveStyleDto, HighlightAssignment};

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

#[command]
pub async fn update_highlight_set(id: String, name: String, description: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    HighlightService::update_set(&state.db, &id, name, description).await
}

#[command]
pub async fn delete_highlight_set(id: String, state: State<'_, AppState>) -> Result<(), String> {
    HighlightService::delete_set(&state.db, &id).await
}

#[command]
pub async fn reorder_highlight_rules(rule_ids: Vec<String>, state: State<'_, AppState>) -> Result<(), String> {
    HighlightService::reorder_rules(&state.db, rule_ids).await
}

#[tauri::command]
pub async fn toggle_highlight_rule(state: State<'_, AppState>, id: String, enabled: bool) -> Result<(), String> {
    HighlightService::toggle_rule_enabled(&state.db, &id, enabled).await
}

#[tauri::command]
pub async fn get_highlight_assignments(state: State<'_, AppState>) -> Result<Vec<HighlightAssignment>, String> {
    HighlightService::get_assignments(&state.db).await
}

#[tauri::command]
pub async fn assign_highlight_set(
    state: State<'_, AppState>, 
    target_id: String, 
    target_type: String, 
    set_id: String
) -> Result<(), String> {
    HighlightService::assign_set(&state.db, &target_id, &target_type, &set_id).await
}

#[tauri::command]
pub async fn unassign_highlight_set(state: State<'_, AppState>, target_id: String) -> Result<(), String> {
    HighlightService::unassign_set(&state.db, &target_id).await
}