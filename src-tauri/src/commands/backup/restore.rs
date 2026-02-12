use std::fs::{self, File};
use std::io::{Cursor, Read};
use tauri::{AppHandle, Runtime, Emitter, State}; // 🟢 [引入 State]
use crate::models::backup::{CommandResult, ProgressPayload, RestorePreview, BackupMetadata};
use crate::services::backup::{archive, webdav, credentials};
// 🟢 [引入 AppState] 用于获取并关闭数据库连接
use crate::state::AppState; 

// 辅助函数：发送进度事件
fn emit<R: Runtime>(app: &AppHandle<R>, msg: &str, progress: f64) {
    let _ = app.emit("backup_progress", ProgressPayload { message: msg.to_string(), progress });
}

/// 第一步：下载并预处理 (显示下载进度条)
/// 下载文件 -> 保存临时文件 -> 读取元数据 -> 返回给前端预览
#[tauri::command]
pub async fn prepare_cloud_restore<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    username: String,
    password: Option<String>,
    filename: String
) -> CommandResult<RestorePreview> {
    
    emit(&app, "backup.progress.preparing", 5.0);

    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => credentials::load_password(&app)?
    };

    // 1. 下载文件 (WebDAV Service 会发送 20%~80% 的进度)
    let content = webdav::download_file(&app, &url, &username, &actual_password, &filename).await?;

    // 2. 保存到临时文件
    emit(&app, "backup.progress.analyzing", 90.0);
    let temp_dir = std::env::temp_dir();
    // 使用时间戳防止文件名冲突
    let temp_path = temp_dir.join(format!("restore_temp_{}.zip", chrono::Utc::now().timestamp()));
    fs::write(&temp_path, &content).map_err(|e| e.to_string())?;

    // 3. 尝试读取 zip 中的 backup_meta.json (不解压整个包)
    let mut metadata: Option<BackupMetadata> = None;
    let reader = Cursor::new(&content);
    if let Ok(mut archive) = zip::ZipArchive::new(reader) {
        if let Ok(mut meta_file) = archive.by_name("backup_meta.json") {
            let mut json_str = String::new();
            if meta_file.read_to_string(&mut json_str).is_ok() {
                if let Ok(m) = serde_json::from_str::<BackupMetadata>(&json_str) {
                    metadata = Some(m);
                }
            }
        }
    }

    emit(&app, "backup.progress.complete", 100.0);

    Ok(RestorePreview {
        // 返回临时文件的绝对路径给前端，前端在下一步传回来
        temp_file_path: temp_path.to_string_lossy().to_string(),
        metadata,
    })
}

/// 第二步：确认后应用 (解压覆盖)
/// 关闭数据库 -> 解压覆盖 -> 清理临时文件
#[tauri::command]
pub async fn apply_restore_file<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>, // 🟢 [注入 State]
    temp_file_path: String
) -> CommandResult<()> {
    
    emit(&app, "backup.progress.preparing", 10.0);
    
    // =========================================================================
    // 🟢 [关键修复] 强制关闭数据库连接池
    // =========================================================================
    // Windows 下，SQLite 的 WAL 模式会通过内存映射锁定 .db-shm 和 .db 文件。
    //如果不关闭连接，解压覆盖时会报 "os error 1224" (文件被占用)。
    state.db.close().await;

    // 稍微等待一下，确保操作系统释放文件句柄 (Windows 释放可能是异步的)
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    // =========================================================================

    let file = File::open(&temp_file_path).map_err(|e| format!("Temp file missing: {}", e))?;
    
    emit(&app, "backup.progress.extracting", 50.0);
    
    // 调用 Archive Service 解压 (现在可以安全覆盖数据库了)
    archive::unpack_zip_to_config(&app, file)?;

    // 清理临时文件
    let _ = fs::remove_file(temp_file_path);

    emit(&app, "backup.progress.complete", 100.0);
    
    // 注意：此时数据库连接已关闭，App 需要重启才能继续正常使用数据库功能
    Ok(())
}