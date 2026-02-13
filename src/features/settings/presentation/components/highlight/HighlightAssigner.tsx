import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Server, Link, Unlink, Plus, Palette } from "lucide-react";

import { useSettingsStore } from "../../../application/useSettingsStore";
import { CustomButton } from "@/components/common/CustomButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CustomSelect } from "@/components/common/CustomSelect";

export const HighlightAssigner = () => {
    const { t } = useTranslation();
    const { 
        servers = [], 
        highlightSets = [], 
        highlightAssignments = [], 
        loadHighlightAssignments, 
        assignHighlightSet, 
        unassignHighlightSet,
        loadServers
    } = useSettingsStore();

    const [selectedTarget, setSelectedTarget] = useState<string>("");
    const [selectedSet, setSelectedSet] = useState<string>("");
    const [targetToDelete, setTargetToDelete] = useState<string | null>(null);

    // 初始加载
    useEffect(() => {
        loadHighlightAssignments();
        loadServers();
    }, []);

    // 1. 计算所有可选的 Target (全局 + 所有服务器)
    const allAvailableTargets = [
        { id: 'global', name: t('settings.highlights.globalTarget', 'Global (All Servers)'), type: 'global' as const },
        ...servers.map(s => ({ 
            id: s.id, 
            name: s.name || s.ip, 
            type: 'server' as const 
        }))
    ];

    // 2. 过滤掉已经分配过的 Target
    const unassignedTargets = allAvailableTargets.filter(
        target => !highlightAssignments.some(a => a.targetId === target.id)
    );

    // 🟢 3. 转换为 CustomSelect 需要的 options 格式，并传入 Icon
    const targetOptions = unassignedTargets.map(t => ({
        label: t.name,
        value: t.id,
        // 根据类型动态分配图标和颜色
        icon: t.type === 'global' 
            ? <Globe className="w-4 h-4 text-blue-500" /> 
            : <Server className="w-4 h-4 text-emerald-500" />
    }));

    // 🟢 4. 给规则集也加上调色板图标，保持 UI 统一感
    const setOptions = highlightSets.map(s => ({
        label: s.name,
        value: s.id,
        icon: <Palette className="w-4 h-4 text-slate-400" />
    }));

    const handleAssign = async () => {
        if (!selectedTarget || !selectedSet) return;
        const targetObj = allAvailableTargets.find(t => t.id === selectedTarget);
        if (targetObj) {
            await assignHighlightSet(targetObj.id, targetObj.type, selectedSet);
            setSelectedTarget(""); 
            setSelectedSet("");
        }
    };

    return (
        <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-black/20 flex items-center gap-2 rounded-t-xl">
                <Link className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('settings.highlights.assignments', 'Rule Set Assignments')}
                </h3>
            </div>

            <div className="p-4 space-y-4">
                {/* 已经分配的列表 */}
                {highlightAssignments.length > 0 ? (
                    <div className="grid gap-2">
                        {highlightAssignments.map(assignment => {
                            const targetObj = allAvailableTargets.find(t => t.id === assignment.targetId);
                            const setObj = highlightSets.find(s => s.id === assignment.setId);
                            
                            if (!targetObj || !setObj) return null;

                            return (
                                <div key={assignment.targetId} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        {assignment.targetType === 'global' ? (
                                            <Globe className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <Server className="w-4 h-4 text-emerald-500" />
                                        )}
                                        <span className="text-sm font-medium">{targetObj.name}</span>
                                        <span className="text-slate-300 dark:text-slate-600 mx-2">→</span>
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            <Palette className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                {setObj.name}
                                            </span>
                                        </div>
                                    </div>
                                    <CustomButton 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => setTargetToDelete(assignment.targetId)}
                                    >
                                        <Unlink className="w-3.5 h-3.5 mr-1" />
                                        {t('common.unbind', 'Unbind')}
                                    </CustomButton>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 text-center py-4 opacity-70">
                        {t('settings.highlights.noAssignments', 'No rule sets assigned yet. Global traffic will use default styling.')}
                    </div>
                )}

                {/* 新增分配表单 */}
                <div className="flex items-center gap-3 p-3 bg-slate-100/50 dark:bg-slate-950/50 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                    
                    {/* 使用 CustomSelect 渲染 Target */}
                    <CustomSelect 
                        className="w-[220px]"
                        value={selectedTarget}
                        onChange={(val) => setSelectedTarget(String(val))}
                        options={targetOptions}
                        placeholder={t('settings.highlights.selectTarget', 'Select Server / Global')}
                    />

                    <span className="text-slate-400">→</span>

                    {/* 使用 CustomSelect 渲染 Profile */}
                    <CustomSelect 
                        className="w-[220px]"
                        value={selectedSet}
                        onChange={(val) => setSelectedSet(String(val))}
                        options={setOptions}
                        placeholder={t('settings.highlights.selectProfile', 'Select Profile')}
                    />

                    <CustomButton 
                        size="sm" 
                        onClick={handleAssign} 
                        disabled={!selectedTarget || !selectedSet}
                        className="ml-auto"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        {t('common.add', 'Assign')}
                    </CustomButton>
                </div>
            </div>

            {/* 取消绑定确认弹窗 */}
            <ConfirmDialog
                open={!!targetToDelete}
                onOpenChange={(open) => !open && setTargetToDelete(null)}
                title={t('settings.highlights.unbindTitle', 'Remove Assignment')}
                description={t('settings.highlights.unbindDesc', 'Are you sure you want to unbind this rule set?')}
                cancelText={t('common.cancel', 'Cancel')}
                confirmText={t('common.unbind', 'Unbind')}
                variant="destructive"
                onConfirm={async () => {
                    if (targetToDelete) await unassignHighlightSet(targetToDelete);
                    setTargetToDelete(null);
                }}
            />
        </div>
    );
};