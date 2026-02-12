use tauri::{AppHandle, Runtime};
use crate::models::backup::{CommandResult, CloudBackupFile};
use crate::services::backup::{webdav, credentials};

#[tauri::command]
pub async fn get_backup_list<R: Runtime>(
    app: AppHandle<R>,
    url: String, 
    username: String, 
    password: Option<String>
) -> CommandResult<Vec<CloudBackupFile>> {
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => credentials::load_password(&app)?
    };
    webdav::list_files(&url, &username, &actual_password).await
}