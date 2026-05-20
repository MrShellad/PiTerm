import { useLocation, useOutlet } from "react-router-dom";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { TerminalLayout } from "@/features/terminal/TerminalLayout";
import { useSettingsStore } from "@/features/settings/application/useSettingsStore";

// 🟢 [新增] 引入我们刚才创建的 Hook
import { useLocalImage } from "@/hooks/useLocalImage"; 

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
  // 🟢 [新增] 定义遮罩变量
  let overlayColor, overlayOpacity;

  if (sync === false) {
      // 关闭跟随：使用全局配置 (通常存在 Dark 字段中)
      targetPath = settings['appearance.darkBackgroundImage'];
      blur = settings['appearance.darkBackgroundBlur'];
      brightness = settings['appearance.darkBackgroundBrightness'];
      
      // 🟢 读取全局遮罩设置 (默认黑色半透)
      overlayColor = settings['appearance.darkOverlayColor'] ?? '#000000';
      overlayOpacity = settings['appearance.darkOverlayOpacity'] ?? 0.4;
  } else {
      // 开启跟随：根据当前解析的主题
      if (resolvedTheme === 'light') {
          targetPath = settings['appearance.lightBackgroundImage'];
          blur = settings['appearance.lightBackgroundBlur'];
          brightness = settings['appearance.lightBackgroundBrightness'];
          
          // 🟢 读取 Light 遮罩设置 (默认白色透明)
          overlayColor = settings['appearance.lightOverlayColor'] ?? '#ffffff';
          overlayOpacity = settings['appearance.lightOverlayOpacity'] ?? 0;
      } else {
          targetPath = settings['appearance.darkBackgroundImage'];
          blur = settings['appearance.darkBackgroundBlur'];
          brightness = settings['appearance.darkBackgroundBrightness'];
          
          // 🟢 读取 Dark 遮罩设置
          overlayColor = settings['appearance.darkOverlayColor'] ?? '#000000';
          overlayOpacity = settings['appearance.darkOverlayOpacity'] ?? 0.4;
      }
  }

  // 3. 将路径转换为 Blob URL
  const bgUrl = useLocalImage(targetPath);

  // 判断是否显示自定义图片
  const hasCustomImage = !!bgUrl;
  
  const isTerminalPage = location.pathname.startsWith("/terminal");

  return (
    <div
      className={clsx(
        "h-screen w-screen flex overflow-hidden font-sans",
        "transition-colors duration-300",
        "text-[hsl(var(--layout-text))]",
        "bg-slate-50 dark:bg-slate-950" // 兜底色
      )}
    >
      {/* --- 全局动态背景层 --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {/* 图片层 */}
        <div 
          className={clsx(
            "absolute inset-0 transition-all duration-700 ease-in-out",
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
        
        {/* 噪点层 (可选) */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
        
        {/* 🟢 [修改] 动态遮罩层 */}
        {/* 移除之前的 bg-[hsl(var(--layout-overlay))]，改用内联样式控制 */}
        <div 
            className="absolute inset-0 transition-all duration-500 ease-in-out" 
            style={{
                backgroundColor: overlayColor,
                opacity: overlayOpacity
            }}
        />
      </div>

      {/* --- 前景布局 (保持不变) --- */}
      <div className="relative z-10 flex w-full h-full">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <div
            className={clsx(
              "h-10 w-full shrink-0 z-50",
              "backdrop-blur-md",
              "bg-[hsl(var(--titlebar-bg))]/80", 
              "transition-all duration-300"
            )}
          >
            <div className="relative w-full h-full">
              <TitleBar />
            </div>
          </div>

          <main className="flex-1 overflow-hidden relative bg-transparent">
            <div className={clsx("w-full h-full bg-transparent", !isTerminalPage && "hidden")}>
              <TerminalLayout />
            </div>
            <div className={clsx("h-full w-full flex flex-col overflow-hidden bg-transparent", isTerminalPage && "hidden")}>
              <div className="flex-1 overflow-hidden p-0 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, marginTop: "20px" }}
                    animate={{ opacity: 1, marginTop: "0px" }}
                    exit={{ opacity: 0, marginTop: "-20px" }}
                    transition={{ 
                      duration: 0.25, 
                      ease: "linear" 
                    }}
                    className="h-full w-full overflow-y-auto overflow-x-hidden"
                  >
                    {currentOutlet}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};