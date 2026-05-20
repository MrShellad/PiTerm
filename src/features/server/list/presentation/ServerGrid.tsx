import React, { useMemo } from "react";
import { Server } from "@/features/server/domain/types";
import { CardSize } from "../domain/types"; // 移除了 CARD_DIMENSIONS 的引用
import { ServerCard } from "./ServerCard";
import { ServerCardSkeleton } from "./ServerCardSkeleton"; 
import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { VirtuosoGrid } from "react-virtuoso";

interface Props {
  servers: Server[];
  cardSize: CardSize;
  actions: any;
  onEdit: (s: Server) => void;
  isLoading?: boolean;
  shouldAnimate?: boolean;
}

// 🟢 [优化] 定义更紧凑的卡片最小宽度
// sm: 220px (原可能为 280px+)
// md: 260px (原可能为 320px+)
// lg: 320px (原可能为 380px+)
const COMPACT_WIDTHS: Record<CardSize, string> = {
  sm: "220px", 
  md: "260px",
  lg: "320px"
};

const CARD_DIMENSIONS: Record<CardSize, { width: string; height: string }> = {
  sm: { width: "220px", height: "170px" },
  md: { width: "260px", height: "200px" },
  lg: { width: "320px", height: "210px" }
};

// 🟢 [优化] 将 Virtuoso 组件定义移至组件外部，避免每次重渲染时创建新组件引用，导致整个列表 DOM 树卸载并重新挂载
const GridList = React.forwardRef<HTMLDivElement, any>(({ children, style, context, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    style={{ ...style, gridTemplateColumns: context?.gridTemplateColumns }}
    className="grid gap-4 pt-2 pb-2 justify-center content-start"
  >
    {children}
  </div>
));
GridList.displayName = "GridList";

const GridItem = ({ children, ...props }: any) => (
  <div {...props} className="w-full">
    {children}
  </div>
);
GridItem.displayName = "GridItem";

export const ServerGrid = ({ 
  servers, 
  cardSize, 
  actions, 
  onEdit, 
  isLoading = false,
  shouldAnimate = true
}: Props) => {
  const { t } = useTranslation();
  
  // 🟢 [优化] 使用 useMemo 缓存 gridStyle 相关的属性，将卡片宽度严格固定，防止其随视口宽度拉伸变大
  const contextValue = useMemo(() => ({
    gridTemplateColumns: `repeat(auto-fill, ${COMPACT_WIDTHS[cardSize]})`
  }), [cardSize]);

  // 1. Loading 骨架屏
  if (isLoading && servers.length === 0) {
    const gridStyle = {
      gridTemplateColumns: `repeat(auto-fill, ${COMPACT_WIDTHS[cardSize]})`
    } as React.CSSProperties;
    return (
      <div className="grid gap-4 pt-2 pb-2 justify-center content-start overflow-y-auto h-full custom-scrollbar" style={gridStyle}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ServerCardSkeleton key={`skeleton-${i}`} size={cardSize} />
        ))}
      </div>
    );
  }

  // 2. 动画配置 (使用 Index 基于时间的延迟实现 Stagger 效果)
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: (index: number) => ({ 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.3, 
        ease: "easeOut",
        // 限制最大延迟时间，防止后面滚入的卡片等待过久
        delay: shouldAnimate ? Math.min(index * 0.04, 0.24) : 0
      }
    })
  };

  // 🟢 [优化] 缓存 components 对象的引用，使其恒定不变
  const virtuosoComponents = useMemo(() => ({
    List: GridList,
    Item: GridItem
  }), []);

  if (!isLoading && servers.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="w-full max-w-md h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/20"
        >
           <p>{t('server.list.empty', 'No servers found matching your criteria.')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <VirtuosoGrid
      style={{ height: "100%", width: "100%" }}
      className="custom-scrollbar"
      totalCount={servers.length}
      context={contextValue}
      components={virtuosoComponents}
      itemContent={(index) => {
        const server = servers[index];
        const dimensions = CARD_DIMENSIONS[cardSize];
        return (
          <motion.div
            key={server.id}
            layout="position"
            custom={index}
            variants={itemVariants}
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            transition={{
              layout: {
                type: "spring",
                stiffness: 200,
                damping: 26
              }
            }}
          >
            <motion.div
              animate={{
                width: dimensions.width,
                height: dimensions.height
              }}
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 26
              }}
              className="mx-auto"
            >
              <ServerCard 
                data={server}
                size={cardSize}
                onConnect={() => actions.handleConnect(server)}
                onCopyIP={() => actions.handleCopyIP(server.ip)}
                onPin={() => actions.handlePin(server)}
                onDelete={() => actions.handleDelete(server.id)}
                onEdit={() => onEdit(server)}
              />
            </motion.div>
          </motion.div>
        );
      }}
    />
  );
};