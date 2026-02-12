use std::fs::{self, File};
use tauri::{AppHandle, Runtime, Emitter};
use chrono::Local;
use regex::Regex;
use crate::models::backup::{CommandResult, BackupMetadata, ProgressPayload};
use crate::services::backup::{archive, webdav, credentials};

fn emit<R: Runtime>(app: &AppHandle<R>, msg: &str, progress: f64) {
    let _ = app.emit("backup_progress", ProgressPayload { message: msg.to_string(), progress });
}

#[tauri::command]
pub async fn create_cloud_backup<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    username: String,
    password: Option<String>,
    device_name: String,
    device_id: String
) -> CommandResult<String> {
    
    emit(&app, "backup.progress.preparing", 10.0);

    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => credentials::load_password(&app)?
    };

    // 1. 准备文件路径和元数据
    let now = Local::now();
    let re_sanitize = Regex::new(r"[^a-zA-Z0-9\-_]").unwrap();
    let safe_device_name = re_sanitize.replace_all(&device_name, "");
    let filename = format!("backup_{}_{}.zip", safe_device_name, now.format("%Y-%m-%d_%H%M%S"));
    
    let temp_dir = std::env::temp_dir();
    let zip_path = temp_dir.join(&filename);
    let file = File::create(&zip_path).map_err(|e| e.to_string())?;

    let meta = BackupMetadata {
        version: "1.0.0".to_string(),
        device_id,
        device_name,
        timestamp: now.timestamp_millis(),
        platform: std::env::consts::OS.to_string(),
    };

    // 2. 调用 Archive Service 打包
    emit(&app, "backup.progress.compressing", 30.0);
    archive::pack_config_dir(&app, file, meta)?;

    // 3. 调用 WebDAV Service 上传
    emit(&app, "backup.progress.uploading", 60.0);
    let file_content = fs::read(&zip_path).map_err(|e| e.to_string())?;
    
    let upload_result = webdav::upload_file(&app, &url, &username, &actual_password, &filename, file_content).await;
    
    // 清理临时文件
    let _ = fs::remove_file(zip_path);

    // 处理结果
    match upload_result {
        Ok(_) => {
            emit(&app, "backup.progress.complete", 100.0);
            Ok(format!("Backup uploaded: {}", filename))
        },
        Err(e) => Err(e)
    }
}