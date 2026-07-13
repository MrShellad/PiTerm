import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface CustomInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string | undefined;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  hideErrorMsg?: boolean;
}

export const CustomInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
  ({ className, type, label, description, error, startIcon, endIcon, hideErrorMsg, ...props }, ref) => {
    
    const { required, ...restProps } = props;

    const baseInputStyles = cn(
      // 基础动画和布局
      "flex h-9 w-full rounded-md border px-3 py-1 text-base shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-base file:font-medium",
      
      // === 🟢 核心修改区域：毛玻璃效果 ===
      
      // 1. 全局模糊设置 (浓度高一点)
      "backdrop-blur-xl", 

      // 2. Default State (默认状态)
      // Light: 使用白色带高透明度，配合模糊打造磨砂感。边框也稍微透明一点以融合背景。
      "bg-white/60 border-slate-200/80 text-slate-900 placeholder:text-slate-400",
      // Dark: 使用深色带透明度。
      "dark:bg-slate-950/40 dark:border-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500",
      
      // 3. Hover State (悬停状态)
      // 鼠标悬停时，增加不透明度，让玻璃感更“实”一点
      "hover:bg-white/80 hover:border-slate-300",
      "dark:hover:bg-slate-900/60 dark:hover:border-slate-700",

      // 4. Focus State (聚焦状态)
      // 聚焦时建议保持纯色或极高不透明度，以保证输入内容清晰，同时保留一点点通透感的高亮边框
      "focus-visible:bg-white dark:focus-visible:bg-slate-950",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500",
      
      // 5. Disabled State (禁用状态)
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100/50 dark:disabled:bg-slate-900/50",
      
      // 图标留白
      startIcon && "pl-9",
      endIcon && "pr-9",

      // 强制隐藏浏览器原生的小眼睛 (Edge/IE) 和清除按钮
      "[&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
    );

    const errorInputStyles = error && "border-red-500/80 bg-red-50/40 hover:bg-red-50/60 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-900 dark:text-red-100 placeholder:text-red-300 focus-visible:ring-red-500/30 focus-visible:border-red-500";

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <Label 
            htmlFor={props.id} 
            className={cn(
              "text-base font-semibold text-slate-500 uppercase tracking-wider flex items-center transition-colors",
              error && "text-red-500"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
        )}

        <div className="relative group">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              {startIcon}
            </div>
          )}

          <input
            type={type}
            className={cn(baseInputStyles, errorInputStyles, className)}
            ref={ref}
            autoComplete="off"
            autoCorrect="off" 
            autoCapitalize="off"
            {...restProps}
          />

          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400">
              {endIcon}
            </div>
          )}
        </div>

        {!hideErrorMsg && error ? (
          <p className="text-base text-red-500 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
            {error}
          </p>
        ) : description ? (
          <p className="text-base text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
    );
  }
);

CustomInput.displayName = "CustomInput";