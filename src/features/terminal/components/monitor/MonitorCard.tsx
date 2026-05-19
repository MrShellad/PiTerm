// src/features/terminal/components/monitor/MonitorCard.tsx
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { MONITOR_COLOR_MAP, MonitorColorVariant } from "@/features/terminal/utils/monitorTheme";
import { MonitorInfoFace } from "./MonitorFace";

export interface MonitorCardProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  usage: number;
  usageDisplay?: React.ReactNode;
  tag?: string;
  detail?: React.ReactNode;
  color?: MonitorColorVariant;
  subTitle?: string;
  subTitleClassName?: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children?: React.ReactNode;
  className?: string; // 🟢 [新增] 允许传入自定义样式（如 col-span-full）
}

export const MonitorCard = ({
  id,
  title,
  icon,
  usage,
  usageDisplay,
  tag,
  detail,
  color = "blue",
  subTitle,
  subTitleClassName,
  isExpanded,
  onToggle,
  children,
  className, // 🟢 [接收]
}: MonitorCardProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // 🟢 [核心修复] 安全获取主题：如果颜色未定义（如 'slate'），则回退到 'blue'，防止崩溃
  const theme = MONITOR_COLOR_MAP[color] || MONITOR_COLOR_MAP['blue'];

  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  return (
    <motion.div
      ref={containerRef}
      layout
      initial={false}
      animate={{
        marginBottom: isExpanded ? 12 : 0, 
      }}
      transition={{ 
        layout: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } 
      }}
      className={clsx(
        "relative w-full overflow-hidden backdrop-blur-xl rounded-2xl", 
        "border", 
        "transition-colors duration-300", 
        className, // 🟢 [应用] 将传入的 className 应用到最外层

        isExpanded 
          ? [
              "z-10",
              // [展开态]: 80% 透明度能更好地透出背景磨砂感，同时保证对比度
              "bg-white/80 dark:bg-[#1e2030]/95", 
              "border-black/5 dark:border-white/10",
              "shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/40",
              "ring-1 ring-black/5 dark:ring-white/5" 
            ]
          : [
              "z-0",
              "bg-white/40 dark:bg-white/5",
              "border-white/40 dark:border-white/5",
              "hover:bg-white/60 dark:hover:bg-white/10",
              "shadow-sm"
            ]
      )}
    >
      <motion.div 
        layout="position"
        className="cursor-pointer select-none relative z-20"
        onClick={() => onToggle(id)}
      >
        <MonitorInfoFace
          title={title}
          icon={icon}
          usage={usage}
          usageDisplay={usageDisplay}
          tag={tag}
          detail={detail || t('monitor.loading', 'Loading...')}
          theme={theme}
          subTitle={subTitle || t('monitor.usage', 'Usage')}
          subTitleClassName={subTitleClassName}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: { height: { duration: 0.3 }, opacity: { duration: 0.2, delay: 0.1 } }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: { height: { duration: 0.25 }, opacity: { duration: 0.1 } }
            }}
            className="relative z-10"
          >
            <div className="px-4 pb-4 pt-0">
               {/* 🟢 加深亮色模式分割线对比度 */}
               <div className="h-px w-full bg-slate-300/50 dark:bg-white/10 mb-4" />
               <motion.div
                 initial={{ y: -10, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: -10, opacity: 0 }}
                 transition={{ duration: 0.2 }}
               >
                 {children}
               </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};