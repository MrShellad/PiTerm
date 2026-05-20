import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Terminal, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  logs: string[];
  serverName?: string;
  onClose?: () => void;
  isError?: boolean;
}

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
      <AlertDialogContent className="max-w-[450px] p-0 border-none bg-background text-foreground shadow-2xl rounded-xl overflow-hidden font-mono select-none">
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
        <div className="p-4 bg-muted flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {isError 
                  ? t('server.sshlog.failed', 'Connection Failed') 
                  : t('server.sshlog.connecting', 'Connecting...')}
            </span>
          </div>
          {!isError ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <button onClick={onClose} className="hover:text-white transition-colors">
              <XCircle className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col">
            <div className="text-[13px] font-bold text-foreground truncate leading-none">
              {serverName || 'Remote Server'}
            </div>
            {/* 🟢 [修改] 添加本地化: 建立安全隧道 */}
            <div className="text-[10px] text-muted-foreground uppercase tracking-tighter leading-none mt-1">
              {t('server.sshlog.tunnel', 'Establishing Secure Tunnel')}
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="h-56 overflow-y-auto bg-black/40 rounded-lg p-3 text-[11px] leading-relaxed custom-scrollbar border border-white/5 space-y-1"
          >
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 break-all animate-in fade-in slide-in-from-left-1 duration-200">
                <span className="text-emerald-500 shrink-0 select-none">❯</span>
                {/* 日志内容通常来自后端，直接显示即可 */}
                <span className={cn(log.toLowerCase().includes('failed') || log.toLowerCase().includes('error') ? "text-red-400" : "")}>
                  {log}
                </span>
              </div>
            ))}
            {/* 🟢 [修改] 添加本地化: 初始化引擎 */}
            {logs.length === 0 && (
              <div className="text-zinc-600 italic">
                {t('server.sshlog.init', 'Initializing engine...')}
              </div>
            )}
          </div>
          
          {isError ? (
             <button 
               onClick={onClose}
               className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-xs transition-colors"
             >
               {t('common.close', 'Close')}
             </button>
          ) : (
             <button 
               onClick={onClose}
               className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-md text-xs transition-colors font-semibold border border-red-500/20"
             >
               {t('common.cancel', 'Cancel')}
             </button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
