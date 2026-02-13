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
          "bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800",
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
        <div className="shrink-0 flex items-center justify-between p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                {icon}
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              {title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* === Content === */}
        {/* 移除了判断 !footer 添加圆角的逻辑 */}
        <div className="flex-1 min-h-0 p-4 bg-slate-50/50 dark:bg-slate-950/50 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* === Footer === */}
        {/* 移除了 rounded-b-xl */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};