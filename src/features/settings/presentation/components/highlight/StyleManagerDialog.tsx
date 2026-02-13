import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Palette, Plus, Edit2, Trash2, Search } from "lucide-react";

import { BaseModal } from "@/components/common/BaseModal";
import { CustomButton } from "@/components/common/CustomButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useSettingsStore } from "../../../application/useSettingsStore";
import { HighlightStyle } from "../../../domain/types";
import { StyleEditorDialog } from "./StyleEditorDialog";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const StyleManagerDialog = ({ open, onOpenChange }: Props) => {
    const { t } = useTranslation();
    const { savedStyles, loadStyles, deleteStyle } = useSettingsStore();
    
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingStyle, setEditingStyle] = useState<HighlightStyle | null>(null);
    
    // 控制删除确认弹窗
    const [styleToDelete, setStyleToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (open) loadStyles();
    }, [open]);

    const handleEdit = (style: HighlightStyle) => {
        setEditingStyle(style);
        setEditorOpen(true);
    };

    const handleCreate = () => {
        setEditingStyle(null);
        setEditorOpen(true);
    };

    return (
        <>
            <BaseModal
                isOpen={open}
                onClose={() => onOpenChange(false)}
                title={t('settings.highlights.manageStyles', 'Manage Styles')}
                icon={<Palette className="w-5 h-5" />}
                className="max-w-[500px] h-[500px]"
                footer={
                    <CustomButton onClick={handleCreate} className="w-full">
                        <Plus className="w-4 h-4" /> {t('settings.highlights.createNewStyle', 'Create New Style')}
                    </CustomButton>
                }
            >
                <div className="h-full flex flex-col">
                    {savedStyles.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Search className="w-8 h-8 opacity-30" />
                            <p className="text-sm">{t('settings.highlights.noStylesCreated', 'No styles created yet')}</p>
                        </div>
                    ) : (
                        <ScrollArea className="flex-1 -mx-2 px-2">
                            <div className="space-y-2 py-1">
                                {savedStyles.map(style => (
                                    <div key={style.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            {/* Preview Dot */}
                                            <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold border border-black/5 dark:border-white/5"
                                                 style={{
                                                     color: style.foreground || 'inherit',
                                                     backgroundColor: style.background || 'transparent',
                                                 }}>
                                                Aa
                                            </div>
                                            <span className="text-sm font-medium">{style.name}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CustomButton size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleEdit(style)}>
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </CustomButton>
                                            
                                            <CustomButton size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setStyleToDelete(style.id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </CustomButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </BaseModal>

            {/* Editor Dialog */}
            <StyleEditorDialog 
                open={editorOpen} 
                onOpenChange={setEditorOpen}
                styleToEdit={editingStyle}
            />

            {/* 删除确认弹窗 */}
            <ConfirmDialog
                open={!!styleToDelete}
                onOpenChange={(open) => !open && setStyleToDelete(null)}
                title={t('settings.highlights.deleteStyleTitle', 'Delete Style')}
                description={t('settings.highlights.deleteStyleDesc', 'Are you sure you want to delete this style? It might affect rules currently using it.')}
                cancelText={t('common.cancel', 'Cancel')}
                confirmText={t('common.delete', 'Delete')}
                variant="destructive"
                onConfirm={async () => {
                    if (styleToDelete) {
                        await deleteStyle(styleToDelete);
                    }
                    setStyleToDelete(null);
                }}
            />
        </>
    );
};