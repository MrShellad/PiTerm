import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md shadow-sm transition-all duration-200 border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-950/20 backdrop-blur-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-white/70 dark:hover:bg-slate-950/30 focus-visible:bg-white/80 dark:focus-visible:bg-slate-950/50 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:font-medium file:text-foreground",
  {
    variants: {
      size: {
        xs: "h-7 px-2 py-0.5 text-xs file:text-xs",
        sm: "h-8 px-2.5 py-1 text-xs file:text-xs",
        default: "h-9 px-3 py-1 text-sm file:text-sm",
        lg: "h-10 px-3.5 py-2 text-base file:text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }