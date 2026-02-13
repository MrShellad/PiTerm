import { invoke } from '@tauri-apps/api/core';

export const HistoryService = {
  recordCommand: async (serverId: string, command: string, source: 'user' | 'snippet' = 'user') => 
    invoke('record_command_history', { serverId, command, source }),
};