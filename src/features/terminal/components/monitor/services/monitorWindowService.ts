// src/features/terminal/components/monitor/services/monitorWindowService.ts
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit, emitTo } from "@tauri-apps/api/event";
import { SessionMonitorData } from "@/store/useMonitorStore";
import { MonitorSyncPayload } from "../types";

const ADVANCED_MONITOR_LABEL = "advanced_monitor";

export const MonitorWindowService = {
  /**
   * 打开或聚焦高级监控窗口，并同步初始数据和设置
   */
  openAdvancedMonitor: async (
    sessionId: string,
    serverName: string,
    currentData: SessionMonitorData | undefined,
    currentSettings: Record<string, any>
  ) => {
    try {
      const existingWindow = await WebviewWindow.getByLabel(ADVANCED_MONITOR_LABEL);

      if (existingWindow) {
        // 窗口已存在：唤醒并同步最新状态
        await existingWindow.unminimize();
        await existingWindow.show();
        await existingWindow.setFocus();
        
        // 切换目标服务器
        await emitTo(ADVANCED_MONITOR_LABEL, "monitor:open-session", { sessionId, title: serverName });
        
        // 同步监控数据
        if (currentData) {
          await emit("monitor:sync-data", { sessionId, data: currentData } as MonitorSyncPayload);
        }
        
        // 同步设置（如字体/主题）
        await emitTo(ADVANCED_MONITOR_LABEL, "app:settings-change", currentSettings);
      } else {
        // 窗口不存在：创建新窗口
        const url = `/advanced-monitor?sessionId=${sessionId}&name=${encodeURIComponent(serverName)}`;
        const win = new WebviewWindow(ADVANCED_MONITOR_LABEL, {
          url,
          title: "Advanced Resource Monitor",
          width: 1000,
          height: 800,
          decorations: false,
          transparent: true,
          center: true,
          visible: false // 等待加载完毕后再显示
        });

        // 监听窗口创建成功事件，延迟同步数据以确保 React 已挂载
        win.once('tauri://created', () => {
          setTimeout(() => {
            if (currentData) {
              emit("monitor:sync-data", { sessionId, data: currentData } as MonitorSyncPayload);
            }
            emit("app:settings-change", currentSettings);
            win.show();
          }, 500);
        });
      }
    } catch (e) {
      console.error("Failed to open advanced monitor window:", e);
    }
  }
};