// src/features/monitor/presentation/components/SingleSessionMonitor.tsx
import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Server, Cpu, Zap, Database, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LayoutGroup } from "framer-motion";
import { clsx } from "clsx";

import { useMonitorStore, RemoteCpuInfo, RemoteMemInfo, RemoteDiskInfo, RemoteOsInfo, RemoteNetworkInfo } from "@/store/useMonitorStore";
import { MonitorDescriptor, MonitorSyncPayload } from "@/features/terminal/components/monitor/types";

import { InfoCard } from "@/features/terminal/components/monitor/card/InfoCard";
import { CpuCard } from "@/features/terminal/components/monitor/card/CpuCard";
import { MemoryCard } from "@/features/terminal/components/monitor/card/MemoryCard";
import { DiskCard } from "@/features/terminal/components/monitor/card/DiskCard";
import { NetworkCard } from "@/features/terminal/components/monitor/card/NetworkCard";
import { ProcessCard } from "@/features/terminal/components/monitor/card/ProcessCard";

interface Props {
    sessionId: string;
    isDashboard?: boolean; 
}

export const SingleSessionMonitor = ({ sessionId, isDashboard = false }: Props) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { sessions, setSessionData, updateHistory } = useMonitorStore();
  const sessionData = sessions[sessionId];

  const CARD_DESCRIPTORS = useMemo<MonitorDescriptor[]>(() => [
    { id: 'os',   Component: InfoCard,    icon: <Server className="w-5 h-5" />,   color: "green" },
    { id: 'cpu',  Component: CpuCard,     icon: <Cpu className="w-5 h-5" />,      color: "blue" },
    { id: 'mem',  Component: MemoryCard,  icon: <Zap className="w-5 h-5" />,      color: "purple" },
    { id: 'disk', Component: DiskCard,    icon: <Database className="w-5 h-5" />, color: "blue" },
    { id: 'net',  Component: NetworkCard, icon: <Wifi className="w-5 h-5" />,     color: "orange" },
  ], []);

  // 监听主窗口广播数据
  useEffect(() => {
    if (!sessionId) return;

    const unlistenPromise = listen<MonitorSyncPayload>("monitor:sync-data", (event) => {
        const { sessionId: syncId, data } = event.payload;
        if (syncId === sessionId) {
            setSessionData(sessionId, data);
            if (data.cpu) updateHistory(sessionId, data.cpu.usage);
        }
    });

    // 兜底逻辑
    const fetchData = async () => {
      try {
        const [cpu, mem, disk, os, net] = await Promise.allSettled([
          invoke<RemoteCpuInfo>("get_ssh_cpu_info", { id: sessionId }),
          invoke<RemoteMemInfo>("get_ssh_mem_info", { id: sessionId }),
          invoke<RemoteDiskInfo>("get_ssh_disk_info", { id: sessionId }),
          invoke<RemoteOsInfo>("get_ssh_os_info", { id: sessionId }),
          invoke<RemoteNetworkInfo>("get_ssh_network_info", { id: sessionId }),
        ]);

        const updates: any = {};
        if (cpu.status === "fulfilled") {
          updates.cpu = cpu.value;
          updateHistory(sessionId, cpu.value.usage);
        }
        if (mem.status === "fulfilled") updates.mem = mem.value;
        if (disk.status === "fulfilled") updates.disk = disk.value;
        if (os.status === "fulfilled") updates.os = os.value;
        if (net.status === "fulfilled") updates.network = net.value;

        setSessionData(sessionId, updates);
      } catch (err) {}
    };

    const interval = setInterval(fetchData, 10000); 

    return () => {
        unlistenPromise.then(fn => fn());
        clearInterval(interval);
    };
  }, [sessionId, setSessionData, updateHistory]);

  if (!sessionData) {
      return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
          <div className={clsx(
              "h-full w-full overflow-y-auto custom-scrollbar",
              isDashboard ? "px-1 py-2" : "p-4"
          )}>
            <div className="flex flex-col gap-4 pb-4">
              <div className={clsx(
                  "gap-3",
                  isDashboard
                    ? "flex flex-col"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              )}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="min-h-[7rem] w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-white/5 animate-pulse" />
                      <div className="flex-1 space-y-2">
                         <div className="h-4 bg-slate-200/50 dark:bg-white/5 rounded w-1/3 animate-pulse" />
                         <div className="h-3 bg-slate-200/50 dark:bg-white/5 rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-4 pl-0.5">
                      <div className="h-3 bg-slate-200/50 dark:bg-white/5 rounded w-1/4 animate-pulse" />
                      <div className="h-6 bg-slate-200/50 dark:bg-white/5 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="min-h-[16rem] w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 flex flex-col gap-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-white/5 animate-pulse" />
                    <div className="h-4 bg-slate-200/50 dark:bg-white/5 rounded w-1/6 animate-pulse" />
                 </div>
                 <div className="space-y-3 mt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 bg-slate-200/50 dark:bg-white/5 rounded w-full animate-pulse" />
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      );
  }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <style>{`
        .custom-scrollbar { scrollbar-gutter: stable; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.2); border-radius: 3px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); }
      `}</style>

      <div className={clsx(
          "h-full w-full overflow-y-auto custom-scrollbar",
          isDashboard ? "px-1 py-2" : "p-4"
      )}>
        <LayoutGroup id={`monitor-group-${sessionId}`}>
          <div className="flex flex-col gap-4 pb-4">
            <div className={clsx(
                "gap-3",
                isDashboard
                  ? "flex flex-col"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}>
              {CARD_DESCRIPTORS.map(({ id, Component, icon, color }) => (
                <Component
                  key={id} id={id} icon={icon} color={color}
                  data={sessionData}
                  isExpanded={expandedId === id}
                  onToggle={(id: string) => setExpandedId(prev => prev === id ? null : id)}
                />
              ))}
            </div>

            {/* 🟢 [修正] 移除了 !isDashboard 判断，确保 ProcessCard 始终渲染 */}
            <ProcessCard 
                sessionId={sessionId}
                isExpanded={expandedId === 'proc'}
                onToggle={(id: string) => setExpandedId(prev => prev === id ? null : id)}
            />
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
};