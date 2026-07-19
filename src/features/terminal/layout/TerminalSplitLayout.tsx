import { useState, useCallback, useEffect, useRef } from "react";
import { useTerminalStore } from "@/store/useTerminalStore";
import { TerminalMonitor } from "../components/TerminalMonitor";
import { clsx } from "clsx";

interface Props {
  children: React.ReactNode;
}

const MIN_MONITOR_WIDTH = 280;
const MAX_MONITOR_WIDTH = 800;
const COLLAPSED_WIDTH = 48; // 🟢 [新增] 收起后的宽度 (仅够放按钮)

export const TerminalSplitLayout = ({ children }: Props) => {
  const { monitorWidth, setMonitorWidth, monitorPosition } = useTerminalStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // 🟢 [新增] 本地收起状态
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [localWidth, setLocalWidth] = useState(monitorWidth);
  const [isResizing, setIsResizing] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  // 当 store 中的宽度变化且未在调整大小时，同步宽度
  useEffect(() => {
    if (!isResizing) {
      setLocalWidth(monitorWidth);
    }
  }, [monitorWidth, isResizing]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); 
    setIsResizing(true);
    setLocalWidth(monitorWidth);
    document.body.style.cursor = 'col-resize';
  }, [monitorWidth]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setMonitorWidth(localWidth);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    document.body.style.cursor = '';
  }, [localWidth, setMonitorWidth]);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

      animationFrameId.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        let newWidth;
        if (monitorPosition === 'left') {
          newWidth = e.clientX - rect.left;
        } else {
          newWidth = rect.right - e.clientX;
        }

        if (newWidth >= MIN_MONITOR_WIDTH && newWidth <= MAX_MONITOR_WIDTH) {
          setLocalWidth(newWidth);
        }
      });
    },
    [monitorPosition]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // 🟢 计算当前实际宽度：收起时用固定宽度，否则用记忆宽度
  const currentSidebarWidth = isCollapsed ? COLLAPSED_WIDTH : localWidth;

  return (
    <div 
      ref={containerRef}
      className="flex w-full h-full overflow-hidden bg-transparent relative"
    >
      
      {isResizing && (
        <div 
          className="fixed inset-0 z-[9999] cursor-col-resize bg-transparent select-none" 
          onMouseUp={stopResizing} 
        />
      )}

      {/* 1. 主内容 (Terminal + File Manager) */}
      <div 
        className={clsx(
          "flex-1 min-w-0 h-full relative transition-all duration-300 ease-in-out", // 添加过渡动画
          isResizing && "pointer-events-none select-none"
        )}
        style={{ order: monitorPosition === 'left' ? 3 : 1 }}
      >
        {children}
      </div>

      {/* 2. 拖拽条 (收起时隐藏或禁用) */}
      <div
        className={clsx(
          "h-full z-20 flex-shrink-0 relative group transition-colors duration-200",
          // 收起时禁用拖拽手柄
          isCollapsed ? "w-0 cursor-default pointer-events-none opacity-0" : "w-[1px] cursor-col-resize bg-slate-200 dark:bg-slate-800",
          !isCollapsed && (isResizing ? "bg-blue-600 w-[2px]" : "hover:bg-blue-500/50")
        )}
        style={{ order: 2 }}
        onMouseDown={!isCollapsed ? startResizing : undefined}
      >
        <div className="absolute inset-y-0 -left-2 -right-2 bg-transparent" />
      </div>

      {/* 3. 监视器侧边栏 */}
      <div
        className={clsx(
          "h-full flex-shrink-0 overflow-hidden",
          // 添加宽度过渡动画
          "transition-[width] duration-300 ease-in-out",
          monitorPosition === 'left' 
            ? "border-r border-slate-200 dark:border-slate-800" 
            : "border-l border-slate-200 dark:border-slate-800",
          isResizing && "pointer-events-none select-none"
        )}
        style={{ 
            width: currentSidebarWidth,
            order: monitorPosition === 'left' ? 1 : 3 
        }}
      >
        <div className="w-full h-full overflow-hidden">
            {/* 🟢 将状态传给 Monitor 组件 */}
            <TerminalMonitor 
                collapsed={isCollapsed} 
                onToggle={() => setIsCollapsed(!isCollapsed)} 
            />
        </div>
      </div>
    </div>
  );
};