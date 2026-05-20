use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::models::SshConfig;
use crate::utils::ssh_log::{self, SshLogRecord};

use super::core;
use super::state::{get_ssh_session_if_instance, BackgroundSessionEvent, SshConnection};

const SSH_BACKGROUND_CONNECT_RETRY_DELAY: Duration = Duration::from_secs(3);
const SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS: u8 = 3;

fn emit_background_session_event(
    app: &AppHandle,
    session_id: &str,
    status: &str,
    reason: Option<String>,
) {
    let _ = app.emit(
        &format!("bg-session-{}", session_id),
        BackgroundSessionEvent {
            status: status.to_string(),
            reason,
        },
    );
}

pub(super) fn spawn_background_session_connector(
    app: AppHandle,
    sessions: Arc<Mutex<HashMap<String, SshConnection>>>,
    config: SshConfig,
    session_id: String,
    server_id: String,
    instance_id: u64,
) {
    tokio::spawn(async move {
        emit_background_session_event(&app, &session_id, "connecting", None);

        for attempt in 1..=SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS {
            let Some(conn) = get_ssh_session_if_instance(&sessions, &session_id, instance_id)
            else {
                ssh_log::debug(
                    SshLogRecord::new(
                        "ssh.command",
                        "background_session_connect_abandoned",
                        "Stopped background SSH session establishment because the parent session was replaced or removed",
                    )
                    .session_id(session_id.clone())
                    .server_id(server_id.clone())
                    .instance_id(instance_id)
                    .field("attempt", attempt)
                    .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS),
                );
                return;
            };
            conn.mark_bg_connecting();

            ssh_log::info(
                SshLogRecord::new(
                    "ssh.command",
                    "background_session_connect_started",
                    "Attempting to establish background SSH session",
                )
                .session_id(session_id.clone())
                .server_id(server_id.clone())
                .instance_id(instance_id)
                .field("attempt", attempt)
                .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS),
            );

            let base_sess_res: Result<crate::commands::ssh::state::SshSession, String> = core::establish_base_session(&config, Some(&session_id), "background").await;
            match base_sess_res {
                Ok(bg_session) => {
                    let Some(conn) =
                        get_ssh_session_if_instance(&sessions, &session_id, instance_id)
                    else {
                        let _ = bg_session.disconnect(
                            russh::Disconnect::ByApplication,
                            "PiTerm background session abandoned",
                            "en",
                        ).await;
                        ssh_log::debug(
                            SshLogRecord::new(
                                "ssh.command",
                                "background_session_connect_abandoned",
                                "Discarded a completed background SSH session because the parent session was replaced or removed",
                            )
                            .session_id(session_id.clone())
                            .server_id(server_id.clone())
                            .instance_id(instance_id)
                            .field("attempt", attempt),
                        );
                        return;
                    };

                    conn.install_bg_session(Arc::new(bg_session));
                    ssh_log::info(
                        SshLogRecord::new(
                            "ssh.command",
                            "background_session_ready",
                            "Background SSH session established successfully",
                        )
                        .session_id(session_id.clone())
                        .server_id(server_id.clone())
                        .instance_id(instance_id)
                        .field("attempt", attempt),
                    );
                    emit_background_session_event(&app, &session_id, "ready", None);
                    return;
                }
                Err(err) => {
                    let error = format!("Background Connection Failed: {}", err);
                    let will_retry = attempt < SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS;

                    if will_retry {
                        ssh_log::warn(
                            SshLogRecord::new(
                                "ssh.command",
                                "background_session_retry_scheduled",
                                "Background SSH session attempt failed; retry scheduled",
                            )
                            .session_id(session_id.clone())
                            .server_id(server_id.clone())
                            .instance_id(instance_id)
                            .field("attempt", attempt)
                            .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS)
                            .field(
                                "retry_delay_secs",
                                SSH_BACKGROUND_CONNECT_RETRY_DELAY.as_secs(),
                            )
                            .field("error", error),
                        );
                        tokio::time::sleep(SSH_BACKGROUND_CONNECT_RETRY_DELAY).await;
                        continue;
                    }

                    if let Some(conn) =
                        get_ssh_session_if_instance(&sessions, &session_id, instance_id)
                    {
                        conn.mark_bg_unavailable();
                    }

                    ssh_log::error(
                        SshLogRecord::new(
                            "ssh.command",
                            "background_session_unavailable",
                            "Background SSH session could not be established",
                        )
                        .session_id(session_id.clone())
                        .server_id(server_id.clone())
                        .instance_id(instance_id)
                        .field("attempt", attempt)
                        .field("max_attempts", SSH_BACKGROUND_CONNECT_MAX_ATTEMPTS)
                        .field("error", error.clone()),
                    );
                    emit_background_session_event(&app, &session_id, "unavailable", Some(error));
                    return;
                }
            }
        }
    });
}
