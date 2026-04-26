use super::{get_monitor_session_arc, run_monitor_operation};
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
use std::io::Read;
use tauri::State;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f64,
    pub mem_usage: u64,
}

#[tauri::command]
pub async fn get_ssh_process_list(
    ssh_state: State<'_, SshState>,
    id: String,
) -> Result<Vec<RemoteProcessInfo>, String> {
    let session_arc = get_monitor_session_arc(&ssh_state, &id, "process_snapshot")?;

    let output = tauri::async_runtime::spawn_blocking(move || {
        run_monitor_operation(
            session_arc,
            &id,
            "process_snapshot",
            vec![ssh_log::log_field("command_name", "top_process_list")],
            |sess| {
                let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
                let cmd = "ps -eo pid,comm,%cpu,rss --sort=-%cpu | head -n 51";

                channel.exec(cmd).map_err(|e| e.to_string())?;
                let mut s = String::new();
                channel.read_to_string(&mut s).ok();
                channel.wait_close().ok();
                Ok::<String, String>(s)
            },
        )
    })
    .await
    .map_err(|e| e.to_string())??;

    let mut processes = Vec::new();
    let mut lines = output.lines();
    lines.next();

    for line in lines {
        let fields: Vec<&str> = line.split_whitespace().collect();
        if fields.len() < 4 {
            continue;
        }

        let pid = fields[0].parse().unwrap_or(0);
        let name = fields[1].to_string();
        let cpu_usage = fields[2].parse().unwrap_or(0.0);
        let mem_kb: u64 = fields[3].parse().unwrap_or(0);
        let mem_usage = mem_kb * 1024;

        processes.push(RemoteProcessInfo {
            pid,
            name,
            cpu_usage,
            mem_usage,
        });
    }

    Ok(processes)
}
