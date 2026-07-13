import { useState, useEffect, memo, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Palette, Check, Upload } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CustomTheme } from "../../domain/types";
import { BaseModal } from "@/components/common/BaseModal"; 
import { cn } from "@/lib/utils";
import { GlassTooltip } from "@/components/common/GlassTooltip";
import { useThemeImport, normalizeToHex } from "../../hooks/useThemeImport";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (theme: CustomTheme) => void;
  initialTheme?: CustomTheme;
  baseTheme?: CustomTheme;
}

const COLOR_FIELDS = [
  'background', 'foreground', 'cursor', 'selectionBackground',
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'
];

// ... [保留 parseColorValue, hexToRgbaString, ColorRow 组件代码不变] ...
// 为了节省篇幅，这里省略了工具函数和 ColorRow 的代码，请保持原样即可
// ... 

// 🟢 [工具] 解析颜色 (Hex 或 RGBA) -> { hex, alpha }
const parseColorValue = (value: string) => {
  let hex = "#000000";
  let alpha = 1;
  if (!value) return { hex, alpha };
  if (value.startsWith('#')) {
      hex = value;
      alpha = 1;
  } else if (value.startsWith('rgba')) {
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
           const r = parseInt(match[1]);
           const g = parseInt(match[2]);
           const b = parseInt(match[3]);
           const a = match[4] ? parseFloat(match[4]) : 1;
           const toHex = (n: number) => n.toString(16).padStart(2, '0');
           hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
           alpha = a;
      }
  } else if (value.startsWith('rgb')) {
      const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
           const r = parseInt(match[1]);
           const g = parseInt(match[2]);
           const b = parseInt(match[3]);
           const toHex = (n: number) => n.toString(16).padStart(2, '0');
           hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
  }
  return { hex, alpha };
};

const hexToRgbaString = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(2))})`;
};

const ColorRow = memo(({ field, value, onChange }: { 
  field: string; 
  value: string; 
  onChange: (field: string, val: string) => void 
}) => {
  const isAlphaSupported = field === 'selectionBackground';
  const { hex: safeHexValue, alpha } = useMemo(() => {
     if (isAlphaSupported) {
         return parseColorValue(value);
     }
     return { hex: normalizeToHex(value), alpha: 1 };
  }, [value, isAlphaSupported]);

  const displayLabel = field.replace(/([A-Z])/g, ' $1').trim();

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHex = e.target.value;
      if (isAlphaSupported) {
          onChange(field, hexToRgbaString(newHex, alpha));
      } else {
          onChange(field, newHex);
      }
  };

  const handleAlphaChange = (vals: number[]) => {
      const newAlpha = vals[0];
      onChange(field, hexToRgbaString(safeHexValue, newAlpha));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (isAlphaSupported) {
          onChange(field, val);
      } else {
          if (/^[0-9A-Fa-f]*$/.test(val)) {
              onChange(field, '#' + val);
          } else {
              onChange(field, val);
          }
      }
  };

  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm hover:shadow-md h-[68px]">
      <div className="relative shrink-0">
        <GlassTooltip content={isAlphaSupported ? `Alpha: ${Math.round(alpha * 100)}%` : "Click to pick color"}>
          <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner cursor-pointer transition-transform group-hover:scale-105 overflow-hidden relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')]">
             <div 
               className="absolute inset-0 w-full h-full"
               style={{ 
                   backgroundColor: safeHexValue,
                   opacity: isAlphaSupported ? alpha : 1 
               }} 
             />
             <input 
              type="color" 
              value={safeHexValue}
              onChange={handlePickerChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </GlassTooltip>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-slate-400 uppercase tracking-wider truncate">
               {displayLabel}
            </span>
            {isAlphaSupported && (
                <span className="text-base font-mono text-slate-400">
                    {Math.round(alpha * 100)}%
                </span>
            )}
        </div>

        <div className="flex items-center gap-2">
           <div className="relative flex-1 min-w-0 flex items-center">
               {!isAlphaSupported && value.startsWith('#') && (
                   <span className="absolute left-0 text-slate-400 text-base select-none">#</span>
               )}
               <input 
                 type="text"
                 value={!isAlphaSupported && value.startsWith('#') ? value.replace('#', '') : value}
                 onChange={handleTextChange}
                 className={cn(
                     "w-full bg-transparent border-none p-0 h-6 text-base font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-0 truncate",
                     !isAlphaSupported && value.startsWith('#') ? "pl-3.5 uppercase" : "pl-0"
                 )}
               />
           </div>

           {isAlphaSupported && (
               <div className="w-20 shrink-0">
                   <Slider 
                      value={[alpha]} 
                      min={0} 
                      max={1} 
                      step={0.01} 
                      onValueChange={handleAlphaChange}
                      className="cursor-pointer"
                   />
               </div>
           )}
        </div>
      </div>
      
      <div className="w-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
         <Check className="w-4 h-4" />
      </div>
    </div>
  );
}, (prev, next) => prev.value === next.value);


export const ThemeEditorModal = ({ isOpen, onClose, onSave, initialTheme, baseTheme }: Props) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [colors, setColors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { importFromFile, isImporting } = useThemeImport();

  useEffect(() => {
    if (isOpen) {
      const source = initialTheme || baseTheme;
      if (source) {
        setName(initialTheme ? source.name : `${source.name} Copy`);
        const initColors = { ...source };
        // @ts-ignore
        delete initColors.id;
        // @ts-ignore
        delete initColors.name;
        // @ts-ignore
        delete initColors.isBuiltin;
        setColors(initColors as any);
      } else {
        setName("New Theme");
        setColors({ background: '#000000', foreground: '#ffffff' }); 
      }
    }
  }, [isOpen, initialTheme, baseTheme]);

  const handleSave = () => {
    if (!name) return;
    const finalId = initialTheme?.id || `custom-${Date.now()}`;
    
    const finalColors: any = {};
    COLOR_FIELDS.forEach(field => {
        finalColors[field] = colors[field] || '#000000';
    });

    const newTheme: CustomTheme = {
      ...finalColors,     
      id: finalId,    
      name,
      isBuiltin: false
    };
    onSave(newTheme);
    onClose();
  };

  const handleColorChange = useCallback((key: string, val: string) => {
    setColors(prev => {
        if (prev[key] === val) return prev;
        return { ...prev, [key]: val };
    });
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const result = await importFromFile(file);
    if (result.success) {
      const newColors: Record<string, string> = {};
      COLOR_FIELDS.forEach(field => {
        newColors[field] = result.colors[field] || '#000000';
      });
      setColors(newColors);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTheme ? t('settings.theme.edit', 'Edit Theme') : t('settings.theme.add', 'New Theme')}
      icon={<Palette className="w-5 h-5" />}
      // 🟢 [修改] 1. 添加 h-[80vh] 限制高度，允许 flex 生效
      className="max-w-3xl h-[80vh]"
    >
      {/* 🟢 [修改] 2. 使用 Flex 布局容器，占满高度 */}
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* 🟢 [修改] 3. 滚动区域：flex-1 overflow-y-auto */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <div className="space-y-6 p-1"> {/* 添加 padding 防止 focus 样式被切 */}
            
            {/* 名字输入区域 */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <Label htmlFor="theme-name" className="text-base font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                {t('settings.theme.name', 'Theme Name')}
              </Label>
              
              <div className="flex gap-2">
                <Input 
                  id="theme-name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Ocean Breeze"
                  className="bg-white dark:bg-slate-950 font-medium text-lg h-10 flex-1 text-base"
                />
                
                <GlassTooltip content="Import Termite/INI Config">
                  <Button 
                    variant="outline" 
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="h-10 text-base shrink-0 gap-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-4"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                </GlassTooltip>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  accept=".config,.ini,text/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* 颜色列表 */}
            <div>
              <Label className="text-base font-bold text-slate-500 uppercase tracking-wider mb-3 block px-1">
                Color Palette
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {COLOR_FIELDS.map(field => (
                   <ColorRow 
                     key={field} 
                     field={field} 
                     value={colors[field] || '#000000'} 
                     onChange={handleColorChange} 
                   />
                 ))}
              </div>
            </div>
            
            {/* 底部占位，防止内容紧贴底部按钮 */}
            <div className="h-2"></div>
          </div>
        </div>

        {/* 🟢 [修改] 4. 固定底部按钮区域 */}
        <div className="shrink-0 flex items-center justify-end gap-3 pt-4 mt-2 border-t">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="h-10 text-base hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 px-4"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSave}
            className="h-10 text-base bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] shadow-lg shadow-blue-500/20 px-4"
          >
            {t('common.save', 'Save Theme')}
          </Button>
        </div>

      </div>
    </BaseModal>
  );
};