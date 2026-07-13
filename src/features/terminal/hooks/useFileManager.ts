import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileStore } from "@/store/useFileStore";
import { FileEntry } from "@/features/fs/types";
import { useTerminalStore } from "@/store/useTerminalStore";
import { useEventBus } from "@/hooks/useEventBus";

export const useFileManager = (sessionId?: string) => {
  const { 
    getSession, 
    initSession, 
    setFiles, 
    setLoading: setStoreLoading,
    setPath 
  } = useFileStore();

  const connectionId = sessionId;

  const isValidSession = useTerminalStore(state => 
     sessionId ? !!state.sessions[sessionId] : false
  );
  const terminalSessionStatus = useTerminalStore(state =>
    sessionId ? state.sessions[sessionId]?.status : undefined
  );
  const backgroundStatus = useTerminalStore(state =>
    sessionId ? state.sessions[sessionId]?.backgroundStatus : undefined
  );

  const isConnectionReady =
    (terminalSessionStatus === "connected" || terminalSessionStatus === "background")
    && backgroundStatus === "ready";

  const sessionState = sessionId ? getSession(sessionId) : null;
  const currentPath = sessionState?.currentPath || '/';
  const hasFiles = sessionState?.files && sessionState.files.length > 0;
  const isLoading = sessionState?.isLoading || false;
  const reloadTrigger = sessionState?.reloadTrigger || 0;

  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const getErrorMessage = (err: unknown) => String(err);
  const isExpectedFileManagerError = (message: string) => {
    const normalizedMessage = message.toLowerCase();
    return normalizedMessage.includes("ssh connection not active")
      || normalizedMessage.includes("ssh background session not ready")
      || normalizedMessage.includes("ssh background session unavailable")
      || normalizedMessage.includes("sftp not enabled")
      || normalizedMessage.includes("channel request failed")
      || normalizedMessage.includes("unable to startup channel");
  };

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (sessionId) {
      initSession(sessionId);
    }
  }, [sessionId, initSession]);

  // =================================================================
  // 🟢 [关键修复] 初始化时自动获取并跳转到家目录
  // =================================================================
  useEffect(() => {
    // 修复 Bug: 添加 sessionState?.history.length === 1 限制。
    // 只有在“真正的初始状态（历史中只有 '/' 这 1 条记录）”时，才自动跳转家目录。
    // 如果用户是“后退”回来的（此时历史记录长度肯定大于 1），坚决不再跳转！
    if (sessionId && isConnectionReady && currentPath === '/' && sessionState?.history.length === 1) {
        invoke<string>('sftp_get_home_dir', { id: sessionId })
            .then((homePath) => {
                if (homePath && homePath !== '/') {
                    setPath(sessionId, homePath);
                }
            })
            .catch(err => {
                if (!isExpectedFileManagerError(getErrorMessage(err))) {
                    console.warn("Failed to detect home directory:", err);
                }
            });
    }
  }, [sessionId, isConnectionReady, currentPath, setPath, sessionState?.history.length]);

  const fetchFiles = useCallback(async () => {
    if (!sessionId || !connectionId || !isValidSession) return;
    
    setStoreLoading(sessionId, true);
    setError(null);

    try {
      const files = await invoke<FileEntry[]>("list_ssh_files", { 
          id: connectionId,
          path: currentPath
      });
      
      if (isMounted.current) {
        setFiles(sessionId, files);
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (!isExpectedFileManagerError(errorMsg)) {
        console.error("List files error:", err);
      }
      if (isMounted.current) {
         setStoreLoading(sessionId, false);

         if (errorMsg.includes("SFTP not enabled") || errorMsg.includes("channel request failed")) {
             setError("no_sftp");
         } else if (errorMsg.includes("Timed Out")) {
             setError("timeout");
         } else if (!errorMsg.includes("SSH connection not active")) {
             setError(errorMsg);
         }
      }
    }
  }, [sessionId, connectionId, isValidSession, currentPath, setStoreLoading, setFiles]);

  useEffect(() => {
    if (!sessionId || !isConnectionReady) return;
    fetchFiles();
  }, [sessionId, isConnectionReady, currentPath, reloadTrigger, fetchFiles]);

  useEventBus('fs:refresh-directory', (payload) => {
    if (payload.sessionId === sessionId && isConnectionReady) {
      fetchFiles();
    }
  });

  return {
    isConnectionReady,
    hasFiles,
    isLoading,
    error,
    currentPath,
    fetchFiles,
    sessionState
  };
};
