import { SettingItem } from "../types";
import { builtinThemeOptions } from "../options";

export const appearanceItems: SettingItem[] = [
  // --- 1. 应用主题模式 (System / Light / Dark) ---
  {
    id: 'appearance.appTheme',
    categoryId: 'appearance',
    type: 'select',
    labelKey: 'settings.appearance.appTheme',
    defaultValue: 'system',
    options: [
      { labelKey: 'settings.appearance.themeOptions.system', value: 'system' },
      { labelKey: 'settings.appearance.themeOptions.light', value: 'light' },
      { labelKey: 'settings.appearance.themeOptions.dark', value: 'dark' },
    ]
  },
  {
    id: 'appearance.lightThemeScheme',
    categoryId: 'appearance',
    type: 'select',
    labelKey: 'settings.appearance.lightThemeScheme',
    descKey: 'settings.appearance.lightThemeSchemeDesc',
    defaultValue: 'default',
    options: [
      { labelKey: 'settings.appearance.lightThemeOptions.default', value: 'default' },
      { labelKey: 'settings.appearance.lightThemeOptions.claude', value: 'claude' },
    ],
    dependencyId: 'appearance.appTheme',
    dependencyValue: ['light', 'system']
  },

  // 🟢 [新增] UI 字体设置
  {
    id: 'appearance.fontFamily',
    categoryId: 'appearance',
    type: 'font-selector',
    labelKey: 'settings.appearance.uiFont',
    descKey: 'settings.appearance.uiFontDesc', 
    defaultValue: '', // 默认为空，使用 CSS 定义的系统默认
  },

  // --- 2. 壁纸与背景管理 (新组件) ---
  // 🟢 [修改] 这里不再逐个列出 image/slider/switch，而是由 Manager 统一渲染左右分栏 UI
  {
      id: 'appearance.bgManager', 
      categoryId: 'appearance',
      type: 'background-manager', // 对应你在 types.ts 新增的类型
      labelKey: 'settings.appearance.background',
  },

  // --- 3. 终端主题设置 ---
  {
    id: 'appearance.syncTerminalTheme',
    categoryId: 'appearance',
    type: 'switch',
    labelKey: 'settings.appearance.syncTerminalTheme',
    descKey: 'settings.appearance.syncTerminalThemeDesc',
    defaultValue: false,
  },
  {
    id: 'terminal.theme',
    categoryId: 'appearance',
    type: 'select',
    labelKey: 'settings.appearance.terminalTheme',
    defaultValue: 'default',
    options: builtinThemeOptions,
    // 只有当“不同步”时，才显示这个单一选择
    dependencyId: 'appearance.syncTerminalTheme',
    dependencyValue: false, 
  },
  {
    id: 'appearance.lightTerminalTheme',
    categoryId: 'appearance',
    type: 'select',
    labelKey: 'settings.appearance.lightTerminalTheme',
    defaultValue: 'solarized', 
    options: builtinThemeOptions,
    // 只有当“同步”开启时，才显示亮色专用主题
    dependencyId: 'appearance.syncTerminalTheme',
    dependencyValue: true,
  },
  {
    id: 'appearance.darkTerminalTheme',
    categoryId: 'appearance',
    type: 'select',
    labelKey: 'settings.appearance.darkTerminalTheme',
    defaultValue: 'default',
    options: builtinThemeOptions,
    // 只有当“同步”开启时，才显示暗色专用主题
    dependencyId: 'appearance.syncTerminalTheme',
    dependencyValue: true,
  },

  // --- 4. 高级外观 (主题编辑器 & 高亮规则) ---
  {
    id: 'appearance.themeManager',
    categoryId: 'appearance',
    type: 'theme-manager',
    labelKey: 'settings.appearance.manageThemes',
    descKey: 'settings.appearance.manageThemesDesc',
  }
];