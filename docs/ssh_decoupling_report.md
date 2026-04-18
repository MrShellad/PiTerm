# PiTerm SSH 模块解耦方案分析报告

本报告对 `src-tauri/src/commands/ssh/mod.rs` 的现状进行了深度分析，并提出了合理的解耦方案。

## 1. 现状分析 (Problem Statement)

目前的 `ssh/mod.rs` 文件是一个典型的“大杂烩”模块（God Module），代码量约 860 行，承担了过多的职责：

- **IPC 通信 (Tauri Commands)**：处理前端请求、状态注入、错误返回。
- **业务逻辑 (Business Logic)**：SSH 握手、密钥校验、指纹计算。
- **数据访问 (Data Access)**：直接进行 SQL 查询，获取服务器和代理信息。
- **安全集成 (Security)**：与 Vault 交互，解密敏感凭据。
- **文件操作 (I/O)**：读写 `known_hosts` 文件。
- **字符串清洗**：私钥格式化、日志格式化等。

### 存在的问题：
1. **代码重复度高**：`connect_ssh` 和 `test_connection` 中关于凭据解析（密码 vs 私钥、Vault vs 直接获取）的逻辑重复率超过 80%。
2. **可维护性差**：安全敏感的解密逻辑与普通的 UI 交互逻辑混在一起，难以直观审计。
3. **难以测试**：逻辑被封装在 `#[tauri::command]` 宏下，如果不启动 Tauri 运行时几乎无法进行单元测试。

---

## 2. 解耦方案 (Proposed Solution)

建议采用 **Service/Manager** 模式，将职责垂直拆分到专门的子模块中。

### 2.1 模块结构方案

重构后的目录结构：
```text
src-tauri/src/commands/ssh/
├── mod.rs          # 命令层：仅作为入口，负责参数提取和错误分发
├── core.rs         # 底层驱动：负责具体的 SSH/TCP/Proxy 协议实现 (已存在)
├── state.rs        # 状态定义：Session 和 Cache 的定义 (已存在)
├── resolver.rs     # 【新增】解析服务：负责从 DB/Vault 解析 SshConfig
├── host_key.rs     # 【新增】主机服务：负责 known_hosts 读写和指纹校验
└── utils.rs        # 【新增】通用工具：日志推送、私钥格式化清洗
```

### 2.2 核心服务定义

#### A. 配置解析器 (`resolver.rs`)
专门处理“从 ID 到配置”的转换。
- **核心接口**: `resolve_config(db, vault_key, server_id) -> Result<SshConfig>`
- **价值**: 统一处理 `auth_type` 的分支逻辑、Vault 解密逻辑、以及私钥的特殊格式清洗。

#### B. 主机密钥管理器 (`host_key.rs`)
封装所有身份验证逻辑。
- **核心接口**: `check_local(app, host, port, key) -> Result<Status>`
- **核心接口**: `save_to_disk(app, host, port, key) -> Result<()>`
- **价值**: 隐藏文件 I/O 细节，提供更语义化的接口。

#### C. 工具集 (`utils.rs`)
- **功能**: 清洗私钥头部、计算 SHA256 指纹、统一日志推送格式。

---

## 3. 实施细节 (Implementation Details)

### 第一阶段：提取工具类 (Utils)
将 `mod.rs` 中的私钥清洗逻辑（15行以上重复代码）和指纹计算逻辑提取到 `utils.rs`。

### 第二阶段：拆分主机密钥逻辑
将 `check_host_key` 和 `trust_host_key` 中的文件操作移至 `host_key.rs`。

### 第三阶段：重构连接逻辑
1. 在 `resolver.rs` 中实现统一的凭据加载逻辑。
2. 重构 `connect_ssh` 和 `test_connection`，使其通过 `resolver` 获取 `SshConfig`，然后调用 `core.rs` 进行连接。

---

## 4. 预期收益 (Benefits)

1. **显著缩减 mod.rs**：预计可将该文件缩减至 300 行以内。
2. **逻辑复用**：连接测试和正式连接共用一套凭据加载代码。
3. **易于扩展**：未来若增加新的认证方式（如 SSH Agent）或存储方式，只需修改 `resolver.rs`。
4. **提升健壮性**：业务逻辑可以脱离 Tauri Command 进行独立单元测试。
