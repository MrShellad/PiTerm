import { useTranslation } from 'react-i18next';
import { X, Upload, Eye, EyeOff, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useKeyForm } from '@/features/keys/application/hooks/useKeyForm';

export const KeyActionModal = () => {
    const { t } = useTranslation();
    
    const {
        isOpen, mode,
        name, setName,
        type, 
        content, setContent,
        username, setUsername,
        passphrase, setPassphrase,
        
        isLoading, isFetchingData,
        showContent, setShowContent,
        showPassphrase, setShowPassphrase,
        isValidKey, keyStatusMsg,
        
        closeModal,
        handleFileUpload,
        handleSubmit
    } = useKeyForm();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        {mode === 'add' ? t('keys.action.add', 'Add Credential') : t('keys.action.edit', 'Edit Credential')}
                    </h3>
                    <button onClick={closeModal} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                {isFetchingData ? (
                    <div className="flex-1 flex items-center justify-center p-10">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                        {/* Name & Username */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase">
                                    {t('keys.label.remarkName', 'Remark Name')} <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder={t('keys.placeholder.remarkName', 'e.g. Production Server')}
                                    autoFocus 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase">
                                    {t('keys.label.username', 'Username')}
                                </label>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)} 
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder={t('keys.placeholder.username', 'Optional')}
                                />
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Content */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <label className="text-xs font-semibold text-slate-500 uppercase">
                                    {type === 'password' ? t('keys.label.password', 'Password') : t('keys.label.privateKey', 'Private Key')} <span className="text-red-500">*</span>
                                </label>
                                {type === 'private_key' && (
                                    <button 
                                        type="button" 
                                        onClick={handleFileUpload} 
                                        className="text-xs text-blue-600 flex gap-1 items-center hover:underline"
                                    >
                                        <Upload className="w-3 h-3"/> 
                                        {t('keys.action.importFile', 'Import File')}
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                {type === 'password' ? (
                                    <input 
                                        type={showContent ? "text" : "password"} 
                                        value={content} 
                                        onChange={e => setContent(e.target.value)} 
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                                    />
                                ) : (
                                    <textarea 
                                        value={content} 
                                        onChange={e => setContent(e.target.value)} 
                                        rows={6} 
                                        placeholder={t('keys.placeholder.privateKey', 'Paste your private key here')}
                                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 font-mono text-xs leading-relaxed resize-none custom-scrollbar whitespace-pre focus:ring-2 outline-none ${!isValidKey && content ? 'border-red-500 focus:ring-red-500/20' : 'focus:ring-blue-500'}`} 
                                    />
                                )}
                                {type === 'password' && (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowContent(!showContent)} 
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                    >
                                        {showContent ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                    </button>
                                )}
                            </div>
                            {type === 'private_key' && content && (
                                <div className={`text-[10px] flex items-center gap-1 mt-1 ${isValidKey ? 'text-green-600' : 'text-red-500'}`}>
                                    {isValidKey ? <CheckCircle2 className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                                    {keyStatusMsg}
                                </div>
                            )}
                        </div>

                        {/* Passphrase */}
                        {type === 'private_key' && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">
                                    {t('keys.label.passphrase', 'Passphrase')}
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showPassphrase ? "text" : "password"} 
                                        value={passphrase} 
                                        onChange={e => setPassphrase(e.target.value)} 
                                        placeholder={t('keys.placeholder.passphrase', 'Optional (if key is encrypted)')} 
                                        className="w-full px-3 py-2 pr-10 border rounded-lg dark:bg-slate-950 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                    <button type="button" onClick={() => setShowPassphrase(!showPassphrase)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                        {showPassphrase ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                    <button 
                        onClick={closeModal} 
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!name || !content || isLoading || isFetchingData || (type === 'private_key' && !isValidKey)} 
                        className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                        {t('common.save', 'Save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
