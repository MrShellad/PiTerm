import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Container, 
  Network, 
  Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolPreview {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  color: string;
}

const UPCOMING_TOOLS: ToolPreview[] = [
  {
    id: 'docker',
    icon: Container,
    titleKey: 'tools.upcoming.docker.title',
    descKey: 'tools.upcoming.docker.desc',
    color: 'text-primary',
  },
  {
    id: 'network',
    icon: Network,
    titleKey: 'tools.upcoming.network.title',
    descKey: 'tools.upcoming.network.desc',
    color: 'text-primary',
  }
];

export const ToolsPlaceholder = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full space-y-6 p-6">
      {/* 头部标题 */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground leading-none">
            {t('tools.placeholder.title', 'Toolbox')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t('tools.placeholder.subtitle', 'Extend your workflow with powerful utilities')}
          </p>
        </div>
      </div>

      {/* 功能预告网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {UPCOMING_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div 
              key={tool.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-colors duration-150 hover:border-primary/35 hover:bg-card/90"
              )}
            >
              {/* 背景装饰渐变 */}
              <div className="relative z-10 space-y-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center border border-primary/15 bg-primary/10",
                  tool.color
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {t(tool.titleKey)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t(tool.descKey)}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                  <Zap className="w-3 h-3 fill-current" />
                  {t('common.comingSoon', 'Coming Soon')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部引导 */}
{/* 底部引导 */}
<div className="p-6 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center text-center space-y-2">
  <p className="text-sm text-muted-foreground">
    {t('tools.placeholder.footer', 'Have a specific tool in mind?')}
  </p>
  
  {/* 🟢 修改点：添加 mailto 链接 */}
  <a 
    href="mailto:chris@cabeu.edu.kg?subject=Feature%20Request%20-%20Toolbox"
    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider flex items-center gap-2"
  >
    {t('tools.placeholder.request', 'Request a Feature')}
    {/* 可选：增加一个小箭头的视觉引导 */}
    <span className="text-[10px]">→</span>
  </a>
</div>
    </div>
  );
};
