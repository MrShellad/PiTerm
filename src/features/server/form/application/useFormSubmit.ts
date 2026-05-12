import { useServerStore } from "@/features/server/application/useServerStore";
import { ServerFormValues } from "../domain/schema";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useTranslation } from "react-i18next"; // 🟢 1. 引入 hook

// 🟢 [移除] 不再需要在前端手动操作 KeyStore
// import { useKeyStore } from "@/store/useKeyStore";

export const useFormSubmit = (onSuccess?: () => void) => {
  const { t } = useTranslation(); // 🟢 2. 初始化翻译函数
  const { addOrUpdateServer } = useServerStore();
  // const { addKey, openGlobalUnlockModal } = useKeyStore(); // 移除

  const submit = async (data: ServerFormValues) => {
    try {

      // 🟢 [重构] 直接构造实体，不再手动调用 addKey
      // 后端 Rust 的 save_server 命令现在已经能够自动识别：
      // 如果 password 有值且不为空 -> 自动存入 Vault -> 更新 password_id
      
      const serverEntity: any = {
        id: data.id || uuidv4(),
        name: data.name || data.host,
        ip: data.host,
        port: data.port,
        username: data.username,
        provider: data.provider?.trim() || "",
        
        authType: data.authType, 
        os: data.os,
        icon: data.icon,
        sort: data.sort,
        tags: data.tags,
        enableExpiration: data.enableExpiration,
        expireDate: data.expireDate ? data.expireDate.toISOString() : undefined,
        
        isPinned: !!data.is_pinned, 

        // 直接透传表单里的 ID
        // 如果是 manual 模式，这里是 undefined，后端会生成新的
        // 如果是 store 模式，这里是选中的 keyId
        passwordId: data.passwordId,
        keyId: data.keyId,

        passwordSource: data.passwordSource,
        keySource: data.keySource,

        // 🟢 [关键修改] 直接把明文传给后端，让后端去加密存储
        // 只有当用户在 manual 模式输入了新密码时，这些字段才有值
        password: data.password, 
        privateKey: data.privateKey,
        passphrase: data.passphrase,

        connectionType: data.connectionType, 
        proxyId: data.proxyId,

        // 高级设置
        connectTimeout: data.connectTimeout,
        keepAliveInterval: data.keepAliveInterval,
        autoReconnect: data.autoReconnect,
        maxReconnects: data.maxReconnects,
      };


      // 5. 保存 (后端会处理一切：Vault存储 + Server保存)
      await addOrUpdateServer(serverEntity);
      
      // 🟢 3. 本地化成功提示
      toast.success(t('server.form.saveSuccess', 'Server saved successfully'));
      onSuccess?.();

    } catch (error: any) {
      console.error("Submit failed", error);
      
      // 依然需要捕获 Locked 错误 (虽然现在应该很少见了)
      if (error?.toString().includes("VAULT_LOCKED")) {
        // 🟢 4. 本地化锁定提示
        toast.warning(t('server.form.vault.locked_save', 'Please unlock the Vault to save secure credentials.'));
        return;
      }

      // 🟢 5. 本地化错误提示 (使用插值)
      toast.error(t('server.form.saveError', 'Failed to save server: {{message}}', { 
        message: error.message || error 
      }));
    }
  };

  return { submit };
};
