import { SettingItem } from "../types";

export const terminalItems: SettingItem[] = [
  {
    id: 'terminal.rendererType',
    categoryId: 'terminal',
    type: 'select',
    labelKey: 'settings.terminal.rendererType',
    descKey: 'settings.terminal.rendererTypeDesc',
    defaultValue: 'webgl',
    options: [
      { labelKey: 'settings.terminal.renderer.webgl', value: 'webgl' },
      { labelKey: 'settings.terminal.renderer.dom', value: 'dom' }
    ]
  },
  {
    id: 'terminal.autocompleteEnabled',
    categoryId: 'terminal',
    type: 'switch',
    labelKey: 'settings.terminal.autocompleteEnabled',
    label: '补全悬浮窗',
    descKey: 'settings.terminal.autocompleteEnabledDesc',
    desc: '控制命令历史和代码片段补全悬浮窗的总开关',
    defaultValue: true,
  },
  {
    id: 'terminal.autocompletePopupScale',
    categoryId: 'terminal',
    type: 'slider',
    labelKey: 'settings.terminal.autocompletePopupScale',
    label: '悬浮窗缩放',
    descKey: 'settings.terminal.autocompletePopupScaleDesc',
    desc: '调整补全悬浮窗的显示大小',
    defaultValue: 1,
    min: 0.8,
    max: 1.3,
    step: 0.05,
    unit: 'x',
    dependencyId: 'terminal.autocompleteEnabled',
    dependencyValue: true,
  },
  {
    id: 'terminal.autocompletePopupOpacity',
    categoryId: 'terminal',
    type: 'slider',
    labelKey: 'settings.terminal.autocompletePopupOpacity',
    label: '悬浮窗透明度',
    descKey: 'settings.terminal.autocompletePopupOpacityDesc',
    desc: '调整补全悬浮窗的透明度',
    defaultValue: 0.96,
    min: 0.5,
    max: 1,
    step: 0.05,
    unit: '%',
    dependencyId: 'terminal.autocompleteEnabled',
    dependencyValue: true,
  },
    {
    id: 'terminal.fontFamily',
    categoryId: 'terminal',
    type: 'font-selector',
    labelKey: 'settings.terminal.fontFamily',
    descKey: 'settings.terminal.fontFamilyDesc',
    defaultValue: 'Menlo, Monaco, "Courier New", monospace',
  },
  {
    id: 'terminal.fontSize',
    categoryId: 'terminal',
    type: 'select', 
    labelKey: 'settings.terminal.fontSize',
    defaultValue: 14,
    options: [10,11,12,13,14,15,16,17,18].map(v => ({ 
        label: v === 14 ? '14px (Default)' : `${v}px`, 
        value: v 
    }))
  },
  {
    id: 'terminal.fontWeight',
    categoryId: 'terminal',
    type: 'select',
    labelKey: 'settings.terminal.fontWeight',
    defaultValue: 'normal',
    options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map(v => ({ 
        label: v.charAt(0).toUpperCase() + v.slice(1), 
        value: v 
    }))
  },
  {
    id: 'terminal.lineHeight',
    categoryId: 'terminal',
    type: 'select', 
    labelKey: 'settings.terminal.lineHeight',
    descKey: 'settings.terminal.lineHeightDesc',
    defaultValue: 1.0,
    options: [
        { label: '1.0 (Compact)', value: 1.0 },
        { label: '1.1', value: 1.1 },
        { label: '1.2 (Normal)', value: 1.2 },
        { label: '1.3', value: 1.3 },
        { label: '1.4', value: 1.4 },
        { label: '1.5 (Relaxed)', value: 1.5 },
        { label: '1.6', value: 1.6 },
        { label: '1.8', value: 1.8 },
        { label: '2.0 (Double)', value: 2.0 },
    ]
  },

  {
    id: 'terminal.scrollback',
    categoryId: 'terminal',
    type: 'input',
    labelKey: 'settings.terminal.scrollback',
    descKey: 'settings.terminal.scrollbackDesc',
    defaultValue: 1000,
  },
  {
    id: 'terminal.padding',
    categoryId: 'terminal',
    type: 'input',
    labelKey: 'settings.terminal.padding',
    descKey: 'settings.terminal.paddingDesc',
    defaultValue: 12,
  },
  {
    id: 'terminal.cursorStyle',
    categoryId: 'terminal',
    type: 'select',
    labelKey: 'settings.terminal.cursorStyle',
    defaultValue: 'block',
    options: [
        { labelKey: 'settings.terminal.cursor.block', value: 'block' },
        { labelKey: 'settings.terminal.cursor.underline', value: 'underline' },
        { labelKey: 'settings.terminal.cursor.bar', value: 'bar' },
    ]
  },
  {
    id: 'terminal.cursorBlink',
    categoryId: 'terminal',
    type: 'switch',
    labelKey: 'settings.terminal.cursorBlink',
    defaultValue: true,
  },
];
