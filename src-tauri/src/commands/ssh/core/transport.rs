use ssh2::{Channel, MethodType, Session};

use crate::commands::ssh::utils::auth_method_label;
use crate::models::SshConfig;
use crate::utils::ssh_log::{self, SshLogRecord};

use super::{
    auth::authenticate_session, proxy::establish_tcp_stream, with_connection_context,
    DEFAULT_CONNECT_TIMEOUT_SECS, SHELL_BLOCKING_IO_TIMEOUT_MS,
};

pub fn configure_legacy_algorithms(sess: &mut Session) {
    let kex_methods = "curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256,diffie-hellman-group14-sha1,diffie-hellman-group1-sha1,diffie-hellman-group-exchange-sha1";
    let hostkey_methods = "ssh-ed25519,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,rsa-sha2-512,rsa-sha2-256,ssh-rsa,ssh-dss";
    let cipher_methods = "aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr,aes256-cbc,aes192-cbc,aes128-cbc,3des-cbc";
    let mac_methods = "hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256,hmac-sha1";

    let _ = sess.method_pref(MethodType::Kex, kex_methods);
    let _ = sess.method_pref(MethodType::HostKey, hostkey_methods);
    let _ = sess.method_pref(MethodType::CryptCs, cipher_methods);
    let _ = sess.method_pref(MethodType::CryptSc, cipher_methods);
    let _ = sess.method_pref(MethodType::MacCs, mac_methods);
    let _ = sess.method_pref(MethodType::MacSc, mac_methods);
}

pub fn establish_base_session(
    config: &SshConfig,
    session_id: Option<&str>,
    role: &'static str,
) -> Result<Session, String> {
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

    let mut sess = Session::new().map_err(|e| format!("Session Init Error: {}", e))?;
    configure_legacy_algorithms(&mut sess);
    sess.set_timeout(
        config
            .connect_timeout
            .unwrap_or(DEFAULT_CONNECT_TIMEOUT_SECS as u32)
            .clamp(1, 300)
            * 1000,
    );
    sess.set_tcp_stream(tcp);
    sess.handshake()
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

    if let Some(interval) = config.keep_alive_interval.filter(|interval| *interval > 0) {
        sess.set_keepalive(false, interval);
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

    authenticate_session(&sess, config, session_id, role)?;

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

pub fn create_shell_channel(
    config: &SshConfig,
    session_id: Option<&str>,
) -> Result<(Session, Channel), String> {
    let sess = establish_base_session(config, session_id, "shell")?;

    let mut channel = sess
        .channel_session()
        .map_err(|e| format!("Channel Error: {}", e))?;
    ssh_log::debug(with_connection_context(
        SshLogRecord::new("ssh.shell", "channel_created", "Created SSH shell channel")
            .field("host", config.host.clone())
            .field("port", config.port),
        session_id,
        "shell",
    ));
    channel
        .request_pty("xterm-256color", None, Some((80, 24, 0, 0)))
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
        .shell()
        .map_err(|e| format!("Shell Start Error: {}", e))?;
    ssh_log::info(with_connection_context(
        SshLogRecord::new("ssh.shell", "shell_started", "Remote shell started"),
        session_id,
        "shell",
    ));

    sess.set_timeout(SHELL_BLOCKING_IO_TIMEOUT_MS);

    Ok((sess, channel))
}
