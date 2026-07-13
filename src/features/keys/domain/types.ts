// src/features/keys/domain/types.ts

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';
export type ViewMode = 'grid' | 'list';

export type KeyType = 'password' | 'private_key';

export interface KeyEntry {
    id: string;
    name: string;
    type: KeyType;
    content: string; 
    username?: string;
    salt: string;
    algorithm?: string;
    createdAt: number;
    updatedAt: number;
    lastUsed?: {
        serverName: string;
        serverIp: string;
        timestamp: number;
    };
}

export interface DecryptedData {
    val: string;   // 对应 Key Content
    pass?: string; // 对应 Passphrase
}

export interface KeyAssociation {
    serverId: string;
    serverName: string;
    lastUsedAt: number | null;
}

export interface KeyUsageStats {
    keyId: string;
    totalCount: number;
    associatedServers: KeyAssociation[];
}
