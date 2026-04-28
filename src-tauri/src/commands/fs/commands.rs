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
        let fields = vec![$($field),*];
        let session_arc = get_sftp_session_arc($ssh_state, &session_id)?;
        tauri::async_runtime::spawn_blocking(move || {
            ssh_log::run_timed_session_operation(
                session_arc,
                "ssh.sftp",
                $operation,
                &session_id,
                fields,
                move |sess| {
                    let $fs = SftpFileSystem::new(sess);
                    $block
                },
            )
        })
        .await
        .map_err(|e| e.to_string())??
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
        |fs| fs.read_dir(&path)
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
        |fs| fs.mkdir(&path)
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
        |fs| fs.create_file(&path)
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
        |fs| fs.rename(&old_path, &new_path)
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
        |fs| fs.delete(&path, is_dir)
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
        |fs| fs.copy(&from_path, &to_path)
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
        |fs| {
            if let Some(transfer_id) = progress_transfer_id.clone() {
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
                })
            } else {
                fs.download(&remote_path, &local_path)
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
        |fs| {
            if let Some(transfer_id) = progress_transfer_id.clone() {
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
                })
            } else {
                fs.upload(&local_path, &remote_path)
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
        |fs| fs.chmod(&path, &mode, recursive)
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
        |fs| fs.read_text(&path)
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
        |fs| fs.write_text(&path, &content)
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
        |fs| {
            match fs.read_dir(&path) {
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
    let res = run_sftp!(&ssh_state, id, "get_home_dir", [], |fs| fs.get_home_dir());
    Ok(res)
}
