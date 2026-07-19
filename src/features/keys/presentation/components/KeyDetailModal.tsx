import { useState } from 'react';
import { X, Key, FileKey, Copy, CheckCircle2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KeyEntry, DecryptedData } from '../../domain/types';
import { Button } from '@/components/ui/button';

interface Props {
  data: KeyEntry;
  decryptedData: DecryptedData;
  onClose: () => void;
}

const CopyButton = ({ text }: { text: string }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleCopy}
      title={t('common.copy', 'Copy')}
      className="h-8 w-8 bg-card shadow-sm hover:bg-muted active:scale-95 disabled:opacity-50"
      disabled={!text}
    >
      {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
    </Button>
  );
};

export const KeyDetailModal = ({ data, decryptedData, onClose }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <div
        className="relative bg-card text-card-foreground w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-border"
        onClick={e => e.stopPropagation()}
      >
        {/* 1. Header */}
        <div className="flex justify-between items-center p-5 border-b border-border shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
            {data.type === 'password' ? <Key className="w-5 h-5 text-amber-500" /> : <FileKey className="w-5 h-5 text-primary" />}
            {data.name}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 2. Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Key Content */}
          <div className="flex flex-col h-64">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {data.type === 'password' ? t('keys.label.passwordContent', 'Password Content') : t('keys.label.privateKey', 'Private Key')}
              </label>
            </div>

            <div className="relative bg-muted/40 rounded-lg border border-border overflow-hidden group">
              <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm p-1 rounded-md border border-border/50">
                <CopyButton text={decryptedData.val} />
              </div>
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4">
                <div className="font-mono text-xs break-all whitespace-pre-wrap text-foreground pr-8">
                  {decryptedData.val}
                </div>
              </div>
            </div>
          </div>

          {/* Passphrase */}
          {data.type === 'private_key' && (
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t('keys.label.passphrase', 'Passphrase')}
                </label>
              </div>

              <div className="relative bg-muted/40 rounded-lg border border-border p-3 flex items-center justify-between group min-h-[3rem]">
                <div className={`font-mono text-xs pr-10 break-all ${decryptedData.pass ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                  {decryptedData.pass || t('keys.msg.noPassphrase', 'No passphrase set')}
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-2">
                  {decryptedData.pass && <CopyButton text={decryptedData.pass} />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Footer */}
        <div className="p-4 border-t border-border flex justify-end shrink-0 bg-muted/20 rounded-b-xl">
          <Button variant="outline" onClick={onClose} size="sm">
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </div>
  );
};
