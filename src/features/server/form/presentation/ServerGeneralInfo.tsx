import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Tag, CalendarIcon, ArrowUpNarrowWide } from "lucide-react";

// Components & Logic
import { Label } from "@/components/ui/label";
import { useServerGeneralLogic } from "../hooks/useServerGeneralLogic"; 
import { 
  IconPicker, 
  ProviderPicker, 
  ExpirationPicker 
} from "../components/ServerGeneralInputs"; 
import { CommonTagSelector } from "@/components/common/CommonTagSelector"; 
// 🟢 [新增] 引入 CustomInput
import { CustomInput } from "@/components/common/CustomInput";

export const ServerGeneralInfo = () => {
  const { t } = useTranslation();
  
  // 1. 获取所有逻辑和状态
  const { 
    register, errors, setValue, 
    values, data, state, actions 
  } = useServerGeneralLogic();

  // 辅助函数
  const safeTags = (values.tags || []).filter((t): t is string => !!t);
  const safeTagSuggestions = (data.existingTags || []).filter((t): t is string => !!t);
  const safeProviderSuggestions = (data.existingProviders || []).filter((t): t is string => !!t);

  return (
    // 防止 Input 激活时的左侧 ring/outline 被父容器的 overflow 裁剪
    <div className="flex flex-col h-full gap-6 pr-2 py-1 pl-1">
      
      {/* ================= SECTION 1: IDENTITY (基础信息) ================= */}
      <div className="flex flex-col gap-4">
        
        {/* Row 1: 图标选择器 + 服务器名称 */}
        <div className="flex gap-3 items-end">
          <div className="shrink-0 pb-0.5">
             <IconPicker value={values.icon} onChange={actions.selectIcon} />
          </div>
          
          <div className="flex-1 min-w-0">
            <CustomInput
              id="name"
              label={t('server.form.name', 'Server Name')}
              {...register("name", { required: true })}
              placeholder={t('server.form.namePlaceholder', '例如：生产环境数据库')}
              error={errors.name?.message as string}
              hideErrorMsg
              required
            />
          </div>
        </div>

        {/* Row 2: 服务商 (Provider) 独占一行 */}
        <div className="space-y-1.5 w-full">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            {t('server.form.provider', 'Provider')}
          </Label>
          <ProviderPicker 
            value={values.provider}
            suggestions={safeProviderSuggestions}
            isOpen={state.openProvider}
            onOpenChange={state.setOpenProvider}
            onSelect={actions.selectProvider}
          />
        </div>

      </div>

      <div className="h-px bg-border/50 w-full" /> {/* 分割线 */}

      {/* ================= SECTION 2: META INFO (元数据) ================= */}
      <div className="space-y-5">
        
        {/* Tags */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" /> 
              {t('server.form.tags', 'Tags')}
            </Label>
            {/* 计数器 */}
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-md font-mono font-semibold", 
              safeTags.length >= 2 
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" 
                : "bg-muted text-muted-foreground"
            )}>
              {safeTags.length}/2
            </span>
          </div>
          
          <CommonTagSelector 
            value={safeTags}
            onChange={(newTags) => setValue("tags", newTags, { shouldDirty: true, shouldValidate: true })}
            allTags={safeTagSuggestions}
            placeholder={t('common.selectTags', 'Select tags...')}
            searchPlaceholder={t('common.searchTags', 'Search tags...')}
            maxTags={2} 
          />
        </div>

        {/* Expiration */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5" /> 
            {t('server.form.enableExpiration', 'Expiration')}
          </Label>
          <ExpirationPicker 
            enabled={values.enableExpiration}
            date={values.expireDate || undefined}
            onToggle={actions.toggleExpiration}
            onSelect={actions.selectDate}
          />
        </div>

        {/* Sort Order */}
        {/* 🟢 [修改] 使用 CustomInput */}
        <CustomInput
          type="number"
          label={t('server.form.sort', 'Sort Order')}
          {...register("sort", { valueAsNumber: true })}
          placeholder="0"
          startIcon={<ArrowUpNarrowWide className="w-3.5 h-3.5" />}
          description="较小的数字会在列表中排在前面。"
          // 即使有错误也不显示文字，保持布局紧凑
          error={errors.sort?.message as string}
          hideErrorMsg
        />

      </div>
    </div>
  );
};
