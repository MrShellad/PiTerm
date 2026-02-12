import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Palette, Bold, Italic, Underline } from "lucide-react";
import { clsx } from "clsx";
import { BaseModal } from "@/components/common/BaseModal";
import { CustomInput } from "@/components/common/CustomInput";
import { CustomButton } from "@/components/common/CustomButton";
import { HighlightStyle } from "../../../domain/types";
import { useSettingsStore } from "../../../application/useSettingsStore";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    styleToEdit?: HighlightStyle | null;
}

export const StyleEditorDialog = ({ open, onOpenChange, styleToEdit }: Props) => {
    const { t } = useTranslation();
    const { saveStyle } = useSettingsStore();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [foreground, setForeground] = useState("");
    const [background, setBackground] = useState("");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);

    // Init
    useEffect(() => {
        if (open) {
            if (styleToEdit) {
                setName(styleToEdit.name);
                setForeground(styleToEdit.foreground || "");
                setBackground(styleToEdit.background || "");
                setIsBold(styleToEdit.isBold);
                setIsItalic(styleToEdit.isItalic);
                setIsUnderline(styleToEdit.isUnderline);
            } else {
                setName("");
                setForeground("#FF0000"); // Default Red
                setBackground("");
                setIsBold(false);
                setIsItalic(false);
                setIsUnderline(false);
            }
        }
    }, [open, styleToEdit]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        try {
            await saveStyle({
                id: styleToEdit?.id, // 传 ID 则为更新
                name,
                foreground: foreground || null,
                background: background || null,
                is_bold: isBold,
                is_italic: isItalic,
                is_underline: isUnderline
            });
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    // 样式切换按钮组件
    const StyleToggle = ({ active, onClick, icon: Icon }: any) => (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                "p-2 rounded-md border transition-all",
                active 
                    ? "bg-blue-500 text-white border-blue-600 shadow-sm" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
        >
            <Icon className="w-4 h-4" />
        </button>
    );

    // 预览区域
    const PreviewBox = () => (
        <div className="w-full h-12 mt-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-100 dark:bg-black/20">
            <span style={{
                color: foreground || 'inherit',
                backgroundColor: background || 'transparent',
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
            }} className="text-sm px-2">
                Preview Text 123
            </span>
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
            title={styleToEdit ? "Edit Style" : "New Style"}
            icon={<Palette className="w-5 h-5" />}
            footer={footer}
            className="max-w-[400px]"
        >
            <div className="space-y-4 py-1">
                <CustomInput 
                    label="Style Name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Error Red"
                />

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Foreground</label>
                        <div className="flex gap-2">
                            <div className="w-8 h-9 rounded border border-slate-200 dark:border-slate-700 shrink-0" style={{background: foreground || 'transparent'}} />
                            <CustomInput 
                                value={foreground} 
                                onChange={e => setForeground(e.target.value)} 
                                placeholder="#FFFFFF"
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Background</label>
                        <div className="flex gap-2">
                            <div className="w-8 h-9 rounded border border-slate-200 dark:border-slate-700 shrink-0" style={{background: background || 'transparent'}} />
                            <CustomInput 
                                value={background} 
                                onChange={e => setBackground(e.target.value)} 
                                placeholder="Optional"
                                className="font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Effects</label>
                    <div className="flex gap-2">
                        <StyleToggle active={isBold} onClick={() => setIsBold(!isBold)} icon={Bold} />
                        <StyleToggle active={isItalic} onClick={() => setIsItalic(!isItalic)} icon={Italic} />
                        <StyleToggle active={isUnderline} onClick={() => setIsUnderline(!isUnderline)} icon={Underline} />
                    </div>
                </div>

                <PreviewBox />
            </div>
        </BaseModal>
    );
};