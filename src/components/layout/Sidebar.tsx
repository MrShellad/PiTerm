import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/features/settings/application/useSettingsStore";
import { useServerStore } from "@/features/server/application/useServerStore";
import clsx from "clsx";
import {
  LayoutDashboard,
  Server,
  Code2,
  Wrench,
  KeyRound,
  Settings,
  Moon,
  Sun,
  LucideIcon, 
} from "lucide-react";
import { GlassTooltip } from "@/components/common/GlassTooltip";



type MenuItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  badge?: string | number;
};

const FooterButton = ({
  Icon,
  label,
  onClick,
  isActive = false,
}: {
  Icon: LucideIcon;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}) => {
  return (
    <GlassTooltip content={label} side="right">
      <button
        onClick={onClick}
        className={clsx(
          "flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-300 relative group outline-none focus:outline-none",
          isActive
            ? "bg-slate-200/50 text-blue-600 dark:bg-white/10 dark:text-blue-400 font-semibold"
            : "text-slate-400 hover:bg-slate-200/30 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-200"
        )}
      >
        <Icon
          size={20}
          strokeWidth={2}
          className="transition-transform group-hover:scale-105"
        />
      </button>
    </GlassTooltip>
  );
};

export const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  
  const serverCount = useServerStore((s) => 
    s.servers.filter(server => server.provider !== 'QuickConnect').length
  );

  const appTheme = settings['appearance.appTheme'];
  const isVisuallyDark = appTheme === 'dark' || (
    appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const menuItems: MenuItem[] = [
    { path: "/", icon: LayoutDashboard, label: t("menu.home") },
    { 
      path: "/servers", 
      icon: Server, 
      label: t("menu.servers"), 
      badge: serverCount > 0 ? serverCount : undefined 
    },
    { path: "/snippets", icon: Code2, label: t("menu.snippets") },
    { path: "/tools", icon: Wrench, label: t("menu.tools") },
    { path: "/keys", icon: KeyRound, label: t("menu.keys") },
  ];

  const toggleTheme = () => {
    const nextTheme = isVisuallyDark ? 'light' : 'dark';
    updateSetting('appearance.appTheme', nextTheme);
  };

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location.pathname === item.path;

    return (
      <div key={item.path} className="w-full relative flex justify-center py-0.5 font-sans">
        {/* Left active line indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
        )}
        <GlassTooltip content={item.label} side="right">
          <NavLink
            to={item.path}
            className={clsx(
              "flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-300 relative group",
              isActive
                ? "bg-slate-200/50 text-blue-600 dark:bg-white/10 dark:text-blue-400 font-semibold"
                : "text-slate-400 hover:bg-slate-200/30 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-200"
            )}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="transition-transform group-hover:scale-105" />

            {item.badge && (
              <span
                className={clsx(
                  "absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.2 rounded-full min-w-[14px] h-[14px] flex items-center justify-center",
                  "bg-blue-500 text-white"
                )}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        </GlassTooltip>
      </div>
    );
  };

  return (
    <aside
      className={clsx(
        "flex flex-col h-full shrink-0 z-20 w-[64px] font-sans pt-4",
        "bg-[#f1f3f5]/90 dark:bg-[#0a0c10]/95 backdrop-blur-xl",
        "border-r border-slate-200/40 dark:border-white/5",
        "transition-all duration-300 ease-in-out overflow-hidden"
      )}
    >
      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-2 custom-scrollbar px-2">
        {menuItems.map(renderMenuItem)}
      </div>

      {/* Footer */}
      <div className="p-2 pb-4 flex flex-col items-center gap-2 shrink-0">
        <NavLink to="/settings" className="w-full flex justify-center">
          {({ isActive }) => (
            <FooterButton
              Icon={Settings}
              label={t("menu.settings")}
              isActive={isActive}
            />
          )}
        </NavLink>

        <FooterButton
          Icon={isVisuallyDark ? Moon : Sun}
          label={
            isVisuallyDark ? t("theme.dark") : t("theme.light")
          }
          onClick={toggleTheme}
        />
      </div>
    </aside>
  );
};