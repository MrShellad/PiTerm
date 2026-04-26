import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../application/useSettingsStore';
import { useSettingsHydration } from '../application/useSettingsHydration';
import { invoke } from '@tauri-apps/api/core';
import { enable, disable } from '@tauri-apps/plugin-autostart'; 

export const useSettingsEffects = () => {
  const { i18n } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.updateSetting); 
  const settingsHydrated = useSettingsHydration();
  // 🟢 [修改] 移除了 useDashboardStore

  // 1. 监听语言变化
  useEffect(() => {
    if (!settingsHydrated) return;

    const langSetting = settings['general.language'];
    let targetLang = 'zh'; 
    if (langSetting === 'auto') {
      const systemLang = navigator.language.toLowerCase();
      targetLang = systemLang.startsWith('en') ? 'en' : 'zh';
    } else {
      targetLang = langSetting;
    }
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
    }
  }, [settingsHydrated, settings['general.language'], i18n]);

  // 2. 监听开机自启 (保持不变)
  useEffect(() => {
    if (!settingsHydrated) return;

    const launchAtStartup = settings['general.launchAtStartup'];
    const syncAutostart = async () => {
       try {
         launchAtStartup ? await enable() : await disable();
       } catch (e) { console.error('Autostart sync failed:', e); }
    };
    syncAutostart();
  }, [settingsHydrated, settings['general.launchAtStartup']]);

  // 3. 监听关闭行为 (保持不变)
  useEffect(() => {
    if (!settingsHydrated) return;

    const minimizeToTray = settings['general.minimizeToTray'];
    const closeBehavior = settings['general.closeBehavior']; 
    invoke('update_app_config', { minimizeToTray, closeBehavior }).catch(_err => {});
  }, [settingsHydrated, settings['general.minimizeToTray'], settings['general.closeBehavior']]);

  // =========================================================
  // 4. 外观设置 (仅处理类名和终端主题，不再处理壁纸同步)
  // =========================================================
  useEffect(() => {
    if (!settingsHydrated) return;

    const appTheme = settings['appearance.appTheme']; 
    const syncTerminal = settings['appearance.syncTerminalTheme'];
    const lightTermTheme = settings['appearance.lightTerminalTheme'];
    const darkTermTheme = settings['appearance.darkTerminalTheme'];

    // 🟢 [修改] 移除了壁纸获取和同步逻辑

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const applyTheme = (theme: 'light' | 'dark') => {
        root.classList.add(theme);

        // 同步终端主题
        if (syncTerminal) {
            const targetTermTheme = theme === 'light' ? lightTermTheme : darkTermTheme;
            if (targetTermTheme && settings['terminal.theme'] !== targetTermTheme) {
                updateSetting('terminal.theme', targetTermTheme);
            }
        }
    };

    if (appTheme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList) => {
             applyTheme(e.matches ? 'dark' : 'light');
        };
        handleSystemChange(mediaQuery);
        mediaQuery.addEventListener('change', handleSystemChange);
        return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else {
        applyTheme(appTheme as 'light' | 'dark');
    }

  }, [
      settings['appearance.appTheme'], 
      settings['appearance.syncTerminalTheme'],
      settings['appearance.lightTerminalTheme'],
      settings['appearance.darkTerminalTheme'],
      // 🟢 [修改] 移除了壁纸依赖
      settingsHydrated,
      updateSetting 
  ]);
};
