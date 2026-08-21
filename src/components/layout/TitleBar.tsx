import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { clsx } from "clsx";
import { TerminalTabs } from "@/features/terminal/components/TerminalTabs";
import Logo from "@/assets/logo.png";

const appWindow = getCurrentWindow();

export const TitleBar = () => {
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  // 窗口控制按钮
  const windowControlClass = clsx(
    "h-full w-12 flex items-center justify-center",
    "transition-colors duration-150",
    "text-[hsl(var(--titlebar-text))]",
    "hover:text-[hsl(var(--titlebar-text-hover))]",
    "hover:bg-[hsl(var(--titlebar-btn-hover-bg))]"
  );

  return (
    <div
      data-tauri-drag-region
      className={clsx(
        "h-10 flex w-full select-none app-region-drag items-center pr-0",
        "bg-transparent"
      )}
    >
      {/* Logo 区域 - 宽度与侧栏一致 64px，高度撑满以实现右边框通顶，Logo 居中对齐 */}
      <div className="w-[64px] h-full flex items-center justify-center shrink-0 border-r border-[hsl(var(--titlebar-border))] select-none pointer-events-none app-region-no-drag">
        <img src={Logo} alt="Logo" className="w-5 h-5 object-contain" />
      </div>

      {/* Tabs 区域 */}
      <div className="flex-1 min-w-0 h-full relative z-20 flex items-center pl-2">
        <TerminalTabs />
      </div>

      {/* 窗口控制按钮 */}
      <div className="flex items-center h-full app-region-no-drag shrink-0 z-50">
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
            "transition-colors duration-150",
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
