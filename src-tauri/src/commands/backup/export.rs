// 🟢 [修复] 移除 {self}，只保留 File
use std::fs::File;
// 🟢 [修复] 移除 Manager，因为这个文件只负责调度，没用到 Manager 的方法
use crate::models::backup::{BackupMetadata, CommandResult, ProgressPayload};
use crate::services::backup::archive;
use chrono::Local;
use tauri::{AppHandle, Emitter, Runtime};

fn emit<R: Runtime>(app: &AppHandle<R>, msg: &str, progress: f64) {
    let _ = app.emit(
        "backup_progress",
        ProgressPayload {
            message: msg.to_string(),
            progress,
        },
    );
}

#[tauri::command]
pub async fn export_local_backup<R: Runtime>(
    app: AppHandle<R>,
    target_path: String,
) -> CommandResult<()> {
    emit(&app, "backup.progress.compressing", 20.0);

    let now = Local::now();
    let meta = BackupMetadata {
        version: "1.0.0".to_string(),
        device_id: "local_export".to_string(),
        device_name: "Local".to_string(),
        timestamp: now.timestamp_millis(),
        platform: std::env::consts::OS.to_string(),
    };

    let file = File::create(&target_path).map_err(|e| e.to_string())?;

    // 调用 Archive Service
    archive::pack_config_dir(&app, file, meta)?;

    emit(&app, "backup.progress.complete", 100.0);
    Ok(())
}
