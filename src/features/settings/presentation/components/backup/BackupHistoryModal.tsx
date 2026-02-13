import { useState } from "react";
import { History, Loader2, Cloud, FileJson, CloudDownload, Trash2, Laptop, Calendar } from "lucide-react";
import { BaseModal } from "@/components/common/BaseModal";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/common/CustomButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CloudBackupFile } from "../../../domain/backup";
import { TFunction } from "i18next"; 

interface Props {
  t: TFunction;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  isDeleting: boolean;
  isConfigured: boolean;
  backupList: CloudBackupFile[];
  onRestore: (file: CloudBackupFile) => void;
  onDelete: (filename: string) => void;
}

export const BackupHistoryModal = ({
  t, isOpen, onClose, isLoading, isDeleting, isConfigured, backupList, onRestore, onDelete
}: Props) => {

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 🟢 [新增] 日期格式化函数
  const formatDate = (dateStr: string) => {
      try {
          const date = new Date(dateStr);
          // 如果解析失败，返回原字符串
          if (isNaN(date.getTime())) return dateStr;
          
          // 转换为本地字符串 (e.g., "2024/2/6 14:30:00")
          return date.toLocaleString(undefined, {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              // second: 'numeric', // 可选：如果不需要秒可以去掉
          });
      } catch (e) {
          return dateStr;
      }
  };

  const getDeviceInfo = (filename: string) => {
     if (!filename.startsWith('backup_')) return null;
     const withoutExt = filename.replace(/\.json$/i, '').replace(/\.zip$/i, '');
     const parts = withoutExt.split('_');
     if (parts.length < 3) return null;
     return parts.slice(1, parts.length - 1).join('_');
  };

  const handleDeleteClick = (filename: string) => {
      setDeleteId(filename);
  };

  const handleConfirmDelete = () => {
      if (deleteId) {
          onDelete(deleteId);
          setDeleteId(null);
      }
  };

  return (
    <>
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('settings.backup.historyTitle', 'Cloud Backup History')}
            icon={<History className="w-5 h-5 text-amber-500" />}
            className="max-w-md h-[550px] z-[45]"
            // 确保层级低于 ConfirmDialog
            footer={
                <Button variant="outline" size="sm" onClick={onClose}>
                    {t('common.close', 'Close')}
                </Button>
            }
        >
        <div className="space-y-2 pr-1 min-h-[200px] relative">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 z-10 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-xs text-slate-500 mt-2">
                        {t('settings.backup.fetching', 'Fetching list...')}
                    </span>
                </div>
            )}

            {!isLoading && backupList.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs">
                    <Cloud className="w-8 h-8 mb-2 opacity-20" />
                    {isConfigured 
                        ? t('settings.backup.noBackups', 'No backups found.') 
                        : t('settings.backup.configureFirst', 'Please configure WebDAV first.')
                    }
                </div>
            )}

            {backupList.map((file) => {
                const deviceName = getDeviceInfo(file.name);

                return (
                <div 
                    key={file.name} 
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group select-none"
                >
                    <div 
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => onRestore(file)}
                    >
                        {/* 🟢 [优化] 左侧图标容器 
                           1. 使用 flex items-center justify-center 确保图标在圆圈内绝对居中
                           2. 使用固定宽高 h-8 w-8 代替 p-2，尺寸更稳定
                           3. mt-1 保持顶部对齐，适合多行文本
                        */}
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 self-start mt-1 ${deviceName ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                            {deviceName ? <Laptop className="w-4 h-4" /> : <FileJson className="w-4 h-4" />}
                        </div>
                        
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                            {/* 第一行：日期时间 (已本地化) */}
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    {/* 🟢 调用格式化函数 */}
                                    {formatDate(file.date)}
                                </span>
                            </div>

                            {/* 第二行：设备来源 (如果有) */}
                            <div className="min-h-[20px] flex items-center">
                                {deviceName ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 max-w-full truncate" title={deviceName}>
                                        <Laptop className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{deviceName}</span>
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400 italic">
                                        {t('settings.backup.unknownDevice', 'Unknown Device')}
                                    </span>
                                )}
                            </div>
                            
                            {/* 第三行：文件名 + 大小 */}
                            <p className="text-[10px] text-slate-400 truncate font-mono opacity-80 pt-0.5" title={file.name}>
                                {file.name} • {file.size}
                            </p>
                        </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 self-center">
                        <CustomButton 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            title={t('settings.backup.restore', 'Restore')}
                            icon={CloudDownload}
                            onClick={() => onRestore(file)}
                        />
                        
                        <CustomButton 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t('common.delete', 'Delete')}
                            isLoading={isDeleting && deleteId === file.name}
                            icon={Trash2}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(file.name);
                            }}
                        />
                    </div>
                </div>
                );
            })}
        </div>
        </BaseModal>

        <ConfirmDialog
            open={!!deleteId}
            onOpenChange={(open) => !open && setDeleteId(null)}
            title={t('common.deleteConfirm', 'Delete Backup?')}
            description={t('settings.backup.deleteDesc', 'This action cannot be undone. Are you sure you want to delete this backup file?')}
            confirmText={t('common.delete', 'Delete')}
            cancelText={t('common.cancel', 'Cancel')}
            variant="destructive"
            onConfirm={handleConfirmDelete}
        />
    </>
  );
};