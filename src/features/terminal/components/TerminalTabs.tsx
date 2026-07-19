import { clsx } from "clsx";
import { useTerminalTabs } from "@/features/terminal/hooks/useTerminalTabs";
import { TerminalTabItem } from "./tabs/TerminalTabItem";

import { ScrollButton } from "./tabs/ScrollButton";
import { Plus } from "lucide-react";
import { useTerminalStore } from "@/store/useTerminalStore";
import { useNavigate } from "react-router-dom";
import { ThemeSelector } from "./tabs/ThemeSelector";

export const TerminalTabs = () => {
  const {
    // State
    tabs,
    activeTabId,
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    // Actions
    scroll,
    checkScroll,
    handleTabClick,
    handleCloseTab,
    handleCloseOthers,
    handleCloseAll,
    getTabStatus
  } = useTerminalTabs();

  // 新建终端逻辑
  const { createTab, reconnectTab } = useTerminalStore();
  const navigate = useNavigate();

  const handleNewTerminal = () => {
    createTab();
    navigate("/terminal");
  };

  return (
    <>
      {/* 隐藏滚动条样式 */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className={clsx(
        "flex items-center h-full min-w-0 w-full pr-2",
        // 移除了背景色和边框，交给 TitleBar 统一管理，实现整体沉浸感
        "bg-transparent", 
        "transition-colors duration-200 ease-in-out"
      )}>
        
        {/* 左滚动按钮 */}
        {canScrollLeft && <ScrollButton dir="left" onClick={() => scroll('left')} />}

        {/* Tab 滚动容器 */}
        <div 
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="hide-scrollbar flex-1 flex items-center overflow-x-auto h-full gap-1.5 px-1 scroll-smooth"
        >
          {tabs.map((tab) => (
            <TerminalTabItem
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              sessionStatus={getTabStatus(tab.sessions?.[0])}
              onClick={handleTabClick}
              onClose={handleCloseTab}
              onCloseOthers={handleCloseOthers}
              onCloseAll={handleCloseAll}
              onReconnect={(id) => reconnectTab(id)}
            />
          ))}
        </div>

        {/* 右滚动按钮 */}
        {canScrollRight && <ScrollButton dir="right" onClick={() => scroll('right')} />}

        {/* [修改] 新建终端按钮 - 移除 Tooltip，优化对齐 */}
        <div className="pl-1.5 shrink-0 flex items-center">
            <button
            onClick={handleNewTerminal}
            className={clsx(
                "flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-200",
                "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                "hover:bg-slate-200 dark:hover:bg-white/10",
                "app-region-no-drag"
            )}
            >
            <Plus className="w-4 h-4" />
            </button>
        </div>

        {/* 分隔线 */}
        <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-2 shrink-0 self-center" />
        
        {/* 配色方案选择器 */}
        <div className="shrink-0 flex items-center pr-1.5">
            <ThemeSelector />
        </div>

      </div>
    </>
  );
};