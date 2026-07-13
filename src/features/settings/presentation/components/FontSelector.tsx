import { useTranslation } from "react-i18next";
// 🟢 [修改] 移除了 Type 图标
import { Check, Search, RotateCcw, Save, Loader2 } from "lucide-react";
import { CustomInput } from "@/components/common/CustomInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// 🟢 引入 Hook
import { useFontSelector } from "../../application/useFontSelector";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export const FontSelector = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  
  // 🟢 使用 Hook 接管逻辑
  const {
    loading,
    isOpen,
    setIsOpen,
    searchTerm,
    selectedFont,
    filteredFonts,
    hasUnsavedChanges,
    handleSearchChange,
    handleSelectFont,
    handleReset,
    handleSave
  } = useFontSelector(value, onChange);

  return (
    <div className="w-fit">
      <div className="flex items-center gap-2">
        
        {/* 搜索输入框 */}
        <div className="relative w-[220px] group">
            <Search className="absolute left-2.5 top-[10px] w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors z-10" />
            <CustomInput 
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder={t('settings.appearance.searchFont', "Search...")}
                className="pl-9 h-9 text-[1.05rem]"
            />
 
            {/* 下拉建议 */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-[60] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 min-w-[200px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-16 text-slate-400 gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[1.05rem]">{t('common.loading', 'Loading...')}</span>
                        </div>
                    ) : (
                        <div className="overflow-y-auto custom-scrollbar max-h-60 p-1">
                             {/* 系统默认选项 */}
                             <button
                                onMouseDown={(e) => { e.preventDefault(); }}
                                onClick={() => handleSelectFont("")}
                                className={cn(
                                    "w-full text-left px-3.5 py-2 text-[1.05rem] rounded flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                                    selectedFont === "" && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                                )}
                            >
                                <span className="opacity-70 italic">{t('common.default', 'System Default')}</span>
                                {selectedFont === "" && <Check className="w-4 h-4" />}
                            </button>
                            
                            {/* 字体列表 */}
                            {filteredFonts.map(font => (
                                <button
                                    key={font}
                                    onMouseDown={(e) => { e.preventDefault(); }}
                                    onClick={() => handleSelectFont(font)}
                                    className={cn(
                                        "w-full text-left px-3.5 py-2 text-[1.05rem] rounded flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate",
                                        selectedFont === font && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                                    )}
                                    style={{ fontFamily: font }}
                                >
                                    <span className="truncate">{font}</span>
                                    {selectedFont === font && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
 
        {/* 按钮组 */}
        <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleReset}
                            className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>{t('common.reset', 'Reset')}</p></TooltipContent>
                </Tooltip>
 
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button 
                            size="icon" 
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges}
                            className={cn(
                                "h-9 w-9 transition-all",
                                hasUnsavedChanges 
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                            )}
                        >
                            <Save className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>{t('common.save', 'Save')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
      {/* 🟢 [已移除] 底部预览区域 */}
    </div>
  );
};