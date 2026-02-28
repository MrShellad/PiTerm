import React, { useRef, useEffect } from 'react';
import { ShieldCheck, Lock, Loader2, RefreshCcw } from 'lucide-react';
import { useVaultAuthForm } from '@/features/keys/hooks/VaultAuthFormHook';

// ==========================================
// 提取出的独立 PIN 码输入组件 (保持不变)
// ==========================================
const PinInput = ({ 
    value, 
    onChange, 
    disabled, 
    autoFocus 
}: { 
    value: string; 
    onChange: (v: string) => void; 
    disabled?: boolean; 
    autoFocus?: boolean;
}) => {
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (autoFocus && refs.current[0]) {
            refs.current[0].focus();
        }
    }, [autoFocus]);

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const char = val.slice(-1);
        
        let chars = value.split('');
        for (let i = 0; i < 6; i++) {
            if (!chars[i]) chars[i] = ' ';
        }
        chars[index] = char || ' ';
        
        onChange(chars.join('').replace(/\s+$/, ''));
        
        if (char && index < 5) {
            refs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            const currentChar = value[index];
            if (!currentChar || currentChar === ' ') {
                if (index > 0) {
                    e.preventDefault();
                    refs.current[index - 1]?.focus();
                    let chars = value.split('');
                    for (let i = 0; i < 6; i++) if (!chars[i]) chars[i] = ' ';
                    chars[index - 1] = ' ';
                    onChange(chars.join('').replace(/\s+$/, ''));
                }
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            refs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            refs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').slice(0, 6);
        onChange(pasted);
        if (pasted.length > 0) {
            const focusIndex = Math.min(pasted.length, 5);
            refs.current[focusIndex]?.focus();
        }
    };

    return (
        <div className="flex justify-center gap-2 sm:gap-3" dir="ltr">
            {[0, 1, 2, 3, 4, 5].map(i => {
                const char = value[i];
                const displayValue = char && char !== ' ' ? char : '';
                return (
                    <input
                        key={i}
                        ref={el => { refs.current[i] = el; }}
                        type="password"
                        maxLength={1}
                        value={displayValue}
                        onChange={e => handleChange(i, e)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        disabled={disabled}
                        className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                    />
                );
            })}
        </div>
    );
};

// ==========================================
// 验证表单主组件 (已接入 Hook)
// ==========================================
interface Props {
    onSuccess?: () => void;
}

export const VaultAuthForm = ({ onSuccess }: Props) => {
    const {
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
    } = useVaultAuthForm({ onSuccess });

    return (
        <div className="flex flex-col items-center justify-center p-8 w-full">
            <div className="flex justify-center mb-8">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl shadow-inner">
                    {status === 'uninitialized' ? (
                        <ShieldCheck className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    ) : (
                        <Lock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    )}
                </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-3 animate-in fade-in">
                {getTitle()}
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm max-w-[280px] leading-relaxed animate-in fade-in">
                {getDesc()}
            </p>

            <div className="w-full max-w-sm flex flex-col items-center space-y-6">
                <PinInput 
                    value={password} 
                    onChange={handlePinChange} 
                    disabled={isLoading} 
                    autoFocus 
                />

                <div className="h-6 flex items-center justify-center">
                    {isLoading ? (
                        <Loader2 className="animate-spin w-5 h-5 text-blue-500" />
                    ) : error ? (
                        <p className="text-red-500 text-sm font-medium animate-in shake">{error}</p>
                    ) : null}
                </div>

                {status === 'uninitialized' && setupStep === 2 && !isLoading && (
                    <button 
                        type="button" 
                        onClick={resetSetup}
                        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors animate-in fade-in"
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        {t('common.startOver', 'Start over')}
                    </button>
                )}
            </div>
        </div>
    );
};