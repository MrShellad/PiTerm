use std::sync::Arc;
use tauri::{AppHandle, Emitter};

use crate::commands::ssh::state::{
    get_ssh_session_if_instance, SshConnection, SshResizeRequest, SshWriteRequest,
    TerminalExitEvent,
};
use crate::utils::ssh_log::{self, SshLogRecord};

use super::SHELL_WRITE_BATCH_LIMIT;

pub fn spawn_shell_writer_thread<W>(
    mut write_half: W,
    sessions: Arc<std::sync::Mutex<std::collections::HashMap<String, SshConnection>>>,
    id: String,
    instance_id: u64,
    mut write_rx: tokio::sync::mpsc::Receiver<SshWriteRequest>,
) where
    W: tokio::io::AsyncWrite + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        ssh_log::info(
            SshLogRecord::new(
                "ssh.shell",
                "writer_task_started",
                "Started shell writer async task",
            )
            .session_id(id.clone())
            .instance_id(instance_id),
        );

        let mut total_bytes_written = 0u64;

        while let Some(first_request) = write_rx.recv().await {
            let mut payload = first_request.data;
            let mut responders = vec![first_request.result_tx];

            while payload.len() < SHELL_WRITE_BATCH_LIMIT {
                match write_rx.try_recv() {
                    Ok(request) => {
                        payload.push_str(&request.data);
                        responders.push(request.result_tx);
                    }
                    Err(tokio::sync::mpsc::error::TryRecvError::Empty) => break,
                    Err(tokio::sync::mpsc::error::TryRecvError::Disconnected) => break,
                }
            }

            let payload_len = payload.len();
            
            use tokio::io::AsyncWriteExt;
            let write_result: Result<(), String> = match get_ssh_session_if_instance(&sessions, &id, instance_id) {
                Some(conn) if conn.shell_is_active() => {
                    match write_half.write_all(payload.as_bytes()).await {
                        Ok(_) => match write_half.flush().await {
                            Ok(_) => Ok(()),
                            Err(err) => {
                                let err: std::io::Error = err;
                                Err(err.to_string())
                            }
                        },
                        Err(err) => {
                            let err: std::io::Error = err;
                            Err(err.to_string())
                        }
                    }
                }
                Some(_) => Err("SSH shell not active".to_string()),
                None => Err("SSH connection not active".to_string()),
            };

            if write_result.is_ok() {
                total_bytes_written = total_bytes_written.saturating_add(payload_len as u64);
            } else if let Err(err) = &write_result {
                ssh_log::warn(
                    SshLogRecord::new(
                        "ssh.shell",
                        "writer_write_failed",
                        "Failed to write queued payload to SSH shell channel",
                    )
                    .session_id(id.clone())
                    .instance_id(instance_id)
                    .field("payload_len", payload_len)
                    .field("error", err.clone()),
                );
            }

            for responder in responders {
                let _ = responder.send(write_result.clone());
            }
        }

        ssh_log::debug(
            SshLogRecord::new(
                "ssh.shell",
                "writer_task_exited",
                "Shell writer async task exited",
            )
            .session_id(id)
            .instance_id(instance_id)
            .field("bytes_written", total_bytes_written),
        );
    });
}

pub fn spawn_shell_reader_thread(
    app: AppHandle,
    mut shell_channel: russh::Channel<russh::client::Msg>,
    sessions: Arc<std::sync::Mutex<std::collections::HashMap<String, SshConnection>>>,
    id: String,
    instance_id: u64,
    mut resize_rx: tokio::sync::mpsc::Receiver<SshResizeRequest>,
) {
    tokio::spawn(async move {
        ssh_log::info(
            SshLogRecord::new(
                "ssh.shell",
                "reader_task_started",
                "Started shell reader async task",
            )
            .session_id(id.clone())
            .instance_id(instance_id),
        );

        let mut total_bytes_read = 0u64;
        let mut last_error: Option<String> = None;

        let exit_reason = loop {
            tokio::select! {
                channel_msg = shell_channel.wait() => {
                    match channel_msg {
                        Some(russh::ChannelMsg::Data { data }) => {
                            total_bytes_read = total_bytes_read.saturating_add(data.len() as u64);
                            let data_str = String::from_utf8_lossy(&data).to_string();
                            
                            // Save to terminal output history
                            if let Some(conn) = get_ssh_session_if_instance(&sessions, &id, instance_id) {
                                if let Ok(mut history) = conn.output_history.lock() {
                                    history.push_str(&data_str);
                                    if history.len() > 50000 {
                                        let overflow = history.len() - 50000;
                                        *history = history[overflow..].to_string();
                                    }
                                }
                            }
                            
                            let _ = app.emit(&format!("term-data-{}", id), data_str);
                        }
                        Some(russh::ChannelMsg::ExtendedData { data, .. }) => {
                            total_bytes_read = total_bytes_read.saturating_add(data.len() as u64);
                            let data_str = String::from_utf8_lossy(&data).to_string();
                            
                            // Save to terminal output history
                            if let Some(conn) = get_ssh_session_if_instance(&sessions, &id, instance_id) {
                                if let Ok(mut history) = conn.output_history.lock() {
                                    history.push_str(&data_str);
                                    if history.len() > 50000 {
                                        let overflow = history.len() - 50000;
                                        *history = history[overflow..].to_string();
                                    }
                                }
                            }
                            
                            let _ = app.emit(&format!("term-data-{}", id), data_str);
                        }
                        Some(russh::ChannelMsg::Eof) | Some(russh::ChannelMsg::Close) | None => {
                            break "channel_eof";
                        }
                        Some(_) => {}
                    }
                }
                resize_request = resize_rx.recv() => {
                    let Some(request) = resize_request else {
                        continue;
                    };
                    let result = match get_ssh_session_if_instance(&sessions, &id, instance_id) {
                        Some(conn) if conn.shell_is_active() => shell_channel
                            .window_change(request.cols, request.rows, 0, 0)
                            .await
                            .map_err(|e| format!("PTY resize failed: {}", e)),
                        Some(_) => Err("SSH shell not active".to_string()),
                        None => Err("SSH connection not active".to_string()),
                    };

                    if let Err(err) = &result {
                        last_error = Some(err.clone());
                        ssh_log::warn(
                            SshLogRecord::new(
                                "ssh.shell",
                                "resize_failed",
                                "Failed to resize SSH shell PTY",
                            )
                            .session_id(id.clone())
                            .instance_id(instance_id)
                            .field("rows", request.rows)
                            .field("cols", request.cols)
                            .field("error", err.clone()),
                        );
                    }

                    let _ = request.result_tx.send(result);
                }
            }
        };

        let existing = get_ssh_session_if_instance(&sessions, &id, instance_id);
        if let Some(conn) = existing {
            let shell_marked_closed = conn.mark_shell_closed();
            let mut record = SshLogRecord::new(
                "ssh.shell",
                "reader_task_exited",
                if shell_marked_closed {
                    "Shell reader task exited; background session preserved"
                } else {
                    "Shell reader task exited after shell was already marked inactive"
                },
            )
            .session_id(id.clone())
            .instance_id(instance_id)
            .field("reason", exit_reason)
            .field("bytes_read", total_bytes_read)
            .field("session_active", true)
            .field("shell_marked_closed", shell_marked_closed);

            if let Some(error_text) = last_error {
                record = record.field("error", error_text);
            }

            ssh_log::warn(record);

            let auto_reconnect = conn.config.auto_reconnect.unwrap_or(false);
            if auto_reconnect && (exit_reason == "channel_eof" || exit_reason == "channel_read_error") {
                crate::commands::ssh::session_commands::handle_auto_reconnect(
                    app.clone(),
                    sessions.clone(),
                    id.clone(),
                    instance_id,
                );
            } else {
                let _ = app.emit(
                    &format!("term-exit-{}", id),
                    TerminalExitEvent {
                        session_active: true,
                        reason: exit_reason.to_string(),
                    },
                );
            }
        } else {
            ssh_log::debug(
                SshLogRecord::new(
                    "ssh.shell",
                    "reader_task_stale_exit",
                    "Shell reader task exited for a stale session instance",
                )
                .session_id(id)
                .instance_id(instance_id)
                .field("reason", exit_reason)
                .field("bytes_read", total_bytes_read),
            );
        }
    });
}
