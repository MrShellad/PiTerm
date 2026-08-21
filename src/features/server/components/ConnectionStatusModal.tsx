import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Terminal, XCircle, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  logs: string[];
  serverName?: string;
  onClose?: () => void;
  isError?: boolean;
}

// 科技感 SVG 数据传输与隧道建立动画组件
const ConnectingSvgAnimation = ({ isError }: { isError?: boolean }) => (
  <div className="relative my-1 flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/25 p-2">
    {/* 网格发光背景 */}
    <svg className="pointer-events-none absolute inset-0 h-full w-full text-foreground opacity-[0.07]" width="100%" height="100%">
      <defs>
        <pattern id="modal-grid-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/40" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#modal-grid-pattern)" />
    </svg>

    <svg className="w-full h-full max-w-[360px] relative z-10" viewBox="0 0 360 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* 传输线渐变 */}
        <linearGradient id="tunnel-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isError ? "#ef4444" : "#3b82f6"} stopOpacity="0.2" />
          <stop offset="50%" stopColor={isError ? "#f87171" : "#60a5fa"} stopOpacity="0.9" />
          <stop offset="100%" stopColor={isError ? "#ef4444" : "#3b82f6"} stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="tunnel-glow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* --- 连接基准线 --- */}
      <line 
        x1="60" y1="40" x2="300" y2="40" 
        stroke={isError ? "rgba(239, 68, 68, 0.4)" : "url(#tunnel-beam-grad)"} 
        strokeWidth="2.5" 
        strokeDasharray="6 4" 
        className={!isError ? "animate-pulse" : ""} 
      />
      
      {/* 动画流转光束包 */}
      {!isError && (
        <>
          <path 
            d="M 60 40 L 300 40" 
            stroke="url(#tunnel-glow-grad)" 
            strokeWidth="3" 
            strokeDasharray="35 170" 
            className="animate-tunnel-flow" 
          />
          <circle cx="60" cy="40" r="3" fill="#60a5fa" className="animate-ping opacity-75" />
        </>
      )}

      {/* --- 左侧节点: Client 客户端 --- */}
      <g transform="translate(60, 40)">
        <circle r="20" fill="hsl(var(--card))" stroke={isError ? "#ef4444" : "hsl(var(--primary))"} strokeWidth="1.5" />
        <circle r="24" fill="none" stroke={isError ? "#ef4444" : "#3b82f6"} strokeWidth="1" strokeDasharray="4 4" opacity="0.4">
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="12s" repeatCount="indefinite" />
        </circle>
        <path d="M-8 -5 H8 V3 H-8 Z M-10 6 H10 V8 H-10 Z" fill="none" stroke={isError ? "#f87171" : "#93c5fd"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600" fontFamily="monospace">CLIENT</text>
      </g>

      {/* --- 中间安全加锁/状态节点 --- */}
      <g transform="translate(180, 40)">
        <circle r="14" fill="#0f172a" stroke={isError ? "#ef4444" : "#10b981"} strokeWidth="1.5" />
        {!isError ? (
          <path d="M-4 -2 C-4 -2 0 -6 4 -2 C4 4 0 6 0 6 C0 6 -4 4 -4 -2 Z" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" className="animate-pulse" />
        ) : (
          <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        )}
      </g>

      {/* --- 右侧节点: Remote Server 远程服务器 --- */}
      <g transform="translate(300, 40)">
        <circle r="20" fill="hsl(var(--card))" stroke={isError ? "#ef4444" : "hsl(var(--primary))"} strokeWidth="1.5" />
        <circle r="24" fill="none" stroke={isError ? "#ef4444" : "#3b82f6"} strokeWidth="1" strokeDasharray="4 4" opacity="0.4">
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="12s" repeatCount="indefinite" />
        </circle>
        <rect x="-8" y="-8" width="16" height="5" rx="1" fill="none" stroke={isError ? "#f87171" : "#93c5fd"} strokeWidth="1.2" />
        <rect x="-8" y="-2" width="16" height="5" rx="1" fill="none" stroke={isError ? "#f87171" : "#93c5fd"} strokeWidth="1.2" />
        <rect x="-8" y="4" width="16" height="5" rx="1" fill="none" stroke={isError ? "#f87171" : "#93c5fd"} strokeWidth="1.2" />
        <circle cx="-5" cy="-5.5" r="0.8" fill={isError ? "#ef4444" : "#10b981"} />
        <circle cx="-5" cy="0.5" r="0.8" fill={isError ? "#ef4444" : "#10b981"} />
        <circle cx="-5" cy="6.5" r="0.8" fill={isError ? "#ef4444" : "#10b981"} />
        <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600" fontFamily="monospace">SERVER</text>
      </g>
    </svg>
  </div>
);

export const ConnectionStatusModal = ({ open, logs, serverName, onClose, isError }: Props) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!open) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-[460px] gap-0 overflow-hidden rounded-xl border border-border/70 bg-card p-0 text-card-foreground shadow-2xl select-none">
        <AlertDialogTitle className="sr-only">
          {isError
            ? t('server.sshlog.failed', 'Connection Failed')
            : t('server.sshlog.connecting', 'Connecting...')}
        </AlertDialogTitle>
        <AlertDialogDescription className="sr-only">
          {serverName
            ? t('server.sshlog.description', 'SSH connection log for {{serverName}}.', { serverName })
            : t('server.sshlog.descriptionFallback', 'SSH connection log dialog.')}
        </AlertDialogDescription>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", isError ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/10 text-primary")}>
              {isError ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <Terminal className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {isError 
                  ? t('server.sshlog.failed', 'Connection Failed') 
                  : t('server.sshlog.connecting', 'Connecting...')}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{serverName || 'Remote Server'}</div>
            </div>
          </div>
          {!isError ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={t('common.close', 'Close')}>
              <XCircle className="w-4 h-4 text-destructive" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3 bg-background/35 p-4">
          <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium", isError ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-primary")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isError ? "bg-destructive" : "bg-primary animate-pulse")} />
            {t('server.sshlog.tunnel', 'Establishing Secure Tunnel')}
          </div>

          {/* SVG 科技感数据传输与隧道建立动画 */}
          <ConnectingSvgAnimation isError={isError} />

          {/* Terminal log output */}
          <div 
            ref={scrollRef}
            className="custom-scrollbar h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-muted/25 p-3 font-mono text-[11px] leading-relaxed"
          >
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 break-all animate-in fade-in slide-in-from-left-1 duration-200">
                <span className="shrink-0 select-none font-bold text-primary/70">❯</span>
                <span className={cn(
                  log.toLowerCase().includes('failed') || log.toLowerCase().includes('error') 
                    ? "text-destructive font-semibold"
                    : "text-foreground/80"
                )}>
                  {log}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-muted-foreground italic">
                {t('server.sshlog.init', 'Initializing engine...')}
              </div>
            )}
          </div>
          
          {isError ? (
             <Button 
               variant="destructive"
               onClick={onClose}
               className="w-full text-xs font-semibold"
             >
               {t('common.close', 'Close')}
             </Button>
          ) : (
             <Button 
               variant="outline"
               onClick={onClose}
               className="w-full border-border/70 bg-background/50 text-xs font-semibold text-muted-foreground hover:text-foreground"
             >
               {t('common.cancel', 'Cancel')}
             </Button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
