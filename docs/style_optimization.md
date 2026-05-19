# PiTerm 样式与字体像素级对齐优化文档

## 目标
取消项目初期遗留的硬编码样式，统一使用 Tailwind CSS 的设计 Token（如 `bg-background`, `bg-card`, `text-foreground` 等），同时进行字体的像素级对齐优化，确保界面视觉统一、规范。

## 优化项列表

### 1. 移除 Tailwind 中的硬编码颜色与样式
将项目中遗留的如 `bg-[#1e1e1e]`、`dark:bg-[#2d2d2d]` 等硬编码类名替换为符合系统主题设定的设计 Token。

- [x] **ConnectionStatusModal.tsx**
  - 路径: `src/features/server/components/ConnectionStatusModal.tsx`
  - 优化内容: 将 `bg-[#1e1e1e]` 替换为 `bg-background` / `bg-popover`。
  - 优化内容: 将 `bg-[#252526]` 替换为 `bg-muted` 或辅助底色。
- [x] **FileEditor.tsx**
  - 路径: `src/features/fs/editor/FileEditor.tsx`
  - 优化内容: 将 `bg-white dark:bg-[#1e1e1e]` 替换为 `bg-background`。
  - 优化内容: 将 `bg-slate-100 dark:bg-[#2d2d2d]` 替换为 `bg-muted` 或 `bg-secondary`。

### 2. 移除内联硬编码样式 (Inline Styles)
将非动态计算的内联样式替换为标准 Tailwind 类名。

- [x] **MonitorCard.tsx**
  - 路径: `src/features/terminal/components/monitor/MonitorCard.tsx`
  - 优化内容: 移除 `style={{ borderRadius: 16 }}`，使用 `rounded-2xl` 类名。
- [x] **全局 Toast (Sonner) 容器**
  - 路径: `src/app/MainAppShell.tsx`, `src/app/MonitorWindowApp.tsx`, `src/app/EditorWindowApp.tsx`
  - 优化内容: `style={{ zIndex: 999999 }}` 转化为 Tailwind 类名如 `z-[9999]` 等。

### 3. 字体像素对齐优化 (Typography & Pixel Alignment)
检查上述组件的文本渲染，加入标准的 `leading-none` 或 `leading-tight`，确保垂直方向上的像素绝对居中和对齐。

- [x] **ConnectionStatusModal.tsx** 文本与图标像素级对齐。
- [x] **FileEditor.tsx** 头部信息、状态栏文字的行高、间距像素级对齐优化。
