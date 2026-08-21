import { 
  Server, Database, Cloud, Terminal, Globe, Cpu, HardDrive, Network, Box, Laptop 
} from "lucide-react";

// 图标映射表
export const ICON_MAP: Record<string, React.ElementType> = {
  server: Server,
  database: Database,
  cloud: Cloud,
  terminal: Terminal,
  globe: Globe,
  cpu: Cpu,
  harddrive: HardDrive,
  network: Network,
  box: Box,
  laptop: Laptop
};

export const DEFAULT_SSH_PORT = 22;

export interface CardThemeConfig {
  id: string;
  name: string;
  nameKey: string;
  colorHex: string;
  gradientPreview: string;
  bg: string;
  border: string;
  accent: string;
  badge: string;
}

// 6 款银行卡渐变配色系统
export const CARD_THEMES: Record<string, CardThemeConfig> = {
  sapphire: {
    id: "sapphire",
    name: "蓝宝石",
    nameKey: "server.theme.sapphire",
    colorHex: "#2563eb",
    gradientPreview: "from-blue-600 to-indigo-900",
    bg: "from-blue-700 via-indigo-800 to-slate-950",
    border: "border-blue-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  gold: {
    id: "gold",
    name: "暖金色",
    nameKey: "server.theme.gold",
    colorHex: "#d97706",
    gradientPreview: "from-amber-500 to-rose-700",
    bg: "from-amber-600 via-orange-600 to-rose-800",
    border: "border-amber-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  purple: {
    id: "purple",
    name: "赛博紫",
    nameKey: "server.theme.purple",
    colorHex: "#9333ea",
    gradientPreview: "from-purple-600 to-slate-950",
    bg: "from-indigo-600 via-purple-700 to-slate-950",
    border: "border-purple-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  obsidian: {
    id: "obsidian",
    name: "曜石黑",
    nameKey: "server.theme.obsidian",
    colorHex: "#27272a",
    gradientPreview: "from-zinc-700 to-zinc-950",
    bg: "from-slate-900 via-zinc-800 to-zinc-950",
    border: "border-amber-400/40",
    accent: "bg-amber-400/20 text-amber-200 border-amber-400/30 hover:bg-amber-400/30",
    badge: "bg-black/40 border-amber-400/30 text-amber-100 hover:bg-black/50",
  },
  emerald: {
    id: "emerald",
    name: "翡翠绿",
    nameKey: "server.theme.emerald",
    colorHex: "#059669",
    gradientPreview: "from-emerald-600 to-slate-950",
    bg: "from-teal-700 via-emerald-800 to-slate-950",
    border: "border-emerald-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  },
  rose: {
    id: "rose",
    name: "红宝石",
    nameKey: "server.theme.rose",
    colorHex: "#e11d48",
    gradientPreview: "from-rose-600 to-slate-950",
    bg: "from-rose-700 via-pink-800 to-slate-950",
    border: "border-rose-400/30",
    accent: "bg-white/15 text-white border-white/20 hover:bg-white/25",
    badge: "bg-black/30 border-white/20 text-white hover:bg-black/40",
  }
};

export const CARD_THEMES_LIST = Object.values(CARD_THEMES);
export const DEFAULT_CARD_THEME = "sapphire";