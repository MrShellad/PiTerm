import { useState, useEffect } from 'react';
import { 
    ArrowLeft, ArrowRight, ArrowUp, RotateCw, 
    Upload, Eye, EyeOff, ArrowRightLeft, 
    CheckCircle2, XCircle, Loader2,
    ShieldAlert, User, FolderLock,
    Magnet // 🟢 新增磁铁图标
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useFileStore } from '@/store/useFileStore';
import { useTransferStore } from '@/store/useTransferStore';
import { GlassTooltip } from '@/components/common/GlassTooltip';
import { useFileActions } from '../hooks/useFileActions';
import { isSensitivePath } from '../utils/security';

interface Props {
  sessionId: string;
  username?: string;
}

export const FsTopBar = ({ sessionId, username }: Props) => {
  const { t } = useTranslation();
  
  const { 
    getSession, setPath, goBack, goForward, goUp, toggleHidden,
    toggleTracking // 🟢 获取切换方法
  } = useFileStore();

  const { toggleOpen: toggleTransfer } = useTransferStore();

  const { 
    handleUpload, executeAction, isSubmitting, toastMessage 
  } = useFileActions(sessionId);
  
  const sessionState = getSession(sessionId);
  const { currentPath, showHidden, isTracking } = sessionState; // 🟢 获取 isTracking 状态

  const [inputPath, setInputPath] = useState(currentPath);
  const [isFocused, setIsFocused] = useState(false);

  const isSensitive = isSensitivePath(currentPath);

  useEffect(() => {
    setInputPath(currentPath);
  }, [currentPath]);

const handlePathSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // 🟢 增加第三个参数 true，告诉 store 这是手动导航，请关闭跟随
      setPath(sessionId, inputPath, true);
      (e.target as HTMLInputElement).blur();
    }
  };

  const btnClass = "p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

  return (
    <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative select-none">
      
      {/* --- Toast 反馈提示 --- */}
      {toastMessage && (
          <div className={clsx(
              "absolute top-14 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full shadow-xl text-xs flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200 border pointer-events-none",
              toastMessage.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/90 dark:border-red-800 dark:text-red-100' 
                : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-200'
          )}>
              {toastMessage.type === 'error' ? <XCircle className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {toastMessage.msg}
          </div>
      )}

      {/* --- 1. 导航按钮组 --- */}
      <div className="flex items-center gap-1 shrink-0">
        <GlassTooltip content={t('fs.nav.back', 'Back')} side="bottom">
            <button 
                onClick={() => goBack(sessionId)} 
                className={btnClass}
                disabled={sessionState.historyIndex <= 0}
            >
                <ArrowLeft className="w-4 h-4" />
            </button>
        </GlassTooltip>
        
        <GlassTooltip content={t('fs.nav.forward', 'Forward')} side="bottom">
            <button 
                onClick={() => goForward(sessionId)} 
                className={btnClass}
                disabled={sessionState.historyIndex >= sessionState.history.length - 1}
            >
                <ArrowRight className="w-4 h-4" />
            </button>
        </GlassTooltip>

        <GlassTooltip content={t('fs.nav.up', 'Up Level')} side="bottom">
            <button onClick={() => goUp(sessionId)} className={btnClass}>
                <ArrowUp className="w-4 h-4" />
            </button>
        </GlassTooltip>

      </div>

      {/* --- 2. 地址栏 --- */}
      <div className={clsx(
          "flex-1 flex items-center px-3 py-1.5 rounded-md border transition-all duration-300 relative overflow-hidden mx-2",
          isSensitive 
              ? "bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800" 
              : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500/20"
      )}>
        {isSensitive && (
            <div className="mr-2 text-red-500 animate-in fade-in zoom-in duration-300 shrink-0">
                <FolderLock className="w-4 h-4" />
            </div>
        )}

        <input 
          type="text"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          onKeyDown={handlePathSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
              setIsFocused(false);
              setInputPath(currentPath);
          }}
          className={clsx(
              "w-full bg-transparent text-sm outline-none font-mono min-w-0 transition-colors",
              isSensitive 
                  ? "text-red-700 dark:text-red-200 placeholder:text-red-400 selection:bg-red-200 dark:selection:bg-red-900" 
                  : "text-slate-700 dark:text-slate-200"
          )}
          spellCheck={false}
        />

        {/* 敏感文字提示 */}
        {isSensitive && !isFocused && (
            <span className="text-[10px] uppercase font-bold text-red-500/70 select-none ml-2 tracking-wider hidden sm:block whitespace-nowrap">
                {t('fs.nav.protected', 'System Protected')}
            </span>
        )}
      </div>

      {/* --- 3. 身份标签 --- */}
      {username && (
        <div className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium shrink-0 select-none mr-1 transition-colors",
            username === 'root' 
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
        )} title={username}>
            {username === 'root' ? <ShieldAlert className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[120px]">
                {username}
            </span>
        </div>
      )}

      {/* --- 4. 功能按钮组 --- */}
      <div className="flex items-center gap-1 shrink-0">
        
        {/* 🟢 [新增] 目录跟随开关 */}
        <GlassTooltip 
            content={isTracking ? t('fs.action.trackingOn', 'Sync: ON') : t('fs.action.trackingOff', 'Sync: OFF')} 
            side="bottom"
        >
            <button 
                onClick={() => toggleTracking(sessionId)}
                className={clsx(
                    btnClass, 
                    isTracking 
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                        : "opacity-70 hover:opacity-100"
                )}
            >
                <Magnet className={clsx("w-4 h-4 transition-transform duration-300", isTracking && "rotate-180")} />
            </button>
        </GlassTooltip>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        <GlassTooltip content={t('fs.action.refresh', 'Refresh')} side="bottom">
            <button 
                onClick={() => executeAction('refresh')} 
                className={btnClass}
            >
                <RotateCw className="w-4 h-4" />
            </button>
        </GlassTooltip>
        
        <GlassTooltip content={t('fs.action.upload', 'Upload File')} side="bottom">
            <button 
                className={btnClass} 
                onClick={handleUpload}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                    <Upload className="w-4 h-4" />
                )}
            </button>
        </GlassTooltip>
        
        <GlassTooltip 
            content={showHidden ? t('fs.view.hideHidden', 'Hide Hidden Files') : t('fs.view.showHidden', 'Show Hidden Files')} 
            side="bottom"
        >
            <button 
                onClick={() => toggleHidden(sessionId)} 
                className={clsx(btnClass, showHidden && 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100')}
            >
                {showHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </GlassTooltip>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        <GlassTooltip content={t('fs.transfer.manager', 'Transfers')} side="bottom">
            <button 
                onClick={toggleTransfer}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400 transition-colors flex items-center justify-center"
            >
                <ArrowRightLeft className="w-4 h-4" />
            </button>
        </GlassTooltip>
      </div>
    </div>
  );
};