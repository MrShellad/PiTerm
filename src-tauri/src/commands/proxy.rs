use crate::models::Proxy;
use crate::state::AppState;
use tauri::{command, State};

#[command]
pub async fn add_proxy(state: State<'_, AppState>, proxy: Proxy) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO proxies (id, name, proxy_type, host, port, username, password, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&proxy.id)
    .bind(&proxy.name)
    .bind(&proxy.proxy_type)
    .bind(&proxy.host)
    .bind(proxy.port)
    .bind(&proxy.username)
    .bind(&proxy.password)
    .bind(proxy.created_at)
    .bind(proxy.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn get_all_proxies(state: State<'_, AppState>) -> Result<Vec<Proxy>, String> {
    let proxies = sqlx::query_as::<_, Proxy>(
        "SELECT id, name, proxy_type, host, port, username, password, created_at, updated_at FROM proxies ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(proxies)
}

#[command]
pub async fn update_proxy(state: State<'_, AppState>, proxy: Proxy) -> Result<(), String> {
    sqlx::query(
        "UPDATE proxies SET 
            name = ?, proxy_type = ?, host = ?, port = ?, 
            username = ?, password = ?, updated_at = ? 
         WHERE id = ?",
    )
    .bind(&proxy.name)
    .bind(&proxy.proxy_type)
    .bind(&proxy.host)
    .bind(proxy.port)
    .bind(&proxy.username)
    .bind(&proxy.password)
    .bind(proxy.updated_at)
    .bind(&proxy.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn delete_proxy(state: State<'_, AppState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM proxies WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
