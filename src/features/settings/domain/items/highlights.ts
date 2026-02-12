import { SettingItem } from "../types";

export const highlightItems: SettingItem[] = [
  {
    id: 'highlights.manager',
    categoryId: 'highlights',
    type: 'highlight-manager', // 对应我们刚写的组件
    labelKey: 'settings.highlights.manage',
    descKey: 'settings.highlights.manageDesc',
  }
];