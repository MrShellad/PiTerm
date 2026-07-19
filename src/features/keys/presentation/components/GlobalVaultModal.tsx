import { useKeyStore } from '@/store/useKeyStore';
import { VaultAuthForm } from './VaultAuthForm';
import { X } from 'lucide-react';

export const GlobalVaultModal = () => {
    const { isGlobalUnlockModalOpen, closeGlobalUnlockModal, status, pendingAction } = useKeyStore();

    if (!isGlobalUnlockModalOpen || status === 'unlocked') return null;

    const handleSuccess = () => {
        const actionToExecute = pendingAction;
        closeGlobalUnlockModal();
        if (actionToExecute) {
            setTimeout(() => {
                actionToExecute();
            }, 120);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200" 
                onClick={closeGlobalUnlockModal}
            />
            
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-blue-500/10 dark:shadow-blue-900/30 border border-slate-200/80 dark:border-slate-800/80 animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* 顶部安全装饰色带 */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500" />

                <button 
                     onClick={closeGlobalUnlockModal}
                     className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <VaultAuthForm onSuccess={handleSuccess} />
            </div>
        </div>
    );
};
