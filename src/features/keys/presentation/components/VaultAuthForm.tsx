import React, { useRef, useEffect, useState } from 'react';
import { ShieldCheck, Lock, Loader2, RefreshCcw, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { useVaultAuthForm } from '@/features/keys/application/hooks/VaultAuthFormHook';

interface PinInputProps {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    focusSignal?: number;
    hasError?: boolean;
    isSuccess?: boolean;
}

const PinInput = ({ 
    value, 
    onChange, 
    disabled, 
    autoFocus,
    focusSignal = 0,
    hasError,
    isSuccess
}: PinInputProps) => {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const [isFocused, setIsFocused] = useState(false);

    // 计算当前合法的待输入槽位索引 (0 到 5)
    const activeIndex = Math.min(value.length, 5);

    // 聚焦强制锁定至当前 activeIndex
    const focusActiveSlot = () => {
        if (disabled) return;
        const targetIndex = Math.min(value.length, 5);
        refs.current[targetIndex]?.focus();
    };

    useEffect(() => {
        if (!autoFocus || disabled) {
            return;
        }

        const frame = requestAnimationFrame(() => {
            focusActiveSlot();
        });

        return () => cancelAnimationFrame(frame);
    }, [autoFocus, disabled, focusSignal]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        // 🟢 严格拦截方向键与光标移动键，完全禁止键盘光标定位
        const forbiddenKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Tab'];
        if (forbiddenKeys.includes(e.key)) {
            e.preventDefault();
            focusActiveSlot();
            return;
        }

        // 🟢 严格控制 Backspace：从末尾按顺序向前擦除
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (value.length > 0) {
                const nextValue = value.slice(0, -1);
                onChange(nextValue);
                const nextIndex = Math.max(0, nextValue.length);
                refs.current[nextIndex]?.focus();
            }
            return;
        }

        // 🟢 拦截常规单字符输入，实现平滑追加并锁定焦点
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (value.length < 6) {
                const nextValue = value + e.key;
                onChange(nextValue);
                const nextIndex = Math.min(nextValue.length, 5);
                refs.current[nextIndex]?.focus();
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (disabled) return;
        const pasted = e.clipboardData.getData('text').trim().slice(0, 6);
        if (pasted) {
            onChange(pasted);
            const focusIndex = Math.min(pasted.length, 5);
            refs.current[focusIndex]?.focus();
        }
    };

    return (
        <div 
            className={`flex justify-center gap-2.5 sm:gap-3.5 transition-all duration-300 ${hasError ? 'animate-vault-shake' : ''}`} 
            dir="ltr"
        >
            {[0, 1, 2, 3, 4, 5].map(i => {
                const char = value[i];
                const isFilled = Boolean(char);
                const isActive = i === activeIndex && !disabled && isFocused && !isSuccess;

                return (
                    <div
                        key={i}
                        className="relative flex items-center justify-center"
                        onClick={focusActiveSlot}
                    >
                        <input
                            ref={el => { refs.current[i] = el; }}
                            type="password"
                            maxLength={1}
                            value={char || ''}
                            onChange={() => {}} // 逻辑全部在 keydown 和 paste 中精准处理
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onFocus={() => {
                                setIsFocused(true);
                                focusActiveSlot();
                            }}
                            onBlur={() => setIsFocused(false)}
                            onSelect={e => e.preventDefault()}
                            onContextMenu={e => e.preventDefault()}
                            disabled={disabled}
                            className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl font-bold bg-slate-50 dark:bg-slate-950 border-2 rounded-xl outline-none transition-all duration-200 select-none caret-transparent disabled:opacity-50 cursor-pointer ${
                                isSuccess
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-500/20 scale-102'
                                    : hasError
                                    ? 'border-red-500 dark:border-red-500 bg-red-500/5 text-red-500 ring-4 ring-red-500/20'
                                    : isActive
                                    ? 'border-blue-500 dark:border-blue-400 bg-white dark:bg-slate-900 ring-4 ring-blue-500/20 shadow-md shadow-blue-500/10 animate-vault-glow'
                                    : isFilled
                                    ? 'border-slate-400 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        />
                        {/* 填充状态的安全点动效 */}
                        {isFilled && !isSuccess && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="w-3.5 h-3.5 bg-slate-800 dark:bg-slate-100 rounded-full animate-vault-pop shadow-sm" />
                            </span>
                        )}
                        {/* 成功状态打勾微动效 */}
                        {isSuccess && isFilled && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-emerald-500">
                                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-vault-pop" />
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

interface Props {
    onSuccess?: () => void;
}

export const VaultAuthForm = ({ onSuccess }: Props) => {
    const {
        status,
        isLoading,
        password,
        focusSignal,
        setupStep,
        error,
        handlePinChange,
        resetSetup,
        getTitle,
        getDesc,
        t
    } = useVaultAuthForm({ onSuccess });

    const [isSuccessState, setIsSuccessState] = useState(false);

    // 监控解锁成功过渡状态
    useEffect(() => {
        if (password.length === 6 && !error && !isLoading) {
            // 当6位输入完成且没有错误时，保持平滑过度
            setIsSuccessState(true);
        } else {
            setIsSuccessState(false);
        }
    }, [password, error, isLoading]);

    return (
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 w-full select-none">
            {/* 顶部安全徽章与图标 */}
            <div className="flex justify-center mb-6 relative">
                <div className="absolute -inset-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                <div className={`relative p-4 rounded-2xl border transition-all duration-300 shadow-lg ${
                    isSuccessState
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/10'
                        : error
                        ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-red-500/10'
                        : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 shadow-blue-500/10'
                }`}>
                    {isLoading ? (
                        <Loader2 className="w-9 h-9 animate-spin" />
                    ) : isSuccessState ? (
                        <CheckCircle2 className="w-9 h-9 animate-vault-pop" />
                    ) : status === 'uninitialized' ? (
                        <ShieldCheck className="w-9 h-9" />
                    ) : (
                        <Lock className="w-9 h-9" />
                    )}
                </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2 tracking-tight transition-all">
                {getTitle()}
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-7 text-xs sm:text-sm max-w-[300px] leading-relaxed">
                {getDesc()}
            </p>

            <div className="w-full max-w-sm flex flex-col items-center space-y-6">
                <PinInput 
                    value={password} 
                    onChange={handlePinChange} 
                    disabled={isLoading} 
                    autoFocus 
                    focusSignal={focusSignal}
                    hasError={Boolean(error)}
                    isSuccess={isSuccessState}
                />

                {/* 状态及错误提示反馈区 */}
                <div className="h-6 flex items-center justify-center">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-blue-500 font-medium">
                            <Loader2 className="animate-spin w-4 h-4" />
                            <span>{t('common.verifying', 'Verifying security PIN...')}</span>
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-1.5 text-red-500 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    ) : isSuccessState ? (
                        <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium animate-vault-pop">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('common.verified', 'Authenticated successfully')}</span>
                        </div>
                    ) : null}
                </div>

                {status === 'uninitialized' && setupStep === 2 && !isLoading && (
                    <button 
                        type="button" 
                        onClick={resetSetup}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors animate-in fade-in"
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        {t('common.startOver', 'Start over')}
                    </button>
                )}
            </div>

            {/* 底部商业硬件级安全标识 */}
            <div className="mt-7 pt-4 w-full border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase">
                <Shield className="w-3.5 h-3.5 text-blue-500/70" />
                <span>AES-256 GCM Hardware Encrypted</span>
            </div>
        </div>
    );
};
