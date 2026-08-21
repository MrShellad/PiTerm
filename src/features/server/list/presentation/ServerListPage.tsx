import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useServerListLogic } from "../application/useServerListLogic";
import { ServerListHeader } from "./ServerListHeader";
import { ServerGrid } from "./ServerGrid";
import { ServerTableView } from "./ServerTableView";
import { ServerListSkeleton } from "./ServerListSkeleton";
import { ServerModal } from "./ServerModal";
import { DeleteServerModal } from "../components/DeleteServerModal"; 
// 🟢 [新增] 引入验证弹窗和连接 Hook
import { HostKeyVerificationModal } from "@/features/server/components/HostKeyVerificationModal";
import { useServerConnect } from "@/features/server/form/application/useServerConnect";
import { ConnectionStatusModal } from "@/features/server/components/ConnectionStatusModal";
import { Server } from "@/features/server/domain/types";
import { ViewMode, CardSize } from "../domain/types";
import { useKeyStore } from "@/store/useKeyStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export const ServerListPage = () => {
  const { t } = useTranslation();
  
  const { 
    state, 
    servers, 
    allTags, 
    actions: logicActions, // 重命名以避免冲突
    deleteModalState, 
    setDeleteModalState,
    isLoading,
    shouldAnimate
  } = useServerListLogic();
  
  // 🟢 [新增] 在页面层级初始化连接 Hook，以获取验证弹窗的状态
  const { 
    connect,
    isConnecting,
    logs,
    isLogError,
    pendingServer,
    closeLogModal, 
    verificationData, 
    handleTrustAndConnect, 
    handleCancelVerification 
  } = useServerConnect();

  const { 
    viewMode, 
    serverCardSize, 
    setViewMode, 
    setServerCardSize 
  } = useSettingsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isPreparingList, setIsPreparingList] = useState(true);

  useEffect(() => {
    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const revealList = () => {
      timerId = globalThis.setTimeout(() => setIsPreparingList(false), 80);
    };

    const requestIdle = window.requestIdleCallback?.bind(window);
    if (requestIdle) {
      idleId = requestIdle(revealList, { timeout: 160 });
    } else {
      timerId = globalThis.setTimeout(() => setIsPreparingList(false), 100);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) globalThis.clearTimeout(timerId);
    };
  }, []);

  const isUnlocked = useKeyStore((state) => state.status === 'unlocked');
  const openGlobalUnlockModal = useKeyStore((state) => state.openGlobalUnlockModal);

  const handleAdd = () => {
    if (!isUnlocked) {
      toast.info(t('server.vault.locked_add', "Please unlock the Vault to add a server."));
      openGlobalUnlockModal(() => {
        setEditingServer(null);
        setIsModalOpen(true);
      });
      return;
    }
    setEditingServer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (server: Server) => {
    if (!isUnlocked) {
      toast.info(t('server.vault.locked_edit', "Please unlock the Vault to edit details."));
      openGlobalUnlockModal(() => {
        setEditingServer(server);
        setIsModalOpen(true);
      });
      return;
    }
    setEditingServer(server);
    setIsModalOpen(true);
  };

  const displayState = {
    ...state,
    viewMode: viewMode as ViewMode,       
    cardSize: serverCardSize as CardSize, 
  };

  // 🟢 [核心修改] 组合 Actions，使用本地的 connect 覆盖逻辑层的 handleConnect
  // 这样点击连接时，才能正确触发本页面的 HostKeyVerificationModal 状态更新
  const displayActions = {
    ...logicActions,
    setViewMode: (mode: ViewMode) => setViewMode(mode as any),             
    setCardSize: (size: CardSize) => setServerCardSize(size as any),
    // 覆盖连接动作
    handleConnect: (server: Server) => {
        // useServerConnect 内部已经包含了保险库解锁检查，这里直接调用即可
        connect(server);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden select-none">
      <div className="mb-3 pt-2 shrink-0">
        <ServerListHeader
          state={displayState}
          allTags={allTags}
          actions={displayActions}
          onAddClick={handleAdd}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative px-2 pb-2">
         {isLoading || isPreparingList ? (
           <ServerListSkeleton
             viewMode={viewMode as ViewMode}
             cardSize={serverCardSize as CardSize}
           />
         ) : viewMode === 'grid' ? (
           <ServerGrid 
             servers={servers} 
             cardSize={serverCardSize as CardSize}
             actions={displayActions} // 使用包含新 connect 的 actions
             onEdit={handleEdit}
             isLoading={isLoading} 
             shouldAnimate={shouldAnimate}
           />
         ) : (
           <ServerTableView 
             servers={servers}
             actions={displayActions} // 使用包含新 connect 的 actions
             onEdit={handleEdit}
             onTagClick={logicActions.setFilterTag} 
             isLoading={isLoading} 
           />
         )}
      </div>

      <ServerModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={editingServer}
        onClose={() => setIsModalOpen(false)}
      />

      <DeleteServerModal 
        isOpen={deleteModalState.isOpen}
        onOpenChange={(open) => setDeleteModalState(prev => ({ ...prev, isOpen: open }))}
        server={deleteModalState.server}
        relatedKeyId={deleteModalState.relatedKeyId}
        relatedKeyType={deleteModalState.relatedKeyType}
        isKeyUsedByOthers={deleteModalState.isKeyUsedByOthers}
        relatedServerNames={deleteModalState.relatedServerNames}
        onConfirm={logicActions.confirmDelete}
      />
      {/* 🟢 [新增] 连接日志状态弹窗 */}
      <ConnectionStatusModal 
        open={isConnecting} 
        logs={logs} 
        isError={isLogError}
        serverName={pendingServer?.name || "Server"} // 注意这里需要从 Hook 里取当前 server
        onClose={closeLogModal}
      />
      {/* 🟢 [新增] 挂载主机密钥验证弹窗 */}
      <HostKeyVerificationModal 
        open={!!verificationData}
        data={verificationData}
        onConfirm={handleTrustAndConnect}
        onCancel={handleCancelVerification}
      />
    </div>
  );
};
