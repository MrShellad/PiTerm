import { useEffect, useRef, useMemo } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { useSettingsStore } from "@/features/settings/application/useSettingsStore";
import { TERMINAL_THEMES } from "../../constants";

export const useXtermInstance = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const rendererAddonRef = useRef<any>(null);

  const settings = useSettingsStore(s => s.settings);
  const customThemes = useSettingsStore(s => s.customThemes);

  // Extract settings
  const themeId = settings['terminal.theme'] || 'default';
  const rendererType = settings['terminal.rendererType'] || 'webgl';
  const padding = Number(settings['terminal.padding'] || 12);

  const themeObj = useMemo(() => {
    const allThemes = { ...TERMINAL_THEMES, ...customThemes };
    return allThemes[themeId] || allThemes['default'];
  }, [themeId, customThemes]);

  // 1. Initialize Terminal
  useEffect(() => {
    if (!mountRef.current) return;

    const term = new Terminal({
      fontSize: Number(settings['terminal.fontSize'] || 14),
      fontFamily: settings['terminal.fontFamily'] || 'Menlo, Monaco, "Courier New", monospace',
      fontWeight: (settings['terminal.fontWeight'] || 'normal') as any,
      lineHeight: Number(settings['terminal.lineHeight'] || 1.0),
      cursorBlink: settings['terminal.cursorBlink'] ?? true,
      cursorStyle: (settings['terminal.cursorStyle'] || 'block') as any,
      scrollback: Number(settings['terminal.scrollback'] || 1000),
      theme: themeObj,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(mountRef.current);
    if (term.element) term.element.classList.add('xterm-scroll-fix');

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []); // Only run once on mount

  // 2. Handle WebGL Renderer changes
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    if (rendererAddonRef.current) {
      try { rendererAddonRef.current.dispose(); } catch (e) {}
      rendererAddonRef.current = null;
    }

    if (rendererType === 'webgl') {
      try {
        const addon = new WebglAddon();
        addon.onContextLoss(() => addon.dispose());
        term.loadAddon(addon);
        rendererAddonRef.current = addon;
      } catch (e) { console.warn("WebGL Error:", e); }
    }
  }, [rendererType, termRef.current]);

  // 3. Hot Reload Settings
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    term.options.fontSize = Number(settings['terminal.fontSize'] || 14);
    term.options.fontFamily = settings['terminal.fontFamily'] || 'Menlo, Monaco, "Courier New", monospace';
    term.options.fontWeight = (settings['terminal.fontWeight'] || 'normal') as any;
    term.options.lineHeight = Number(settings['terminal.lineHeight'] || 1.0);
    term.options.cursorBlink = settings['terminal.cursorBlink'] ?? true;
    term.options.cursorStyle = (settings['terminal.cursorStyle'] || 'block') as any;
    term.options.scrollback = Number(settings['terminal.scrollback'] || 1000);
    term.options.theme = themeObj;
    
    // Note: We don't trigger resize here, the resize hook handles its own logic.
  }, [settings, themeObj]);

  return { mountRef, termRef, fitAddonRef, themeObj, padding };
};