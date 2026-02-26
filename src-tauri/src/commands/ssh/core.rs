use std::io::Read;
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::fs; // [必须] 引入文件操作
use std::env; // [必须] 引入环境路径

use ssh2::{Channel, Session, MethodType};
use tauri::{AppHandle, Emitter};
use crate::models::SshConfig;


// ==============================================================================
// [新增] 兼容老旧设备算法配置函数
// ==============================================================================
pub fn configure_legacy_algorithms(sess: &mut Session) {
    // 1. KEX (密钥交换): 把现代算法放在前面，把 diffie-hellman-group14-sha1 等老算法追加在后面
    let kex_methods = "curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256,diffie-hellman-group14-sha1,diffie-hellman-group1-sha1,diffie-hellman-group-exchange-sha1";
    
    // 2. HostKey (主机密钥): 追加 ssh-rsa, ssh-dss
    let hostkey_methods = "ssh-ed25519,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,rsa-sha2-512,rsa-sha2-256,ssh-rsa,ssh-dss";

    // 3. Cipher & MAC (可选，但为了最大限度兼容老旧交换机/路由器，建议加上 3des-cbc 和 hmac-sha1)
    let cipher_methods = "aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr,aes256-cbc,aes192-cbc,aes128-cbc,3des-cbc";
    let mac_methods = "hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256,hmac-sha1";

    let _ = sess.method_pref(MethodType::Kex, kex_methods);
    let _ = sess.method_pref(MethodType::HostKey, hostkey_methods);
    let _ = sess.method_pref(MethodType::CryptCs, cipher_methods);
    let _ = sess.method_pref(MethodType::CryptSc, cipher_methods);
    let _ = sess.method_pref(MethodType::MacCs, mac_methods);
    let _ = sess.method_pref(MethodType::MacSc, mac_methods);
}

/// 建立基础 TCP 和 SSH 会话连接
/// 这是一个通用辅助函数，被 Shell、Monitor、SFTP 三者共用
pub fn establish_base_session(config: &SshConfig) -> Result<Session, String> {
    let addr_str = format!("{}:{}", config.host, config.port);
    let mut addrs = addr_str
        .to_socket_addrs()
        .map_err(|e| format!("DNS Error: {}", e))?;
    let addr = addrs.next().ok_or("DNS resolution failed")?;

    // 1. 建立 TCP 连接 (5秒超时)
    let tcp = TcpStream::connect_timeout(&addr, Duration::from_secs(5))
        .map_err(|e| format!("TCP Error: {}", e))?;

    // [优化] 设置 TCP KeepAlive，防止长时间空闲断开
    let _ = tcp.set_read_timeout(Some(Duration::from_secs(60)));
    let _ = tcp.set_write_timeout(Some(Duration::from_secs(60)));

    let mut sess = Session::new().map_err(|e| format!("Session Init Error: {}", e))?;
    configure_legacy_algorithms(&mut sess);
    sess.set_tcp_stream(tcp);
    sess.handshake()
        .map_err(|e| format!("Handshake Error: {}", e))?;

    // --- 鉴权逻辑 (兼容稳健版) ---
    
    // 2. 优先尝试私钥认证
    if let Some(key_content) = &config.private_key {
        if !key_content.trim().is_empty() {
            // A. 创建临时文件路径 (使用 ID 避免冲突)
            let mut temp_key_path = env::temp_dir();
            temp_key_path.push(format!("ssh_key_{}.pem", config.id));

            // B. 将私钥内容写入临时文件
            // 注意：fs::write 会自动创建或覆盖文件
            if let Err(e) = fs::write(&temp_key_path, key_content) {
                return Err(format!("Failed to create temp key file: {}", e));
            }

            // C. 使用 userauth_pubkey_file (兼容所有版本 ssh2)
            // 参数2传 None，让 libssh2 自动从私钥推导公钥
            let pass = config.passphrase.as_deref().filter(|s| !s.is_empty());
            let auth_result = sess.userauth_pubkey_file(
                &config.username,
                None,
                &temp_key_path,
                pass,
            );

            // D. 无论成功失败，立即删除临时文件 (确保安全)
            let _ = fs::remove_file(&temp_key_path);

            // E. 检查认证结果
            match auth_result {
                Ok(_) => return Ok(sess),
                Err(e) => {
                    // 如果私钥失败，打印日志，不直接返回错误，继续尝试密码
                    println!("[SSH Auth] Key file auth failed: {}, trying password...", e);
                }
            }
        }
    }

    // 3. 尝试密码认证
    if let Some(pwd) = &config.password {
        sess.userauth_password(&config.username, pwd)
            .map_err(|e| format!("Password Auth Error: {} (Check username/password)", e))?;
        
        return Ok(sess);
    }

    // 4. 如果都没有，报错
    Err("Auth failed: No private key or password provided.".to_string())
}

/// 建立 Shell 通道 (Session A)
/// 用途：终端交互，非阻塞模式
pub fn create_shell_channel(config: &SshConfig) -> Result<(Session, Channel), String> {
    let mut sess = establish_base_session(config)?;

    let mut channel = sess
        .channel_session()
        .map_err(|e| format!("Channel Error: {}", e))?;
    channel
        .request_pty("xterm", None, Some((80, 24, 0, 0)))
        .map_err(|e| format!("PTY Error: {}", e))?;
    channel
        .shell()
        .map_err(|e| format!("Shell Start Error: {}", e))?;

    // Shell 需要非阻塞以配合轮询读取
    sess.set_blocking(false);

    Ok((sess, channel))
}

/// 尝试建立监控会话 (Session B)
/// 用途：CPU/内存/磁盘读数，阻塞模式 (配合 spawn_blocking 使用)
pub fn create_monitor_session(config: &SshConfig) -> Option<Session> {
    match establish_base_session(config) {
        Ok(sess) => {
            // println!("[SSH] Monitor connection established for {}", config.id);
            Some(sess)
        }
        Err(e) => {
            eprintln!(
                "[SSH] WARNING: Monitor connection failed: {}. Monitoring disabled.",
                e
            );
            None
        }
    }
}

/// 尝试建立 SFTP 会话 (Session C)
/// 用途：文件列表/上传/下载，阻塞模式 (配合 spawn_blocking 使用)
pub fn create_sftp_session(config: &SshConfig) -> Option<Session> {
    match establish_base_session(config) {
        Ok(sess) => {
            // println!("[SSH] SFTP connection established for {}", config.id);
            Some(sess)
        }
        Err(e) => {
            eprintln!(
                "[SSH] WARNING: SFTP connection failed: {}. File manager disabled.",
                e
            );
            None
        }
    }
}

/// 启动读取线程
/// 仅用于 Shell 的输出读取
pub fn spawn_shell_reader_thread(app: AppHandle, channel: Arc<Mutex<Channel>>, id: String) {
    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            // 获取锁进行读取
            // 使用 match 处理锁可能中毒的情况
            let mut chan_lock = match channel.lock() {
                Ok(guard) => guard,
                Err(poisoned) => poisoned.into_inner(),
            };

            match chan_lock.read(&mut buf) {
                Ok(count) if count > 0 => {
                    let data = String::from_utf8_lossy(&buf[..count]).to_string();
                    // println!("📺 [Term Data] ID: {} | Len: {}", id, count);
                    let _ = app.emit(&format!("term-data-{}", id), data);
                }
                Ok(_) => {
                    if chan_lock.eof() {
                        println!("[SSH] EOF received for session: {}", id);
                        break;
                    }
                }
                Err(e) => {
                    if e.kind() == std::io::ErrorKind::WouldBlock {
                        // 非阻塞模式下没有数据，释放锁并休眠一小会
                        drop(chan_lock);
                        thread::sleep(Duration::from_millis(10));
                        continue;
                    } else {
                        eprintln!("[SSH] Read Error for session {}: {}", id, e);
                        break;
                    }
                }
            }
            // 读取完一次后释放锁，给写入操作机会
            drop(chan_lock);
        }
        
        println!("[SSH] Shell thread exited for {}", id);
        // [新增] 通知前端连接断开
        let _ = app.emit(&format!("term-exit-{}", id), ());
    });
}