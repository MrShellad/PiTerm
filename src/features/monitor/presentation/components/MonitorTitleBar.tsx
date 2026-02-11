import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { clsx } from "clsx";

const appWindow = getCurrentWindow();

interface Props {
  children?: React.ReactNode; 
}

export const MonitorTitleBar = ({ children }: Props) => {
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  
  // 🟢 [核心修复] 改为 hide()，保持窗口句柄存活，防止主窗口通信报错
  const handleClose = async () => {
      await appWindow.hide();
  };

  const windowControlClass = clsx(
    "h-full w-12 flex items-center justify-center",
    "transition-colors duration-300",
    "text-[hsl(var(--titlebar-text))]",
    "hover:text-[hsl(var(--titlebar-text-hover))]",
    "hover:bg-[hsl(var(--titlebar-btn-hover-bg))]"
  );

  return (
    <div
      className={clsx(
        "h-10 flex w-full select-none",
        "bg-slate-100/80 dark:bg-black/20 backdrop-blur-sm",
        "border-b border-slate-200 dark:border-white/10"
      )}
      data-tauri-drag-region
    >
      {/* 左侧占位 */}
      <div className="w-20 h-full shrink-0" data-tauri-drag-region />

      {/* 中间内容 */}
      <div 
        className="flex-1 min-w-0 h-full relative z-20 flex overflow-hidden" 
        data-tauri-drag-region
      >
        {children}
      </div>

      {/* 右侧按钮区域 */}
      <div className="flex items-start h-full shrink-0 z-50 ml-auto">
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