use std::io::{ErrorKind, Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use ssh2::{Channel, Session};
use tauri::{AppHandle, Emitter};

use crate::commands::ssh::state::{
    get_ssh_session_if_instance, SshConnection, SshWriteRequest, TerminalExitEvent,
    SSH_KEEPALIVE_FAILURE_THRESHOLD,
};
use crate::utils::ssh_log::{self, SshLogRecord};

use super::{SHELL_IDLE_SLEEP_MS, SHELL_KEEPALIVE_INTERVAL_SECS, SHELL_WRITE_BATCH_LIMIT};

fn maybe_send_shell_keepalive(
    session: &Session,
    id: &str,
    instance_id: u64,
    keepalive_failures: &mut u8,
    last_error: &mut Option<String>,
    last_keepalive_at: &mut Instant,
) -> Option<&'static str> {
    if last_keepalive_at.elapsed() < Duration::from_secs(SHELL_KEEPALIVE_INTERVAL_SECS) {
        return None;
    }

    *last_keepalive_at = Instant::now();

    if let Err(keepalive_err) = session.keepalive_send() {
        *keepalive_failures = keepalive_failures.saturating_add(1);
        let error_text = keepalive_err.to_string();
        ssh_log::warn(
            SshLogRecord::new(
                "ssh.shell",
                "reader_keepalive_failed",
                "Shell reader keepalive probe failed",
            )
            .session_id(id.to_string())
            .instance_id(instance_id)
            .field("attempt", *keepalive_failures)
            .field("threshold", SSH_KEEPALIVE_FAILURE_THRESHOLD)
            .field("error", error_text.clone()),
        );
        *last_error = Some(error_text);

        if *keepalive_failures >= SSH_KEEPALIVE_FAILURE_THRESHOLD {
            return Some("keepalive_failure_threshold_reached");
        }
    } else {
        if *keepalive_failures > 0 {
            ssh_log::debug(
                SshLogRecord::new(
                    "ssh.shell",
                    "reader_keepalive_recovered",
                    "Shell reader keepalive probe recovered",
                )
                .session_id(id.to_string())
                .instance_id(instance_id)
                .field("previous_failures", *keepalive_failures),
            );
        }
        *keepalive_failures = 0;
    }

    None
}

pub fn spawn_shell_writer_thread(
    channel: Arc<Mutex<Channel>>,
    sessions: Arc<Mutex<std::collections::HashMap<String, SshConnection>>>,
    id: String,
    instance_id: u64,
    mut write_rx: tokio::sync::mpsc::Receiver<SshWriteRequest>,
) {
    thread::spawn(move || {
        ssh_log::info(
            SshLogRecord::new(
                "ssh.shell",
                "writer_thread_started",
                "Started shell writer thread",
            )
            .session_id(id.clone())
            .instance_id(instance_id),
        );

        let mut total_bytes_written = 0u64;

        while let Some(first_request) = write_rx.blocking_recv() {
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
            let write_result = match get_ssh_session_if_instance(&sessions, &id, instance_id) {
                Some(conn) if conn.shell_is_active() => {
                    let mut chan_lock = match channel.lock() {
                        Ok(guard) => guard,
                        Err(poisoned) => poisoned.into_inner(),
                    };

                    chan_lock
                        .write_all(payload.as_bytes())
                        .and_then(|_| chan_lock.flush())
                        .map_err(|err| err.to_string())
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
                "writer_thread_exited",
                "Shell writer thread exited",
            )
            .session_id(id)
            .instance_id(instance_id)
            .field("bytes_written", total_bytes_written),
        );
    });
}

pub fn spawn_shell_reader_thread(
    app: AppHandle,
    session: Session,
    channel: Arc<Mutex<Channel>>,
    sessions: Arc<Mutex<std::collections::HashMap<String, SshConnection>>>,
    id: String,
    instance_id: u64,
) {
    thread::spawn(move || {
        ssh_log::info(
            SshLogRecord::new(
                "ssh.shell",
                "reader_thread_started",
                "Started shell reader thread",
            )
            .session_id(id.clone())
            .instance_id(instance_id),
        );

        let mut buf = [0u8; 8192];
        let mut keepalive_failures = 0u8;
        let mut total_bytes_read = 0u64;
        let mut last_error: Option<String> = None;
        let mut last_keepalive_at = Instant::now();

        let exit_reason = loop {
            let (read_result, is_eof) = {
                let mut chan_lock = match channel.lock() {
                    Ok(guard) => guard,
                    Err(poisoned) => poisoned.into_inner(),
                };

                session.set_blocking(false);
                let result = chan_lock.read(&mut buf);
                session.set_blocking(true);
                let is_eof = match &result {
                    Ok(0) => chan_lock.eof(),
                    Err(_) => chan_lock.eof(),
                    _ => false,
                };

                (result, is_eof)
            };

            match read_result {
                Ok(count) if count > 0 => {
                    if keepalive_failures > 0 {
                        ssh_log::debug(
                            SshLogRecord::new(
                                "ssh.shell",
                                "reader_keepalive_recovered",
                                "Shell reader observed data after keepalive failures",
                            )
                            .session_id(id.clone())
                            .instance_id(instance_id)
                            .field("previous_failures", keepalive_failures),
                        );
                        keepalive_failures = 0;
                    }
                    total_bytes_read = total_bytes_read.saturating_add(count as u64);
                    let data = String::from_utf8_lossy(&buf[..count]).to_string();
                    let _ = app.emit(&format!("term-data-{}", id), data);
                }
                Ok(_) => {
                    if is_eof {
                        break "channel_eof";
                    }

                    if let Some(reason) = maybe_send_shell_keepalive(
                        &session,
                        &id,
                        instance_id,
                        &mut keepalive_failures,
                        &mut last_error,
                        &mut last_keepalive_at,
                    ) {
                        break reason;
                    }

                    thread::sleep(Duration::from_millis(SHELL_IDLE_SLEEP_MS));
                    continue;
                }
                Err(err) if matches!(err.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock) => {
                    if is_eof {
                        break "channel_eof_after_timeout";
                    }

                    if let Some(reason) = maybe_send_shell_keepalive(
                        &session,
                        &id,
                        instance_id,
                        &mut keepalive_failures,
                        &mut last_error,
                        &mut last_keepalive_at,
                    ) {
                        break reason;
                    }

                    thread::sleep(Duration::from_millis(SHELL_IDLE_SLEEP_MS));
                    continue;
                }
                Err(err) => {
                    let error_text = err.to_string();

                    if is_eof {
                        last_error = Some(error_text);
                        break "channel_closed_after_read_error";
                    } else {
                        last_error = Some(error_text);
                        break "channel_read_error";
                    }
                }
            }
        };

        let exit_status = match channel.lock() {
            Ok(chan) => chan.exit_status().ok(),
            Err(poisoned) => poisoned.into_inner().exit_status().ok(),
        };

        let existing = get_ssh_session_if_instance(&sessions, &id, instance_id);
        if let Some(conn) = existing {
            let shell_marked_closed = conn.mark_shell_closed();
            let mut record = SshLogRecord::new(
                "ssh.shell",
                "reader_thread_exited",
                if shell_marked_closed {
                    "Shell reader thread exited; background session preserved"
                } else {
                    "Shell reader thread exited after shell was already marked inactive"
                },
            )
            .session_id(id.clone())
            .instance_id(instance_id)
            .field("reason", exit_reason)
            .field("bytes_read", total_bytes_read)
            .field("keepalive_failures", keepalive_failures)
            .field("session_active", true)
            .field("shell_marked_closed", shell_marked_closed);

            if let Some(status) = exit_status {
                record = record.field("exit_status", status);
            }
            if let Some(error_text) = last_error {
                record = record.field("error", error_text);
            }

            ssh_log::warn(record);
            let _ = app.emit(
                &format!("term-exit-{}", id),
                TerminalExitEvent {
                    session_active: true,
                    reason: exit_reason.to_string(),
                },
            );
        } else {
            ssh_log::debug(
                SshLogRecord::new(
                    "ssh.shell",
                    "reader_thread_stale_exit",
                    "Shell reader thread exited for a stale session instance",
                )
                .session_id(id)
                .instance_id(instance_id)
                .field("reason", exit_reason)
                .field("bytes_read", total_bytes_read),
            );
        }
    });
}
