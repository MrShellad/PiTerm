use crate::commands::ssh::SshState;
use crate::commands::ssh::state::SshSession;
use crate::utils::ssh_log::{self, SshLogRecord};
use std::sync::Arc;
use tauri::State;

// Get dedicated SFTP Session Arc
// Ensures we are operating on the independent SFTP connection
pub fn get_sftp_session_arc(
    ssh_state: &State<'_, SshState>,
    id: &str,
) -> Result<Arc<SshSession>, String> {
    let map = ssh_state.sessions.lock().map_err(|e| e.to_string())?;
    let conn = map.get(id).ok_or_else(|| {
        ssh_log::warn(
            SshLogRecord::new(
                "ssh.sftp",
                "session_lookup_failed",
                "Failed to locate background SSH session for SFTP operation",
            )
            .session_id(id.to_string()),
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
            "ssh.sftp",
            event,
            "Background SSH session is not available for SFTP yet",
        )
        .session_id(id.to_string()),
    );
    Err(message)
}
