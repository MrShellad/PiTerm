// src-tauri/src/commands/monitor/disk.rs
use super::MonitorCache;
use crate::commands::ssh::SshState;
use std::io::Read;
use std::time::Instant;
use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
struct LsblkOutput { blockdevices: Vec<LsblkDevice> }

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

fn val_to_u64(v: &Option<serde_json::Value>) -> u64 {
    v.as_ref().and_then(|v| {
        v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok()))
    }).unwrap_or(0)
}

fn val_to_bool(v: &Option<serde_json::Value>, default_if_none: bool) -> bool {
    match v {
        Some(serde_json::Value::Bool(b)) => *b,
        Some(serde_json::Value::Number(n)) => n.as_u64().map(|num| num != 0).unwrap_or(default_if_none),
        Some(serde_json::Value::String(s)) => s == "1" || s.to_lowercase() == "true",
        _ => default_if_none,
    }
}

fn is_ssd_val(v: &Option<serde_json::Value>) -> bool {
    match v {
        Some(serde_json::Value::Bool(b)) => !*b, 
        Some(serde_json::Value::Number(n)) => n.as_u64().map(|num| num == 0).unwrap_or(false),
        Some(serde_json::Value::String(s)) => s == "0" || s.to_lowercase() == "false",
        _ => false,
    }
}

#[tauri::command]
pub async fn get_ssh_disk_info(
    ssh_state: State<'_, SshState>,
    monitor_cache: State<'_, MonitorCache>,
    id: String,
) -> Result<RemoteDiskInfo, String> {
    let session_arc = {
        let map = ssh_state.sessions.lock().unwrap();
        match map.get(&id) {
            Some(conn) => conn.bg_session.clone(),
            None => return Err("SSH connection not active".to_string()),
        }
    };

    let output = tauri::async_runtime::spawn_blocking(move || {
        let sess = session_arc.lock().unwrap();
        let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
        let cmd = "lsblk -b -J -o NAME,SIZE,MOUNTPOINT,ROTA,RM,TYPE && echo '---SPLIT---' && df -B1 2>/dev/null && echo '---SPLIT---' && cat /proc/diskstats 2>/dev/null";
        channel.exec(cmd).map_err(|e| e.to_string())?;
        let mut s = String::new();
        channel.read_to_string(&mut s).ok();
        channel.wait_close().ok();
        Ok::<String, String>(s)
    }).await.map_err(|e| e.to_string())??;

    let parts: Vec<&str> = output.split("---SPLIT---").collect();
    if parts.len() < 3 { return Err("Invalid disk data".into()); }

    let mut df_map = HashMap::new();
    for line in parts[1].lines().skip(1) {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() >= 6 {
            df_map.insert(cols[5].to_string(), (cols[1].parse().unwrap_or(0), cols[2].parse().unwrap_or(0), cols[3].parse().unwrap_or(0)));
        }
    }

    let mut dev_io_map = HashMap::new();
    for line in parts[2].lines() {
        let c: Vec<&str> = line.split_whitespace().collect();
        if c.len() < 10 { continue; }
        dev_io_map.insert(c[2].to_string(), (c[5].parse::<u64>().unwrap_or(0) * 512, c[9].parse::<u64>().unwrap_or(0) * 512));
    }

    let lsblk: LsblkOutput = serde_json::from_str(parts[0]).map_err(|e| format!("JSON Error: {}", e))?;
    let mut disks = Vec::new();
    let (mut g_total, mut g_used, mut g_read, mut g_write) = (0, 0, 0, 0);
    let now = Instant::now();
    let mut cache = monitor_cache.disk_io.lock().unwrap();

    for dev in lsblk.blockdevices {
        if dev.device_type != "disk" { continue; }
        let mut partitions = Vec::new();
        let mut d_used = 0;

        fn walk(d: &LsblkDevice, df: &HashMap<String, (u64, u64, u64)>, res: &mut Vec<PartitionInfo>, u_sum: &mut u64) {
            let mnt = d.mountpoint.clone().or_else(|| d.mountpoints.as_ref().and_then(|ms| ms.get(0).and_then(|m| m.clone())));
            if let Some(m) = mnt {
                if let Some(&(t, u, a)) = df.get(&m) {
                    res.push(PartitionInfo { filesystem: d.name.clone(), type_name: d.device_type.clone(), total: t, used: u, available: a, mount: m });
                    *u_sum += u;
                }
            }
            if let Some(children) = &d.children {
                for c in children { walk(c, df, res, u_sum); }
            }
        }
        walk(&dev, &df_map, &mut partitions, &mut d_used);

        let mut d_rs = 0; let mut d_ws = 0;
        if let Some(&(cur_r, cur_w)) = dev_io_map.get(&dev.name) {
            let key = format!("{}:{}", id, dev.name);
            if let Some(p) = cache.get(&key) {
                let d = now.duration_since(p.timestamp).as_secs_f64();
                if d > 0.0 {
                    d_rs = (cur_r.saturating_sub(p.read_bytes) as f64 / d) as u64;
                    d_ws = (cur_w.saturating_sub(p.write_bytes) as f64 / d) as u64;
                }
            }
            cache.insert(key, DiskIoStats { read_bytes: cur_r, write_bytes: cur_w, timestamp: now });
        }

        let d_total = val_to_u64(&dev.size);
        g_total += d_total; g_used += d_used; g_read += d_rs; g_write += d_ws;

        disks.push(DiskDevice {
            name: dev.name, total: d_total, used: d_used, available: d_total.saturating_sub(d_used),
            is_ssd: is_ssd_val(&dev.rota), is_removable: val_to_bool(&dev.rm, false),
            read_speed: d_rs, write_speed: d_ws, partitions,
        });
    }

    Ok(RemoteDiskInfo { total_cap: g_total, used_cap: g_used, read_speed: g_read, write_speed: g_write, disks })
}