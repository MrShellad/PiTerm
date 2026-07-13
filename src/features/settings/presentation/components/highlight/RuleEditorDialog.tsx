import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Highlighter, Edit2, Plus, FileText } from "lucide-react";
import { BaseModal } from "@/components/common/BaseModal";
import { CustomInput } from "@/components/common/CustomInput";
import { CustomButton } from "@/components/common/CustomButton";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
// 🟢 移除了原有的 Select 组件，引入统一的 CustomSelect
import { CustomSelect } from "@/components/common/CustomSelect";

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
    const [description, setDescription] = useState(""); 
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
                setDescription(ruleToEdit.description || ""); 
                setIsRegex(ruleToEdit.isRegex);
                setIsCaseSensitive(ruleToEdit.isCaseSensitive);
                setPriority(ruleToEdit.priority);
                setStyleId(ruleToEdit.styleId);
            } else {
                setPattern("");
                setDescription(""); 
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
                setId: setId,
                styleId: styleId,
                pattern: pattern,
                description: description, 
                isRegex: isRegex,
                isCaseSensitive: isCaseSensitive,
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

    // 🟢 将 savedStyles 转换为 CustomSelect 需要的 options 格式
    const styleOptions = savedStyles.map(style => ({
        label: style.name,
        value: style.id,
        // 将颜色小圆点作为 icon 传入
        icon: (
            <div 
                className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10 shadow-sm" 
                style={{ background: style.foreground || 'currentColor' }} 
            />
        )
    }));

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
                {/* Pattern 输入 */}
                <CustomInput 
                    label={t('settings.highlights.patternLabel', 'Pattern (Keyword or Regex)')}
                    value={pattern} 
                    onChange={(e) => setPattern(e.target.value)} 
                    placeholder={t('settings.highlights.patternPlaceholder', 'e.g. error, \\d{3}, user@host')}
                    className="font-mono text-sm"
                    startIcon={<Highlighter className="w-4 h-4" />}
                />

                {/* Description 输入 */}
                <CustomInput 
                    label={t('settings.highlights.descriptionLabel', 'Description (Optional)')}
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder={t('settings.highlights.descriptionPlaceholder', 'e.g. Highlight critical errors')}
                    startIcon={<FileText className="w-4 h-4" />}
                />

                {/* Style Selection */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t('settings.highlights.styleLabel', 'Style')}
                    </Label>
                    
                    {/* 🟢 使用 CustomSelect 替换原生 Select */}
                    <CustomSelect
                        value={styleId}
                        onChange={(val) => setStyleId(String(val))}
                        options={styleOptions}
                        placeholder={t('settings.highlights.selectStylePlaceholder', 'Select a style')}
                    />

                    {savedStyles.length === 0 && (
                        <p className="text-[0.625rem] text-red-500">
                            {t('settings.highlights.createStylesFirst', 'Please create styles in the database first.')}
                        </p>
                    )}
                </div>

                {/* Flags Group */}
                <div className="flex flex-col gap-3 border border-slate-200/60 dark:border-slate-800/60 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="regex" checked={isRegex} onCheckedChange={(v) => setIsRegex(!!v)} />
                        <Label htmlFor="regex" className="font-normal cursor-pointer text-sm select-none">
                            {t('settings.highlights.regularExpression', 'Regular Expression')}
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="case" checked={isCaseSensitive} onCheckedChange={(v) => setIsCaseSensitive(!!v)} />
                        <Label htmlFor="case" className="font-normal cursor-pointer text-sm select-none">
                            {t('settings.highlights.caseSensitive', 'Case Sensitive')}
                        </Label>
                    </div>
                </div>

                {/* Priority */}
                <CustomInput 
                    label={t('settings.highlights.priorityLabel', 'Priority')}
                    type="number" 
                    value={priority} 
                    onChange={(e) => setPriority(Number(e.target.value))} 
                    className="font-mono text-sm"
                    description={t('settings.highlights.priorityDescription', 'Higher numbers match first.')}
                />
            </div>
        </BaseModal>
    );
};