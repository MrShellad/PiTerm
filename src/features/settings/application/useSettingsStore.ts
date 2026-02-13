import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
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
  ProxyItem,
  HighlightRule, 
  HighlightRuleSet, 
  HighlightStyle,
  HighlightAssignment // 🟢 新增的分配模型
} from '../domain/types';
import { SETTING_ITEMS } from '../domain/constants';

// 引入高亮服务 (如果你的 highlight.service 中没有写 assign 相关的方法，下面代码里的 invoke 也能直接兜底)
import { HighlightService } from './services/highlight.service';

// =========================================================
// 自定义文件存储适配器 (保留你的原始逻辑)
// =========================================================
const createDiskStorage = (filename: string): StateStorage => ({
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const fileExists = await exists(filename, { baseDir: BaseDirectory.AppConfig });
      if (!fileExists) return null;
      
      const content = await readTextFile(filename, { baseDir: BaseDirectory.AppConfig });
      try {
        const json = JSON.parse(content);
        if (json && json.meta && json.state) {
          return JSON.stringify(json.state);
        }
        return content;
      } catch (e) {
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

      let platform = 'unknown';
      let appVersion = 'unknown';
      try {
        const [osType, ver] = await Promise.all([getOsType(), getVersion()]);
        platform = osType;
        appVersion = ver;
      } catch (err) {}

      const fileContent = {
        meta: {
          platform,
          version: appVersion,
          lastUpdated: new Date().toISOString(),
        },
        state: JSON.parse(value)
      };

      await writeTextFile(filename, JSON.stringify(fileContent, null, 2), { baseDir: BaseDirectory.AppConfig });
    } catch (e) {
      console.error('Failed to write settings file:', e);
    }
  },
  
  removeItem: async (_name: string): Promise<void> => {
    console.warn('removeItem not implemented for disk storage');
  },
});

// =========================================================
// Store 状态接口定义
// =========================================================
interface SettingsState {
  // === UI State ===
  activeCategory: SettingCategory;
  searchQuery: string;
  
  // === Data State ===
  settings: Record<string, any>;
  customThemes: Record<string, CustomTheme>;
  proxies: ProxyItem[];                      
  servers: any[]; // 🟢 [新增] 存放所有的 SSH 服务器列表

  // === Highlight State ===
  highlightSets: HighlightRuleSet[];       
  activeSetId: string | null;              
  currentSetRules: HighlightRule[];        
  savedStyles: HighlightStyle[];           
  highlightAssignments: HighlightAssignment[]; // 🟢 [新增] 规则分配列表

  // === Actions ===
  setActiveCategory: (category: SettingCategory) => void;
  setSearchQuery: (query: string) => void;
  updateSetting: (id: string, value: any) => void;
  updateSettings: (newSettings: Record<string, any>) => void;
  
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  updateCustomTheme: (theme: CustomTheme) => void;

  loadHighlightSets: () => Promise<void>;
  createHighlightSet: (name: string, description?: string) => Promise<void>;
  updateHighlightSet: (id: string, name: string, description?: string) => Promise<void>;
  deleteHighlightSet: (id: string) => Promise<void>;
  
  loadRulesBySet: (setId: string) => Promise<void>;
  saveRule: (rule: any) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  reorderRules: (ruleIds: string[]) => Promise<void>;
  toggleRuleEnabled: (id: string, enabled: boolean) => Promise<void>;

  loadStyles: () => Promise<void>;
  saveStyle: (style: any) => Promise<void>;
  deleteStyle: (id: string) => Promise<void>;

  // 🟢 [新增] 高亮规则集的分配操作
  loadHighlightAssignments: () => Promise<void>;
  assignHighlightSet: (targetId: string, targetType: 'global' | 'server', setId: string) => Promise<void>;
  unassignHighlightSet: (targetId: string) => Promise<void>;

  loadProxies: () => Promise<void>;
  addProxy: (proxy: ProxyItem) => Promise<void>;
  removeProxy: (id: string) => Promise<void>;
  updateProxy: (proxy: ProxyItem) => Promise<void>;
  
  loadServers: () => Promise<void>; // 🟢 [新增] 触发加载服务器

  initDeviceIdentity: () => Promise<void>;
}

const defaultSettings = SETTING_ITEMS.reduce((acc, item) => {
  if (item.defaultValue !== undefined) acc[item.id] = item.defaultValue;
  return acc;
}, {} as Record<string, any>);

// =========================================================
// Store 实现
// =========================================================
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      activeCategory: 'general',
      searchQuery: '',
      settings: defaultSettings,
      customThemes: {}, 
      proxies: [], 
      servers: [], // 🟢 默认空数组
      highlightSets: [],
      activeSetId: null,
      currentSetRules: [],
      savedStyles: [],
      highlightAssignments: [], // 🟢 默认空数组，彻底解决 .some() 报错

      // --- UI & Basic Actions ---
      setActiveCategory: (category) => set({ activeCategory: category, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      updateSetting: (id, value) => {
        set((state) => {
          const newSettings = { ...state.settings, [id]: value };
          emit('app:settings-change', newSettings).catch(console.error);
          return { settings: newSettings };
        });
      },

      updateSettings: (newSettingsPartial) => {
        set((state) => {
          const newSettings = { ...state.settings, ...newSettingsPartial };
          emit('app:settings-change', newSettings).catch(console.error);
          return { settings: newSettings };
        });
      },

      // --- Themes ---
      addCustomTheme: (theme) => set(s => ({ customThemes: { ...s.customThemes, [theme.id]: theme } })),
      removeCustomTheme: (id) => set(s => {
        const newThemes = { ...s.customThemes };
        delete newThemes[id];
        return { customThemes: newThemes };
      }),
      updateCustomTheme: (theme) => set(s => ({ customThemes: { ...s.customThemes, [theme.id]: theme } })),

      // --- Highlight System ---
      loadHighlightSets: async () => {
        try {
            const sets = await HighlightService.getSets();
            set({ highlightSets: sets });
        } catch (e) { console.error(e); }
      },
      createHighlightSet: async (name, desc) => {
          await HighlightService.createSet(name, desc);
          get().loadHighlightSets();
      },
      updateHighlightSet: async (id, name, desc) => {
          await HighlightService.updateSet(id, name, desc);
          get().loadHighlightSets();
      },
      deleteHighlightSet: async (id) => {
          await HighlightService.deleteSet(id);
          if (get().activeSetId === id) set({ activeSetId: null, currentSetRules: [] });
          get().loadHighlightSets();
      },
      reorderRules: async (ruleIds) => {
          const currentRules = get().currentSetRules;
          const ruleMap = new Map(currentRules.map(r => [r.id, r]));
          const newRules = ruleIds.map(id => ruleMap.get(id)).filter(Boolean) as HighlightRule[];
          
          set({ currentSetRules: newRules }); // 乐观更新 UI
          try {
              await HighlightService.reorderRules(ruleIds);
          } catch (e) {
              const setId = get().activeSetId;
              if (setId) get().loadRulesBySet(setId); // 失败则回滚
          }
      },
      loadRulesBySet: async (setId) => {
          set({ activeSetId: setId });
          try {
              const rules = await HighlightService.getRulesBySet(setId);
              set({ currentSetRules: rules });
          } catch (e) { console.error(e); }
      },
      saveRule: async (ruleDto) => {
          await HighlightService.saveRule(ruleDto);
          const currentSetId = get().activeSetId;
          if (currentSetId) get().loadRulesBySet(currentSetId);
      },
      toggleRuleEnabled: async (id, enabled) => {
        try {
          await HighlightService.toggleRule(id, enabled);
          set(s => ({
            currentSetRules: s.currentSetRules.map(r => r.id === id ? { ...r, isEnabled: enabled } : r)
          }));
        } catch (e) { console.error(e); }
      },
      deleteRule: async (id) => {
          await HighlightService.deleteRule(id);
          const currentSetId = get().activeSetId;
          if (currentSetId) get().loadRulesBySet(currentSetId);
      },
      loadStyles: async () => {
          try {
              const styles = await HighlightService.getStyles();
              set({ savedStyles: styles });
          } catch (e) { console.error(e); }
      },
      saveStyle: async (styleDto) => {
          await HighlightService.saveStyle(styleDto);
          get().loadStyles();
          const currentSetId = get().activeSetId;
          if (currentSetId) get().loadRulesBySet(currentSetId);
      },
      deleteStyle: async (id) => {
          await HighlightService.deleteStyle(id);
          get().loadStyles();
      },

      // 🟢 [新增] 规则集分配逻辑实现 (直接走 invoke，安全可靠)
      loadHighlightAssignments: async () => {
        try {
            const assignments = await invoke<HighlightAssignment[]>('get_highlight_assignments');
            set({ highlightAssignments: assignments || [] });
        } catch (e) { console.error("加载分配规则失败:", e); }
      },
      assignHighlightSet: async (targetId, targetType, setId) => {
          try {
              await invoke('assign_highlight_set', { targetId, targetType, setId });
              get().loadHighlightAssignments(); // 刷新
          } catch (e) { console.error("绑定失败:", e); }
      },
      unassignHighlightSet: async (targetId) => {
          try {
              await invoke('unassign_highlight_set', { targetId });
              get().loadHighlightAssignments(); // 刷新
          } catch (e) { console.error("解绑失败:", e); }
      },

      // --- Servers ---
      // 🟢 [新增] 从服务器数据库拉取服务器列表
      loadServers: async () => {
        try {
            const list = await invoke<any[]>('list_servers');
            set({ servers: list || [] });
        } catch (e) { 
            console.error("加载 SSH 服务器列表失败:", e); 
        }
      },

      // --- Identity ---
      initDeviceIdentity: async () => {
        const settings = get().settings;
        const updates: Record<string, any> = {};
        
        if (!settings['general.deviceId'] || !settings['general.deviceName']) {
          const deviceId = uuidv4();
          let deviceName = 'Unknown Device';
          try {
            deviceName = 'Local Device';
          } catch(e) {}
          
          if (!settings['general.deviceId']) updates['general.deviceId'] = deviceId;
          if (!settings['general.deviceName']) updates['general.deviceName'] = deviceName;
        }

        if (Object.keys(updates).length > 0) {
          get().updateSettings(updates);
        }
      },
      
      // --- Proxies ---
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
        // 💡 故意不持久化 servers、proxies 和 highlightAssignments，
        // 确保它们每次都能去 SQLite 数据库拉取最新鲜的数据！
      }),
    }
  )
);