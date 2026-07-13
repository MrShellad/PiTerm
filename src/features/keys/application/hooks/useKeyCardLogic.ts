import { useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useKeyStore } from '@/store/useKeyStore';
import { KeyEntry, DecryptedData } from '../../domain/types';

export const useKeyCardLogic = (data: KeyEntry) => {
    const { getDecryptedContent } = useKeyStore();
    
    // [修改] 状态改为存储对象，而非单字符串
    const [decryptedData, setDecryptedData] = useState<DecryptedData | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // [修改] 返回类型 Promise<DecryptedData | null>
    const decryptContent = async (): Promise<DecryptedData | null> => {
        // 如果已有缓存，直接返回
        if (decryptedData) return decryptedData;

        setIsDecrypting(true);
        try {
            const result = await getDecryptedContent(data.id);
            if (result) {
                setDecryptedData(result); // 保存完整对象 { val, pass }
                return result;
            }
        } catch (error) {
            console.error("Decryption failed", error);
        } finally {
            setIsDecrypting(false);
        }
        return null;
    };

    const handleCardClick = async () => {
        const res = await decryptContent();
        if (res) setShowDetail(true);
    };

    const handleExport = async () => {
        setShowMenu(false);
        const res = await decryptContent();
        if (!res) return;

        try {
            const ext = data.type === 'password' ? 'txt' : 'pem';
            const path = await save({
                defaultPath: `${data.name}.${ext}`,
                filters: [{ name: 'Key File', extensions: [ext] }]
            });
            if (path) {
                // 导出时只导出 val (密钥内容)，通常不需要导出 passphrase
                await writeTextFile(path, res.val);
            }
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    return {
        decryptedData, // [关键] 必须导出这个对象
        isDecrypting,
        showDetail,
        showMenu,
        setShowDetail,
        setShowMenu,
        handleCardClick,
        handleExport
    };
};
