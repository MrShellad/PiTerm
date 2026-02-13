import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Network } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BaseModal } from "@/components/common/BaseModal"; 
import { ProxyItem, ProxyType } from "../../domain/types";
import { useKeyStore } from "@/store/useKeyStore"; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proxy: ProxyItem) => void;
  initialData?: ProxyItem;
}

// 🔐 简易加密工具 (保持不变)
const SimpleCrypto = {
  encrypt: (text: string, key: string) => {
    if (!key) return text;
    try {
      const textBytes = new TextEncoder().encode(text);
      const keyBytes = new TextEncoder().encode(key);
      const resultBytes = new Uint8Array(textBytes.length);
      for (let i = 0; i < textBytes.length; i++) {
        resultBytes[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      return btoa(String.fromCharCode(...Array.from(resultBytes)));
    } catch (e) {
      console.error("Encrypt failed", e);
      return "";
    }
  },
  decrypt: (cipher: string, key: string) => {
    if (!key) return "";
    try {
      const encryptedStr = atob(cipher);
      const encryptedBytes = new Uint8Array(encryptedStr.length);
      for (let i = 0; i < encryptedStr.length; i++) {
        encryptedBytes[i] = encryptedStr.charCodeAt(i);
      }
      
      const keyBytes = new TextEncoder().encode(key);
      const resultBytes = new Uint8Array(encryptedBytes.length);
      
      for (let i = 0; i < encryptedBytes.length; i++) {
        resultBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      return new TextDecoder().decode(resultBytes);
    } catch (e) {
      try { return atob(cipher); } catch (_) { return ""; }
    }
  }
};

export const ProxyEditDialog = ({ isOpen, onClose, onSave, initialData }: Props) => {
  const { t } = useTranslation();
  const encryptionKey = useKeyStore(s => s.encryptionKey); 

  const [formData, setFormData] = useState({
    name: '',
    type: 'http' as ProxyType,
    host: '',
    port: '',
    username: '',
    password: ''
  });

  // 初始化数据 (保持不变)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let user = '';
        let pass = '';
        
        if (initialData.encryptedAuth && encryptionKey) {
          try {
            const json = SimpleCrypto.decrypt(initialData.encryptedAuth, encryptionKey);
            if (json) {
                const auth = JSON.parse(json);
                user = auth.username || '';
                pass = auth.password || '';
            }
          } catch (e) {
            console.error("Failed to decrypt proxy auth", e);
          }
        }

        setFormData({
          name: initialData.name,
          type: initialData.type,
          host: initialData.host,
          port: String(initialData.port),
          username: user,
          password: pass
        });
      } else {
        setFormData({ name: '', type: 'http', host: '', port: '', username: '', password: '' });
      }
    }
  }, [isOpen, initialData, encryptionKey]);

  const handleSave = () => {
    if (!formData.host || !formData.port) return;

    let encryptedAuth = undefined;
    
    if ((formData.username || formData.password) && encryptionKey) {
        const payload = JSON.stringify({ 
            username: formData.username, 
            password: formData.password 
        });
        encryptedAuth = SimpleCrypto.encrypt(payload, encryptionKey);
    }

    const now = Date.now();

    const newProxy: ProxyItem = {
      id: initialData?.id || `proxy-${now}`,
      name: formData.name || `${formData.host}:${formData.port}`,
      type: formData.type,
      host: formData.host,
      port: Number(formData.port),
      encryptedAuth,
      createdAt: initialData?.createdAt || now,
      updatedAt: now 
    };

    onSave(newProxy);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t('settings.proxy.edit', 'Edit Proxy') : t('settings.proxy.add', 'Add Proxy')}
      icon={<Network className="w-5 h-5" />} 
      className="max-w-md z-[200]" 
    >
      <div className="space-y-5">
        <div className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-slate-500">{t('settings.proxy.name', 'Name')}</Label>
            <Input 
              className="col-span-3" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              // 🟢 [Loc] Placeholder
              placeholder={t('settings.proxy.name_placeholder', 'Optional alias')} 
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-slate-500">{t('settings.proxy.type', 'Type')}</Label>
            <div className="col-span-3">
              <Select value={formData.type} onValueChange={(v: ProxyType) => setFormData({...formData, type: v})}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[250]">
                  {/* 🟢 Protocols usually remain in English, but you can translate if needed */}
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="socks4">SOCKS4</SelectItem>
                  <SelectItem value="socks5">SOCKS5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            {/* 🟢 [Loc] Host */}
            <Label className="text-right text-slate-500">{t('settings.proxy.host', 'Host')}</Label>
            <Input 
              className="col-span-3 font-mono" 
              value={formData.host} 
              onChange={e => setFormData({...formData, host: e.target.value})} 
              placeholder="127.0.0.1" // Technical placeholders often stay as is
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            {/* 🟢 [Loc] Port */}
            <Label className="text-right text-slate-500">{t('settings.proxy.port', 'Port')}</Label>
            <Input 
              className="col-span-3 font-mono" 
              type="number" 
              value={formData.port} 
              onChange={e => setFormData({...formData, port: e.target.value})} 
              placeholder="8080" 
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
            {/* 🟢 [Loc] Auth Header */}
            <p className="text-xs text-slate-500 mb-3 font-medium px-1">
              {t('settings.proxy.auth_hint', 'Authentication (Encrypted with Master Key)')}
            </p>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 {/* 🟢 [Loc] Username */}
                 <Label className="text-xs text-slate-400">{t('settings.proxy.username', 'Username')}</Label>
                 <Input 
                   value={formData.username} 
                   onChange={e => setFormData({...formData, username: e.target.value})} 
                   // 🟢 [Loc] Optional
                   placeholder={t('common.optional', 'Optional')}
                 />
               </div>
               <div className="space-y-1">
                 {/* 🟢 [Loc] Password */}
                 <Label className="text-xs text-slate-400">{t('settings.proxy.password', 'Password')}</Label>
                 <Input 
                   type="password" 
                   value={formData.password} 
                   onChange={e => setFormData({...formData, password: e.target.value})} 
                   // 🟢 [Loc] Optional
                   placeholder={t('common.optional', 'Optional')}
                 />
               </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('common.save', 'Save')}
          </Button>
        </div>

      </div>
    </BaseModal>
  );
};