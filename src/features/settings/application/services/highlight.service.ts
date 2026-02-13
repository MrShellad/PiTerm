// src/features/settings/application/services/highlight.service.ts
import { invoke } from '@tauri-apps/api/core';
// 🟢 1. 在导入中补充 HighlightAssignment
import { HighlightRule, HighlightRuleSet, HighlightStyle, HighlightAssignment } from '../../domain/types'; 

export const HighlightService = {
  getSets: () => invoke<HighlightRuleSet[]>('get_highlight_sets'),
  createSet: (name: string, description?: string) => invoke('create_highlight_set', { name, description }),
  updateSet: (id: string, name: string, description?: string) => invoke('update_highlight_set', { id, name, description }),
  deleteSet: (id: string) => invoke('delete_highlight_set', { id }),
  
  getRulesBySet: (setId: string) => invoke<HighlightRule[]>('get_rules_by_set_id', { setId }),
  saveRule: (rule: any) => invoke('save_highlight_rule', { rule }),
  toggleRule: (id: string, enabled: boolean) => invoke('toggle_highlight_rule', { id, enabled }),
  deleteRule: (id: string) => invoke('delete_highlight_rule', { id }),
  reorderRules: (ruleIds: string[]) => invoke('reorder_highlight_rules', { ruleIds }),

  getStyles: () => invoke<HighlightStyle[]>('get_all_highlight_styles'),
  saveStyle: (style: any) => invoke('save_highlight_style', { style }),
  deleteStyle: (id: string) => invoke('delete_highlight_style', { id }),

  // 🟢 2. [新增] 规则分配相关的 API 调用
  getAssignments: () => invoke<HighlightAssignment[]>('get_highlight_assignments'),
  assignSet: (targetId: string, targetType: 'global' | 'proxy', setId: string) => invoke('assign_highlight_set', { targetId, targetType, setId }),
  unassignSet: (targetId: string) => invoke('unassign_highlight_set', { targetId }),
};