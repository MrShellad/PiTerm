# PiTerm SSH 模块分析：ssh2 → russh 迁移审查

> **审查日期**: 2026-05-20
> **russh 版本**: 0.45 | **russh-keys**: 0.45 | **russh-sftp**: 2.1

---

## 1. 迁移概览

### 1.1 当前状态

迁移已**基本完成**。所有 Rust 后端代码已从同步的 `ssh2` crate 切换到异步的 `russh` 生态系统：

| 组件 | 旧 (ssh2) | 新 (russh) | 状态 |
|------|-----------|------------|------|
| SSH 连接/握手 | `ssh2::Session` | `russh::client::connect_stream` | ✅ 已迁移 |
| 密码认证 | `session.userauth_password()` | `sess.authenticate_password()` | ✅ 已迁移 |
| 公钥认证 | `session.userauth_pubkey_memory()` | `sess.authenticate_publickey()` | ✅ 已迁移 |
| 私钥解析 | 手动处理 | `russh_keys::decode_secret_key()` | ✅ 已迁移 |
| Shell 通道 | `session.channel_session()` | `sess.channel_open_session()` | ✅ 已迁移 |
| PTY 请求 | `channel.request_pty()` | `channel.request_pty()` | ✅ 已迁移 |
| Shell 读写 | 同步 `Read`/`Write` | 异步 `tokio::io::split` + `ChannelStream` | ✅ 已迁移 |
| SFTP | `ssh2::Sftp` | `russh_sftp::client::SftpSession` | ✅ 已迁移 |
| Host Key 验证 | 手动实现 | `client::Handler::check_server_key` | ✅ 已迁移 |
| PTY Resize | `channel.request_pty_size()` | ❌ **未实现** | ⚠️ 遗漏 |

### 1.2 依赖清理

| 检查项 | 结果 |
|--------|------|
| `Cargo.toml` 中的 ssh2 依赖 | ✅ 已移除 |
| `Cargo.lock` 中的 ssh2 残留 | ✅ 无残留 |
| `package.json` 中的 ssh2 相关 | ✅ 无残留 |
| 源码中的 `ssh2` 字面引用 | ✅ 无残留（仅旧文档中有注释） |

---

## 2. 关键问题

### 2.1 🔴 严重：PTY Resize 未实现

**文件**: [session_commands.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/ssh/session_commands.rs#L292-L357)

```rust
// TODO: In russh 0.45, window_change() is on Channel, but we've consumed it
// into a ChannelStream. Need to store the channel sender separately to send
// WindowChange messages after stream conversion. For now, log and skip.
```

**影响**: 用户调整终端窗口大小时，远程 shell 无法感知尺寸变化，导致：
- 命令行输出换行错误
- `vim`/`nano` 等全屏编辑器布局异常
- `top`/`htop` 等 TUI 工具显示不正确

**根因**: 在 russh 0.45 中，`Channel` 被 `into_stream()` 消费后，无法再调用 `window_change()`。需要在调用 `into_stream()` 之前，保存 channel 的 `ChannelId` 并通过 `session.channel_window_change()` 方法发送窗口变更消息。

**建议修复方案**:

```rust
// 在 session_commands.rs 的 resize_ssh 中：
// 使用 shell_session (Handle) + channel_id 发送 window_change
shell_session
    .window_change(channel_id, cols, rows, 0, 0)
    .await
    .map_err(|e| format!("PTY resize failed: {}", e))?;
```

> **注意**: `SshConnection` 中已经存储了 `shell_session` (Handle) 和 `shell_channel_id`，具备修复所需的全部信息。此问题可直接修复。

---

### 2.2 🟡 中等：auto_reconnect / max_reconnects 配置未生效

**涉及文件**:
- [resolver.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/ssh/resolver.rs) — 从 DB 读取配置
- [session_commands.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/ssh/session_commands.rs) — connect_ssh / quick_connect
- [state.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/ssh/state.rs) — SshConnection

**现状**: `SshConfig` 中的 `auto_reconnect` 和 `max_reconnects` 字段从数据库读取并传递，但在 SSH 连接/断开/清理的整个生命周期中**从未被使用**。当 shell reader 检测到 `channel_eof` 或 `channel_read_error` 时，只是发出 `term-exit` 事件，不会尝试自动重连。

**影响**: 用户在 UI 中配置的"自动重连"不会生效。

**建议**: 这可能是迁移前就存在的问题（ssh2 时代也未实现），但作为迁移审查需要标记。如果暂不实现，建议在 UI 中隐藏这些配置项或标记为"开发中"。

---

### 2.3 🟡 中等：SFTP 每次操作重新建立通道

**文件**: [commands.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/fs/commands.rs#L45-L69)

```rust
macro_rules! run_sftp {
    // ...每次 SFTP 操作都会：
    // 1. channel_open_session()
    // 2. request_subsystem("sftp")
    // 3. SftpSession::new(channel.into_stream())
    // 4. 执行操作
    // (通道用完即丢弃)
}
```

**影响**: 每次文件操作（列目录、读写文件等）都重新打开 SFTP channel，增加了延迟和服务器负担。在频繁操作（如目录浏览）时可能明显感觉卡顿。

**建议**: 考虑在 `SshConnection` 上维护一个持久化的 `SftpSession`，通过 `bg_session` 复用已建立的 SFTP 通道。

---

### 2.4 🟢 轻微：残留的无用变量

**文件**: [session_commands.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/ssh/session_commands.rs#L71-L72)

```rust
let _session_id_for_join = session_id.clone();  // Line 71
let _server_id_for_join = server_id.clone();    // Line 72
```

`connect_ssh` 和 `quick_connect` 中各有一对带 `_` 前缀的克隆变量，这些是迁移过程中遗留的死代码。在 ssh2 时代可能用于 `thread::spawn` 中的 join 操作，现在已经不需要。

**建议**: 安全删除这些无用变量。

---

### 2.5 🟢 轻微：shell_reader 中未使用的 `_session` 参数

**文件**: [shell_io.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/ssh/core/shell_io.rs#L103-L106)

```rust
pub fn spawn_shell_reader_thread(
    app: AppHandle,
    _session: Arc<SshSession>,  // ← 未使用
    mut read_half: ...,
```

`_session` 参数在 reader 线程中未被使用。可能是迁移时保留的，用于将来可能的 session 状态检查。

**建议**: 如果确认不需要，可以移除此参数以简化签名。但保留也无害（Arc 引用计数确保 session 不会被提前释放）。

---

## 3. 架构评估

### 3.1 整体架构 ✅ 良好

迁移后的架构设计清晰合理：

```
┌──────────────────────────────────────────────────────┐
│                   Tauri Commands                      │
│  connect_ssh / write_ssh / resize_ssh / disconnect    │
│  check_host_key / trust_host_key                      │
│  list_ssh_files / sftp_upload / sftp_download / ...   │
└────────────┬─────────────────────────┬────────────────┘
             │                         │
    ┌────────▼────────┐       ┌───────▼────────┐
    │   SSH Module     │       │   FS Module     │
    │                  │       │                  │
    │  core/           │       │  session.rs      │
    │   ├─ transport   │◄──────│  sftp_impl.rs    │
    │   ├─ auth        │       │  commands.rs     │
    │   ├─ client      │       └──────────────────┘
    │   ├─ shell_io    │
    │   └─ proxy       │
    │  state.rs        │
    │  background.rs   │
    │  host_key.rs     │
    │  resolver.rs     │
    └──────────────────┘
             │
    ┌────────▼────────┐
    │     russh        │
    │  russh-keys      │
    │  russh-sftp      │
    └─────────────────┘
```

### 3.2 连接生命周期 ✅ 设计合理

每个 SSH 连接 (`SshConnection`) 包含：
- **Shell Session** — 主连接，用于终端交互（通过 `ChannelStream` split 为读写两半）
- **Background Session** — 独立连接，用于 SFTP 操作（异步建立，最多重试 3 次）
- **Instance ID** — 防止新旧会话冲突的单调递增标识
- **Heartbeat** — 前端心跳 + 后端清理线程（15秒检查一次，60秒超时回收）

### 3.3 异步模型 ✅ 正确

- Shell Writer：通过 `mpsc::channel` 队列化写请求，单一 tokio task 串行写入，避免并发写冲突
- Shell Reader：独立 tokio task 读取，通过 Tauri event 推送到前端
- 写操作支持批处理（`SHELL_WRITE_BATCH_LIMIT = 64KB`），减少系统调用次数
- 写入超时 10 秒保护

### 3.4 安全性 ✅ 合理

- Host Key 验证分两阶段：transport 层信任所有 key → Tauri 层通过 `~/.ssh/known_hosts` 文件手动验证
- 凭证通过 AES-256-GCM 加密存储在 SQLite 中
- 私钥解析使用 `russh_keys::decode_secret_key`，支持加密私钥（passphrase）

---

## 4. TCP 层保留同步 — 评估

### 4.1 代理连接使用 `std::net::TcpStream`

**文件**: [proxy.rs](file:///H:/VSCodeWork/piterm/PiTerm/src-tauri/src/commands/ssh/core/proxy.rs)

TCP 连接建立（包括直连和代理握手）使用的是同步 `std::net::TcpStream`，在完成握手后转为 `tokio::net::TcpStream`：

```rust
tcp.set_nonblocking(true)?;
let async_stream = tokio::net::TcpStream::from_std(tcp)?;
```

**评估**: 这是一个合理的设计选择。TCP 连接和代理协议握手（HTTP CONNECT / SOCKS4 / SOCKS5）是一次性的短暂操作，使用同步代码更清晰。代码通过 `connect_timeout` 和 `set_read_timeout` / `set_write_timeout` 对这些同步操作设置了超时保护，不会无限阻塞 tokio 运行时。

> ⚠️ **风险提醒**: 如果 DNS 解析较慢，`to_socket_addrs()` 可能会阻塞 tokio 工作线程。目前通过 `connect_timeout`（默认 10 秒）间接保护，但极端情况下可能影响其他异步任务。如果未来遇到此问题，可考虑使用 `tokio::task::spawn_blocking` 包装 TCP 连接建立。

---

## 5. 代码质量观察

### 5.1 日志系统 ✅ 优秀

SSH 模块拥有结构化的日志系统 (`ssh_log`)，覆盖了连接、认证、shell IO、SFTP 操作的完整生命周期。日志包含 `session_id`、`instance_id`、`connection_role` 等上下文字段，非常有利于问题排查。

### 5.2 错误处理 ✅ 良好

- Mutex poisoning 在所有地方得到了正确处理（使用 `into_inner()` 恢复）
- 错误消息清晰，包含操作上下文
- 网络操作有超时保护

### 5.3 Poisoned Mutex 处理 — 一致且保守

所有 `Mutex::lock()` 调用都处理了 poisoned 情况，策略是恢复内部值并继续操作。这对于 SSH 客户端来说是合理的——即使某个线程 panic 了，其他连接的状态通常仍然有效。

---

## 6. 修复优先级建议

| 优先级 | 问题 | 影响 | 修复难度 |
|--------|------|------|----------|
| 🔴 P0 | PTY Resize 未实现 | 终端使用体验严重受损 | 低（信息已就绪，仅需调用 API） |
| 🟡 P1 | auto_reconnect 未实现 | 配置项无效 | 中（需设计重连状态机） |
| 🟡 P2 | SFTP 通道无复用 | 性能影响 | 中（需管理通道生命周期） |
| 🟢 P3 | 残留死代码 | 代码整洁 | 极低 |

---

## 7. 总结

从 `ssh2` 到 `russh` 的迁移总体质量**很高**：

- ✅ 依赖完全切换，无 ssh2 残留
- ✅ 异步模型正确，充分利用了 tokio 运行时
- ✅ 代码架构清晰，模块职责分明
- ✅ 日志、错误处理、超时保护完善
- ⚠️ PTY Resize 是唯一的功能回归，需优先修复
- ⚠️ auto_reconnect 属于功能缺失（非回归），可后续迭代
