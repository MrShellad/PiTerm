// src/features/settings/application/services/proxy.service.ts
import { invoke } from '@tauri-apps/api/core';
import { ProxyItem } from '../../domain/types';

export const ProxyService = {
  getAll: () => invoke<any[]>('get_all_proxies'),
  add: (proxy: ProxyItem) => invoke('add_proxy', { proxy: { ...proxy, proxyType: proxy.type } }),
  update: (proxy: ProxyItem) => invoke('update_proxy', { proxy: { ...proxy, proxyType: proxy.type, updatedAt: Date.now() } }),
  delete: (id: string) => invoke('delete_proxy', { id }),
};