# 命令联想补全性能分析与解决方案

## 1. 问题描述
用户反馈在输入命令时（如输入 20 个字符），终端显示严重滞后，命令卡在前几个字符。这通常是由于 UI 线程被阻塞，导致 XTerm.js 无法及时处理和渲染后端回显（Echo）数据。

## 2. 核心性能瓶颈分析

### 2.1 频繁的布局抖动 (Layout Thrashing)
在 `useTerminalAutocomplete.ts` 中，`onCursorMove` 监听器在弹出窗口可见时会调用 `updateCursorPosition`：
- `updateCursorPosition` 内部调用了 `getBoundingClientRect()`。
- **影响**：每次服务器回显字符（Echo）都会触发光标移动，从而触发 `getBoundingClientRect()`。这会强制浏览器进行同步布局计算（Reflow），在快速输入时会导致 UI 严重卡顿。

### 2.2 冗余的 IPC 通讯与数据处理
在 `search` 函数中：
- 每次搜索都会调用 `SnippetService.getAll()`。
- **影响**：
    1. 触发一次额外的 Tauri IPC 调用 (`get_all_snippets`)。
    2. 如果代码片段（Snippets）数量较多，频繁的 JSON 序列化和反序列化会消耗大量 CPU。
    3. 获取所有数据后在 JS 端进行 `filter`，效率低下。

### 2.3 React 渲染频率过高
- `cursorInfo`、`suggestions`、`visible` 等状态直接定义在 `useTerminalAutocomplete` Hook 中，并返回给 `XtermView`。
- **影响**：每次坐标微调或搜索结果更新都会导致 `XtermView` 及其子组件重新渲染。虽然 React 有 Diff 机制，但在高频输入场景下，累积的渲染开销仍然可观。

### 2.4 Effect 闭包频繁销毁与重建
`useTerminalAutocomplete` 中的 `useEffect` 依赖项包含了 `suggestions`、`visible` 和 `selectedIndex`。
- **影响**：每当用户通过方向键选择建议，或者搜索结果变化时，`onData` 和 `onCursorMove` 的监听器都会被 `dispose` 并重新注册。这种高频的订阅切换增加了系统的抖动。

---

## 3. 解决方案

### 3.1 优化光标追踪 (Cursor Tracking)
- **改进策略**：取消对 `onCursorMove` 的实时坐标计算。改为仅在弹出窗显示瞬间计算一次位置，或者对坐标更新进行节流（Throttle）。
- **优化点**：由于大多数情况下用户是在当前行输入，X 坐标的偏移可以通过字符宽度简单累加，避免频繁调用 `getBoundingClientRect`。

### 3.2 引入 Snippets 缓存机制
- **改进策略**：在 `useTerminalAutocomplete` 挂载时或初次搜索时获取一次 Snippets 并缓存，后续搜索直接在内存中过滤。
- **优化点**：减少 IPC 调用次数，降低后端负担。

### 3.3 监听器与状态解耦
- **改进策略**：将 `onData` 监听器放入一个不依赖频繁变动状态（如 `selectedIndex`）的 `useEffect` 中。使用 `useRef` 来保存最新的状态，确保监听器在整个生命周期内保持稳定。
- **优化点**：消除不必要的订阅销毁/重建开销。

### 3.4 搜索频率优化
- **改进策略**：调优 `DEBOUNCE_MS`（当前 200ms 比较合理，但可以考虑针对极短输入不触发搜索）。

---

## 4. 实施计划

1.  **修改 `useTerminalAutocomplete.ts`**：
    *   使用 `useRef` 缓存 Snippets 列表。
    *   重构 `useEffect`，分离事件监听逻辑。
    *   优化 `updateCursorPosition`，减少对 DOM 的读取频率。
2.  **验证测试**：
    *   在模拟高延迟网络环境下测试输入顺滑度。
    *   测试拥有 500+ 条 Snippet 情况下的搜索性能。
