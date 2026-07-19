import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Network, Globe, ShieldCheck } from "lucide-react"; 
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProxyItem } from "@/features/settings/domain/types";
import { useMemo } from "react"; // 🟢 [新增] 引入 useMemo

interface ProxyConfigurationProps {
  t: any;
  mode: string;
  onModeChange: (mode: string) => void;
  
  proxyId?: string;
  onProxySelect: (id: string) => void;
  
  availableProxies: ProxyItem[]; 
}

// ... SegmentedControl 保持不变 ...
const SegmentedControl = ({ value, onChange, options }: any) => (
  <div className="flex p-1 bg-muted rounded-lg w-full">
    {options.map((opt: any) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={cn(
          "flex-1 relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2 z-10",
          value === opt.value 
            ? "text-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {value === opt.value && (
          <motion.div
            layoutId="proxy-segment"
            className="absolute inset-0 bg-background shadow-sm rounded-md -z-10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
          />
        )}
        <opt.icon className="w-3.5 h-3.5" />
        {opt.label}
      </button>
    ))}
  </div>
);

export const ProxyConfiguration = ({ 
  t, mode, onModeChange, 
  proxyId, onProxySelect, availableProxies 
}: ProxyConfigurationProps) => {
  
  const options = [
    { value: 'direct', label: t('proxy.mode.direct', 'Direct'), icon: Network },
    { value: 'http', label: 'HTTP', icon: Globe },
    { value: 'socks5', label: 'SOCKS', icon: ShieldCheck },
  ];

  // 🟢 [核心修复] 计算“显示用”的值
  // 逻辑：如果当前的 proxyId 在 availableProxies 列表中找不到，说明模式切了，
  // 这时候 UI 上应该显示“未选择”（undefined），从而触发 Placeholder 显示。
  // 但底层的 proxyId 依然保留，切回去时这里会重新变成有效值。
  const displayValue = useMemo(() => {
    if (!proxyId) return undefined;
    const exists = availableProxies.some(p => p.id === proxyId);
    return exists ? proxyId : undefined;
  }, [proxyId, availableProxies]);

  return (
    <div className="space-y-1">
       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('server.form.connectionMode', 'Connection Mode')}
       </Label>
       
       <SegmentedControl value={mode} onChange={onModeChange} options={options} />

       <AnimatePresence mode="wait">
         {mode !== 'direct' && (
           <motion.div
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             exit={{ opacity: 0, height: 0 }}
             className="overflow-hidden"
           >
             <div className="p-3 mt-2 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                      <Label className="text-xs text-muted-foreground">
                          {t('server.form.select_proxylabel', 'Select Proxy Profile')}
                      </Label>
                   </div>
                   
                   <div className="flex gap-2">
                     <Select 
                        // 🟢 [优化] Key 加入 mode，确保切换模式时组件彻底重置
                        key={`${mode}-${proxyId}-${availableProxies.length}`}
                        
                        // 🟢 [修复] 使用计算后的 displayValue
                        value={displayValue} 

                        onValueChange={onProxySelect}
                     >
                        <SelectTrigger className="flex-1 bg-background border-border h-9 text-xs">
                           <SelectValue placeholder={t('server.form.select_proxyplaceholder', 'Choose a proxy...')} />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                           {availableProxies.length === 0 ? (
                             <div className="p-2 text-xs text-muted-foreground text-center">
                               {t('server.form.list_proxyempty', 'No matching proxies found')}
                             </div>
                           ) : (
                             availableProxies.map((p) => (
                               <SelectItem key={p.id} value={p.id}>
                                 <div className="flex flex-col items-start">
                                     <span className="font-medium text-xs">{p.name}</span>
                                     <span className="text-xs text-muted-foreground font-mono">
                                       {p.host}:{p.port} ({p.type.toUpperCase()})
                                     </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                         </SelectContent>
                      </Select>
                   </div>
                </div>
                
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1 pt-0.5">
                   <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                   {t('proxy.security.note', 'Credentials are encrypted securely using AES-256.')}
                </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};