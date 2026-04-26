// src/features/settings/application/services/storage.service.ts
import { StateStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export const createDiskStorage = (_filename: string): StateStorage => {
  let lastValue: string | null = null;

  return {
    getItem: async (_name: string): Promise<string | null> => {
      try {
        const value = await invoke<string | null>('load_app_settings');
        lastValue = value;
        return value;
      } catch (e) {
        console.error('Failed to read settings file:', e);
        return null;
      }
    },

    setItem: async (_name: string, value: string): Promise<void> => {
      if (value === lastValue) return;

      try {
        await invoke('save_app_settings', { value });
        lastValue = value;
      } catch (e) {
        console.error('Failed to write settings file:', e);
      }
    },

    removeItem: async (_name: string): Promise<void> => {
      console.warn('removeItem not implemented for disk storage');
    },
  };
};
