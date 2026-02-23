import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { SettingItem } from "../../domain/types";
import { useSettingsStore } from "../../application/useSettingsStore";
import { useThemeSyncLogic } from "../../application/useThemeSyncLogic"; // 引入逻辑 Hook

// Sub Components
import { BackgroundManager } from "./BackgroundManager";
import { BackupManager } from "./BackupManager";
import { FontSelector } from "./FontSelector";
import { ThemeManager } from "./ThemeManager"; 
import { ProxyManager } from "./ProxyManager";
import { SliderItemRenderer } from "./SliderItemRenderer"; 
import { ImageItemRenderer } from "./ImageItemRenderer";   
import { ShortcutInput } from "./ShortcutInput";
import { HighlightManager } from "./HighlightManager";
import { HighlightAssigner } from "./highlight/HighlightAssigner";

interface Props {
  item: SettingItem;
  value: any;
  onChange: (val: any) => void;
}

export const SettingItemRenderer = ({ item, value, onChange }: Props) => {
  const { t } = useTranslation();
  const settings = useSettingsStore(s => s.settings);
  const customThemes = useSettingsStore(s => s.customThemes);
  
  // 🟢 使用 Hook 获取处理过的业务数据
  const { getDisplayLabel, handleSwitchChange } = useThemeSyncLogic();

  const containerClass = clsx(
    "flex items-center justify-between",
    "py-3 px-4 my-1 rounded-xl", 
    "transition-colors duration-200",
    "hover:bg-black/5 dark:hover:bg-white/5" 
  );

  // 1. 依赖检查
  if (item.dependencyId) {
      const depValue = settings[item.dependencyId];
      if (depValue !== item.dependencyValue) return null;
  }

  // 2. 特殊组件分发
  if (item.type === 'proxy-manager') return <ProxyManager />;
  if (item.type === 'theme-manager') return <ThemeManager />;
  if (item.type === 'background-manager') return <BackgroundManager />;
  if (item.type === 'backup-manager') return <BackupManager />;
  if (item.type === 'highlight-manager') return <HighlightManager />;
  if (item.type === 'highlight-assigner') return <HighlightAssigner />;
  if (item.type === 'font-selector') {
      return (
        <div className={clsx(containerClass, "!items-start")}>
            <div className="flex-none mr-4 pt-1.5"> 
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {t(item.labelKey)}
                </div>
                {item.descKey && <div className="text-xs text-slate-500 mt-0.5 max-w-[150px] truncate opacity-80">{t(item.descKey)}</div>}
            </div>
            <div className="flex-1 min-w-0 flex justify-end"><FontSelector value={value} onChange={onChange} /></div>
        </div>
      );
  }

  // 3. 动态 Label 和 业务逻辑
  const displayLabel = getDisplayLabel(item);

  if (item.type === 'slider') {
      return <SliderItemRenderer item={item} value={value} onChange={onChange} displayLabel={displayLabel} containerClass={containerClass} />;
  }

  if (item.type === 'image') {
      return <ImageItemRenderer item={item} value={value} onChange={onChange} displayLabel={displayLabel} containerClass={containerClass} />;
  }

  // 4. 下拉框选项处理 (Standard Renderers)
  let options = item.options || [];
  const isThemeSelector = (item.id.includes('Theme') || item.id === 'terminal.theme') && !item.id.includes('appTheme');
  if (isThemeSelector) {
      const customOptions = Object.values(customThemes).map(th => ({ label: th.name, value: th.id }));
      const uniqueBuiltins = options.filter(opt => !customThemes[opt.value]);
      options = [...uniqueBuiltins, ...customOptions];
  }
  
  if (item.type === 'shortcut') {
    return (
      <div className={containerClass}>
        <div className="flex-1 mr-4">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{displayLabel}</div>
          {item.descKey && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{t(item.descKey)}</div>}
        </div>
        <div className="shrink-0 w-48 flex justify-end">
           <ShortcutInput value={value} onChange={onChange} />
        </div>
      </div>
    );
  }
  
  return (
    <div className={containerClass}>
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{displayLabel}</div>
        {item.descKey && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{t(item.descKey)}</div>}
      </div>
      <div className="shrink-0 w-48 flex justify-end items-center">
        {item.type === 'switch' && (
            <Switch 
                checked={!!value} 
                onCheckedChange={(checked) => handleSwitchChange(item, checked, onChange)} 
            />
        )}
        {item.type === 'input' && <Input value={value || ''} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm bg-transparent" />}
        {item.type === 'select' && (
          <Select value={String(value)} onValueChange={onChange}>
            <SelectTrigger className="h-8 w-full bg-transparent border-slate-200/60 dark:border-slate-700/60"><SelectValue /></SelectTrigger>
            <SelectContent>{options.map((opt) => <SelectItem key={opt.value} value={String(opt.value)}>{opt.labelKey ? t(opt.labelKey) : opt.label}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {/*[新增] 支持 info 类型，纯文本展示 */}
        {item.type === 'info' && (
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono">
            {String(value || '')}
          </span>
        )}
      </div>
    </div>
  );
};