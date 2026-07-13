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
        <div className="h-full w-full flex items-center justify-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
                <VaultAuthForm />
            </div>
        </div>
    );
};
