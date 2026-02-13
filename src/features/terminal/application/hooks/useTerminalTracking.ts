import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { useFileStore } from "@/store/useFileStore";
import { Server } from "@/features/server/domain/types";
import { TerminalService } from "../services/terminal.service";

export const useTerminalTracking = (
  sessionId: string,
  termRef: React.RefObject<Terminal | null>,
  serverConfig?: Server
) => {
  const trackingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const getSession = useFileStore(s => s.getSession);
  const setPath = useFileStore(s => s.setPath);

  useEffect(() => {
    const term = termRef.current;
    if (!term || !serverConfig) return;

    const handleTitleChange = (newTitle: string) => {
      const fileSession = getSession(sessionId);
      if (!fileSession?.isTracking) return;

      if (trackingTimeoutRef.current) clearTimeout(trackingTimeoutRef.current);

      trackingTimeoutRef.current = setTimeout(async () => {
        let detectedPath = "";
        const pathRegex = /(?::\s*)?((?:\/|~)[a-zA-Z0-9_\-\.\/]*)/;
        const match = newTitle.match(pathRegex);

        if (match && match[1]) detectedPath = match[1].trim();

        if (detectedPath.startsWith('~')) {
          const homeDir = serverConfig.username === 'root' ? '/root' : `/home/${serverConfig.username}`;
          detectedPath = detectedPath.replace(/^~/, homeDir);
        }

        if (detectedPath && detectedPath !== fileSession.currentPath) {
          try {
            const isDir = await TerminalService.checkIsDir(sessionId, detectedPath);
            if (isDir) setPath(sessionId, detectedPath);
          } catch (e) { /* Silent failure */ }
        }
      }, 600);
    };

    const titleDisposable = term.onTitleChange(handleTitleChange);

    return () => {
      titleDisposable.dispose();
      if (trackingTimeoutRef.current) clearTimeout(trackingTimeoutRef.current);
    };
  }, [sessionId, serverConfig, termRef, getSession, setPath]);
};