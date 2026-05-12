import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ICON_MAP } from "@/features/server/domain/constants";
import { 
  Check, ChevronsUpDown, Plus, X, Search, Layers 
} from "lucide-react";

// UI Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// --- 组件 1: 图标选择器 ---
export const IconPicker = ({ 
  value, 
  onChange 
}: { 
  value?: string | null; 
  onChange: (v: string) => void 
}) => {
  const safeValue = value || 'server'; 
  const Icon = ICON_MAP[safeValue] || ICON_MAP['server'];
  const hasValue = safeValue && safeValue !== 'server';
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            // 🟢 [修改 1] 外框尺寸缩小: w-16 -> w-14
            "w-14 h-14 p-0 rounded-2xl border-2 transition-all duration-300 group shadow-sm",
            hasValue 
              ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20"
              : "border-dashed border-muted-foreground/20 hover:border-blue-500/50 hover:bg-accent"
          )}
        >
          <Icon className={cn(
            // 🟢 [修改 2] 内部图标放大: w-8 -> w-9
            "w-9 h-9 transition-colors",
            hasValue 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-muted-foreground group-hover:text-blue-500"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3">
        {/* 🟢 [修改 3] 网格改为 5 列 */}
        <div className="grid grid-cols-5 gap-2">
          {Object.keys(ICON_MAP).map(iconKey => {
            const IconComp = ICON_MAP[iconKey];
            const isSelected = safeValue === iconKey;
            return (
              <button
                key={iconKey}
                type="button"
                onClick={() => onChange(iconKey)}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-md transition-all",
                  isSelected 
                    ? "bg-blue-500 text-white shadow-md hover:bg-blue-600" 
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                )}
                title={iconKey}
              >
                <IconComp className="w-5 h-5" />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// --- 组件 2: 提供商选择器 ---
export const ProviderPicker = ({
  value,
  suggestions,
  isOpen,
  onOpenChange,
  onSelect
}: {
  value?: string | null;
  suggestions: string[];
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (v: string) => void;
}) => {
  const { t } = useTranslation();
  const safeValue = value || ""; 

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          size="sm"
          className="h-7 w-full min-w-0 justify-between px-2 text-xs text-muted-foreground font-normal hover:text-foreground hover:bg-muted/60"
        >
          <span className="flex items-center min-w-0">
            <Layers className="w-3.5 h-3.5 mr-1.5 opacity-70 shrink-0" />
            <span className="truncate text-left">
              {safeValue || t('server.form.selectProvider', 'Select Provider...')}
            </span>
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('common.search', 'Search provider...')} className="h-9 text-xs" />
          <CommandList>
            <CommandEmpty className="py-3 px-2 text-xs text-center text-muted-foreground">
              {t('server.form.providerHint', 'Use input below to create.')}
            </CommandEmpty>
            <CommandGroup heading={t('server.form.existing', 'Existing')}>
              {suggestions.map((provider) => (
                <CommandItem
                  key={provider}
                  value={provider}
                  className="text-xs"
                  onSelect={() => onSelect(provider)}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5 text-blue-500", safeValue === provider ? "opacity-100" : "opacity-0")} />
                  {provider}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          
          <div className="p-1 border-t border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input 
                placeholder={t('server.form.createProvider', 'Create new...')}
                className="h-8 pl-7 text-xs border-none shadow-none bg-muted/50 focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSelect(e.currentTarget.value);
                  }
                }}
              />
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// --- 组件 3: 标签管理器 ---
export const TagManager = ({
  tags,
  suggestions,
  isOpen,
  inputValue,
  onOpenChange,
  onInputChange,
  onAdd,
  onRemove
}: {
  tags: string[];
  suggestions: string[];
  isOpen: boolean;
  inputValue: string;
  onOpenChange: (v: boolean) => void;
  onInputChange: (v: string) => void;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 rounded-lg border border-dashed border-border bg-muted/20 hover:border-border/80 hover:bg-muted/30 transition-colors">
      {tags.map(tag => (
        <span key={tag} className="animate-in fade-in zoom-in duration-200 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-background text-foreground shadow-sm border border-border">
          {tag}
          <button 
            type="button" 
            onClick={() => onRemove(tag)}
            className="ml-1.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      
      {tags.length < 2 && (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors h-7 my-auto">
              <Plus className="w-3 h-3 mr-1.5" /> {t('common.add', 'Add')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder={t('server.form.tagPlaceholder', 'Type a tag...')}
                value={inputValue}
                onValueChange={onInputChange}
                className="h-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAdd(inputValue);
                  }
                }}
              />
              <CommandList>
                <CommandGroup>
                  {suggestions.filter(t => !tags.includes(t)).map(tag => (
                    <CommandItem key={tag} value={tag} onSelect={() => onAdd(tag)} className="text-xs">
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

// --- 组件 4: 过期时间选择器 ---
export const ExpirationPicker = ({
  enabled,
  date,
  onToggle,
  onSelect
}: {
  enabled: boolean;
  date: Date | undefined;
  onToggle: (v: boolean) => void;
  onSelect: (d: Date | undefined) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <Switch 
        checked={enabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-blue-500 shrink-0"
      />
      
      <div className="flex-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!enabled}
              className={cn(
                "w-full h-9 text-xs justify-start font-normal border-border bg-background hover:bg-muted/50",
                !date && "text-muted-foreground",
                !enabled && "opacity-50 cursor-not-allowed bg-transparent border-transparent shadow-none"
              )}
            >
              {date ? format(date, "PPP") : <span>{t('common.pickDate', 'Pick a date...')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
