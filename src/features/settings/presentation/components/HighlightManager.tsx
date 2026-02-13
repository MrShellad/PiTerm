import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Edit2, Check, X, Search, Highlighter, Palette, GripVertical } from "lucide-react";
import { clsx } from "clsx";
import { Reorder, useDragControls } from "framer-motion";

import { useSettingsStore } from "../../application/useSettingsStore";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; 
import { Switch } from "@/components/ui/switch";
import { CustomButton } from "@/components/common/CustomButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

import { RuleEditorDialog } from "./highlight/RuleEditorDialog";
import { StyleManagerDialog } from "./highlight/StyleManagerDialog";
import { HighlightRule, HighlightRuleSet } from "../../domain/types";

// =========================================================
// SortableRuleItem：优化排版，描述优先
// =========================================================
interface SortableRuleItemProps {
  rule: HighlightRule;
  onEdit: (rule: HighlightRule) => void;
  onDelete: (id: string) => void;
}

const SortableRuleItem = ({ rule, onEdit, onDelete }: SortableRuleItemProps) => {
  const { t } = useTranslation();
  const controls = useDragControls();
  const toggleRuleEnabled = useSettingsStore((s) => s.toggleRuleEnabled);
  const isChecked = rule.isEnabled ?? true;

  return (
    <Reorder.Item
      value={rule}
      dragListener={false}
      dragControls={controls}
      className={clsx(
        "flex items-center w-full px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors select-none bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 last:border-0",
        !isChecked && "opacity-60"
      )}
    >
      {/* 1. 拖拽手柄 */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="mr-3 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors touch-none flex-shrink-0 p-1"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 2. 操作按钮组 */}
      <div className="flex items-center gap-2 mr-5 flex-shrink-0">
        <Switch
          checked={isChecked}
          onCheckedChange={(checked) => toggleRuleEnabled(rule.id, checked)}
          className="scale-75 origin-left"
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
          onClick={() => onEdit(rule)}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 hover:border-red-300 transition-all shadow-sm"
          onClick={() => onDelete(rule.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 3. 内容展示区 - 描述优先策略 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        
        {/* 🟢 主标题：显示描述，若无描述则显示回退文本 */}
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-none">
          {rule.description || t('settings.highlights.unnamedRule', 'Unnamed Rule')}
        </div>

        <div className="flex items-center gap-3">
          {/* Pattern 预览标签 - 限制最大宽度防止溢出 */}
          <div
            className={clsx(
              "px-2.5 py-0.5 rounded text-[11px] font-mono truncate transition-colors",
              "max-w-[250px]", 
              "bg-slate-50 border border-slate-200 text-slate-700",
              "dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300",
              !isChecked && "grayscale opacity-70"
            )}
            style={{
              color: rule.style?.foreground || undefined,
              backgroundColor: rule.style?.background || undefined,
            }}
            title={rule.pattern}
          >
            {rule.pattern}
          </div>

          {/* 元数据标记 */}
          <div className="hidden xl:flex gap-2 text-[11px] text-slate-400 items-center overflow-hidden opacity-70 group-hover:opacity-100 transition-opacity">
            {rule.isRegex && <span className="flex-shrink-0 text-purple-600 dark:text-purple-400 font-bold font-mono">{t('settings.highlights.regexShort', 'RE')}</span>}
            {rule.isCaseSensitive && <span className="flex-shrink-0 text-amber-600 dark:text-amber-400 font-bold font-mono">{t('settings.highlights.caseShort', 'Aa')}</span>}
            
            {(rule.isRegex || rule.isCaseSensitive) && (
                 <span className="w-px h-3 bg-slate-300 dark:bg-slate-700 flex-shrink-0 mx-1" />
            )}
            
            {/* 样式名称作为辅助信息显示 */}
            <span className="truncate font-medium flex items-center gap-1.5">
               <Palette className="w-3 h-3" />
               {rule.style?.name || t('settings.highlights.defaultStyle', 'Default Style')}
            </span>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
};

// =========================================================
// 主管理组件
// =========================================================
export const HighlightManager = () => {
  const { t } = useTranslation();
  const {
    highlightSets,
    activeSetId,
    currentSetRules,
    loadHighlightSets,
    loadRulesBySet,
    createHighlightSet,
    updateHighlightSet,
    deleteHighlightSet,
    deleteRule,
    reorderRules,
  } = useSettingsStore();

  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<HighlightRule | null>(null);
  const [isStyleManagerOpen, setIsStyleManagerOpen] = useState(false);

  // 删除确认状态
  const [itemToDelete, setItemToDelete] = useState<{ type: 'set' | 'rule', id: string } | null>(null);

  useEffect(() => {
    loadHighlightSets();
  }, []);

  useEffect(() => {
    if (activeSetId) {
      loadRulesBySet(activeSetId);
    }
  }, [activeSetId]);

  const handleCreateSet = async () => {
    if (!newSetName.trim()) return;
    await createHighlightSet(newSetName);
    setIsCreatingSet(false);
    setNewSetName("");
  };

  const handleStartRename = (e: React.MouseEvent, set: HighlightRuleSet) => {
    e.stopPropagation();
    setRenamingId(set.id);
    setRenameValue(set.name);
  };

  const handleSaveRename = async () => {
    if (!renameValue.trim() || !renamingId) return;
    const original = highlightSets.find((s) => s.id === renamingId);
    if (original) {
      await updateHighlightSet(renamingId, renameValue, original.description);
    }
    setRenamingId(null);
  };

  const handleOpenAdd = () => {
    setEditingRule(null);
    setIsRuleDialogOpen(true);
  };

  const handleOpenEdit = (rule: HighlightRule) => {
    setEditingRule(rule);
    setIsRuleDialogOpen(true);
  };

  const handleReorder = (newOrder: HighlightRule[]) => {
    reorderRules(newOrder.map((r) => r.id));
  };

  return (
    <div className="flex h-[500px] w-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 mt-2">
      
      {/* 左侧 Profile 列表 */}
      <div className="w-[220px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white/50 dark:bg-black/20">
        <div className="p-3 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('settings.highlights.profiles', 'Profiles')}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCreatingSet(true)} disabled={!!renamingId}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isCreatingSet && (
              <div className="flex items-center gap-1 mb-2 px-1 bg-white dark:bg-slate-800 p-1 rounded border border-blue-500/50 animate-in fade-in slide-in-from-top-1">
                <Input
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="h-7 text-xs px-2 border-none bg-transparent focus-visible:ring-0"
                  placeholder={t('common.namePlaceholder', 'Name...')}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateSet()}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={handleCreateSet}><Check className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setIsCreatingSet(false)}><X className="w-3 h-3" /></Button>
              </div>
            )}

            {highlightSets.map((set) => {
              const isRenaming = set.id === renamingId;
              const isActive = activeSetId === set.id;

              if (isRenaming) {
                return (
                  <div key={set.id} className="flex items-center gap-1 px-1 py-1 rounded bg-white dark:bg-slate-800 border border-blue-500/50 shadow-sm">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-7 text-xs px-2 border-none bg-transparent focus-visible:ring-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={handleSaveRename}><Check className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400" onClick={() => setRenamingId(null)}><X className="w-3 h-3" /></Button>
                  </div>
                );
              }

              return (
                <div
                  key={set.id}
                  onClick={() => !renamingId && loadRulesBySet(set.id)}
                  className={clsx(
                    "group flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-all select-none",
                    isActive ? "bg-blue-500 text-white shadow-md font-medium" : "hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300",
                    renamingId && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{set.name}</span>
                    {set.isDefault && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0" />}
                  </div>

                  <div className={clsx("flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity", isActive ? "text-blue-100" : "text-slate-400")}>
                    <button onClick={(e) => handleStartRename(e, set)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"><Edit2 className="w-3 h-3" /></button>
                    {!set.isDefault && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setItemToDelete({ type: 'set', id: set.id }); 
                        }} 
                        className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* 右侧规则列表 */}
      <div className="flex-1 flex flex-col bg-white/30 dark:bg-transparent min-w-0">
        <div className="h-[50px] px-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-white/40 dark:bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {highlightSets.find((s) => s.id === activeSetId)?.name || t('settings.highlights.selectProfile', 'Select a Profile')}
            </span>
            {activeSetId && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                {currentSetRules.length} {t('settings.highlights.rulesCount', 'rules')}
              </Badge>
            )}
          </div>
          {activeSetId && (
            <div className="flex items-center gap-2">
              <CustomButton size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-transparent border-slate-200/60 dark:border-slate-700/60" onClick={() => setIsStyleManagerOpen(true)} icon={Palette}>
                {t('settings.highlights.styles', 'Styles')}
              </CustomButton>
              <CustomButton size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm" onClick={handleOpenAdd} icon={Plus}>
                {t('settings.highlights.addRule', 'Add Rule')}
              </CustomButton>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {!activeSetId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-white/5"><Highlighter className="w-8 h-8 opacity-40" /></div>
              <p className="text-sm">{t('settings.highlights.selectOrCreateProfile', 'Select or create a profile to manage rules')}</p>
            </div>
          ) : currentSetRules.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Search className="w-6 h-6 opacity-30" />
              <span className="text-xs">{t('settings.highlights.noRulesFound', 'No highlight rules found')}</span>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <Reorder.Group
                axis="y"
                values={currentSetRules}
                onReorder={handleReorder}
                className="w-full flex flex-col"
              >
                {currentSetRules.map((rule) => (
                  <SortableRuleItem
                    key={rule.id}
                    rule={rule}
                    onEdit={handleOpenEdit}
                    onDelete={(id) => setItemToDelete({ type: 'rule', id })}
                  />
                ))}
              </Reorder.Group>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* 删除 Profile 确认弹窗 */}
      <ConfirmDialog
        open={itemToDelete?.type === 'set'}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title={t('settings.highlights.deleteProfileTitle', 'Delete Profile')}
        description={t('settings.highlights.deleteProfileDesc', 'Are you sure you want to delete this profile? All rules inside will be removed.')}
        cancelText={t('common.cancel', 'Cancel')}
        confirmText={t('common.delete', 'Delete')}
        variant="destructive"
        onConfirm={async () => {
          if (itemToDelete?.id) {
            await deleteHighlightSet(itemToDelete.id);
          }
          setItemToDelete(null);
        }}
      />

      {/* 删除 Rule 确认弹窗 */}
      <ConfirmDialog
        open={itemToDelete?.type === 'rule'}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title={t('settings.highlights.deleteRuleTitle', 'Delete Rule')}
        description={t('settings.highlights.deleteRuleDesc', 'Are you sure you want to delete this rule?')}
        cancelText={t('common.cancel', 'Cancel')}
        confirmText={t('common.delete', 'Delete')}
        variant="destructive"
        onConfirm={async () => {
          if (itemToDelete?.id) {
            await deleteRule(itemToDelete.id);
          }
          setItemToDelete(null);
        }}
      />

      {activeSetId && (
        <RuleEditorDialog
          open={isRuleDialogOpen}
          onOpenChange={setIsRuleDialogOpen}
          setId={activeSetId}
          ruleToEdit={editingRule}
          onSave={() => loadRulesBySet(activeSetId)}
        />
      )}

      <StyleManagerDialog
        open={isStyleManagerOpen}
        onOpenChange={setIsStyleManagerOpen}
      />
    </div>
  );
};