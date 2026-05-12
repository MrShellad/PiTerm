import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, Monitor, Command } from "lucide-react"; 
import { toast } from "sonner";
import { useTerminalStore } from "@/store/useTerminalStore";
import { useServerStore } from "@/features/server/application/useServerStore";
import { Server } from "@/features/server/domain/types";
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils"; // 🟢 引入 cn 工具函数以匹配 DashboardHeader 风格

type QuickConnectTarget = {
  username: string;
  host: string;
  port: number;
};

const parsePort = (value?: string): number | null => {
  if (value === undefined) return 22;
  if (value.length === 0) return null;
  if (!/^\d+$/.test(value)) return null;

  const port = Number(value);
  return port >= 1 && port <= 65535 ? port : null;
};

const parseQuickConnectTarget = (rawInput: string): QuickConnectTarget | null => {
  const value = rawInput.trim();
  if (!value) return null;

  const atIndex = value.lastIndexOf("@");
  const username = atIndex >= 0 ? value.slice(0, atIndex) || "root" : "root";
  const target = atIndex >= 0 ? value.slice(atIndex + 1) : value;

  if (!target) return null;

  if (target.startsWith("[")) {
    const closeIndex = target.indexOf("]");
    if (closeIndex <= 1) return null;

    const host = target.slice(1, closeIndex);
    const remainder = target.slice(closeIndex + 1);
    const port =
      remainder.length === 0
        ? 22
        : remainder.startsWith(":")
          ? parsePort(remainder.slice(1))
          : null;

    return port ? { username, host, port } : null;
  }

  const colonCount = (target.match(/:/g) || []).length;

  if (colonCount === 0) {
    return { username, host: target, port: 22 };
  }

  if (colonCount === 1) {
    const [host, portValue] = target.split(":");
    const port = parsePort(portValue);
    return host && port ? { username, host, port } : null;
  }

  return { username, host: target, port: 22 };
};

export const QuickConnect = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  
  const { createTab } = useTerminalStore();
  const { addTemporaryServer } = useServerStore();

  const handleConnect = async () => {
    if (!input.trim()) return;

    // 1. 解析格式
    const parsed = parseQuickConnectTarget(input);

    if (!parsed) {
      toast.error(t('dashboard.quickConnect.invalidFormat', 'Invalid format. Use: user@host, user@host:port, or user@[IPv6]:port'));
      return;
    }

    const { username, host, port } = parsed;

    toast.info(t('dashboard.quickConnect.connecting', 'Connecting to {{host}}...', { host }));

    const quickId = `quick-${uuidv4()}`;

    // 2. 构建 Server 对象
    const quickServer: Server = {
        id: quickId,
        name: `${username}@${host}:${port}`,
        ip: host,
        port: port,
        username: username,
        authType: 'password', 
        connectionType: 'direct',
        os: 'linux', 
        icon: 'zap', 
        provider: 'QuickConnect', 
        tags: ['Quick'],
        sort: 0,
        isPinned: false,
        enableExpiration: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        passwordSource: 'manual',
        keySource: 'manual',
        password: "" 
    };

    try {
        // 3. 存入 Store 并跳转
        addTemporaryServer(quickServer);
        createTab(quickServer);
        navigate('/terminal');
    } catch (e) {
        console.error("Failed to init quick connection:", e);
        toast.error(t('dashboard.quickConnect.error', 'Failed to initialize connection'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative group">
        {/* 背景发光光晕 */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
        
        {/* 🟢 修改后的毛玻璃容器，参考 DashboardHeader 的样式 */}
        <div className={cn(
            "relative p-6 rounded-2xl transition-all duration-300",
            "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl", // 核心：背景透明 + 模糊
            "border border-white/40 dark:border-white/10",      // 细腻边框
            "shadow-lg shadow-slate-200/20 dark:shadow-black/20" // 柔和阴影
        )}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg backdrop-blur-md">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t('dashboard.quickConnect.title', 'Quick Connect')}
            </h3>
          </div>

          <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400">
                    <Monitor className="w-5 h-5" />
                </div>
                
                {/* 🟢 输入框样式也同步微调，以适应毛玻璃背景 */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="root@[2001:db8::1]:22"
                  className={cn(
                    "w-full py-3.5 pl-12 pr-32 rounded-xl transition-all font-mono text-sm outline-none",
                    "bg-white/40 dark:bg-slate-950/40 border border-white/20 dark:border-slate-800/50",
                    "text-slate-900 dark:text-slate-100 placeholder:text-slate-400/60",
                    "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 shadow-inner"
                  )}
                  autoComplete="off"
                  spellCheck="false"
                  autoFocus
                />

                <div className="absolute right-2 flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded text-[10px] font-medium text-slate-500 dark:text-slate-400 pointer-events-none select-none border border-black/5 dark:border-white/5">
                        <Command className="w-3 h-3" />
                        <span>Enter</span>
                    </div>
                    <button
                        onClick={handleConnect}
                        disabled={!input}
                        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300/50 dark:disabled:bg-slate-800/50 text-white rounded-lg transition-all shadow-md active:scale-95 disabled:shadow-none"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
          </div>
          
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 px-1 italic">
            {t('dashboard.quickConnect.hint', 'Format: user@host, user@host:port, or user@[IPv6]:port')}
          </p>
        </div>
      </div>
    </div>
  );
};
