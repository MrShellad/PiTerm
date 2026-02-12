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
  HighlightStyle
} from '../domain/types';
import { SETTING_ITEMS } from '../domain/constants';

// =========================================================
// 自定义文件存储适配器 (保持不变)
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

interface SettingsState {
  // === UI State ===
  activeCategory: SettingCategory;
  searchQuery: string;
  
  // === Data State (Settings.json) ===
  settings: Record<string, any>;
  customThemes: Record<string, CustomTheme>;
  proxies: ProxyItem[];                      

  // === 高亮系统状态 (SQLite Data) ===
  highlightSets: HighlightRuleSet[];       // 所有规则集 (Profile)
  activeSetId: string | null;              // 当前选中的规则集 ID
  currentSetRules: HighlightRule[];        // 当前集下的规则列表
  savedStyles: HighlightStyle[];           // 可复用的样式库

  // === UI Actions ===
  setActiveCategory: (category: SettingCategory) => void;
  setSearchQuery: (query: string) => void;
  
  updateSetting: (id: string, value: any) => void;
  updateSettings: (newSettings: Record<string, any>) => void;
  
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  updateCustomTheme: (theme: CustomTheme) => void;

  // === 高亮系统 Actions (Async / DB) ===
  
  // Profile (Rule Sets)
  loadHighlightSets: () => Promise<void>;
  createHighlightSet: (name: string, description?: string) => Promise<void>;
  
  // Rules
  loadRulesBySet: (setId: string) => Promise<void>;
  saveRule: (rule: { set_id: string; style_id: string; pattern: string; is_regex: boolean; is_case_sensitive: boolean; priority: number }) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  // Styles (🟢 新增部分)
  loadStyles: () => Promise<void>;
  saveStyle: (style: { id?: string; name: string; foreground?: string | null; background?: string | null; is_bold: boolean; is_italic: boolean; is_underline: boolean }) => Promise<void>;
  deleteStyle: (id: string) => Promise<void>;

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
      proxies: [], 

      // 高亮初始状态
      highlightSets: [],
      activeSetId: null,
      currentSetRules: [],
      savedStyles: [],

      // --- UI Actions ---
      setActiveCategory: (category) => set({ activeCategory: category, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      updateSetting: (id, value) => {
        set((state) => {
          const newSettings = { ...state.settings, [id]: value };
          emit('app:settings-change', newSettings).catch(e => console.error(e));
          return { settings: newSettings };
        });
      },

      updateSettings: (newSettingsPartial) => {
        set((state) => {
          const newSettings = { ...state.settings, ...newSettingsPartial };
          emit('app:settings-change', newSettings).catch(e => console.error(e));
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

      // =========================================================
      // 高亮系统 Actions 实现
      // =========================================================
      
      // --- Rule Sets ---
      loadHighlightSets: async () => {
        try {
            const sets = await invoke<HighlightRuleSet[]>('get_highlight_sets');
            set({ highlightSets: sets });
            
            // UX 优化：如果当前没有选中任何 Set，且列表不为空，可选逻辑：
            // if (sets.length > 0 && !get().activeSetId) { ... }
        } catch (e) { console.error("Failed to load highlight sets", e); }
      },

      createHighlightSet: async (name, description) => {
          try {
              await invoke('create_highlight_set', { name, description });
              get().loadHighlightSets(); // 刷新列表
          } catch (e) { console.error("Failed to create set", e); }
      },

      // --- Rules ---
      loadRulesBySet: async (setId) => {
          set({ activeSetId: setId });
          try {
              const rules = await invoke<HighlightRule[]>('get_rules_by_set_id', { setId });
              set({ currentSetRules: rules });
          } catch (e) { console.error("Failed to load rules", e); }
      },

      saveRule: async (ruleDto) => {
          try {
              await invoke('save_highlight_rule', { rule: ruleDto });
              // 保存成功后，刷新当前选中 Set 的规则列表
              const currentSetId = get().activeSetId;
              if (currentSetId) {
                  get().loadRulesBySet(currentSetId);
              }
          } catch (e) { console.error("Failed to save rule", e); }
      },

      deleteRule: async (id) => {
          try {
              await invoke('delete_highlight_rule', { id });
              // 删除后刷新
              const currentSetId = get().activeSetId;
              if (currentSetId) {
                  get().loadRulesBySet(currentSetId);
              }
          } catch (e) { console.error("Failed to delete rule", e); }
      },

      // --- Styles (🟢 新增) ---
      loadStyles: async () => {
          try {
              const styles = await invoke<HighlightStyle[]>('get_all_highlight_styles');
              set({ savedStyles: styles });
          } catch (e) { console.error("Failed to load styles", e); }
      },

      saveStyle: async (styleDto) => {
          try {
              await invoke('save_highlight_style', { style: styleDto });
              get().loadStyles(); // 刷新样式库列表
              
              // 关键：如果修改了样式，可能影响当前正在展示的规则列表（因为规则包含了样式快照）
              // 所以如果有选中的 Set，也刷新一下规则列表
              const currentSetId = get().activeSetId;
              if (currentSetId) {
                  get().loadRulesBySet(currentSetId);
              }
          } catch (e) { console.error("Failed to save style", e); }
      },

      deleteStyle: async (id) => {
          try {
              await invoke('delete_highlight_style', { id });
              get().loadStyles();
          } catch (e) { 
              console.error("Failed to delete style", e); 
              // 可以在这里通过 toast 提示用户（如果后端拒绝删除被引用的样式）
          }
      },

      // =========================================================
      // Identity & Proxies
      // =========================================================
      
      initDeviceIdentity: async () => {
        const settings = get().settings;
        const updates: Record<string, any> = {};
        
        if (!settings['general.deviceId']) {
          updates['general.deviceId'] = uuidv4();
        }

        if (!settings['general.deviceName']) {
          let hostname = 'Unknown Device';
          try {
             hostname = 'Local Device'; 
          } catch(e) {}
          updates['general.deviceName'] = hostname;
        }

        if (Object.keys(updates).length > 0) {
          get().updateSettings(updates);
        }
      },
      
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
        // 排除 DB 数据，不存入 JSON
      }),
    }
  )
);