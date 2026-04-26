use super::{get_monitor_session_arc, run_monitor_operation, MonitorCache};
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::time::Instant;
use tauri::State;

pub(crate) const DISK_INFO_CMD: &str =
    "lsblk -b -J -o NAME,SIZE,MOUNTPOINT,ROTA,RM,TYPE && echo '---SPLIT---' && df -B1 2>/dev/null && echo '---SPLIT---' && cat /proc/diskstats 2>/dev/null";

#[derive(Clone, Copy, Debug)]
pub struct DiskIoStats {
    pub read_bytes: u64,
    pub write_bytes: u64,
    pub timestamp: Instant,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PartitionInfo {
    pub filesystem: String,
    pub type_name: String,
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub mount: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiskDevice {
    pub name: String,
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub is_ssd: bool,
    pub is_removable: bool,
    pub read_speed: u64,
    pub write_speed: u64,
    pub partitions: Vec<PartitionInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemoteDiskInfo {
    pub total_cap: u64,
    pub used_cap: u64,
    pub read_speed: u64,
    pub write_speed: u64,
    pub disks: Vec<DiskDevice>,
}

#[derive(Deserialize, Debug)]
struct LsblkOutput {
    blockdevices: Vec<LsblkDevice>,
}

#[derive(Deserialize, Debug)]
struct LsblkDevice {
    name: String,
    size: Option<serde_json::Value>,
    mountpoint: Option<String>,
    mountpoints: Option<Vec<Option<String>>>,
    rota: Option<serde_json::Value>,
    rm: Option<serde_json::Value>,
    #[serde(rename = "type")]
    device_type: String,
    children: Option<Vec<LsblkDevice>>,
}

fn val_to_u64(value: &Option<serde_json::Value>) -> u64 {
    value
        .as_ref()
        .and_then(|v| {
            v.as_u64()
                .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
        })
        .unwrap_or(0)
}

fn val_to_bool(value: &Option<serde_json::Value>, default_if_none: bool) -> bool {
    match value {
        Some(serde_json::Value::Bool(v)) => *v,
        Some(serde_json::Value::Number(v)) => {
            v.as_u64().map(|num| num != 0).unwrap_or(default_if_none)
        }
        Some(serde_json::Value::String(v)) => v == "1" || v.eq_ignore_ascii_case("true"),
        _ => default_if_none,
    }
}

fn is_ssd_val(value: &Option<serde_json::Value>) -> bool {
    match value {
        Some(serde_json::Value::Bool(v)) => !*v,
        Some(serde_json::Value::Number(v)) => v.as_u64().map(|num| num == 0).unwrap_or(false),
        Some(serde_json::Value::String(v)) => v == "0" || v.eq_ignore_ascii_case("false"),
        _ => false,
    }
}

fn collect_partitions(
    device: &LsblkDevice,
    df_map: &HashMap<String, (u64, u64, u64)>,
    partitions: &mut Vec<PartitionInfo>,
    used_sum: &mut u64,
) {
    let mount = device.mountpoint.clone().or_else(|| {
        device
            .mountpoints
            .as_ref()
            .and_then(|mounts| mounts.first().and_then(|mount| mount.clone()))
    });

    if let Some(mount) = mount {
        if let Some(&(total, used, available)) = df_map.get(&mount) {
            partitions.push(PartitionInfo {
                filesystem: device.name.clone(),
                type_name: device.device_type.clone(),
                total,
                used,
                available,
                mount,
            });
            *used_sum += used;
        }
    }

    if let Some(children) = &device.children {
        for child in children {
            collect_partitions(child, df_map, partitions, used_sum);
        }
    }
}

pub(crate) fn parse_disk_output(
    output: &str,
    monitor_cache: &MonitorCache,
    id: &str,
) -> Result<RemoteDiskInfo, String> {
    let parts: Vec<&str> = output.split("---SPLIT---").collect();
    if parts.len() < 3 {
        return Err("Invalid disk data".into());
    }

    let mut df_map = HashMap::new();
    for line in parts[1].lines().skip(1) {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() >= 6 {
            df_map.insert(
                cols[5].to_string(),
                (
                    cols[1].parse().unwrap_or(0),
                    cols[2].parse().unwrap_or(0),
                    cols[3].parse().unwrap_or(0),
                ),
            );
        }
    }

    let mut dev_io_map = HashMap::new();
    for line in parts[2].lines() {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 10 {
            continue;
        }

        dev_io_map.insert(
            cols[2].to_string(),
            (
                cols[5].parse::<u64>().unwrap_or(0) * 512,
                cols[9].parse::<u64>().unwrap_or(0) * 512,
            ),
        );
    }

    let lsblk: LsblkOutput =
        serde_json::from_str(parts[0]).map_err(|e| format!("JSON Error: {}", e))?;
    let mut disks = Vec::new();
    let (mut total_cap, mut used_cap, mut read_speed, mut write_speed) = (0, 0, 0, 0);
    let now = Instant::now();
    let mut cache = monitor_cache.disk_io.lock().unwrap();

    for device in lsblk.blockdevices {
        if device.device_type != "disk" {
            continue;
        }

        let mut partitions = Vec::new();
        let mut device_used = 0;
        collect_partitions(&device, &df_map, &mut partitions, &mut device_used);

        let mut device_read_speed = 0;
        let mut device_write_speed = 0;
        if let Some(&(current_read, current_write)) = dev_io_map.get(&device.name) {
            let cache_key = format!("{}:{}", id, device.name);
            if let Some(previous) = cache.get(&cache_key) {
                let elapsed = now.duration_since(previous.timestamp).as_secs_f64();
                if elapsed > 0.0 {
                    device_read_speed =
                        (current_read.saturating_sub(previous.read_bytes) as f64 / elapsed) as u64;
                    device_write_speed = (current_write.saturating_sub(previous.write_bytes) as f64
                        / elapsed) as u64;
                }
            }

            cache.insert(
                cache_key,
                DiskIoStats {
                    read_bytes: current_read,
                    write_bytes: current_write,
                    timestamp: now,
                },
            );
        }

        let device_total = val_to_u64(&device.size);
        total_cap += device_total;
        used_cap += device_used;
        read_speed += device_read_speed;
        write_speed += device_write_speed;

        disks.push(DiskDevice {
            name: device.name,
            total: device_total,
            used: device_used,
            available: device_total.saturating_sub(device_used),
            is_ssd: is_ssd_val(&device.rota),
            is_removable: val_to_bool(&device.rm, false),
            read_speed: device_read_speed,
            write_speed: device_write_speed,
            partitions,
        });
    }

    Ok(RemoteDiskInfo {
        total_cap,
        used_cap,
        read_speed,
        write_speed,
        disks,
    })
}

#[tauri::command]
pub async fn get_ssh_disk_info(
    ssh_state: State<'_, SshState>,
    monitor_cache: State<'_, MonitorCache>,
    id: String,
) -> Result<RemoteDiskInfo, String> {
    let session_arc = get_monitor_session_arc(&ssh_state, &id, "disk_snapshot")?;

    let monitor_id = id.clone();
    let output = tauri::async_runtime::spawn_blocking(move || {
        run_monitor_operation(
            session_arc,
            &monitor_id,
            "disk_snapshot",
            vec![ssh_log::log_field("command_name", "DISK_INFO_CMD")],
            |sess| {
                let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
                channel.exec(DISK_INFO_CMD).map_err(|e| e.to_string())?;

                let mut s = String::new();
                channel.read_to_string(&mut s).ok();
                channel.wait_close().ok();
                Ok::<String, String>(s)
            },
        )
    })
    .await
    .map_err(|e| e.to_string())??;

    parse_disk_output(&output, &monitor_cache, &id)
}
