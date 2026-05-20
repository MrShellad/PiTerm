import { useState } from "react";
import { Server } from "@/features/server/domain/types";
import { CardSize } from "../domain/types";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/features/server/domain/constants";
import { Terminal, Copy, MoreHorizontal, Pin, CalendarClock, Server as ServerIcon, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from "date-fns";
import { GlassTooltip } from "@/components/common/GlassTooltip";
import { useTranslation } from "react-i18next";

import {
  InteractiveCard,
  InteractiveCardHeader,
  InteractiveCardIcon,
  InteractiveCardBody,
  InteractiveCardBadge,
  InteractiveCardFooter,
  InteractiveCardTagsWrapper,
  InteractiveCardTag,
  InteractiveCardButton
} from "@/components/common/InteractiveCard";

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
  const Icon = ICON_MAP[data.icon] || ServerIcon;
  const [isCopied, setIsCopied] = useState(false);

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
    
    // 1. 已过期
    if (daysLeft < 0) {
        return { type: 'expired', text: t('server.status.expired', "Expired") };
    }
    
    // 2. 临近到期 (<= 7天)
    // 🟢 [修复] 恢复显示具体剩余天数
    if (daysLeft <= 7) {
        return { 
            type: 'warning', 
            // 使用插值显示具体天数，例如 "3d left"
            text: t('server.status.daysLeft', "{{count}}d left", { count: daysLeft }) 
        };
    }

    // 3. 正常状态
    return { type: 'normal', text: format(new Date(data.expireDate), 'yyyy-MM-dd') };
  };

  const expStatus = getExpirationStatus();

  // 针对不同尺寸的精细化排版配置
  const sizeConfig = {
    sm: { 
      height: '170px', 
      icon: '2rem',    
      title: '0.875rem',
      providerClass: 'text-[10px]',
      badgeClass: 'text-[12px] py-0.5 font-medium',          
      expirationClass: 'text-[12px] py-0.5',     
      tagClass: 'text-[10px] px-1.5 py-0.5',
      btnClass: 'h-6 text-[10px] px-2',
      iconInner: 'w-[55%] h-[55%]'
    }, 
    md: { 
      height: '200px', 
      icon: '2.5rem', 
      title: '1rem', 
      providerClass: 'text-xs',
      badgeClass: 'text-[14px] py-1 font-medium', 
      expirationClass: 'text-sm py-1',           
      tagClass: 'text-xs px-2 py-0.5',
      btnClass: 'h-7 text-xs px-3',
      iconInner: 'w-[50%] h-[50%]'
    },   
    lg: { 
      height: '210px', 
      icon: '3.0rem', 
      title: '1.25rem', 
      providerClass: 'text-sm font-medium',
      badgeClass: 'text-sm py-1.5 font-semibold', 
      expirationClass: 'text-sm py-1.5',         
      tagClass: 'text-sm px-2.5 py-1',
      btnClass: 'h-9 text-sm px-4', 
      iconInner: 'w-[46%] h-[46%]'
    }    
  };
  const currentSize = sizeConfig[size] || sizeConfig.md;

  return (
    <InteractiveCard
      className={cn(
        "group",
        "hover:!transform-none", 
        "focus-within:!transform-none", 
        "[&:has([data-state=open])]:!transform-none",
        "w-full h-full"
      )}
      isPinned={data.isPinned}
      style={{ 
        height: "100%"
      }}
    >
      {/* 1. Header */}
      <InteractiveCardHeader>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <InteractiveCardIcon style={{ width: currentSize.icon, height: currentSize.icon }}>
            <Icon className={currentSize.iconInner} />
          </InteractiveCardIcon>
          
          <div className="flex flex-col min-w-0 justify-center">
             <h3 
               className="font-semibold text-foreground truncate flex items-center gap-1.5 leading-tight transition-all"
               style={{ fontSize: currentSize.title }}
             >
                <span className="truncate">{data.name}</span>
                {data.isPinned && <Pin className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />}
             </h3>
             <span className={cn(
               "truncate mt-0.5 uppercase tracking-wide transition-all",
               "text-slate-500 dark:text-slate-400",
               currentSize.providerClass
             )}>
                {data.provider || null}
             </span>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <button type="button" className="text-muted-foreground p-1 rounded-md hover:bg-muted hover:text-foreground transition-all duration-200 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none">
                <MoreHorizontal className="w-4 h-4" />
             </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
             <DropdownMenuItem onClick={onEdit}>{t('common.edit', 'Edit')}</DropdownMenuItem>
             <DropdownMenuItem onClick={onPin}>{data.isPinned ? t('common.unpin', 'Unpin') : t('common.pin', 'Pin')}</DropdownMenuItem>
             <DropdownMenuItem className="text-red-500" onClick={onDelete}>{t('common.delete', 'Delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </InteractiveCardHeader>

      {/* 2. Body */}
      <InteractiveCardBody>
         <GlassTooltip content={isCopied ? t('common.copied', 'Copied!') : t('server.list.copyIp', 'Click to copy IP')} side="top">
             <InteractiveCardBadge 
               onClick={handleCopy}
               isHighlighted={isCopied}
               className={cn("mt-1 w-full relative group/ip transition-all", currentSize.badgeClass)}
             >
                <span className="truncate font-mono tracking-tight opacity-80 group-hover/ip:opacity-100 transition-opacity">
                   {isCopied ? t('common.copied', 'Copied!') : data.ip}
                </span>
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 group-hover/ip:opacity-100 transition-opacity">
                    {isCopied ? (
                        <Check className="w-full h-full text-emerald-500" />
                    ) : (
                        <Copy className="w-full h-full text-muted-foreground" />
                    )}
                </div>
             </InteractiveCardBadge>
         </GlassTooltip>

         {expStatus && (
            <div className={cn(
                "flex items-center justify-center gap-1.5 rounded-sm w-full transition-colors", 
                expStatus.type === 'expired' && "text-red-500",
                expStatus.type === 'warning' && "text-amber-500",
                expStatus.type === 'normal' && "text-muted-foreground/60",
                currentSize.expirationClass
            )}>
               <CalendarClock className="w-3 h-3 shrink-0" />
               <span className="truncate font-medium">{expStatus.text}</span>
            </div>
         )}
      </InteractiveCardBody>

      {/* 3. Footer */}
      <InteractiveCardFooter>
         <InteractiveCardTagsWrapper className={size === 'lg' ? "h-7" : ""}>
            {data.tags.length > 0 ? data.tags.map(tag => (
                <InteractiveCardTag key={tag} className={currentSize.tagClass}>
                  {tag}
                </InteractiveCardTag>
            )) : null}
         </InteractiveCardTagsWrapper>

         <InteractiveCardButton
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            className={currentSize.btnClass}
         >
            <Terminal className={cn("shrink-0", size === 'sm' ? "w-3 h-3 mr-1" : "w-3.5 h-3.5 sm:mr-1.5")} />
            <span className={cn("hidden sm:inline", size === 'lg' && "inline")}>{t('common.connect', 'Connect')}</span>
         </InteractiveCardButton>
      </InteractiveCardFooter>
    </InteractiveCard>
  );
};
