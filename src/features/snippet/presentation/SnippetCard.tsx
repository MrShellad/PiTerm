import { useState } from "react";
import { Snippet } from "../domain/types";
import { MoreHorizontal, Copy, Check, Terminal, FileJson, Hash, FileCode, Database, FileType, Code2 } from "lucide-react";
import { clsx } from "clsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { GlassTooltip } from "@/components/common/GlassTooltip";
import { useTranslation } from "react-i18next";
import { 
  InteractiveCard, 
  InteractiveCardHeader, 
  InteractiveCardIcon, 
  InteractiveCardBody, 
  InteractiveCardFooter,
  InteractiveCardTagsWrapper,
  InteractiveCardTag
} from "@/components/common/InteractiveCard"; 

// 🟢 [修改 1] 语言图标组件优化
// 接受 className 以便外部控制尺寸，默认颜色改为白色以适配蓝色背景
const LanguageIcon = ({ lang, className }: { lang: string, className?: string }) => {
  const baseClass = clsx("text-white", className); 
  switch (lang) {
    case 'typescript': return <FileCode className={baseClass} />;
    case 'javascript': return <FileCode className={baseClass} />;
    case 'json': return <FileJson className={baseClass} />;
    case 'bash': return <Terminal className={baseClass} />;
    case 'python': return <Hash className={baseClass} />;
    case 'sql': return <Database className={baseClass} />;
    case 'html': return <Code2 className={baseClass} />;
    case 'css': return <Hash className={baseClass} />;
    default: return <FileType className={baseClass} />;
  }
};

interface Props {
  data: Snippet;
  onEdit: () => void;
  onDelete: () => void;
}

export const SnippetCard = ({ data, onEdit, onDelete }: Props) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <InteractiveCard className="group h-full flex flex-col">
      {/* Header */}
      <InteractiveCardHeader className="gap-3 mb-3">
        {/* 图标尺寸 */}
        <InteractiveCardIcon style={{ width: '2.75rem', height: '2.75rem' }}>
           <LanguageIcon lang={data.language} className="w-1/2 h-1/2" />
        </InteractiveCardIcon>

        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-[18px] sm:text-[19px] leading-tight tracking-tight">
            {data.title}
          </h3>
          <span className="text-[13px] text-slate-400 dark:text-slate-400 truncate font-mono mt-0.5 opacity-80 font-medium uppercase">
            {data.language}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <button 
                className={clsx(
                  "p-1.5 rounded-md transition-all duration-200 outline-none cursor-pointer",
                  "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100",
                  "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800"
                )}
             >
                <MoreHorizontal className="w-4 h-4" />
             </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 z-[50]">
             <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer">
                {t('common.edit', 'Edit')}
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuItem 
                className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/10 cursor-pointer" 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
             >
                {t('common.delete', 'Delete')}
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </InteractiveCardHeader>

      {/* Body: Code Preview (13-14px) */}
      <InteractiveCardBody className="relative my-auto">
        <GlassTooltip content={isCopied ? t('common.copied', 'Copied!') : t('snippet.copy_hint', 'Click to copy')} side="top">
          <div 
            className={clsx(
              "relative w-full h-full min-h-[105px] rounded-lg overflow-hidden cursor-pointer group/code",
              "bg-slate-50 dark:bg-black/25 border border-slate-200/60 dark:border-white/10 shadow-sm",
              "transition-colors hover:bg-slate-100 dark:hover:bg-black/40",
              "p-3.5"
            )}
            onClick={handleCopy}
          >
            <code className="block font-mono text-[13px] sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all opacity-95">
              {data.code.slice(0, 300)}
            </code>
            
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50 dark:from-slate-900/20 to-transparent pointer-events-none" />
            
            <div className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 opacity-0 group-hover/code:opacity-100 transition-all scale-90 group-hover/code:scale-100">
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            </div>
          </div>
        </GlassTooltip>
      </InteractiveCardBody>

      {/* Footer: Tags (12-13px) */}
      <InteractiveCardFooter className="pt-3">
        <InteractiveCardTagsWrapper className="gap-2">
          {data.tags.length > 0 ? (
            <>
              {data.tags.slice(0, 4).map(tag => (
                <InteractiveCardTag key={tag} className="text-xs px-2.5 py-0.5 font-medium">{tag}</InteractiveCardTag>
              ))}
              {data.tags.length > 4 && (
                <InteractiveCardTag className="text-xs px-2 py-0.5 font-medium">+{data.tags.length - 4}</InteractiveCardTag>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">
               {t('snippet.no_tags', 'No tags')}
            </span>
          )}
        </InteractiveCardTagsWrapper>
      </InteractiveCardFooter>

    </InteractiveCard>
  );
};