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
      "bg-background/60 border-border/80 text-foreground placeholder:text-muted-foreground",
      
      // 3. Hover State (悬停状态)
      "hover:bg-background/90 hover:border-border",

      // 4. Focus State (聚焦状态)
      "focus-visible:bg-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary",
      
      // 5. Disabled State (禁用状态)
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
      
      // 图标留白
      startIcon && "pl-9",
      endIcon && "pr-9",

      // 强制隐藏浏览器原生的小眼睛 (Edge/IE) 和清除按钮
      "[&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
    );

    const errorInputStyles = error && "border-destructive/80 bg-destructive/10 text-destructive placeholder:text-destructive/50 focus-visible:ring-destructive/30 focus-visible:border-destructive";

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <Label 
            htmlFor={props.id} 
            className={cn(
              "text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center transition-colors",
              error && "text-destructive"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
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