use ssh2::{Channel, Session};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, TryLockError};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub const HOST_KEY_CACHE_TTL: Duration = Duration::from_secs(300);
pub const SSH_SESSION_CLEANUP_INTERVAL: Duration = Duration::from_secs(15);
pub const SSH_SESSION_HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(60);
pub const SSH_KEEPALIVE_FAILURE_THRESHOLD: u8 = 3;

static NEXT_SSH_CONNECTION_INSTANCE_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Clone)]
pub struct SshConnection {
    pub instance_id: u64,
    pub shell_session: Arc<Mutex<Session>>,
    pub bg_session: Arc<Mutex<Session>>,
    pub shell_channel: Arc<Mutex<Channel>>,
    pub last_client_heartbeat: Arc<Mutex<Instant>>,
    pub consecutive_keepalive_failures: Arc<Mutex<u8>>,
}

impl SshConnection {
    pub fn new(
        shell_session: Arc<Mutex<Session>>,
        bg_session: Arc<Mutex<Session>>,
        shell_channel: Arc<Mutex<Channel>>,
    ) -> Self {
        Self {
            instance_id: NEXT_SSH_CONNECTION_INSTANCE_ID.fetch_add(1, Ordering::Relaxed),
            shell_session,
            bg_session,
            shell_channel,
            last_client_heartbeat: Arc::new(Mutex::new(Instant::now())),
            consecutive_keepalive_failures: Arc::new(Mutex::new(0)),
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

    pub fn send_keepalive_probe(&self) -> bool {
        let keepalive_ok = match self.bg_session.try_lock() {
            Ok(session) => session.keepalive_send().is_ok(),
            Err(TryLockError::WouldBlock) => return true,
            Err(TryLockError::Poisoned(poisoned)) => poisoned.into_inner().keepalive_send().is_ok(),
        };

        match self.consecutive_keepalive_failures.lock() {
            Ok(mut failures) => {
                if keepalive_ok {
                    *failures = 0;
                    true
                } else {
                    *failures = failures.saturating_add(1);
                    *failures < SSH_KEEPALIVE_FAILURE_THRESHOLD
                }
            }
            Err(poisoned) => {
                let mut failures = poisoned.into_inner();
                if keepalive_ok {
                    *failures = 0;
                    true
                } else {
                    *failures = failures.saturating_add(1);
                    *failures < SSH_KEEPALIVE_FAILURE_THRESHOLD
                }
            }
        }
    }
}

impl Drop for SshConnection {
    fn drop(&mut self) {
        if let Ok(mut channel) = self.shell_channel.lock() {
            let _ = channel.close();
            let _ = channel.wait_close();
        }

        if let Ok(session) = self.shell_session.lock() {
            let _ = session.disconnect(None, "PiTerm disconnect", None);
        }

        if let Ok(session) = self.bg_session.lock() {
            let _ = session.disconnect(None, "PiTerm disconnect", None);
        }
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
        let expired_ids: Vec<String> = snapshot
            .into_iter()
            .filter_map(|(id, conn)| {
                if conn.client_heartbeat_expired() || !conn.send_keepalive_probe() {
                    Some(id)
                } else {
                    None
                }
            })
            .collect();

        if expired_ids.is_empty() {
            continue;
        }

        let removed_connections: Vec<(String, SshConnection)> = match sessions.lock() {
            Ok(mut map) => expired_ids
                .into_iter()
                .filter_map(|id| map.remove(&id).map(|conn| (id, conn)))
                .collect(),
            Err(poisoned) => {
                let mut map = poisoned.into_inner();
                expired_ids
                    .into_iter()
                    .filter_map(|id| map.remove(&id).map(|conn| (id, conn)))
                    .collect()
            }
        };

        for (id, conn) in removed_connections {
            drop(conn);
            let _ = app.emit(&format!("term-exit-{}", id), ());
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
