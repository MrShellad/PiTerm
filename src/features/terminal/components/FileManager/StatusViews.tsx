// src/features/terminal/components/FileManager/StatusViews.tsx
import { FolderOpen, AlertTriangle, Terminal as TerminalIcon, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RetryProps {
  onRetry: () => void;
}

export const NoSessionView = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-950">
       <FolderOpen className="w-10 h-10 mb-2 opacity-20" />
       <span>{t('fs.status.noConnection', 'No connection')}</span>
    </div>
  );
};

export const NoSftpView = ({ onRetry }: RetryProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-white dark:bg-slate-950 p-6 text-center animate-in fade-in zoom-in-95">
      <div className="p-4 bg-orange-100 dark:bg-orange-900/20 rounded-full">
           <AlertTriangle className="w-8 h-8 text-orange-500" />
      </div>
      <div>
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">
              {t('fs.status.noSftpTitle', 'SFTP Not Available')}
          </h3>
          <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              {t('fs.status.sftpRejected', 'The server rejected the SFTP connection request.')} <br/>
              {t('fs.status.openwrtHint1', 'If this is an ')}<b>OpenWrt</b>{t('fs.status.openwrtHint2', ' device, you may need to install the SFTP server:')}
          </p>
      </div>
      
      <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 flex items-center gap-3 max-w-sm w-full">
          <TerminalIcon className="w-4 h-4 text-slate-400 shrink-0" />
          <code className="text-xs font-mono text-slate-700 dark:text-slate-300 flex-1 text-left select-all">
              opkg update && opkg install openssh-sftp-server
          </code>
      </div>

      <button 
           onClick={onRetry} 
           className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
      >
          {t('fs.action.retryConnection', 'Retry Connection')}
      </button>
   </div>
  );
};

export const TimeoutView = ({ onRetry }: RetryProps) => {
  const { t } = useTranslation();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-3 bg-white dark:bg-slate-950 p-6">
      <RefreshCw className="w-10 h-10 text-red-500 opacity-80" />
      <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">
          {t('fs.status.timeoutTitle', 'Connection Timed Out')}
      </h3>
      <p className="text-sm text-slate-500">
          {t('fs.status.timeoutDesc', 'SFTP handshake took too long to respond.')}
      </p>
      <button onClick={onRetry} className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">
          {t('common.tryAgain', 'Try Again')}
      </button>
    </div>
  );
};

export const WaitingConnectionView = ({ onForceLoad }: { onForceLoad: () => void }) => {
  const { t } = useTranslation();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-3 bg-white dark:bg-slate-950">
       <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
       <span className="text-xs font-medium opacity-80">
           {t('fs.status.waiting', 'Waiting for SSH connection...')}
       </span>
       <button onClick={onForceLoad} className="text-[10px] text-blue-500 hover:underline opacity-50 hover:opacity-100">
           {t('fs.action.forceLoad', 'Force Load')}
       </button>
    </div>
  );
};