// src/features/server/form/presentation/components/KeySelectorModal.tsx
import { useKeyStore } from "@/store/useKeyStore"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KeyRound, Search, FileKey2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useTranslation } from "react-i18next"; // 🟢 [新增]

interface KeySelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (keyId: string) => void;
}

export const KeySelectorModal = ({ open, onOpenChange, onSelect }: KeySelectorModalProps) => {
  const { t } = useTranslation(); // 🟢 [新增]
  const { keys } = useKeyStore(); 
  const [search, setSearch] = useState("");

  const filteredKeys = useMemo(() => {
    if (!keys) return [];
    return keys.filter((k: any) => {
        // 确保只列出密钥类型
        const isKeyType = k.type === 'private_key' || k.type === 'key';
        const matchesSearch = k.name.toLowerCase().includes(search.toLowerCase());
        return isKeyType && matchesSearch;
    });
  }, [keys, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileKey2 className="w-5 h-5" /> 
            {/* 🟢 [修改] 本地化标题 */}
            {t('server.form.vault.selectKeyTitle', 'Select Private Key from Vault')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索栏 */}
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input 
                placeholder={t('server.form.vault.searchKeys', 'Search keys...')} // 🟢 [修改] 本地化占位符
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>

          {/* 列表区域 */}
          <div className="border rounded-md max-h-[400px] overflow-y-auto">
             <Table>
                <TableHeader>
                   <TableRow>
                      <TableHead>{t('common.name', 'Name')}</TableHead> {/* 🟢 [修改] */}
                      <TableHead>{t('common.created', 'Created')}</TableHead> {/* 🟢 [修改] */}
                      <TableHead className="text-right">{t('common.action', 'Action')}</TableHead> {/* 🟢 [修改] */}
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredKeys.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            {t('server.form.vault.noKeysFound', 'No private keys found in Vault.')} {/* 🟢 [修改] */}
                         </TableCell>
                      </TableRow>
                   ) : (
                      filteredKeys.map((key: any) => (
                         <TableRow key={key.id} className="group">
                            <TableCell className="font-medium flex items-center gap-2">
                               <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                  <KeyRound className="w-4 h-4" />
                               </div>
                               {key.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                               {key.created_at ? format(new Date(key.created_at), 'yyyy-MM-dd') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                               <Button size="sm" onClick={() => onSelect(key.id)}>
                                  {t('common.select', 'Select')} {/* 🟢 [修改] */}
                               </Button>
                            </TableCell>
                         </TableRow>
                      ))
                   )}
                </TableBody>
             </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};