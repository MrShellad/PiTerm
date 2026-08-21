import { useState, useEffect, useRef, useMemo } from 'react';
import { KeyVaultGuard } from './components/KeyVaultGuard';
import { KeyManagerToolbar } from './components/KeyManagerToolbar';
import { useKeyStore } from '@/store/useKeyStore';
import { KeyCard } from './components/KeyCard';
import { KeyActionModal } from './components/KeyActionModal';
import { DeleteKeyModal } from './components/DeleteKeyModal';
import { clsx } from 'clsx';
import { useTranslation } from "react-i18next";
import { useVirtualizer } from '@tanstack/react-virtual';

export const KeyManagerPanel = () => {
    const { keys, viewMode, loadKeys } = useKeyStore();
    const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
    const { t } = useTranslation();

    const parentRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(1);

    useEffect(() => {
        loadKeys();
    }, [loadKeys]);

    useEffect(() => {
        if (viewMode === 'list') {
            setColumns(1);
            return;
        }
        const updateColumns = () => {
            if (!parentRef.current) return;
            const w = parentRef.current.getBoundingClientRect().width;
            if (w < 640) setColumns(1);
            else if (w < 1024) setColumns(2);
            else if (w < 1280) setColumns(3);
            else setColumns(4);
        };
        updateColumns();
        const observer = new ResizeObserver(updateColumns);
        if (parentRef.current) {
            observer.observe(parentRef.current);
        }
        return () => observer.disconnect();
    }, [viewMode]);

    const rows = useMemo(() => {
        const chunked = [];
        for (let i = 0; i < keys.length; i += columns) {
            chunked.push(keys.slice(i, i + columns));
        }
        return chunked;
    }, [keys, columns]);

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => (viewMode === 'grid' ? 145 : 82),
        overscan: 5,
    });

    return (
        <div className="h-full flex flex-col text-foreground select-none">
            <KeyVaultGuard>
                
                {/* 1. 顶部工具栏 */}
                <div className="shrink-0">
                    <KeyManagerToolbar />
                </div>

                {/* 2. 内容区域 */}
                <div 
                    ref={parentRef}
                    className="flex-1 overflow-y-auto p-4 custom-scrollbar"
                >
                    {keys.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <p>{t('keys.empty', 'No keys found. Create one to get started.')}</p>
                        </div>
                    ) : (
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const rowItems = rows[virtualRow.index];
                                if (!rowItems) return null;
                                return (
                                    <div
                                        key={virtualRow.key}
                                        className={clsx(
                                            viewMode === 'grid' 
                                                ? "grid gap-4"
                                                : "flex flex-col gap-2"
                                        )}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                            gridTemplateColumns: viewMode === 'grid' ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
                                        }}
                                    >
                                        {rowItems.map((key) => (
                                            <KeyCard 
                                                key={key.id} 
                                                data={key} 
                                                onDelete={(id) => setKeyToDelete(id)} 
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* 编辑/新增弹窗 */}
                <KeyActionModal />

                {/* 删除确认弹窗 */}
                <DeleteKeyModal 
                    keyId={keyToDelete} 
                    onClose={() => setKeyToDelete(null)} 
                />

            </KeyVaultGuard>
        </div>
    );
};
