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
          <div className="w-[285px] shrink-0 bg-muted/30 p-5 overflow-y-auto custom-scrollbar border-r border-border/40">
            <ServerGeneralInfo />
          </div>

          {/* 右侧：Connection (主要内容区) */}
          <div className="flex-1 p-5 bg-background/20 dark:bg-transparent overflow-y-scroll custom-scrollbar">
            <ServerConnectionPanel />
          </div>
        </div>

        {/* --- Footer (底部按钮栏) --- */}
        <div className="shrink-0 flex justify-between items-center px-4 py-3 border-t border-border bg-card/60 backdrop-blur-sm z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testStatus === 'loading'}
            className={cn(
              "transition-all border-border",
              testStatus === 'success' && "border-emerald-500/50 text-emerald-500 bg-emerald-500/10",
              testStatus === 'error' && "border-destructive/50 text-destructive bg-destructive/10"
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
              className="min-w-[100px] gap-2"
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
