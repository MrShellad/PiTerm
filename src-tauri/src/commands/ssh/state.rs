use ssh2::{Channel, Session};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub struct SshConnection {
    pub shell_session: Arc<Mutex<Session>>,
    pub bg_session: Arc<Mutex<Session>>,
    pub shell_channel: Arc<Mutex<Channel>>,
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
