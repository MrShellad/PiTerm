// src/features/settings/application/services/system.service.ts
import { emit } from '@tauri-apps/api/event';
import { v4 as uuidv4 } from 'uuid';

export const SystemService = {
  // 广播配置变更事件
  broadcastSettingsChange: async (settings: Record<string, any>) => {
    try {
      await emit('app:settings-change', settings);
    } catch (e) {
      console.error('Failed to emit settings change', e);
    }
  },

  // 生成或获取设备标识
  generateDeviceIdentity: () => {
    const deviceId = uuidv4();
    let deviceName = 'Unknown Device';
    try {
      deviceName = 'Local Device'; // 如果以后引入 OS 插件获取 hostname，可以在这里扩展
    } catch(e) {}
    
    return { deviceId, deviceName };
  }
};