use tauri::{AppHandle, Runtime};
use crate::models::backup::CommandResult;
use crate::services::backup::{webdav, credentials};

#[tauri::command]
pub async fn delete_cloud_backup<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    username: String,
    password: Option<String>,
    filename: String
) -> CommandResult<String> {
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => credentials::load_password(&app)?
    };
    webdav::delete_file(&url, &username, &actual_password, &filename).await?;
    Ok("Deleted successfully".to_string())
}