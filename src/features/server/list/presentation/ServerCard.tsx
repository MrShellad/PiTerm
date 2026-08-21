import { useState, useMemo } from "react";
import { Server } from "@/features/server/domain/types";
import { CardSize } from "../domain/types";
import { cn } from "@/lib/utils";
import { ICON_MAP, CARD_THEMES, DEFAULT_CARD_THEME } from "@/features/server/domain/constants";
import { Copy, MoreHorizontal, Pin, Server as ServerIcon, Check, Wifi } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from "date-fns";
import { GlassTooltip } from "@/components/common/GlassTooltip";
import { useTranslation } from "react-i18next";

import { useServerStore } from "@/features/server/application/useServerStore";

interface ServerCardProps {
  data: Server;
  size: CardSize;
  onConnect: () => void;
  onCopyIP: () => void;
  onPin: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export const ServerCard = ({ data, size, onConnect, onCopyIP, onPin, onDelete, onEdit }: ServerCardProps) => {
  const { t } = useTranslation();
  const isPrivacyMode = useServerStore((s) => s.isPrivacyMode);
  const ServerTypeIcon = ICON_MAP[data.icon] || ServerIcon;
  const [isCopied, setIsCopied] = useState(false);

  // 获取服务器专属设定的卡片主题配色（避免随机分配）
  const cardTheme = useMemo(() => {
    if (data.theme && CARD_THEMES[data.theme]) {
      return CARD_THEMES[data.theme];
    }
    return CARD_THEMES[DEFAULT_CARD_THEME];
  }, [data.theme]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onCopyIP();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const getExpirationStatus = () => {
    if (!data.enableExpiration || !data.expireDate) return null;
    const daysLeft = differenceInDays(new Date(data.expireDate), new Date());
    
    if (daysLeft < 0) {
      return { type: 'expired', text: t('server.status.expired', "EXPIRED") };
    }
    
    if (daysLeft <= 7) {
      return { 
        type: 'warning', 
        text: t('server.status.daysLeft', "{{count}}D LEFT", { count: daysLeft }) 
      };
    }

    return { type: 'normal', text: format(new Date(data.expireDate), 'MM/yy') };
  };

  const expStatus = getExpirationStatus();

  // 当处于隐私模式时将 IP 掩码化为星号
  const formattedIp = isPrivacyMode ? "***.***.***.***" : data.ip;

  // 尺寸映射配置 (遵循统一字体层级、精准高度对齐与呼吸感间距规范)
  const sizeConfig = {
    sm: {
      padding: 'p-4',
      iconBox: 'w-11 h-11',
      iconSize: 'w-6 h-6',
      textBox: 'h-11',
      titleFont: 'text-[18px] font-bold tracking-tight',
      subtitleFont: 'text-[12px] font-medium tracking-wide',
      ipFont: 'text-sm font-mono tracking-wider font-semibold',
      ipPadding: 'h-9 px-3',
      tagClass: 'text-[11px] px-2.5 py-0.5 font-medium',
      footerMetaFont: 'text-xs font-mono',
      expFont: 'text-xs font-mono font-semibold',
      btnHeight: 'h-8 text-xs font-bold px-3.5',
      moreBtnSize: 'w-8 h-8',
    },
    md: {
      padding: 'p-5',
      iconBox: 'w-12 h-12',
      iconSize: 'w-7 h-7',
      textBox: 'h-12',
      titleFont: 'text-[21px] font-bold tracking-tight',
      subtitleFont: 'text-[13px] font-medium tracking-wide',
      ipFont: 'text-[15px] font-mono tracking-wider font-semibold',
      ipPadding: 'h-10 px-3.5',
      tagClass: 'text-xs px-3 py-1 font-medium',
      footerMetaFont: 'text-xs sm:text-[13px] font-mono',
      expFont: 'text-xs sm:text-[13px] font-mono font-semibold',
      btnHeight: 'h-9 text-sm font-bold px-4',
      moreBtnSize: 'w-8 h-8',
    },
    lg: {
      padding: 'p-6',
      iconBox: 'w-14 h-14',
      iconSize: 'w-8 h-8',
      textBox: 'h-14',
      titleFont: 'text-[24px] font-bold tracking-tight',
      subtitleFont: 'text-[15px] font-medium tracking-wide',
      ipFont: 'text-base font-mono tracking-widest font-semibold',
      ipPadding: 'h-11 px-4',
      tagClass: 'text-[13px] px-3.5 py-1 font-medium',
      footerMetaFont: 'text-sm font-mono',
      expFont: 'text-sm font-mono font-semibold',
      btnHeight: 'h-10 text-[15px] font-bold px-5',
      moreBtnSize: 'w-9 h-9',
    }
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  return (
    <div
      className={cn(
        "bank-card group w-full h-full text-white flex flex-col justify-between select-none bg-gradient-to-br",
        cardTheme.bg,
        currentSize.padding
      )}
    >
      {/* 扫光微效 */}
      <div className="bank-card-shine" />

      {/* 背景抽象晶格弧线图案 */}
      <svg className="absolute right-0 top-0 bottom-0 w-3/4 h-full opacity-15 pointer-events-none stroke-white/30 fill-none" viewBox="0 0 200 120" preserveAspectRatio="none">
        <path d="M50,-20 C100,40 120,80 220,140" strokeWidth="1.5" />
        <path d="M20,-40 C80,30 110,90 200,160" strokeWidth="1" />
        <circle cx="160" cy="30" r="40" strokeWidth="1" />
        <circle cx="160" cy="30" r="70" strokeWidth="0.5" />
      </svg>

      {/* --- 1. Top Header: 图标盒子 + 标题/副标题 (上下高度完全对齐) + 操作菜单 --- */}
      <div className="flex items-center justify-between z-10 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* 质感图标胶囊：高度与右侧文字块严格对齐 */}
          <div className={cn(
            "rounded-xl bg-white/12 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner",
            currentSize.iconBox
          )}>
            <ServerTypeIcon className={cn("text-white drop-shadow-md", currentSize.iconSize)} />
          </div>

          {/* 标题 & 服务商：上下高度与图标盒严格对齐 */}
          <div className={cn("flex flex-col justify-between min-w-0 flex-1 py-0.5", currentSize.textBox)}>
            <h3 className={cn("truncate text-white font-bold tracking-tight drop-shadow-sm leading-none flex items-center gap-1.5", currentSize.titleFont)}>
              <span className="truncate">{data.name}</span>
            </h3>
            <span className={cn("text-white/70 truncate uppercase font-semibold tracking-wider leading-none mt-auto", currentSize.subtitleFont)}>
              {data.provider || "SERVER"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {data.isPinned && (
            <div className="w-8 h-8 rounded-lg bg-amber-400/25 border border-amber-300/40 text-amber-200 flex items-center justify-center">
              <Pin className="w-3.5 h-3.5 fill-amber-300" />
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button" 
                className={cn(
                  "text-white/70 rounded-lg hover:bg-white/20 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none flex items-center justify-center cursor-pointer",
                  currentSize.moreBtnSize
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>{t('common.edit', 'Edit')}</DropdownMenuItem>
              <DropdownMenuItem onClick={onPin}>{data.isPinned ? t('common.unpin', 'Unpin') : t('common.pin', 'Pin')}</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500" onClick={onDelete}>{t('common.delete', 'Delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* --- 2. Middle Body: 核心 IP 地址 (14-16px) & 标签胶囊 (独立空间不拥挤) --- */}
      <div className="z-10 flex-1 flex flex-col justify-center py-2 gap-2 min-h-0">
        <GlassTooltip content={isCopied ? t('common.copied', 'Copied!') : t('server.list.copyIp', 'Click to copy IP')} side="top">
          <div 
            onClick={handleCopy}
            className={cn(
              "bank-card-number cursor-pointer flex items-center justify-between rounded-xl transition-all border border-white/15 bg-black/30 hover:bg-black/40 shadow-sm",
              cardTheme.badge,
              currentSize.ipFont,
              currentSize.ipPadding
            )}
          >
            <span className="truncate">
              {isCopied ? t('common.copied', 'COPIED!') : formattedIp}
            </span>
            <div className="ml-2.5 shrink-0">
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
              )}
            </div>
          </div>
        </GlassTooltip>

        {/* 标签胶囊：行高充沛且对齐 */}
        {data.tags && data.tags.length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-hidden w-full min-h-[24px] px-0.5">
            {data.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className={cn(
                  "inline-flex items-center rounded-full bg-black/25 border border-white/20 text-white/90 backdrop-blur-sm truncate max-w-[100px] leading-none shrink-0 shadow-sm",
                  currentSize.tagClass
                )}
              >
                {tag}
              </span>
            ))}
            {data.tags.length > 3 && (
              <span className={cn(
                "inline-flex items-center rounded-full bg-black/30 border border-white/20 text-white/70 backdrop-blur-sm leading-none shrink-0",
                currentSize.tagClass
              )}>
                +{data.tags.length - 3}
              </span>
            )}
          </div>
        ) : (
          <div className="min-h-[6px]" />
        )}
      </div>

      {/* --- 3. Bottom Footer: 次要元信息 (有效期/端口) & 主要操作按钮 (加粗突出 Connect，无分割线) --- */}
      <div className="flex items-center justify-between gap-3 z-10 shrink-0 pt-1.5">
        <div className="flex flex-col min-w-0 max-w-[58%] justify-center">
          <div className="flex items-center leading-none">
            <span className={cn(
              "leading-none",
              currentSize.expFont,
              expStatus?.type === 'expired' && "text-red-300 font-bold",
              expStatus?.type === 'warning' && "text-amber-300 font-bold",
              !expStatus && "text-white/85 font-medium"
            )}>
              {expStatus ? expStatus.text : "PERPETUAL"}
            </span>
          </div>

          <span className={cn("text-white/70 truncate mt-1 leading-none font-mono", currentSize.footerMetaFont)}>
            {data.username ? `${data.username}@${data.port || 22}` : `PORT: ${data.port || 22}`}
          </span>
        </div>

        {/* 主要操作按钮：加粗 (font-bold) 突出显示，带声波微效 */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConnect(); }}
          className={cn(
            "rounded-full font-bold shadow-lg backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shrink-0 border border-white/25 cursor-pointer hover:shadow-xl",
            cardTheme.accent,
            currentSize.btnHeight
          )}
        >
          <Wifi className="w-4 h-4 rotate-90 text-white opacity-95 shrink-0" />
          <span className="uppercase tracking-wider font-bold">{t('common.connect', 'CONNECT')}</span>
        </button>
      </div>
    </div>
  );
};
