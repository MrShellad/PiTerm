import { LucideIcon } from "lucide-react";

export type SettingCategory = 
  | 'general' 
  | 'appearance' 
  | 'terminal' 
  | 'highlights'
  | 'connection' 
  | 'security'
  | 'backup' 
  | 'about';

export type SettingItemType = 
  | 'switch' | 'input' | 'select' | 'info' | 'button' 
  | 'theme-manager'     
  | 'highlight-manager'
  | 'proxy-manager' 
  | 'background-manager'
  | 'font-selector'
  | 'image'
  | 'slider'
  | 'backup-manager'
  | 'shortcut';

// [新增] 代理类型定义
export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5';

export interface ProxyItem {
  id: string;
  name: string; 
  type: ProxyType;
  host: string;
  port: number;
  // 敏感字段 (加密存储)
  encryptedAuth?: string; 
  //[新增] 必须添加此字段以匹配 Rust 后端
  createdAt: number; 
  updatedAt: number;
}

export interface SettingOption {
  label?: string;
  labelKey?: string;
  value: string | number;
}

export interface SettingItem {
  id: string;
  categoryId: SettingCategory;
  type: SettingItemType;
  labelKey: string;       
  descKey?: string;       
  defaultValue?: any;
  options?: SettingOption[]; 
  dependencyId?: string;
  dependencyValue?: any;

  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface CategoryMeta {
  id: SettingCategory;
  labelKey: string;
  icon: LucideIcon;
  isBottom?: boolean; 
}

export interface HighlightRule {
  id: string;
  setId: string;
  styleId: string;
  pattern: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  priority: number;
  style?: HighlightStyle; 
  createdAt?: number; // 新增
  updatedAt?: number; // 新增
}

export interface HighlightRuleSet {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  updatedAt: number;
  createdAt?: number; // 🟢 补全这个字段
}

export interface HighlightStyle {
  id: string;
  name: string;
  foreground?: string;
  background?: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  createdAt?: number; // 新增
  updatedAt?: number; // 新增
}

export interface CustomTheme {
  id: string;
  name: string;
  isBuiltin?: boolean; 

  // 基础颜色
  foreground?: string;
  background?: string;
  cursor?: string;
  cursorAccent?: string;
  selectionBackground?: string;
  selectionForeground?: string;
  selectionInactiveBackground?: string;

  // ANSI 16色
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;

  [key: string]: any;
}