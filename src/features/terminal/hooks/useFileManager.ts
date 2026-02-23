import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileStore } from "@/store/useFileStore";
import { useMonitorStore } from "@/store/useMonitorStore";
import { FileEntry } from "@/features/fs/types";
import { useTerminalStore } from "@/store/useTerminalStore";

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

  const monitorSession = useMonitorStore(state => sessionId ? state.sessions[sessionId] : undefined);
  const isConnectionReady = !!monitorSession?.os;

  const sessionState = sessionId ? getSession(sessionId) : null;
  const currentPath = sessionState?.currentPath || '/';
  const hasFiles = sessionState?.files && sessionState.files.length > 0;
  const isLoading = sessionState?.isLoading || false;
  const reloadTrigger = sessionState?.reloadTrigger || 0;

  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

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
                console.warn("Failed to detect home directory:", err);
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
      console.error("List files error:", err);
      if (isMounted.current) {
         setStoreLoading(sessionId, false);
         const errorMsg = err.toString();

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

  // 🟢 [优化] 合并冗余代码。移除了多余的 prevPathRef 监听
  // 因为 currentPath 和 reloadTrigger 本就在这里被监听，不需要两个 useEffect
  useEffect(() => {
    if (!sessionId || !isConnectionReady) return;
    fetchFiles();
  }, [sessionId, isConnectionReady, currentPath, reloadTrigger, fetchFiles]); 

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