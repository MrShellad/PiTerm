// src/features/terminal/application/hooks/useTerminalHighlight.ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/features/settings/application/useSettingsStore';
import { HighlightService } from '@/features/settings/application/services/highlight.service';
import { HighlightRule } from '@/features/settings/domain/types';

// 匹配 ANSI 转义序列的正则，确保高亮不会破坏原有终端控制字符
const ANSI_CONTROL_REGEX = /(\x1b\[[0-9;?]*[a-zA-Z])/g;

/**
 * 将 Hex 颜色转换为终端 ANSI 真彩色 (24-bit RGB) 转义码
 */
const hexToAnsi = (hex: string, isBg: boolean = false) => {
    if (!hex) return '';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length === 8) c = c.substring(0, 6);
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `\x1b[${isBg ? '48' : '38'};2;${r};${g};${b}m`;
};

export const useTerminalHighlight = (serverId?: string) => {
    const [rawRules, setRawRules] = useState<HighlightRule[]>([]);
    
    const { 
        highlightAssignments, 
        savedStyles, 
        loadHighlightAssignments, 
        loadStyles 
    } = useSettingsStore();

    // 1. 初始化基础配置数据（如果尚未加载）
    useEffect(() => {
        if (highlightAssignments.length === 0) loadHighlightAssignments();
        if (savedStyles.length === 0) loadStyles();
    }, []);

    // 2. 根据分配情况加载规则数据
    useEffect(() => {
        const loadRules = async () => {
            if (!highlightAssignments || highlightAssignments.length === 0) return;

            // 查找分配：优先匹配当前服务器 ID，无匹配则使用全局分配
            let assignment = highlightAssignments.find(a => a.targetId === serverId);
            if (!assignment) {
                assignment = highlightAssignments.find(a => a.targetId === 'global');
            }

            if (assignment) {
                try {
                    const rules = await HighlightService.getRulesBySet(assignment.setId);
                    setRawRules(rules);
                } catch (e) {
                    setRawRules([]);
                }
            } else {
                setRawRules([]);
            }
        };

        loadRules();
    }, [serverId, highlightAssignments]);

    // 3. 将规则预处理为正则对象和 ANSI 代码段
    const processors = useMemo(() => {
        return rawRules
            .filter((r: HighlightRule) => r.isEnabled !== false) 
            .sort((a: HighlightRule, b: HighlightRule) => b.priority - a.priority)
            .map(rule => {
                const flags = rule.isCaseSensitive ? 'g' : 'gi';
                const pattern = rule.isRegex ? rule.pattern : rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                const style = savedStyles.find(s => s.id === rule.styleId);
                let ansiStart = '';
                if (style) {
                    if (style.foreground) ansiStart += hexToAnsi(style.foreground, false);
                    if (style.background) ansiStart += hexToAnsi(style.background, true);
                }

                return {
                    regex: new RegExp(pattern, flags),
                    ansiStart,
                    ansiEnd: '\x1b[0m'
                };
            });
    }, [rawRules, savedStyles]);

    /**
     * 核心处理流水线：
     * 原始数据 -> ANSI 分段 -> 纯文本段匹配高亮 -> 重新拼合
     */
    const applyHighlight = useCallback((text: string) => {
        if (!text || processors.length === 0) return text;

        const segments = text.split(ANSI_CONTROL_REGEX);
        const processedSegments = segments.map(segment => {
            // 如果是 ANSI 控制指令，直接原样返回，不进行高亮
            if (segment.startsWith('\x1b[')) return segment;

            // 对纯文本段应用所有匹配规则
            let highlighted = segment;
            for (const { regex, ansiStart, ansiEnd } of processors) {
                if (!ansiStart) continue;
                // 使用回调函数替换以避免正则捕获组冲突
                highlighted = highlighted.replace(regex, (match) => `${ansiStart}${match}${ansiEnd}`);
            }
            return highlighted;
        });

        return processedSegments.join('');
    }, [processors]);

    return { applyHighlight };
};