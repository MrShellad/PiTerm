import { KeyEntry } from '../../domain/types';
import { Key, FileKey, Server, Loader2, MoreHorizontal, PenLine, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { useKeyStore } from '@/store/useKeyStore';
import { useKeyCardLogic } from '../../application/hooks/useKeyCardLogic';
import { KeyDetailModal } from './KeyDetailModal';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { 
  InteractiveCard, 
  InteractiveCardHeader, 
  InteractiveCardIcon, 
  InteractiveCardBody
} from "@/components/common/InteractiveCard";

interface Props {
    data: KeyEntry;
    onDelete: (id: string) => void;
}

export const KeyCard = ({ data, onDelete }: Props) => {
    const { t } = useTranslation();
    const { openModal } = useKeyStore();
    
    const {
        decryptedData, 
        isDecrypting,
        showDetail,
        showMenu,
        setShowDetail,
        setShowMenu,
        handleCardClick,
        handleExport
    } = useKeyCardLogic(data);

    const isPassword = data.type === 'password';

    return (
        <>
            <InteractiveCard 
                className={clsx(
                    "group cursor-pointer",
                    isDecrypting && "opacity-70 pointer-events-none"
                )}
                onClick={handleCardClick}
            >
                {/* 1. Loading Overlay */}
                {isDecrypting && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] rounded-xl transition-all">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                )}

                {/* 2. Header */}
                <InteractiveCardHeader>
                    <InteractiveCardIcon 
                        className={clsx(
                            "border shadow-sm transition-colors duration-300", 
                            isPassword 
                                ? "!bg-orange-500 !border-orange-600 text-white"
                                : "!bg-blue-500 !border-blue-600 text-white"
                        )}
                    >
                        {isPassword ? <Key className="w-5 h-5" /> : <FileKey className="w-5 h-5" />}
                    </InteractiveCardIcon>

                    <div className="flex flex-col min-w-0 flex-1 ml-3 mr-2 justify-center">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm leading-tight">
                            {data.name}
                        </h3>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5 opacity-90">
                            {isPassword ? 'Password' : 'Private Key'}
                        </span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                            <DropdownMenuTrigger asChild>
                                <button 
                                    className={clsx(
                                        "p-1.5 rounded-md transition-all duration-200 outline-none",
                                        "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100",
                                        "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300",
                                        "data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800"
                                    )}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 z-[50]">
                                <DropdownMenuItem onClick={() => openModal('edit', data.id)}>
                                    <PenLine className="w-3.5 h-3.5 mr-2 opacity-70" />
                                    {t('common.edit', 'Edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExport}>
                                    <Download className="w-3.5 h-3.5 mr-2 opacity-70" />
                                    {t('common.export', 'Export')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/10" 
                                    onClick={() => onDelete(data.id)}
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2 opacity-70" />
                                    {t('common.delete', 'Delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </InteractiveCardHeader>

                {/* 3. Body: Usage Info */}
                <InteractiveCardBody className="mt-2">
                    <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-md p-2.5 text-[11px] border border-slate-100 dark:border-white/5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800/50">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Server className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="font-medium truncate text-slate-700 dark:text-slate-300">
                                {data.lastUsed ? data.lastUsed.serverName : t('keys.neverUsed', 'Never used')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="truncate mr-2 opacity-80">{data.lastUsed?.serverIp || '-'}</span>
                            <span className="whitespace-nowrap opacity-80">
                                {data.lastUsed ? format(data.lastUsed.timestamp, 'MMM d, HH:mm') : '-'}
                            </span>
                        </div>
                    </div>
                </InteractiveCardBody>

            </InteractiveCard>

            {/* Detail Modal */}
            {showDetail && decryptedData && (
                <KeyDetailModal 
                    data={data}
                    decryptedData={decryptedData} 
                    onClose={() => setShowDetail(false)}
                />
            )}
        </>
    );
};
