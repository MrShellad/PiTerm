import { useEffect } from "react";
import { useTerminalStore } from "@/store/useTerminalStore";
import { useXtermInstance } from "./hooks/useXtermInstance";
import { useTerminalConnection } from "./hooks/useTerminalConnection";
import { useTerminalResize } from "./hooks/useTerminalResize";
import { useTerminalTracking } from "./hooks/useTerminalTracking";

export const useTerminalSession = (sessionId: string, isActive: boolean) => {
  // 1. Initialize Core Terminal
  const { mountRef, termRef, fitAddonRef, themeObj, padding } = useXtermInstance();

  // 2. Setup Connection & Data Flow
  const { 
    isPasswordRequired, 
    setIsPasswordRequired, 
    connectInternal, 
    isConnectionReady,
    serverConfig
  } = useTerminalConnection(sessionId, termRef, () => performSafeResize(true));

  // 3. Setup Resizing
  const { performSafeResize } = useTerminalResize(
    sessionId, 
    mountRef, 
    termRef, 
    fitAddonRef, 
    isConnectionReady
  );

  // 4. Setup Directory Tracking
  useTerminalTracking(sessionId, termRef, serverConfig);

  // 5. Handle Tab Activation
  useEffect(() => {
    if (isActive && termRef.current) {
      const timer = setTimeout(() => {
        performSafeResize();
        termRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, performSafeResize]);

  // Expose state to the UI Component
  const status = useTerminalStore(s => s.sessions[sessionId]?.status || 'disconnected');

  return {
    mountRef,
    termRef,
    style: { padding, themeObj },
    isPasswordRequired,
    closePasswordModal: () => setIsPasswordRequired(false),
    reconnectWithPassword: (pwd: string) => connectInternal(pwd),
    status
  };
};