import { 
  ArrowDownWideNarrow, 
  Calendar, 
  Hash,
  SlidersHorizontal,
  Clock,
} from "lucide-react";
import { ActionToolbar } from "@/components/common/ActionToolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServerListState, SortOption, CardSize } from "../domain/types"; // 引入 CardSize
import { useTranslation } from "react-i18next";
import { clsx } from "clsx"; 

interface Props {
  state: ServerListState;
  allTags: string[];
  actions: any; 
  onAddClick: () => void;
}

export const ServerListHeader = ({ state, allTags, actions, onAddClick }: Props) => {
  const { t } = useTranslation();

  // 1. 排序组件
  const SortAction = (
    <Select value={state.sortBy} onValueChange={(v) => actions.setSortBy(v as SortOption)}>
      <SelectTrigger className="h-9 w-[140px] sm:w-[170px] text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-0">
         <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate">
           {state.sortBy.includes('created') && <Calendar className="w-3.5 h-3.5 opacity-70 shrink-0"/>}
           {state.sortBy.includes('sort') && <SlidersHorizontal className="w-3.5 h-3.5 opacity-70 shrink-0"/>}
           {state.sortBy.includes('id') && <Hash className="w-3.5 h-3.5 opacity-70 shrink-0"/>}
           {state.sortBy.includes('name') && <ArrowDownWideNarrow className="w-3.5 h-3.5 opacity-70 shrink-0"/>}
           {state.sortBy.includes('connected') && <Clock className="w-3.5 h-3.5 opacity-70 shrink-0"/>}
           <SelectValue />
         </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sort_asc">{t('server.sort.custom', 'Sort Weight')}</SelectItem>
        <SelectItem value="created_desc">{t('server.sort.newest', 'Newest')}</SelectItem>
        <SelectItem value="created_asc">{t('server.sort.oldest', 'Oldest')}</SelectItem>
        <SelectItem value="name_asc">{t('server.sort.nameAsc', 'Name (A-Z)')}</SelectItem>
        <SelectItem value="name_desc">{t('server.sort.nameDesc', 'Name (Z-A)')}</SelectItem>
        <SelectItem value="id_desc">{t('server.sort.idDesc', 'ID')}</SelectItem>
        <SelectItem value="id_asc">{t('server.sort.idAsc', 'ID (Ascending)')}</SelectItem>
        <SelectItem value="last_connected_desc">{t('server.sort.lastConnected', 'Last Connected First')}</SelectItem>
      </SelectContent>
    </Select>
  );

  // 判断是否为网格视图
  const isGridView = state.viewMode === 'grid';

  return (
    <div className={clsx(
        "sticky top-2 z-10 p-4 mx-2 mb-4 rounded-xl shadow-sm", 
        "bg-white/60 dark:bg-slate-900/60 backdrop-blur-md", 
        "border border-white/40 dark:border-white/10", 
        "transition-all duration-300"
    )}>
      <ActionToolbar
        // --- 搜索 ---
        searchQuery={state.searchQuery}
        onSearchChange={actions.setSearch}
        searchPlaceholder={t('server.list.searchPlaceholder', 'Search...')}
        
        // --- 标签 ---
        tags={allTags}
        activeTag={state.activeTags[0] ?? null} 
        onTagChange={actions.setFilterTag}

        // --- 视图与大小与隐私 ---
        viewMode={state.viewMode}
        onViewModeChange={(mode) => actions.setViewMode(mode)}
        
        cardSize={isGridView ? state.cardSize : undefined}
        onCardSizeChange={isGridView ? (size: CardSize) => actions.setCardSize(size) : undefined}

        isPrivacyMode={actions.isPrivacyMode}
        onTogglePrivacyMode={actions.togglePrivacyMode}

        // --- 新增动作 ---
        onAdd={onAddClick}
        addLabel={t('server.list.add', 'Server')}

        // --- 额外动作 (排序) ---
        extraActions={SortAction}
      />
    </div>
  );
};
