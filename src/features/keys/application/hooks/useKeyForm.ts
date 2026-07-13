import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useKeyStore } from '@/store/useKeyStore';
import { KeyType } from '../../domain/types';

export const useKeyForm = () => {
    const { 
        modalState, closeModal, addKey, deleteKey, keys, getDecryptedContent 
    } = useKeyStore();
    const { isOpen, mode, keyId } = modalState;

    // --- Form State ---
    const [name, setName] = useState('');
    const [type, setType] = useState<KeyType>('private_key');
    const [content, setContent] = useState(''); 
    const [username, setUsername] = useState(''); 
    const [passphrase, setPassphrase] = useState(''); 
    
    // --- UI State ---
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [showPassphrase, setShowPassphrase] = useState(false);
    
    // --- Validation State ---
    const [isValidKey, setIsValidKey] = useState(false);
    const [keyStatusMsg, setKeyStatusMsg] = useState('');

    // 校验逻辑
    const validateKeyContent = (text: string): boolean => {
        const trimmed = text.trim();
        if (trimmed.includes('PRIVATE KEY') && trimmed.includes('-----BEGIN')) {
            setIsValidKey(true);
            setKeyStatusMsg('Valid Private Key format.');
            return true;
        } else {
            setIsValidKey(false);
            setKeyStatusMsg('Must contain "BEGIN ... PRIVATE KEY"');
            return false;
        }
    };

    // 数据回显逻辑 (Effect)
    useEffect(() => {
        if (!isOpen) return;

        setKeyStatusMsg('');
        
        if (mode === 'edit' && keyId) {
            const target = keys.find(k => k.id === keyId);
            if (target) {
                setName(target.name);
                setType(target.type);
                setUsername(target.username || '');
                
                setIsFetchingData(true);
                getDecryptedContent(keyId).then((data) => {
                    if (data) {
                        setContent(data.val); 
                        setPassphrase(data.pass || '');
                        
                        if (target.type === 'private_key') validateKeyContent(data.val);
                        else setIsValidKey(true);
                    }
                    setIsFetchingData(false);
                });
            }
        } else {
            // Reset Form
            setName('');
            setType('private_key');
            setContent('');
            setUsername('');
            setPassphrase('');
            setIsValidKey(false);
            setIsFetchingData(false);
        }
    }, [isOpen, mode, keyId, keys]);

    // 实时校验监听
    useEffect(() => {
        if (type === 'private_key' && content) validateKeyContent(content);
        else if (type === 'password') setIsValidKey(true);
    }, [content, type]);

    // 动作：文件上传
    const handleFileUpload = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'Key Files', extensions: ['pem', 'key', 'pub', 'ppk', ''] }] 
            });
            if (selected) {
                const path = Array.isArray(selected) ? selected[0] : selected;
                if (!path) return;
                const text = await readTextFile(path);
                setContent(text.trim());
                if (!name) {
                    const fileName = path.split(/[\\/]/).pop();
                    if (fileName) setName(fileName);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 动作：提交表单
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (type === 'private_key' && !isValidKey) return; 
        if (!name || !content) return;

        setIsLoading(true);
        
        const keyData = {
            name,
            type,
            content, 
            username,
            passphrase 
        };

        try {
            if (mode === 'add') {
                await addKey(keyData);
            } else if (keyId) {
                await deleteKey(keyId);
                await addKey(keyData);
            }
            closeModal();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        // Values
        isOpen, mode,
        name, setName,
        type, setType,
        content, setContent,
        username, setUsername,
        passphrase, setPassphrase,
        
        // UI Status
        isLoading, isFetchingData,
        showContent, setShowContent,
        showPassphrase, setShowPassphrase,
        isValidKey, keyStatusMsg,
        
        // Actions
        closeModal,
        handleFileUpload,
        handleSubmit
    };
};
