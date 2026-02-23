// src/features/terminal/components/monitor/card/NetworkCard.tsx
import { ArrowDown, ArrowUp, Copy, Check, Activity } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/utils/format";
import { MonitorCard } from "../MonitorCard";
import { BaseMonitorCardProps } from "../types";
import { InterfaceInfo } from "@/store/useMonitorStore";
import { clsx } from "clsx";

const IpItem = ({ ip, label }: { ip: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    navigator.clipboard.writeText(ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={handleCopy}
      className="flex items-center justify-between group cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 p-1 px-1.5 rounded transition-colors"
    >
      {/* 🟢 [优化] text-[10px] -> text-xs */}
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}: {ip}</span>
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
      )}
    </div>
  );
};

export const NetworkCard = ({ id, data, isExpanded, onToggle, icon, color = "orange" }: BaseMonitorCardProps) => {
  const { t } = useTranslation();
  const netData = data?.network;

  return (
    <MonitorCard
      id={id}
      title={t('monitor.network.title', 'Network')}
      icon={icon}
      color={color}
      isExpanded={isExpanded}
      onToggle={onToggle}
      detail={
        // 🟢 [优化] text-[12px] -> text-xs (12px 标准)
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
           <Activity className="w-3 h-3 opacity-70" />
           <span>{netData?.tcpConnections || 0} {t('monitor.network.tcp_conns', 'TCP Connections')}</span>
        </div>
      }
      usage={0}
      usageDisplay={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
            <ArrowDown className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="text-base font-semibold tracking-tighter tabular-nums">
              {netData ? formatBytes(netData.rxSpeed) : "0 B"}/s
            </span>
          </div>
          <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
            <ArrowUp className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="text-base font-semibold tracking-tighter tabular-nums">
              {netData ? formatBytes(netData.txSpeed) : "0 B"}/s
            </span>
          </div>
        </div>
      }
      subTitle={t('monitor.network.realtime', 'Real-time Speed')}
    >
      <div className="flex flex-col gap-5 animate-in fade-in duration-300">
        {/* 1. 总流量概览 */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
          <div className="flex flex-col gap-1">
            {/* 🟢 [优化] text-[10px] -> text-xs */}
            <span className="text-xs uppercase text-slate-500 font-semibold tracking-widest">{t('monitor.network.rx_total', 'Rx Total')}</span>
            <div className="flex items-center gap-2">
               <ArrowDown className="w-3 h-3 text-emerald-500" />
               {/* 🟢 [优化] text-[13px] -> text-sm (14px) */}
               <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{formatBytes(netData?.totalRx || 0)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l border-slate-200 dark:border-white/10 pl-3">
            {/* 🟢 [优化] text-[10px] -> text-xs */}
            <span className="text-xs uppercase text-slate-500 font-semibold tracking-widest">{t('monitor.network.tx_total', 'Tx Total')}</span>
            <div className="flex items-center gap-2">
               <ArrowUp className="w-3 h-3 text-blue-500" />
               {/* 🟢 [优化] text-[13px] -> text-sm (14px) */}
               <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{formatBytes(netData?.totalTx || 0)}</span>
            </div>
          </div>
        </div>

        {/* 2. 网卡详细列表 */}
        <div className="flex flex-col gap-3">
          {/* 🟢 [优化] text-[10px] -> text-xs */}
          <span className="text-xs uppercase text-slate-400 font-semibold tracking-widest px-1">
            {t('monitor.network.interfaces', 'Interface Detail')}
          </span>
          <div className="space-y-3">
            {netData?.interfaces.map((iface: InterfaceInfo, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={clsx(
                        "w-2 h-2 rounded-full shadow-[0_0_8px]",
                        iface.status === "UP" ? "bg-emerald-500 shadow-emerald-500/50" : "bg-slate-300 dark:bg-slate-700 shadow-transparent"
                    )} />
                    {/* 🟢 [优化] text-[12px] -> text-sm */}
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{iface.name}</span>
                    <span className={clsx(
                        // 🟢 [优化] text-[8px] -> text-[10px]
                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                        iface.status === "UP" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20" : "bg-slate-200 text-slate-500 dark:bg-white/10"
                    )}>
                        {iface.status}
                    </span>
                  </div>
                  {/* 🟢 [优化] text-[9px] -> text-xs */}
                  {iface.mac && <span className="text-xs font-medium text-slate-400 font-mono tracking-tight">{iface.mac}</span>}
                </div>

                {/* 单网卡实时速率与流量 */}
                <div className="grid grid-cols-2 gap-4 bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-slate-200/30 dark:border-white/5">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                         {/* 🟢 [优化] text-[8px] -> text-[10px] */}
                         <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Down</span>
                         {/* 🟢 [优化] text-[10px] -> text-xs */}
                         <span className="text-xs font-semibold text-emerald-500 tabular-nums">{formatBytes(iface.rxSpeed)}/s</span>
                      </div>
                      {/* 🟢 [优化] text-[9px] -> text-[10px] */}
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 text-right opacity-70">Vol: {formatBytes(iface.totalRx)}</span>
                   </div>
                   <div className="flex flex-col gap-1 border-l border-slate-200 dark:border-white/10 pl-3">
                      <div className="flex items-center justify-between">
                         {/* 🟢 [优化] text-[8px] -> text-[10px] */}
                         <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Up</span>
                         {/* 🟢 [优化] text-[10px] -> text-xs */}
                         <span className="text-xs font-semibold text-blue-500 tabular-nums">{formatBytes(iface.txSpeed)}/s</span>
                      </div>
                      {/* 🟢 [优化] text-[9px] -> text-[10px] */}
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 text-right opacity-70">Vol: {formatBytes(iface.totalTx)}</span>
                   </div>
                </div>

                {/* IP 地址列表 */}
                <div className="flex flex-col gap-0.5 bg-slate-50/50 dark:bg-transparent rounded px-1">
                  {iface.ipv4.map((ip: string) => <IpItem key={ip} ip={ip} label="IPv4" />)}
                  {iface.ipv6.map((ip: string) => <IpItem key={ip} ip={ip} label="IPv6" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MonitorCard>
  );
};