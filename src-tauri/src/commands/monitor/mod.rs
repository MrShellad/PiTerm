use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub mod combined;
pub mod cpu;
pub mod disk;
pub mod info;
pub mod memory;
pub mod network;
pub mod process;

pub use combined::get_ssh_combined_info;
pub use cpu::get_ssh_cpu_info;
pub use disk::get_ssh_disk_info;
pub use info::get_ssh_os_info;
pub use memory::get_ssh_mem_info;
pub use network::get_ssh_network_info;
pub use process::get_ssh_process_list;

use cpu::CpuTicks;
use disk::DiskIoStats;
use network::NetIoStats;

pub struct MonitorCache {
    pub history: Arc<Mutex<HashMap<String, CpuTicks>>>,
    pub disk_io: Arc<Mutex<HashMap<String, DiskIoStats>>>,
    pub network_io: Arc<Mutex<HashMap<String, NetIoStats>>>,
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
