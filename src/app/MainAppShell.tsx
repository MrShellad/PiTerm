import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Toaster, toast } from 'sonner';
import { useEventBus } from '@/hooks/useEventBus';

import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { KeyManagerPanel } from '@/features/keys/presentation/KeyManagerPanel';
import { GlobalVaultModal } from '@/features/keys/presentation/components/GlobalVaultModal';
import { GlobalCommandMenu } from '@/components/common/GlobalCommandMenu';
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
import { useTerminalStore } from '@/store/useTerminalStore';

const THEME_VARIABLE_MAP: Record<string, {
  background: string;
  foreground: string;
  card: string;
  sidebarBg: string;
  titlebarBg: string;
  primary: string;
  primaryForeground: string;
  border: string;
  muted: string;
  mutedForeground: string;
  cardHoverBorder: string;
}> = {
  default: {
    background: '233 24% 10%',       // #13141f
    foreground: '220 14% 96%',       // #f3f4f6
    card: '230 18% 13%',             // #1a1c26
    sidebarBg: '#0e1017',            // Termius Dark Sidebar
    titlebarBg: '#0e1017',
    primary: '217 91% 60%',          // Termius Blue
    primaryForeground: '210 40% 98%',
    border: '230 18% 16%',           // #212535
    muted: '233 18% 11%',            // #171821
    mutedForeground: '224 10% 61%',  // #8f95a5
    cardHoverBorder: 'rgba(59, 130, 246, 0.3)'
  },
  ubuntu: {
    background: '315 65% 9%',
    foreground: '60 3% 92%',
    card: '315 54% 15%',
    sidebarBg: '#200517',
    titlebarBg: '#200517',
    primary: '16 84% 52%',
    primaryForeground: '0 0% 100%',
    border: '315 40% 22%',
    muted: '315 47% 18%',
    mutedForeground: '60 1% 53%',
    cardHoverBorder: 'rgba(233, 84, 32, 0.4)'
  },
  dracula: {
    background: '231 15% 18%',
    foreground: '60 30% 96%',
    card: '231 14% 24%',
    sidebarBg: '#1e1f29',
    titlebarBg: '#1e1f29',
    primary: '265 89% 78%',
    primaryForeground: '231 15% 18%',
    border: '231 15% 30%',
    muted: '231 14% 15%',
    mutedForeground: '225 27% 51%',
    cardHoverBorder: 'rgba(189, 147, 249, 0.4)'
  },
  solarized: {
    background: '192 100% 11%',
    foreground: '185 9% 55%',
    card: '185 81% 14%',
    sidebarBg: '#001f27',
    titlebarBg: '#001f27',
    primary: '203 66% 49%',
    primaryForeground: '0 0% 100%',
    border: '185 45% 20%',
    muted: '185 81% 10%',
    mutedForeground: '188 14% 41%',
    cardHoverBorder: 'rgba(38, 139, 210, 0.4)'
  }
};

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
  const terminalTheme = useTerminalStore(s => s.theme);

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
        body, button, input, textarea, select, .font-sans, [class*="sidebar"], [class*="titlebar"], nav, header {
          font-family: var(--font-ui), "Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "WenQuanYi Micro Hei", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
      `;
    } else {
      styleTag.innerHTML = '';
    }
  }, [customFont]);

  useEffect(() => {
    let styleTag = document.getElementById('dynamic-theme-override') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-theme-override';
      document.head.appendChild(styleTag);
    }

    const config = THEME_VARIABLE_MAP[terminalTheme] || THEME_VARIABLE_MAP.default;
    styleTag.innerHTML = `
      .dark, :root[class~="dark"] {
        --background: ${config.background} !important;
        --foreground: ${config.foreground} !important;
        --card: ${config.card} !important;
        --card-foreground: ${config.foreground} !important;
        --popover: ${config.background} !important;
        --popover-foreground: ${config.foreground} !important;
        --primary: ${config.primary} !important;
        --primary-foreground: ${config.primaryForeground} !important;
        --secondary: ${config.muted} !important;
        --secondary-foreground: ${config.foreground} !important;
        --muted: ${config.muted} !important;
        --muted-foreground: ${config.mutedForeground} !important;
        --accent: ${config.muted} !important;
        --accent-foreground: ${config.foreground} !important;
        --border: ${config.border} !important;
        --input: ${config.border} !important;
        --ring: ${config.primary} !important;
      }
      
      /* 统一侧边栏与标题栏的背景色 override */
      .dark aside {
        background-color: ${config.sidebarBg} !important;
        border-color: hsl(${config.border}) !important;
      }
      .dark [class*="titlebar"] {
        background-color: ${config.titlebarBg} !important;
        border-color: hsl(${config.border}) !important;
      }
      .dark .i-card:hover {
        border-color: hsl(${config.primary} / 0.3) !important;
        box-shadow: 
          0 12px 30px -4px rgba(0, 0, 0, 0.12), 
          0 6px 16px -4px rgba(0, 0, 0, 0.06), 
          inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
          0 8px 24px -4px ${config.cardHoverBorder} !important;
      }
      .dark .i-badge.is-highlighted {
        background-color: hsl(${config.primary} / 0.1) !important; 
        color: hsl(${config.primary}) !important;
        border-color: hsl(${config.primary} / 0.3) !important;
      }
      .dark .i-btn-connect:hover {
        background: linear-gradient(135deg, hsl(${config.primary}) 0%, hsl(${config.primary} / 0.8) 100%) !important;
        box-shadow: 0 4px 14px hsl(${config.primary} / 0.25) !important;
      }
    `;
  }, [terminalTheme]);

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
    if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
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
      if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
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

  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  useEffect(() => {
    const handleCmdKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandMenuOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleCmdKey);
    return () => window.removeEventListener('keydown', handleCmdKey);
  }, []);

  return (
    <BrowserRouter>
      <GlobalVaultModal />
      <GlobalCommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />
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
