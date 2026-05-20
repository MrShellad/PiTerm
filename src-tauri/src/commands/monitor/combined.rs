use super::{
    cpu::{parse_cpu_output, RemoteCpuInfo, CPU_INFO_CMD},
    disk::{parse_disk_output, RemoteDiskInfo, DISK_INFO_CMD},
    get_monitor_session,
    info::{parse_os_output, RemoteOsInfo, OS_INFO_CMD},
    memory::{parse_mem_output, RemoteMemInfo, MEM_INFO_CMD},
    network::{parse_network_output, RemoteNetworkInfo, NETWORK_INFO_CMD},
    run_monitor_operation_async, MonitorCache,
};
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
use std::collections::HashMap;
use tauri::State;

const CPU_SECTION_MARKER: &str = "__PITERM_MONITOR_CPU__";
const MEM_SECTION_MARKER: &str = "__PITERM_MONITOR_MEM__";
const DISK_SECTION_MARKER: &str = "__PITERM_MONITOR_DISK__";
const OS_SECTION_MARKER: &str = "__PITERM_MONITOR_OS__";
const NETWORK_SECTION_MARKER: &str = "__PITERM_MONITOR_NETWORK__";

#[derive(Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteCombinedInfo {
    pub cpu: Option<RemoteCpuInfo>,
    pub mem: Option<RemoteMemInfo>,
    pub disk: Option<RemoteDiskInfo>,
    pub os: Option<RemoteOsInfo>,
    pub network: Option<RemoteNetworkInfo>,
}

fn build_combined_monitor_cmd() -> String {
    format!(
        r#"printf '%s\n' '{cpu_marker}';
{{ {cpu_cmd}; }} 2>/dev/null || true;
printf '%s\n' '{mem_marker}';
{{ {mem_cmd}; }} 2>/dev/null || true;
printf '%s\n' '{disk_marker}';
{{ {disk_cmd}; }} 2>/dev/null || true;
printf '%s\n' '{os_marker}';
{{ {os_cmd}; }} 2>/dev/null || true;
printf '%s\n' '{network_marker}';
{{ {network_cmd}; }} 2>/dev/null || true;"#,
        cpu_marker = CPU_SECTION_MARKER,
        cpu_cmd = CPU_INFO_CMD,
        mem_marker = MEM_SECTION_MARKER,
        mem_cmd = MEM_INFO_CMD,
        disk_marker = DISK_SECTION_MARKER,
        disk_cmd = DISK_INFO_CMD,
        os_marker = OS_SECTION_MARKER,
        os_cmd = OS_INFO_CMD,
        network_marker = NETWORK_SECTION_MARKER,
        network_cmd = NETWORK_INFO_CMD,
    )
}

fn marker_to_key(line: &str) -> Option<&'static str> {
    match line.trim() {
        CPU_SECTION_MARKER => Some(CPU_SECTION_MARKER),
        MEM_SECTION_MARKER => Some(MEM_SECTION_MARKER),
        DISK_SECTION_MARKER => Some(DISK_SECTION_MARKER),
        OS_SECTION_MARKER => Some(OS_SECTION_MARKER),
        NETWORK_SECTION_MARKER => Some(NETWORK_SECTION_MARKER),
        _ => None,
    }
}

fn parse_sections(output: &str) -> HashMap<&'static str, String> {
    let mut sections = HashMap::new();
    let mut current_marker: Option<&'static str> = None;
    let mut buffer = String::new();

    for line in output.lines() {
        if let Some(marker) = marker_to_key(line) {
            if let Some(previous_marker) = current_marker.replace(marker) {
                sections.insert(previous_marker, buffer.trim_end_matches('\n').to_string());
                buffer.clear();
            }
        } else if current_marker.is_some() {
            buffer.push_str(line);
            buffer.push('\n');
        }
    }

    if let Some(marker) = current_marker {
        sections.insert(marker, buffer.trim_end_matches('\n').to_string());
    }

    sections
}

fn parse_optional_section<T, F>(
    sections: &HashMap<&'static str, String>,
    key: &'static str,
    parser: F,
) -> Option<T>
where
    F: FnOnce(&str) -> Result<T, String>,
{
    let section = sections.get(key)?;
    if section.trim().is_empty() {
        return None;
    }

    parser(section).ok()
}

#[tauri::command]
pub async fn get_ssh_combined_info(
    ssh_state: State<'_, SshState>,
    monitor_cache: State<'_, MonitorCache>,
    id: String,
) -> Result<RemoteCombinedInfo, String> {
    let session = get_monitor_session(&ssh_state, &id, "combined_snapshot")?;

    let command = build_combined_monitor_cmd();
    let output = run_monitor_operation_async(
        &id,
        "combined_snapshot",
        vec![
            ssh_log::log_field("command_name", "combined_monitor_snapshot"),
            ssh_log::log_field("command_section_count", 5),
        ],
        || async {
            super::exec_ssh_command(&session, &command).await
        },
    )
    .await?;

    let sections = parse_sections(&output);
    let combined = RemoteCombinedInfo {
        cpu: parse_optional_section(&sections, CPU_SECTION_MARKER, |section| {
            parse_cpu_output(section, &monitor_cache, &id)
        }),
        mem: parse_optional_section(&sections, MEM_SECTION_MARKER, parse_mem_output),
        disk: parse_optional_section(&sections, DISK_SECTION_MARKER, |section| {
            parse_disk_output(section, &monitor_cache, &id)
        }),
        os: parse_optional_section(&sections, OS_SECTION_MARKER, parse_os_output),
        network: parse_optional_section(&sections, NETWORK_SECTION_MARKER, |section| {
            parse_network_output(section, &monitor_cache, &id)
        }),
    };

    if combined.cpu.is_none()
        && combined.mem.is_none()
        && combined.disk.is_none()
        && combined.os.is_none()
        && combined.network.is_none()
    {
        return Err("Failed to parse combined monitor data".to_string());
    }

    Ok(combined)
}
