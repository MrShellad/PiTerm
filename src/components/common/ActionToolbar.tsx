import { Search, LayoutGrid, List, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CardSize } from "@/features/server/list/domain/types";
import { GlassTooltip } from "@/components/common/GlassTooltip"; // [新增] 引入组件

interface ActionToolbarProps {
  // 搜索
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // 标签
  tags?: string[];
  activeTag?: string | null;
  onTagChange?: (tag: string | null) => void;

  // 视图模式
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;

  // 卡片尺寸 (仅 Grid 模式有效)
  cardSize?: CardSize;
  onCardSizeChange?: (size: CardSize) => void;

  // 额外操作区 (用于放置排序下拉框等)
  extraActions?: React.ReactNode;

  // 添加按钮
  onAdd?: () => void;
  addLabel?: string;
  
  className?: string;
}

export const ActionToolbar = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  tags = [],
  activeTag,
  onTagChange,
  viewMode,
  onViewModeChange,
  cardSize,
  onCardSizeChange,
  extraActions,
  onAdd,
  addLabel,
  className
}: ActionToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      
      {/* --- 第一行：工具栏主体 --- */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        
        {/* 1. 搜索框 (自适应宽度) */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={searchPlaceholder || t('common.search', 'Search...')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 w-full bg-transparent border-border focus-visible:ring-primary"
          />
        </div>

        {/* 2. 额外操作区 (排序) */}
        {extraActions && (
          <div className="shrink-0">
            {extraActions}
          </div>
        )}

        {/* 3. 卡片尺寸切换 (使用 GlassTooltip) */}
        {viewMode === 'grid' && onCardSizeChange && cardSize && (
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border h-9 shrink-0">
            {/* Small */}
            <GlassTooltip content={t('common.size.small', 'Small')} side="bottom">
              <button
                onClick={() => onCardSizeChange('sm')}
                className={cn(
                  "w-8 rounded-md transition-all h-full flex items-center justify-center text-xs font-bold",
                  cardSize === 'sm' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                S
              </button>
            </GlassTooltip>

            {/* Medium */}
            <GlassTooltip content={t('common.size.medium', 'Medium')} side="bottom">
              <button
                onClick={() => onCardSizeChange('md')}
                className={cn(
                  "w-8 rounded-md transition-all h-full flex items-center justify-center text-xs font-bold",
                  cardSize === 'md' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                M
              </button>
            </GlassTooltip>

            {/* Large */}
            <GlassTooltip content={t('common.size.large', 'Large')} side="bottom">
              <button
                onClick={() => onCardSizeChange('lg')}
                className={cn(
                  "w-8 rounded-md transition-all h-full flex items-center justify-center text-xs font-bold",
                  cardSize === 'lg' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                L
              </button>
            </GlassTooltip>
          </div>
        )}

        {/* 4. 视图切换 (为了风格统一，也加上了 Tooltip) */}
        {viewMode && onViewModeChange && (
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border h-9 shrink-0">
            <GlassTooltip content={t('common.grid_view', 'Grid View')} side="bottom">
              <button
                onClick={() => onViewModeChange('grid')}
                className={cn(
                  "p-1.5 rounded-md transition-all h-full aspect-square flex items-center justify-center",
                  viewMode === 'grid' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </GlassTooltip>

            <GlassTooltip content={t('common.list_view', 'List View')} side="bottom">
              <button
                onClick={() => onViewModeChange('list')}
                className={cn(
                  "p-1.5 rounded-md transition-all h-full aspect-square flex items-center justify-center",
                  viewMode === 'list' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </GlassTooltip>
          </div>
        )}

        {/* 5. 添加按钮 */}
        {onAdd && (
          <Button 
            onClick={onAdd} 
            size="sm" 
            className="h-9 gap-2 shadow-sm px-4 shrink-0 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            {addLabel || t('common.add', 'Add')}
          </Button>
        )}
      </div>

      {/* --- 第二行：标签筛选 --- */}
      {tags.length > 0 && onTagChange && (
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => onTagChange(null)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200",
              !activeTag
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
            )}
          >
            {t('common.all', 'All')}
          </button>
          {tags.map(tag => {
             const isActive = activeTag === tag;
             return (
               <button
                 key={tag}
                 onClick={() => onTagChange(isActive ? null : tag)}
                 className={cn(
                   "px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200",
                   isActive
                     ? "bg-primary/10 text-primary border-primary/20"
                     : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                 )}
               >
                 {tag}
               </button>
             );
          })}
        </div>
      )}
    </div>
  );
};