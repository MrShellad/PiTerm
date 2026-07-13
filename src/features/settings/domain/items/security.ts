import { SettingItem } from "../types";

export const securityItems: SettingItem[] = [
  {
    id: 'security.idleTimeout',
    categoryId: 'security',
    type: 'select',
    labelKey: 'settings.security.idleTimeout', 
    descKey: 'settings.security.idleTimeoutDesc',
    defaultValue: 0, // 0 = Disabled
    options: [
      { label: 'Never (Disabled)', value: 0 },
      { label: '1 Minute', value: 1 },
      { label: '5 Minutes', value: 5 },
      { label: '10 Minutes', value: 10 },
      { label: '30 Minutes', value: 30 },
      { label: '1 Hour', value: 60 },
    ]
  },
  {
    id: 'security.lockShortcut',
    categoryId: 'security',
    type: 'shortcut',
    labelKey: 'settings.security.lockShortcut',
    descKey: 'settings.security.lockShortcutDesc',
    defaultValue: 'Ctrl+Shift+L',
  },
  {
    id: 'security.pinManager',
    categoryId: 'security',
    type: 'pin-manager',
    labelKey: 'settings.security.pinManager',
    descKey: 'settings.security.pinManagerDesc',
  }
];