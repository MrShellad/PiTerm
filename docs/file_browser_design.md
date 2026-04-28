# PiTerm 本地文件浏览器设计规范 (Local File Explorer Design Specification)

## 1. 概述 (Overview)
本文档详细描述了 PiTerm 终端软件内置的本地文件浏览器（Local File Explorer）的设计与实现方案。该组件旨在为用户提供一个高性能、美观且功能丰富的图形化文件管理界面，作为终端命令行的有力补充。

## 2. 核心设计原则 (Design Principles)
- **视觉卓越 (Visual Excellence)**: 采用现代毛玻璃效果（Glassmorphism）、平滑渐变与微动效，打造极致的视觉体验。
- **操作直观 (Intuitive UX)**: 符合主流操作系统（Windows/macOS）的文件管理习惯，降低学习成本。
- **性能优先 (Performance First)**: 支持海量文件秒开，通过虚拟滚动（Virtual List）与 Rust 后端加速确保流畅度。

## 3. UI/UX 布局 (Layout & Appearance)

### 3.1 独立窗口模式
- **实现方案**: 基于 Tauri 的多窗口支持（Multi-window Support），通过 `WebviewWindow` 创建独立进程窗口。
- **窗口特性**: 
    - 沉浸式标题栏（Window Vibrancy on macOS, Mica/Acrylic on Windows）。
    - 状态持久化：记录窗口位置、尺寸及上一次打开的路径。

### 3.2 界面布局 (Split Layout)
采用左中右三栏结构或左右分栏结构：
- **左侧：侧边栏 (Sidebar)**
    - **快速访问**: 常用文件夹（主目录、桌面、文档、下载）。
    - **位置**: 磁盘驱动器列表（Windows 盘符或 Linux 挂载点）。
    - **树状目录**: 可折叠的目录树，支持层级展开。
- **中间：主视图 (Main View)**
    - **导航栏**: 前进/后退/向上、路径地址栏（支持点击跳转和手动输入）、全局搜索。
    - **内容区**: 文件展示核心区域。
- **右侧：详情面板 (Optional Detail Pane)**
    - 选中文件时的预览图、元数据（大小、权限、MD5/SHA等）。

### 3.3 视觉风格
- **图标系统**:
    - 不同扩展名区分：文件夹、文本 (.txt, .md)、代码 (.ts, .rs, .py)、压缩包 (.zip, .7z)、媒体 (.png, .mp4) 等。
    - 状态标识：隐藏文件（半透明）、系统文件（小锁图标）。

## 4. 功能特性 (Features)

### 4.1 视图模式 (View Modes)
支持以下五种切换模式：
1. **纯图标 (小/中/大)**: 
    - **Small (48px)**: 紧凑布局。
    - **Medium (72px)**: 平衡布局。
    - **Large (128px)**: 侧重文件预览。
2. **列表模式 (List View)**: 极简一行展示，适合快速浏览。
3. **详细信息 (Details View)**: 表格形式，包含名称、修改日期、类型、大小等可排序列。

### 4.2 文件操作
- **基础操作**:
    - `F2` 重命名、`Delete` 删除（移动至回收站或彻底删除）。
    - 复制 (`Ctrl+C`)、剪切 (`Ctrl+X`)、粘贴 (`Ctrl+V`)。
    - 新建文件夹、新建空文件。
- **文件打开策略**:
    - **文本/代码**: 默认调用内置 `Monaco Editor` 快速编辑。
    - **外部关联**: 右键菜单支持“使用系统默认程序打开”。
    - **终端交互**: 支持“在此处打开终端”。

### 4.3 排序与检索
- **多维度排序**: 名称、修改日期、文件大小、文件扩展名。
- **实时检索**: 键入即搜索（Filtering），支持正则表达式。

## 5. 技术实现方案 (Technical Implementation)

### 5.1 后端 (Rust/Tauri)
- **文件系统插件**: 使用 `@tauri-apps/plugin-fs` 进行基本操作。
- **增强接口**: 在 Rust 端实现自定义 Command，用于获取文件详细元数据（如 Windows 上的版本信息、文件哈希等）。
- **外部调用**: 使用 `tauri-plugin-opener` 或 `std::process::Command` 启动关联应用。

### 5.2 前端 (React/TypeScript)
- **状态管理**: 使用 `Zustand` 管理 `currentPath`、`files` 和 `viewMode`。
- **列表渲染**: 使用 `react-window` 或 `tanstack-virtual` 实现大规模目录的平滑滚动。
- **组件库**: 
    - `Radix UI` 处理上下文菜单和对话框。
    - `Lucide React` 提供高品质图标。

## 6. 验证方案 (Verification)
- **兼容性**: 确保在 Windows、macOS 和 Linux 上路径表示（`\` vs `/`）处理正确。
- **健壮性**: 测试权限受限目录、空目录、包含 10,000+ 文件的目录。
- **交互**: 验证拖拽上传/移动功能的响应速度。

---
*PiTerm Documentation System - 2026-04-29*
