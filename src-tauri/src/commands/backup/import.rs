use std::fs::File;
use tauri::{AppHandle, Runtime, Emitter};
use crate::models::backup::{CommandResult, ProgressPayload};
use crate::services::backup::archive;

fn emit<R: Runtime>(app: &AppHandle<R>, msg: &str, progress: f64) {
    let _ = app.emit("backup_progress", ProgressPayload { message: msg.to_string(), progress });
}

#[tauri::command]
pub async fn import_local_backup<R: Runtime>(app: AppHandle<R>, file_path: String) -> CommandResult<()> {
    emit(&app, "backup.progress.preparing", 20.0);
    
    let file = File::open(&file_path).map_err(|e| format!("Failed to open file: {}", e))?;
    
    emit(&app, "backup.progress.extracting", 50.0);
    
    // 调用 Archive Service
    archive::unpack_zip_to_config(&app, file)?;

    emit(&app, "backup.progress.complete", 100.0);
    Ok(())
}