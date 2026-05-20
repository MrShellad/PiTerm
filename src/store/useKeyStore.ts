import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { 
    KeyEntry, 
    VaultStatus, 
    ViewMode, 
    KeyType, 
    DecryptedData, 
    KeyUsageStats // 🟢 [新增] 引入关联统计类型
} from '@/features/keys/types';

interface ModalState {
    isOpen: boolean;
    mode: 'add' | 'edit';
    keyId?: string;
}

interface KeyState {
    status: VaultStatus;
    keys: KeyEntry[];
    viewMode: ViewMode;
    isLoading: boolean;
    modalState: ModalState;
    
    // 全局解锁弹窗状态
    isGlobalUnlockModalOpen: boolean;

    // 存储解密密钥/主密码 (用于前端加密代理等敏感信息)
    encryptionKey: string | null;

    // 暂存需要解锁后自动执行的动作
    pendingAction: (() => void) | null;
    setPendingAction: (action: (() => void) | null) => void;

    // Actions
    checkVaultStatus: () => Promise<void>;
    setupVault: (password: string) => Promise<void>;
    unlockVault: (password: string) => Promise<boolean>;
    lockVault: () => Promise<void>;
    
    // 手动设置密钥的 Action
    setEncryptionKey: (key: string | null) => void;

    loadKeys: () => Promise<void>;
    toggleViewMode: () => void;
    
    // 增加 algorithm 参数
    addKey: (keyData: { 
        name: string, 
        type: KeyType, 
        content: string, 
        username?: string, 
        passphrase?: string,
        algorithm?: string 
    }) => Promise<KeyEntry>;

    updateKey: (id: string, data: Partial<KeyEntry> & { content?: string, passphrase?: string }) => Promise<void>;
    deleteKey: (id: string) => Promise<void>;
    
    // 🟢 [新增] 检查密钥关联 (删除前调用)
    checkAssociations: (id: string) => Promise<KeyUsageStats>;

    // 增删改查的 Modal (KeyActionModal)
    openModal: (mode: 'add' | 'edit', keyId?: string) => void;
    closeModal: () => void;

    // 全局解锁弹窗控制 (GlobalVaultModal)
    openGlobalUnlockModal: (onSuccessAction?: () => void) => void;
    closeGlobalUnlockModal: () => void;
    
    getDecryptedContent: (id: string) => Promise<DecryptedData | null>;
}

export const useKeyStore = create<KeyState>((set, get) => ({
    status: 'uninitialized',
    keys: [],
    viewMode: 'grid',
    isLoading: false,
    modalState: { isOpen: false, mode: 'add' },
    isGlobalUnlockModalOpen: false,
    
    encryptionKey: null,
    pendingAction: null,

    setPendingAction: (action) => set({ pendingAction: action }),
    setEncryptionKey: (key) => set({ encryptionKey: key }),

    checkVaultStatus: async () => {
        try {
            const res = await invoke<{ is_initialized: boolean; is_locked: boolean }>('get_vault_status');
            
            if (!res.is_initialized) {
                set({ status: 'uninitialized', encryptionKey: null });
            } else if (res.is_locked) {
                set({ status: 'locked', encryptionKey: null });
            } else {
                // 后端已解锁，但前端必须检查是否有密钥
                const currentKey = get().encryptionKey;
                
                if (currentKey) {
                    // 密钥存在，状态同步为 unlocked
                    set({ status: 'unlocked' });
                    if (get().keys.length === 0) {
                        get().loadKeys();
                    }
                } else {
                    // 后端解锁了但前端没密钥（例如刷新了页面）
                    // 强制设为 locked，迫使用户重新输入密码来恢复 encryptionKey
                    set({ status: 'locked', encryptionKey: null });
                }
            }
        } catch (e) {
            console.error("Failed to check vault status", e);
            set({ status: 'locked', encryptionKey: null }); 
        }
    },

    setupVault: async (password) => {
        set({ isLoading: true });
        try {
            await invoke('init_vault', { password });
            // 初始化成功，保存密码到内存，以便后续使用
            set({ status: 'unlocked', keys: [], encryptionKey: password });
        } catch (e) {
            console.error(e);
            throw e; 
        } finally {
            set({ isLoading: false });
        }
    },

    unlockVault: async (password) => {
        set({ isLoading: true });
        try {
            const success = await invoke<boolean>('unlock_vault', { password });
            if (success) {
                // 解锁成功，保存密码到内存
                set({ status: 'unlocked', encryptionKey: password });
                await get().loadKeys();
                return true;
            }
        } catch (e) {
            console.error(e);
        } finally {
            set({ isLoading: false });
        }
        return false;
    },

    lockVault: async () => {
        await invoke('lock_vault');
        // 锁定保险库，清除内存中的密码
        set({ status: 'locked', keys: [], encryptionKey: null });
    },

    loadKeys: async () => {
        try {
            const keys = await invoke<KeyEntry[]>('get_all_keys');
            set({ keys });
        } catch (e) {
            console.error("Failed to load keys", e);
        }
    },

    toggleViewMode: () => set((state) => ({ 
        viewMode: state.viewMode === 'grid' ? 'list' : 'grid' 
    })),

    addKey: async (keyData) => {
         const payload: DecryptedData = {
             val: keyData.content,
             pass: keyData.passphrase || ''
         };
         
         const packedContent = JSON.stringify(payload);

         const newKey = await invoke<KeyEntry>('add_key', {
             name: keyData.name,
             keyType: keyData.type,
             content: packedContent,
             username: keyData.username,
             algorithm: keyData.algorithm || null 
         });
         
         set(state => ({ keys: [newKey, ...state.keys] }));
         return newKey;
    },

    updateKey: async (_id, _data) => {
        console.warn("Update not implemented yet");
        await get().loadKeys();
    },

    deleteKey: async (id) => {
        await invoke('delete_key', { id });
        set(state => ({ keys: state.keys.filter(k => k.id !== id) }));
    },

    // 🟢 [新增] 检查关联的具体实现
    checkAssociations: async (id) => {
        try {
            const stats = await invoke<KeyUsageStats>('check_key_associations', { id });
            return stats;
        } catch (e) {
            console.error("Failed to check associations", e);
            // 返回空结构防止 UI 崩溃
            return { keyId: id, totalCount: 0, associatedServers: [] };
        }
    },

    openModal: (mode, keyId) => set({ modalState: { isOpen: true, mode, keyId } }),
    closeModal: () => set({ modalState: { isOpen: false, mode: 'add', keyId: undefined } }),

    openGlobalUnlockModal: (onSuccessAction) => {
        get().checkVaultStatus(); 
        set({ 
            isGlobalUnlockModalOpen: true,
            pendingAction: onSuccessAction || null
        });
    },

    closeGlobalUnlockModal: () => set({ 
        isGlobalUnlockModalOpen: false,
        pendingAction: null
    }),

    getDecryptedContent: async (id) => {
        const key = get().keys.find(k => k.id === id);
        if (!key) return null;

        try {
            const plaintext = await invoke<string>('get_decrypted_content', { 
                id: key.id 
            });
        
            try {
                const parsed = JSON.parse(plaintext);
                if (typeof parsed === 'object' && parsed !== null && 'val' in parsed) {
                    return parsed as DecryptedData;
                }
            } catch (e) {
                // Legacy data
            }

            return { val: plaintext, pass: '' };

        } catch (e) {
            console.error("Decryption failed", e);
            return null;
        }
    }
}));