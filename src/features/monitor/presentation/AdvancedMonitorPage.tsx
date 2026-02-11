// src/features/monitor/presentation/AdvancedMonitorPage.tsx
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { Activity, X, Server, LayoutDashboard } from "lucide-react";
import { SingleSessionMonitor } from "./components/SingleSessionMonitor";
import { MonitorTitleBar } from "./components/MonitorTitleBar";
// 🟢 [1] 引入 Store，确保能从磁盘直接读取配置，解决刷新丢失问题
import { useSettingsStore } from "@/features/settings/application/useSettingsStore";

interface MonitorTab {
    sessionId: string;
    title: string;
}

export const AdvancedMonitorPage = () => {
    const [searchParams] = useSearchParams();
    const [tabs, setTabs] = useState<MonitorTab[]>([]);
    const initializedRef = useRef(false);

    // 🟢 [2] 直接使用 Store 获取设置
    // Zustand 会自动处理从 settings.json 文件的 hydrate (加载) 过程
    const settings = useSettingsStore((s) => s.settings);
    const updateSettings = useSettingsStore((s) => s.updateSettings);

    // 🟢 [3] 核心外观同步逻辑
    // 当 settings 从磁盘加载完成，或收到更新时，自动应用样式
    useEffect(() => {
        if (!settings) return;
        const root = document.documentElement;

        // 1. 同步主题 (Theme)
        const theme = settings['appearance.appTheme'];
        if (theme) {
            const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            root.classList.toggle('dark', isDark);
        }

        // 2. 同步字体家族 (Font Family)
        const fontFamily = settings['appearance.fontFamily'];
        if (fontFamily) {
            root.style.setProperty('--font-sans', fontFamily);
            document.body.style.fontFamily = fontFamily;
        }

        // 3. 同步字体大小 (Font Size)
        const fontSize = settings['appearance.fontSize'];
        if (fontSize) {
            root.style.fontSize = `${fontSize}px`;
        }
    }, [settings]);

    // 🟢 [4] 监听主窗口广播的变更，保持实时同步
    useEffect(() => {
        const unlistenPromises = [
            // 当主窗口修改设置时，更新本地 Store，这将触发上面的 useEffect 重新应用样式
            listen<any>("app:settings-change", (event) => updateSettings(event.payload)),
            
            // 兼容旧的主题事件
            listen<string>("app:theme-change", (event) => {
                const root = document.documentElement;
                const isDark = event.payload === 'dark' || (event.payload === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                root.classList.toggle('dark', isDark);
            })
        ];

        return () => { 
            unlistenPromises.forEach(p => p.then(unlisten => unlisten())); 
        };
    }, []);

    // --- 业务逻辑 ---
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        const initSessionId = searchParams.get("sessionId");
        const initTitle = searchParams.get("name");
        if (initSessionId && initTitle) {
            setTabs([{ sessionId: initSessionId, title: initTitle }]);
        }
    }, []);

    useEffect(() => {
        const unlistenPromise = listen<{ sessionId: string; title: string }>("monitor:open-session", (event) => {
            const { sessionId, title } = event.payload;
            setTabs(prev => {
                const exists = prev.some(t => t.sessionId === sessionId);
                if (exists) return prev;
                return [...prev, { sessionId, title }];
            });
        });
        return () => { unlistenPromise.then(unlisten => unlisten()); };
    }, []); 

    const removeTab = (sessionId: string) => {
        setTabs(prev => prev.filter(t => t.sessionId !== sessionId));
    };

    return (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
            <MonitorTitleBar>
                <div className="flex items-center gap-2 px-4 h-full text-slate-500 dark:text-slate-400 select-none">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        Live Dashboard
                    </span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        {tabs.length}
                    </span>
                </div>
            </MonitorTitleBar>

            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-slate-100/50 dark:bg-black/20">
                {tabs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="p-4 rounded-full bg-slate-200/50 dark:bg-slate-800/50">
                            <Activity className="w-8 h-8 opacity-40" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Dashboard is empty</p>
                            <p className="text-xs opacity-60 mt-1">Open a server monitor from the main window.</p>
                        </div>
                    </div>
                ) : (
                    // 🟢 布局优化：列宽 400px
                    <div className="flex h-full p-4 gap-4 items-start min-w-max">
                        {tabs.map(tab => (
                            <div 
                                key={tab.sessionId} 
                                className="w-[400px] h-full flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 group"
                            >
                                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl shrink-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                            <Server className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-semibold truncate text-slate-700 dark:text-slate-200" title={tab.title}>
                                                {tab.title}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono truncate opacity-80">
                                                {tab.sessionId.split('-')[0]}...
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeTab(tab.sessionId)}
                                        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Close Monitor"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden min-h-0 bg-slate-50/30 dark:bg-slate-950/30 rounded-b-xl">
                                    <SingleSessionMonitor sessionId={tab.sessionId} isDashboard={true} />
                                </div>
                            </div>
                        ))}
                        <div className="w-1 shrink-0" />
                    </div>
                )}
            </div>
        </div>
    );
};