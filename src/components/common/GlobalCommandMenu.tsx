import React from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Server, Key, Settings, LayoutDashboard, FolderTree } from "lucide-react";
import { useServerStore } from "@/features/server/application/useServerStore";
import { useTerminalStore } from "@/store/useTerminalStore";
import { useTranslation } from "react-i18next";
import { Server as ServerType } from "@/features/server/domain/types";

interface GlobalCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (tab: string) => void;
}

export const GlobalCommandMenu: React.FC<GlobalCommandMenuProps> = ({
  open,
  onOpenChange,
  onNavigate
}) => {
  const { t } = useTranslation();
  const servers = useServerStore((state) => state.servers);
  const createTab = useTerminalStore((state) => state.createTab);

  const handleSelectServer = (server: ServerType) => {
    createTab(server);
    onOpenChange(false);
  };

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("command.placeholder", "Type a command or search servers...")} />
      <CommandList className="max-h-[350px]">
        <CommandEmpty>{t("command.empty", "No results found.")}</CommandEmpty>
        
        {/* Servers Group */}
        {servers.length > 0 && (
          <CommandGroup heading={t("command.group.servers", "Servers")}>
            {servers.map((server) => (
              <CommandItem
                key={server.id}
                onSelect={() => handleSelectServer(server)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
              >
                <Server className="w-4 h-4 text-primary shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium text-sm text-foreground truncate">{server.name}</span>
                  <span className="text-xs text-muted-foreground font-mono truncate">{server.username}@{server.ip}:{server.port}</span>
                </div>
                <CommandShortcut>SSH</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Navigation Group */}
        <CommandGroup heading={t("command.group.navigation", "Navigation")}>
          <CommandItem onSelect={() => handleNavigate("dashboard")} className="cursor-pointer gap-2">
            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("servers")} className="cursor-pointer gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <span>Server Management</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("sftp")} className="cursor-pointer gap-2">
            <FolderTree className="w-4 h-4 text-muted-foreground" />
            <span>SFTP File Manager</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("keys")} className="cursor-pointer gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span>Vault & Key Manager</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate("settings")} className="cursor-pointer gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
