import { CloudUpload, History, RotateCcw, Download, Upload, HardDrive } from "lucide-react";
import { CustomButton } from "@/components/common/CustomButton";
import { TFunction } from "i18next"; 

interface Props {
  t: TFunction;
  isBackingUp: boolean;
  isExporting?: boolean;
  isImporting?: boolean;
  onManualBackup: () => void;
  onOpenHistory: () => void;
  onRestoreLatest: () => void;
  onExportLocal: () => void;
  onImportLocal: () => void;
}

export const CloudActionsCard = ({ 
  t, 
  isBackingUp, 
  isExporting = false,
  isImporting = false,
  onManualBackup, 
  onOpenHistory, 
  onRestoreLatest,
  onExportLocal,
  onImportLocal
}: Props) => {
  return (
    // 🟢 [修改 1] 改为 Grid 布局，中等屏幕以上并排显示 (md:grid-cols-2)
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        
        {/* --- 1. Cloud Section (Left) --- */}
        <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50 overflow-hidden shadow-sm h-full">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
                <h3 className="text-base font-medium flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <CloudUpload className="w-5 h-5 text-blue-500" />
                {t('settings.backup.cloudTitle', 'Cloud Sync')}
                </h3>
            </div>

            {/* 使用 flex-1 flex flex-col justify-between 确保内容撑开高度 */}
            <div className="p-5 flex-1 flex flex-col gap-4">
                <CustomButton 
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md border-0 py-6 flex-1"
                    onClick={onManualBackup}
                    isLoading={isBackingUp}
                    icon={CloudUpload}
                >
                    <span className="font-semibold text-base">{t('settings.backup.backupNow', 'Backup to Cloud Now')}</span>
                </CustomButton>

                <div className="grid grid-cols-2 gap-3">
                    <CustomButton 
                        variant="outline" 
                        className="h-auto py-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors gap-2"
                        onClick={onOpenHistory}
                    >
                        <History className="w-5 h-5 text-amber-500" />
                        <span className="text-base font-medium">{t('settings.backup.history', 'History')}</span>
                    </CustomButton>
                    
                    <CustomButton 
                        variant="outline" 
                        className="h-auto py-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors gap-2"
                        onClick={onRestoreLatest}
                    >
                        <RotateCcw className="w-5 h-5 text-emerald-500" />
                        <span className="text-base font-medium">{t('settings.backup.restoreLatest', 'Latest')}</span>
                    </CustomButton>
                </div>
            </div>
        </div>

        {/* --- 2. Local Section (Right) --- */}
        <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50 overflow-hidden shadow-sm h-full">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
                <h3 className="text-base font-medium flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <HardDrive className="w-5 h-5 text-slate-500" />
                    {t('settings.backup.localTitle', 'Local Backup')}
                </h3>
            </div>
            
            {/* 🟢 [修改 2] 本地备份按钮改为垂直排列，使其填满高度，与左侧视觉平衡 */}
            <div className="p-5 flex-1 flex flex-col gap-3">
                <CustomButton 
                    variant="outline" 
                    className="flex-1 h-auto py-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors justify-start px-4"
                    onClick={onExportLocal}
                    isLoading={isExporting}
                >
                    <Download className="w-5 h-5 text-slate-600 dark:text-slate-400 mr-3 shrink-0" />
                    <div className="flex flex-col items-start leading-normal">
                        <span className="text-base font-semibold text-slate-700 dark:text-slate-200">{t('common.export', 'Export Backup')}</span>
                        <span className="text-base text-slate-400/80 dark:text-slate-500 font-normal">{t('settings.backup.savefile', 'Save as .zip file')}</span>
                    </div>
                </CustomButton>

                <CustomButton 
                    variant="outline" 
                    className="flex-1 h-auto py-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors justify-start px-4"
                    onClick={onImportLocal}
                    isLoading={isImporting}
                >
                    <Upload className="w-5 h-5 text-slate-600 dark:text-slate-400 mr-3 shrink-0" />
                    <div className="flex flex-col items-start leading-normal">
                        <span className="text-base font-semibold text-slate-700 dark:text-slate-200">{t('common.import', 'Import Backup')}</span>
                        <span className="text-base text-slate-400/80 dark:text-slate-500 font-normal">{t('settings.backup.restorefile', 'Restore from .zip file')}</span>
                    </div>
                </CustomButton>
            </div>
        </div>
    </div>
  );
};