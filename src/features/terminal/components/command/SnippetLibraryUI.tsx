import { useTranslation } from "react-i18next";
import { Search, Play, Copy, Code, TerminalSquare, Loader2, History, Trash2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BaseModal } from "@/components/common/BaseModal";
import { clsx } from "clsx";
import type { HistoryItem } from "../../hooks/useCommandHistory";

interface SnippetLibraryUIProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'snippets' | 'history';
  onTabChange: (tab: 'snippets' | 'history') => void;
  
  // Snippets Data
  snippets: any[]; 
  isSnippetsLoading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  allTags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;

  // History Data
  historyList: HistoryItem[];
  isHistoryLoading: boolean;
  serverName?: string;
  serverIp?: string;

  // Actions
  onRun: (code: string) => void;
  onInsert: (code: string) => void;
  onDeleteHistory: (id: number) => void;
}

// --- Helper Components ---
const TabButton = ({ active, icon: Icon, label, onClick }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all",
            active
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

const TagChip = ({ label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "px-2 py-0.5 rounded text-[10px] font-medium transition-colors border shrink-0",
            active
                ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700"
        )}
    >
        {label}
    </button>
);

// --- Main Component ---
export const SnippetLibraryUI = (props: SnippetLibraryUIProps) => {
  const { t } = useTranslation();
  
  const formatTime = (ts: number) => {
      return new Date(ts * 1000).toLocaleString(undefined, {
          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
  };

  return (
    <BaseModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={t('cmd.library', 'Command Library')}
      icon={<TerminalSquare className="w-5 h-5" />}
      // 🟢 [调整 1] 宽度进一步收窄: max-w-xl (约 576px)
      className="max-w-xl h-[600px] z-[1000]"
      footer={
        <div className="w-full flex justify-between items-center text-xs text-slate-400">
            <span>
                {props.activeTab === 'snippets' 
                    ? t('snippets.count', { count: props.snippets.length, defaultValue: `${props.snippets.length} snippets` })
                    : t('history.count', { count: props.historyList.length, defaultValue: `${props.historyList.length} records` })
                }
            </span>
            {props.activeTab === 'history' && props.serverName && (
                <span className="opacity-70 truncate max-w-[200px]">
                    {props.serverName} ({props.serverIp})
                </span>
            )}
        </div>
      }
    >
      <div className="flex flex-col h-full gap-4">
        
        {/* === Tabs === */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg shrink-0 select-none">
            <TabButton 
                active={props.activeTab === 'snippets'} 
                onClick={() => props.onTabChange('snippets')} 
                icon={Code} 
                label={t('cmd.snippets', 'Snippets')} 
            />
            <TabButton 
                active={props.activeTab === 'history'} 
                onClick={() => props.onTabChange('history')} 
                icon={History} 
                label={t('cmd.history', 'History')} 
            />
        </div>

        {/* === Content === */}
        <div className="flex-1 min-h-0 relative">
            
            {/* Snippets Tab */}
            {props.activeTab === 'snippets' && (
                <div className="flex flex-col h-full gap-3 animate-in fade-in duration-200">
                    {/* Search & Tags */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input 
                                className="pl-9 h-9 text-sm bg-white dark:bg-slate-900/50" 
                                placeholder={t('cmd.searchPlaceholder', 'Search snippets...')}
                                value={props.searchQuery}
                                onChange={(e) => props.onSearchChange(e.target.value)}
                            />
                        </div>
                        {props.allTags.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar select-none no-scrollbar">
                                <TagChip 
                                    label={t('common.all', 'All')} 
                                    active={props.selectedTag === null} 
                                    onClick={() => props.onTagSelect(null)} 
                                />
                                {props.allTags.map(tag => (
                                    <TagChip 
                                        key={tag} 
                                        label={tag} 
                                        active={tag === props.selectedTag} 
                                        onClick={() => props.onTagSelect(tag === props.selectedTag ? null : tag)} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Snippet List - 🟢 [调整 2] 单行紧凑布局 */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {props.isSnippetsLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                            </div>
                        ) : props.snippets.length > 0 ? (
                            props.snippets.map((item) => {
                                const codeContent = item.code || item.command || item.content || '';
                                return (
                                    <div 
                                        key={item.id} 
                                        className="group flex items-center gap-3 p-2 rounded-md border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                                    >
                                        {/* 左侧信息区 (Flex Grow) */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                            {/* 标题 */}
                                            <span className="font-medium text-sm text-slate-700 dark:text-slate-200 shrink-0">
                                                {item.title}
                                            </span>

                                            {/* 标签 (仅显示，缩小) */}
                                            {item.tags?.length > 0 && (
                                                <div className="flex items-center gap-1 shrink-0 opacity-60">
                                                    {item.tags.slice(0, 2).map((tag: string) => (
                                                        <span key={tag} className="text-[10px] px-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 分隔符 */}
                                            <span className="text-slate-300 dark:text-slate-700 shrink-0">|</span>

                                            {/* 代码预览 (自动截断) */}
                                            <code 
                                                className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate flex-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                onClick={() => props.onInsert(codeContent)}
                                                title={codeContent}
                                            >
                                                {codeContent}
                                            </code>
                                        </div>

                                        {/* 右侧按钮组 (固定宽度，Hover 显示) */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50" 
                                                onClick={() => props.onInsert(codeContent)} 
                                                title={t('cmd.commoninsert', 'Insert')}
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-6 w-6 text-slate-400 hover:text-green-600 hover:bg-green-100/50" 
                                                onClick={() => props.onRun(codeContent)} 
                                                title={t('cmd.commonrun', 'Run')}
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <TerminalSquare className="w-8 h-8 opacity-20" />
                                <span className="text-xs">{t('cmd.snippetsnotFound', 'No snippets found')}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* History Tab */}
            {props.activeTab === 'history' && (
                <div className="flex flex-col h-full gap-3 animate-in fade-in duration-200">
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {props.isHistoryLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                                <span className="text-xs">{t('cmd.commonloading', 'Loading history...')}</span>
                            </div>
                        ) : !props.serverName ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                <span className="text-xs">{t('cmd.historynoSession', 'Please select a terminal session first')}</span>
                            </div>
                        ) : props.historyList.length > 0 ? (
                            props.historyList.map((item) => (
                                <div key={item.id} className="group flex items-center justify-between px-2 py-1.5 rounded-md border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-xs">
                                    <div className="flex-1 min-w-0 mr-4 flex items-center gap-2 overflow-hidden">
                                        <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400 w-24">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(item.createdAt)}
                                        </div>
                                        <code 
                                            className="font-mono text-slate-700 dark:text-slate-300 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1"
                                            onClick={() => props.onInsert(item.command)}
                                            title={item.command}
                                        >
                                            {item.command}
                                        </code>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => props.onInsert(item.command)} title={t('cmd.commoninsert', 'Insert')}>
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-green-600" onClick={() => props.onRun(item.command)} title={t('cmd.commonrun', 'Run')}>
                                            <Play className="w-3.5 h-3.5" />
                                        </Button>
                                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1" />
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); props.onDeleteHistory(item.id); }} title={t('cmd.commondelete', 'Delete')}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <History className="w-8 h-8 opacity-20" />
                                <span className="text-xs">{t('cmd.historyempty', 'No history found')}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </BaseModal>
  );
};