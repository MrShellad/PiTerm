import { useState, useEffect } from "react";
import { useSnippetStore } from "./store/useSnippetStore";
import { ActionToolbar } from "@/components/common/ActionToolbar";
import { SnippetCard } from "./presentation/SnippetCard";
import { SnippetEditModal } from "./presentation/SnippetEditModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog"; 
import { Snippet } from "./domain/types";
import { Code2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx"; 

export const SnippetPage = () => {
  const { t } = useTranslation();
  const { 
    searchQuery, 
    activeTag, 
    isLoading,

    // Actions
    init,
    setSearchQuery, 
    setActiveTag, 
    getFilteredSnippets, 
    getAllTags,
    addSnippet,
    updateSnippet,
    deleteSnippet
  } = useSnippetStore();

  useEffect(() => {
    init();
  }, [init]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredData = getFilteredSnippets();
  const allTags = getAllTags();

  const handleEdit = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteSnippet(deleteId);
      setDeleteId(null); 
    }
  };

  const handleModalSubmit = async (data: any) => {
    if (editingSnippet) {
      await updateSnippet(editingSnippet.id, data);
    } else {
      await addSnippet(data);
    }
  };

  const handleAddClick = () => {
    setEditingSnippet(undefined);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
         <p className="text-sm font-medium">{t('common.loading', 'Loading library...')}</p>
      </div>
    );
  }

  return (
    // 🟢 [修改] 添加 select-none 禁止页面内文本被选中
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden select-none">
      
      {/* Header */}
      <div className={clsx(
        "sticky top-2 z-10 mx-2 mb-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm"
      )}>
        <ActionToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('snippet.search_placeholder', 'Search snippets...')}
          
          tags={allTags}
          activeTag={activeTag}
          onTagChange={setActiveTag}
          
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          
          onAdd={handleAddClick}
          addLabel={t('snippet.label', 'Snippet')}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
             <Code2 className="w-12 h-12 mb-2 opacity-20" />
             <p>{t('snippet.empty_state', 'No snippets found.')}</p>
             {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  {t('common.clear_search', 'Clear search')}
                </button>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2 pb-20 content-start">
             <AnimatePresence mode="popLayout">
               {filteredData.map(snippet => (
                 <motion.div
                    key={snippet.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                 >
                    <SnippetCard 
                      data={snippet}
                      onEdit={() => handleEdit(snippet)}
                      onDelete={() => handleDeleteClick(snippet.id)}
                    />
                 </motion.div>
               ))}
             </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <SnippetEditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingSnippet}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('snippet.delete_title', 'Delete Snippet?')}
        description={t('snippet.delete_confirm', 'Are you sure you want to delete this snippet? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
