import { useMemo, useState, useRef, useEffect } from "react";
import { Server } from "@/features/server/domain/types";
import { CardSize } from "../domain/types";
import { ServerCard } from "./ServerCard";
import { ServerCardSkeleton } from "./ServerCardSkeleton"; 
import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from '@tanstack/react-virtual';

interface Props {
  servers: Server[];
  cardSize: CardSize;
  actions: any;
  onEdit: (s: Server) => void;
  isLoading?: boolean;
  shouldAnimate?: boolean;
}

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

export const ServerGrid = ({ 
  servers, 
  cardSize, 
  actions, 
  onEdit, 
  isLoading = false,
  shouldAnimate = true
}: Props) => {
  const { t } = useTranslation();
  
  const [columns, setColumns] = useState(1);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const containerWidth = parentRef.current.getBoundingClientRect().width;
      const cardWidth = cardSize === 'sm' ? 220 : cardSize === 'md' ? 260 : 320;
      const computed = Math.floor((containerWidth + 16) / (cardWidth + 16));
      setColumns(Math.max(1, computed));
    };

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    if (parentRef.current) {
      observer.observe(parentRef.current);
    }
    window.addEventListener('resize', updateColumns);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateColumns);
    };
  }, [cardSize]);

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
        delay: shouldAnimate ? Math.min(index * 0.04, 0.24) : 0
      }
    })
  };

  const rows = useMemo(() => {
    const chunked = [];
    for (let i = 0; i < servers.length; i += columns) {
      chunked.push(servers.slice(i, i + columns));
    }
    return chunked;
  }, [servers, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => {
      const cardHeight = cardSize === 'sm' ? 170 : cardSize === 'md' ? 200 : 210;
      return cardHeight + 16; 
    },
    overscan: 5,
  });

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
    <div 
      ref={parentRef}
      className="w-full h-full overflow-y-auto custom-scrollbar"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index];
          if (!rowItems) return null;
          return (
            <div
              key={virtualRow.key}
              className="grid gap-4 justify-center"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size - 16}px`,
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, ${COMPACT_WIDTHS[cardSize]})`,
              }}
            >
              {rowItems.map((server, colIndex) => {
                const globalIndex = virtualRow.index * columns + colIndex;
                const dimensions = CARD_DIMENSIONS[cardSize];
                return (
                  <motion.div
                    key={server.id}
                    layout="position"
                    custom={globalIndex}
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
                    style={{
                      width: dimensions.width,
                      height: dimensions.height
                    }}
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
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};