use tauri::{AppHandle, Runtime};
use crate::models::backup::CommandResult;
use crate::services::backup::credentials;

#[tauri::command]
pub async fn save_webdav_password<R: Runtime>(app: AppHandle<R>, password: String) -> CommandResult<()> {
    credentials::save_password(&app, &password)?;
    Ok(())
}