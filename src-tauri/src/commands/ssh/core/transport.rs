use std::sync::Arc;
use std::time::Duration;
use russh::client;

use crate::commands::ssh::state::SshSession;
use crate::commands::ssh::utils::auth_method_label;
use crate::models::SshConfig;
use crate::utils::ssh_log::{self, SshLogRecord};

use super::{
    auth::authenticate_session, proxy::establish_tcp_stream, with_connection_context,
    DEFAULT_CONNECT_TIMEOUT_SECS,
};

pub async fn establish_base_session(
    config: &SshConfig,
    session_id: Option<&str>,
    role: &'static str,
) -> Result<SshSession, String> {
    ssh_log::info(with_connection_context(
        SshLogRecord::new(
            "ssh.connect",
            "session_establish_started",
            "Establishing SSH session",
        )
        .field("host", config.host.clone())
        .field("port", config.port)
        .field("username", config.username.clone())
        .field("connection_type", format!("{:?}", config.connection_type))
        .field("auth_method", auth_method_label(config))
        .field(
            "proxy_type",
            config
                .proxy
                .as_ref()
                .map(|proxy| proxy.proxy_type.clone())
                .unwrap_or_else(|| "none".to_string()),
        )
        .field(
            "connect_timeout_secs",
            config
                .connect_timeout
                .unwrap_or(DEFAULT_CONNECT_TIMEOUT_SECS as u32),
        )
        .field(
            "keepalive_interval_secs",
            config.keep_alive_interval.unwrap_or_default(),
        ),
        session_id,
        role,
    ));

    let tcp = establish_tcp_stream(config)?;
    ssh_log::info(with_connection_context(
        SshLogRecord::new(
            "ssh.connect",
            "tcp_connected",
            "TCP stream established for SSH session",
        )
        .field("host", config.host.clone())
        .field("port", config.port),
        session_id,
        role,
    ));

    tcp.set_nonblocking(true)
        .map_err(|e| format!("Failed to set TCP nonblocking: {}", e))?;
    let async_stream = tokio::net::TcpStream::from_std(tcp)
        .map_err(|e| format!("Failed to convert TCP stream to tokio stream: {}", e))?;

    let mut client_config = client::Config {
        // Interactive shells are allowed to sit idle. Liveness is handled by
        // optional SSH keepalives and the frontend heartbeat cleanup path.
        inactivity_timeout: None,
        ..Default::default()
    };

    if let Some(interval) = config.keep_alive_interval.filter(|interval| *interval > 0) {
        client_config.keepalive_interval = Some(Duration::from_secs(interval as u64));
        ssh_log::debug(with_connection_context(
            SshLogRecord::new(
                "ssh.connect",
                "keepalive_configured",
                "Configured SSH keepalive interval",
            )
            .field("keepalive_interval_secs", interval),
            session_id,
            role,
        ));
    }

    let client_config = Arc::new(client_config);
    let handler = crate::commands::ssh::core::client::PiTermClientHandler;

    let mut sess = client::connect_stream(client_config, async_stream, handler)
        .await
        .map_err(|e| format!("Handshake Error: {}", e))?;

    ssh_log::info(with_connection_context(
        SshLogRecord::new(
            "ssh.connect",
            "handshake_completed",
            "SSH handshake completed",
        )
        .field("host", config.host.clone())
        .field("port", config.port),
        session_id,
        role,
    ));

    authenticate_session(&mut sess, config, session_id, role).await?;

    ssh_log::info(with_connection_context(
        SshLogRecord::new(
            "ssh.connect",
            "session_established",
            "SSH session established successfully",
        )
        .field("host", config.host.clone())
        .field("port", config.port)
        .field("username", config.username.clone()),
        session_id,
        role,
    ));

    Ok(sess)
}

pub async fn create_shell_channel(
    config: &SshConfig,
    session_id: Option<&str>,
) -> Result<(SshSession, russh::Channel<russh::client::Msg>), String> {
    let sess = establish_base_session(config, session_id, "shell").await?;

    let channel = sess
        .channel_open_session()
        .await
        .map_err(|e| format!("Channel Error: {}", e))?;
    ssh_log::debug(with_connection_context(
        SshLogRecord::new("ssh.shell", "channel_created", "Created SSH shell channel")
            .field("host", config.host.clone())
            .field("port", config.port),
        session_id,
        "shell",
    ));
    channel
        .request_pty(true, "xterm-256color", 80, 24, 0, 0, &[])
        .await
        .map_err(|e| format!("PTY Error: {}", e))?;
    ssh_log::debug(with_connection_context(
        SshLogRecord::new(
            "ssh.shell",
            "pty_requested",
            "Requested PTY for shell channel",
        )
        .field("pty", "xterm-256color")
        .field("rows", 24)
        .field("cols", 80),
        session_id,
        "shell",
    ));
    channel
        .request_shell(true)
        .await
        .map_err(|e| format!("Shell Start Error: {}", e))?;
    ssh_log::info(with_connection_context(
        SshLogRecord::new("ssh.shell", "shell_started", "Remote shell started"),
        session_id,
        "shell",
    ));

    Ok((sess, channel))
}
