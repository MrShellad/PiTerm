use crate::commands::ssh::SshState;
use crate::utils::ssh_log::{self, SshLogRecord};
use serde_json::Value;
use ssh2::Session;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::State;

pub mod combined;
pub mod cpu;
pub mod disk;
pub mod info;
pub mod memory;
pub mod network;
pub mod process;

pub use combined::get_ssh_combined_info;
pub use cpu::get_ssh_cpu_info;
pub use disk::get_ssh_disk_info;
pub use info::get_ssh_os_info;
pub use memory::get_ssh_mem_info;
pub use network::get_ssh_network_info;
pub use process::get_ssh_process_list;

use cpu::CpuTicks;
use disk::DiskIoStats;
use network::NetIoStats;

pub struct MonitorCache {
    pub history: Arc<Mutex<HashMap<String, CpuTicks>>>,
    pub disk_io: Arc<Mutex<HashMap<String, DiskIoStats>>>,
    pub network_io: Arc<Mutex<HashMap<String, NetIoStats>>>,
}

impl MonitorCache {
    pub fn new() -> Self {
        Self {
            history: Arc::new(Mutex::new(HashMap::new())),
            disk_io: Arc::new(Mutex::new(HashMap::new())),
            network_io: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

pub(crate) fn get_monitor_session_arc(
    ssh_state: &State<'_, SshState>,
    id: &str,
    operation: &'static str,
) -> Result<Arc<Mutex<Session>>, String> {
    let map = ssh_state.sessions.lock().map_err(|e| e.to_string())?;
    let conn = map.get(id).ok_or_else(|| {
        ssh_log::warn(
            SshLogRecord::new(
                "ssh.monitor",
                "session_lookup_failed",
                "Failed to locate background SSH session for monitor operation",
            )
            .session_id(id.to_string())
            .field("operation", operation),
        );
        "SSH connection not active".to_string()
    })?;
    conn.touch_client_heartbeat();

    if let Some(session_arc) = conn.bg_session_arc() {
        return Ok(session_arc);
    }

    let (event, message) = if conn.bg_session_is_connecting() {
        (
            "session_not_ready",
            "SSH background session not ready".to_string(),
        )
    } else {
        (
            "session_unavailable",
            "SSH background session unavailable".to_string(),
        )
    };
    ssh_log::info(
        SshLogRecord::new(
            "ssh.monitor",
            event,
            "Background SSH session is not available for monitor operation yet",
        )
        .session_id(id.to_string())
        .field("operation", operation),
    );
    Err(message)
}

pub(crate) fn run_monitor_operation<T, F>(
    session_arc: Arc<Mutex<Session>>,
    session_id: &str,
    operation: &'static str,
    fields: Vec<(String, Value)>,
    action: F,
) -> Result<T, String>
where
    F: FnOnce(&Session) -> Result<T, String>,
{
    ssh_log::run_timed_session_operation(
        session_arc,
        "ssh.monitor",
        operation,
        session_id,
        fields,
        action,
    )
}
