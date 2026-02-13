import { SettingItem } from "../types";

export const highlightItems: SettingItem[] = [
  {
    id: 'highlights.manager',
    categoryId: 'highlights',
    type: 'highlight-manager', // 对应我们刚写的组件
    labelKey: 'settings.highlights.manage',
    descKey: 'settings.highlights.manageDesc',
  },
  //[新增] 规则分配模块配置
  {
    id: 'highlights.assigner',
    categoryId: 'highlights',
    type: 'highlight-assigner', 
    labelKey: 'settings.highlights.assign', // 你可以在 i18n 中添加这个 key
    descKey: 'settings.highlights.assignDesc', 
  }
];