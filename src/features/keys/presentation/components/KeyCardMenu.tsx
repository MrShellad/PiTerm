import { MoreHorizontal, Download, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Props {
  onExport: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const KeyCardMenu = ({ onExport, onEdit, onDelete }: Props) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={onExport} className="cursor-pointer gap-2">
          <Download className="w-3.5 h-3.5" />
          <span>{t('common.export', 'Export')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2">
          <Edit className="w-3.5 h-3.5" />
          <span>{t('common.edit', 'Edit')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t('common.delete', 'Delete')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
