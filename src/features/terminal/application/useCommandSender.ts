import { useState } from "react";
import { useTerminalStore } from "@/store/useTerminalStore";
import { TerminalService } from "./services/terminal.service";

export const useCommandSender = () => {
  const [inputValue, setInputValue] = useState("");

  // Store Selectors
  const isBroadcastMode = useTerminalStore(s => s.isBroadcastMode);
  const toggleBroadcast = useTerminalStore(s => s.toggleBroadcastMode);
  
  const activeSessionId = useTerminalStore((state) => {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    return activeTab?.sessions?.[0];
  });

  const activeTabSessions = useTerminalStore((state) => {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    return activeTab?.sessions;
  });

  // 发送核心逻辑
  const sendCommand = async (cmd: string) => {
    if (!cmd || !activeSessionId) return;

    try {
        const payload = cmd + "\r"; 
        const sessions = activeTabSessions || [];
        
        // 决定发送目标：广播模式发给全部，否则只发给当前
        const targetSessions = isBroadcastMode && sessions.length > 0 
           ? sessions 
           : [activeSessionId];

        await Promise.all(targetSessions.map(id => 
           TerminalService.writeSsh(id, payload)
        ));
        
        setInputValue(""); // 清空输入框
    } catch(e) {
        console.error("Failed to send command:", e);
    }
  };

  return {
    inputValue,
    setInputValue,
    activeSessionId,
    isBroadcastMode,
    toggleBroadcast,
    sendCommand
  };
};
