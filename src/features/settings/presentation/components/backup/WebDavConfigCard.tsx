import { Cloud, CheckCircle2, Lock, ShieldCheck, CalendarClock } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomInput } from "@/components/common/CustomInput";
import { CustomButton } from "@/components/common/CustomButton";
import { WebDavFormValues } from "../../../domain/backup";
import { TFunction } from "i18next"; // 🟢 1. 引入类型

interface Props {
  t: TFunction; // 🟢 2. 使用标准类型替换手动定义
  form: UseFormReturn<WebDavFormValues>;
  settings: Record<string, any>;
  isConfigured: boolean;
  isTesting: boolean;
  onSave: () => void;
  onToggleAuto: (checked: boolean) => void;
  onIntervalChange: (val: string) => void;
}

export const WebDavConfigCard = ({
  t, form, settings, isConfigured, isTesting, onSave, onToggleAuto, onIntervalChange
}: Props) => {
  const { register, formState: { errors } } = form;

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
        <span className="text-base font-medium flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-500" /> 
          {t('settings.backup.webdav', 'WebDAV Settings')}
        </span>
        <div className="flex items-center gap-2 opacity-100 transition-opacity">
           <Label htmlFor="auto-backup" className="text-base text-slate-500 font-normal">
              {t('settings.backup.auto', 'Auto Backup')}
           </Label>
           <Switch 
              id="auto-backup" 
              checked={!!settings['backup.autoBackup']}
              onCheckedChange={onToggleAuto}
              className="data-[state=checked]:bg-blue-500" 
           />
        </div>
      </div>
      
      {/* Body */}
      <div className="p-5 space-y-4">
        {settings['backup.autoBackup'] && (
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 mb-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-800/30 rounded-md text-blue-600 dark:text-blue-400">
                      <CalendarClock className="w-4 h-4" />
                  </div>
                  <span className="text-base font-semibold text-slate-700 dark:text-slate-200">
                      {t('settings.backup.frequency', 'Backup Frequency')}
                  </span>
              </div>
              <Select value={settings['backup.interval'] || '24'} onValueChange={onIntervalChange}>
                  <SelectTrigger className="w-[180px] h-9 text-base bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="1" className="text-base">Every Hour</SelectItem>
                      <SelectItem value="24" className="text-base">Daily (24h)</SelectItem>
                      <SelectItem value="168" className="text-base">Weekly</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        )}

        <CustomInput 
          label={t('settings.backup.url', 'Server URL')}
          placeholder="https://dav.jianguoyun.com/dav/"
          {...register("webdavUrl", { required: true })}
          error={errors.webdavUrl?.message}
          hideErrorMsg
          startIcon={<Cloud className="w-4 h-4" />}
        />
        <div className="grid grid-cols-2 gap-4">
          <CustomInput 
            label={t('settings.backup.username', 'Username')}
            placeholder="user"
            {...register("username")}
            autoComplete="off"
          />
          <CustomInput 
            label={t('settings.backup.password', 'Password')}
            type="password"
            placeholder={isConfigured ? "******** (Secured)" : "Enter password"}
            {...register("password")}
            autoComplete="new-password"
            startIcon={isConfigured ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4" />}
          />
        </div>

        <div className="pt-2 flex justify-between items-center">
           <p className="text-base text-slate-400">
              {isConfigured 
                  ? t('settings.backup.secureStatus', 'Credentials secured locally.') 
                  : t('settings.backup.notConfigured', 'Credentials not saved.')}
           </p>
           
           <CustomButton 
            onClick={onSave} 
            isLoading={isTesting}
            variant="outline" 
            size="sm"
            icon={CheckCircle2}
            className="text-base h-9 px-4 border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {t('settings.backup.saveAndTest', 'Save & Connect')}
          </CustomButton>
        </div>
      </div>
    </div>
  );
};