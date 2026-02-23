import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '@/store/useFileStore';
import { useTransferStore } from '@/store/useTransferStore'; 
import { FileEntry, SortField } from '@/features/fs/types';
import { FileActionType } from '../components/FileContextMenu';
import { ModalType } from '../components/FsActionModals';
import { open, save } from '@tauri-apps/plugin-dialog';
// [新增] 引入编辑器配置检查
import { isEditable } from '../editor/config';
// [新增] 引入 Tauri 窗口 API
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const pathUtils = {
    join: (parent: string, name: string) => {
        if (parent === '/') return `/${name}`;
        if (parent.endsWith('/')) return `${parent}${name}`;
        return `${parent}/${name}`;
    },
    dirname: (path: string) => {
        const lastSlash = path.lastIndexOf('/');
        if (lastSlash === 0) return '/';
        return path.substring(0, lastSlash);
    }
};

export const useFileActions = (sessionId: string) => {
    const { t } = useTranslation();
    const { setPath, setSort, getSession, triggerReload, setClipboard } = useFileStore();
    const { addTask, updateStatus } = useTransferStore(); 
    
    const connectionId = sessionId;

    // UI State
    const [modalState, setModalState] = useState<{ 
        type: ModalType; 
        file?: FileEntry; 
        initialInput?: string 
    }>({ type: null });

    // [修改] 移除 editorState，因为我们改为打开新窗口，不需要在本地维护编辑器开关状态
    // const [editorState, setEditorState] = useState<{ ... }> ...

    const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sessionState = getSession(sessionId);
    const clipboard = sessionState.clipboard;
    const hasClipboard = !!clipboard && clipboard.files.length > 0;

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const refresh = useCallback(() => triggerReload(sessionId), [sessionId, triggerReload]);

    const handleSort = useCallback((field: SortField) => {
        setSort(sessionId, field);
    }, [sessionId, setSort]);

    // [新增] 打开独立编辑器窗口的核心逻辑
    const openEditorWindow = useCallback(async (file: FileEntry) => {
        try {
            // 1. 生成唯一窗口 Label (防止同个文件打开多次，且 label 必须符合 Tauri 命名规范)
            // 格式: edit-<sessionId>-<文件名(去除非法字符)>
            const safeName = file.name.replace(/[^a-zA-Z0-9-_]/g, '');
            const label = `edit-${sessionId}-${safeName}`;
            
            // 2. 检查窗口是否已存在
            const existing = await WebviewWindow.getByLabel(label);
            if (existing) {
                await existing.setFocus();
                return;
            }

            // 3. 构建 URL 参数
            const params = new URLSearchParams({
                sessionId: sessionId,
                path: file.path,
                name: file.name
            });

            // 4. 创建新窗口
            const webview = new WebviewWindow(label, {
                url: `/editor_window?${params.toString()}`, // 路由需要与 App.tsx 对应
                title: `Editing ${file.name}`,
                width: 900,
                height: 700,
                minWidth: 600,
                minHeight: 400,
                decorations: false, // 无边框，使用我们自定义的 Toolbar
                center: true,
                resizable: true,
            });

            webview.once('tauri://error', (e) => {
                console.error('Failed to open editor window:', e);
                showToast(t('fs.msg.openFailed', 'Failed to open window'), 'error');
            });

        } catch (error) {
            console.error("Window creation error:", error);
            showToast(t('fs.msg.openFailed', 'Failed to open window'), 'error');
        }
    }, [sessionId, t]);

    // [修改] 双击逻辑：调用 openEditorWindow
const handleDoubleClick = useCallback((file: FileEntry) => {
        if (file.isDir) {
            // 🟢 增加第三个参数 true，告诉 store 这是手动导航，请关闭跟随
            setPath(sessionId, file.path, true);
        } else {
            if (isEditable(file.name)) {
                openEditorWindow(file);
            } else {
                console.log('Open file preview:', file.name);
            }
        }
    }, [sessionId, setPath, openEditorWindow]);

    // ... handleUpload, handleDownload, handlePaste 保持不变 ...
    const handleUpload = useCallback(async () => {
        if (!connectionId) return; 
        const state = getSession(sessionId);
        const currentPath = state.currentPath;

        try {
            const selected = await open({
                multiple: false,
                title: t('fs.context.upload', 'Upload File')
            });

            if (!selected) return;

            const localPath = Array.isArray(selected) ? selected[0] : selected;
            if (!localPath) return;
            
            const fileName = localPath.split(/[\\/]/).pop();
            if (!fileName) return;

            const remotePath = pathUtils.join(currentPath, fileName);
            const transferId = Date.now().toString(); 
            addTask({
                id: transferId,
                type: 'upload',
                name: fileName,
                localPath: localPath,
                remotePath: remotePath,
                size: 0,
                status: 'running',
                progress: 0,
                startTime: Date.now()
            });

            setIsSubmitting(true);
            showToast(t('fs.msg.uploading', 'Uploading...'));

            await invoke('sftp_upload_file', {
                id: connectionId,
                localPath,
                remotePath
            });

            updateStatus(transferId, 'completed');
            showToast(t('fs.msg.uploadSuccess', 'Upload successful'));
            refresh(); 
        } catch (error: any) {
            console.error("Upload failed:", error);
            showToast(t('fs.msg.uploadFailed', 'Upload failed'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [sessionId, connectionId, getSession, refresh, t, addTask, updateStatus]);

    const handleDownload = useCallback(async (file: FileEntry) => {
        if (!connectionId) return;

        const transferId = Date.now().toString();

        try {
            if (file.isDir) {
                showToast(t('fs.error.folderDownload', 'Folder download not supported yet'), 'error');
                return;
            }

            const localPath = await save({
                defaultPath: file.name,
                title: t('fs.context.download', 'Save file as')
            });

            if (!localPath) return; 

            addTask({
                id: transferId,
                type: 'download',
                name: file.name,
                localPath: localPath,
                remotePath: file.path,
                size: file.size,
                status: 'running',
                progress: 0,
                startTime: Date.now()
            });

            setIsSubmitting(true);
            showToast(t('fs.msg.downloading', 'Downloading...'));

            await invoke('sftp_download_file', {
                id: connectionId,
                remotePath: file.path,
                localPath
            });

            updateStatus(transferId, 'completed');
            showToast(t('fs.msg.downloadSuccess', 'Download successful'));
        } catch (error: any) {
            console.error("Download failed:", error);
            updateStatus(transferId, 'error', error.toString());
            showToast(t('fs.msg.downloadFailed', 'Download failed'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [sessionId, connectionId, t, addTask, updateStatus]);

    const handlePaste = useCallback(async () => {
        if (!connectionId) return;

        const state = getSession(sessionId);
        const clipboard = state.clipboard;
        if (!clipboard || !clipboard.files.length) return;

        setIsSubmitting(true);
        const currentPath = state.currentPath;
        const targetFiles = state.files;

        let successCount = 0;

        try {
            for (const file of clipboard.files) {
                let targetName = file.name;
                const isSameDir = clipboard.sourcePath === currentPath;
                let collision = targetFiles.find(f => f.name === targetName);

                if (collision) {
                    if (clipboard.type === 'move' && isSameDir) continue; 
                    const dotIndex = targetName.lastIndexOf('.');
                    if (dotIndex > 0) {
                        targetName = `${targetName.substring(0, dotIndex)}_copy${targetName.substring(dotIndex)}`;
                    } else {
                        targetName = `${targetName}_copy`;
                    }
                }

                const fromPath = file.path;
                const toPath = pathUtils.join(currentPath, targetName);

                if (clipboard.type === 'copy') {
                    if (file.isDir) {
                        showToast(t('fs.error.folderCopy', 'Folder copy not supported yet'), 'error');
                        continue;
                    }
                    await invoke('sftp_copy', { id: connectionId, fromPath, toPath });
                } else {
                    await invoke('sftp_rename', { id: connectionId, oldPath: fromPath, newPath: toPath });
                }
                successCount++;
            }

            if (successCount > 0) {
                showToast(t('fs.msg.pasteSuccess', `Pasted ${successCount} items`));
                refresh();
                if (clipboard.type === 'move') {
                    setClipboard(sessionId, null);
                }
            }
        } catch (err: any) {
            console.error("Paste error:", err);
            showToast(err.toString(), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [sessionId, connectionId, getSession, refresh, t, setClipboard]);

    // 菜单动作分发
    const executeAction = useCallback(async (action: FileActionType, file?: FileEntry) => {
        const state = getSession(sessionId);
        
        switch (action) {
            case 'refresh': refresh(); break;
            case 'newFolder': setModalState({ type: 'newFolder' }); break;
            case 'newFile': setModalState({ type: 'newFile' }); break;
            
            // [修改] 处理右键打开编辑器 -> 调用 openEditorWindow
            case 'openBuiltin': 
                if (file) {
                    if (isEditable(file.name)) {
                        openEditorWindow(file);
                    } else {
                        showToast(t('fs.msg.notSupported', 'File type not supported by built-in editor'), 'error');
                    }
                }
                break;

            case 'rename': 
                if (file) {
                    setModalState({ 
                        type: 'rename', 
                        file, 
                        initialInput: file.name 
                    }); 
                }
                break;
            
            case 'chmod':
                if (file) {
                    setModalState({ 
                        type: 'chmod', 
                        file, 
                        initialInput: file.permissions 
                    });
                }
                break;

            case 'delete': if (file) setModalState({ type: 'delete', file }); break;
            
            case 'openTerminal': {
                const targetPath = file && file.isDir ? file.path : state.currentPath;
                if (connectionId) {
                    invoke('write_ssh', { id: connectionId, data: `cd "${targetPath}"\r` })
                        .then(() => showToast(t('fs.msg.termPathUpdated', 'Terminal path updated')))
                        .catch(e => console.error(e));
                }
                break;
            }
            case 'copyPath':
                const path = file ? file.path : state.currentPath;
                navigator.clipboard.writeText(path)
                    .then(() => showToast(t('fs.msg.pathCopied', 'Path copied')))
                    .catch(() => showToast(t('fs.msg.copyFailed', 'Failed to copy'), 'error'));
                break;

            case 'copy':
                if (file) {
                    setClipboard(sessionId, { type: 'copy', files: [file], sourcePath: state.currentPath });
                    showToast(t('fs.msg.copied', 'Copied to clipboard'));
                }
                break;
            case 'cut':
                if (file) {
                    setClipboard(sessionId, { type: 'move', files: [file], sourcePath: state.currentPath });
                    showToast(t('fs.msg.cut', 'Cut to clipboard'));
                }
                break;
            case 'paste':
                handlePaste();
                break;

            case 'upload':
                handleUpload();
                break;
            case 'download':
                if (file) handleDownload(file);
                break;
                
            default: break;
        }
    }, [sessionId, connectionId, getSession, refresh, t, setClipboard, handlePaste, handleUpload, handleDownload, openEditorWindow]);

    // 弹窗确认逻辑
    const handleModalConfirm = useCallback(async (rawInput?: string, options?: { recursive: boolean }) => {
        if (isSubmitting || !connectionId) return;

        const { type, file } = modalState;
        const state = getSession(sessionId);
        const currentPath = state.currentPath;
        const inputValue = rawInput?.trim();

        setIsSubmitting(true);

        try {
            if (type === 'newFolder' && inputValue) {
                const fullPath = pathUtils.join(currentPath, inputValue);
                await invoke('sftp_mkdir', { id: connectionId, path: fullPath });
                showToast(t('fs.msg.createSuccess', 'Folder created successfully'));
            } 
            else if (type === 'newFile' && inputValue) {
                const fullPath = pathUtils.join(currentPath, inputValue);
                await invoke('sftp_create_file', { id: connectionId, path: fullPath });
                showToast(t('fs.msg.createSuccess', 'File created successfully'));
            } 
            else if (type === 'rename' && file && inputValue) {
                if (inputValue === file.name) {
                    setIsSubmitting(false);
                    setModalState({ type: null });
                    return;
                }
                const parentDir = pathUtils.dirname(file.path);
                const newPath = pathUtils.join(parentDir, inputValue);
                await invoke('sftp_rename', { id: connectionId, oldPath: file.path, newPath });
                showToast(t('fs.msg.renameSuccess', 'Renamed successfully'));
            } 
            else if (type === 'chmod' && file && inputValue) {
                await invoke('sftp_chmod', { 
                    id: connectionId, 
                    path: file.path, 
                    mode: inputValue,
                    recursive: options?.recursive || false 
                });
                showToast(t('fs.msg.chmodSuccess', 'Permissions updated'));
            }
            else if (type === 'delete' && file) {
                await invoke('sftp_delete', { id: connectionId, path: file.path, isDir: file.isDir });
                showToast(t('fs.msg.deleteSuccess', 'Deleted successfully'));
            }

            refresh();
            setModalState({ type: null });

        } catch (error: any) {
            console.error("FS Action Error:", error);
            showToast(error.toString(), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [sessionId, connectionId, modalState, getSession, refresh, t, isSubmitting]);

    return {
        handleSort,
        handleDoubleClick,
        executeAction,
        modalState,
        closeModal: () => setModalState({ type: null }),
        handleModalConfirm,
        toastMessage,
        isSubmitting,
        hasClipboard, 
        clipboardType: clipboard?.type,
        handleUpload,
        handleDownload,
        
        // [修改] 不再导出 editorState 和 closeEditor，因为现在是独立窗口模式
        // 如果你需要手动调用打开窗口，可以导出 openEditorWindow，但通常 executeAction 足够了
    };
};