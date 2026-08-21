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
          "flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-150 relative group outline-none focus:outline-none",
          isActive
            ? "bg-[hsl(var(--sidebar-item-active-bg))] text-[hsl(var(--sidebar-item-active-text))] font-semibold"
            : "text-[hsl(var(--sidebar-item-text))] hover:bg-[hsl(var(--sidebar-item-hover-bg))] hover:text-[hsl(var(--sidebar-item-hover-text))]"
        )}
      >
        <Icon
          size={20}
          strokeWidth={2}
          className="transition-colors"
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
          <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <GlassTooltip content={item.label} side="right">
          <NavLink
            to={item.path}
            className={clsx(
              "flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-150 relative group",
              isActive
                ? "bg-[hsl(var(--sidebar-item-active-bg))] text-[hsl(var(--sidebar-item-active-text))] font-semibold"
                : "text-[hsl(var(--sidebar-item-text))] hover:bg-[hsl(var(--sidebar-item-hover-bg))] hover:text-[hsl(var(--sidebar-item-hover-text))]"
            )}
          >
            <item.icon size={19} strokeWidth={isActive ? 2.25 : 2} />

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
        "flex h-full w-[64px] shrink-0 flex-col overflow-hidden border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))] pt-3 font-sans z-20"
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
