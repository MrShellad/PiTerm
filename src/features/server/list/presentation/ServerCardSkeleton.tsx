import { CardSize } from "@/features/server/list/domain/types";
import { cn } from "@/lib/utils";

interface Props {
  size: CardSize;
}

export const ServerCardSkeleton = ({ size }: Props) => {
  const sizeConfig = {
    sm: { height: '195px', padding: 'p-4', iconBox: 'w-11 h-11', textBox: 'h-11', title: 'h-4 w-28', ip: 'h-9', btn: 'h-8 w-24' },
    md: { height: '230px', padding: 'p-5', iconBox: 'w-12 h-12', textBox: 'h-12', title: 'h-5 w-36', ip: 'h-10', btn: 'h-9 w-28' },
    lg: { height: '260px', padding: 'p-6', iconBox: 'w-14 h-14', textBox: 'h-14', title: 'h-6 w-44', ip: 'h-11', btn: 'h-10 w-32' }
  };
  const currentSize = sizeConfig[size] || sizeConfig.md;

  return (
    <div 
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm",
        currentSize.padding
      )}
      style={{ height: currentSize.height }}
    >
      {/* 1. Header 部分骨架：图标盒子 + 标题/副标题 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-xl bg-muted/80 shrink-0", currentSize.iconBox)} />
          <div className={cn("flex flex-col justify-between py-0.5", currentSize.textBox)}>
            <div className={cn("bg-muted/80 rounded", currentSize.title)} />
            <div className="h-3 w-16 bg-muted/50 rounded mt-auto" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-muted/50" />
      </div>

      {/* 2. 卡号 IP 与标签占位 */}
      <div className="space-y-2 my-auto py-2">
        <div className={cn("bg-muted/70 rounded-xl w-full", currentSize.ip)} />
        <div className="flex gap-2">
          <div className="h-4 bg-muted/50 rounded-full w-14" />
          <div className="h-4 bg-muted/50 rounded-full w-16" />
        </div>
      </div>

      {/* 3. Footer 底部骨架 */}
      <div className="pt-2.5 border-t border-border/30 flex items-center justify-between">
        <div className="flex flex-col gap-1.5 w-1/2">
          <div className="h-3 w-16 bg-muted/60 rounded" />
          <div className="h-3.5 w-24 bg-muted/80 rounded" />
        </div>
        <div className={cn("bg-muted/80 rounded-full shrink-0", currentSize.btn)} />
      </div>
    </div>
  );
};
