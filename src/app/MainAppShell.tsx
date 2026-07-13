import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Toaster, toast } from 'sonner';
import { useEventBus } from '@/hooks/useEventBus';

import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { KeyManagerPanel } from '@/features/keys/presentation/KeyManagerPanel';
import { GlobalVaultModal } from '@/features/keys/presentation/components/GlobalVaultModal';
import { ServerListPage } from '@/features/server/list';
import { useServerStore } from '@/features/server/application/useServerStore';
import { SettingsPage } from '@/features/settings/presentation/SettingsPage';
import { useSettingsStore } from '@/features/settings/application/useSettingsStore';
import { useSettingsHydration } from '@/features/settings/application/useSettingsHydration';
import { useSecurityEffects } from '@/features/settings/hooks/useSecurityEffects';
import { useSettingsEffects } from '@/features/settings/hooks/useSettingsEffects';
import { SnippetPage } from '@/features/snippet/SnippetPage';
import { ToolsPlaceholder } from '@/features/tools/ToolsPlaceholder';
import { useKeyStore } from '@/store/useKeyStore';
import { useBackgroundReady } from '@/hooks/useBackgroundReady';

export function MainAppShell() {
  useSettingsEffects();
  useSecurityEffects();

  // Subscribe to system:toast notifications via the Event Bus
  useEventBus('system:toast', (payload) => {
    toast[payload.type](payload.message);
  });

  const settings = useSettingsStore(s => s.settings);
  const initDeviceIdentity = useSettingsStore(s => s.initDeviceIdentity);
  const settingsHydrated = useSettingsHydration();

  const checkVaultStatus = useKeyStore(s => s.checkVaultStatus);

  const appTheme = settings?.['appearance.appTheme'];
  const customFont = settings?.['appearance.fontFamily'];

  useEffect(() => {
    checkVaultStatus();
  }, [checkVaultStatus]);

  useEffect(() => {
    if (settingsHydrated && initDeviceIdentity) {
      initDeviceIdentity();
    }
  }, [settingsHydrated, initDeviceIdentity]);

  useEffect(() => {
    if (appTheme) {
      emit('app:theme-change', appTheme).catch(console.error);
    }
  }, [appTheme]);

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
        :root { --font-ui: ${safeFont}; }
        body, button, input, textarea, select, .font-sans {
          font-family: var(--font-ui), "Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "WenQuanYi Micro Hei", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
      `;
    } else {
      styleTag.innerHTML = '';
    }
  }, [customFont]);

  const fetchServers = useServerStore(s => s.fetchServers);
  useEffect(() => {
    fetchServers(true);
  }, [fetchServers]);

  // 🟢 [优化] Splash 等待壁纸就绪后再移除，防止启动闪烁
  const bgReady = useBackgroundReady(s => s.isReady);
  const splashRemovedRef = useRef(false);

  useEffect(() => {
    // 防止重复执行
    if (splashRemovedRef.current) return;

    // 等待设置水合 + 壁纸就绪
    if (!settingsHydrated || !bgReady) return;

    splashRemovedRef.current = true;

    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.3s ease';
      setTimeout(() => { splash.remove(); }, 300);
    }
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try { getCurrentWindow().show(); } catch (e) { console.error(e); }
    }
  }, [settingsHydrated, bgReady]);

  // 🟢 安全超时：防止壁纸加载异常导致永久白屏
  useEffect(() => {
    const timer = setTimeout(() => {
      if (splashRemovedRef.current) return;
      splashRemovedRef.current = true;

      const splash = document.getElementById('splash');
      if (splash) {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity 0.3s ease';
        setTimeout(() => { splash.remove(); }, 300);
      }
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try { getCurrentWindow().show(); } catch (e) { console.error(e); }
      }
    }, 3000); // 3秒安全超时

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const handleCM = (e: MouseEvent) => e.preventDefault();
    const handleKD = (e: KeyboardEvent) => {
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleCM);
    window.addEventListener('keydown', handleKD);
    return () => {
      window.removeEventListener('contextmenu', handleCM);
      window.removeEventListener('keydown', handleKD);
    };
  }, []);

  return (
    <BrowserRouter>
      <GlobalVaultModal />
      <Toaster richColors closeButton position="top-center" className="!z-[999999]" />

      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="servers" element={<ServerListPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="keys" element={<KeyManagerPanel />} />
          <Route path="snippets" element={<SnippetPage />} />
          <Route path="tools" element={<ToolsPlaceholder />} />
          <Route path="terminal" element={null} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
