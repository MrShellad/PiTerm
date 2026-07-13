import { create } from 'zustand';

/**
 * 全局壁纸就绪状态
 * 用于在 MainLayout（壁纸加载完成）和 MainAppShell（控制 Splash/窗口显示）之间共享信号
 */
interface BackgroundReadyState {
  /** 壁纸是否已就绪（加载完成或确认无壁纸） */
  isReady: boolean;
  /** 标记壁纸就绪 */
  setReady: () => void;
}

export const useBackgroundReady = create<BackgroundReadyState>((set) => ({
  isReady: false,
  setReady: () => set({ isReady: true }),
}));
