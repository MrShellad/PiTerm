import { useServerStore } from "@/features/server/application/useServerStore";
import { useKeyStore } from "@/store/useKeyStore";
import { ServerFormValues } from "../domain/schema";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useFormSubmit = (onSuccess?: () => void) => {
  const { t } = useTranslation();
  const { addOrUpdateServer } = useServerStore();
  const openGlobalUnlockModal = useKeyStore((state) => state.openGlobalUnlockModal);

  const submit = async (data: ServerFormValues) => {
    try {
      const serverEntity: any = {
        id: data.id || uuidv4(),
        name: data.name || data.host,
        ip: data.host,
        port: data.port,
        username: data.username,
        provider: data.provider?.trim() || "",
        theme: data.theme || "sapphire",
        
        authType: data.authType, 
        os: data.os,
        icon: data.icon,
        sort: data.sort,
        tags: data.tags,
        
        enableExpiration: data.enableExpiration,
        expireDate: data.enableExpiration && data.expireDate ? data.expireDate.toISOString() : undefined,
        
        isPinned: !!data.is_pinned, 

        // 🟢 [逻辑清洗] 根据 authType 隔离认证数据，消除沉淀脏数据
        passwordId: data.authType === 'password' ? data.passwordId : undefined,
        passwordSource: data.authType === 'password' ? data.passwordSource : undefined,
        password: data.authType === 'password' ? data.password : undefined,

        keyId: data.authType === 'key' ? data.keyId : undefined,
        keySource: data.authType === 'key' ? data.keySource : undefined,
        privateKey: data.authType === 'key' ? data.privateKey : undefined,
        passphrase: data.authType === 'key' ? data.passphrase : undefined,

        // 🟢 [逻辑清洗] 直连模式下情况代理 ID
        connectionType: data.connectionType, 
        proxyId: data.connectionType !== 'direct' ? data.proxyId : undefined,

        // 高级设置
        connectTimeout: data.connectTimeout,
        keepAliveInterval: data.keepAliveInterval,
        autoReconnect: data.autoReconnect,
        maxReconnects: data.autoReconnect ? data.maxReconnects : 3,
      };

      // 保存 (后端会处理 Vault 存储 + Server 保存)
      await addOrUpdateServer(serverEntity);
      
      toast.success(t('server.form.saveSuccess', 'Server saved successfully'));
      onSuccess?.();

    } catch (error: any) {
      console.error("Submit failed", error);
      
      if (error?.toString().includes("VAULT_LOCKED")) {
        toast.info(t('server.form.vault.locked_save', 'Please unlock the Vault to save secure credentials.'));
        openGlobalUnlockModal(() => submit(data));
        return;
      }

      toast.error(t('server.form.saveError', 'Failed to save server: {{message}}', { 
        message: error.message || error 
      }));
    }
  };

  return { submit };
};
