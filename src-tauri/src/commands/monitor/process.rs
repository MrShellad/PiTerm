use super::{get_monitor_session, run_monitor_operation_async};
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
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
    let session = get_monitor_session(&ssh_state, &id, "process_snapshot")?;

    let output = run_monitor_operation_async(
        &id,
        "process_snapshot",
        vec![ssh_log::log_field("command_name", "top_process_list")],
        || async {
            let cmd = "ps -eo pid,comm,%cpu,rss --sort=-%cpu | head -n 51";
            super::exec_ssh_command(&session, cmd).await
        },
    )
    .await?;

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
