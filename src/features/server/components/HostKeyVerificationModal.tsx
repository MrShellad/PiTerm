import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldAlert, 
  Fingerprint, 
  Copy, 
  Check, 
  Server as ServerIcon,
  AlertTriangle 
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// 定义后端返回的验证数据结构
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
      <AlertDialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-border shadow-2xl">
        
        {/* 头部警告区 */}
        <div className="bg-amber-50 dark:bg-amber-950/30 p-6 border-b border-amber-100 dark:border-amber-900/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3 text-amber-600 dark:text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-amber-900 dark:text-amber-200">
            {t('server.verify.title', 'Unknown Host')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-amber-800/90 dark:text-amber-300 mt-2 font-medium">
            {t('server.verify.desc', 'The authenticity of host cannot be established. Connecting to this server for the first time.')}
          </AlertDialogDescription>
        </div>

        {/* 信息详情区 */}
        <div className="p-6 space-y-4">
          
          {/* 服务器信息 */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <ServerIcon className="w-5 h-5 text-slate-400" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 uppercase font-semibold">Host</div>
              <div className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">
                {data.host} <span className="text-slate-400">({data.ip})</span>
              </div>
            </div>
          </div>

          {/* 指纹信息 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" />
                {data.keyType} Fingerprint
              </span>
            </div>
            
            <div 
              className="relative group cursor-pointer"
              onClick={handleCopy}
            >
              <div className="w-full p-3 bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs break-all text-slate-800 dark:text-slate-200 transition-colors group-hover:border-blue-500/50 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-950/30">
                {data.fingerprint}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isCopied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-950/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800/50">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="leading-normal font-medium">
              {t('server.verify.warning', 'To prevent MITM attacks, please verify that this fingerprint matches the server\'s key.')}
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <AlertDialogFooter className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            variant="default" 
            onClick={onConfirm} 
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none"
          >
            {t('server.verify.trust', 'Trust & Connect')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
