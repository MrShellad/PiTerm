// src/features/terminal/components/TerminalMonitor.tsx
import { useEffect, useState, useMemo } from "react";
import { 
  PanelLeft, PanelRight, ChevronLeft, ChevronRight, ExternalLink,
  Server, Cpu, Zap, Database, Wifi 
} from "lucide-react"; 
import { useTranslation } from "react-i18next";
import { LayoutGroup } from "framer-motion";
import { clsx } from "clsx";

import { useTerminalStore } from "@/store/useTerminalStore";
import { useServerStore } from "@/features/server/application/useServerStore";
import { useMonitorStore } from "@/store/useMonitorStore";
import { useSettingsStore } from "@/features/settings/application/useSettingsStore";
import { MonitorDescriptor } from "./monitor/types"; 

import { InfoCard } from "./monitor/card/InfoCard";
import { CpuCard } from "./monitor/card/CpuCard";
import { MemoryCard } from "./monitor/card/MemoryCard";
import { DiskCard } from "./monitor/card/DiskCard";
import { NetworkCard } from "./monitor/card/NetworkCard";

import { Button } from "@/components/ui/button"; 

// 🟢 引入拆分出的服务
import { MonitorWindowService } from "./monitor/services/monitorWindowService";
import { MonitorDataService } from "./monitor/services/monitorDataService";

interface Props {
    collapsed?: boolean;
    onToggle?: () => void;
}

const MonitorSkeletonCard = ({ className }: { className?: string }) => (
  <div
    className={clsx(
      "min-h-[7rem] w-full p-4 rounded-2xl border",
      "border-white/40 dark:border-white/5 bg-white/40 dark:bg-white/5",
      "shadow-sm backdrop-blur-xl animate-pulse",
      className
    )}
  >
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-slate-200/70 dark:bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded bg-slate-200/70 dark:bg-white/10 w-1/3" />
        <div className="h-3 rounded bg-slate-200/60 dark:bg-white/5 w-1/2" />
      </div>
    </div>
    <div className="mt-5 space-y-2">
      <div className="h-2.5 rounded bg-slate-200/60 dark:bg-white/5 w-1/4" />
      <div className="h-6 rounded bg-slate-200/70 dark:bg-white/10 w-2/5" />
    </div>
  </div>
);

export const TerminalMonitor = ({ collapsed = false, onToggle }: Props) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { activeTabId, tabs, sessions: terminalSessions, monitorPosition, setMonitorPosition } = useTerminalStore();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const sessionId = currentTab?.sessions?.[0];
  const sessionObj = sessionId ? terminalSessions[sessionId] : undefined;
  const isShellAvailable = sessionObj?.status === 'connected' || sessionObj?.status === 'background';
  const isConnecting = sessionObj?.status === 'connecting';
  const isBackgroundReady = sessionObj?.backgroundStatus === 'ready';
  const isBackgroundUnavailable = sessionObj?.backgroundStatus === 'unavailable';
  const serverConfig = useServerStore(state => state.servers.find(s => s.id === sessionObj?.serverId));
  
  const { sessions, setSessionData, updateHistory } = useMonitorStore();
  const currentSessionData = sessionId ? sessions[sessionId] : undefined;

  const settings = useSettingsStore(s => s.settings);

  // 🟢 1. 委托给 WindowService 处理独立窗口
  const handleOpenAdvancedMonitor = () => {
    if (!sessionId || !serverConfig) return;
    MonitorWindowService.openAdvancedMonitor(
      sessionId, 
      serverConfig.name, 
      currentSessionData, 
      settings
    );
  };

  const CARD_DESCRIPTORS = useMemo<MonitorDescriptor[]>(() => [
    { id: 'os',   Component: InfoCard,    icon: <Server className="w-5 h-5" />,   color: "green" },
    { id: 'cpu',  Component: CpuCard,     icon: <Cpu className="w-5 h-5" />,      color: "blue" },
    { id: 'mem',  Component: MemoryCard,  icon: <Zap className="w-5 h-5" />,      color: "purple" },
    { id: 'disk', Component: DiskCard,    icon: <Database className="w-5 h-5" />, color: "blue" },
    { id: 'net',  Component: NetworkCard, icon: <Wifi className="w-5 h-5" />,     color: "orange" },
  ], []);

  // 🟢 2. 委托给 DataService 负责轮询抓取
  useEffect(() => {
    if (!sessionId || !isShellAvailable) return;
    
    const cleanup = MonitorDataService.startPolling(sessionId, 3000, (updates) => {
        setSessionData(sessionId, updates);
        if (updates.cpu) {
            updateHistory(sessionId, updates.cpu.usage);
        }
    });

    return cleanup;
  }, [sessionId, isShellAvailable, setSessionData, updateHistory]);

  if (collapsed) {
      return (
          <div className="h-full w-full flex flex-col items-center py-4 gap-4 bg-slate-50/50 dark:bg-black/20 border-x border-slate-200 dark:border-white/5">
              <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-slate-500">
                  {monitorPosition === 'left' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
          </div>
      );
  }

  if (!sessionId) return null;

  const monitorStatusText = isConnecting
    ? t('monitor.connecting', 'Connecting to server...')
    : !isShellAvailable
      ? t('monitor.waitingForShell', 'Waiting for shell session...')
      : isBackgroundUnavailable
        ? t('monitor.backgroundUnavailable', 'Monitor session unavailable')
        : !isBackgroundReady
          ? t('monitor.preparing', 'Preparing monitor session...')
          : t('monitor.loading', 'Loading monitor data...');
  const showSkeleton = !currentSessionData;

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden relative">
      <div className="flex items-center justify-between p-3 pb-2 shrink-0 z-10 bg-transparent">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
          {serverConfig?.name || 'Resource Monitor'}
        </h2>
        <div className="flex gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMonitorPosition(monitorPosition === 'left' ? 'right' : 'left')}
                className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={monitorPosition === 'left' ? t('monitor.dockRight', "Dock Right") : t('monitor.dockLeft', "Dock Left")}
            >
                {monitorPosition === 'left' ? <PanelRight className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-slate-400">
                {monitorPosition === 'left' ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto px-3 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {showSkeleton ? (
          <div className="flex flex-col gap-3 pt-1">
            <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 bg-white/30 dark:bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {monitorStatusText}
                </span>
              </div>
            </div>
            {CARD_DESCRIPTORS.map(({ id }) => (
              <MonitorSkeletonCard key={id} />
            ))}
          </div>
        ) : (
          <LayoutGroup id="monitor-group">
            <div className="flex flex-col gap-3 pt-1"> 
              {CARD_DESCRIPTORS.map(({ id, Component, icon, color }) => (
                <Component
                  key={id} id={id} icon={icon} color={color} data={currentSessionData} 
                  isExpanded={expandedId === id}
                  onToggle={(id: string) => setExpandedId(prev => prev === id ? null : id)}
                />
              ))}
            </div>
          </LayoutGroup>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 pt-2 bg-transparent backdrop-blur-md z-30 border-t border-slate-200/50 dark:border-white/5">
        <Button 
            variant="outline" size="sm" 
            className="w-full text-xs font-medium border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-blue-600 gap-2 shadow-sm transition-all active:scale-[0.98]"
            onClick={handleOpenAdvancedMonitor}
        >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('monitor.openAdvanced', 'Open Advanced Monitor')}
        </Button>
      </div>
    </div>
  );
};
