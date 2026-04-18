use crate::commands::ssh::SshState;
use ssh2::Session;
use std::sync::{Arc, Mutex};
use tauri::State;

// Get dedicated SFTP Session Arc
// Ensures we are operating on the independent SFTP connection
pub fn get_sftp_session_arc(
    ssh_state: &State<'_, SshState>,
    id: &str,
) -> Result<Arc<Mutex<Session>>, String> {
    let map = ssh_state.sessions.lock().map_err(|e| e.to_string())?;
    let conn = map.get(id).ok_or("SSH connection not active")?;
    
    // Return sftp_session (now named bg_session)
    Ok(conn.bg_session.clone())
}