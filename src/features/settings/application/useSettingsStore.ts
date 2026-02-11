import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
// 🟢 [新增] 引入 emit 用于广播设置变更
import { emit } from '@tauri-apps/api/event';
import { 
  mkdir, 
  readTextFile, 
  writeTextFile, 
  BaseDirectory, 
  exists 
} from '@tauri-apps/plugin-fs'; 
import { type as getOsType } from '@tauri-apps/plugin-os';
import { getVersion } from '@tauri-apps/api/app';
import { v4 as uuidv4 } from 'uuid';
import { 
  SettingCategory, 
  CustomTheme, 
  HighlightRule, 
  ProxyItem 
} from '../domain/types';
import { SETTING_ITEMS } from '../domain/constants';

// =========================================================
// 自定义文件存储适配器
// 支持元数据包装: { meta: {...}, state: {...} }
// =========================================================
const createDiskStorage = (filename: string): StateStorage => ({
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const fileExists = await exists(filename, { baseDir: BaseDirectory.AppConfig });
      if (!fileExists) {
        return null;
      }
      
      const content = await readTextFile(filename, { baseDir: BaseDirectory.AppConfig });
      
      try {
        const json = JSON.parse(content);
        // 检查是否为包含元数据的新格式
        if (json && json.meta && json.state) {
          // 只把 state 部分还给 Zustand
          return JSON.stringify(json.state);
        }
        // 旧格式（纯 State），直接返回
        return content;
      } catch (e) {
        // 解析失败或格式不对，尝试直接返回内容
        return content;
      }
    } catch (e) {
      console.error('Failed to read settings file:', e);
      return null;
    }
  },
  
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const dirExists = await exists('', { baseDir: BaseDirectory.AppConfig });
      if (!dirExists) {
        await mkdir('', { baseDir: BaseDirectory.AppConfig, recursive: true });
      }

      // 获取元数据
      let platform = 'unknown';
      let appVersion = 'unknown';
      
      try {
        // 并行获取系统信息，避免阻塞太久
        const [osType, ver] = await Promise.all([
          getOsType(), // 'linux' | 'macos' | 'windows'
          getVersion()
        ]);
        platform = osType;
        appVersion = ver;
      } catch (err) {
        console.warn('Metadata fetch failed (ignoring):', err);
      }

      // 构造带元数据的文件内容
      const fileContent = {
        meta: {
          platform,
          version: appVersion,
          lastUpdated: new Date().toISOString(), // ISO 格式时间
        },
        state: JSON.parse(value) // 将 persist 传来的 JSON 字符串还原为对象放入 state
      };

      // 写入格式化后的 JSON，方便人类阅读 (null, 2)
      await writeTextFile(filename, JSON.stringify(fileContent, null, 2), { baseDir: BaseDirectory.AppConfig });
    } catch (e) {
      console.error('Failed to write settings file:', e);
    }
  },
  
  removeItem: async (_name: string): Promise<void> => {
    console.warn('removeItem not implemented for disk storage');
  },
});

interface SettingsState {
  // === UI State ===
  activeCategory: SettingCategory;
  searchQuery: string;
  
  // === Data State ===
  settings: Record<string, any>;
  customThemes: Record<string, CustomTheme>;
  highlightRules: HighlightRule[];          
  proxies: ProxyItem[];                      

  // === Actions ===
  setActiveCategory: (category: SettingCategory) => void;
  setSearchQuery: (query: string) => void;
  
  updateSetting: (id: string, value: any) => void;
  updateSettings: (newSettings: Record<string, any>) => void;
  
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  updateCustomTheme: (theme: CustomTheme) => void;

  addHighlightRule: (rule: HighlightRule) => void;
  removeHighlightRule: (id: string) => void;
  updateHighlightRule: (rule: HighlightRule) => void;

  // === Proxy Actions (Async / DB) ===
  loadProxies: () => Promise<void>;
  addProxy: (proxy: ProxyItem) => Promise<void>;
  removeProxy: (id: string) => Promise<void>;
  updateProxy: (proxy: ProxyItem) => Promise<void>;
  initDeviceIdentity: () => Promise<void>;
}

const defaultSettings = SETTING_ITEMS.reduce((acc, item) => {
  if (item.defaultValue !== undefined) {
    acc[item.id] = item.defaultValue;
  }
  return acc;
}, {} as Record<string, any>);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      activeCategory: 'general',
      searchQuery: '',
      settings: defaultSettings,
      customThemes: {}, 
      highlightRules: [],
      proxies: [], 

      // --- Actions ---
      setActiveCategory: (category) => set({ activeCategory: category, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      // 🟢 [修改] 更新单个设置并广播事件
      updateSetting: (id, value) => {
        set((state) => {
          const newSettings = { ...state.settings, [id]: value };
          // 广播设置变更事件，不阻塞 UI
          emit('app:settings-change', newSettings).catch(e => console.error('Failed to emit settings change:', e));
          return { settings: newSettings };
        });
      },

      // 🟢 [修改] 批量更新设置并广播事件
      updateSettings: (newSettingsPartial) => {
        set((state) => {
          const newSettings = { ...state.settings, ...newSettingsPartial };
          // 广播设置变更事件
          emit('app:settings-change', newSettings).catch(e => console.error('Failed to emit settings change:', e));
          return { settings: newSettings };
        });
      },

      // --- Themes ---
      addCustomTheme: (theme) => set((state) => ({
        customThemes: { ...state.customThemes, [theme.id]: theme }
      })),
      removeCustomTheme: (id) => set((state) => {
        const newThemes = { ...state.customThemes };
        delete newThemes[id];
        return { customThemes: newThemes };
      }),
      updateCustomTheme: (theme) => set((state) => ({
        customThemes: { ...state.customThemes, [theme.id]: theme }
      })),

      // --- Highlights ---
      addHighlightRule: (rule) => set((state) => ({
        highlightRules: [...state.highlightRules, rule]
      })),
      removeHighlightRule: (id) => set((state) => ({
        highlightRules: state.highlightRules.filter(r => r.id !== id)
      })),
      updateHighlightRule: (rule) => set((state) => ({
        highlightRules: state.highlightRules.map(r => r.id === rule.id ? rule : r)
      })),
      
      // 初始化设备身份的方法
      initDeviceIdentity: async () => {
        const settings = get().settings;
        const updates: Record<string, any> = {};
        
        // 1. 如果没有 deviceId，生成一个永久的 UUID
        if (!settings['general.deviceId']) {
          updates['general.deviceId'] = uuidv4();
        }

        // 2. 如果没有 deviceName，尝试获取系统主机名或给个默认值
        if (!settings['general.deviceName']) {
          let hostname = 'Unknown Device';
          try {
             // 如果你有 tauri-plugin-os，可以用 platform() 或 hostname()
             // hostname = await type(); 
             hostname = 'Local Device'; 
          } catch(e) {}
          updates['general.deviceName'] = hostname;
        }

        if (Object.keys(updates).length > 0) {
          get().updateSettings(updates);
        }
      },
      
      // --- Proxies (DB) ---
      loadProxies: async () => {
        try {
            const list = await invoke<any[]>('get_all_proxies');
            const formatted = list.map(p => ({
                ...p,
                type: p.proxyType || p.type 
            }));
            set({ proxies: formatted });
        } catch (e) { console.error("DB Error:", e); }
      },
      addProxy: async (proxy) => {
        await invoke('add_proxy', { proxy: { ...proxy, proxyType: proxy.type } });
        set((state) => ({ proxies: [proxy, ...state.proxies] }));
      },
      removeProxy: async (id) => {
        await invoke('delete_proxy', { id });
        set((state) => ({ proxies: state.proxies.filter(p => p.id !== id) }));
      },
      updateProxy: async (updated) => {
        await invoke('update_proxy', { proxy: { ...updated, proxyType: updated.type, updatedAt: Date.now() } });
        set((state) => ({ proxies: state.proxies.map(p => p.id === updated.id ? updated : p) }));
      },
    }),
    {
      name: 'settings.json', 
      storage: createJSONStorage(() => createDiskStorage('settings.json')),
      partialize: (state) => ({ 
        settings: state.settings,
        customThemes: state.customThemes,
        highlightRules: state.highlightRules,
      }),
    }
  )
);