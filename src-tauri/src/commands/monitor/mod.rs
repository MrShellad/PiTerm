// src-tauri/src/commands/monitor/mod.rs

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// 声明子模块
pub mod cpu;
pub mod disk;
pub mod info;
pub mod memory;
pub mod network;
pub mod process; // 🟢 [新增] 声明子模块

// 重新导出命令，方便 lib.rs 或 main.rs 调用
pub use cpu::get_ssh_cpu_info;
pub use disk::get_ssh_disk_info;
pub use info::get_ssh_os_info;
pub use memory::get_ssh_mem_info;
pub use network::get_ssh_network_info;
pub use process::get_ssh_process_list; // 🟢 [新增] 重新导出进程管理命令

// === 共享状态定义 ===

// CpuTicks 属于 CPU 逻辑，但 MonitorCache 需要用到它
use cpu::CpuTicks;
use disk::DiskIoStats;
use network::NetIoStats;

pub struct MonitorCache {
    // Key: SSH Session ID
    pub history: Arc<Mutex<HashMap<String, CpuTicks>>>,
    // 磁盘 I/O 缓存: Key 是 SessionID
    pub disk_io: Arc<Mutex<HashMap<String, DiskIoStats>>>,
    // 网络缓存
    pub network_io: Arc<Mutex<HashMap<String, NetIoStats>>>,
    // 💡 注意：目前的进程管理逻辑（基于 ps 指令）是无状态的，
    // 所以暂时不需要在 MonitorCache 中为它添加字段。
}

impl MonitorCache {
    pub fn new() -> Self {
        Self {
            history: Arc::new(Mutex::new(HashMap::new())),
            disk_io: Arc::new(Mutex::new(HashMap::new())),
            network_io: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}