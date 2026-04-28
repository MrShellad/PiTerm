import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { History, Code2 } from "lucide-react";
import { clsx } from "clsx";

export interface SuggestionItem {
  type: 'history' | 'snippet';
  value: string;
  label?: string;
}

interface Props {
  visible: boolean;
  cursorInfo: { x: number; y: number; lineHeight: number };
  items: SuggestionItem[];
  selectedIndex: number;
  onSelect: (item: SuggestionItem) => void;
  scale?: number;
  opacity?: number;
  theme: {
    background: string;
    foreground: string;
    cursor: string;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const AutocompletePopup = ({
  visible,
  cursorInfo,
  items,
  selectedIndex,
  onSelect,
  scale = 1,
  opacity = 1,
  theme
}: Props) => {
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');

  // 1. 处理选中项自动滚动到可视区域
  useEffect(() => {
    if (visible && listRef.current) {
      const activeElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, visible]);

  // 2. 智能计算弹出位置（优先上方，空间不足则下方）
  useLayoutEffect(() => {
    if (visible && containerRef.current) {
      const popupHeight = containerRef.current.offsetHeight;
      const { y } = cursorInfo;
      // 计算下方剩余空间：窗口高度 - 光标Y坐标 - 行高
      const spaceBelow = window.innerHeight - (y + cursorInfo.lineHeight);
      
      // 如果下方空间不足 220px（max-height 附近）且上方空间充足，则向上弹出
      if (spaceBelow < 220 && y > popupHeight) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  }, [visible, cursorInfo, items]);

  if (!visible || items.length === 0) return null;

  // 3. 构建固定定位样式
  const safeScale = clamp(Number(scale) || 1, 0.75, 1.5);
  const safeOpacity = clamp(Number(opacity) || 1, 0.2, 1);
  const style: React.CSSProperties = {
    position: 'fixed',
    left: cursorInfo.x,
    backgroundColor: theme.background,
    borderColor: 'rgba(128,128,128,0.2)',
    color: theme.foreground,
    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
    zIndex: 99999,
    minWidth: '260px',
    opacity: safeOpacity,
    transform: `scale(${safeScale})`,
    transformOrigin: placement === 'top' ? 'bottom left' : 'top left',
    maxWidth: '420px', // 限制最大宽度
  };

  if (placement === 'top') {
    style.bottom = window.innerHeight - cursorInfo.y + 4;
  } else {
    style.top = cursorInfo.y + cursorInfo.lineHeight + 4;
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        "rounded-lg border flex flex-col animate-in fade-in zoom-in-95 duration-100 overflow-hidden font-sans",
        "max-h-[220px]" // 限制物理高度，超出则内部滚动
      )}
      style={style}
    >
      {/* 列表区域 */}
      <div 
        ref={listRef} 
        className="flex-1 overflow-y-auto xterm-custom-scrollbar p-1.5 space-y-0.5"
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={`${item.type}-${index}`}
              onClick={() => onSelect(item)}
              className={clsx(
                "flex items-center gap-2.5 px-2.5 py-1 rounded cursor-pointer transition-all border border-transparent",
                // 选中状态样式：使用透明度背景，文字颜色继承 theme.foreground 确保白底黑字/黑底白字都可见
                isSelected 
                  ? "bg-blue-500/25 border-blue-500/40 font-semibold" 
                  : "hover:bg-gray-500/10 opacity-80 hover:opacity-100"
              )}
            >
              {/* 图标列 */}
              <div className={clsx(
                  "shrink-0 p-0.5 rounded",
                  item.type === 'history' ? "bg-slate-500/20" : "bg-amber-500/20"
              )}>
                {item.type === 'history' ? (
                  <History className="w-3 h-3" />
                ) : (
                  <Code2 className="w-3 h-3 text-amber-500" />
                )}
              </div>

              {/* 单行内容区域：指令 + 注释 */}
              <div className="flex items-baseline gap-2 min-w-0 flex-1 overflow-hidden">
                <span className="truncate font-mono text-xs shrink-0 max-w-[70%]">
                    {item.value}
                </span>

                {item.label && (
                    <div className="flex items-center gap-1 opacity-40 shrink min-w-0">
                        <span className="text-[10px]">—</span>
                        <span className="text-[10px] truncate">{item.label}</span>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 底部按键提示栏 */}
      <div 
        className="px-3 py-1 border-t flex items-center justify-between text-[9px] select-none"
        style={{ 
            borderColor: 'rgba(128,128,128,0.1)',
            backgroundColor: 'rgba(128,128,128,0.05)',
            color: theme.foreground,
            opacity: 0.6 
        }}
      >
         <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
                <kbd className="font-mono bg-gray-500/20 px-1 rounded border border-gray-500/20">Tab</kbd>
                <span>补全</span>
            </span>
            <span className="flex items-center gap-1">
                <kbd className="font-mono bg-gray-500/20 px-1 rounded border border-gray-500/20">↑↓</kbd>
                <span>选择</span>
            </span>
         </div>
         <span className="flex items-center gap-1">
            <kbd className="font-mono bg-gray-500/20 px-1 rounded border border-gray-500/20">Esc</kbd>
            <span>关闭</span>
         </span>
      </div>
    </div>
  );
};
