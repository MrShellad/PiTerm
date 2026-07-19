import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Server as ServerIcon } from "lucide-react";

import { BaseModal } from "@/components/common/BaseModal";
import { ServerForm } from "@/features/server/form";
import { ServerFormValues } from "@/features/server/form/domain/schema";
import { Server } from "@/features/server/domain/types";

interface ServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Server | null;
  onClose: () => void;
}

export const ServerModal = ({ open, onOpenChange, initialData, onClose }: ServerModalProps) => {
  const { t } = useTranslation();
  
  const handleClose = () => {
      onOpenChange(false);
      onClose();
  };

  // 1. 计算弹窗标题
  const isEditMode = !!initialData?.id;
  const modalTitle = isEditMode 
    ? t('server.form.titleEdit', 'Edit Server') 
    : t('server.form.titleNew', 'New Server');

  // 2. 准备表单初始数据
  const formDefaultValues = useMemo((): ServerFormValues | undefined => {
    if (!initialData) return undefined;

    const rawAuthType = (initialData as any).authType || initialData.authType;

    return {
      id: initialData.id,
      name: initialData.name,
      host: initialData.ip,     
      port: initialData.port,
      username: initialData.username,
      icon: initialData.icon,
      os: initialData.os,
      
      connectionType: initialData.connectionType ?? "direct",
      proxyId: initialData.proxyId,

      authType: rawAuthType,
      
      passwordId: initialData.passwordId,
      passwordSource: initialData.passwordId ? 'store' : 'manual',
      password: initialData.password || "",
      
      keyId: initialData.keyId,
      keySource: initialData.keyId ? 'store' : 'manual',
      privateKey: initialData.keyId || (initialData as any).privateKey || "", 
      passphrase: initialData.passphrase || "",
      
      provider: (initialData as any).provider,
      tags: initialData.tags || [],
      sort: initialData.sort,

      is_pinned: initialData.isPinned, 

      enableExpiration: initialData.enableExpiration,
      expireDate: initialData.expireDate ? new Date(initialData.expireDate) : undefined,

      connectTimeout: initialData.connectTimeout ?? 10,
      keepAliveInterval: initialData.keepAliveInterval ?? 60,
      autoReconnect: initialData.autoReconnect ?? false,
      maxReconnects: initialData.maxReconnects ?? 3,
    };
  }, [initialData]);

  return (
    <BaseModal
      isOpen={open}
      onClose={handleClose}
      title={modalTitle}
      icon={<ServerIcon className="w-5 h-5" />}
      className="max-w-4xl h-[85vh] max-h-[750px] min-h-[500px] flex flex-col z-[50]"
    >
      <ServerForm 
        initialData={formDefaultValues}
        onClose={handleClose}
      />
    </BaseModal>
  );
};
