import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, KeyRound, Terminal } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PasswordSection, KeySection } from "./ServerAuthComponents"; 
import { UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";

// 本地小组件：Switch Button
const AuthTypeSwitcher = ({ value, onChange, t }: { value: string, onChange: (v: any) => void, t: any }) => (
  <div className="flex p-1 bg-muted rounded-lg w-full sm:w-auto">
    <button type="button" onClick={() => onChange('password')}
      className={cn("flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2", value === 'password' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
    >
      <KeyRound className="w-3.5 h-3.5" /> {t('server.form.vault.password', 'Password')}
    </button>
    <button type="button" onClick={() => onChange('key')}
      className={cn("flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2", value === 'key' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
    >
      <Terminal className="w-3.5 h-3.5" /> {t('server.form.vault.key', 'Private Key')}
    </button>
  </div>
);

interface AuthCredentialsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  setValue: UseFormSetValue<any>;
  t: any;
  // 从 logic 传入的状态
  authType: string;
  onAuthTypeChange: (type: string) => void;
  passwordSource: string;
  passwordId?: string;
  keySource: string;
  keyId?: string;
  keyName?: string;
  // 动作
  onResetPassword: () => void;
  onResetKey: () => void;
  onSelectFromVault: () => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

export const AuthCredentials = ({ 
  register, errors, setValue, t,
  authType, onAuthTypeChange,
  passwordSource, passwordId, onResetPassword, showPassword, onToggleShowPassword,
  keySource, keyId, keyName, onResetKey, onSelectFromVault
}: AuthCredentialsProps) => {
  return (
    <div className="pt-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
        {t('server.form.credentials', 'Credentials')}
      </Label>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
           <div className="flex items-center gap-2 text-foreground">
             <div className="p-1.5 bg-background rounded-md shadow-sm border border-border"><Shield className="w-4 h-4 text-primary" /></div>
             <span className="text-sm font-medium">{t('server.form.authType', 'Auth Type')}</span>
           </div>
           <AuthTypeSwitcher value={authType} onChange={onAuthTypeChange} t={t} />
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
           {/* Username Field */}
           <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground ml-1">{t('server.form.username', 'Username')}</Label>
              <div className="relative group">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <User className="w-4 h-4" />
                 </div>
                 {/* 🟢 [修改] 添加禁止自动填充属性 */}
                 <Input 
                   {...register("username")} 
                   placeholder="root" 
                   autoComplete="off" 
                   autoCorrect="off" 
                   autoCapitalize="off" 
                   spellCheck="false"
                   className={cn("pl-10 border-border", errors.username && "border-destructive")} 
                 />
              </div>
           </div>

           {/* Dynamic Password/Key Field */}
           <div className="relative min-h-[100px]"> 
              <AnimatePresence mode="wait">
                 {authType === 'password' ? (
                    <PasswordSection 
                       key="pwd"
                       register={register}
                       source={passwordSource}
                       id={passwordId}
                       onReset={onResetPassword}
                       showPass={showPassword}
                       onToggleShow={onToggleShowPassword}
                    />
                 ) : (
                    <KeySection 
                       key="key"
                       register={register}
                       setValue={setValue}
                       keyName={keyName}
                       source={keySource}
                       id={keyId}
                       onReset={onResetKey}
                       onSelectFromVault={onSelectFromVault}
                    />
                 )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
};