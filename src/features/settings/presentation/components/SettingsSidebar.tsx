import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { Search } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { useSettingsStore } from '../../application/useSettingsStore';
import { CATEGORIES } from '../../domain/categories';

export const SettingsSidebar = () => {
  const { t } = useTranslation();
  
  const activeCategory = useSettingsStore(s => s.activeCategory);
  const setActiveCategory = useSettingsStore(s => s.setActiveCategory);
  const searchQuery = useSettingsStore(s => s.searchQuery);
  const setSearchQuery = useSettingsStore(s => s.setSearchQuery);

  const mainCategories = CATEGORIES.filter(c => !c.isBottom);
  const bottomCategories = CATEGORIES.filter(c => c.isBottom);

  const renderItem = (cat: typeof CATEGORIES[0]) => {
    const Icon = cat.icon;
    const isActive = activeCategory === cat.id && !searchQuery;
    
    return (
      <button
        key={cat.id}
        onClick={() => setActiveCategory(cat.id)}
        className={clsx(
          "w-full flex items-center gap-2.5 px-3 py-2.5 text-[1.05rem] font-medium rounded-md transition-all",
          isActive 
            ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
            // 悬停态稍微给一点点背景，增强交互感，或者也可以去掉
            : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200"
        )}
      >
        <Icon className={clsx("w-4 h-4", isActive ? "text-white" : "opacity-70")} />
        <span>{t(cat.labelKey)}</span>
      </button>
    );
  };

  return (
    <div className={clsx(
      "w-52 shrink-0 flex flex-col border-r border-slate-200/50 dark:border-slate-800/50",
      // 🟢 [修改] 移除背景色和模糊，改为完全透明
      "bg-transparent", 
      "transition-colors duration-300"
    )}>
      {/* 标题 */}
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('settings.title', 'Settings')}
        </h2>
      </div>

      {/* 搜索框 */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-[10px] w-4 h-4 text-slate-400 z-10 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search', 'Search...')}
            className={clsx(
                "pl-9 h-9 text-[1.05rem] transition-all shadow-sm",
                // 🟢 [修改] 搜索框保持半透明，确保文字可读
                "bg-white/40 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm",
                "focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:border-blue-500"
            )}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <div className="text-[1.05rem] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2.5 mt-3">
            {t('settings.nav.main', 'General')}
        </div>
        {mainCategories.map(renderItem)}
      </div>

      {/* 底部区域 */}
      <div className={clsx(
          "p-3 border-t border-slate-200/50 dark:border-slate-800/50",
          // 🟢 [修改] 移除底部背景色，改为透明
          "bg-transparent"
      )}>
         {bottomCategories.map(renderItem)}
      </div>
    </div>
  );
};