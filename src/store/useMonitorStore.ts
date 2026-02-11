import { create } from 'zustand';

// === 复用你现有的接口定义 ===
export interface RemoteCpuInfo { 
  model: string; 
  physicalCores: number; 
  logicalThreads: number; 
  usage: number; 
  loadAvg: number[]; 
  breakdown: {
    user: number;
    system: number;
    iowait: number;
    idle: number;
  };
  perCoreUsage: number[]; // 🟢 确保这里是 number[] 而不是 any[]
}
export interface RemoteMemInfo { 
  total: number; 
  available: number; 
  used: number; 
  free: number;      // 🟢 新增
  buffers: number;   // 🟢 新增
  cached: number;    // 🟢 新增
  swapTotal: number; 
  swapFree: number; 
  swapUsed: number; 
  usage: number;     // 🟢 修改为 usage
}
export interface RemoteDiskInfo { totalCap: number; usedCap: number; readSpeed: number; writeSpeed: number; disks: DiskDevice[]; }
export interface RemoteOsInfo { uptime: number; distro: string; kernel: string; arch: string; timezone: string; }
export interface ChartData { time: number; usage: number; }

// 单个 Session 的数据结构
export interface SessionMonitorData {
  cpu: RemoteCpuInfo | null;
  mem: RemoteMemInfo | null;
  disk: RemoteDiskInfo | null;
  os: RemoteOsInfo | null;
  history: ChartData[];
  network: RemoteNetworkInfo | null;
}

interface MonitorState {
  // Key 是 sessionId
  sessions: Record<string, SessionMonitorData>;

  // Actions
  setSessionData: (sessionId: string, data: Partial<SessionMonitorData>) => void;
  updateHistory: (sessionId: string, usage: number) => void;
}

export interface InterfaceInfo {
  name: string;
  ipv4: string[];
  ipv6: string[];
  mac: string;
  status: string;    // 🟢 新增：UP / DOWN
  rxSpeed: number;   // 🟢 新增：单网卡下行速率
  txSpeed: number;   // 🟢 新增：单网卡上行速率
  totalRx: number;   // 🟢 新增：单网卡累计下行
  totalTx: number;   // 🟢 新增：单网卡累计上行
}

export interface RemoteNetworkInfo {
  totalRx: number;
  totalTx: number;
  rxSpeed: number;
  txSpeed: number;
  tcpConnections: number;
  interfaces: InterfaceInfo[];
}

export const useMonitorStore = create<MonitorState>((set) => ({
  sessions: {},

  setSessionData: (sessionId, data) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          // 如果是第一次，初始化空对象
          ...(state.sessions[sessionId] || { cpu: null, mem: null, disk: null, os: null, history: [] }),
          ...data,
        },
      },
    })),

  updateHistory: (sessionId, usage) =>
    set((state) => {
      const prevHistory = state.sessions[sessionId]?.history || Array(60).fill({ time: 0, usage: 0 });
      // 追加新数据
      const newHistory = [...prevHistory, { time: Date.now(), usage }];
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...(state.sessions[sessionId] || { cpu: null, mem: null, disk: null, os: null, history: [] }),
            // 只保留最近 60 个点
            history: newHistory.slice(-60),
          },
        },
      };
    }),
}));

export interface PartitionInfo {
  filesystem: string;
  typeName: string; // 🟢 修复：将 type 修改为 typeName，与后端和 DiskCard.tsx 保持一致
  total: number;
  used: number;
  available: number;
  mount: string;
}

export interface DiskDevice {
  name: string;
  total: number;
  used: number;
  available: number;
  isSsd: boolean;
  isRemovable: boolean;
  readSpeed: number;
  writeSpeed: number;
  partitions: PartitionInfo[];
}

export interface CpuBreakdown {
  user: number;
  system: number;
  iowait: number;
  idle: number;
}