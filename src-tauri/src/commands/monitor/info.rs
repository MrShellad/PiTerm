use crate::commands::ssh::SshState;
use std::io::Read;
use tauri::State;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteOsInfo {
    pub uptime: u64,
    pub distro: String,
    pub kernel: String,
    pub arch: String,
    pub timezone: String,
}

#[tauri::command]
pub async fn get_ssh_os_info(
    ssh_state: State<'_, SshState>,
    id: String,
) -> Result<RemoteOsInfo, String> {
    let session_arc = {
        let map = ssh_state.sessions.lock().unwrap();
        match map.get(&id) {
            Some(conn) => conn.bg_session.clone(),
            None => return Err("SSH connection not active".to_string()),
        }
    };

    let output = tauri::async_runtime::spawn_blocking(move || {
        let sess = session_arc.lock().unwrap();
        // [修复] 解包 Option
        // [修复] 显式指定错误类型
        let mut channel = sess.channel_session().map_err(|e: ssh2::Error| e.to_string())?;
        
        let cmd = "cat /proc/uptime && echo '---SPLIT---' && uname -r && echo '---SPLIT---' && uname -m && echo '---SPLIT---' && (grep PRETTY_NAME /etc/os-release || uname -o) && echo '---SPLIT---' && (cat /etc/timezone 2>/dev/null || date +%Z 2>/dev/null || echo 'Unknown')";
        
        channel.exec(cmd).map_err(|e: ssh2::Error| e.to_string())?;

        let mut s = String::new();
        channel.read_to_string(&mut s).map_err(|e: std::io::Error| e.to_string())?;
        channel.wait_close().ok();
        Ok::<String, String>(s)
    })
    .await
    .map_err(|e| e.to_string())??;

    let parts: Vec<&str> = output.split("---SPLIT---").collect();
    if parts.len() < 5 {
        return Err("Invalid output".to_string());
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
        kernel,
        arch,
        distro,
        timezone,
    })
}
