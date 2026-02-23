// src/features/settings/domain/items/about.ts
import { SettingItem } from "../types";

export const aboutItems: SettingItem[] = [
  {
    id: 'about.version',
    categoryId: 'about',
    type: 'info',
    labelKey: 'settings.about.version',
    //改为占位符，等待从 Tauri 动态获取
    defaultValue: 'Loading...', 
  },
];