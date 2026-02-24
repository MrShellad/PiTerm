// src/features/terminal/components/monitor/services/monitorDataService.ts
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { 
    RemoteCpuInfo, 
    RemoteMemInfo, 
    RemoteDiskInfo, 
    RemoteOsInfo, 
    RemoteNetworkInfo 
} from "@/store/useMonitorStore";
import { MonitorSyncPayload } from "../types";

export const MonitorDataService = {
  /**
   * 单次抓取服务器的监控数据
   */
  fetchSessionData: async (sessionId: string) => {
    const updates: any = {};
    try {
      const [cpu, mem, disk, os, net] = await Promise.allSettled([
        invoke<RemoteCpuInfo>("get_ssh_cpu_info", { id: sessionId }),
        invoke<RemoteMemInfo>("get_ssh_mem_info", { id: sessionId }),
        invoke<RemoteDiskInfo>("get_ssh_disk_info", { id: sessionId }),
        invoke<RemoteOsInfo>("get_ssh_os_info", { id: sessionId }),
        invoke<RemoteNetworkInfo>("get_ssh_network_info", { id: sessionId }),
      ]);

      if (cpu.status === "fulfilled") updates.cpu = cpu.value;
      if (mem.status === "fulfilled") updates.mem = mem.value;
      if (disk.status === "fulfilled") updates.disk = disk.value;
      if (os.status === "fulfilled") updates.os = os.value;
      if (net.status === "fulfilled") updates.network = net.value;
    } catch (err) {
      console.error("Error fetching monitor data:", err);
    }
    return updates;
  },

  /**
   * 开始轮询，返回清理函数
   */
  startPolling: (
    sessionId: string,
    intervalMs: number,
    onDataFetched: (updates: any) => void
  ) => {
    const fetchData = async () => {
      if (!sessionId) return;
      
      const updates = await MonitorDataService.fetchSessionData(sessionId);
      
      if (Object.keys(updates).length > 0) {
        // 调用回调更新 Store
        onDataFetched(updates);
        // 广播给其他窗口 (例如独立出的高级监控窗口)
        emit("monitor:sync-data", { sessionId, data: updates } as MonitorSyncPayload);
      }
    };

    // 立即执行一次
    fetchData();
    // 启动定时器
    const intervalId = setInterval(fetchData, intervalMs);

    // 返回清理函数
    return () => clearInterval(intervalId);
  }
};