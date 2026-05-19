use std::time::Duration;

use crate::utils::ssh_log::SshLogRecord;

mod auth;
mod proxy;
mod shell_io;
mod transport;

pub use shell_io::{spawn_shell_reader_thread, spawn_shell_writer_thread};
pub use transport::{create_shell_channel, establish_base_session};

const DEFAULT_CONNECT_TIMEOUT_SECS: u64 = 10;
const DEFAULT_IO_TIMEOUT_SECS: u64 = 60;
const SHELL_BLOCKING_IO_TIMEOUT_MS: u32 = 50;
const SHELL_IDLE_SLEEP_MS: u64 = 2;
const SHELL_KEEPALIVE_INTERVAL_SECS: u64 = 15;
const HTTP_PROXY_RESPONSE_LIMIT: usize = 16 * 1024;
const SHELL_WRITE_BATCH_LIMIT: usize = 64 * 1024;

fn with_connection_context(
    record: SshLogRecord,
    session_id: Option<&str>,
    role: &'static str,
) -> SshLogRecord {
    let record = record.field("connection_role", role);
    if let Some(session_id) = session_id {
        record.session_id(session_id.to_string())
    } else {
        record
    }
}

fn sanitized_connect_timeout(config: &crate::models::SshConfig) -> Duration {
    Duration::from_secs(
        config
            .connect_timeout
            .unwrap_or(DEFAULT_CONNECT_TIMEOUT_SECS as u32)
            .clamp(1, 300) as u64,
    )
}
