use super::{get_monitor_session_arc, run_monitor_operation};
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
use std::io::Read;
use tauri::State;

pub(crate) const MEM_INFO_CMD: &str = "cat /proc/meminfo";

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteMemInfo {
    pub total: u64,
    pub available: u64,
    pub used: u64,
    pub free: u64,
    pub buffers: u64,
    pub cached: u64,
    pub swap_total: u64,
    pub swap_free: u64,
    pub swap_used: u64,
    pub usage: f64,
}

pub(crate) fn parse_mem_output(output: &str) -> Result<RemoteMemInfo, String> {
    let (mut total, mut free, mut available, mut buffers, mut cached) = (0, 0, 0, 0, 0);
    let (mut swap_total, mut swap_free) = (0, 0);

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let value = parts[1].parse::<u64>().unwrap_or(0) * 1024;
        match parts[0] {
            "MemTotal:" => total = value,
            "MemFree:" => free = value,
            "MemAvailable:" => available = value,
            "Buffers:" => buffers = value,
            "Cached:" => cached = value,
            "SwapTotal:" => swap_total = value,
            "SwapFree:" => swap_free = value,
            _ => {}
        }
    }

    if total == 0 {
        return Err("Invalid meminfo output".to_string());
    }

    let used = total.saturating_sub(available);
    let swap_used = swap_total.saturating_sub(swap_free);
    let usage = (used as f64 / total as f64) * 100.0;

    Ok(RemoteMemInfo {
        total,
        available,
        used,
        free,
        buffers,
        cached,
        swap_total,
        swap_free,
        swap_used,
        usage,
    })
}

#[tauri::command]
pub async fn get_ssh_mem_info(
    ssh_state: State<'_, SshState>,
    id: String,
) -> Result<RemoteMemInfo, String> {
    let session_arc = get_monitor_session_arc(&ssh_state, &id, "memory_snapshot")?;

    let output = tauri::async_runtime::spawn_blocking(move || {
        run_monitor_operation(
            session_arc,
            &id,
            "memory_snapshot",
            vec![ssh_log::log_field("command_name", "MEM_INFO_CMD")],
            |sess| {
                let mut channel = sess
                    .channel_session()
                    .map_err(|e: ssh2::Error| e.to_string())?;
                channel
                    .exec(MEM_INFO_CMD)
                    .map_err(|e: ssh2::Error| e.to_string())?;

                let mut s = String::new();
                channel
                    .read_to_string(&mut s)
                    .map_err(|e: std::io::Error| e.to_string())?;
                channel.wait_close().ok();
                Ok::<String, String>(s)
            },
        )
    })
    .await
    .map_err(|e| e.to_string())??;

    parse_mem_output(&output)
}
