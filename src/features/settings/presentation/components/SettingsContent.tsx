import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { useSettingsStore } from "../../application/useSettingsStore";
import { useSettingsLogic } from "../../application/useSettingsLogic";
import { SettingItemRenderer } from "./SettingItemRenderer";
import { TerminalPreview } from "./TerminalPreview";
import { CATEGORIES } from "../../domain/categories";
import { SETTING_ITEMS } from "../../domain/constants";
import { useState } from "react";
import { ChevronDown, ChevronRight, TerminalSquare } from "lucide-react";

export const SettingsContent = () => {
  const { t } = useTranslation();
  
  const activeCategory = useSettingsStore(s => s.activeCategory); 
  const settings = useSettingsStore(s => s.settings);
  const searchQuery = useSettingsStore(s => s.searchQuery);
  const updateSettings = useSettingsStore(s => s.updateSettings);

  const { currentTitle, displayItems: searchResults } = useSettingsLogic();

  const showPreviewGlobal = ['terminal', 'appearance'].includes(activeCategory);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true);

  return (
    <div className={clsx(
        "flex-1 flex flex-col h-full min-w-0 relative select-none",
        // 🟢 [修改] 移除背景色和模糊，改为完全透明
        "bg-transparent", 
        "transition-colors duration-300"
    )}>
      
      {/* --- Header 区域 --- */}
      <div className="px-8 py-6 flex items-center justify-between shrink-0 z-20 bg-transparent">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {currentTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                 {searchQuery 
                    ? t('settings.searchResults', { count: searchResults.length, defaultValue: `${searchResults.length} results` })
                    : t('settings.itemsCount', { 
                        count: SETTING_ITEMS.filter(i => i.categoryId === activeCategory).length,
                        defaultValue: `${SETTING_ITEMS.filter(i => i.categoryId === activeCategory).length} settings`
                      })
                 }
            </p>
        </div>
      </div>

      {/* --- Preview 区域 (可收纳) --- */}
      <div className={clsx(
          "px-8 shrink-0 z-10 bg-transparent transition-all duration-300",
          showPreviewGlobal && !searchQuery ? "block" : "hidden",
          isPreviewExpanded ? "pb-1" : "pb-4"
      )}>
          <button 
             onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
             className="flex items-center gap-1.5 mb-3 group focus:outline-none"
             type="button"
          >
             <div className="p-0.5 rounded text-slate-400 group-hover:text-blue-500 transition-colors">
                {isPreviewExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
             </div>

             <div className="text-xs font-bold text-slate-500/80 dark:text-slate-400/80 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors flex items-center gap-2">
                <TerminalSquare className="w-3.5 h-3.5" />
                {t('settings.terminal.preview', 'Live Preview')}
             </div>
             
             {!isPreviewExpanded && (
                <div className="h-px w-32 bg-slate-200 dark:bg-slate-800 ml-2 group-hover:w-48 transition-all" />
             )}
          </button>
          
          <div className={clsx(
              "transition-all duration-300 ease-in-out",
              isPreviewExpanded 
                  ? "opacity-100 max-h-[500px]" 
                  : "opacity-0 max-h-0 overflow-hidden" 
          )}>
              <TerminalPreview />
          </div>
      </div>

      {/* --- 列表内容区域 --- */}
      <div className="flex-1 relative overflow-hidden">
        {searchQuery ? (
           <div className="absolute inset-0 overflow-y-auto px-6 py-2 custom-scrollbar z-50 bg-transparent">
               <div className="max-w-3xl mx-auto space-y-1 pb-10">
                  {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <SettingItemRenderer
                            key={item.id}
                            item={item}
                            value={settings[item.id]}
                            onChange={(val) => updateSettings({ [item.id]: val })}
                        />
                      ))
                  ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                          <p>{t('settings.noResults', 'No settings found')}</p>
                      </div>
                  )}
               </div>
           </div>
        ) : (
            CATEGORIES.map(cat => {
                const categoryItems = SETTING_ITEMS.filter(item => item.categoryId === cat.id);
                if (categoryItems.length === 0) return null;
                const isActive = activeCategory === cat.id;

                return (
                    <div
                        key={cat.id}
                        className={clsx(
                            "absolute inset-0 overflow-y-auto px-6 py-2 custom-scrollbar",
                            isActive ? "block z-10" : "hidden z-0"
                        )}
                    >
                        <div className="max-w-5xl mx-auto space-y-1 pb-10">
                            {categoryItems.map((item) => (
                                <SettingItemRenderer
                                    key={item.id}
                                    item={item}
                                    value={settings[item.id]}
                                    onChange={(val) => updateSettings({ [item.id]: val })}
                                />
                            ))}
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};