# 本地文件浏览器设计文档 (Local File Browser Design)

## 1. 概述
本地文件浏览器是 PiTerm 的重要扩展功能，旨在为用户提供一个高效、美观且功能完备的本地文件管理工具。该组件将采用独立的 Tauri 窗口运行，与主程序解耦，支持跨平台（Windows, macOS, Linux）的文件操作。

## 2. 界面设计 (UI/UX)

### 2.1 窗口与布局
- **独立窗口**：通过 Tauri `WebviewWindow` API 创建，支持透明背景与毛玻璃效果（Glassmorphism）。
- **左右布局 (Sidebar + Main)**：
    - **左侧导航栏 (Sidebar)**：包含“快捷访问”（桌面、下载、文档）、“系统磁盘”、“收藏夹”等。
    - **右侧主视图 (Main Pane)**：文件列表/图标展示区。
    - **顶部工具栏 (Toolbar)**：前进/后退、面包屑导航（Breadcrumbs）、搜索框、视图切换、排序设置。
    - **底部状态栏 (Status Bar)**：显示项目数量、选中大小、磁盘可用空间。

### 2.2 视图模式 (View Modes)
支持以下多种展现形式：
- **纯图标模式 (Icon View)**：
    - **小 (Small)**：32x32，适合密集展示。
    - **中 (Medium)**：64x64，平衡视觉与密度。
    - **大 (Large)**：128x128，适合图片预览。
- **列表模式 (List View)**：紧凑型设计，仅显示图标与文件名。
- **详细模式 (Details View)**：表格形式，显示文件名、修改日期、类型、大小、权限等。

### 2.3 图标系统
- 根据文件扩展名映射图标（如：`.js`/`.ts` 对应脚本图标，`.png`/`.jpg` 对应图片图标，`.zip`/`.rar` 对应压缩包图标）。
- 目录使用专属文件夹图标，支持展开/收起状态。

## 3. 功能特性

### 3.1 核心文件操作
- **CRUD**：新建文件/文件夹、重命名、删除（支持移至回收站）、复制、剪切、粘贴。
- **拖拽支持**：支持文件在浏览器内部及与操作系统之间相互拖拽。
- **多选**：支持 Ctrl/Shift 多选，框选。

### 3.2 文件打开逻辑
- **文本文件**：
    - **内置编辑器**：默认调用 PiTerm 的内置 Monaco/CodeMirror 编辑器。
    - **外部关联**：右键菜单支持“使用系统默认程序打开”。
- **通用文件**：调用操作系统默认关联工具。

### 3.3 排序与过滤
- **多维度排序**：按名称、大小、类型、修改时间。
- **实时过滤**：在顶部搜索框输入字符，实时过滤当前目录内容。

## 4. 技术实现方案

### 4.1 后端 (Rust/Tauri)
- **FS 插件**：利用 `@tauri-apps/plugin-fs` 处理基本读写。
- **自定义指令**：
    - `get_native_icons`：获取系统原生图标（可选）。
    - `calculate_dir_size`：异步计算大目录大小。
    - `open_in_external`：调用 `std::process` 或 `open` 库打开外部应用。
    - `move_to_trash`：调用平台相关的回收站 API。

### 4.2 前端 (React/TypeScript)
- **状态管理**：使用 `useLocalFsStore` (Zustand) 管理当前路径、历史记录、视图配置。
- **虚拟列表 (Virtual List)**：对于包含数千个文件的文件夹，采用虚拟滚动技术确保 UI 流畅。
- **上下文菜单**：自定义右键菜单，提供丰富的功能入口。

## 5. 数据结构

```typescript
interface LocalFileEntry {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  extension: string;
  modifiedAt: number; // 时间戳
  readonly: boolean;
  isHidden: boolean;
}
```

## 6. 后续扩展计划
- **全局搜索**：支持对整个磁盘进行索引搜索。
- **文件预览**：侧边栏实时预览图片、PDF、Markdown 内容。
- **Git 集成**：在文件列表显示 Git 状态图标（修改、新增等）。
