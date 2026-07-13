import { SettingItem } from "../types";

export const connectionItems: SettingItem[] = [
  {
      id: 'connection.proxyManager',
      categoryId: 'connection',
      type: 'proxy-manager',
      labelKey: 'settings.connection.proxies',
  },
  {
      id: 'connection.agentWsEnabled',
      categoryId: 'connection',
      type: 'switch',
      labelKey: 'settings.connection.agentWsEnabled',
      descKey: 'settings.connection.agentWsEnabledDesc',
      defaultValue: false,
  },
  {
      id: 'connection.agentWsPort',
      categoryId: 'connection',
      type: 'input',
      labelKey: 'settings.connection.agentWsPort',
      descKey: 'settings.connection.agentWsPortDesc',
      defaultValue: '18133',
      dependencyId: 'connection.agentWsEnabled',
      dependencyValue: true,
  },
];