import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Trash2, Link2 } from 'lucide-react';
import { useKeyStore } from '@/store/useKeyStore';
import { KeyUsageStats } from '../../domain/types';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Props {
    keyId: string | null;
    onClose: () => void;
}

export const DeleteKeyModal = ({ keyId, onClose }: Props) => {
    const { t } = useTranslation();
    const { checkAssociations, deleteKey } = useKeyStore();
    
    const [isChecking, setIsChecking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [stats, setStats] = useState<KeyUsageStats | null>(null);

    useEffect(() => {
        if (keyId) {
            setIsChecking(true);
            checkAssociations(keyId)
                .then(data => setStats(data))
                .catch(err => console.error("Failed to check associations:", err))
                .finally(() => setIsChecking(false));
        } else {
            setStats(null);
            setIsChecking(false);
            setIsDeleting(false);
        }
    }, [keyId, checkAssociations]);

    const handleConfirm = async () => {
        if (!keyId || isChecking) return;
        
        setIsDeleting(true);
        try {
            await deleteKey(keyId);
            onClose();
        } catch (error) {
            console.error("Delete failed", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const hasAssociations = stats && stats.totalCount > 0;

    const WarningContent = (
        <div className="w-full text-left mt-2">
            {isChecking && (
                <div className="flex flex-col items-center justify-center text-zinc-500 py-4 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="text-xs">{t('keys.delete.checking', 'Checking associations...')}</span>
                </div>
            )}

            {!isChecking && hasAssociations && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                            <div className="text-[13px] font-bold leading-tight">
                                {t('keys.delete.warning', 'Used by {{count}} server(s)', { count: stats.totalCount })}
                            </div>
                            <div className="text-[11px] opacity-90 leading-tight">
                                {t('keys.delete.impact', 'Deleting this key will break connections to:')}
                            </div>
                        </div>
                    </div>

                    <div className="max-h-32 overflow-y-auto custom-scrollbar rounded border border-amber-100 dark:border-amber-800/30 bg-white/50 dark:bg-black/20">
                        {stats.associatedServers.map((server, idx) => (
                            <div key={server.serverId || idx} className="flex items-center gap-2 px-2.5 py-1.5 border-b border-amber-50 dark:border-amber-800/20 last:border-0 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors">
                                <Link2 className="w-3 h-3 text-amber-500/70 shrink-0" />
                                <span className="text-[11px] font-medium truncate flex-1 dark:text-zinc-300">
                                    {server.serverName}
                                </span>
                                {server.lastUsedAt && (
                                    <span className="text-[10px] text-amber-600/60 dark:text-amber-500/50 shrink-0 font-mono">
                                        {new Date(server.lastUsedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <ConfirmDialog
            open={!!keyId}
            onOpenChange={(open) => !open && onClose()}
            title={t('keys.delete.title', 'Delete Credential')}
            description={t('keys.delete.confirm', 'Are you sure you want to delete this credential? This action cannot be undone.')}
            variant="destructive"
            confirmText={t('common.delete', 'Delete')}
            cancelText={t('common.cancel', 'Cancel')}
            onConfirm={handleConfirm}
            isLoading={isDeleting}
            icon={
                <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-inner">
                    <Trash2 className="w-7 h-7 drop-shadow-sm" />
                </div>
            }
        >
            {(isChecking || hasAssociations) ? WarningContent : null}
        </ConfirmDialog>
    );
};
