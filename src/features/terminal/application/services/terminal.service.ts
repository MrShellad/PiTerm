import { invoke } from '@tauri-apps/api/core';

export const TerminalService = {
  quickConnect: async (params: {
    id: string;
    ip: string;
    port: number;
    username: string;
    password?: string | null;
    privateKey?: string | null;
    passphrase?: string | null;
  }) => invoke('quick_connect', params),

  connectSsh: async (serverId: string, sessionId: string) => 
    invoke('connect_ssh', { serverId, sessionId }),

  disconnectSsh: async (id: string) => 
    invoke('disconnect_ssh', { id }),

  writeSsh: async (id: string, data: string) => 
    invoke('write_ssh', { id, data }),

  resizeSsh: async (id: string, rows: number, cols: number) => 
    invoke('resize_ssh', { id, rows, cols }),

  checkIsDir: async (id: string, path: string) => 
    invoke<boolean>('sftp_check_is_dir', { id, path }),
};