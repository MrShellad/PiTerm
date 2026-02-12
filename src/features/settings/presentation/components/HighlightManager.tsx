// src/features/settings/presentation/HighlightManager.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Edit2, Check, X, Search, Highlighter, Palette } from "lucide-react";
import { clsx } from "clsx";
import { useSettingsStore } from "../../application/useSettingsStore";

// 引入基础 UI 组件
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // 用于微小图标按钮

// 🟢 引入自定义公共组件
import { CustomButton } from "@/components/common/CustomButton";

// 🟢 引入业务弹窗
import { RuleEditorDialog } from "./highlight/RuleEditorDialog";
import { StyleManagerDialog } from "./highlight/StyleManagerDialog";
import { HighlightRule } from "../../domain/types";

export const HighlightManager = () => {
  const { t } = useTranslation();
  const { 
    highlightSets, 
    activeSetId, 
    currentSetRules, 
    loadHighlightSets, 
    loadRulesBySet,
    createHighlightSet,
    deleteRule,
  } = useSettingsStore();

  // Profile 创建状态
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");

  // 弹窗状态管理
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<HighlightRule | null>(null);
  const [isStyleManagerOpen, setIsStyleManagerOpen] = useState(false);

  // 1. 初始化加载 Profile 列表
  useEffect(() => {
    loadHighlightSets();
  }, []);

  // 2. 切换 Profile 时加载对应的规则
  useEffect(() => {
    if (activeSetId) {
        loadRulesBySet(activeSetId);
    }
  }, [activeSetId]);

  // 处理创建 Profile
  const handleCreateSet = async () => {
      if (!newSetName.trim()) return;
      await createHighlightSet(newSetName);
      setIsCreatingSet(false);
      setNewSetName("");
  };

  // 打开新增规则弹窗
  const handleOpenAdd = () => {
      setEditingRule(null);
      setIsRuleDialogOpen(true);
  };

  // 打开编辑规则弹窗
  const handleOpenEdit = (rule: HighlightRule) => {
      setEditingRule(rule);
      setIsRuleDialogOpen(true);
  };

  return (
    <div className="flex h-[500px] w-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 mt-2">
      
      {/* ======================= Left Sidebar: Profiles ======================= */}
      <div className="w-[200px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/50 dark:bg-black/20">
        <div className="p-3 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profiles</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCreatingSet(true)}>
                <Plus className="w-3.5 h-3.5" />
            </Button>
        </div>
        
        <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
                {/* 创建输入框 */}
                {isCreatingSet && (
                    <div className="flex items-center gap-1 mb-2 px-1 animate-in fade-in slide-in-from-top-1">
                        <Input 
                            value={newSetName} 
                            onChange={e => setNewSetName(e.target.value)} 
                            className="h-7 text-xs px-2" 
                            placeholder="Name..."
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleCreateSet()}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleCreateSet}><Check className="w-3 h-3"/></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setIsCreatingSet(false)}><X className="w-3 h-3"/></Button>
                    </div>
                )}

                {/* 空状态 */}
                {highlightSets.length === 0 && !isCreatingSet && (
                    <div className="text-[10px] text-slate-400 text-center py-4">
                        No profiles created
                    </div>
                )}

                {/* 列表渲染 */}
                {highlightSets.map(set => (
                    <div 
                        key={set.id}
                        onClick={() => loadRulesBySet(set.id)}
                        className={clsx(
                            "flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-all select-none",
                            activeSetId === set.id 
                                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20 font-medium" 
                                : "hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                        )}
                    >
                        <span className="truncate">{set.name}</span>
                        {set.isDefault && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
                    </div>
                ))}
            </div>
        </ScrollArea>
      </div>

      {/* ======================= Right Content: Rules List ======================= */}
      <div className="flex-1 flex flex-col bg-white/30 dark:bg-transparent min-w-0">
         {/* Toolbar */}
         <div className="h-[50px] px-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-white/40 dark:bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {highlightSets.find(s => s.id === activeSetId)?.name || t('settings.appearance.selectProfile', "Select a Profile")}
                </span>
                {activeSetId && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                        {currentSetRules.length} rules
                    </Badge>
                )}
            </div>
            
            {/* 顶部操作按钮组 */}
            {activeSetId && (
                <div className="flex items-center gap-2">
                    {/* 🟢 打开样式管理器 */}
                    <CustomButton 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs gap-1.5 bg-transparent border-slate-200/60 dark:border-slate-700/60"
                        onClick={() => setIsStyleManagerOpen(true)}
                        icon={Palette}
                    >
                        Styles
                    </CustomButton>

                    {/* 🟢 添加规则 */}
                    <CustomButton 
                        size="sm" 
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
                        onClick={handleOpenAdd}
                        icon={Plus}
                    >
                        Add Rule
                    </CustomButton>
                </div>
            )}
         </div>

         {/* Rules Content Area */}
         <div className="flex-1 overflow-hidden relative">
            {!activeSetId ? (
                // 未选择 Profile 的空状态
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-white/5">
                        <Highlighter className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="text-sm">Select or create a profile to manage rules</p>
                </div>
            ) : currentSetRules.length === 0 ? (
                // Profile 为空的空状态
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Search className="w-6 h-6 opacity-30" />
                    <span className="text-xs">No highlight rules found</span>
                </div>
            ) : (
                // 规则列表
                <ScrollArea className="h-full">
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {currentSetRules.map(rule => (
                            <div key={rule.id} className="flex items-center px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-white/5 group transition-colors">
                                {/* Pattern Preview & Info */}
                                <div className="flex-1 min-w-0 mr-4">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        {/* 预览 Chip：直接应用样式 */}
                                        <div className="px-2 py-0.5 rounded text-sm font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20" 
                                             style={{
                                                color: rule.style?.foreground || undefined,
                                                backgroundColor: rule.style?.background || undefined,
                                                fontWeight: rule.style?.isBold ? 'bold' : 'normal',
                                                fontStyle: rule.style?.isItalic ? 'italic' : 'normal',
                                                textDecoration: rule.style?.isUnderline ? 'underline' : 'none',
                                             }}>
                                            {rule.pattern}
                                        </div>
                                    </div>
                                    
                                    {/* 元数据 Badge */}
                                    <div className="flex gap-2 text-[10px] text-slate-400 items-center">
                                        {rule.isRegex && <span className="text-purple-500 font-medium">Regex</span>}
                                        {rule.isCaseSensitive && <span className="text-amber-500 font-medium">Case-Sensitive</span>}
                                        {!rule.isRegex && !rule.isCaseSensitive && <span className="opacity-50">String Match</span>}
                                        
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        
                                        <div className="flex items-center gap-1">
                                            <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{background: rule.style?.foreground || 'currentColor'}} 
                                            />
                                            <span>{rule.style?.name || 'Unknown Style'}</span>
                                        </div>

                                        {rule.priority > 0 && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <span className="text-slate-400 opacity-60">Pr: {rule.priority}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Row Actions (Hover Display) */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" 
                                        onClick={() => handleOpenEdit(rule)}
                                    >
                                        <Edit2 className="w-3.5 h-3.5"/>
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" 
                                        onClick={() => deleteRule(rule.id)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
         </div>
      </div>

      {/* ======================= Dialogs ======================= */}
      
      {/* 1. 规则编辑弹窗 */}
      {activeSetId && (
          <RuleEditorDialog 
            open={isRuleDialogOpen} 
            onOpenChange={setIsRuleDialogOpen}
            setId={activeSetId}
            ruleToEdit={editingRule}
            onSave={() => loadRulesBySet(activeSetId)}
          />
      )}

      {/* 2. 样式管理弹窗 */}
      <StyleManagerDialog 
        open={isStyleManagerOpen} 
        onOpenChange={setIsStyleManagerOpen} 
      />
    </div>
  );
};