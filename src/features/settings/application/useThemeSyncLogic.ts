import { useTranslation } from "react-i18next";
import { useSettingsStore } from "./useSettingsStore";
import { SettingItem } from "../domain/types";

export const useThemeSyncLogic = () => {
  const { t } = useTranslation();
  const settings = useSettingsStore(s => s.settings);
  const updateSettings = useSettingsStore(s => s.updateSettings);

  // 1. 获取动态 Label
  const getDisplayLabel = (item: SettingItem) => {
    const isSyncOn = settings['appearance.syncBackgroundTheme'];
    let displayLabel = t(item.labelKey, { defaultValue: item.label ?? item.labelKey });

    if (isSyncOn === false) { 
       if (item.id === 'appearance.darkBackgroundImage') displayLabel = t('settings.appearance.background', 'Background Image');
       if (item.id === 'appearance.darkBackgroundBlur') displayLabel = t('settings.appearance.blur', 'Blur Intensity');
       if (item.id === 'appearance.darkBackgroundBrightness') displayLabel = t('settings.appearance.brightness', 'Brightness');
    }
    return displayLabel;
  };

  // 2. 处理 Switch 变更 (含主题同步逻辑)
  const handleSwitchChange = (item: SettingItem, checked: boolean, defaultOnChange: (val: any) => void) => {
    if (item.id === 'appearance.syncBackgroundTheme') {
      if (checked === true) {
          // 开启同步：把 Dark 的配置应用到 Light
          const currentGlobalBg = settings['appearance.darkBackgroundImage'];
          const currentGlobalBlur = settings['appearance.darkBackgroundBlur'];
          const lightBg = settings['appearance.lightBackgroundImage'];
          
          if (!lightBg) {
              updateSettings({
                  [item.id]: true,
                  'appearance.lightBackgroundImage': currentGlobalBg,
                  'appearance.lightBackgroundBlur': currentGlobalBlur,
                  'appearance.lightBackgroundBrightness': 0.9, 
              });
              return;
          }
      }
      if (checked === false) {
           // 关闭同步：如果是亮色模式，把 Light 配置临时覆盖到 Dark 槽位以保持视觉一致性
           let currentTheme = settings['appearance.appTheme'];
           if (currentTheme === 'system') {
               currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
           }
           if (currentTheme === 'light') {
               const currentLightBg = settings['appearance.lightBackgroundImage'];
               const currentLightBlur = settings['appearance.lightBackgroundBlur'];
               const currentLightBright = settings['appearance.lightBackgroundBrightness'];
               updateSettings({
                   [item.id]: false,
                   'appearance.darkBackgroundImage': currentLightBg,
                   'appearance.darkBackgroundBlur': currentLightBlur,
                   'appearance.darkBackgroundBrightness': currentLightBright
               });
               return;
           }
      }
    }
    defaultOnChange(checked);
  };

  return {
    getDisplayLabel,
    handleSwitchChange
  };
};
