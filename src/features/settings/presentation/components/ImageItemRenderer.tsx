import { useTranslation } from "react-i18next";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { SettingItem } from "../../domain/types";
import { useImageSetting } from "../../application/useImageSetting"; // 🟢 引入 Hook

interface Props {
  item: SettingItem;
  value: any;
  onChange: (val: any) => void;
  displayLabel: string;
  containerClass: string;
}

export const ImageItemRenderer = ({ 
  item, value, onChange, displayLabel, containerClass 
}: Props) => {
  const { t } = useTranslation();
  
  // 🟢 使用业务 Hook，UI 不再关心 Tauri FS
  const { 
    previewUrl, 
    isProcessing, 
    fileInputRef, 
    handleUpload, 
    handleClear, 
    triggerUpload 
  } = useImageSetting(value, onChange);

  return (
      <div className={clsx(containerClass, "flex-col items-stretch gap-3 !items-start")}>
          <div className="flex items-center justify-between w-full">
              <div className="text-base font-medium text-slate-900 dark:text-slate-100">{displayLabel}</div>
          </div>
          <div className="flex gap-4 items-start">
              {/* Preview Box */}
              <div 
                  onClick={() => !isProcessing && triggerUpload()}
                  className="relative w-32 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/50 cursor-pointer hover:border-blue-500/50 transition-colors group shadow-sm"
              >
                 {isProcessing ? (
                    <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>
                 ) : previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover transition-opacity duration-300" onError={() => {}} alt="preview"/> 
                 ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-slate-400" /></div>
                 )}
                 
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                       <Upload className="w-5 h-5 text-white" />
                  </div>
              </div>

               {/* Controls */}
               <div className="flex-1 flex flex-col justify-center min-h-[80px] space-y-2">
                  {item.descKey && <div className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">{t(item.descKey)}</div>}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload}/>
                  <div className="flex items-center gap-2">
                       <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isProcessing}
                            className="h-9 text-base bg-transparent border-slate-200/60 dark:border-slate-700/60 px-3" 
                            onClick={triggerUpload}
                       >
                          {t('settings.appearance.uploadImage', 'Upload')}
                       </Button>
                       {value && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={isProcessing}
                            onClick={handleClear} 
                            className="h-9 text-base text-red-500 hover:bg-red-50/50 px-3"
                          >
                              <Trash2 className="w-4 h-4 mr-2" />{t('common.clear', 'Clear')}
                          </Button>
                       )}
                  </div>
              </div>
          </div>
      </div>
  );
};