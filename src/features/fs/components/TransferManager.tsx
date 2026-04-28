import { useEffect, useState } from 'react';
import { useTransferStore, TransferTask } from '@/store/useTransferStore';
import { listen } from '@tauri-apps/api/event';
import { 
  X, Upload, Download, CheckCircle2, AlertCircle, 
  Loader2, Trash2, FolderOpen, AlertTriangle, Ban 
} from 'lucide-react'; // [新增] 引入 Ban 图标用于取消
import { formatBytes } from '@/utils/format';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface SftpTransferProgressPayload {
    transferId: string;
    transferred: number;
    total: number;
    progress: number;
    speed: number;
}

export const TransferManager = () => {
    const { t } = useTranslation();
    // [新增] 从 store 中解构 cancelTask
    const { isOpen, tasks, toggleOpen, clearCompleted, removeTask, cancelTask, updateProgress } = useTransferStore();

    // 删除确认弹窗的状态
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [deleteFileChecked, setDeleteFileChecked] = useState(false);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        let disposed = false;

        listen<SftpTransferProgressPayload>('sftp_transfer_progress', (event) => {
            const { transferId, transferred, total, progress, speed } = event.payload;
            updateProgress(transferId, progress, transferred, speed, total);
        }).then((fn) => {
            if (disposed) {
                fn();
            } else {
                unlisten = fn;
            }
        }).catch(console.error);

        return () => {
            disposed = true;
            unlisten?.();
        };
    }, [updateProgress]);

    if (!isOpen) return null;

    const safeTasks = tasks || [];
    const runningCount = safeTasks.filter(t => t.status === 'running').length;

    // 处理删除逻辑
    const handleConfirmDelete = () => {
        if (deleteConfirm) {
            // @ts-ignore 
            removeTask(deleteConfirm.id, deleteFileChecked);
            setDeleteConfirm(null);
            setDeleteFileChecked(false);
        }
    };

    // 处理取消逻辑
    const handleCancel = (id: string) => {
        // 调用 store 的取消方法
        if (cancelTask) {
            cancelTask(id);
        }
    };

    // 模拟打开文件位置
    const handleOpenLocation = (task: TransferTask) => {
        console.log('Open location for:', task.localPath);
        // window.electron.showItemInFolder(task.localPath);
    };

    return (
        <>
            <div className="absolute bottom-4 right-4 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col z-[100] animate-in slide-in-from-bottom-5 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                            {t('fs.transfer.title', 'Transfers')}
                        </span>
                        {runningCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full">
                                {runningCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {safeTasks.length > 0 && (
                            <button 
                                onClick={clearCompleted}
                                title={t('fs.transfer.clear', 'Clear Completed')}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button 
                            onClick={toggleOpen}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar min-h-[100px] max-h-[350px]">
                    {safeTasks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
                            <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                            <p>{t('fs.transfer.empty', 'No transfers')}</p>
                        </div>
                    ) : (
                        safeTasks.map((task) => (
                            <TransferItem 
                                key={task.id} 
                                task={task} 
                                t={t}
                                onDeleteRequest={() => setDeleteConfirm({ id: task.id, name: task.name })}
                                onCancelRequest={() => handleCancel(task.id)}
                                onOpenLocation={() => handleOpenLocation(task)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl w-64 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                        {t('fs.transfer.delete_title', 'Delete Record?')}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                        {deleteConfirm.name}
                                    </p>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 p-2 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                    checked={deleteFileChecked}
                                    onChange={(e) => setDeleteFileChecked(e.target.checked)}
                                />
                                <span className="text-xs text-slate-600 dark:text-slate-300 select-none">
                                    {t('fs.transfer.delete_file_checkbox', 'Also delete local file')}
                                </span>
                            </label>

                            <div className="flex gap-2 justify-end mt-1">
                                <button 
                                    onClick={() => { setDeleteConfirm(null); setDeleteFileChecked(false); }}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button 
                                    onClick={handleConfirmDelete}
                                    className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                                >
                                    {t('common.confirm', 'Confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const TransferItem = ({ 
    task, 
    t, 
    onDeleteRequest, 
    onCancelRequest,
    onOpenLocation 
}: { 
    task: TransferTask; 
    t: any;
    onDeleteRequest: () => void;
    onCancelRequest: () => void;
    onOpenLocation: () => void;
}) => {
    const isUpload = task.type === 'upload';
    const isRunning = task.status === 'running';
    const progress = Math.max(0, Math.min(100, task.progress || 0));
    const totalSize = task.size || 0;
    const transferred = task.transferred || 0;
    const transferAmount = totalSize > 0
        ? `${formatBytes(transferred)} / ${formatBytes(totalSize)}`
        : formatBytes(transferred);
    const speedText = isRunning ? `${formatBytes(task.speed || 0)}/s` : '';
    
    // @ts-ignore
    const dateStr = new Date(task.startTime).toLocaleString();
    
    return (
        <div className="relative p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center gap-3 group overflow-hidden">
            
            {/* Hover Actions Overlay */}
            <div className="absolute inset-0 bg-slate-100/90 dark:bg-slate-800/95 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
                
                {/* 1. 打开文件位置按钮：非运行中 且 非上传 时显示 */}
                {!isUpload && !isRunning && (
                    <button 
                        onClick={onOpenLocation}
                        title={t('fs.transfer.open_folder', 'Open Folder')}
                        className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:border-blue-200 transition-all scale-90 hover:scale-100"
                    >
                        <FolderOpen className="w-4 h-4" />
                    </button>
                )}

                {/* 2. 取消/删除按钮：运行中显示取消，否则显示删除 */}
                {isRunning ? (
                    <button 
                        onClick={onCancelRequest}
                        title={t('fs.transfer.cancel', 'Cancel Transfer')}
                        className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm text-slate-600 dark:text-slate-300 hover:text-orange-500 hover:border-orange-200 transition-all scale-90 hover:scale-100"
                    >
                        <Ban className="w-4 h-4" />
                    </button>
                ) : (
                    <button 
                        onClick={onDeleteRequest}
                        title={t('fs.transfer.delete_record', 'Delete Record')}
                        className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm text-slate-600 dark:text-slate-300 hover:text-red-500 hover:border-red-200 transition-all scale-90 hover:scale-100"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Icon */}
            <div className={clsx(
                "p-2 rounded-full shrink-0",
                isUpload ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                         : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            )}>
                {isUpload ? <Upload className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate pr-2" title={task.name}>
                        {task.name}
                    </span>
                    <StatusIcon status={task.status} />
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[120px]">
                        {isUpload 
                            ? `${t('fs.transfer.to', 'To')}: ${task.remotePath}` 
                            : `${t('fs.transfer.to', 'To')}: ${task.localPath}`
                        }
                    </span>
                    {totalSize > 0 && <span>{formatBytes(totalSize)}</span>}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{transferAmount}</span>
                    <span>
                        {isRunning ? `${Math.round(progress)}% · ${speedText}` : dateStr}
                    </span>
                </div>

                {/* Progress Bar */}
                {task.status !== 'error' && (
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                        <div 
                            className={clsx(
                                "h-full rounded-full transition-all duration-300",
                                task.status === 'completed' ? "bg-green-500" : "bg-blue-500"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
                {task.status === 'error' && (
                    <div className="text-[10px] text-red-500 mt-1 truncate" title={task.error}>
                        {task.error}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusIcon = ({ status }: { status: TransferTask['status'] }) => {
    if (status === 'running') return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
    if (status === 'completed') return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    return <AlertCircle className="w-3 h-3 text-red-500" />;
};
