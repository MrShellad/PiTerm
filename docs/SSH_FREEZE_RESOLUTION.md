# SSH 会话关闭时程序冻结问题分析与修复方案

## 1. 问题描述
在 PiTerm 中关闭 SSH 会话时，程序会出现明显的冻结（未响应）现象。这种现象在网络延迟较高或终端正在大量输出数据时尤为严重。

## 2. 核心原因分析

### 2.1 `Drop` 实现中的死锁风险
在 `src-tauri/src/commands/ssh/state.rs` 中，`SshConnection` 结构体实现了自定义的 `Drop` 特性。

```rust
// state.rs
impl Drop for SshConnection {
    fn drop(&mut self) {
        if let Ok(mut channel) = self.shell_channel.lock() { // 1. 尝试获取锁
            let _ = channel.close();
            let _ = channel.wait_close(); // 2. 阻塞式网络调用
        }
        // ... 其他 session 的清理
    }
}
```

**问题点：**
*   **死锁/阻塞获取锁**：终端读取线程 (`spawn_shell_reader_thread`) 会长期持有 `shell_channel` 的锁来进行读取操作。当 `disconnect_ssh` 被调用并从 Map 中移除连接时会触发 `drop`。如果此时读取线程正阻塞在 `read` 上，`drop` 线程（主线程或 Tauri 指令线程）将无限期等待该锁。
*   **同步网络调用**：`channel.wait_close()` 是一个阻塞式的网络操作，它会等待服务器确认。在网络状况不佳时，这会导致调用线程挂起。

### 2.2 同步指令阻塞主循环
`disconnect_ssh` 在 `mod.rs` 中被定义为普通的同步函数 (`pub fn`)。这意味着它在执行期间会直接阻塞 Tauri 的消息处理线程。如果 `Drop` 逻辑耗时较长或发生阻塞，整个 UI 就会失去响应。

### 2.3 背景监控任务的干扰
CPU、内存等监控指令使用了 `bg_session`。这些指令在执行时也会对 session 加锁。如果 `disconnect_ssh` 触发 `drop` 时，某个监控任务正在执行且持有锁，`drop` 同样会阻塞。

---

## 3. 修复方案建议

为了彻底解决冻结问题，建议采用以下重构思路：

### 3.1 移除阻塞式的 `Drop` 逻辑
*   **操作**：删除 `SshConnection` 的 `Drop` 实现。
*   **理由**：Rust 的 `Arc<Mutex<...>>` 会在最后一个引用消失时自动清理资源。显式的清理逻辑（如 `disconnect`）应当放在异步任务中进行，而不是在不可控的 `drop` 时机。

### 3.2 引入异步清理机制
将 `disconnect_ssh` 改为 `async` 函数，并采用“先标记、后清理”的策略：
1.  从会话 Map 中移除连接（立即释放所有权）。
2.  在异步任务中尝试进行优雅关闭，如果获取锁失败，则直接放弃，让内核在 TCP 层面处理连接重置。

### 3.3 优化读取线程退出逻辑
修改 `spawn_shell_reader_thread` 中的循环：
*   在每次循环开始前，检查 session 是否仍然有效（或引入 `CancellationToken`）。
*   缩短读取超时时间，确保线程能快速响应退出信号。
*   即使读取失败，也应检测 session 状态，若已断开则立即退出。

## 4. 总结
程序冻结的根本原因是**在同步的 Drop 生命周期内执行了阻塞式的加锁和网络 IO 操作**。通过将清理逻辑与 `drop` 解耦，并改用异步/非阻塞的方式处理会话关闭，可以完全消除冻结现象。
