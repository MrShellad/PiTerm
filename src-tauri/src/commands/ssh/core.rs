use std::ffi::CString;
use std::io::{ErrorKind, Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream, ToSocketAddrs};
use std::ptr::null;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use libssh2_sys as raw;
use ssh2::{Channel, KeyboardInteractivePrompt, MethodType, Prompt, Session};
use tauri::{AppHandle, Emitter};

use crate::models::{ConnectionType, Proxy, SshConfig};

const DEFAULT_CONNECT_TIMEOUT_SECS: u64 = 10;
const DEFAULT_IO_TIMEOUT_SECS: u64 = 60;
const SHELL_READ_TIMEOUT_MS: u32 = 50;
const HTTP_PROXY_RESPONSE_LIMIT: usize = 16 * 1024;

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

fn sanitized_connect_timeout(config: &SshConfig) -> Duration {
    Duration::from_secs(
        config
            .connect_timeout
            .unwrap_or(DEFAULT_CONNECT_TIMEOUT_SECS as u32)
            .clamp(1, 300) as u64,
    )
}

fn socket_io_timeout(timeout: Duration) -> Duration {
    Duration::from_secs(timeout.as_secs().max(DEFAULT_IO_TIMEOUT_SECS))
}

fn resolve_socket_addrs(host: &str, port: u16) -> Result<Vec<SocketAddr>, String> {
    (host, port)
        .to_socket_addrs()
        .map(|iter| iter.collect())
        .map_err(|e| format!("DNS Error: {}", e))
}

fn connect_with_timeout(addrs: &[SocketAddr], timeout: Duration) -> Result<TcpStream, String> {
    let mut last_error = None;

    for addr in addrs {
        match TcpStream::connect_timeout(addr, timeout) {
            Ok(stream) => return Ok(stream),
            Err(err) => last_error = Some(format!("{} ({})", addr, err)),
        }
    }

    Err(last_error.unwrap_or_else(|| "DNS resolution failed".to_string()))
}

fn prepare_stream(stream: &TcpStream, timeout: Duration) -> Result<(), String> {
    stream
        .set_nodelay(true)
        .map_err(|e| format!("TCP Error: {}", e))?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|e| format!("TCP Error: {}", e))?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|e| format!("TCP Error: {}", e))?;
    Ok(())
}

fn encode_proxy_auth(proxy: &Proxy) -> Option<String> {
    let username = proxy.username.as_deref().unwrap_or("").trim();
    let password = proxy.password.as_deref().unwrap_or("");

    if username.is_empty() && password.is_empty() {
        return None;
    }

    Some(BASE64.encode(format!("{}:{}", username, password)))
}

fn connect_direct_stream(config: &SshConfig, timeout: Duration) -> Result<TcpStream, String> {
    let addrs = resolve_socket_addrs(&config.host, config.port)?;
    let stream = connect_with_timeout(&addrs, timeout).map_err(|e| format!("TCP Error: {}", e))?;
    prepare_stream(&stream, socket_io_timeout(timeout))?;
    Ok(stream)
}

fn connect_proxy_stream(
    proxy: &Proxy,
    timeout: Duration,
) -> Result<TcpStream, String> {
    let addrs = resolve_socket_addrs(&proxy.host, proxy.port)?;
    let stream =
        connect_with_timeout(&addrs, timeout).map_err(|e| format!("Proxy TCP Error: {}", e))?;
    prepare_stream(&stream, timeout)?;
    Ok(stream)
}

fn connect_http_proxy(
    config: &SshConfig,
    proxy: &Proxy,
    timeout: Duration,
) -> Result<TcpStream, String> {
    let mut stream = connect_proxy_stream(proxy, timeout)?;

    let mut request = format!(
        "CONNECT {}:{} HTTP/1.1\r\nHost: {}:{}\r\nProxy-Connection: Keep-Alive\r\n",
        config.host, config.port, config.host, config.port
    );

    if let Some(auth) = encode_proxy_auth(proxy) {
        request.push_str(&format!("Proxy-Authorization: Basic {}\r\n", auth));
    }

    request.push_str("\r\n");

    stream
        .write_all(request.as_bytes())
        .map_err(|e| format!("HTTP proxy handshake failed: {}", e))?;
    stream
        .flush()
        .map_err(|e| format!("HTTP proxy handshake failed: {}", e))?;

    let mut response = Vec::new();
    let mut chunk = [0u8; 1024];

    loop {
        let count = stream
            .read(&mut chunk)
            .map_err(|e| format!("HTTP proxy handshake failed: {}", e))?;

        if count == 0 {
            break;
        }

        response.extend_from_slice(&chunk[..count]);

        if response.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }

        if response.len() > HTTP_PROXY_RESPONSE_LIMIT {
            return Err("HTTP proxy response too large".to_string());
        }
    }

    let header = String::from_utf8_lossy(&response);
    let status_line = header.lines().next().unwrap_or_default();
    let status_code = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or_default();

    if status_code != 200 {
        return Err(format!("HTTP proxy CONNECT failed: {}", status_line));
    }

    prepare_stream(&stream, socket_io_timeout(timeout))?;
    Ok(stream)
}

fn connect_socks4_proxy(
    config: &SshConfig,
    proxy: &Proxy,
    timeout: Duration,
) -> Result<TcpStream, String> {
    let mut stream = connect_proxy_stream(proxy, timeout)?;
    let mut request = Vec::with_capacity(9 + config.host.len());

    request.push(0x04);
    request.push(0x01);
    request.extend_from_slice(&config.port.to_be_bytes());

    match config.host.parse::<Ipv4Addr>() {
        Ok(ipv4) => request.extend_from_slice(&ipv4.octets()),
        Err(_) => request.extend_from_slice(&[0, 0, 0, 1]),
    }

    request.extend_from_slice(proxy.username.as_deref().unwrap_or("").as_bytes());
    request.push(0);

    if config.host.parse::<Ipv4Addr>().is_err() {
        request.extend_from_slice(config.host.as_bytes());
        request.push(0);
    }

    stream
        .write_all(&request)
        .map_err(|e| format!("SOCKS4 proxy handshake failed: {}", e))?;
    stream
        .flush()
        .map_err(|e| format!("SOCKS4 proxy handshake failed: {}", e))?;

    let mut response = [0u8; 8];
    stream
        .read_exact(&mut response)
        .map_err(|e| format!("SOCKS4 proxy handshake failed: {}", e))?;

    if response[1] != 0x5a {
        return Err(format!("SOCKS4 proxy CONNECT failed (code {})", response[1]));
    }

    prepare_stream(&stream, socket_io_timeout(timeout))?;
    Ok(stream)
}

fn write_socks5_target(request: &mut Vec<u8>, host: &str) -> Result<(), String> {
    if let Ok(ipv4) = host.parse::<Ipv4Addr>() {
        request.push(0x01);
        request.extend_from_slice(&ipv4.octets());
        return Ok(());
    }

    if let Ok(ipv6) = host.parse::<std::net::Ipv6Addr>() {
        request.push(0x04);
        request.extend_from_slice(&ipv6.octets());
        return Ok(());
    }

    if host.len() > u8::MAX as usize {
        return Err("SOCKS5 target host is too long".to_string());
    }

    request.push(0x03);
    request.push(host.len() as u8);
    request.extend_from_slice(host.as_bytes());
    Ok(())
}

fn connect_socks5_proxy(
    config: &SshConfig,
    proxy: &Proxy,
    timeout: Duration,
) -> Result<TcpStream, String> {
    let mut stream = connect_proxy_stream(proxy, timeout)?;

    let has_auth = proxy
        .username
        .as_deref()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false)
        || proxy
            .password
            .as_deref()
            .map(|value| !value.is_empty())
            .unwrap_or(false);

    let methods = if has_auth { vec![0x00, 0x02] } else { vec![0x00] };
    let mut method_request = vec![0x05, methods.len() as u8];
    method_request.extend_from_slice(&methods);

    stream
        .write_all(&method_request)
        .map_err(|e| format!("SOCKS5 proxy handshake failed: {}", e))?;

    let mut method_response = [0u8; 2];
    stream
        .read_exact(&mut method_response)
        .map_err(|e| format!("SOCKS5 proxy handshake failed: {}", e))?;

    if method_response[0] != 0x05 {
        return Err("Invalid SOCKS5 proxy response".to_string());
    }

    match method_response[1] {
        0x00 => {}
        0x02 => {
            let username = proxy.username.as_deref().unwrap_or("");
            let password = proxy.password.as_deref().unwrap_or("");

            if username.len() > u8::MAX as usize || password.len() > u8::MAX as usize {
                return Err("SOCKS5 proxy credentials are too long".to_string());
            }

            let mut auth_request = vec![0x01, username.len() as u8];
            auth_request.extend_from_slice(username.as_bytes());
            auth_request.push(password.len() as u8);
            auth_request.extend_from_slice(password.as_bytes());

            stream
                .write_all(&auth_request)
                .map_err(|e| format!("SOCKS5 proxy auth failed: {}", e))?;

            let mut auth_response = [0u8; 2];
            stream
                .read_exact(&mut auth_response)
                .map_err(|e| format!("SOCKS5 proxy auth failed: {}", e))?;

            if auth_response[1] != 0x00 {
                return Err("SOCKS5 proxy authentication rejected".to_string());
            }
        }
        0xff => return Err("SOCKS5 proxy has no acceptable auth method".to_string()),
        method => return Err(format!("Unsupported SOCKS5 auth method {}", method)),
    }

    let mut connect_request = vec![0x05, 0x01, 0x00];
    write_socks5_target(&mut connect_request, &config.host)?;
    connect_request.extend_from_slice(&config.port.to_be_bytes());

    stream
        .write_all(&connect_request)
        .map_err(|e| format!("SOCKS5 proxy CONNECT failed: {}", e))?;

    let mut response_header = [0u8; 4];
    stream
        .read_exact(&mut response_header)
        .map_err(|e| format!("SOCKS5 proxy CONNECT failed: {}", e))?;

    if response_header[0] != 0x05 {
        return Err("Invalid SOCKS5 proxy CONNECT response".to_string());
    }

    if response_header[1] != 0x00 {
        return Err(format!(
            "SOCKS5 proxy CONNECT failed (code {})",
            response_header[1]
        ));
    }

    match response_header[3] {
        0x01 => {
            let mut addr = [0u8; 4];
            stream
                .read_exact(&mut addr)
                .map_err(|e| format!("SOCKS5 proxy CONNECT failed: {}", e))?;
        }
        0x03 => {
            let mut len = [0u8; 1];
            stream
                .read_exact(&mut len)
                .map_err(|e| format!("SOCKS5 proxy CONNECT failed: {}", e))?;
            let mut addr = vec![0u8; len[0] as usize];
            stream
                .read_exact(&mut addr)
                .map_err(|e| format!("SOCKS5 proxy CONNECT failed: {}", e))?;
        }
        0x04 => {
            let mut addr = [0u8; 16];
            stream
                .read_exact(&mut addr)
                .map_err(|e| format!("SOCKS5 proxy CONNECT failed: {}", e))?;
        }
        atyp => return Err(format!("Unsupported SOCKS5 bind address type {}", atyp)),
    }

    let mut bound_port = [0u8; 2];
    stream
        .read_exact(&mut bound_port)
        .map_err(|e| format!("SOCKS5 proxy CONNECT failed: {}", e))?;

    prepare_stream(&stream, socket_io_timeout(timeout))?;
    Ok(stream)
}

fn connect_via_proxy(config: &SshConfig, timeout: Duration) -> Result<TcpStream, String> {
    let proxy = config
        .proxy
        .as_ref()
        .ok_or_else(|| "Proxy mode selected but no proxy profile was found".to_string())?;

    match proxy.proxy_type.to_ascii_lowercase().as_str() {
        "http" | "https" => connect_http_proxy(config, proxy, timeout),
        "socks4" => connect_socks4_proxy(config, proxy, timeout),
        "socks5" => connect_socks5_proxy(config, proxy, timeout),
        other => Err(format!("Unsupported proxy type: {}", other)),
    }
}

fn establish_tcp_stream(config: &SshConfig) -> Result<TcpStream, String> {
    let timeout = sanitized_connect_timeout(config);

    match config.connection_type {
        ConnectionType::Direct => connect_direct_stream(config, timeout),
        ConnectionType::Http | ConnectionType::Socks5 | ConnectionType::Proxy => {
            connect_via_proxy(config, timeout)
        }
    }
}

fn authenticate_session(sess: &Session, config: &SshConfig) -> Result<(), String> {
    let mut last_error = None;

    if let Some(key_content) = &config.private_key {
        if !key_content.trim().is_empty() {
            let passphrase = config.passphrase.as_deref().filter(|value| !value.is_empty());

            match userauth_pubkey_from_memory(sess, &config.username, key_content, passphrase) {
                Ok(_) => return Ok(()),
                Err(err) => {
                    last_error = Some(format!("Public Key Auth Error: {}", err));
                }
            }
        }
    }

    if let Some(password) = &config.password {
        if !password.trim().is_empty() {
            match sess.userauth_password(&config.username, password) {
                Ok(_) => return Ok(()),
                Err(password_err) => {
                    let mut prompter = PasswordPrompter {
                        secret: password.clone(),
                    };

                    match sess.userauth_keyboard_interactive(&config.username, &mut prompter) {
                        Ok(_) => return Ok(()),
                        Err(interactive_err) => {
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

    Err(last_error.unwrap_or_else(|| {
        "Auth failed: No usable private key or password provided.".to_string()
    }))
}

fn userauth_pubkey_from_memory(
    sess: &Session,
    username: &str,
    private_key: &str,
    passphrase: Option<&str>,
) -> Result<(), String> {
    let username_c = CString::new(username).map_err(|_| "Username contains a NUL byte".to_string())?;
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

// ==============================================================================
// [鏂板] 鍏煎鑰佹棫璁惧绠楁硶閰嶇疆鍑芥暟
// ==============================================================================
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

pub fn establish_base_session(config: &SshConfig) -> Result<Session, String> {
    let tcp = establish_tcp_stream(config)?;

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

    if let Some(interval) = config.keep_alive_interval.filter(|interval| *interval > 0) {
        sess.set_keepalive(true, interval);
    }

    authenticate_session(&sess, config)?;

    Ok(sess)
}

pub fn create_shell_channel(config: &SshConfig) -> Result<(Session, Channel), String> {
    let sess = establish_base_session(config)?;

    let mut channel = sess
        .channel_session()
        .map_err(|e| format!("Channel Error: {}", e))?;
    channel
        .request_pty("xterm-256color", None, Some((80, 24, 0, 0)))
        .map_err(|e| format!("PTY Error: {}", e))?;
    channel
        .shell()
        .map_err(|e| format!("Shell Start Error: {}", e))?;

    sess.set_timeout(SHELL_READ_TIMEOUT_MS);

    Ok((sess, channel))
}



pub fn spawn_shell_reader_thread(
    app: AppHandle,
    session: Session,
    channel: Arc<Mutex<Channel>>,
    id: String,
) {
    thread::spawn(move || {
        let mut buf = [0u8; 8192];

        loop {
            let mut chan_lock = match channel.lock() {
                Ok(guard) => guard,
                Err(poisoned) => poisoned.into_inner(),
            };

            match chan_lock.read(&mut buf) {
                Ok(count) if count > 0 => {
                    let data = String::from_utf8_lossy(&buf[..count]).to_string();
                    let _ = app.emit(&format!("term-data-{}", id), data);
                }
                Ok(_) => {
                    if chan_lock.eof() {
                        println!("[SSH] EOF received for session: {}", id);
                        break;
                    }
                }
                Err(err) if matches!(err.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock) => {
                    let should_exit = chan_lock.eof();
                    drop(chan_lock);

                    if should_exit {
                        println!("[SSH] EOF received for session: {}", id);
                        break;
                    }

                    let _ = session.keepalive_send();
                    continue;
                }
                Err(err) => {
                    let should_exit = chan_lock.eof();
                    drop(chan_lock);

                    if should_exit {
                        println!("[SSH] Channel closed for session: {}", id);
                    } else {
                        eprintln!("[SSH] Read Error for session {}: {}", id, err);
                    }
                    break;
                }
            }

            drop(chan_lock);
        }

        println!("[SSH] Shell thread exited for {}", id);
        let _ = app.emit(&format!("term-exit-{}", id), ());
    });
}
