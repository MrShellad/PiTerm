import { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window'; // [新增] 用于控制窗口
import { X, Save, Loader2, FileCode, Maximize2, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { FileEntry } from '@/features/fs/types';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getLanguage } from './config';
import { cn } from '@/lib/utils';

// [修改] 定义 Props
interface FileEditorProps {
    sessionId: string;
    file: FileEntry;
    // 不再需要 isOpen/onClose (由窗口生命周期管理)
    onRefresh?: () => void; // 独立窗口可能不需要回调刷新列表，或者通过事件通知
    isStandalone?: boolean; // [新增] 是否为独立窗口模式
}

export const FileEditor = ({ sessionId, file, isStandalone = false, onRefresh }: FileEditorProps) => {
    const { t } = useTranslation();
    const appWindow = getCurrentWindow(); // 获取当前窗口实例

    const [content, setContent] = useState<string>("");
    const [originalContent, setOriginalContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // 初始化读取
    useEffect(() => {
        if (file) {
            setIsLoading(true);
            invoke<string>('sftp_read_file', { id: sessionId, path: file.path })
                .then((text) => {
                    setContent(text);
                    setOriginalContent(text);
                    setIsDirty(false);
                })
                .catch((err) => {
                    console.error(err);
                    toast.error(t('editor.error.read', 'Failed to read file content'));
                })
                .finally(() => setIsLoading(false));
        }
    }, [file, sessionId, t]);

    // 窗口关闭拦截 (仅在 Standalone 模式下生效)
    useEffect(() => {
        if (!isStandalone) return;

        // 监听 Tauri 窗口关闭请求
        const unlisten = appWindow.onCloseRequested(async (event) => {
            if (isDirty) {
                event.preventDefault(); // 阻止直接关闭
                setShowCloseConfirm(true); // 显示 React 弹窗
            }
        });

        return () => {
            unlisten.then(f => f());
        };
    }, [isStandalone, isDirty]);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await invoke('sftp_write_file', { id: sessionId, path: file.path, content });
            setOriginalContent(content);
            setIsDirty(false);
            toast.success(t('editor.msg.saved', 'File saved'));
            if (onRefresh) onRefresh();
        } catch (err: any) {
            console.error(err);
            toast.error(t('editor.error.save', 'Failed to save: ') + err.toString());
        } finally {
            setIsSaving(false);
        }
    };

    // 窗口控制函数
    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = () => appWindow.toggleMaximize();
    const handleClose = () => appWindow.close(); // 这会触发上面的 onCloseRequested

    // 确认丢弃更改并关闭
    const handleForceClose = async () => {
        setShowCloseConfirm(false);
        // 临时禁用拦截逻辑以便关闭
        // 或者更简单：直接 destroy (不推荐)，或者重置 dirty 状态再 close
        setIsDirty(false); 
        setTimeout(() => appWindow.close(), 100);
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
            {/* Toolbar (作为自定义标题栏) */}
            <div 
                data-tauri-drag-region // [关键] 允许按住此区域拖动整个窗口
                className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50 select-none shrink-0"
            >
                <div className="flex items-center gap-3 pointer-events-none">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                        <FileCode className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground max-w-[300px] truncate leading-none">
                                {file.name}
                            </span>
                            {isDirty && (
                                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Unsaved" />
                            )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[400px] leading-none mt-1">
                            {file.path}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all mr-2",
                            isDirty 
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                                : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {t('common.save', 'Save')}
                    </button>

                    {/* Window Controls */}
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
                    
                    <button onClick={handleMinimize} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                        <Minus className="w-4 h-4" />
                    </button>
                    <button onClick={handleMaximize} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                    <button onClick={handleClose} className="p-1.5 hover:bg-red-500 hover:text-white rounded transition-colors text-slate-500">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative overflow-hidden">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <span className="text-sm text-slate-500">{t('editor.loading', 'Loading...')}</span>
                        </div>
                    </div>
                ) : (
                    <Editor
                        height="100%"
                        defaultLanguage={getLanguage(file.name)}
                        value={content}
                        theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'}
                        onChange={(val) => {
                            const v = val || "";
                            setContent(v);
                            setIsDirty(v !== originalContent);
                        }}
                        options={{
                            minimap: { enabled: true },
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', Consolas, monospace",
                            wordWrap: 'on',
                            automaticLayout: true,
                            padding: { top: 10, bottom: 10 }
                        }}
                    />
                )}
            </div>

            {/* Exit Confirmation */}
            <ConfirmDialog
                open={showCloseConfirm}
                onOpenChange={setShowCloseConfirm}
                title={t('editor.unsaved.title', 'Unsaved Changes')}
                description={t('editor.unsaved.desc', 'You have unsaved changes. Closing this window will discard them.')}
                confirmText={t('editor.unsaved.discard', 'Discard & Close')}
                cancelText={t('common.cancel', 'Keep Editing')}
                variant="destructive"
                onConfirm={handleForceClose}
            />
        </div>
    );
};