use ssh2::{Channel, Session};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub struct SshConnection {
    pub shell_session: Session,
    pub shell_channel: Arc<Mutex<Channel>>,
    pub monitor_session: Arc<Mutex<Option<Session>>>,
    pub sftp_session: Arc<Mutex<Option<Session>>>,
}

impl Drop for SshConnection {
    fn drop(&mut self) {
        if let Ok(mut channel) = self.shell_channel.lock() {
            let _ = channel.close();
            let _ = channel.wait_close();
        }

        let _ = self
            .shell_session
            .disconnect(None, "PiTerm disconnect", None);

        if let Ok(mut session) = self.monitor_session.lock() {
            if let Some(session) = session.take() {
                let _ = session.disconnect(None, "PiTerm disconnect", None);
            }
        }

        if let Ok(mut session) = self.sftp_session.lock() {
            if let Some(session) = session.take() {
                let _ = session.disconnect(None, "PiTerm disconnect", None);
            }
        }
    }
}

#[derive(Default)]
pub struct SshState {
    pub sessions: Arc<Mutex<HashMap<String, SshConnection>>>,
}

pub const HOST_KEY_CACHE_TTL: Duration = Duration::from_secs(300);

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
