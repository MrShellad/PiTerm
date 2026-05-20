use std::io::{Read, Write};
use std::net::{Ipv4Addr, Ipv6Addr, SocketAddr, TcpStream, ToSocketAddrs};
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

use crate::models::{ConnectionType, Proxy, SshConfig};

use super::{sanitized_connect_timeout, DEFAULT_IO_TIMEOUT_SECS, HTTP_PROXY_RESPONSE_LIMIT};

fn socket_io_timeout(timeout: Duration) -> Duration {
    Duration::from_secs(timeout.as_secs().max(DEFAULT_IO_TIMEOUT_SECS))
}

fn strip_ipv6_brackets(host: &str) -> &str {
    host.strip_prefix('[')
        .and_then(|value| value.strip_suffix(']'))
        .unwrap_or(host)
}

fn http_authority(host: &str, port: u16) -> String {
    let normalized_host = strip_ipv6_brackets(host);

    if normalized_host.parse::<Ipv6Addr>().is_ok() {
        format!("[{}]:{}", normalized_host, port)
    } else {
        format!("{}:{}", normalized_host, port)
    }
}

fn resolve_socket_addrs(host: &str, port: u16) -> Result<Vec<SocketAddr>, String> {
    (strip_ipv6_brackets(host), port)
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

fn connect_proxy_stream(proxy: &Proxy, timeout: Duration) -> Result<TcpStream, String> {
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
    let target_authority = http_authority(&config.host, config.port);

    let mut request = format!(
        "CONNECT {} HTTP/1.1\r\nHost: {}\r\nProxy-Connection: Keep-Alive\r\n",
        target_authority, target_authority
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
    let normalized_host = strip_ipv6_brackets(&config.host);

    if normalized_host.parse::<Ipv6Addr>().is_ok() {
        return Err(
            "SOCKS4 proxy does not support IPv6 targets; use SOCKS5 or HTTP proxy".to_string(),
        );
    }

    let mut request = Vec::with_capacity(9 + normalized_host.len());

    request.push(0x04);
    request.push(0x01);
    request.extend_from_slice(&config.port.to_be_bytes());

    match normalized_host.parse::<Ipv4Addr>() {
        Ok(ipv4) => request.extend_from_slice(&ipv4.octets()),
        Err(_) => request.extend_from_slice(&[0, 0, 0, 1]),
    }

    request.extend_from_slice(proxy.username.as_deref().unwrap_or("").as_bytes());
    request.push(0);

    if normalized_host.parse::<Ipv4Addr>().is_err() {
        request.extend_from_slice(normalized_host.as_bytes());
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
        return Err(format!(
            "SOCKS4 proxy CONNECT failed (code {})",
            response[1]
        ));
    }

    prepare_stream(&stream, socket_io_timeout(timeout))?;
    Ok(stream)
}

fn write_socks5_target(request: &mut Vec<u8>, host: &str) -> Result<(), String> {
    let normalized_host = strip_ipv6_brackets(host);

    if let Ok(ipv4) = normalized_host.parse::<Ipv4Addr>() {
        request.push(0x01);
        request.extend_from_slice(&ipv4.octets());
        return Ok(());
    }

    if let Ok(ipv6) = normalized_host.parse::<Ipv6Addr>() {
        request.push(0x04);
        request.extend_from_slice(&ipv6.octets());
        return Ok(());
    }

    if normalized_host.len() > u8::MAX as usize {
        return Err("SOCKS5 target host is too long".to_string());
    }

    request.push(0x03);
    request.push(normalized_host.len() as u8);
    request.extend_from_slice(normalized_host.as_bytes());
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

    let methods = if has_auth {
        vec![0x00, 0x02]
    } else {
        vec![0x00]
    };
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

pub fn establish_tcp_stream(config: &SshConfig) -> Result<TcpStream, String> {
    let timeout = sanitized_connect_timeout(config);

    match config.connection_type {
        ConnectionType::Direct => connect_direct_stream(config, timeout),
        ConnectionType::Http | ConnectionType::Socks5 | ConnectionType::Proxy => {
            connect_via_proxy(config, timeout)
        }
    }
}
