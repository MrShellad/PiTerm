use super::{get_monitor_session, run_monitor_operation_async, MonitorCache};
use crate::commands::ssh::SshState;
use crate::utils::ssh_log;
use tauri::State;

pub(crate) const CPU_INFO_CMD: &str = "grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 && \
                   echo '---SPLIT---' && grep -c '^processor' /proc/cpuinfo && \
                   echo '---SPLIT---' && grep '^core id' /proc/cpuinfo | sort -u | wc -l && \
                   echo '---SPLIT---' && cat /proc/loadavg && \
                   echo '---SPLIT---' && cat /proc/stat | grep '^cpu'";

#[derive(Clone, Copy, Debug)]
pub struct CpuTicks {
    pub user: u64,
    pub nice: u64,
    pub system: u64,
    pub idle: u64,
    pub iowait: u64,
    pub irq: u64,
    pub softirq: u64,
    pub steal: u64,
}

impl CpuTicks {
    fn total(&self) -> u64 {
        self.user
            + self.nice
            + self.system
            + self.idle
            + self.iowait
            + self.irq
            + self.softirq
            + self.steal
    }

    fn active(&self) -> u64 {
        self.user + self.nice + self.system + self.irq + self.softirq + self.steal
    }

    fn from_line(line: &str) -> Option<Self> {
        let fields: Vec<&str> = line.split_whitespace().collect();
        if fields.len() < 9 {
            return None;
        }

        Some(CpuTicks {
            user: fields[1].parse().unwrap_or(0),
            nice: fields[2].parse().unwrap_or(0),
            system: fields[3].parse().unwrap_or(0),
            idle: fields[4].parse().unwrap_or(0),
            iowait: fields[5].parse().unwrap_or(0),
            irq: fields[6].parse().unwrap_or(0),
            softirq: fields[7].parse().unwrap_or(0),
            steal: fields[8].parse().unwrap_or(0),
        })
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuBreakdown {
    pub user: f64,
    pub system: f64,
    pub iowait: f64,
    pub idle: f64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteCpuInfo {
    pub model: String,
    pub physical_cores: usize,
    pub logical_threads: usize,
    pub usage: f64,
    pub load_avg: [f64; 3],
    pub breakdown: CpuBreakdown,
    pub per_core_usage: Vec<f64>,
}

pub(crate) fn parse_cpu_output(
    output: &str,
    monitor_cache: &MonitorCache,
    id: &str,
) -> Result<RemoteCpuInfo, String> {
    let parts: Vec<&str> = output.split("---SPLIT---").collect();
    if parts.len() < 5 {
        return Err("Invalid CPU data format".into());
    }

    let model = parts[0].trim().to_string();
    let logical_threads = parts[1].trim().parse().unwrap_or(1);
    let physical_cores = parts[2].trim().parse().unwrap_or(1);

    let load_parts: Vec<&str> = parts[3].split_whitespace().collect();
    let load_avg = [
        load_parts
            .first()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
        load_parts
            .get(1)
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
        load_parts
            .get(2)
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
    ];

    let mut usage = 0.0;
    let mut breakdown = CpuBreakdown {
        user: 0.0,
        system: 0.0,
        iowait: 0.0,
        idle: 0.0,
    };
    let mut per_core_usage = Vec::new();

    {
        let mut history = monitor_cache.history.lock().unwrap();

        for line in parts[4].trim().lines() {
            let label = line.split_whitespace().next().unwrap_or("");
            let current = match CpuTicks::from_line(line) {
                Some(ticks) => ticks,
                None => continue,
            };

            let cache_key = format!("{}_{}", id, label);
            if let Some(prev) = history.get(&cache_key) {
                let total_delta = current.total().saturating_sub(prev.total());
                if total_delta > 0 {
                    let calc_usage = (current.active().saturating_sub(prev.active()) as f64
                        / total_delta as f64)
                        * 100.0;

                    if label == "cpu" {
                        usage = calc_usage;
                        breakdown.user = (current.user.saturating_sub(prev.user) as f64
                            / total_delta as f64)
                            * 100.0;
                        breakdown.system = ((current.system + current.irq + current.softirq)
                            .saturating_sub(prev.system + prev.irq + prev.softirq)
                            as f64
                            / total_delta as f64)
                            * 100.0;
                        breakdown.iowait = (current.iowait.saturating_sub(prev.iowait) as f64
                            / total_delta as f64)
                            * 100.0;
                        breakdown.idle = (current.idle.saturating_sub(prev.idle) as f64
                            / total_delta as f64)
                            * 100.0;
                    } else {
                        per_core_usage.push(calc_usage.min(100.0));
                    }
                }
            }

            history.insert(cache_key, current);
        }
    }

    Ok(RemoteCpuInfo {
        model,
        physical_cores,
        logical_threads,
        usage,
        load_avg,
        breakdown,
        per_core_usage,
    })
}

#[tauri::command]
pub async fn get_ssh_cpu_info(
    ssh_state: State<'_, SshState>,
    monitor_cache: State<'_, MonitorCache>,
    id: String,
) -> Result<RemoteCpuInfo, String> {
    let session = get_monitor_session(&ssh_state, &id, "cpu_snapshot")?;

    let output = run_monitor_operation_async(
        &id,
        "cpu_snapshot",
        vec![ssh_log::log_field("command_name", "CPU_INFO_CMD")],
        || async {
            super::exec_ssh_command(&session, CPU_INFO_CMD).await
        },
    )
    .await?;

    parse_cpu_output(&output, &monitor_cache, &id)
}
