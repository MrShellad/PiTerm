import { useRef, memo } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { DebouncedSlider } from "./DebouncedSlider";
import { OverlayControls } from "./OverlayControls";
import { useWallpaperActions } from "./useWallpaperActions";

interface BackgroundCardProps {
  title: string;
  icon: any;
  
  // Data
  image: string | null;
  blur: number;
  brightness: number;
  overlayColor: string;
  overlayOpacity: number;
  
  // Updaters
  onImageChange: (val: string | null) => void;
  onBlurChange: (val: number) => void;
  onBrightnessChange: (val: number) => void;
  onOverlayColorChange: (val: string) => void;
  onOverlayOpacityChange: (val: number) => void;

  className?: string;
  layout?: 'stacked' | 'inline';
}

export const BackgroundCard = memo(({ 
  title, icon: Icon, 
  image, blur, brightness, overlayColor, overlayOpacity,
  onImageChange, onBlurChange, onBrightnessChange, onOverlayColorChange, onOverlayOpacityChange,
  className,
  layout = 'stacked'
}: BackgroundCardProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInline = layout === 'inline';

  // 使用 Hook 处理文件系统逻辑
  const { previewSrc, isProcessing, handleUpload, handleClear } = useWallpaperActions(image, onImageChange);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className={clsx(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shadow-sm transition-all overflow-hidden",
        isInline ? "flex flex-row items-stretch p-0" : "flex flex-col gap-4 p-4",
        className
    )}>
      
      {/* 预览区域 */}
      <div className={clsx(
          "relative group overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer transition-colors",
          isInline 
            ? "w-48 shrink-0 border-r border-slate-200/50 dark:border-slate-700/50" 
            : "w-full aspect-video rounded-lg border border-slate-200/50 dark:border-slate-700/50"
      )}>
         {/* 遮罩预览 */}
         <div 
            className="absolute inset-0 z-10 pointer-events-none transition-all duration-300" 
            style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
         />

         {isProcessing ? (
            <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>
         ) : previewSrc ? (
            <img src={previewSrc} className="w-full h-full object-cover" alt="Background" onError={() => {}} /> 
         ) : (
            <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-slate-400">
                <ImageIcon className={clsx(isInline ? "w-6 h-6" : "w-8 h-8 opacity-50")} />
                <span className="text-[0.625rem] uppercase tracking-wider font-medium text-center px-2">
                    {isInline ? "No Image" : t('settings.appearance.noWallpaper', 'No Wallpaper Set')}
                </span>
            </div>
         )}
         
         {/* 上传遮罩层 */}
         <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"
         >
             <div className="flex flex-col items-center gap-2">
                <Upload className="w-5 h-5 text-white" />
                {!isInline && <span className="text-white text-xs font-medium">{t('settings.appearance.changeWallpaper', 'Change Wallpaper')}</span>}
             </div>
         </div>
         <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput}/>
      </div>

      {/* 控制区域 */}
      <div className={clsx("flex-1 flex flex-col justify-center", isInline ? "p-5 gap-5" : "gap-4")}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Icon className="w-4 h-4" />
                <span>{title}</span>
            </div>
            {image && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> {t('common.clear', 'Clear')}
                </Button>
            )}
        </div>

        <div className="space-y-4">
            <DebouncedSlider 
                label={t('settings.appearance.blur', 'Blur')}
                value={blur} min={0} max={40} step={1} displayValue="{value}px" onChange={onBlurChange}
            />
            <DebouncedSlider 
                label={t('settings.appearance.brightness', 'Brightness')}
                value={brightness} min={0.1} max={1} step={0.05} displayValue="{value}%" onChange={onBrightnessChange}
            />
            
            <OverlayControls 
                color={overlayColor}
                opacity={overlayOpacity}
                onColorChange={onOverlayColorChange}
                onOpacityChange={onOverlayOpacityChange}
            />
        </div>
      </div>
    </div>
  );
});
BackgroundCard.displayName = 'BackgroundCard';