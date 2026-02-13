import { useEffect, useCallback, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalService } from "../services/terminal.service";

function debounce(func: Function, wait: number) {
  let timeout: any;
  return function (...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const useTerminalResize = (
  sessionId: string,
  mountRef: React.RefObject<HTMLDivElement | null>, 
  termRef: React.RefObject<Terminal | null>,
  fitAddonRef: React.RefObject<FitAddon | null>,
  isConnectionReady: boolean
) => {
  const lastSentSizeRef = useRef({ cols: 0, rows: 0 });

  const performSafeResize = useCallback((force: boolean = false) => {
    if (!isConnectionReady && !force) return;
    if (!termRef.current || !fitAddonRef.current || !mountRef.current) return;
    if (mountRef.current.clientWidth === 0 || mountRef.current.clientHeight === 0) return;

    try {
      fitAddonRef.current.fit();
      const newCols = termRef.current.cols;
      const newRows = termRef.current.rows;

      if (newCols <= 0 || newRows <= 0 || isNaN(newCols) || isNaN(newRows)) return;
      if (newCols === lastSentSizeRef.current.cols && newRows === lastSentSizeRef.current.rows && !force) return;

      lastSentSizeRef.current = { cols: newCols, rows: newRows };
      TerminalService.resizeSsh(sessionId, newRows, newCols).catch(console.error);
    } catch (e) {
      console.warn("Fit error:", e);
    }
  }, [sessionId, isConnectionReady, termRef, fitAddonRef, mountRef]);

  useEffect(() => {
    if (!mountRef.current) return;

    const debouncedResize = debounce(() => {
      if (!mountRef.current || mountRef.current.clientWidth === 0) return;
      performSafeResize();
    }, 100);

    const resizeObserver = new ResizeObserver(() => debouncedResize());
    resizeObserver.observe(mountRef.current);

    return () => resizeObserver.disconnect();
  }, [performSafeResize, mountRef]);

  return { performSafeResize };
};