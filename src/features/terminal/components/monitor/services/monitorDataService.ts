// src/features/terminal/components/monitor/services/monitorDataService.ts
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { SessionMonitorData } from "@/store/useMonitorStore";
import { MonitorSyncPayload } from "../types";

const isExpectedMonitorError = (err: unknown) => {
  const message = String(err).toLowerCase();
  return message.includes("ssh connection not active");
};

export const MonitorDataService = {
  /**
   * 单次抓取服务器的监控数据
   */
  fetchSessionData: async (sessionId: string): Promise<Partial<SessionMonitorData>> => {
    try {
      return await invoke<Partial<SessionMonitorData>>("get_ssh_combined_info", { id: sessionId });
    } catch (err) {
      if (!isExpectedMonitorError(err)) {
        console.error("Error fetching monitor data:", err);
      }
      return {};
    }
  },

  /**
   * 开始轮询，返回清理函数
   */
  startPolling: (
    sessionId: string,
    intervalMs: number,
    onDataFetched: (updates: Partial<SessionMonitorData>) => void
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
