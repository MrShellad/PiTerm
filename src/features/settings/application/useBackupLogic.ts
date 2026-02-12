import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from "sonner";
import { ask, save, open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from "./useSettingsStore";
import { 
  WebDavFormValues, 
  CloudBackupFile, 
  BackupState,
  RestorePreview, 
} from "../domain/backup";

// ... (ExtendedBackupState 接口定义保持不变) ...
interface ExtendedBackupState extends BackupState {
    restorePreview: RestorePreview | null;
}

export const useBackupLogic = () => {
  const { t } = useTranslation();
  const settings = useSettingsStore(s => s.settings);
  const updateSettings = useSettingsStore(s => s.updateSettings);

  const [state, setState] = useState<ExtendedBackupState>({
    // ... (状态初始化保持不变) ...
    isTesting: false,
    isBackingUp: false,
    isLoadingList: false,
    isDeleting: false,
    isConfigured: !!settings['backup.webdavUrl'] && !!settings['backup.username'],
    historyOpen: false,
    confirmOpen: false,
    backupList: [],
    selectedBackup: null,
    isExporting: false,
    isImporting: false,
    progressValue: 0,
    progressText: '',
    isProgressVisible: false,
    restorePreview: null,
  });

  // ... (中间的辅助函数 updateState, form, useEffect 等保持不变) ...
  const updateState = (updates: Partial<ExtendedBackupState>) => 
    setState(prev => ({ ...prev, ...updates }));

  const form = useForm<WebDavFormValues>({
    defaultValues: {
      webdavUrl: settings['backup.webdavUrl'] || "",
      username: settings['backup.username'] || "",
      password: "" 
    },
    mode: 'onBlur'
  });

  useEffect(() => {
      form.setValue('webdavUrl', settings['backup.webdavUrl'] || '');
      form.setValue('username', settings['backup.username'] || '');
      updateState({ isConfigured: !!settings['backup.webdavUrl'] && !!settings['backup.username'] });
  }, [settings, form]);

  useEffect(() => {
    let unlisten: () => void;
    const setupListener = async () => {
      unlisten = await listen<{ message: string; progress: number }>('backup_progress', (event) => {
        // 🟢 [DEBUG] 监听进度
        console.log(">> [Debug] Progress Event:", event.payload);
        updateState({
          progressText: t(event.payload.message, event.payload.message),
          progressValue: event.payload.progress
        });
      });
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, [t]);

  // ... (fetchBackupList, handleDeleteBackup, handleSaveAndTest, handleManualBackup 保持不变) ...
  const fetchBackupList = useCallback(async () => {
    // ... 原有逻辑 ...
    const url = settings['backup.webdavUrl'];
    const username = settings['backup.username'];
    if (!url || !username) return;

    updateState({ isLoadingList: true });
    try {
      const list = await invoke<CloudBackupFile[]>('get_backup_list', { url, username, password: null });
      const sortedList = list.sort((a, b) => b.name.localeCompare(a.name));
      updateState({ backupList: sortedList });
    } catch (e) {
      console.error(e);
      toast.error(t('settings.backup.loadHistoryFailed', `Failed to load history: ${e}`));
    } finally {
      updateState({ isLoadingList: false });
    }
  }, [settings, t]);

  const handleDeleteBackup = async (filename: string) => {
    // ... 原有逻辑 ...
    updateState({ isDeleting: true });
    try {
      const url = settings['backup.webdavUrl'];
      const username = settings['backup.username'];
      await invoke('delete_cloud_backup', { url, username, password: null, filename });
      toast.success(t('common.deletedSuccess', "Deleted successfully"));
      await fetchBackupList(); 
    } catch (e) {
      toast.error(t('common.deleteFailed', `Delete failed: ${e}`));
    } finally {
      updateState({ isDeleting: false });
    }
  };

  const handleSaveAndTest = async () => {
    // ... 原有逻辑 ...
    updateState({ isTesting: true });
    try {
      const { webdavUrl, username, password } = form.getValues();
      if (!webdavUrl || !username) {
        toast.error(t('settings.backup.missing', 'Please fill URL and Username'));
        return;
      }
      if (password) {
        await invoke('save_webdav_password', { password });
        form.setValue('password', '');
        toast.success(t('settings.backup.saved', 'Credentials secured locally'));
      }
      await invoke('check_webdav', { url: webdavUrl, username, password: password || null });
      updateSettings({ 'backup.webdavUrl': webdavUrl, 'backup.username': username });
      toast.success(t('settings.backup.connected', 'Connection successful'));
    } catch (e) {
      console.error(e);
      toast.error(t('settings.backup.connectionFailed', `Connection failed: ${e}`));
    } finally {
      updateState({ isTesting: false });
    }
  };

  const handleManualBackup = async () => {
    // ... 原有逻辑 ...
    updateState({ 
      isBackingUp: true, 
      isProgressVisible: true, 
      progressValue: 0, 
      progressText: t('backup.progress.preparing', 'Preparing...') 
    });

    try {
      const url = settings['backup.webdavUrl'];
      const username = settings['backup.username'];
      if(!url || !username) throw new Error("WebDAV not configured");

      const deviceName = settings['general.deviceName'] || 'Unknown Device';
      const deviceId = settings['general.deviceId'] || 'unknown-id';

      await invoke('create_cloud_backup', { 
        url, username, password: null, deviceName, deviceId
      });
      
      toast.success(t('settings.backup.backupSuccess', "Backup uploaded successfully"));
      fetchBackupList();
    } catch (e) {
      toast.error(t('settings.backup.backupFailed', `Backup failed: ${e}`));
    } finally {
      setTimeout(() => {
        updateState({ isBackingUp: false, isProgressVisible: false });
      }, 800);
    }
  };


  // ==================================================================================
  // 🟢 [DEBUG核心] 阶段一：选中文件 -> 立即下载
  // ==================================================================================
  const selectRestore = async (file: CloudBackupFile | null) => {
      console.log("===> [DEBUG] selectRestore Start. File:", file);
      
      if (!file) {
          console.warn("===> [DEBUG] File is null, returning.");
          return;
      }

      updateState({ 
        historyOpen: false, 
        isProgressVisible: true, 
        progressValue: 0, 
        progressText: t('backup.progress.downloading', 'Downloading backup...') 
      });

      try {
        const url = settings['backup.webdavUrl'];
        const username = settings['backup.username'];
        
        const args = {
            url,
            username,
            password: null,
            filename: file.name
        };
        console.log("===> [DEBUG] Invoking 'prepare_cloud_restore' with args:", args);

        // 调用后端
        const preview = await invoke<RestorePreview>('prepare_cloud_restore', args);
        
        // 🚨 检查这里！如果 Rust 返回的是 snake_case (temp_file_path)，这里打印出来就能看到
        console.log("===> [DEBUG] 'prepare_cloud_restore' Success. Returned Preview:", preview); 

        // 检查关键字段是否存在
        if (!preview) {
             throw new Error("Backend returned null preview");
        }
        // 注意：这里我们故意不做解构，直接把 preview 存进去，防止解构失败
        console.log("===> [DEBUG] Storing preview into state...");

        setTimeout(() => {
            updateState({ 
                isProgressVisible: false,
                selectedBackup: file, 
                restorePreview: preview,
                confirmOpen: true 
            });
        }, 500);

      } catch (e) {
        console.error("===> [DEBUG] 'prepare_cloud_restore' Error:", e);
        toast.error(t('settings.backup.downloadFailed', `Download failed: ${e}`));
        updateState({ isProgressVisible: false });
      }
  };

  // ==================================================================================
  // 🟢 [DEBUG核心] 阶段二：确认 -> 解压
  // ==================================================================================
  const performRestore = async () => {
      console.log("===> [DEBUG] performRestore Start.");
      console.log("===> [DEBUG] Current State restorePreview:", state.restorePreview);

      if (!state.restorePreview) {
          console.error("===> [DEBUG] restorePreview is missing! Cannot proceed.");
          updateState({ confirmOpen: false });
          return;
      }

      // 尝试获取路径，处理可能的命名不一致
      // @ts-ignore
      const tempPath = state.restorePreview.tempFilePath || state.restorePreview.temp_file_path;
      console.log("===> [DEBUG] Extracted temp path:", tempPath);

      if (!tempPath) {
          console.error("===> [DEBUG] Temp path is undefined. Check variable naming (camelCase vs snake_case).");
          toast.error("Internal Error: Temp path missing");
          return;
      }

      updateState({ 
        confirmOpen: false, 
        isProgressVisible: true, 
        progressValue: 0, 
        progressText: t('backup.progress.extracting', 'Restoring data...') 
      });

      try {
          const args = { tempFilePath: tempPath }; // Tauri 自动转为 temp_file_path
          console.log("===> [DEBUG] Invoking 'apply_restore_file' with args:", args);

          await invoke('apply_restore_file', args);
          
          console.log("===> [DEBUG] 'apply_restore_file' Success.");
          toast.success(t('settings.backup.restoreSuccess', "Restore successful. Please restart app."));
      } catch(e) {
          console.error("===> [DEBUG] 'apply_restore_file' Error:", e);
          toast.error(t('settings.backup.restoreFailed', `Restore failed: ${e}`));
      } finally {
          setTimeout(() => {
             updateState({ 
               isProgressVisible: false, 
               restorePreview: null,
               selectedBackup: null
             });
          }, 800);
      }
  };

  // ... (handleLocalExport, handleLocalImport 和 return 部分保持不变) ...
  const handleLocalExport = async () => {
    // ... 原有逻辑 ...
    try {
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
      const filePath = await save({
        filters: [{ name: 'Backup Archive', extensions: ['zip'] }],
        defaultPath: `backup_${dateStr}.zip`
      });

      if (!filePath) return;

      updateState({ isExporting: true, isProgressVisible: true, progressValue: 0, progressText: t('backup.progress.preparing', 'Preparing...') });
      await invoke('export_local_backup', { targetPath: filePath });
      toast.success(t('settings.backup.exportSuccess', 'Backup exported successfully'));
    } catch (e) {
      toast.error(t('settings.backup.exportFailed', `Export failed: ${e}`));
    } finally {
      setTimeout(() => updateState({ isExporting: false, isProgressVisible: false }), 800);
    }
  };

  const handleLocalImport = async () => {
    // ... 原有逻辑 ...
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Backup Archive', extensions: ['zip'] }]
      });

      if (!selected) return;
      const filePath = typeof selected === 'string' ? selected : selected[0];

      const confirmed = await ask(
          t('settings.backup.warningDesc', 'This will overwrite current data. Continue?'), 
          { 
            title: t('settings.backup.warningTitle', 'Warning'), 
            kind: 'warning',
            okLabel: t('common.confirm', 'Overwrite'),
            cancelLabel: t('common.cancel', 'Cancel')
          }
      );
      if (!confirmed) return;

      updateState({ isImporting: true, isProgressVisible: true, progressValue: 0, progressText: t('backup.progress.preparing', 'Preparing...') });
      await invoke('import_local_backup', { filePath });
      toast.success(t('settings.backup.restoreSuccess', 'Restored successfully. Please restart.'));
    } catch (e) {
      toast.error(t('settings.backup.restoreFailed', `Restore failed: ${e}`));
    } finally {
      setTimeout(() => updateState({ isImporting: false, isProgressVisible: false }), 800);
    }
  };

  return {
    t,
    form,
    settings,
    state,
    actions: {
      handleSaveAndTest,
      handleManualBackup,
      handleDeleteBackup,
      handleLocalExport,
      handleLocalImport,
      openHistory: () => { updateState({ historyOpen: true }); fetchBackupList(); },
      closeHistory: () => updateState({ historyOpen: false }),
      selectRestore,
      closeConfirm: () => updateState({ confirmOpen: false, restorePreview: null }),
      performRestore,
      setInterval: (val: string) => updateSettings({ 'backup.interval': val }),
      toggleAutoBackup: (v: boolean) => updateSettings({ 'backup.autoBackup': v }),
    }
  };
};