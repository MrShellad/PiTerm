use tauri::{AppHandle, Runtime};
use crate::models::backup::CommandResult;
use crate::services::backup::{webdav, credentials};

#[tauri::command]
pub async fn check_webdav<R: Runtime>(
    app: AppHandle<R>,
    url: String, 
    username: String, 
    password: Option<String> 
) -> CommandResult<String> {
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => credentials::load_password(&app).map_err(|_| "Password required".to_string())?
    };

    webdav::check_connection(&url, &username, &actual_password).await?;
    Ok("Connection successful".to_string())
}