import { useKeyStore } from '@/store/useKeyStore';
import { VaultAuthForm } from './VaultAuthForm';
import { X } from 'lucide-react';

export const GlobalVaultModal = () => {
    const { isGlobalUnlockModalOpen, closeGlobalUnlockModal, status, pendingAction, setPendingAction } = useKeyStore();

    if (!isGlobalUnlockModalOpen || status === 'unlocked') return null;

    const handleSuccess = () => {
        closeGlobalUnlockModal();
        if (pendingAction) {
            setTimeout(() => {
                pendingAction();
                setPendingAction(null);
            }, 100);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={closeGlobalUnlockModal}
            />
            
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
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
