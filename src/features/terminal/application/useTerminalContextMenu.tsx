import { useState, useEffect, RefObject } from "react";
import { Terminal } from "@xterm/xterm";
import { toast } from "sonner";
import { Copy, Clipboard, Trash2 } from "lucide-react";
import { ContextMenuItem } from "@/components/common/ContextMenu";
import { TerminalService } from "./services/terminal.service";
// 🟢 导入 Tauri 剪贴板插件 API
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';


export const useTerminalContextMenu = (
  containerRef: RefObject<HTMLDivElement | null>,
  termRef: RefObject<Terminal | null>,
  sessionId: string
) => {
  const [menuConfig, setMenuConfig] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false
  });

  useEffect(() => {
    const handleNativeContextMenu = (e: MouseEvent) => {
      e.preventDefault(); 
      e.stopPropagation(); 
      setMenuConfig({ x: e.clientX, y: e.clientY, visible: true });
      return false;
    };

    const el = containerRef.current;
    if (el) el.addEventListener('contextmenu', handleNativeContextMenu, true);
    return () => {
      if (el) el.removeEventListener('contextmenu', handleNativeContextMenu, true);
    };
  }, [containerRef]); 

  const handleClose = () => setMenuConfig(p => ({ ...p, visible: false }));

  const menuItems: ContextMenuItem[] = [
    {
      label: "复制",
      icon: <Copy size={14} />,
      shortcut: "Ctrl+Shift+C",
      disabled: !termRef.current?.hasSelection(),
      onClick: async () => {
        const text = termRef.current?.getSelection();
        if (text) {
          // 🟢 使用插件 API 写入剪贴板
          await writeText(text);
          toast.success("已复制到剪贴板");
        }
        termRef.current?.focus();
      }
    },
    {
      label: "粘贴",
      icon: <Clipboard size={14} />,
      shortcut: "Ctrl+Shift+V",
      onClick: async () => {
        try {
          // 🟢 使用插件 API 读取剪贴板
          const text = await readText();
          if (text) await TerminalService.writeSsh(sessionId, text);
        } catch (err) { 
          console.error(err);
          toast.error("无法读取剪贴板");
        }
        termRef.current?.focus();
      }
    },
    {
      label: "清屏",
      icon: <Trash2 size={14} />,
      shortcut: "Ctrl+L",
      danger: true,
      onClick: () => {
        termRef.current?.clear();
        termRef.current?.focus();
      }
    }
  ];

  return { menuConfig, menuItems, handleClose };
};
