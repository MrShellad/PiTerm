use std::ffi::CString;
use std::ptr::null;

use libssh2_sys as raw;
use ssh2::{KeyboardInteractivePrompt, Prompt, Session};

use crate::models::SshConfig;
use crate::utils::ssh_log::{self, SshLogRecord};

use super::with_connection_context;

struct PasswordPrompter {
    secret: String,
}

impl KeyboardInteractivePrompt for PasswordPrompter {
    fn prompt<'a>(
        &mut self,
        _username: &str,
        _instructions: &str,
        prompts: &[Prompt<'a>],
    ) -> Vec<String> {
        prompts.iter().map(|_| self.secret.clone()).collect()
    }
}

pub(super) fn authenticate_session(
    sess: &Session,
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

            match userauth_pubkey_from_memory(sess, &config.username, key_content, passphrase) {
                Ok(_) => {
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
                Err(err) => {
                    ssh_log::warn(with_connection_context(
                        SshLogRecord::new(
                            "ssh.auth",
                            "public_key_failed",
                            "Public key authentication failed",
                        )
                        .field("host", config.host.clone())
                        .field("port", config.port)
                        .field("username", config.username.clone())
                        .field("error", err.clone()),
                        session_id,
                        role,
                    ));
                    last_error = Some(format!("Public Key Auth Error: {}", err));
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
            match sess.userauth_password(&config.username, password) {
                Ok(_) => {
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
                Err(password_err) => {
                    ssh_log::warn(with_connection_context(
                        SshLogRecord::new(
                            "ssh.auth",
                            "password_failed",
                            "Password authentication failed; trying keyboard-interactive fallback",
                        )
                        .field("host", config.host.clone())
                        .field("port", config.port)
                        .field("username", config.username.clone())
                        .field("error", password_err.to_string()),
                        session_id,
                        role,
                    ));
                    let mut prompter = PasswordPrompter {
                        secret: password.clone(),
                    };

                    match sess.userauth_keyboard_interactive(&config.username, &mut prompter) {
                        Ok(_) => {
                            ssh_log::info(with_connection_context(
                                SshLogRecord::new(
                                    "ssh.auth",
                                    "keyboard_interactive_success",
                                    "Keyboard-interactive authentication succeeded",
                                )
                                .field("host", config.host.clone())
                                .field("port", config.port)
                                .field("username", config.username.clone()),
                                session_id,
                                role,
                            ));
                            return Ok(());
                        }
                        Err(interactive_err) => {
                            ssh_log::error(with_connection_context(
                                SshLogRecord::new(
                                    "ssh.auth",
                                    "keyboard_interactive_failed",
                                    "Keyboard-interactive authentication failed",
                                )
                                .field("host", config.host.clone())
                                .field("port", config.port)
                                .field("username", config.username.clone())
                                .field("error", interactive_err.to_string()),
                                session_id,
                                role,
                            ));
                            last_error = Some(format!(
                                "Password Auth Error: {}; keyboard-interactive fallback failed: {}",
                                password_err, interactive_err
                            ));
                        }
                    }
                }
            }
        }
    }

    Err(last_error
        .unwrap_or_else(|| "Auth failed: No usable private key or password provided.".to_string()))
}

fn userauth_pubkey_from_memory(
    sess: &Session,
    username: &str,
    private_key: &str,
    passphrase: Option<&str>,
) -> Result<(), String> {
    let username_c =
        CString::new(username).map_err(|_| "Username contains a NUL byte".to_string())?;
    let private_key_c =
        CString::new(private_key).map_err(|_| "Private key contains a NUL byte".to_string())?;
    let passphrase_c = passphrase
        .map(|value| CString::new(value).map_err(|_| "Passphrase contains a NUL byte".to_string()))
        .transpose()?;

    let username_len = username.len();
    let private_key_len = private_key.len();

    let mut raw_session = sess.raw();
    let rc = unsafe {
        raw::libssh2_userauth_publickey_frommemory(
            &mut *raw_session,
            username_c.as_ptr(),
            username_len,
            null(),
            0,
            private_key_c.as_ptr(),
            private_key_len,
            passphrase_c
                .as_ref()
                .map(|value| value.as_ptr())
                .unwrap_or(null()),
        )
    };
    drop(raw_session);

    if rc == 0 {
        Ok(())
    } else {
        Err(ssh2::Error::from_session_error(sess, rc).to_string())
    }
}
