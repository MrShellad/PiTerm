import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/features/settings/application/useSettingsStore";
import { useServerStore } from "@/features/server/application/useServerStore";
import clsx from "clsx";
import { useState } from "react";
import {
  LayoutDashboard,
  Server,
  Code2,
  Wrench,
  KeyRound,
  Settings,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  LucideIcon, 
} from "lucide-react";

// 引入本地 Logo
import Logo from "@/assets/logo.png";

type MenuItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  badge?: string | number;
};

const buttonBaseClass = clsx(
  "group flex items-center rounded-lg transition-all duration-300",
  "h-10 w-full px-0 relative overflow-hidden shrink-0",
  "outline-none justify-start",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-[hsl(var(--sidebar-item-hover-bg))] focus-visible:text-[hsl(var(--sidebar-item-hover-text))]"
);

const iconWrapperClass = clsx(
  "flex items-center justify-center w-11 h-full shrink-0",
  "transition-transform duration-300"
);

const FooterButton = ({
  Icon,
  label,
  onClick,
  isActive = false,
  collapsed,
  textClassName,
}: {
  Icon: LucideIcon;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  collapsed: boolean;
  textClassName: string;
}) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        buttonBaseClass,
        isActive
          ? `
            bg-[hsl(var(--sidebar-item-active-bg))]
            text-[hsl(var(--sidebar-item-active-text))]
            font-semibold
          `
          : `
            text-[hsl(var(--sidebar-item-text))]
            hover:bg-[hsl(var(--sidebar-item-hover-bg))]
            hover:text-[hsl(var(--sidebar-item-hover-text))]
          `
      )}
    >
      <div className={iconWrapperClass}>
        <Icon
          size={20}
          strokeWidth={2}
          className={clsx(
            "transition-transform duration-300",
            !collapsed && "group-hover:scale-110"
          )}
        />
      </div>
      <span className={textClassName}>{label}</span>
    </button>
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

  const [collapsed, setCollapsed] = useState(false);

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

  const textAnimation = clsx(
    "whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
    collapsed
      ? "max-w-0 opacity-0 -translate-x-4"
      : "max-w-40 opacity-100 translate-x-0"
  );

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location.pathname === item.path;

    return (
      <div key={item.path} className="w-full">
        <NavLink
          to={item.path}
          className={clsx(
            buttonBaseClass,
            isActive
              ? `
                bg-[hsl(var(--sidebar-item-active-bg))]
                text-[hsl(var(--sidebar-item-active-text))]
              `
              : `
                text-[hsl(var(--sidebar-item-text))]
                hover:bg-[hsl(var(--sidebar-item-hover-bg))]
                hover:text-[hsl(var(--sidebar-item-hover-text))]
              `
          )}
        >
          <div className={iconWrapperClass}>
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          </div>

          <span className={textAnimation}>{item.label}</span>

          {item.badge && (
            <span
              className={clsx(
                "absolute right-2 text-xs font-medium px-1.5 py-0.5 rounded-md transition-all duration-300",
                `
                  bg-[hsl(var(--sidebar-badge-bg))]
                  text-[hsl(var(--sidebar-badge-text))]
                `,
                collapsed
                  ? "opacity-0 translate-x-4 pointer-events-none"
                  : "opacity-100 translate-x-0"
              )}
            >
              {item.badge}
            </span>
          )}
        </NavLink>
      </div>
    );
  };

  return (
    <aside
      className={clsx(
        "flex flex-col h-full shrink-0 z-20",
        "bg-transparent", 
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        collapsed ? "w-[64px]" : "w-60"
      )}
    >
      {/* Header */}
      <div className={clsx(
          "flex items-center h-16 mb-2 shrink-0 transition-all duration-300",
          collapsed ? "px-2.5" : "px-4"
      )}>
        <div className="flex items-center font-bold text-lg overflow-hidden w-full">
          <div className="flex items-center justify-center w-11 h-12 shrink-0">
            <img src={Logo} alt="Logo" className="w-10 h-10 object-contain" />
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className={clsx(
          "flex-1 overflow-y-auto py-2 flex flex-col gap-1 custom-scrollbar transition-all duration-300",
          collapsed ? "px-2" : "px-4"
      )}>
        {menuItems.map(renderMenuItem)}
      </div>

      {/* Footer */}
      <div className={clsx(
          "p-3 flex flex-col gap-1 shrink-0 transition-all duration-300",
          collapsed ? "px-2" : "px-4"
      )}>
        <NavLink to="/settings" className="w-full">
          {({ isActive }) => (
            <FooterButton
              Icon={Settings}
              label={t("menu.settings")}
              isActive={isActive}
              collapsed={collapsed}
              textClassName={textAnimation}
            />
          )}
        </NavLink>

        <FooterButton
          Icon={isVisuallyDark ? Moon : Sun}
          label={
            isVisuallyDark ? t("theme.dark") : t("theme.light")
          }
          onClick={toggleTheme}
          collapsed={collapsed}
          textClassName={textAnimation}
        />

        <FooterButton
          Icon={collapsed ? ChevronRight : ChevronLeft}
          label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          onClick={() => setCollapsed(!collapsed)}
          collapsed={collapsed}
          textClassName={textAnimation}
        />
      </div>
    </aside>
  );
};