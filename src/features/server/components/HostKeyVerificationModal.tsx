import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck,
  Copy, 
  Check, 
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
      <AlertDialogContent className="max-w-md gap-0 overflow-hidden rounded-xl border border-border/70 bg-card p-0 text-card-foreground shadow-2xl">
        {/* 头部警告区 */}
        <div className="flex items-start gap-3 border-b border-border/60 bg-card/80 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              {t('server.verify.title', 'Security Handshake')}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t('server.verify.desc', 'The authenticity of host cannot be established. Connecting to this server for the first time.')}
            </AlertDialogDescription>
          </div>
        </div>

        {/* 信息详情区 */}
        <div className="space-y-4 bg-background/35 p-5 text-xs">
          
          {/* 服务器及指纹整合终端视窗 */}
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
            <div className="space-y-3 p-4 font-mono">
              {/* Host info */}
              <div className="grid grid-cols-4 gap-1.5 items-center">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">host:</span>
                <span className="col-span-3 truncate font-semibold text-foreground">
                  {data.host}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 items-center">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">ip_addr:</span>
                <span className="col-span-3 text-foreground/80">
                  {data.ip}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 items-center">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">key_type:</span>
                <span className="col-span-3 font-semibold text-foreground/80">
                  {data.keyType}
                </span>
              </div>

              {/* Fingerprint block */}
              <div className="space-y-1.5 border-t border-border/60 pt-2.5">
                <div className="text-muted-foreground text-[10px] uppercase font-semibold">sha256_fingerprint:</div>
                <div 
                  className="relative group cursor-pointer"
                  onClick={handleCopy}
                  title="Click to copy fingerprint"
                >
                  <div className="w-full rounded-md border border-border/70 bg-background/70 p-2.5 pr-8 font-mono text-[11px] leading-relaxed break-all text-primary transition-colors group-hover:border-primary/40">
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
          <div className="flex gap-2.5 rounded-lg border border-primary/15 bg-primary/5 p-3 text-[11px] leading-normal text-muted-foreground">
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="leading-relaxed">
              {t('server.verify.warning', 'To prevent MITM attacks, please verify that this fingerprint matches the server\'s key.')}
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <AlertDialogFooter className="gap-2 border-t border-border/60 bg-card/80 p-4 text-xs sm:space-x-0">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="flex-1 border-border/70 bg-background/50 text-muted-foreground hover:text-foreground"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            variant="default" 
            onClick={onConfirm} 
            className="flex-1 font-semibold"
          >
            {t('server.verify.trust', 'Trust & Connect')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
