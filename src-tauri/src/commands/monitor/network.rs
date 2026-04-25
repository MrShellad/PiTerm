use super::MonitorCache;
use crate::commands::ssh::SshState;
use std::collections::HashMap;
use std::io::Read;
use std::time::Instant;
use tauri::State;

pub(crate) const NETWORK_INFO_CMD: &str =
    "cat /proc/net/dev && echo '---SPLIT---' && ip addr && echo '---SPLIT---' && cat /proc/net/sockstat 2>/dev/null";

#[derive(Clone, Debug)]
pub struct NetIoStats {
    pub ifaces: HashMap<String, (u64, u64)>,
    pub timestamp: Instant,
}

#[derive(serde::Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct InterfaceInfo {
    pub name: String,
    pub ipv4: Vec<String>,
    pub ipv6: Vec<String>,
    pub mac: String,
    pub status: String,
    pub rx_speed: u64,
    pub tx_speed: u64,
    pub total_rx: u64,
    pub total_tx: u64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteNetworkInfo {
    pub total_rx: u64,
    pub total_tx: u64,
    pub rx_speed: u64,
    pub tx_speed: u64,
    pub tcp_connections: u64,
    pub interfaces: Vec<InterfaceInfo>,
}

pub(crate) fn parse_network_output(
    output: &str,
    monitor_cache: &MonitorCache,
    id: &str,
) -> Result<RemoteNetworkInfo, String> {
    let parts: Vec<&str> = output.split("---SPLIT---").collect();
    if parts.len() < 3 {
        return Err("Invalid network data format".to_string());
    }

    let mut tcp_connections = 0;
    for line in parts[2].lines() {
        if line.starts_with("TCP: inuse") {
            tcp_connections = line
                .split_whitespace()
                .nth(2)
                .and_then(|value| value.parse().ok())
                .unwrap_or(0);
            break;
        }
    }

    let now = Instant::now();
    let mut cache = monitor_cache.network_io.lock().unwrap();
    let prev_stats = cache.get(id).cloned();
    let elapsed = prev_stats
        .as_ref()
        .map(|stats| now.duration_since(stats.timestamp).as_secs_f64())
        .unwrap_or(0.0);

    let mut iface_traffic_map = HashMap::new();
    let (mut total_rx, mut total_tx, mut rx_speed, mut tx_speed) = (0, 0, 0, 0);

    for line in parts[0].lines().skip(2) {
        let clean_line = line.replace(':', " ");
        let fields: Vec<&str> = clean_line.split_whitespace().collect();
        if fields.len() < 10 {
            continue;
        }

        let name = fields[0].to_string();
        if name == "lo" || name.starts_with("br-") {
            continue;
        }

        let rx = fields[1].parse::<u64>().unwrap_or(0);
        let tx = fields[9].parse::<u64>().unwrap_or(0);

        let (mut iface_rx_speed, mut iface_tx_speed) = (0, 0);
        if let Some(prev) = &prev_stats {
            if let Some(&(prev_rx, prev_tx)) = prev.ifaces.get(&name) {
                if elapsed > 0.0 {
                    iface_rx_speed = ((rx.saturating_sub(prev_rx)) as f64 / elapsed) as u64;
                    iface_tx_speed = ((tx.saturating_sub(prev_tx)) as f64 / elapsed) as u64;
                }
            }
        }

        iface_traffic_map.insert(name.clone(), (rx, tx, iface_rx_speed, iface_tx_speed));
        total_rx += rx;
        total_tx += tx;
        rx_speed += iface_rx_speed;
        tx_speed += iface_tx_speed;
    }

    let mut next_iface_cache = HashMap::new();
    for (name, (rx, tx, _, _)) in &iface_traffic_map {
        next_iface_cache.insert(name.clone(), (*rx, *tx));
    }
    cache.insert(
        id.to_string(),
        NetIoStats {
            ifaces: next_iface_cache,
            timestamp: now,
        },
    );

    let mut interfaces = Vec::new();
    let mut current_iface = InterfaceInfo::default();

    for line in parts[1].lines() {
        let trimmed = line.trim();
        if !line.starts_with(' ')
            && line.contains(':')
            && line.chars().next().is_some_and(|ch| ch.is_ascii_digit())
        {
            if !current_iface.name.is_empty() {
                interfaces.push(current_iface);
            }
            current_iface = InterfaceInfo::default();

            let name_part = line.split(':').nth(1).unwrap_or("").trim();
            let name = name_part.split('@').next().unwrap_or(name_part).to_string();
            if name == "lo" || name.starts_with("br-") {
                current_iface.name = String::new();
                continue;
            }

            current_iface.name = name.clone();
            current_iface.status = if line.contains("state UP") {
                "UP".into()
            } else {
                "DOWN".into()
            };

            if let Some(&(iface_total_rx, iface_total_tx, iface_rx_speed, iface_tx_speed)) =
                iface_traffic_map.get(&name)
            {
                current_iface.total_rx = iface_total_rx;
                current_iface.total_tx = iface_total_tx;
                current_iface.rx_speed = iface_rx_speed;
                current_iface.tx_speed = iface_tx_speed;
            }
        } else if !current_iface.name.is_empty() {
            if trimmed.starts_with("link/ether") {
                current_iface.mac = trimmed.split_whitespace().nth(1).unwrap_or("").to_string();
            } else if trimmed.starts_with("inet ") {
                let ip = trimmed
                    .split_whitespace()
                    .nth(1)
                    .and_then(|value| value.split('/').next())
                    .unwrap_or("");
                current_iface.ipv4.push(ip.to_string());
            } else if trimmed.starts_with("inet6 ") {
                let ip = trimmed
                    .split_whitespace()
                    .nth(1)
                    .and_then(|value| value.split('/').next())
                    .unwrap_or("");
                current_iface.ipv6.push(ip.to_string());
            }
        }
    }

    if !current_iface.name.is_empty() {
        interfaces.push(current_iface);
    }

    Ok(RemoteNetworkInfo {
        total_rx,
        total_tx,
        rx_speed,
        tx_speed,
        tcp_connections,
        interfaces,
    })
}

#[tauri::command]
pub async fn get_ssh_network_info(
    ssh_state: State<'_, SshState>,
    monitor_cache: State<'_, MonitorCache>,
    id: String,
) -> Result<RemoteNetworkInfo, String> {
    let session_arc = {
        let map = ssh_state.sessions.lock().unwrap();
        match map.get(&id) {
            Some(conn) => conn.bg_session.clone(),
            None => return Err("SSH connection not active".to_string()),
        }
    };

    let output = tauri::async_runtime::spawn_blocking(move || {
        let sess = session_arc.lock().unwrap();
        let mut channel = sess
            .channel_session()
            .map_err(|e: ssh2::Error| e.to_string())?;

        channel
            .exec(NETWORK_INFO_CMD)
            .map_err(|e: ssh2::Error| e.to_string())?;

        let mut s = String::new();
        channel.read_to_string(&mut s).ok();
        channel.wait_close().ok();
        Ok::<String, String>(s)
    })
    .await
    .map_err(|e| e.to_string())??;

    parse_network_output(&output, &monitor_cache, &id)
}
