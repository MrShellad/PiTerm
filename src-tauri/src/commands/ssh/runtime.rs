use std::time::Duration;

use crate::utils::ssh_log::{self, SshLogRecord};

pub const SSH_WRITE_QUEUE_CAPACITY: usize = 1024;

pub(super) const SSH_BLOCKING_OPERATION_TIMEOUT: Duration = Duration::from_secs(10);

pub async fn run_blocking_ssh_task<T, F>(operation_name: &'static str, task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tokio::time::timeout(SSH_BLOCKING_OPERATION_TIMEOUT, async move {
        tauri::async_runtime::spawn_blocking(task).await
    })
    .await
    .map_err(|_| {
        let err = format!(
            "SSH {} timed out after {}s",
            operation_name,
            SSH_BLOCKING_OPERATION_TIMEOUT.as_secs()
        );
        ssh_log::warn(
            SshLogRecord::new(
                "ssh.command",
                "blocking_operation_timeout",
                "Blocking SSH helper task timed out",
            )
            .field("operation", operation_name)
            .field("timeout_secs", SSH_BLOCKING_OPERATION_TIMEOUT.as_secs())
            .field("error", err.clone()),
        );
        err
    })?
    .map_err(|e| {
        let err = format!("SSH {} task failed: {}", operation_name, e);
        ssh_log::error(
            SshLogRecord::new(
                "ssh.command",
                "blocking_operation_failed",
                "Blocking SSH helper task failed",
            )
            .field("operation", operation_name)
            .field("error", err.clone()),
        );
        err
    })?
}
