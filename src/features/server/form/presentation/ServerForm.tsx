import { FormProvider } from "react-hook-form";
import { useServerFormLogic } from "../application/useServerFormLogic";
import { ServerFormValues } from "../domain/schema";
import { ServerGeneralInfo } from "./ServerGeneralInfo";
import { ServerConnectionPanel } from "./ServerConnectionPanel";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Save } from "lucide-react"; 
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ServerFormProps {
  initialData?: Partial<ServerFormValues>;
  onClose: () => void;
}

export const ServerForm = ({ initialData, onClose }: ServerFormProps) => {
  const { t } = useTranslation();
  
  const { methods, testStatus, handleTest, handleSubmit } = useServerFormLogic({ 
    initialData, 
    onClose 
  });

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit}
        // 🟢 [修改] 添加 select-none 禁止文本选中
        className="flex flex-col h-[calc(100%+2rem)] w-[calc(100%+2rem)] -m-4 overflow-hidden select-none"
      >
        {/* --- Layout (Split View 左右分栏) --- */}
        <div className="flex-1 flex overflow-hidden min-h-0"> 
          
          {/* 左侧：Basic Info */}
          <div className="w-[280px] shrink-0 bg-slate-50/80 dark:bg-black/20 p-4 overflow-y-auto custom-scrollbar">
            <ServerGeneralInfo />
          </div>

          {/* 右侧：Connection (主要内容区) */}
          <div className="flex-1 p-6 bg-white/40 dark:bg-transparent overflow-y-scroll custom-scrollbar">
            <ServerConnectionPanel />
          </div>
        </div>

        {/* --- Footer (底部按钮栏) --- */}
        <div className="shrink-0 flex justify-between items-center p-4 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testStatus === 'loading'}
            className={cn(
              "transition-all border-slate-200 dark:border-slate-700",
              testStatus === 'success' && "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20",
              testStatus === 'error' && "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20"
            )}
          >
            {testStatus === 'loading' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {testStatus === 'loading' ? t('common.testing', 'Testing...') : t('common.testConnection', 'Test Connection')}
          </Button>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              className="min-w-[100px] gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Save className="w-4 h-4" />
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
