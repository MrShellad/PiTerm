import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
// ⚠️ 请根据你的实际目录结构确认引用路径
import { ServerFormValues } from "../../domain/schema";
import { Zap, Activity, Timer, RefreshCw } from "lucide-react";

interface AdvancedSettingsProps {
  t: any; // 这里的类型取决于你使用的 i18n 库，通常是 TFunction
  register: UseFormRegister<ServerFormValues>;
  errors: FieldErrors<ServerFormValues>;
  watch: UseFormWatch<ServerFormValues>;
  setValue: UseFormSetValue<ServerFormValues>;
}

export const AdvancedSettings = ({ t, register, errors, watch, setValue }: AdvancedSettingsProps) => {
  // 监听自动重连开关
  const autoReconnect = watch("autoReconnect");

  // 安全翻译辅助函数
  const translate = (key: string, fallback: string) => t ? t(key, fallback) : fallback;

  // 🚫 核心逻辑：拦截非法字符 (负号、小数点、e指数)
  const preventInvalidInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 允许的操作: Backspace, Delete, Tab, Escape, Enter, 方向键
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      return;
    }
    // 禁止输入: e, E, +, -, . (防止科学计数法、负数、小数)
    if (["e", "E", "+", "-", "."].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-4 pt-2">
      
      {/* 1. 连接超时 (Connection Timeout) */}
      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 shrink-0">
            <Timer className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-xs font-bold text-foreground block">
            {translate('server.form.timeout', 'Connection Timeout')}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {translate('server.form.timeoutDesc', 'Max wait time in seconds (Integer only).')}
          </p>
          {errors.connectTimeout && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.connectTimeout.message}</p>
          )}
        </div>
        <div className="w-20 shrink-0">
          <Input 
            type="number"
            min={1} 
            step={1} 
            onKeyDown={preventInvalidInput} 
            {...register("connectTimeout", { 
              valueAsNumber: true,
              required: "Required",
              min: { value: 1, message: "Min 1s" }
            })}
            className="h-8 text-right text-xs bg-background border-border font-mono"
            placeholder="10"
          />
        </div>
      </div>

      {/* 2. 心跳间隔 (Keep-Alive) */}
      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 shrink-0">
            <Activity className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-xs font-bold text-foreground block">
            {translate('server.form.keepalive', 'Keep-Alive Interval')}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {translate('server.form.keepaliveDesc', 'Seconds between packets (0 to disable).')}
          </p>
           {errors.keepAliveInterval && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.keepAliveInterval.message}</p>
          )}
        </div>
        <div className="w-20 shrink-0">
          <Input 
            type="number" 
            min={0}
            step={1}
            onKeyDown={preventInvalidInput}
            {...register("keepAliveInterval", { 
              valueAsNumber: true,
              min: { value: 0, message: "Min 0" }
            })}
            className="h-8 text-right text-xs bg-background border-border font-mono"
            placeholder="60"
          />
        </div>
      </div>

      {/* 3. 自动重连 (Auto Reconnect) */}
      <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 shrink-0">
            <Zap className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-xs font-bold text-foreground block">
            {translate('server.form.reconnect', 'Auto Reconnect')}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {translate('server.form.reconnectDesc', 'Automatically retry if disconnected.')}
          </p>
        </div>
        <Switch 
          checked={!!autoReconnect}
          onCheckedChange={(val) => setValue("autoReconnect", val, { shouldDirty: true })}
          className="scale-90 shrink-0"
        />
      </div>

      {/* 4. 最大重连次数 (Max Retries) - 仅当开启自动重连时显示 */}
      {autoReconnect && (
        <div className="flex items-center gap-4 p-3.5 rounded-xl border border-border/70 bg-muted/30 ml-4 border-l-4 border-l-blue-500/50 shadow-sm">
          <RefreshCw className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <Label className="text-xs font-bold text-foreground block">
                {translate('server.form.retries', 'Max Retries')}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
                {translate('server.form.retriesDesc', 'Maximum attempts (Integer).')}
            </p>
             {errors.maxReconnects && (
              <p className="text-xs text-destructive mt-1 font-medium">{errors.maxReconnects.message}</p>
            )}
          </div>
          <div className="w-20 shrink-0">
             <Input 
                type="number" 
                min={0}
                step={1}
                onKeyDown={preventInvalidInput}
                {...register("maxReconnects", { 
                  valueAsNumber: true,
                  min: { value: 0, message: "Min 0" }
                })}
                className="h-8 text-right text-xs bg-background border-border font-mono"
                placeholder="3"
             />
          </div>
        </div>
      )}
    </div>
  );
};