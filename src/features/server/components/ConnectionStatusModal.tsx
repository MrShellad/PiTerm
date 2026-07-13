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
      <AlertDialogContent className="max-w-[450px] p-0 border border-border bg-background text-foreground shadow-xl dark:shadow-[0_0_30px_hsl(var(--primary)/0.15)] rounded-xl overflow-hidden font-mono select-none">
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
        
        {/* top glow bar */}
        <div className={cn(
          "h-[2px] w-full bg-gradient-to-r",
          isError 
            ? "from-destructive/80 via-destructive to-destructive/80" 
            : "from-primary/70 via-primary to-primary/70 animate-pulse"
        )} />

        {/* Header */}
        <div className="p-4 bg-muted flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-2">
            {isError ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : (
              <Terminal className="w-4 h-4 text-primary" />
            )}
            <span className={cn(
              "text-xs font-bold uppercase tracking-widest leading-none",
              isError ? "text-destructive" : "text-primary"
            )}>
                {isError 
                  ? t('server.sshlog.failed', 'Connection Failed') 
                  : t('server.sshlog.connecting', 'Connecting...')}
            </span>
          </div>
          {!isError ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <button onClick={onClose} className="hover:text-foreground transition-colors">
              <XCircle className="w-4 h-4 text-destructive" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-gradient-to-b from-muted/30 to-background">
          <div className="flex gap-1.5 flex-col">
            <div className="text-sm font-bold text-foreground truncate leading-none">
              {serverName || 'Remote Server'}
            </div>
            <div className="text-[10px] text-primary/80 uppercase tracking-widest font-semibold leading-none mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              {t('server.sshlog.tunnel', 'Establishing Secure Tunnel')}
            </div>
          </div>

          {/* Terminal log output */}
          <div 
            ref={scrollRef}
            className="h-56 overflow-y-auto bg-black/60 rounded-lg p-3 text-[11px] leading-relaxed custom-scrollbar border border-border space-y-1"
          >
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 break-all animate-in fade-in slide-in-from-left-1 duration-200">
                <span className="text-primary shrink-0 select-none">❯</span>
                <span className={cn(
                  log.toLowerCase().includes('failed') || log.toLowerCase().includes('error') 
                    ? "text-destructive font-semibold" 
                    : "text-muted-foreground"
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
               className="w-full font-mono text-xs font-semibold tracking-wider uppercase shadow-[0_0_10px_hsl(var(--destructive)/0.15)]"
             >
               {t('common.close', 'Close')}
             </Button>
          ) : (
             <Button 
               variant="outline"
               onClick={onClose}
               className="w-full font-mono text-xs font-semibold tracking-wider uppercase border border-border/50 text-muted-foreground hover:text-foreground"
             >
               {t('common.cancel', 'Cancel')}
             </Button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
