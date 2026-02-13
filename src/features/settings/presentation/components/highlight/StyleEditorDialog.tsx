import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Palette, Check, Droplets } from "lucide-react";
import { clsx } from "clsx";
import { BaseModal } from "@/components/common/BaseModal";
import { CustomInput } from "@/components/common/CustomInput";
import { CustomButton } from "@/components/common/CustomButton";
import { HighlightStyle } from "../../../domain/types";
import { useSettingsStore } from "../../../application/useSettingsStore";

// 引入 UI 组件
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    styleToEdit?: HighlightStyle | null;
}

// ----------------------------------------------------------------------
// 辅助工具：颜色处理 (Hex <-> Hex8)
// ----------------------------------------------------------------------
const PRESET_COLORS = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
    "#00FFFF", "#FF00FF", "#C0C0C0", "#808080", "#800000", "#808000", 
    "#008000", "#800080", "#008080", "#000080", "#f87171", "#fbbf24", 
    "#34d399", "#60a5fa", "#a78bfa", "#f472b6"
];

// 将 6位/3位 Hex 转为 8位 (#RRGGBBAA)
const toHex8 = (hex: string, alpha: number): string => {
    let color = hex.replace("#", "");
    if (color.length === 3) color = color.split("").map(c => c + c).join("");
    if (color.length > 6) color = color.substring(0, 6);
    
    // 如果是 100% 不透明，返回 6位 hex
    if (alpha >= 100) return `#${color}`;

    const a = Math.round((alpha / 100) * 255);
    const alphaHex = (a | 1 << 8).toString(16).slice(1);
    return `#${color}${alphaHex}`;
};

// 解析 Hex 中的 Alpha 值 (0-100)
const getAlphaFromHex = (hex: string): number => {
    if (!hex) return 100;
    const clean = hex.replace("#", "");
    if (clean.length === 8) {
        return Math.round((parseInt(clean.substring(6), 16) / 255) * 100);
    }
    return 100;
};

// 获取不含 Alpha 的纯色 Hex
const getSolidHex = (hex: string): string => {
    if (!hex) return "";
    const clean = hex.replace("#", "");
    if (clean.length === 8) return `#${clean.substring(0, 6)}`;
    return hex;
};

// ----------------------------------------------------------------------
// 子组件：带透明度的颜色选择器
// ----------------------------------------------------------------------
interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

const ColorPickerInput = ({ label, value, onChange, placeholder }: ColorPickerProps) => {
    const { t } = useTranslation(); // 🟢 引入本地化
    const solidColor = useMemo(() => getSolidHex(value) || "#000000", [value]);
    const alpha = useMemo(() => getAlphaFromHex(value), [value]);

    const handleColorSelect = (hex: string) => {
        onChange(toHex8(hex, alpha));
    };

    const handleAlphaChange = (newAlpha: number) => {
        onChange(toHex8(solidColor, newAlpha));
    };

    const handleClear = () => {
        onChange("");
    };

    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
            <div className="flex gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="relative w-10 h-9 rounded border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden shadow-sm group focus:ring-2 ring-blue-500 ring-offset-2 transition-all">
                            {/* 棋盘格背景 (表示透明) */}
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIi8+CjxwYXRoIGQ9Ik0wIDBMMCA0TDQgNEw0IDBaTTQgNEw0IDhMOCA4TDggNFoiIGZpbGw9IiNlZWVlZWUiLz4KPC9zdmc+')] opacity-50" />
                            
                            {/* 颜色层 */}
                            <div 
                                className="absolute inset-0 transition-colors" 
                                style={{ backgroundColor: value || 'transparent' }} 
                            />
                            
                            {/* 空值提示 */}
                            {!value && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-[1px] bg-red-500 rotate-45" />
                                </div>
                            )}
                        </button>
                    </PopoverTrigger>
                    
                    {/* 🟢 [关键修复] z-[200] 确保在 Modal 之上 */}
                    <PopoverContent className="w-64 p-3 z-[200]" align="start">
                        <div className="space-y-3">
                            {/* 1. 预设颜色网格 */}
                            <div className="grid grid-cols-6 gap-1.5">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={clsx(
                                            "w-8 h-8 rounded border transition-all hover:scale-110 focus:outline-none focus:ring-2 ring-offset-1 ring-blue-500",
                                            solidColor.toLowerCase() === c.toLowerCase() ? "border-blue-500 shadow-md scale-110" : "border-slate-200 dark:border-slate-700"
                                        )}
                                        style={{ backgroundColor: c }}
                                        onClick={() => handleColorSelect(c)}
                                    >
                                        {solidColor.toLowerCase() === c.toLowerCase() && (
                                            <Check className={clsx("w-4 h-4 mx-auto", getAlphaFromHex(c) > 50 ? "text-white drop-shadow-md" : "text-black")} />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800" />

                            {/* 2. 透明度滑块 */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">{t('settings.highlights.opacity', 'Opacity')}</span>
                                    <span className="font-mono">{alpha}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Droplets className="w-4 h-4 text-slate-400" />
                                    <Slider 
                                        value={[alpha]} 
                                        max={100} 
                                        step={1} 
                                        onValueChange={([v]) => handleAlphaChange(v)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            {/* 3. 清除按钮 */}
                            <CustomButton 
                                size="sm" 
                                variant="outline" 
                                className="w-full h-7 text-xs border-dashed text-slate-500 hover:text-red-500"
                                onClick={handleClear}
                            >
                                {t('settings.highlights.clearColor', 'Clear Color (Transparent)')}
                            </CustomButton>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* 手动输入框 */}
                <CustomInput 
                    value={value} 
                    onChange={e => onChange(e.target.value)} 
                    placeholder={placeholder || "#RRGGBBAA"}
                    className="font-mono text-xs"
                    maxLength={9}
                />
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 主弹窗组件
// ----------------------------------------------------------------------
export const StyleEditorDialog = ({ open, onOpenChange, styleToEdit }: Props) => {
    const { t } = useTranslation(); // 🟢 引入本地化
    const { saveStyle } = useSettingsStore();
    const [isLoading, setIsLoading] = useState(false);

    // Form State (仅保留颜色和名称)
    const [name, setName] = useState("");
    const [foreground, setForeground] = useState("");
    const [background, setBackground] = useState("");

    // Init
    useEffect(() => {
        if (open) {
            if (styleToEdit) {
                setName(styleToEdit.name);
                setForeground(styleToEdit.foreground || "");
                setBackground(styleToEdit.background || "");
            } else {
                setName("");
                setForeground("#FF0000"); // 默认红色前景色
                setBackground("");
            }
        }
    }, [open, styleToEdit]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        try {
            await saveStyle({
                id: styleToEdit?.id,
                name,
                foreground: foreground || null,
                background: background || null,
                // 🔴 已移除 isBold, isItalic, isUnderline
            });
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    // 预览区域 (仅展示颜色效果)
    const PreviewBox = () => (
        <div className="relative w-full h-16 mt-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner group">
            {/* 棋盘格背景 (显示透明度) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+CjxyZWN0IHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNMCAwTDAgOEw4IDhMOCAwWk04IDhMOCAxNkwxNiAxNkwxNiA4WiIgZmlsbD0iI2Y1ZjVZjUiLz4KPC9zdmc+')] opacity-50" />
            
            {/* 内容层 */}
            <div className="absolute inset-0 flex items-center justify-center transition-all bg-white/30 dark:bg-black/10 backdrop-blur-[1px]">
                <span style={{
                    color: foreground || 'inherit',
                    backgroundColor: background || 'transparent',
                }} className="text-lg px-4 py-2 rounded transition-all font-mono">
                    {t('settings.highlights.previewText', 'Preview Text 123')}
                </span>
            </div>

            <div className="absolute bottom-1 right-2 text-[9px] text-slate-400 opacity-50">
                {t('settings.highlights.livePreview', 'Live Preview')}
            </div>
        </div>
    );

    const footer = (
        <>
            <CustomButton variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t('common.cancel', 'Cancel')}
            </CustomButton>
            <CustomButton onClick={handleSubmit} disabled={!name || isLoading} isLoading={isLoading}>
                {t('common.save', 'Save')}
            </CustomButton>
        </>
    );

    return (
        <BaseModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={styleToEdit ? t('settings.highlights.editStyle', 'Edit Style') : t('settings.highlights.newStyle', 'New Style')}
            icon={<Palette className="w-5 h-5" />}
            footer={footer}
            className="max-w-[420px]"
        >
            <div className="space-y-5 py-2">
                <CustomInput 
                    label={t('settings.highlights.styleName', 'Style Name')} 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder={t('settings.highlights.styleNamePlaceholder', 'e.g. Error Red')}
                    required
                />

                <div className="grid grid-cols-2 gap-5">
                    <ColorPickerInput 
                        label={t('settings.highlights.foreground', 'Foreground')}
                        value={foreground}
                        onChange={setForeground}
                        placeholder="#FFFFFF"
                    />
                    
                    <ColorPickerInput 
                        label={t('settings.highlights.background', 'Background')}
                        value={background}
                        onChange={setBackground}
                        placeholder="#00000080"
                    />
                </div>

                <PreviewBox />
            </div>
        </BaseModal>
    );
};