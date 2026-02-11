import { ReactNode, ComponentType } from "react";
// 🟢 导入状态定义
import { SessionMonitorData } from "@/store/useMonitorStore";
// 🟢 如果您还没有定义这个类型，可以暂时使用: 'blue' | 'green' | 'purple' | 'orange' | 'red'
import { MonitorColorVariant } from "@/features/terminal/utils/monitorTheme";

/**
 * 所有业务卡片 (CpuCard, MemCard, DiskCard 等) 必须遵循的基础接口
 */
export interface BaseMonitorCardProps {
  id: string;
  /** * 🟢 精确类型：这里的 data 是从 useMonitorStore 中获取的完整 sessionData 对象
   * 包含 cpu, mem, disk, os, network 和 history 数组
   */
  data: SessionMonitorData; 
  isExpanded: boolean;
  onToggle: (id: string) => void;
  icon?: ReactNode;
  color?: MonitorColorVariant;
}

/**
 * 用于 TerminalMonitor.tsx 和 SingleSessionMonitor.tsx 中的配置描述符定义
 */
export interface MonitorDescriptor {
  id: string;
  /** 指向实现了 BaseMonitorCardProps 接口的 React 组件 */
  Component: ComponentType<BaseMonitorCardProps>;
  icon: ReactNode;
  color: MonitorColorVariant;
}

/**
 * 🟢 [核心新增] 跨窗口同步数据的载荷接口
 * 用于父窗口 emit("monitor:sync-data", payload) 和子窗口 listen
 */
export interface MonitorSyncPayload {
    sessionId: string;
    /** 使用 Partial 允许仅同步发生变化的部分数据 */
    data: Partial<SessionMonitorData>;
}