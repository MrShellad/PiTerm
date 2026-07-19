# PiTerm Agent MCP (WebSocket) 服务接入文档

PiTerm 内置了一个轻量、安全的 WebSocket 服务，专门用于对接 AI Agent（智能体）或外部控制台。通过该服务，外部 Agent 可以获取 PiTerm 中的活动 SSH 会话列表、连接新的服务器、读取终端历史输出、订阅实时数据流以及写入终端命令，从而实现“终端操作自动化”与“双人成行”协同工作。

---

## 1. 服务配置

在 PiTerm 的全局配置文件（`settings.json`）中，您可以通过以下两个关键字段控制该服务的启停及网络端口：

| 配置键名 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `connection.agentWsEnabled` | `boolean` | `false` | 是否启用 Agent WebSocket 服务。 |
| `connection.agentWsPort` | `number`/`string` | `18133` | 服务监听的本地端口号。 |

当在设置中启用服务后，PiTerm 后端会立即在本地启动 WebSocket 服务器，默认地址为 `127.0.0.1:18133`。

---

## 2. 鉴权机制 (Authentication)

为了保证系统安全，防止本地其他未授权程序恶意操作终端，服务采用了**基于 Token 的连接鉴权验证**：

1. **Token 生成**：PiTerm 每次启动服务时，都会在后台随机生成一个高强度的 UUID 安全凭证。
2. **Token 保存位置**：生成的凭证会被写入本地磁盘：
   ```plaintext
   C:\Users\fakba\.gemini\antigravity\agent_token.txt
   ```
3. **连接地址格式**：客户端在连接 WebSocket 时，**必须**将该 Token 作为 Query 参数传递：
   ```plaintext
   ws://127.0.0.1:<端口>/?token=<Token值>
   ```
   *如果 Token 缺失或不匹配，服务器将直接返回 `401 Unauthorized` 错误并拒绝建立握手连接。*

---

## 3. 通信协议规范

连接建立后，所有的请求（Request）和响应（Response）均使用 **JSON 格式** 进行双向通信。

### 统一数据结构

#### 请求格式 (Request)
```json
{
  "action": "请求动作类型",
  "session_id": "会话 UUID (可选)",
  "server_id": "服务器 UUID (可选)",
  "server_name": "服务器名称 (可选)",
  "data": "要写入的内容 (可选)",
  "cols": "终端列数 (可选)",
  "rows": "终端行数 (可选)"
}
```

#### 响应格式 (Response)
```json
{
  "status": "success | error",
  "action": "对应的请求动作类型",
  "sessions": [ /* 会话列表数据 (仅限 list_sessions) */ ],
  "session_id": "返回的会话 UUID (仅限 connect / get_terminal_content)",
  "content": "终端输出的历史字符内容 (仅限 get_terminal_content)",
  "error": "错误信息 (当 status 为 error 时返回)"
}
```

---

## 4. 支持的 API 动作列表

### 4.1 获取活动会话列表 (`list_sessions`)
查询当前 PiTerm 中已经建立并处于活跃状态 of SSH 会话列表。

* **客户端发送**：
  ```json
  { "action": "list_sessions" }
  ```
* **服务器返回**：
  ```json
  {
    "status": "success",
    "action": "list_sessions",
    "sessions": [
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "生产环境数据库",
        "host": "192.168.1.100",
        "user": "root"
      }
    ]
  }
  ```

---

### 4.2 连接服务器建立新会话 (`connect`)
控制 PiTerm 后端去连接指定的远程 SSH 服务器，并自动注册一个新会话。

* **客户端发送（通过 `server_id` 或 `server_name`）**：
  ```json
  {
    "action": "connect",
    "server_name": "生产环境数据库" 
  }
  ```
* **服务器返回**：
  ```json
  {
    "status": "success",
    "action": "connect",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
  }
  ```

---

### 4.3 获取终端历史内容 (`get_terminal_content`)
获取指定 SSH 会话自建立以来在后台保存的所有终端历史输出（类似于屏幕缓冲区快照）。

* **客户端发送**：
  ```json
  {
    "action": "get_terminal_content",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
  }
  ```
* **服务器返回**：
  ```json
  {
    "status": "success",
    "action": "get_terminal_content",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "content": "Linux prod-db 5.15.0-72-generic #78-Ubuntu SMP...\r\nroot@prod-db:~# "
  }
  ```

---

### 4.4 订阅实时输出数据流 (`subscribe`)
订阅指定会话。订阅成功后，一旦终端有新的数据输出（如命令执行结果、系统日志），服务器会主动向客户端推送消息。

* **客户端发送**：
  ```json
  {
    "action": "subscribe",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
  }
  ```
* **服务器返回确认**：
  ```json
  {
    "status": "success",
    "action": "subscribe"
  }
  ```
* **后续实时推送数据（JSON）**：
  ```json
  {
    "event": "data",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "data": "ping 127.0.0.1\r\n"
  }
  ```

---

### 4.5 写入终端数据/命令 (`write`)
向指定会话的 Shell 进程写入原始字符或执行命令（例如键入命令并加上回车键 `\r` 提交）。

* **客户端发送**：
  ```json
  {
    "action": "write",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "data": "ls -la\r"
  }
  ```
* **服务器返回**：
  ```json
  {
    "status": "success",
    "action": "write"
  }
  ```

---

### 4.6 调整终端视口大小 (`resize`)
动态修改后台虚拟终端（PTY）的大小，以匹配外部客户端的界面宽度与高度。

* **客户端发送**：
  ```json
  {
    "action": "resize",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "cols": 120,
    "rows": 40
  }
  ```
* **服务器返回**：
  ```json
  {
    "status": "success",
    "action": "resize"
  }
  ```

---

## 5. 快速开始示例 (Python)

下面是一个使用 Python `websockets` 库的简单客户端脚本，展示了如何读取 Token、连接服务并监控实时输出：

```python
import asyncio
import json
import os

async def main():
    # 1. 从固定路径读取鉴权 Token
    token_path = r"C:\Users\fakba\.gemini\antigravity\agent_token.txt"
    if not os.path.exists(token_path):
        print("未找到 Token 文件，请确保 PiTerm 已运行且启用了 Agent WS 功能！")
        return
        
    with open(token_path, "r", encoding="utf-8") as f:
        token = f.read().strip()

    # 2. 建立连接 (假设端口为默认的 18133)
    uri = f"ws://127.0.0.1:18133/?token={token}"
    
    import websockets
    async with websockets.connect(uri) as websocket:
        print("🎉 成功连接到 PiTerm Agent MCP 服务！")

        # 3. 发送请求：列出当前活跃会话
        await websocket.send(json.dumps({
            "action": "list_sessions"
        }))
        
        response = await websocket.recv()
        data = json.loads(response)
        print("当前会话列表：", json.dumps(data, indent=2, ensure_ascii=False))

        if data["status"] == "success" and data["sessions"]:
            session_id = data["sessions"][0]["id"]
            
            # 4. 订阅第一个会话的实时输入输出
            await websocket.send(json.dumps({
                "action": "subscribe",
                "session_id": session_id
            }))
            await websocket.recv() # 忽略确认包
            print(f"📡 已成功订阅会话: {session_id}，正在监听数据流...")

            # 5. 向终端发送一个 `pwd` 命令
            await websocket.send(json.dumps({
                "action": "write",
                "session_id": session_id,
                "data": "pwd\r"
            }))

            # 6. 持续接收实时更新数据
            async for message in websocket:
                event_data = json.loads(message)
                if event_data.get("event") == "data":
                    print(f"[Terminal Feed]: {event_data['data']}", end="")

if __name__ == "__main__":
    asyncio.run(main())
```
