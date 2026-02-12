import { SettingItem } from "./types";
import { CATEGORIES } from "./categories";
import { generalItems } from "./items/general";
import { appearanceItems } from "./items/appearance";
import { terminalItems } from "./items/terminal";
import { connectionItems } from "./items/connection";
import { aboutItems } from "./items/about";
import { securityItems } from "./items/security";
import { highlightItems } from './items/highlights';
// 重新导出 CATEGORIES 供 Sidebar 使用
export { CATEGORIES };

const backupItems: SettingItem[] = [
  {
    id: 'backup.manager',
    categoryId: 'backup',
    type: 'backup-manager',
    labelKey: 'settings.nav.backup', // 这里的 LabelKey 其实用不到，因为 BackupManager 内部自己写了标题
  }
];

// 聚合所有配置项
export const SETTING_ITEMS: SettingItem[] = [
  ...generalItems,
  ...appearanceItems,
  ...terminalItems,
  ...highlightItems,
  ...connectionItems,
  ...securityItems,
  ...backupItems,
  ...aboutItems,
];