// src/features/settings/application/services/storage.service.ts
import { StateStorage } from 'zustand/middleware';
import { mkdir, readTextFile, writeTextFile, BaseDirectory, exists } from '@tauri-apps/plugin-fs'; 
import { type as getOsType } from '@tauri-apps/plugin-os';
import { getVersion } from '@tauri-apps/api/app';

export const createDiskStorage = (filename: string): StateStorage => ({
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const fileExists = await exists(filename, { baseDir: BaseDirectory.AppConfig });
      if (!fileExists) return null;
      
      const content = await readTextFile(filename, { baseDir: BaseDirectory.AppConfig });
      try {
        const json = JSON.parse(content);
        if (json && json.meta && json.state) {
          return JSON.stringify(json.state);
        }
        return content;
      } catch (e) {
        return content;
      }
    } catch (e) {
      console.error('Failed to read settings file:', e);
      return null;
    }
  },
  
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const dirExists = await exists('', { baseDir: BaseDirectory.AppConfig });
      if (!dirExists) {
        await mkdir('', { baseDir: BaseDirectory.AppConfig, recursive: true });
      }

      let platform = 'unknown';
      let appVersion = 'unknown';
      try {
        const [osType, ver] = await Promise.all([getOsType(), getVersion()]);
        platform = osType;
        appVersion = ver;
      } catch (err) {}

      const fileContent = {
        meta: {
          platform,
          version: appVersion,
          lastUpdated: new Date().toISOString(),
        },
        state: JSON.parse(value)
      };

      await writeTextFile(filename, JSON.stringify(fileContent, null, 2), { baseDir: BaseDirectory.AppConfig });
    } catch (e) {
      console.error('Failed to write settings file:', e);
    }
  },
  
  removeItem: async (_name: string): Promise<void> => {
    console.warn('removeItem not implemented for disk storage');
  },
});