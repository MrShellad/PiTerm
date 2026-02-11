// src/features/terminal/components/monitor/card/DiskCard.tsx
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/utils/format";
import { MonitorCard } from "../MonitorCard";
import { BaseMonitorCardProps } from "../types";
import { HardDrive, Layers, Cpu, ArrowDown, ArrowUp } from "lucide-react";
import { clsx } from "clsx";

export const DiskCard = ({ id, data, isExpanded, onToggle, icon, color = "blue" }: BaseMonitorCardProps) => {
  const { t } = useTranslation();
  const diskData = data?.disk;
  const totalCap = diskData?.totalCap || 0;
  const usedCap = diskData?.usedCap || 0;
  const usagePercent = totalCap > 0 ? (usedCap / totalCap) * 100 : 0;

  return (
    <MonitorCard
      id={id}
      title={t('monitor.disk.title', 'Storage')}
      icon={icon}
      color={color}
      usage={usagePercent}
      usageDisplay={`${formatBytes(usedCap)} / ${formatBytes(totalCap)}`}
      detail={
        <div className="flex items-center gap-3 text-xs font-semibold">
           <div className="flex items-center gap-1 text-emerald-500">
             <ArrowDown className="w-3.5 h-3.5" /> {formatBytes(diskData?.readSpeed || 0)}/s
           </div>
           <div className="flex items-center gap-1 text-blue-500">
             <ArrowUp className="w-3.5 h-3.5" /> {formatBytes(diskData?.writeSpeed || 0)}/s
           </div>
        </div>
      }
      isExpanded={isExpanded}
      onToggle={onToggle}
      subTitle={t('monitor.disk.capacity_usage', 'Used / Total')}
    >
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        {diskData?.disks?.map((disk: any, idx: number) => (
          <div key={idx} className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={clsx("p-2 rounded-lg", disk.isSsd ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600" : "bg-slate-200 dark:bg-white/10 text-slate-500")}>
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{disk.name}</span>
                  <span className="text-[11px] text-slate-400 border-l border-slate-300 dark:border-white/10 pl-2 font-medium">{formatBytes(disk.total)}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 rounded font-semibold text-slate-500 flex items-center gap-1 uppercase tracking-widest">
                  <Cpu className="w-2.5 h-2.5" /> {disk.isSsd ? 'SSD' : 'HDD'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center px-0.5 text-[11px] font-medium tracking-tight">
              <div className="flex items-center gap-3">
                <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                  <ArrowDown className="w-3 h-3" /> {formatBytes(disk.readSpeed)}/s
                </span>
                <span className="text-blue-500 font-semibold flex items-center gap-0.5">
                  <ArrowUp className="w-3 h-3" /> {formatBytes(disk.writeSpeed)}/s
                </span>
              </div>
              <span className="text-slate-400">
                {((disk.available / disk.total) * 100).toFixed(1)}% {t('monitor.disk.free', 'Free')}
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${(disk.used / disk.total) * 100}%` }} />
            </div>

            {disk.partitions?.length > 0 && (
              <div className="mt-1 space-y-2.5 border-t border-slate-200 dark:border-white/5 pt-2.5">
                {disk.partitions.map((p: any, pIdx: number) => (
                  <div key={pIdx} className="flex justify-between items-center group">
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[160px]">{p.mount}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{p.typeName}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatBytes(p.used)} / {formatBytes(p.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </MonitorCard>
  );
};