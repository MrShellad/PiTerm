import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Highlighter, Edit2, Plus } from "lucide-react";
// 🟢 [修改] 引入公共组件
import { BaseModal } from "@/components/common/BaseModal";
import { CustomInput } from "@/components/common/CustomInput";
import { CustomButton } from "@/components/common/CustomButton";

// 保留 Select 和 Checkbox (因为没有提供对应的 Custom 版本)
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useSettingsStore } from "../../../application/useSettingsStore";
import { HighlightRule } from "../../../domain/types";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setId: string;
    ruleToEdit?: HighlightRule | null;
    onSave: () => void;
}

export const RuleEditorDialog = ({ open, onOpenChange, setId, ruleToEdit, onSave }: Props) => {
    const { t } = useTranslation();
    const { savedStyles, loadStyles, saveRule, deleteRule } = useSettingsStore();

    // 表单状态
    const [pattern, setPattern] = useState("");
    const [isRegex, setIsRegex] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [priority, setPriority] = useState(0);
    const [styleId, setStyleId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    // 加载样式列表
    useEffect(() => {
        if (open) loadStyles();
    }, [open]);

    // 初始化表单数据
    useEffect(() => {
        if (open) {
            if (ruleToEdit) {
                setPattern(ruleToEdit.pattern);
                setIsRegex(ruleToEdit.isRegex);
                setIsCaseSensitive(ruleToEdit.isCaseSensitive);
                setPriority(ruleToEdit.priority);
                setStyleId(ruleToEdit.styleId);
            } else {
                setPattern("");
                setIsRegex(false);
                setIsCaseSensitive(false);
                setPriority(0);
                if (savedStyles.length > 0 && !styleId) {
                    setStyleId(savedStyles[0].id);
                }
            }
        }
    }, [open, ruleToEdit, savedStyles]);

    const handleSubmit = async () => {
        if (!pattern.trim() || !styleId) return;
        setIsLoading(true);

        try {
            // 1. 编辑模式先删除旧规则
            if (ruleToEdit) {
                await deleteRule(ruleToEdit.id);
            }

            // 2. 创建新规则
            await saveRule({
                set_id: setId,
                style_id: styleId,
                pattern: pattern,
                is_regex: isRegex,
                is_case_sensitive: isCaseSensitive,
                priority: priority
            });

            onSave();
            onOpenChange(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // 构建 Footer 按钮组
    const footerContent = (
        <>
            <CustomButton 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                disabled={isLoading}
            >
                {t('common.cancel', 'Cancel')}
            </CustomButton>
            <CustomButton 
                onClick={handleSubmit} 
                disabled={!pattern || !styleId || isLoading}
                isLoading={isLoading}
            >
                {t('common.save', 'Save')}
            </CustomButton>
        </>
    );

    return (
        <BaseModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={ruleToEdit ? t('settings.highlights.editRule', 'Edit Rule') : t('settings.highlights.addRule', 'Add Rule')}
            icon={ruleToEdit ? <Edit2 className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
            footer={footerContent}
            className="max-w-[450px]"
        >
            <div className="grid gap-5 py-1">
                {/* 🟢 使用 CustomInput */}
                <CustomInput 
                    label="Pattern (Keyword or Regex)"
                    value={pattern} 
                    onChange={(e) => setPattern(e.target.value)} 
                    placeholder="e.g. error, \d{3}, user@host"
                    className="font-mono text-sm"
                    startIcon={<Highlighter className="w-4 h-4" />}
                />

                {/* Style Selection (保留原生 Select，但优化样式适配) */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Style</Label>
                    <Select value={styleId} onValueChange={setStyleId}>
                        <SelectTrigger className="w-full backdrop-blur-xl bg-white/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80">
                            <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                            {savedStyles.length === 0 ? (
                                <div className="p-2 text-xs text-slate-400 text-center">No styles available</div>
                            ) : (
                                savedStyles.map(style => (
                                    <SelectItem key={style.id} value={style.id}>
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10 shadow-sm" 
                                                style={{ background: style.foreground || 'currentColor' }} 
                                            />
                                            <span className="font-medium">{style.name}</span>
                                        </div>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    {savedStyles.length === 0 && (
                        <p className="text-[10px] text-red-500">Please create styles in the database first.</p>
                    )}
                </div>

                {/* Flags Group */}
                <div className="flex flex-col gap-3 border border-slate-200/60 dark:border-slate-800/60 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="regex" checked={isRegex} onCheckedChange={(v) => setIsRegex(!!v)} />
                        <Label htmlFor="regex" className="font-normal cursor-pointer text-sm select-none">Regular Expression</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="case" checked={isCaseSensitive} onCheckedChange={(v) => setIsCaseSensitive(!!v)} />
                        <Label htmlFor="case" className="font-normal cursor-pointer text-sm select-none">Case Sensitive</Label>
                    </div>
                </div>

                {/* 🟢 使用 CustomInput 处理 Priority */}
                <CustomInput 
                    label="Priority"
                    type="number" 
                    value={priority} 
                    onChange={(e) => setPriority(Number(e.target.value))} 
                    className="font-mono text-sm"
                    description="Higher numbers match first."
                />
            </div>
        </BaseModal>
    );
};