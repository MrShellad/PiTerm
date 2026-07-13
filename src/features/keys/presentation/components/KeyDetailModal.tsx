import { useState } from 'react';
import { X, Key, FileKey, Copy, CheckCircle2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KeyEntry, DecryptedData } from '../../domain/types';

interface Props {
    data: KeyEntry;
    decryptedData: DecryptedData;
    onClose: () => void;
}

const CopyButton = ({ text }: { text: string }) => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            title={t('common.copy', 'Copy')}
            className="p-1.5 bg-white dark:bg-slate-800 rounded-md shadow-sm hover:bg-slate-50 transition-all border border-slate-200 dark:border-slate-700 active:scale-95 disabled:opacity-50"
            disabled={!text}
        >
            {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4 text-slate-500"/>}
        </button>
    );
};

export const KeyDetailModal = ({ data, decryptedData, onClose }: Props) => {
    const { t } = useTranslation();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            
            <div 
                className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                {/* 1. Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        {data.type === 'password' ? <Key className="w-5 h-5 text-orange-500"/> : <FileKey className="w-5 h-5 text-blue-500"/>}
                        {data.name}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                
                {/* 2. Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Key Content */}
                    <div className="flex flex-col h-64"> 
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {data.type === 'password' ? t('keys.label.passwordContent', 'Password Content') : t('keys.label.privateKey', 'Private Key')}
                            </label>
                        </div>
                        
                        <div className="relative bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden group">
                            <div className="absolute top-2 right-2 z-10 bg-slate-100 dark:bg-slate-950 pl-2 pb-2 rounded-bl-lg">
                                <CopyButton text={decryptedData.val} />
                            </div>
                            <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4">
                                <div className="font-mono text-xs break-all whitespace-pre-wrap text-slate-600 dark:text-slate-300 pr-8">
                                    {decryptedData.val}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Passphrase */}
                    {data.type === 'private_key' && (
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Lock className="w-3 h-3"/> 
                                    {t('keys.label.passphrase', 'Passphrase')}
                                </label>
                            </div>

                            <div className="relative bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between group min-h-[3rem]">
                                <div className={`font-mono text-xs pr-10 break-all ${decryptedData.pass ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 italic'}`}>
                                    {decryptedData.pass || t('keys.msg.noPassphrase', 'No passphrase set')}
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 right-2">
                                    {decryptedData.pass && <CopyButton text={decryptedData.pass} />}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-colors">
                        {t('common.close', 'Close')}
                    </button>
                </div>
            </div>
        </div>
    );
};
