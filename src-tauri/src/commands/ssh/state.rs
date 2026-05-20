use crate::utils::ssh_log::{self, SshLogRecord};
use crate::commands::ssh::core::PiTermClientHandler;
use crate::models::SshConfig;
use russh::client;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, oneshot};

pub const HOST_KEY_CACHE_TTL: Duration = Duration::from_secs(300);
pub const SSH_SESSION_CLEANUP_INTERVAL: Duration = Duration::from_secs(15);
pub const SSH_SESSION_HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(60);

static NEXT_SSH_CONNECTION_INSTANCE_ID: AtomicU64 = AtomicU64::new(1);

pub struct SshWriteRequest {
    pub data: String,
    pub result_tx: oneshot::Sender<Result<(), String>>,
}

pub struct SshResizeRequest {
    pub rows: u32,
    pub cols: u32,
    pub result_tx: oneshot::Sender<Result<(), String>>,
}

pub type SshSession = client::Handle<PiTermClientHandler>;

#[derive(Clone)]
pub struct SshConnection {
    pub instance_id: u64,
    pub config: SshConfig,
    pub shell_session: Arc<SshSession>,
    pub bg_session: Arc<Mutex<Option<Arc<SshSession>>>>,
    pub sftp_session: Arc<Mutex<Option<Arc<russh_sftp::client::SftpSession>>>>,
    pub shell_channel_id: russh::ChannelId,
    pub shell_write_tx: mpsc::Sender<SshWriteRequest>,
    pub shell_resize_tx: mpsc::Sender<SshResizeRequest>,
    pub shell_active: Arc<AtomicBool>,
    pub bg_connecting: Arc<AtomicBool>,
    pub shutdown_complete: Arc<AtomicBool>,
    pub last_client_heartbeat: Arc<Mutex<Instant>>,
}

impl SshConnection {
    pub fn new(
        config: SshConfig,
        shell_session: Arc<SshSession>,
        shell_channel_id: russh::ChannelId,
        shell_write_tx: mpsc::Sender<SshWriteRequest>,
        shell_resize_tx: mpsc::Sender<SshResizeRequest>,
    ) -> Self {
        Self {
            instance_id: NEXT_SSH_CONNECTION_INSTANCE_ID.fetch_add(1, Ordering::Relaxed),
            config,
            shell_session,
            bg_session: Arc::new(Mutex::new(None)),
            sftp_session: Arc::new(Mutex::new(None)),
            shell_channel_id,
            shell_write_tx,
            shell_resize_tx,
            shell_active: Arc::new(AtomicBool::new(true)),
            bg_connecting: Arc::new(AtomicBool::new(true)),
            shutdown_complete: Arc::new(AtomicBool::new(false)),
            last_client_heartbeat: Arc::new(Mutex::new(Instant::now())),
        }
    }

    pub fn touch_client_heartbeat(&self) {
        match self.last_client_heartbeat.lock() {
            Ok(mut last_seen) => *last_seen = Instant::now(),
            Err(poisoned) => *poisoned.into_inner() = Instant::now(),
        }
    }

    pub fn client_heartbeat_expired(&self) -> bool {
        match self.last_client_heartbeat.lock() {
            Ok(last_seen) => last_seen.elapsed() > SSH_SESSION_HEARTBEAT_TIMEOUT,
            Err(poisoned) => poisoned.into_inner().elapsed() > SSH_SESSION_HEARTBEAT_TIMEOUT,
        }
    }

    pub fn client_heartbeat_age_secs(&self) -> u64 {
        match self.last_client_heartbeat.lock() {
            Ok(last_seen) => last_seen.elapsed().as_secs(),
            Err(poisoned) => poisoned.into_inner().elapsed().as_secs(),
        }
    }

    pub fn bg_session_arc(&self) -> Option<Arc<SshSession>> {
        match self.bg_session.lock() {
            Ok(slot) => slot.clone(),
            Err(poisoned) => poisoned.into_inner().clone(),
        }
    }

    pub fn bg_session_is_ready(&self) -> bool {
        match self.bg_session.lock() {
            Ok(slot) => slot.is_some(),
            Err(poisoned) => poisoned.into_inner().is_some(),
        }
    }

    pub fn bg_session_is_connecting(&self) -> bool {
        self.bg_connecting.load(Ordering::Relaxed)
    }

    pub fn mark_bg_connecting(&self) {
        self.bg_connecting.store(true, Ordering::SeqCst);
    }

    pub fn mark_bg_unavailable(&self) {
        self.bg_connecting.store(false, Ordering::SeqCst);
    }

    pub fn install_bg_session(&self, session: Arc<SshSession>) {
        let previous = match self.bg_session.lock() {
            Ok(mut slot) => slot.replace(session),
            Err(poisoned) => poisoned.into_inner().replace(session),
        };

        self.bg_connecting.store(false, Ordering::SeqCst);

        if let Some(previous_session) = previous {
            tokio::spawn(async move {
                let _ = previous_session.disconnect(russh::Disconnect::ByApplication, "PiTerm background session replaced", "en").await;
            });
        }
    }

    pub fn get_sftp_session(&self) -> Option<Arc<russh_sftp::client::SftpSession>> {
        match self.sftp_session.lock() {
            Ok(slot) => slot.clone(),
            Err(poisoned) => poisoned.into_inner().clone(),
        }
    }

    pub fn set_sftp_session(&self, sftp: Arc<russh_sftp::client::SftpSession>) {
        match self.sftp_session.lock() {
            Ok(mut slot) => *slot = Some(sftp),
            Err(poisoned) => *poisoned.into_inner() = Some(sftp),
        }
    }

    pub fn clear_sftp_session(&self) {
        match self.sftp_session.lock() {
            Ok(mut slot) => *slot = None,
            Err(poisoned) => *poisoned.into_inner() = None,
        }
    }

    fn take_bg_session(&self) -> Option<Arc<SshSession>> {
        match self.bg_session.lock() {
            Ok(mut slot) => slot.take(),
            Err(poisoned) => poisoned.into_inner().take(),
        }
    }

    pub fn shell_is_active(&self) -> bool {
        self.shell_active.load(Ordering::Relaxed)
    }

    pub fn mark_shell_closed(&self) -> bool {
        let was_active = self.shell_active.swap(false, Ordering::SeqCst);
        if !was_active {
            return false;
        }

        let shell_session = self.shell_session.clone();

        tokio::spawn(async move {
            let _ = shell_session.disconnect(russh::Disconnect::ByApplication, "PiTerm shell closed", "en").await;
        });

        true
    }

    pub fn shutdown(&self, disconnect_reason: &str) -> bool {
        let was_open = self
            .shutdown_complete
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok();
        if !was_open {
            return false;
        }

        self.clear_sftp_session();
        let shell_session = self.shell_session.clone();
        let bg_session = self.take_bg_session();
        let reason_str = disconnect_reason.to_string();

        tokio::spawn(async move {
            let _ = shell_session.disconnect(russh::Disconnect::ByApplication, &reason_str, "en").await;
            if let Some(bg_sess) = bg_session {
                let _ = bg_sess.disconnect(russh::Disconnect::ByApplication, &reason_str, "en").await;
            }
        });

        true
    }
}

#[derive(Default)]
pub struct SshState {
    pub sessions: Arc<Mutex<HashMap<String, SshConnection>>>,
}

pub fn remove_ssh_session(
    sessions: &Arc<Mutex<HashMap<String, SshConnection>>>,
    id: &str,
) -> Option<SshConnection> {
    match sessions.lock() {
        Ok(mut map) => map.remove(id),
        Err(poisoned) => poisoned.into_inner().remove(id),
    }
}

pub fn remove_ssh_session_if_instance(
    sessions: &Arc<Mutex<HashMap<String, SshConnection>>>,
    id: &str,
    instance_id: u64,
) -> Option<SshConnection> {
    match sessions.lock() {
        Ok(mut map) => {
            let matches_instance = map
                .get(id)
                .map(|conn| conn.instance_id == instance_id)
                .unwrap_or(false);
            if matches_instance {
                map.remove(id)
            } else {
                None
            }
        }
        Err(poisoned) => {
            let mut map = poisoned.into_inner();
            let matches_instance = map
                .get(id)
                .map(|conn| conn.instance_id == instance_id)
                .unwrap_or(false);
            if matches_instance {
                map.remove(id)
            } else {
                None
            }
        }
    }
}

pub fn get_ssh_session_if_instance(
    sessions: &Arc<Mutex<HashMap<String, SshConnection>>>,
    id: &str,
    instance_id: u64,
) -> Option<SshConnection> {
    match sessions.lock() {
        Ok(map) => map
            .get(id)
            .filter(|conn| conn.instance_id == instance_id)
            .cloned(),
        Err(poisoned) => poisoned
            .into_inner()
            .get(id)
            .filter(|conn| conn.instance_id == instance_id)
            .cloned(),
    }
}

fn snapshot_ssh_sessions(
    sessions: &Arc<Mutex<HashMap<String, SshConnection>>>,
) -> Vec<(String, SshConnection)> {
    match sessions.lock() {
        Ok(map) => map
            .iter()
            .map(|(id, conn)| (id.clone(), conn.clone()))
            .collect(),
        Err(poisoned) => poisoned
            .into_inner()
            .iter()
            .map(|(id, conn)| (id.clone(), conn.clone()))
            .collect(),
    }
}

pub fn spawn_ssh_session_cleanup_task(
    app: AppHandle,
    sessions: Arc<Mutex<HashMap<String, SshConnection>>>,
) {
    thread::spawn(move || loop {
        thread::sleep(SSH_SESSION_CLEANUP_INTERVAL);

        let snapshot = snapshot_ssh_sessions(&sessions);
        let expired_entries: Vec<(String, u64, &'static str, u64)> = snapshot
            .into_iter()
            .filter_map(|(id, conn)| {
                if conn.client_heartbeat_expired() {
                    Some((
                        id,
                        conn.instance_id,
                        "heartbeat_timeout",
                        conn.client_heartbeat_age_secs(),
                    ))
                } else {
                    None
                }
            })
            .collect();

        if expired_entries.is_empty() {
            continue;
        }

        let removed_connections: Vec<(String, &'static str, u64, SshConnection)> =
            match sessions.lock() {
                Ok(mut map) => expired_entries
                    .into_iter()
                    .filter_map(
                        |(id, _instance_id, reason, heartbeat_age_secs)| {
                            map.remove(&id).map(|conn| {
                                (id, reason, heartbeat_age_secs, conn)
                            })
                        },
                    )
                    .collect(),
                Err(poisoned) => {
                    let mut map = poisoned.into_inner();
                    expired_entries
                        .into_iter()
                        .filter_map(
                            |(id, _instance_id, reason, heartbeat_age_secs)| {
                                map.remove(&id).map(|conn| {
                                    (id, reason, heartbeat_age_secs, conn)
                                })
                            },
                        )
                        .collect()
                }
            };

        for (id, reason, heartbeat_age_secs, conn) in removed_connections {
            let instance_id = conn.instance_id;
            let _ = conn.shutdown("PiTerm cleanup");
            ssh_log::warn(
                SshLogRecord::new(
                    "ssh.cleanup",
                    "session_reaped",
                    "Cleanup task removed an SSH session",
                )
                .session_id(id.clone())
                .instance_id(instance_id)
                .field("reason", reason)
                .field("heartbeat_age_secs", heartbeat_age_secs),
            );
            let _ = app.emit(
                &format!("term-exit-{}", id),
                TerminalExitEvent {
                    session_active: false,
                    reason: reason.to_string(),
                },
            );
        }
    });
}

pub struct PendingHostKey {
    pub host: String,
    pub port: u16,
    pub key_type: String,
    pub fingerprint: String,
    pub host_key: Vec<u8>,
    pub cached_at: Instant,
}

impl PendingHostKey {
    pub fn is_expired(&self) -> bool {
        self.cached_at.elapsed() > HOST_KEY_CACHE_TTL
    }
}

#[derive(Default)]
pub struct HostKeyVerificationCache {
    pub entries: Arc<Mutex<HashMap<String, PendingHostKey>>>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExitEvent {
    pub session_active: bool,
    pub reason: String,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundSessionEvent {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}
