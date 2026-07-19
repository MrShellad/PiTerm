import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  className
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-border/40 bg-card/40 backdrop-blur-md transition-all duration-300",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner mb-4">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="text-base font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="rounded-full shadow-sm gap-1.5 px-4 font-medium"
        >
          {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
          <span>{actionLabel}</span>
        </Button>
      )}
    </div>
  );
};
