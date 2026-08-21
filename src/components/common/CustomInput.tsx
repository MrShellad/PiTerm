import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export type CustomInputSize = "xs" | "sm" | "default" | "lg";

export interface CustomInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  description?: string;
  error?: string | undefined;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  hideErrorMsg?: boolean;
  size?: CustomInputSize;
}

export const CustomInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
  ({ className, type, label, description, error, startIcon, endIcon, hideErrorMsg, size = "default", ...props }, ref) => {
    
    const { required, ...restProps } = props;

    const sizeStyles = {
      xs: "h-7 px-2 py-0.5 text-xs file:text-xs",
      sm: "h-8 px-2.5 py-1 text-xs file:text-xs",
      default: "h-9 px-3 py-1 text-sm file:text-sm",
      lg: "h-10 px-3.5 py-2 text-base file:text-base",
    }[size || "default"];

    const iconPaddingStyles = {
      xs: {
        start: startIcon ? "pl-7" : "",
        end: endIcon ? "pr-7" : "",
        startPos: "left-2",
        endPos: "right-2",
      },
      sm: {
        start: startIcon ? "pl-8" : "",
        end: endIcon ? "pr-8" : "",
        startPos: "left-2.5",
        endPos: "right-2.5",
      },
      default: {
        start: startIcon ? "pl-9" : "",
        end: endIcon ? "pr-9" : "",
        startPos: "left-3",
        endPos: "right-3",
      },
      lg: {
        start: startIcon ? "pl-10" : "",
        end: endIcon ? "pr-10" : "",
        startPos: "left-3.5",
        endPos: "right-3.5",
      },
    }[size || "default"];

    const baseInputStyles = cn(
      // 基础动画和布局
      "flex w-full rounded-md border shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:font-medium",
      sizeStyles,
      
      // === 毛玻璃效果 ===
      "backdrop-blur-xl", 

      // 默认状态
      "bg-background/60 border-border/80 text-foreground placeholder:text-muted-foreground",
      
      // 悬停状态
      "hover:bg-background/90 hover:border-border",

      // 聚焦状态
      "focus-visible:bg-background",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary",
      
      // 禁用状态
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
      
      // 图标留白
      iconPaddingStyles.start,
      iconPaddingStyles.end,

      // 隐藏浏览器原生的小眼睛和清除按钮
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
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors flex items-center justify-center [&_svg]:size-4",
              iconPaddingStyles.startPos
            )}>
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
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 text-slate-400 flex items-center justify-center [&_svg]:size-4",
              iconPaddingStyles.endPos
            )}>
              {endIcon}
            </div>
          )}
        </div>

        {!hideErrorMsg && error ? (
          <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
            {error}
          </p>
        ) : description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
    );
  }
);

CustomInput.displayName = "CustomInput";