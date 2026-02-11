// src-tauri/src/commands/monitor/process.rs
use crate::commands::ssh::SshState;
use std::io::Read;
use tauri::State;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f64,
    pub mem_usage: u64, // 内存占用字节数，便于前端 formatBytes 处理
}

#[tauri::command]
pub async fn get_ssh_process_list(
    ssh_state: State<'_, SshState>,
    id: String,
) -> Result<Vec<RemoteProcessInfo>, String> {
    // 获取 SSH 监控会话
    let session_arc = {
        let map = ssh_state.sessions.lock().unwrap();
        map.get(&id)
            .map(|c| c.monitor_session.clone())
            .ok_or("SSH connection not active")?
    };

    let output = tauri::async_runtime::spawn_blocking(move || {
        let sess_guard = session_arc.lock().unwrap();
        let sess = sess_guard.as_ref().ok_or("Monitor session unavailable")?;
        let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
        
        // 🟢 执行指令：获取 PID, 进程名, CPU%, RSS内存(KB)
        // 按照 CPU 占用率降序排列，取前 50 个
        let cmd = "ps -eo pid,comm,%cpu,rss --sort=-%cpu | head -n 51";
        
        channel.exec(cmd).map_err(|e| e.to_string())?;
        let mut s = String::new();
        channel.read_to_string(&mut s).ok();
        channel.wait_close().ok();
        Ok::<String, String>(s)
    })
    .await
    .map_err(|e| e.to_string())??;

    let mut processes = Vec::new();
    let mut lines = output.lines();
    
    // 跳过第一行表头
    lines.next();

    for line in lines {
        let fields: Vec<&str> = line.split_whitespace().collect();
        if fields.len() < 4 { continue; }

        let pid = fields[0].parse().unwrap_or(0);
        let name = fields[1].to_string();
        let cpu_usage = fields[2].parse().unwrap_or(0.0);
        
        // ps 的 rss 单位是 KB，转换成字节以对齐前端的 formatBytes 工具
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