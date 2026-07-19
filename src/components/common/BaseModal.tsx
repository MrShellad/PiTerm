import { useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode; 
  className?: string;
  // 🟢 移除了 zIndex prop，全面采用 Tailwind 规范
}

export const BaseModal = ({ 
  isOpen, 
  onClose, 
  title, 
  icon, 
  children, 
  footer, 
  className
}: BaseModalProps) => {
  
  // 锁定背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    // 🟢 1. 外层容器：直接使用 z-40 工具类，为 z-50 的确认弹窗让出空间
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      
      {/* 🟢 2. 背景遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 🟢 3. 弹窗主体容器 */}
      <div 
        className={clsx(
          "relative flex flex-col w-full max-h-[85vh]",
          // 外观与动画
          "bg-card text-card-foreground shadow-2xl border border-border",
          "animate-in zoom-in-95 duration-200",
          // 🟢 核心技巧：只在这里定义一次圆角，并通过 overflow-hidden 裁切内部元素
          "rounded-xl overflow-hidden",
          className || "max-w-2xl"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* === Header === */}
        {/* 移除了臃肿的 rounded-t-xl，父级的 overflow-hidden 会自动处理 */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                {icon}
              </div>
            )}
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* === Content === */}
        {/* 移除了判断 !footer 添加圆角的逻辑 */}
        <div className="flex-1 min-h-0 p-4 bg-background/50 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* === Footer === */}
        {/* 移除了 rounded-b-xl */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 bg-card/80 backdrop-blur-sm border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};