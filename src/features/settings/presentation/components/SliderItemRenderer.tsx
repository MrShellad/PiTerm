import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { SettingItem } from "../../domain/types";

interface Props {
  item: SettingItem;
  value: any;
  onChange: (val: any) => void;
  displayLabel: string;
  containerClass: string;
}

export const SliderItemRenderer = ({ 
  item, value, onChange, displayLabel, containerClass 
}: Props) => {
  const { t } = useTranslation();
  const min = item.min ?? 0;
  const max = item.max ?? 100;
  const step = item.step ?? 1;

  const [localValue, setLocalValue] = useState(Number(value) || 0);
  
  useEffect(() => {
    setLocalValue(Number(value) || 0);
  }, [value]);

  const lastUpdateRef = useRef(0);

  const handleSliderChange = ([val]: number[]) => {
    setLocalValue(val);
    const now = Date.now();
    // 简单的节流，防止滑动时过度频繁触发渲染
    if (now - lastUpdateRef.current > 60) {
        onChange(val);
        lastUpdateRef.current = now;
    }
  };

  const handleSliderCommit = ([val]: number[]) => {
      onChange(val);
      lastUpdateRef.current = Date.now();
  };

  const displayValue = item.unit === '%' 
      ? `${Math.round((localValue) * 100)}%` 
      : `${localValue}${item.unit || ''}`;

  return (
    <div className={containerClass}>
      {/* 🟢 [优化] 移除了无意义的 mr-8，改为 w-full pr-4 保证和其它设置项右侧对齐 */}
      <div className="flex-1 w-full pr-1">
        <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{displayLabel}</div>
            <div className="text-xs font-mono font-medium text-slate-500 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded min-w-[3rem] text-center">
                {displayValue}
            </div>
        </div>
        
        <Slider 
            value={[localValue]} 
            min={min} 
            max={max} 
            step={step} 
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            className="py-1 cursor-pointer"
        />
        
         {item.descKey && <div className="text-[10px] text-slate-400 mt-2.5">{t(item.descKey)}</div>}
      </div>
    </div>
  );
};