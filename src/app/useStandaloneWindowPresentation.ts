import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';

import { useSettingsHydration } from '@/features/settings/application/useSettingsHydration';
import { useSettingsStore } from '@/features/settings/application/useSettingsStore';

export function useStandaloneWindowPresentation() {
  const { i18n } = useTranslation();
  const settings = useSettingsStore(s => s.settings);
  const settingsHydrated = useSettingsHydration();

  const appTheme = settings?.['appearance.appTheme'];
  const customFont = settings?.['appearance.fontFamily'];
  const language = settings?.['general.language'];

  useEffect(() => {
    if (!settingsHydrated) return;

    let targetLang = language || 'zh';
    if (targetLang === 'auto') {
      const systemLang = navigator.language.toLowerCase();
      targetLang = systemLang.startsWith('en') ? 'en' : 'zh';
    }

    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
    }
  }, [settingsHydrated, language, i18n]);

  useEffect(() => {
    if (!settingsHydrated) return;

    const root = window.document.documentElement;
    const applyTheme = (theme: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    };

    if (appTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      handleSystemChange(mediaQuery);
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }

    applyTheme(appTheme === 'dark' ? 'dark' : 'light');
  }, [settingsHydrated, appTheme]);

  useEffect(() => {
    let styleTag = document.getElementById('dynamic-font-override') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-font-override';
      document.head.appendChild(styleTag);
    }

    if (customFont && typeof customFont === 'string' && customFont.trim() !== '') {
      let safeFont = customFont;
      if (!safeFont.includes('"') && !safeFont.includes("'")) {
        safeFont = `"${safeFont}"`;
      }

      styleTag.innerHTML = `
        :root {
          --font-ui: ${safeFont}, "Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "WenQuanYi Micro Hei", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        body, button, input, textarea, select, .font-sans, [class*="sidebar"], [class*="titlebar"], nav, header {
          font-family: var(--font-ui) !important;
        }
      `;
    } else {
      styleTag.innerHTML = '';
    }
  }, [customFont]);

  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.3s ease';
      setTimeout(() => { splash.remove(); }, 300);
    }
    if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
      try { getCurrentWindow().show(); } catch (e) { console.error(e); }
    }
  }, []);
}
