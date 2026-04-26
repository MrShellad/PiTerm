use crate::models::{Snippet, SnippetDto};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_all_snippets(state: State<'_, AppState>) -> Result<Vec<SnippetDto>, String> {
    // 1. 从数据库查询所有记录 (Snippet 结构体)
    let rows = sqlx::query_as::<_, Snippet>("SELECT * FROM snippets ORDER BY created_at DESC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    // 2. 转换为 DTO (解析 tags JSON)
    let dtos = rows
        .into_iter()
        .map(|row| SnippetDto {
            id: row.id,
            title: row.title,
            code: row.code,
            language: row.language,
            tags: serde_json::from_str(&row.tags).unwrap_or_default(), // JSON String -> Vec
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
        .collect();

    Ok(dtos)
}

#[tauri::command]
pub async fn add_snippet(state: State<'_, AppState>, snippet: SnippetDto) -> Result<(), String> {
    // Vec -> JSON String
    let tags_json = serde_json::to_string(&snippet.tags).map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO snippets (id, title, code, language, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(snippet.id)
    .bind(snippet.title)
    .bind(snippet.code)
    .bind(snippet.language)
    .bind(tags_json)
    .bind(snippet.created_at)
    .bind(snippet.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn update_snippet(state: State<'_, AppState>, snippet: SnippetDto) -> Result<(), String> {
    let tags_json = serde_json::to_string(&snippet.tags).map_err(|e| e.to_string())?;

    sqlx::query("UPDATE snippets SET title=?, code=?, language=?, tags=?, updated_at=? WHERE id=?")
        .bind(snippet.title)
        .bind(snippet.code)
        .bind(snippet.language)
        .bind(tags_json)
        .bind(snippet.updated_at)
        .bind(snippet.id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_snippet(state: State<'_, AppState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM snippets WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
