import { CardSize } from "@/features/server/list/domain/types";
import { cn } from "@/lib/utils";

interface Props {
  size: CardSize;
}

export const ServerCardSkeleton = ({ size }: Props) => {
  const sizeConfig = {
    sm: { height: '140px', padding: 'p-2.5' },
    md: { height: '165px', padding: 'p-3.5' },
    lg: { height: '200px', padding: 'p-4' }
  };
  const currentSize = sizeConfig[size] || sizeConfig.md;

  return (
    <div 
      className={cn(
        "relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg overflow-hidden animate-pulse",
        currentSize.padding
      )}
      style={{ height: currentSize.height }}
    >
      {/* 1. Header 部分骨架：简约放大图标 + 右侧服务器名称 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-white/15" />
          <div className="flex flex-col gap-1">
            <div className="h-3.5 w-24 bg-white/15 rounded" />
            <div className="h-2 w-12 bg-white/10 rounded" />
          </div>
        </div>
        <div className="w-5 h-5 rounded bg-white/10" />
      </div>

      {/* 2. 卡号 IP 占位 */}
      <div className="space-y-1 my-auto">
        <div className="h-6 bg-white/10 rounded-lg w-full" />
        <div className="h-3 bg-white/10 rounded-full w-16" />
      </div>

      {/* 3. Footer 底部骨架 */}
      <div className="pt-1.5 border-t border-white/10 flex items-end justify-between">
        <div className="flex flex-col gap-1 w-1/2">
          <div className="h-2 w-14 bg-white/10 rounded" />
          <div className="h-3 w-20 bg-white/15 rounded" />
        </div>
        <div className="w-20 h-7 bg-white/15 rounded-full" />
      </div>
    </div>
  );
};