import { CardSize } from "@/features/server/list/domain/types"; // 请根据实际路径调整
import { cn } from "@/lib/utils";

interface Props {
  size: CardSize;
}

export const ServerCardSkeleton = ({ size }: Props) => {
  // 复用 ServerCard 的尺寸配置，确保占位大小一致
  const sizeConfig = {
    sm: { height: '170px', padding: '0.75rem' },
    md: { height: '200px', padding: '1rem' },
    lg: { height: '210px', padding: '1.25rem' }
  };
  const currentSize = sizeConfig[size] || sizeConfig.md;

  return (
    <div 
      className={cn(
        "relative flex flex-col rounded-[var(--radius)] border bg-card text-card-foreground shadow-sm overflow-hidden",
        "animate-pulse" // 添加呼吸动画
      )}
      style={{ 
        height: currentSize.height,
        padding: currentSize.padding
      }}
    >
      {/* 1. Header 部分骨架 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 w-full">
          {/* 图标占位 */}
          <div className="w-12 h-12 rounded-[var(--radius)] bg-muted/50 shrink-0" />
          
          <div className="flex flex-col gap-2 w-full max-w-[60%]">
             {/* 标题占位 */}
             <div className="h-5 bg-muted/50 rounded w-3/4" />
             {/* 副标题占位 */}
             <div className="h-3 bg-muted/30 rounded w-1/2" />
          </div>
        </div>
        {/* 菜单按钮占位 */}
        <div className="w-6 h-6 bg-muted/30 rounded" />
      </div>

      {/* 2. Body 部分骨架 (IP Badge) */}
      <div className="flex-1 py-1 space-y-2">
        <div className="h-8 bg-muted/40 rounded-[var(--radius)] w-full" />
        {/* 状态 Badge 占位 */}
        <div className="h-6 bg-muted/20 rounded-[var(--radius)] w-20" />
      </div>

      {/* 3. Footer 部分骨架 */}
      <div className="mt-auto pt-3 border-t border-dashed border-border/50 flex items-center justify-between gap-2">
         {/* Tags 占位 */}
         <div className="flex gap-1">
            <div className="w-8 h-4 bg-muted/30 rounded-full" />
            <div className="w-10 h-4 bg-muted/30 rounded-full" />
         </div>
         {/* 连接按钮占位 */}
         <div className="w-20 h-8 bg-muted/50 rounded-[var(--radius)]" />
      </div>
    </div>
  );
};