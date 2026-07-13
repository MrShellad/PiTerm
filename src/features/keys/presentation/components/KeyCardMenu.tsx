import { MoreHorizontal, Download, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    isOpen: boolean;
    onToggle: (e: React.MouseEvent) => void;
    onClose: () => void;
    onExport: (e: React.MouseEvent) => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const KeyCardMenu = ({ isOpen, onToggle, onClose, onExport, onEdit, onDelete }: Props) => {
    const { t } = useTranslation();

    return (
        <div className="relative">
            <button 
                onClick={onToggle}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onClose(); }} />
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={onExport} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                            <Download className="w-3.5 h-3.5" /> {t('common.export', 'Export')}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onClose(); onEdit(); }} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                            <Edit className="w-3.5 h-3.5" /> {t('common.edit', 'Edit')}
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"/>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" /> {t('common.delete', 'Delete')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
