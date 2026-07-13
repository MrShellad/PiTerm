import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { clsx } from 'clsx'; 

// Components
import { ActionToolbar } from '@/components/common/ActionToolbar';

// Store
import { useKeyStore } from '@/store/useKeyStore';

export const KeyManagerToolbar = () => {
    const { t } = useTranslation();
    const { viewMode, toggleViewMode, keys } = useKeyStore();
    const { openModal } = useKeyStore(); 
    // 本地搜索状态
    const [searchQuery, setSearchQuery] = useState('');

    // 导出所有密钥逻辑
    const handleExportAll = async () => {
        if (keys.length === 0) return;

        try {
            const path = await save({
                defaultPath: `key_vault_backup_${new Date().toISOString().split('T')[0]}.json`,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });

            if (path) {
                const content = JSON.stringify(keys, null, 2);
                await writeTextFile(path, content);
                console.log('Export success');
            }
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    return (
        <div className={clsx(
            "sticky top-2 z-10 p-4 m-2 rounded-xl shadow-sm",
            "bg-white/60 dark:bg-slate-900/60 backdrop-blur-md",
            "border border-white/40 dark:border-white/10",
            "transition-all duration-300"
        )}>
            <ActionToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t('keys.searchPlaceholder', 'Search keys...')}
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                    if (mode !== viewMode) {
                        toggleViewMode();
                    }
                }}
                extraActions={
                    <button 
                        onClick={handleExportAll}
                        disabled={keys.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('common.exportAll', 'Export All')}
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">{t('common.exportAll', 'Export All')}</span>
                    </button>
                }
                onAdd={() => openModal('add')}
                addLabel={t('keys.add', 'Add Key')}
            />
        </div>
    );
};
