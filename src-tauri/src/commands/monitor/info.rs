use super::{get_monitor_session, run_monitor_operation_async};
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
use tauri::State;

pub(crate) const OS_INFO_CMD: &str = "cat /proc/uptime && echo '---SPLIT---' && uname -r && echo '---SPLIT---' && uname -m && echo '---SPLIT---' && (grep PRETTY_NAME /etc/os-release || uname -o) && echo '---SPLIT---' && (cat /etc/timezone 2>/dev/null || date +%Z 2>/dev/null || echo 'Unknown')";

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteOsInfo {
    pub uptime: u64,
    pub distro: String,
    pub kernel: String,
    pub arch: String,
    pub timezone: String,
}

pub(crate) fn parse_os_output(output: &str) -> Result<RemoteOsInfo, String> {
    let parts: Vec<&str> = output.split("---SPLIT---").collect();
    if parts.len() < 5 {
        return Err("Invalid OS output".to_string());
    }

    let uptime_str = parts[0].split_whitespace().next().unwrap_or("0");
    let uptime = uptime_str.parse::<f64>().unwrap_or(0.0) as u64;

    let kernel = parts[1].trim().to_string();
    let arch = parts[2].trim().to_string();

    let distro_raw = parts[3].trim();
    let distro = if let Some(idx) = distro_raw.find('=') {
        distro_raw[idx + 1..].replace('"', "").to_string()
    } else {
        distro_raw.to_string()
    };

    let timezone = parts[4].trim().to_string();

    Ok(RemoteOsInfo {
        uptime,
        distro,
        kernel,
        arch,
        timezone,
    })
}

#[tauri::command]
pub async fn get_ssh_os_info(
    ssh_state: State<'_, SshState>,
    id: String,
) -> Result<RemoteOsInfo, String> {
    let session = get_monitor_session(&ssh_state, &id, "os_snapshot")?;

    let output = run_monitor_operation_async(
        &id,
        "os_snapshot",
        vec![ssh_log::log_field("command_name", "OS_INFO_CMD")],
        || async {
            super::exec_ssh_command(&session, OS_INFO_CMD).await
        },
    )
    .await?;

    parse_os_output(&output)
}
