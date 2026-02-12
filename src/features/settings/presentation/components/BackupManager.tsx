import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useBackupLogic } from "../../application/useBackupLogic"; 

// Sub Components
import { WebDavConfigCard } from "./backup/WebDavConfigCard";
import { CloudActionsCard } from "./backup/CloudActionsCard";
import { BackupHistoryModal } from "./backup/BackupHistoryModal";

export const BackupManager = () => {
  const { t, form, settings, state, actions } = useBackupLogic();

  // 🟢 [新增] 动态生成确认框的提示信息
  // 此时文件已经下载好了，我们可以读取 state.restorePreview.metadata 来做更精准的提示
  const getRestoreWarningMessage = () => {
      const meta = state.restorePreview?.metadata;
      const currentDevice = settings['general.deviceName'];


      // 如果有元数据，且设备名不一致，发出警告
      if (meta && meta.deviceName && meta.deviceName !== currentDevice) {
          return t('settings.backup.diffDeviceWarning', 
            `⚠️ Alert: This backup is from a different device: "${meta.deviceName}" (${meta.platform}).\n\nRestoring it will overwrite all configurations on your current device "${currentDevice || 'Local'}".\n\nAre you sure you want to proceed?`,
            { sourceDevice: meta.deviceName, currentDevice: currentDevice }
          );
      }

      // 默认警告
      return t('settings.backup.warningDesc', 
        'This action will completely overwrite your current local settings, servers, and keys. Unsaved changes will be lost. Are you sure you want to restore?'
      );
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-10 relative">
      
      {/* 🟢 进度条遮罩层 */}
      {state.isProgressVisible && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-[2px] rounded-xl transition-all">
          <div className="w-80 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 space-y-4 text-center animate-in zoom-in-95 duration-200">
             <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {state.progressText}
             </div>
             
             <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                   className="h-full bg-blue-500 transition-all duration-300 ease-out"
                   style={{ width: `${state.progressValue}%` }}
                />
             </div>
             
             <div className="text-xs text-slate-500 font-mono font-medium">
                {Math.round(state.progressValue)}%
             </div>
          </div>
        </div>
      )}

      {/* 1. WebDAV Settings */}
      <div className="w-full">
        <WebDavConfigCard 
          t={t}
          form={form}
          settings={settings}
          isConfigured={state.isConfigured}
          isTesting={state.isTesting}
          onSave={actions.handleSaveAndTest}
          onToggleAuto={actions.toggleAutoBackup}
          onIntervalChange={actions.setInterval}
        />
      </div>

      {/* 2. Actions Row */}
      <div className="w-full">
        <CloudActionsCard 
          t={t}
          isBackingUp={state.isBackingUp}
          isExporting={state.isExporting}
          isImporting={state.isImporting}
          onManualBackup={actions.handleManualBackup}
          onOpenHistory={actions.openHistory}
          // 这里的 SelectRestore 传 null 代表恢复最新，需要后端支持 get_latest 或者前端先 fetchList 再取第一个
          // 目前简单处理：先打开 History
          onRestoreLatest={actions.openHistory} 
          onExportLocal={actions.handleLocalExport}
          onImportLocal={actions.handleLocalImport}
        />
      </div>

      {/* Modals */}
      <BackupHistoryModal 
        t={t}
        isOpen={state.historyOpen}
        onClose={actions.closeHistory}
        isLoading={state.isLoadingList}
        isDeleting={state.isDeleting}
        isConfigured={state.isConfigured}
        backupList={state.backupList}
        onRestore={actions.selectRestore}
        onDelete={actions.handleDeleteBackup}
      />

      <ConfirmDialog
        open={state.confirmOpen}
        onOpenChange={(open) => !open && actions.closeConfirm()}
        title={t('settings.backup.warningTitle', 'Confirm Restore')}
        // 🟢 使用动态提示文案
        description={getRestoreWarningMessage()}
        variant="destructive"
        confirmText={t('settings.backup.confirm', 'Overwrite & Restore')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={actions.performRestore}
      />
    </div>
  );
};