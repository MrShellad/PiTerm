use super::filesystem::{FileEntry, FileSystem};
use super::session::get_sftp_session_arc;
use super::sftp_impl::SftpFileSystem;
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
use serde::Serialize;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Runtime, State};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SftpTransferProgressPayload {
    transfer_id: String,
    transferred: u64,
    total: u64,
    progress: f64,
    speed: u64,
}

fn emit_sftp_transfer_progress<R: Runtime>(
    app: &AppHandle<R>,
    transfer_id: &str,
    transferred: u64,
    total: u64,
    speed: u64,
) {
    let progress = if total > 0 {
        ((transferred as f64 / total as f64) * 100.0).clamp(0.0, 100.0)
    } else {
        100.0
    };

    let _ = app.emit(
        "sftp_transfer_progress",
        SftpTransferProgressPayload {
            transfer_id: transfer_id.to_string(),
            transferred,
            total,
            progress,
            speed,
        },
    );
}

macro_rules! run_sftp {
    ($ssh_state:expr, $id:expr, $operation:expr, [$($field:expr),* $(,)?], |$fs:ident| $block:expr) => {{
        let session_id = $id;
        let session_id_for_log = session_id.clone();
        let session_id_for_action = session_id.clone();
        let fields = vec![$($field),*];
        let conn = {
            let map = match $ssh_state.sessions.lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            map.get(&session_id).cloned().ok_or_else(|| "SSH connection not active".to_string())?
        };
        
        ssh_log::run_timed_session_operation_async(
            "ssh.sftp",
            $operation,
            &session_id_for_log,
            fields,
            || async move {
                let mut sftp_session = conn.get_sftp_session();
                let mut retry_allowed = true;
                let session_id = session_id_for_action;
                
                loop {
                    if sftp_session.is_none() {
                        let session_arc = get_sftp_session_arc($ssh_state, &session_id)?;
                        let channel = session_arc.channel_open_session().await
                            .map_err(|e| format!("Failed to open SFTP channel: {}", e))?;
                        channel.request_subsystem(true, "sftp").await
                            .map_err(|e| format!("Failed to request SFTP subsystem: {}", e))?;
                        
                        let new_sftp = russh_sftp::client::SftpSession::new(channel.into_stream()).await
                            .map_err(|e| format!("Failed to init SFTP session: {}", e))?;
                        
                        let new_sftp_arc = std::sync::Arc::new(new_sftp);
                        conn.set_sftp_session(new_sftp_arc.clone());
                        sftp_session = Some(new_sftp_arc);
                    }
                    
                    let active_sftp = sftp_session.as_ref().unwrap();
                    let $fs = SftpFileSystem::new(active_sftp);
                    
                    match $block.await {
                        Ok(res) => return Ok(res),
                        Err(err) => {
                            if retry_allowed {
                                conn.clear_sftp_session();
                                sftp_session = None;
                                retry_allowed = false;
                                ssh_log::warn(
                                    ssh_log::SshLogRecord::new(
                                        "ssh.sftp",
                                        "sftp_operation_retry",
                                        "SFTP operation failed; clearing cached session and retrying...",
                                    )
                                    .session_id(session_id.clone())
                                    .field("error", err.to_string()),
                                );
                                continue;
                            }
                            return Err(err);
                        }
                    }
                }
            }
        ).await.map_err(|e| e.to_string())?
    }};
}

#[tauri::command]
pub async fn list_ssh_files(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
) -> Result<Vec<FileEntry>, String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "list_dir",
        [ssh_log::log_field("remote_path", path.clone())],
        |fs| async { fs.read_dir(&path).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_mkdir(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
) -> Result<(), String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "mkdir",
        [ssh_log::log_field("remote_path", path.clone())],
        |fs| async { fs.mkdir(&path).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_create_file(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
) -> Result<(), String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "create_file",
        [ssh_log::log_field("remote_path", path.clone())],
        |fs| async { fs.create_file(&path).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_rename(
    ssh_state: State<'_, SshState>,
    id: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "rename",
        [
            ssh_log::log_field("old_path", old_path.clone()),
            ssh_log::log_field("new_path", new_path.clone())
        ],
        |fs| async { fs.rename(&old_path, &new_path).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_delete(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
    is_dir: bool,
) -> Result<(), String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "delete",
        [
            ssh_log::log_field("remote_path", path.clone()),
            ssh_log::log_field("is_dir", is_dir)
        ],
        |fs| async { fs.delete(&path, is_dir).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_copy(
    ssh_state: State<'_, SshState>,
    id: String,
    from_path: String,
    to_path: String,
) -> Result<(), String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "copy",
        [
            ssh_log::log_field("from_path", from_path.clone()),
            ssh_log::log_field("to_path", to_path.clone())
        ],
        |fs| async { fs.copy(&from_path, &to_path).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_download_file<R: Runtime>(
    app: AppHandle<R>,
    ssh_state: State<'_, SshState>,
    id: String,
    remote_path: String,
    local_path: String,
    transfer_id: Option<String>,
) -> Result<(), String> {
    let progress_app = app.clone();
    let progress_transfer_id = transfer_id.clone();
    let res = run_sftp!(
        &ssh_state,
        id,
        "download_file",
        [
            ssh_log::log_field("remote_path", remote_path.clone()),
            ssh_log::log_field("local_path", local_path.clone())
        ],
        |fs| async {
            if let Some(transfer_id) = progress_transfer_id.clone() {
                let progress_app = progress_app.clone();
                let mut last_transferred = 0_u64;
                let mut last_tick = Instant::now();
                fs.download_with_progress(&remote_path, &local_path, move |transferred, total| {
                    let now = Instant::now();
                    let elapsed = now.duration_since(last_tick).as_secs_f64();
                    let speed = if elapsed > 0.0 {
                        (transferred.saturating_sub(last_transferred) as f64 / elapsed) as u64
                    } else {
                        0
                    };

                    last_transferred = transferred;
                    last_tick = now;
                    emit_sftp_transfer_progress(
                        &progress_app,
                        &transfer_id,
                        transferred,
                        total,
                        speed,
                    );
                }).await
            } else {
                fs.download(&remote_path, &local_path).await
            }
        }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_upload_file<R: Runtime>(
    app: AppHandle<R>,
    ssh_state: State<'_, SshState>,
    id: String,
    local_path: String,
    remote_path: String,
    transfer_id: Option<String>,
) -> Result<(), String> {
    let progress_app = app.clone();
    let progress_transfer_id = transfer_id.clone();
    let res = run_sftp!(
        &ssh_state,
        id,
        "upload_file",
        [
            ssh_log::log_field("local_path", local_path.clone()),
            ssh_log::log_field("remote_path", remote_path.clone())
        ],
        |fs| async {
            if let Some(transfer_id) = progress_transfer_id.clone() {
                let progress_app = progress_app.clone();
                let mut last_transferred = 0_u64;
                let mut last_tick = Instant::now();
                fs.upload_with_progress(&local_path, &remote_path, move |transferred, total| {
                    let now = Instant::now();
                    let elapsed = now.duration_since(last_tick).as_secs_f64();
                    let speed = if elapsed > 0.0 {
                        (transferred.saturating_sub(last_transferred) as f64 / elapsed) as u64
                    } else {
                        0
                    };

                    last_transferred = transferred;
                    last_tick = now;
                    emit_sftp_transfer_progress(
                        &progress_app,
                        &transfer_id,
                        transferred,
                        total,
                        speed,
                    );
                }).await
            } else {
                fs.upload(&local_path, &remote_path).await
            }
        }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_chmod(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
    mode: String,
    recursive: bool,
) -> Result<(), String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "chmod",
        [
            ssh_log::log_field("remote_path", path.clone()),
            ssh_log::log_field("mode", mode.clone()),
            ssh_log::log_field("recursive", recursive)
        ],
        |fs| async { fs.chmod(&path, &mode, recursive).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_read_file(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
) -> Result<String, String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "read_file",
        [ssh_log::log_field("remote_path", path.clone())],
        |fs| async { fs.read_text(&path).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_write_file(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
    content: String,
) -> Result<(), String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "write_file",
        [
            ssh_log::log_field("remote_path", path.clone()),
            ssh_log::log_field("content_len", content.len())
        ],
        |fs| async { fs.write_text(&path, &content).await }
    );
    Ok(res)
}

#[tauri::command]
pub async fn sftp_check_is_dir(
    ssh_state: State<'_, SshState>,
    id: String,
    path: String,
) -> Result<bool, String> {
    let res = run_sftp!(
        &ssh_state,
        id,
        "check_is_dir",
        [ssh_log::log_field("remote_path", path.clone())],
        |fs| async {
            match fs.read_dir(&path).await {
                Ok(_) => Ok::<bool, String>(true),
                Err(_) => Ok::<bool, String>(false),
            }
        }
    );

    Ok(res)
}

#[tauri::command]
pub async fn sftp_get_home_dir(
    ssh_state: State<'_, SshState>,
    id: String,
) -> Result<String, String> {
    let res = run_sftp!(&ssh_state, id, "get_home_dir", [], |fs| async { fs.get_home_dir().await });
    Ok(res)
}
