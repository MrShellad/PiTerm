import { useLocation, useOutlet } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import clsx from "clsx";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { TerminalLayout } from "@/features/terminal/TerminalLayout";
import { useSettingsStore } from "@/features/settings/application/useSettingsStore";

// 🟢 引入 Hook
import { useLocalImage } from "@/hooks/useLocalImage"; 
import { useBackgroundReady } from "@/hooks/useBackgroundReady";

export const MainLayout = () => {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const settings = useSettingsStore(s => s.settings);

  // 1. 解析当前主题 (用于判断显示 Light 还是 Dark 壁纸)
  const appTheme = settings['appearance.appTheme'];
  const [systemTheme, setSystemTheme] = useState<'light'|'dark'>('dark');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(mq.matches ? 'dark' : 'light');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const resolvedTheme = appTheme === 'system' ? systemTheme : appTheme;

  // 2. 计算目标图片的路径及遮罩参数
  const sync = settings['appearance.syncBackgroundTheme'];
  
  let targetPath, blur, brightness;
  // 🟢 定义遮罩变量
  let overlayColor, overlayOpacity;

  if (sync === false) {
      // 关闭跟随：使用全局配置 (通常存在 Dark 字段中)
      targetPath = settings['appearance.darkBackgroundImage'];
      blur = settings['appearance.darkBackgroundBlur'];
      brightness = settings['appearance.darkBackgroundBrightness'];
      
      // 读取全局遮罩设置 (默认黑色半透)
      overlayColor = settings['appearance.darkOverlayColor'] ?? '#000000';
      overlayOpacity = settings['appearance.darkOverlayOpacity'] ?? 0.4;
  } else {
      // 开启跟随：根据当前解析的主题
      if (resolvedTheme === 'light') {
          targetPath = settings['appearance.lightBackgroundImage'];
          blur = settings['appearance.lightBackgroundBlur'];
          brightness = settings['appearance.lightBackgroundBrightness'];
          
          overlayColor = settings['appearance.lightOverlayColor'] ?? '#ffffff';
          overlayOpacity = settings['appearance.lightOverlayOpacity'] ?? 0;
      } else {
          targetPath = settings['appearance.darkBackgroundImage'];
          blur = settings['appearance.darkBackgroundBlur'];
          brightness = settings['appearance.darkBackgroundBrightness'];
          
          overlayColor = settings['appearance.darkOverlayColor'] ?? '#000000';
          overlayOpacity = settings['appearance.darkOverlayOpacity'] ?? 0.4;
      }
  }

  // 3. 将路径转换为 Blob URL（带缓存和预解码）
  const { src: bgUrl, isReady: bgReady } = useLocalImage(targetPath);

  // 判断是否显示自定义图片
  const hasCustomImage = !!bgUrl;
  
  const isTerminalPage = location.pathname.startsWith("/terminal");

  // 4. 🟢 首次加载跳过过渡动画
  //    isInitialMount 在壁纸首次就绪前为 true，此时背景层不使用 transition
  //    壁纸就绪后设为 false，后续切换壁纸时恢复动画过渡
  const isInitialMountRef = useRef(true);
  const [skipTransition, setSkipTransition] = useState(true);

  // 5. 🟢 壁纸就绪时通知全局状态
  const setBackgroundReady = useBackgroundReady(s => s.setReady);

  useEffect(() => {
    if (bgReady && isInitialMountRef.current) {
      isInitialMountRef.current = false;
      // 壁纸就绪：通知 MainAppShell 可以移除 Splash 并显示窗口
      setBackgroundReady();
      // 延迟一帧后恢复过渡动画，确保首帧无动画直接渲染
      requestAnimationFrame(() => {
        setSkipTransition(false);
      });
    }
  }, [bgReady, setBackgroundReady]);

  return (
    <div
      className={clsx(
        "h-screen w-screen flex overflow-hidden font-sans",
        "text-[hsl(var(--layout-text))]",
        "bg-background"
      )}
    >
      {/* --- 全局动态背景层 --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {/* 图片层 */}
        <div 
          className={clsx(
            "absolute inset-0",
            // 🟢 首次加载不加过渡动画，后续切换壁纸时恢复
            !skipTransition && "transition-all duration-700 ease-in-out",
            hasCustomImage 
              ? "bg-cover bg-center" 
              : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950"
          )}
          style={{
            // 使用生成的 Blob URL
            backgroundImage: hasCustomImage ? `url("${bgUrl}")` : undefined,
            filter: `blur(${blur}px) brightness(${brightness})`,
            transform: 'scale(1.02)'
          }}
        />
        
        {/* 动态遮罩层 */}
        <div 
            className={clsx(
              "absolute inset-0",
              !skipTransition && "transition-all duration-500 ease-in-out"
            )}
            style={{
                backgroundColor: overlayColor,
                opacity: overlayOpacity
            }}
        />
      </div>

      {/* --- 前景布局 --- */}
      <div className="relative z-10 flex flex-col w-full h-full">
        {/* TitleBar 贯穿顶部 */}
        <div
          className={clsx(
            "h-10 w-full shrink-0 z-50",
            "bg-[hsl(var(--titlebar-bg))]",
            "border-b border-[hsl(var(--titlebar-border))]"
          )}
        >
          <div className="relative w-full h-full">
            <TitleBar />
          </div>
        </div>

        {/* 下方左右布局：左侧 Sidebar，右侧 main 视图 */}
        <div className="flex-1 flex w-full min-h-0 relative">
          <Sidebar />

          <main className="flex-1 min-h-0 overflow-hidden relative bg-transparent">
            <div className={clsx("w-full h-full bg-transparent", !isTerminalPage && "hidden")}>
              <TerminalLayout />
            </div>
            <div
              key={location.pathname}
              className={clsx(
                "page-route-transition h-full w-full overflow-hidden bg-transparent",
                isTerminalPage && "hidden"
              )}
            >
              {currentOutlet}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
