import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Server } from "@/features/server/domain/types";
import { ICON_MAP } from "@/features/server/domain/constants";
import { cn } from "@/lib/utils";
import { 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Terminal, 
  Copy, 
  MoreHorizontal, 
  Pin, 
  Server as ServerIcon, 
  CalendarClock,
  Check 
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { motion, Variants } from "framer-motion";
import { useVirtualizer } from '@tanstack/react-virtual';

import { GlassTooltip } from "@/components/common/GlassTooltip";
import "@/styles/components/server/server-table.css";

interface Props {
  servers: Server[];
  actions: any;
  onEdit: (s: Server) => void;
  onTagClick?: (tag: string) => void;
  isLoading?: boolean; // [新增] 接收加载状态
}

// [新增] 表格骨架行组件
const TableSkeletonRow = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-muted/50 rounded shrink-0 animate-pulse" />
        <div className="flex flex-col gap-1">
           <div className="w-32 h-4 bg-muted/50 rounded animate-pulse" />
           <div className="w-20 h-3 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    </TableCell>
    <TableCell>
      <div className="w-24 h-4 bg-muted/50 rounded mx-auto animate-pulse" />
    </TableCell>
    <TableCell>
      <div className="flex justify-center gap-1">
        <div className="w-12 h-5 bg-muted/50 rounded-full animate-pulse" />
      </div>
    </TableCell>
    <TableCell>
      <div className="w-20 h-5 bg-muted/50 rounded mx-auto animate-pulse" />
    </TableCell>
    <TableCell className="text-right">
       <div className="flex justify-end gap-2">
         <div className="w-20 h-8 bg-muted/50 rounded animate-pulse" />
         <div className="w-8 h-8 bg-muted/50 rounded animate-pulse" />
       </div>
    </TableCell>
  </TableRow>
);

// --- 独立的 IP 单元格组件 ---
const IpCell = ({ ip, onCopy }: { ip: string, onCopy: (text: string) => void }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(ip);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <GlassTooltip 
        content={isCopied ? t('common.copied', 'Copied!') : t('server.list.copyIp', 'Click to copy IP')} 
        side="top"
    >
      <div 
        onClick={handleCopy}
        className={cn("server-table__ip", isCopied && "is-copied")}
      >
        <span className={cn("server-table__ip-text truncate", isCopied ? "opacity-0" : "opacity-100")}>
          {ip}
        </span>

        {/* 居中显示的"已复制"文本 */}
        <span className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-sm font-bold transition-opacity pointer-events-none", 
          isCopied ? "opacity-100" : "opacity-0"
        )}>
          {t('common.copied', 'Copied!')}
        </span>

        <div className="relative w-3 h-3 ml-1 shrink-0">
          <Copy className={cn(
            "absolute top-0 right-0 w-full h-full transition-all duration-300",
            isCopied ? "opacity-0 scale-50 rotate-90" : "opacity-0 group-hover:opacity-100 scale-100 rotate-0"
          )} />
          <Check className={cn(
            "absolute top-0 right-0 w-full h-full transition-all duration-300",
            isCopied ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90"
          )} />
        </div>
      </div>
    </GlassTooltip>
  );
};

const tableRowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({ 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.25, 
      ease: "easeOut",
      delay: Math.min(index * 0.02, 0.2) // 限制最大延迟时间
    } 
  })
};

export const ServerTableView = ({ servers, actions, onEdit, onTagClick, isLoading }: Props) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const getExpirationStatus = (server: Server) => {
    if (!server.enableExpiration || !server.expireDate) return null;
    const daysLeft = differenceInDays(new Date(server.expireDate), new Date());
    
    if (daysLeft < 0) return { 
        type: 'expired', 
        text: t('server.status.expired', 'Expired') 
    };
    if (daysLeft <= 7) return { 
        type: 'warning', 
        text: t('server.status.daysLeft', '{{count}} days left', { count: daysLeft }) 
    };
    return { 
        type: 'normal', 
        text: format(new Date(server.expireDate), 'yyyy-MM-dd') 
    };
  };

  const rowVirtualizer = useVirtualizer({
    count: servers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  // 处理 Loading 状态
  if (isLoading && servers.length === 0) {
     return (
        <div className="server-table-wrapper h-[calc(100%-0.5rem)] overflow-hidden">
           <table className="server-table">
              <thead className="server-table__header">
                <tr className="hover:bg-transparent border-b border-border/60">
                    <th className="server-table__th w-[20%] min-w-[180px] text-left">{t('server.columns.name', 'Server Name')}</th>
                    <th className="server-table__th w-[20%] min-w-[180px] text-center">{t('server.columns.ip', 'IP Address')}</th>
                    <th className="server-table__th w-[30%] min-w-[200px] text-center">{t('server.columns.tags', 'Tags')}</th>
                    <th className="server-table__th w-[15%] min-w-[140px] text-center">{t('server.columns.expiration', 'Expiration')}</th>
                    <th className="server-table__th w-[15%] min-w-[120px] text-right">{t('server.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                 {Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)}
              </tbody>
           </table>
        </div>
     );
  }

  // 空状态
  if (servers.length === 0) {
    return (
      <div className="mt-2 h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/20 mx-2">
         <p>{t('server.list.empty', 'No servers found matching your criteria.')}</p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="server-table-wrapper h-[calc(100%-0.5rem)] overflow-y-auto custom-scrollbar"
    >
      <table className="server-table">
        <TableHeader className="server-table__header sticky top-0 z-10 bg-[hsl(var(--card))]">
          <TableRow className="hover:bg-transparent border-b border-border/60">
            <TableHead className="server-table__th w-[20%] min-w-[180px] text-left">{t('server.columns.name', 'Server Name')}</TableHead>
            <TableHead className="server-table__th w-[20%] min-w-[180px] text-center">{t('server.columns.ip', 'IP Address')}</TableHead>
            <TableHead className="server-table__th w-[30%] min-w-[200px] text-center">{t('server.columns.tags', 'Tags')}</TableHead>
            <TableHead className="server-table__th w-[15%] min-w-[140px] text-center">{t('server.columns.expiration', 'Expiration')}</TableHead>
            <TableHead className="server-table__th w-[15%] min-w-[120px] text-right">{t('server.columns.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {paddingTop > 0 && (
            <tr style={{ height: `${paddingTop}px` }}>
              <td colSpan={5} style={{ padding: 0, border: 0 }} />
            </tr>
          )}

          {virtualItems.map((virtualRow) => {
            const server = servers[virtualRow.index];
            if (!server) return null;
            const Icon = ICON_MAP[server.icon] || ServerIcon;
            const expStatus = getExpirationStatus(server);

            return (
              <motion.tr
                key={server.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                layout="position"
                custom={virtualRow.index}
                variants={tableRowVariants}
                initial="hidden"
                animate="visible"
                className={cn("server-table__row group", server.isPinned && "is-pinned")}
              >
                {/* 1. Name */}
                <TableCell className="server-table__cell">
                  <div className="flex items-center gap-3">
                    <div className="server-table__icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="server-table__name">
                          {server.name}
                          {server.isPinned && <Pin className="w-3 h-3 text-blue-500 rotate-45 fill-blue-500/20 shrink-0" />}
                      </div>
                      {server.provider ? (
                        <div className="server-table__provider">
                            {server.provider}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>

                {/* 2. IP */}
                <TableCell className="server-table__cell">
                  <IpCell ip={server.ip} onCopy={actions.handleCopyIP} />
                </TableCell>

                {/* 3. Tags */}
                <TableCell className="server-table__cell">
                  <div className="server-table__tags">
                    {server.tags.length > 0 ? (
                      server.tags.map(tag => (
                        <span 
                            key={tag} 
                            onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                            className="server-table__tag"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground/30 text-xs px-1">-</span>
                    )}
                  </div>
                </TableCell>

                {/* 4. Expiration */}
                <TableCell className="server-table__cell">
                  <div className="flex justify-center">
                    {expStatus ? (
                        <div className={cn("server-table__expiration", `server-table__expiration--${expStatus.type}`)}>
                            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                            {expStatus.text}
                        </div>
                    ) : (
                        <span className="text-muted-foreground/30 text-xs px-1">-</span>
                    )}
                  </div>
                </TableCell>

                {/* 5. Actions */}
                <TableCell className="server-table__cell text-right">
                    <div className="server-table__actions">
                        <Button 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); actions.handleConnect(server); }}
                          className="server-table__btn-connect"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          {t('common.connect', 'Connect')}
                        </Button>

                        <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(server)}>
                                {t('common.edit', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => actions.handlePin(server)}>
                             {server.isPinned ? t('common.unpin', 'Unpin') : t('common.pin', 'Pin')}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => actions.handleDelete(server.id)}>
                                {t('common.delete', 'Delete')}
                            </DropdownMenuItem>
                         </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </TableCell>
              </motion.tr>
            );
          })}

          {paddingBottom > 0 && (
            <tr style={{ height: `${paddingBottom}px` }}>
              <td colSpan={5} style={{ padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
