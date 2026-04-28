# 前端解耦分析与架构优化建议

## 1. 现状分析
当前 PiTerm 前端采用功能模块化 (Feature-based) 的目录结构，这在大型项目中是一个好的起点。然而，在具体实现中，多个核心模块（尤其是 Terminal 和 File System）存在严重的耦合问题，导致代码难以维护、测试，并引发了潜在的循环依赖。

## 2. 核心耦合点分析

### 2.1 终端模块的“上帝 Hook” (Monolithic Hooks)
`useTerminalAutocomplete` 和 `useTerminalConnection` 承担了过多的职责：
- **useTerminalAutocomplete**：同时负责输入缓冲跟踪、光标位置计算、多源数据（历史、片段）获取、弹窗状态控制、按键拦截逻辑。
- **后果**：任何一个子功能的变动都会导致整个 Hook 的重新渲染或逻辑抖动，且逻辑极其复杂。

### 2.2 跨特性直接依赖与双向绑定 (Tight Cross-Feature Coupling)
模块之间存在复杂的直接引用和逻辑缠绕：
- **终端依赖文件系统**：`useTerminalTracking` 监听终端标题变化，并直接调用 `useFileStore` 来更新文件列表路径。
- **文件系统依赖终端**：`useFileActions` 中的 `openTerminal` 动作直接导入并调用 `TerminalService.writeSsh` 向终端发送 `cd` 命令。
- **后果**：这种双向依赖（Cross-Leakage）使得两个模块无法独立运行。如果想移除其中一个模块，另一个模块会因为缺少导入而崩溃。

### 2.3 巨型 Hook 问题 (Fat Hooks)
- **useFileActions (17KB)**：集成了 SFTP 上传/下载/删除/重命名/权限修改、剪贴板管理、多窗口编辑器打开逻辑。
- **后果**：单个文件过大，单元测试几乎不可能覆盖所有逻辑路径。

### 2.4 UI 组件逻辑过载 (Fat Components)
`XtermView.tsx` 协调了过多的次级功能：自动补全弹窗、右键菜单、密码校验、连接状态遮罩。

### 2.5 服务层缺乏抽象 (Missing Abstraction Layer)
前端 Service 直接与 Tauri 的 `invoke` 绑定，无法在 Mock 环境下运行。

---

## 3. 解耦方案建议

### 3.1 抽象“建议提供者” (Suggestion Provider Pattern)
将 `useTerminalAutocomplete` 中的搜索逻辑解耦。定义一个通用的 `SuggestionProvider` 接口，终端只负责维护输入上下文，建议来源（历史、片段、AI）作为插件注入。

### 3.2 引入消息总线/命令模式 (Message Bus / Commands)
解决模块间的双向依赖。
- **FS -> Terminal**: FS 发出 `REQUEST_CD` 命令，终端订阅并执行，不直接调用 `TerminalService`。
- **Terminal -> FS**: 终端发出 `WORKING_DIR_CHANGED` 事件，FS 监听并更新列表。

### 3.3 按领域拆分巨型 Hook (Domain-Driven Hook Split)
将 `useFileActions` 拆分为 `useFileTransfer` (传输)、`useFileOperations` (原子操作)、`useFileClipboard` (剪贴板) 等。

### 3.4 细粒度组件拆分 (Component Atomic Design)
将 `XtermView` 中的外围功能抽离为独立的逻辑组件或“插件”，通过配置驱动加载。

---

## 4. 后续优化步骤

1.  **第一阶段 (接口化)**：为建议搜索和高亮处理定义抽象接口。
2.  **第二阶段 (命令模式)**：建立简单的内部事件中心，解开 Terminal 和 FS 的硬编码绑定。
3.  **第三阶段 (重构 God Hook)**：按职责边界分阶段拆解 10KB+ 的巨型 Hook。
