import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { clsx } from "clsx";
import { TerminalTabs } from "@/features/terminal/components/TerminalTabs";

const appWindow = getCurrentWindow();

export const TitleBar = () => {
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  // 窗口控制按钮
  const windowControlClass = clsx(
    "h-full w-12 flex items-center justify-center",
    "transition-colors duration-300",
    "text-[hsl(var(--titlebar-text))]",
    "hover:text-[hsl(var(--titlebar-text-hover))]",
    "hover:bg-[hsl(var(--titlebar-btn-hover-bg))]"
  );

  return (
    <div
      data-tauri-drag-region
      className={clsx(
        "h-10 flex w-full select-none app-region-drag",
        // 🟢 [修改] 移除背景色和边框，改为全透明
        "bg-transparent"
        // ❌ 移除了 "bg-slate-100/80...", "border-b..."
      )}
    >
      {/* Tabs 区域 */}
      <div className="flex-1 min-w-0 h-full relative z-20">
        <TerminalTabs />
      </div>

      {/* 窗口控制按钮 */}
      <div className="flex items-start h-full app-region-no-drag shrink-0 z-50">
        <button onClick={handleMinimize} className={windowControlClass}>
          <Minus className="w-4 h-4" />
        </button>

        <button onClick={handleMaximize} className={windowControlClass}>
          <Square className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClose}
          className={clsx(
            "h-full w-12 flex items-center justify-center",
            "transition-colors duration-300",
            "text-[hsl(var(--titlebar-text))]",
            "hover:bg-[hsl(var(--titlebar-close-hover-bg))]",
            "hover:text-[hsl(var(--titlebar-close-hover-text))]"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
