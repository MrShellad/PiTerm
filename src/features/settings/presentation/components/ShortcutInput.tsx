import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { X, Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export const ShortcutInput = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当进入录制模式时，聚焦输入框
  useEffect(() => {
    if (isRecording) {
      inputRef.current?.focus();
    }
  }, [isRecording]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;
    
    e.preventDefault();
    e.stopPropagation();

    // 如果按下 Esc，取消录制
    if (e.key === "Escape") {
      setIsRecording(false);
      return;
    }

    // 忽略纯修饰键的按压
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return;
    }

    // 也就是 Backspace 删除快捷键
    if (e.key === "Backspace" || e.key === "Delete") {
      onChange("");
      setIsRecording(false);
      return;
    }

    // 构建快捷键字符串
    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    if (e.metaKey) parts.push("Meta");
    
    // 处理主键：将 key 转为大写 (e.g., 'l' -> 'L', 'ArrowUp' -> 'ArrowUp')
    const mainKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(mainKey);

    const shortcut = parts.join("+");
    onChange(shortcut);
    setIsRecording(false);
  };

  return (
    <div className="relative w-full">
      <div 
        className={`relative flex items-center w-full rounded-md border text-base transition-colors ${
          isRecording 
            ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10" 
            : "border-slate-200 dark:border-slate-800 bg-transparent"
        }`}
      >
        <Input
          ref={inputRef}
          value={isRecording ? t('settings.security.pressKey', 'Press keys...') : (value || t('common.none', 'None'))}
          readOnly={!isRecording}
          onFocus={() => setIsRecording(true)}
          onBlur={() => setIsRecording(false)}
          onKeyDown={handleKeyDown}
          className="pr-8 bg-transparent border-none focus-visible:ring-0 cursor-pointer h-9 text-base"
        />
        
        <div className="absolute right-2 flex items-center">
          {value && !isRecording ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Keyboard className={`w-4 h-4 ${isRecording ? 'text-blue-500' : 'text-slate-400'}`} />
          )}
        </div>
      </div>
    </div>
  );
};