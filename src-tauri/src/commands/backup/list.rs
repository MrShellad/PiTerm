use crate::models::backup::{CloudBackupFile, CommandResult};
use crate::services::backup::{credentials, webdav};
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub async fn get_backup_list<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    username: String,
    password: Option<String>,
) -> CommandResult<Vec<CloudBackupFile>> {
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => credentials::load_password(&app)?,
    };
    webdav::list_files(&url, &username, &actual_password).await
}
