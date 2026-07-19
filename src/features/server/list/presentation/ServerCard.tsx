import { useState, useMemo } from "react";
import { Server } from "@/features/server/domain/types";
import { CardSize } from "../domain/types";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/features/server/domain/constants";
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

// 6 款炫彩银行信用卡渐变配色系统
const CARD_THEMES = [
  {
    bg: "from-amber-600 via-orange-600 to-rose-800", // 暖金风 (Visa Style)
    border: "border-amber-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  {
    bg: "from-indigo-600 via-purple-700 to-slate-950", // 赛博紫 (Mastercard Style)
    border: "border-purple-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  {
    bg: "from-slate-900 via-zinc-800 to-zinc-950", // 钛合金黑卡 (Obsidian Metal)
    border: "border-amber-400/40",
    accent: "bg-amber-400/20 text-amber-200 border-amber-400/30 hover:bg-amber-400/30",
    badge: "bg-black/40 border-amber-400/30 text-amber-100 hover:bg-black/50",
  },
  {
    bg: "from-teal-700 via-emerald-800 to-slate-950", // 翡翠深绿 (Emerald Jade)
    border: "border-emerald-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  {
    bg: "from-blue-700 via-indigo-800 to-slate-950", // 蓝宝石 (Sapphire Navy)
    border: "border-blue-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  {
    bg: "from-rose-700 via-pink-800 to-slate-950", // 红宝石 (Ruby Rose)
    border: "border-rose-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  }
];

export const ServerCard = ({ data, size, onConnect, onCopyIP, onPin, onDelete, onEdit }: ServerCardProps) => {
  const { t } = useTranslation();
  const isPrivacyMode = useServerStore((s) => s.isPrivacyMode);
  const ServerTypeIcon = ICON_MAP[data.icon] || ServerIcon;
  const [isCopied, setIsCopied] = useState(false);

  // 根据 server id 确定卡片主题
  const cardTheme = useMemo(() => {
    let hash = 0;
    const str = data.id || data.name || "default";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CARD_THEMES.length;
    return CARD_THEMES[index];
  }, [data.id, data.name]);

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

  // 尺寸映射配置 (1.58:1 比例严格像素对齐适配)
  const sizeConfig = {
    sm: {
      padding: 'p-3',
      iconSize: 'w-5 h-5',
      ipFont: 'text-xs tracking-[0.1em]',
      titleFont: 'text-xs font-bold',
      btnHeight: 'h-6 text-[10px] px-2.5',
      tagClass: 'text-[9px] px-1.5 py-0.5',
    },
    md: {
      padding: 'p-3.5 sm:p-4',
      iconSize: 'w-6 h-6',
      ipFont: 'text-xs sm:text-sm tracking-[0.14em]',
      titleFont: 'text-sm font-bold',
      btnHeight: 'h-7 text-xs px-3',
      tagClass: 'text-[10px] px-2 py-0.5',
    },
    lg: {
      padding: 'p-4 sm:p-5',
      iconSize: 'w-7 h-7',
      ipFont: 'text-sm sm:text-base tracking-[0.16em]',
      titleFont: 'text-base font-bold',
      btnHeight: 'h-8 text-xs px-3.5',
      tagClass: 'text-xs px-2.5 py-0.5',
    }
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  return (
    <div
      className={cn(
        "bank-card border-[1.5px] group w-full h-full text-white flex flex-col justify-between select-none bg-gradient-to-br shadow-xl",
        cardTheme.bg,
        cardTheme.border,
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

      {/* --- Top Header: 简约放大图标 + 服务器名称 & 操作菜单 --- */}
      <div className="flex items-center justify-between z-10 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* 简约无边框放大图标 */}
          <ServerTypeIcon className={cn("text-white drop-shadow-md shrink-0", currentSize.iconSize)} />

          {/* 图标右侧：服务器名称 & Provider/OS */}
          <div className="flex flex-col min-w-0 justify-center leading-none">
            <h3 className={cn("uppercase truncate text-white drop-shadow-sm tracking-wider flex items-center gap-1", currentSize.titleFont)}>
              <span className="truncate">{data.name}</span>
            </h3>
            <span className="text-[10px] text-white/70 truncate uppercase tracking-widest font-medium mt-0.5">
              {data.provider || "SERVER"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {data.isPinned && (
            <div className="p-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200">
              <Pin className="w-3 h-3 fill-amber-300" />
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button" 
                className="text-white/70 p-1 rounded-md hover:bg-white/20 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
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

      {/* --- Middle Body: 银行卡卡号排版 (IP 地址) & 规范对齐的标签胶囊 --- */}
      <div className="z-10 my-auto flex flex-col justify-center gap-1.5">
        <GlassTooltip content={isCopied ? t('common.copied', 'Copied!') : t('server.list.copyIp', 'Click to copy IP')} side="top">
          <div 
            onClick={handleCopy}
            className={cn(
              "bank-card-number cursor-pointer flex items-center justify-between py-1 px-2.5 rounded-lg transition-all border border-white/10",
              cardTheme.badge,
              currentSize.ipFont
            )}
          >
            <span className="truncate">
              {isCopied ? t('common.copied', 'COPIED!') : formattedIp}
            </span>
            <div className="ml-2 shrink-0">
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
              )}
            </div>
          </div>
        </GlassTooltip>

        {/* 标签胶囊：严格安全边距与对齐 */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden w-full min-h-[20px] px-0.5">
            {data.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className={cn(
                  "inline-flex items-center rounded-full bg-black/25 border border-white/20 text-white/90 font-medium backdrop-blur-sm truncate max-w-[85px] leading-none shrink-0 shadow-sm",
                  currentSize.tagClass
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* --- Bottom Footer: 有效期 (不含前缀文字) & 声波感应连接按钮 --- */}
      <div className="flex items-end justify-between gap-2 z-10 shrink-0 pt-1">
        <div className="flex flex-col min-w-0 max-w-[60%] justify-end">
          <div className="flex items-center leading-none">
            <span className={cn(
              "bank-card-value font-mono leading-none",
              expStatus?.type === 'expired' && "text-red-300 font-bold",
              expStatus?.type === 'warning' && "text-amber-300 font-bold"
            )}>
              {expStatus ? expStatus.text : "PERPETUAL"}
            </span>
          </div>

          <span className="text-[10px] text-white/70 truncate font-mono mt-1 leading-none">
            {data.username ? `${data.username}@${data.port || 22}` : `PORT: ${data.port || 22}`}
          </span>
        </div>

        {/* 连接按钮：采用无线声波 (Wifi) 图标替代终端图标 */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConnect(); }}
          className={cn(
            "rounded-full font-bold shadow-lg backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 shrink-0 border border-white/20",
            cardTheme.accent,
            currentSize.btnHeight
          )}
        >
          <div className="relative flex items-center justify-center">
            <Wifi className="w-3.5 h-3.5 rotate-90 text-white opacity-95 shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="uppercase tracking-wider ml-0.5">{t('common.connect', 'CONNECT')}</span>
        </button>
      </div>
    </div>
  );
};
