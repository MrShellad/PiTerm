import { Globe, Hash } from "lucide-react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { CustomInput } from "@/components/common/CustomInput"; 

interface NetworkSettingsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  t: (key: string, defaultVal: string) => string;
}

export const NetworkSettings = ({ register, errors, t }: NetworkSettingsProps) => {
  return (
    <div className="space-y-4">
      {/* Host & Port Row */}
      <div className="grid grid-cols-7 gap-4">
        
        {/* --- Host Input --- */}
        <div className="col-span-5">
          <CustomInput
            label={t('server.form.host', 'Host Address')}
            placeholder="192.168.1.1"
            startIcon={<Globe className="w-4 h-4" />}
            {...register("host")}
            
            // 依然传递 error 以触发红色边框
            error={errors.host?.message as string}
            // 🟢 [新增] 隐藏错误文字，不破坏布局
            hideErrorMsg
            
            required
          />
        </div>
        
        {/* --- Port Input --- */}
        <div className="col-span-2">
          <CustomInput
            label={t('server.form.port', 'Port')}
            type="number"
            placeholder="22"
            startIcon={<Hash className="w-3 h-3" />}
            {...register("port", { valueAsNumber: true })}
            
            error={errors.port?.message as string}
            // 🟢 [新增] 隐藏错误文字
            hideErrorMsg
            
            required
            className="text-center font-mono" 
          />
        </div>
      </div>
    </div>
  );
};
