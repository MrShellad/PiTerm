import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface PasswordInputProps extends InputProps {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, size = "default", ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    const paddingRightClass = {
      xs: "pr-7",
      sm: "pr-8",
      default: "pr-9",
      lg: "pr-10",
    }[size || "default"]

    const iconSizeClass = {
      xs: "h-3.5 w-3.5",
      sm: "h-3.5 w-3.5",
      default: "h-4 w-4",
      lg: "h-4.5 w-4.5",
    }[size || "default"]

    const btnPaddingClass = {
      xs: "px-2",
      sm: "px-2.5",
      default: "px-3",
      lg: "px-3.5",
    }[size || "default"]

    return (
      <div className="relative w-full">
        <Input
          type={showPassword ? "text" : "password"}
          size={size}
          className={cn(paddingRightClass, className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className={cn(
            "absolute right-0 top-0 h-full hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none flex items-center justify-center cursor-pointer",
            btnPaddingClass
          )}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className={iconSizeClass} aria-hidden="true" />
          ) : (
            <Eye className={iconSizeClass} aria-hidden="true" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }