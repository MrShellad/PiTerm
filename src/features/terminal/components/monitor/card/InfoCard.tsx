// src/features/terminal/components/monitor/card/InfoCard.tsx
import { useTranslation } from "react-i18next";
import { formatUptime } from "@/utils/format";
import { MonitorCard } from "../MonitorCard";
import { BaseMonitorCardProps } from "../types";

export const InfoCard = ({ id, data, isExpanded, onToggle, icon, color = "green" }: BaseMonitorCardProps) => {
  const { t } = useTranslation();
  const osData = data?.os;

  const items = osData ? [
    { label: t('monitor.info.timezone', 'Timezone'), val: osData.timezone },
    { label: t('monitor.info.kernel', 'Kernel'), val: osData.kernel },
    { label: t('monitor.info.arch', 'Arch'), val: osData.arch },
  ] : [];

  return (
    <MonitorCard
      id={id}
      title={t('monitor.info.title', 'System Info')}
      icon={icon}
      color={color}
      isExpanded={isExpanded}
      onToggle={onToggle}
      detail={<span className="text-xs font-medium text-slate-500 dark:text-slate-400">{osData?.distro || t('monitor.loading', 'Loading...')}</span>}
      usage={0}
      usageDisplay={osData ? formatUptime(osData.uptime) : "-"}
      subTitle={t('monitor.info.uptime', 'Uptime')} 
    >
      <div className="flex flex-col gap-2 animate-in fade-in duration-300">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs py-2 border-b border-slate-200/60 dark:border-white/5 last:border-0">
            <span className="text-slate-500 dark:text-slate-400 uppercase font-medium tracking-widest text-[11px]">
              {item.label}
            </span>
            <span className="text-slate-700 dark:text-slate-200 font-semibold tabular-nums truncate max-w-[200px]" title={item.val}>
              {item.val}
            </span>
          </div>
        ))}
      </div>
    </MonitorCard>
  );
};