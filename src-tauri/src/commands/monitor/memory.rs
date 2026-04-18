// src-tauri/src/commands/monitor/memory.rs
use crate::commands::ssh::SshState;
use std::io::Read;
use tauri::State;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteMemInfo {
    pub total: u64,
    pub available: u64,
    pub used: u64,
    pub free: u64,      // 🟢 新增：空闲内存
    pub buffers: u64,   // 🟢 新增：缓冲区
    pub cached: u64,    // 🟢 新增：缓存
    pub swap_total: u64,
    pub swap_free: u64,
    pub swap_used: u64,
    pub usage: f64,     // 🟢 重命名为 usage 以匹配前端 CpuCard 等组件习惯
}

#[tauri::command]
pub async fn get_ssh_mem_info(
    ssh_state: State<'_, SshState>,
    id: String,
) -> Result<RemoteMemInfo, String> {
    let session_arc = {
        let map = ssh_state.sessions.lock().unwrap();
        match map.get(&id) {
            Some(conn) => conn.bg_session.clone(),
            None => return Err("SSH connection not active".to_string()),
        }
    };

    let output = tauri::async_runtime::spawn_blocking(move || {
        let sess = session_arc.lock().unwrap();
        let mut channel = sess.channel_session().map_err(|e: ssh2::Error| e.to_string())?;
        channel.exec("cat /proc/meminfo").map_err(|e: ssh2::Error| e.to_string())?;

        let mut s = String::new();
        channel.read_to_string(&mut s).map_err(|e: std::io::Error| e.to_string())?;
        channel.wait_close().ok();
        Ok::<String, String>(s)
    })
    .await
    .map_err(|e| format!("{}", e))??;

    let (mut total, mut free, mut available, mut buffers, mut cached) = (0, 0, 0, 0, 0);
    let (mut s_total, mut s_free) = (0, 0);

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 { continue; }
        let val = parts[1].parse::<u64>().unwrap_or(0) * 1024; // KB -> Bytes

        match parts[0] {
            "MemTotal:" => total = val,
            "MemFree:" => free = val,
            "MemAvailable:" => available = val,
            "Buffers:" => buffers = val,
            "Cached:" => cached = val,
            "SwapTotal:" => s_total = val,
            "SwapFree:" => s_free = val,
            _ => {}
        }
    }

    // 现代 Linux 习惯：已用 = 总量 - 可用
    let used = total.saturating_sub(available);
    let s_used = s_total.saturating_sub(s_free);
    let usage = if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 };

    Ok(RemoteMemInfo {
        total,
        available,
        used,
        free,
        buffers,
        cached,
        swap_total: s_total,
        swap_free: s_free,
        swap_used: s_used,
        usage,
    })
}