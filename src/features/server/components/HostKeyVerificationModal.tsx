import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldAlert, 
  Copy, 
  Check, 
  Terminal,
  AlertOctagon
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface HostKeyData {
  host: string;
  ip: string;
  keyType: string;
  fingerprint: string;
}

interface Props {
  open: boolean;
  data: HostKeyData | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const HostKeyVerificationModal = ({ open, data, onConfirm, onCancel }: Props) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  if (!data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data.fingerprint);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AlertDialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <AlertDialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-background border border-border shadow-xl dark:shadow-[0_0_30px_hsl(var(--primary)/0.15)] rounded-xl">
        {/* top glow bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 animate-pulse" />

        {/* 头部警告区 */}
        <div className="p-6 border-b border-border/60 flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-b from-muted/30 to-background">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />
          
          <div className="w-12 h-12 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center mb-4 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)] animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          
          <AlertDialogTitle className="text-sm font-mono tracking-widest text-primary uppercase flex items-center gap-1.5">
            <span className="text-destructive select-none">🚨</span> {t('server.verify.title', 'Security Handshake')}
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-xs font-sans text-muted-foreground mt-3 max-w-[90%] leading-relaxed">
            {t('server.verify.desc', 'The authenticity of host cannot be established. Connecting to this server for the first time.')}
          </AlertDialogDescription>
        </div>

        {/* 信息详情区 */}
        <div className="p-6 space-y-4 font-mono text-xs">
          
          {/* 服务器及指纹整合终端视窗 */}
          <div className="border border-border rounded-lg bg-black/60 overflow-hidden shadow-inner">
            {/* Terminal Header */}
            <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between text-muted-foreground text-[10px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                HOST_KEY_VERIFICATION.LOG
              </span>
              <span className="text-primary/70 font-semibold">SECURE_SHELL v2</span>
            </div>

            <div className="p-4 space-y-3">
              {/* Host info */}
              <div className="grid grid-cols-4 gap-1.5">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">host:</span>
                <span className="col-span-3 text-primary font-semibold truncate">
                  {data.host}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">ip_addr:</span>
                <span className="col-span-3 text-foreground/80">
                  {data.ip}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">key_type:</span>
                <span className="col-span-3 text-foreground/80 font-semibold">
                  {data.keyType}
                </span>
              </div>

              {/* Fingerprint block */}
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <div className="text-muted-foreground text-[10px] uppercase font-semibold">sha256_fingerprint:</div>
                <div 
                  className="relative group cursor-pointer"
                  onClick={handleCopy}
                  title="Click to copy fingerprint"
                >
                  <div className="w-full p-2.5 bg-black/40 border border-border rounded-md font-mono text-[11px] leading-relaxed break-all text-primary transition-all group-hover:border-primary/50 group-hover:text-primary/80 pr-8">
                    {data.fingerprint}
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-opacity">
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in-50" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 温馨提示 */}
          <div className="flex gap-2.5 text-[11px] text-yellow-600 dark:text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 p-3 rounded-lg leading-normal">
            <AlertOctagon className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="font-sans leading-relaxed">
              {t('server.verify.warning', 'To prevent MITM attacks, please verify that this fingerprint matches the server\'s key.')}
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <AlertDialogFooter className="p-4 bg-muted/40 border-t border-border/50 gap-3 font-mono text-xs">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="flex-1 bg-transparent hover:bg-accent border-input text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            variant="default" 
            onClick={onConfirm} 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_hsl(var(--primary)/0.15)] border-none transition-all uppercase tracking-wider"
          >
            {t('server.verify.trust', 'Trust & Connect')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
