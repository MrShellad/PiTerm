use crate::commands::ssh::state::SshSession;
use crate::models::SshConfig;
use crate::utils::ssh_log::{self, SshLogRecord};
use super::with_connection_context;
use std::sync::Arc;

pub(super) async fn authenticate_session(
    sess: &mut SshSession,
    config: &SshConfig,
    session_id: Option<&str>,
    role: &'static str,
) -> Result<(), String> {
    let mut last_error = None;

    if let Some(key_content) = &config.private_key {
        if !key_content.trim().is_empty() {
            ssh_log::info(with_connection_context(
                SshLogRecord::new(
                    "ssh.auth",
                    "public_key_attempt",
                    "Attempting public key authentication",
                )
                .field("host", config.host.clone())
                .field("port", config.port)
                .field("username", config.username.clone()),
                session_id,
                role,
            ));
            let passphrase = config
                .passphrase
                .as_deref()
                .filter(|value| !value.is_empty());

            match russh_keys::decode_secret_key(key_content, passphrase) {
                Ok(key_pair) => {
                    let key_pair = Arc::new(key_pair);
                    match sess.authenticate_publickey(&config.username, key_pair).await {
                        Ok(true) => {
                            ssh_log::info(with_connection_context(
                                SshLogRecord::new(
                                    "ssh.auth",
                                    "public_key_success",
                                    "Public key authentication succeeded",
                                )
                                .field("host", config.host.clone())
                                .field("port", config.port)
                                .field("username", config.username.clone()),
                                session_id,
                                role,
                            ));
                            return Ok(());
                        }
                        Ok(false) => {
                            ssh_log::warn(with_connection_context(
                                SshLogRecord::new(
                                    "ssh.auth",
                                    "public_key_failed",
                                    "Public key authentication failed: rejected by server",
                                )
                                .field("host", config.host.clone())
                                .field("port", config.port)
                                .field("username", config.username.clone()),
                                session_id,
                                role,
                            ));
                            last_error = Some("Public Key rejected by server".to_string());
                        }
                        Err(err) => {
                            let err_msg = err.to_string();
                            ssh_log::warn(with_connection_context(
                                SshLogRecord::new(
                                    "ssh.auth",
                                    "public_key_failed",
                                    "Public key authentication failed",
                                )
                                .field("host", config.host.clone())
                                .field("port", config.port)
                                .field("username", config.username.clone())
                                .field("error", err_msg.clone()),
                                session_id,
                                role,
                            ));
                            last_error = Some(format!("Public Key Auth Error: {}", err_msg));
                        }
                    }
                }
                Err(err) => {
                    ssh_log::warn(with_connection_context(
                        SshLogRecord::new(
                            "ssh.auth",
                            "public_key_parse_failed",
                            "Failed to parse private key from memory",
                        )
                        .field("error", err.to_string()),
                        session_id,
                        role,
                    ));
                    last_error = Some(format!("Private Key Parse Error: {}", err));
                }
            }
        }
    }

    if let Some(password) = &config.password {
        if !password.trim().is_empty() {
            ssh_log::info(with_connection_context(
                SshLogRecord::new(
                    "ssh.auth",
                    "password_attempt",
                    "Attempting password authentication",
                )
                .field("host", config.host.clone())
                .field("port", config.port)
                .field("username", config.username.clone()),
                session_id,
                role,
            ));
            match sess.authenticate_password(&config.username, password).await {
                Ok(true) => {
                    ssh_log::info(with_connection_context(
                        SshLogRecord::new(
                            "ssh.auth",
                            "password_success",
                            "Password authentication succeeded",
                        )
                        .field("host", config.host.clone())
                        .field("port", config.port)
                        .field("username", config.username.clone()),
                        session_id,
                        role,
                    ));
                    return Ok(());
                }
                Ok(false) => {
                    ssh_log::warn(with_connection_context(
                        SshLogRecord::new(
                            "ssh.auth",
                            "password_failed",
                            "Password authentication failed: rejected by server",
                        )
                        .field("host", config.host.clone())
                        .field("port", config.port)
                        .field("username", config.username.clone()),
                        session_id,
                        role,
                    ));
                    last_error = Some("Password authentication failed: rejected by server".to_string());
                }
                Err(err) => {
                    ssh_log::warn(with_connection_context(
                        SshLogRecord::new(
                            "ssh.auth",
                            "password_failed",
                            "Password authentication failed due to transport error",
                        )
                        .field("host", config.host.clone())
                        .field("port", config.port)
                        .field("username", config.username.clone())
                        .field("error", err.to_string()),
                        session_id,
                        role,
                    ));
                    last_error = Some(format!("Password Auth Error: {}", err));
                }
            }
        }
    }

    Err(last_error
        .unwrap_or_else(|| "Auth failed: No usable private key or password provided.".to_string()))
}
