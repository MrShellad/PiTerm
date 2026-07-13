import { invoke } from "@tauri-apps/api/core";
import { Server } from "@/features/server/domain/types";

export const ServerAPI = {
  // 获取所有服务器
  getAll: async (): Promise<Server[]> => {
    return await invoke<any[]>("list_servers");
  },

  // ... save 和 delete 保持不变
  save: async (server: Server): Promise<void> => {
    return await invoke("save_server", { server });
  },

  delete: async (id: string): Promise<void> => {
    return await invoke("delete_server", { id });
  }
};