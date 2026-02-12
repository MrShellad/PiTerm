import { 
  Settings, Palette, TerminalSquare, Network, ShieldCheck, Info, CloudCog, Highlighter 
} from "lucide-react";
import { CategoryMeta } from "./types";

export const CATEGORIES: CategoryMeta[] = [
  { id: 'general', labelKey: 'settings.nav.general', icon: Settings },
  { id: 'appearance', labelKey: 'settings.nav.appearance', icon: Palette },
  { id: 'terminal', labelKey: 'settings.nav.terminal', icon: TerminalSquare },
  { id: 'highlights', labelKey: 'settings.nav.highlights', icon: Highlighter },
  { id: 'connection', labelKey: 'settings.nav.connection', icon: Network },
  { id: 'security', labelKey: 'settings.nav.security', icon: ShieldCheck },
  { id: 'backup', labelKey: 'settings.nav.backup', icon: CloudCog },
  { id: 'about', labelKey: 'settings.nav.about', icon: Info, isBottom: true },
];