

// 视图模式
export type ViewMode = 'grid' | 'list';

// 卡片大小
export type CardSize = 'sm' | 'md' | 'lg';

// 排序选项
export type SortOption =
  | 'sort_asc'
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc'
  | 'id_desc'
  | 'id_asc';

// 列表的筛选/视图状态
export interface ServerListState {
  searchQuery: string;
  activeTags: string[];
  viewMode: ViewMode;
  cardSize: CardSize;
  sortBy: SortOption;
}

// 卡片尺寸配置 (用于 UI 样式映射)
export const CARD_DIMENSIONS: Record<CardSize, string> = {
  sm: '260px',
  md: '320px',
  lg: '400px'
};
