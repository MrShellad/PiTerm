import { useEffect } from 'react';
import { useKeyStore } from '@/store/useKeyStore';
import { VaultAuthForm } from './VaultAuthForm';

export const KeyVaultGuard = ({ children }: { children: React.ReactNode }) => {
    const { status, checkVaultStatus } = useKeyStore();

    useEffect(() => {
        checkVaultStatus();
    }, [checkVaultStatus]);

    if (status === 'unlocked') {
        return <>{children}</>;
    }

    return (
        <div className="h-full w-full flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-blue-500/10 dark:shadow-blue-900/30 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500" />
                <VaultAuthForm />
            </div>
        </div>
    );
};
