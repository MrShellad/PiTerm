import { useEffect, useState, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useTerminalStore } from "@/store/useTerminalStore";
import { useServerStore } from "@/features/server/application/useServerStore";
import { useSessionCredentialStore } from "@/store/useSessionCredentialStore";
import { TerminalService } from "../services/terminal.service";
import { HistoryService } from "../services/history.service";

// 引入高亮处理 Hook
import { useTerminalHighlight } from "./useTerminalHighlight";

export const useTerminalConnection = (
  sessionId: string,
  termRef: React.RefObject<Terminal | null>,
  onReady: () => void
) => {
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isConnectionReady, setIsConnectionReady] = useState(false);
  const cmdBuffer = useRef<string>('');

  const updateSessionStatus = useTerminalStore(s => s.updateSessionStatus);
  const session = useTerminalStore(s => s.sessions[sessionId]);
  const serverConfig = useServerStore(s => s.servers.find(srv => srv.id === session?.serverId));
  const consumeCredential = useSessionCredentialStore(s => s.consumeCredential);

  // 获取高亮转换器
  const { applyHighlight } = useTerminalHighlight(serverConfig?.id);

  // 🟢 核心修复：使用 ref 保存最新的高亮函数指针，防止触发重新连接
  const applyHighlightRef = useRef(applyHighlight);
  useEffect(() => {
    applyHighlightRef.current = applyHighlight;
  }, [applyHighlight]);

  const markSessionDisconnected = useCallback(() => {
    const currentSession = useTerminalStore.getState().sessions[sessionId];
    if (currentSession?.status !== 'disconnected' && termRef.current) {
      termRef.current.write(`\r\n\x1b[33m[SSH]\x1b[0m Session disconnected.\r\n`);
    }
    setIsConnectionReady(false);
    updateSessionStatus(sessionId, 'disconnected');
  }, [sessionId, termRef, updateSessionStatus]);

  const isInactiveSessionError = (err: unknown) =>
    String(err).includes('SSH connection not active');

  const connectInternal = useCallback(async (manualPassword?: string) => {
    if (!termRef.current || !serverConfig) return;
    const term = termRef.current;
    
    setIsPasswordRequired(false);
    updateSessionStatus(sessionId, 'connecting');

    try {
      let finalPassword = manualPassword;
      if (!finalPassword && serverConfig.provider === 'QuickConnect') {
        const tempPwd = consumeCredential(serverConfig.id);
        if (tempPwd) finalPassword = tempPwd;
        else {
          term.write(`\r\n\x1b[33m[Auth]\x1b[0m Session expired.\r\n`);
          setIsPasswordRequired(true);
          updateSessionStatus(sessionId, 'disconnected');
          return;
        }
      }

      if (serverConfig.provider === 'QuickConnect') {
        await TerminalService.quickConnect({
          id: sessionId,
          ip: serverConfig.ip,
          port: serverConfig.port,
          username: serverConfig.username,
          password: finalPassword || null,
          privateKey: serverConfig.privateKey || null,
          passphrase: serverConfig.passphrase || null
        });
      } else {
        await TerminalService.connectSsh(serverConfig.id, sessionId);
      }

      updateSessionStatus(sessionId, 'connected');
      term.focus();

      setTimeout(() => {
        setIsConnectionReady(true);
        onReady(); 
      }, 300);

    } catch (err: any) {
      const msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
      term.write(`\r\n\x1b[31mConnection failed: ${msg}\x1b[0m\r\n`);
      updateSessionStatus(sessionId, 'error');
      if ((msg.includes("Auth Failed") || msg.includes("denied")) && serverConfig.provider === 'QuickConnect') {
        setIsPasswordRequired(true);
      }
    }
  }, [serverConfig, sessionId, consumeCredential, updateSessionStatus, termRef, onReady]);

  useEffect(() => {
    if (!termRef.current || !session || !serverConfig) return;

    let isMounted = true;
    let unlistenFn: UnlistenFn | null = null;
    let exitUnlistenFn: UnlistenFn | null = null;

    const setup = async () => {
      // 拦截服务端发来的数据
      const unlisten = await listen<string>(`term-data-${sessionId}`, (event) => {
        if (isMounted && termRef.current) {
          // 🟢 核心修复：从 ref 读取最新的高亮函数进行处理，确保闭包更新时不重连
          const highlightedData = applyHighlightRef.current(event.payload);
          termRef.current.write(highlightedData);
        }
      });

      if (!isMounted) { unlisten(); return; }
      unlistenFn = unlisten;

      const exitUnlisten = await listen(`term-exit-${sessionId}`, () => {
        if (!isMounted) return;

        const currentSession = useTerminalStore.getState().sessions[sessionId];
        if (currentSession?.status === 'connecting') {
          return;
        }

        markSessionDisconnected();
      });

      if (!isMounted) {
        exitUnlisten();
        return;
      }
      exitUnlistenFn = exitUnlisten;
      await connectInternal();
    };

    setup();

    // Data input listener (User typing)
    const dataDisposable = termRef.current.onData((data) => {
      TerminalService.writeSsh(sessionId, data).catch((err) => {
        if (isInactiveSessionError(err)) {
          markSessionDisconnected();
          return;
        }
        console.error(err);
      });

      // History buffer parsing
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const code = char.charCodeAt(0);
        if (code === 13) { // Enter
          const command = cmdBuffer.current.trim();
          if (command.length > 0 && serverConfig?.id) {
            HistoryService.recordCommand(serverConfig.id, command).catch(() => {});
          }
          cmdBuffer.current = '';
        } else if (code === 127) { // Backspace
          cmdBuffer.current = cmdBuffer.current.slice(0, -1);
        } else if (code >= 32) {
          cmdBuffer.current += char;
        }
      }
    });

    return () => {
      isMounted = false;
      setIsConnectionReady(false);
      if (unlistenFn) unlistenFn();
      if (exitUnlistenFn) exitUnlistenFn();
      dataDisposable.dispose();
      
      const currentTabs = useTerminalStore.getState().tabs;
      const isSessionAlive = currentTabs.some(tab => tab.sessions.includes(sessionId));
      if (!isSessionAlive) {
        updateSessionStatus(sessionId, 'disconnected');
        TerminalService.disconnectSsh(sessionId).catch(console.error);
      }
    };
  // 🟢 核心修复：这里移除了 applyHighlight 依赖
  }, [sessionId, serverConfig?.id, session?.connectTimestamp, termRef, markSessionDisconnected]); 

  useEffect(() => {
    if (session?.status !== 'connected') return;

    const sendHeartbeat = () => {
      TerminalService.touchSshSession(sessionId).catch((err) => {
        if (isInactiveSessionError(err)) {
          markSessionDisconnected();
        }
      });
    };

    sendHeartbeat();
    const heartbeatTimer = window.setInterval(sendHeartbeat, 20000);

    return () => {
      window.clearInterval(heartbeatTimer);
    };
  }, [sessionId, session?.status, markSessionDisconnected]);

  return { isPasswordRequired, setIsPasswordRequired, connectInternal, isConnectionReady, serverConfig };
};
