import { useState } from 'react';
import { useKeyStore } from '@/store/useKeyStore';
import { useTranslation } from 'react-i18next';

interface UseVaultAuthFormProps {
    onSuccess?: () => void;
}

export const useVaultAuthForm = ({ onSuccess }: UseVaultAuthFormProps = {}) => {
    const { status, setupVault, unlockVault, isLoading } = useKeyStore();
    const { t } = useTranslation();

    const [password, setPassword] = useState('');
    const [setupStep, setSetupStep] = useState<1 | 2>(1); // 1: 输入PIN, 2: 确认PIN
    const [firstPin, setFirstPin] = useState('');
    const [error, setError] = useState('');

    const handlePinChange = async (val: string) => {
        setPassword(val);
        setError('');

        // 当输入达到 6 位时自动触发逻辑
        if (val.length === 6) {
            if (status === 'locked') {
                const success = await unlockVault(val);
                if (success) {
                    onSuccess?.();
                } else {
                    setError(t('keys.error.wrongPwd', 'Incorrect password'));
                    setPassword(''); // 错误时自动清空输入框
                }
            } else if (status === 'uninitialized') {
                if (setupStep === 1) {
                    setFirstPin(val);
                    setSetupStep(2);
                    setPassword(''); // 清空，准备输入确认密码
                } else {
                    if (val === firstPin) {
                        await setupVault(val);
                        onSuccess?.();
                    } else {
                        setError(t('keys.error.pwdMismatch', 'Passwords do not match'));
                        resetSetup(); // 两次不一致，全部清空重头开始
                    }
                }
            }
        }
    };

    const resetSetup = () => {
        setSetupStep(1);
        setFirstPin('');
        setPassword('');
        setError('');
    };

    const getTitle = () => {
        if (status === 'uninitialized') {
            return setupStep === 1 
                ? t('keys.setup.title', 'Set Master PIN') 
                : t('keys.setup.confirm_title', 'Confirm PIN');
        }
        return t('keys.setup.unlock_title', 'Unlock Vault');
    };

    const getDesc = () => {
        if (status === 'uninitialized') {
            return setupStep === 1 
                ? t('keys.setup.desc_pin', 'Enter a 6-character PIN (letters/numbers) to secure your vault.')
                : t('keys.setup.confirm_desc', 'Please enter your PIN again to confirm.');
        }
        return t('keys.setup.unlock_desc', 'Enter your 6-character PIN to access keys.');
    };

    return {
        status,
        isLoading,
        password,
        setupStep,
        error,
        handlePinChange,
        resetSetup,
        getTitle,
        getDesc,
        t
    };
};