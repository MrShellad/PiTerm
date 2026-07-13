import { useTranslation } from "react-i18next";
import { Sun, Moon, Layers, Monitor, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Switch } from "@/components/ui/switch";
import { useBackgroundLogic } from "./background/useBackgroundLogic";
import { BackgroundCard } from "./background/BackgroundCard";

export const BackgroundManager = () => {
  const { t } = useTranslation();
  const { settings, isSyncOn, isPending, toggleSync, updateUniversal } = useBackgroundLogic();

  return (
    <div className="w-full space-y-6 mb-4">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between px-1">
         <div className="flex items-center gap-2 text-slate-500">
           {isPending ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : (isSyncOn ? <Monitor className="w-4 h-4" /> : <Layers className="w-4 h-4" />)}
           <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('settings.appearance.syncBackground', 'Adapt to System Theme')}
              </span>
              <span className="text-[0.625rem] text-slate-400">
                  {isSyncOn ? "Separate wallpapers for Light & Dark modes" : "Single wallpaper for all themes"}
              </span>
           </div>
        </div>
        <Switch checked={isSyncOn} onCheckedChange={toggleSync} />
      </div>
      
      

      {/* Cards Area */}
      <div className={clsx("transition-opacity duration-200", isPending ? "opacity-50 pointer-events-none" : "opacity-100")}>
          
          {/* 模式 A: 分开设置 (Dark & Light) */}
          <div className={clsx("flex flex-col sm:flex-row gap-4", !isSyncOn && "hidden")}>
               <BackgroundCard 
                    className="flex-1"
                    title={t('settings.appearance.themeOptions.dark', 'Dark Mode')}
                    icon={Moon}
                    image={settings.darkImg}
                    blur={settings.darkBlur}
                    brightness={settings.darkBright}
                    overlayColor={settings.darkOverlayColor}
                    overlayOpacity={settings.darkOverlayOpacity}
                    onImageChange={(v) => settings.updateSettings({ 'appearance.darkBackgroundImage': v })}
                    onBlurChange={(v) => settings.updateSettings({ 'appearance.darkBackgroundBlur': v })}
                    onBrightnessChange={(v) => settings.updateSettings({ 'appearance.darkBackgroundBrightness': v })}
                    onOverlayColorChange={(v) => settings.updateSettings({ 'appearance.darkOverlayColor': v })}
                    onOverlayOpacityChange={(v) => settings.updateSettings({ 'appearance.darkOverlayOpacity': v })}
                />
               <BackgroundCard 
                    className="flex-1"
                    title={t('settings.appearance.themeOptions.light', 'Light Mode')}
                    icon={Sun}
                    image={settings.lightImg}
                    blur={settings.lightBlur}
                    brightness={settings.lightBright}
                    overlayColor={settings.lightOverlayColor}
                    overlayOpacity={settings.lightOverlayOpacity}
                    onImageChange={(v) => settings.updateSettings({ 'appearance.lightBackgroundImage': v })}
                    onBlurChange={(v) => settings.updateSettings({ 'appearance.lightBackgroundBlur': v })}
                    onBrightnessChange={(v) => settings.updateSettings({ 'appearance.lightBackgroundBrightness': v })}
                    onOverlayColorChange={(v) => settings.updateSettings({ 'appearance.lightOverlayColor': v })}
                    onOverlayOpacityChange={(v) => settings.updateSettings({ 'appearance.lightOverlayOpacity': v })}
                />
          </div>

          {/* 模式 B: 统一设置 (Universal) */}
          <div className={clsx(!isSyncOn ? "block" : "hidden")}>
                <BackgroundCard 
                    layout="inline"
                    title={t('settings.appearance.universal', 'Universal Background')}
                    icon={Layers}
                    image={settings.darkImg}
                    blur={settings.darkBlur}
                    brightness={settings.darkBright}
                    overlayColor={settings.darkOverlayColor}
                    overlayOpacity={settings.darkOverlayOpacity}
                    onImageChange={(v) => updateUniversal('BackgroundImage', v)}
                    onBlurChange={(v) => updateUniversal('BackgroundBlur', v)}
                    onBrightnessChange={(v) => updateUniversal('BackgroundBrightness', v)}
                    onOverlayColorChange={(v) => updateUniversal('OverlayColor', v)}
                    onOverlayOpacityChange={(v) => updateUniversal('OverlayOpacity', v)}
                    // 🟢 [核心修改] 使用 h-auto 自动适应内容高度
                    className="border-blue-500/30 shadow-lg shadow-blue-500/5 h-auto min-h-[14rem]"
                />
          </div>
      </div>
    </div>
  );
};