import { useEffect, useState, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useTerminalStore } from "@/store/useTerminalStore";
import { useServerStore } from "@/features/server/application/useServerStore";
import { useSessionCredentialStore } from "@/store/useSessionCredentialStore";
import { TerminalService } from "../services/terminal.service";
import { HistoryService } from "../services/history.service";

// 🟢 1. 引入高亮处理 Hook
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

  // 🟢 2. 获取高亮转换器 (根据当前服务器 ID 自动拉取对应的规则)
  const { applyHighlight } = useTerminalHighlight(serverConfig?.id);

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

    const setup = async () => {
      // 🟢 3. 拦截服务端发来的数据
      const unlisten = await listen<string>(`term-data-${sessionId}`, (event) => {
        if (isMounted && termRef.current) {
          // 在写入 xterm 之前，将正则匹配到的关键字替换为带有 ANSI 转义码的字符串
          const highlightedData = applyHighlight(event.payload);
          termRef.current.write(highlightedData);
        }
      });

      if (!isMounted) { unlisten(); return; }
      unlistenFn = unlisten;
      await connectInternal();
    };

    setup();

    // Data input listener (User typing)
    const dataDisposable = termRef.current.onData((data) => {
      TerminalService.writeSsh(sessionId, data).catch(console.error);

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
      dataDisposable.dispose();
      
      const currentTabs = useTerminalStore.getState().tabs;
      const isSessionAlive = currentTabs.some(tab => tab.sessions.includes(sessionId));
      if (!isSessionAlive) {
        updateSessionStatus(sessionId, 'disconnected');
        TerminalService.disconnectSsh(sessionId).catch(console.error);
      }
    };
  }, [sessionId, serverConfig?.id, session?.connectTimestamp, termRef, applyHighlight]); 
  // 🟢 4. 依赖数组中加入 applyHighlight，保证规则动态切换时能获取最新闭包

  return { isPasswordRequired, setIsPasswordRequired, connectInternal, isConnectionReady, serverConfig };
};