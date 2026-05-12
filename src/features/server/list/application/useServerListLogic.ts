import { useState, useMemo, useEffect } from 'react';
import { useServerStore } from '@/features/server/application/useServerStore';
import { useServerConnect } from '@/features/server/form/application/useServerConnect';
import { Server } from '@/features/server/domain/types';
import { CardSize, ServerListState, SortOption, ViewMode } from '../domain/types';
import { toast } from 'sonner';
import { useKeyStore } from "@/store/useKeyStore";
import { useTranslation } from "react-i18next";

export const useServerListLogic = () => {
  const { t } = useTranslation();
  const { 
    servers, 
    removeServer, 
    fetchServers,
    isInitialized,
    hasVisitedList,
    markListVisited
  } = useServerStore();
  const { connect } = useServerConnect();
  
  const keyStoreStatus = useKeyStore(s => s.status);
  const openGlobalUnlockModal = useKeyStore(s => s.openGlobalUnlockModal);
  const deleteKey = useKeyStore(s => s.deleteKey); 
  
  const isUnlocked = keyStoreStatus === 'unlocked';

  const shouldShowLoading = !hasVisitedList && !isInitialized && servers.length === 0;
  const [isLoading, setIsLoading] = useState(shouldShowLoading);

  const [state, setState] = useState<ServerListState>({
    searchQuery: '',
    activeTags: [],
    viewMode: 'grid',
    cardSize: 'md',
    sortBy: 'sort_asc'
  });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    server: Server | null;
    relatedKeyId?: string;
    relatedKeyType?: 'password' | 'private_key';
    isKeyUsedByOthers?: boolean;
    relatedServerNames?: string[];
  }>({
    isOpen: false,
    server: null
  });

  useEffect(() => {
    let isMounted = true;

    if (!hasVisitedList) {
       setTimeout(() => markListVisited(), 500);
    }

    const initData = async () => {
      try {
        await fetchServers(true);
      } catch (error) {
        console.error("Failed to sync servers:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initData();

    return () => { isMounted = false; };
  }, []); 

  const shouldAnimate = !hasVisitedList;

  const updateState = (updates: Partial<ServerListState>) => 
    setState(prev => ({ ...prev, ...updates }));

  const processedServers = useMemo(() => {
    let result = servers.filter(s => s.provider !== 'QuickConnect');

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.ip.includes(q) || 
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (state.activeTags.length > 0) {
      result = result.filter(s => 
        state.activeTags.every(tag => s.tags.includes(tag))
      );
    }

    const compareText = (left: string | undefined, right: string | undefined) =>
      (left || '').localeCompare(right || '', undefined, { numeric: true, sensitivity: 'base' });

    const compareNumber = (left: number | undefined, right: number | undefined) =>
      (left ?? 0) - (right ?? 0);

    result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      switch (state.sortBy) {
        case 'sort_asc':
          return compareNumber(a.sort, b.sort) || compareText(a.name, b.name) || compareText(a.id, b.id);
        case 'created_desc':
          return compareNumber(b.createdAt, a.createdAt) || compareText(a.name, b.name);
        case 'created_asc':
          return compareNumber(a.createdAt, b.createdAt) || compareText(a.name, b.name);
        case 'name_asc':
          return compareText(a.name, b.name) || compareText(a.id, b.id);
        case 'name_desc':
          return compareText(b.name, a.name) || compareText(a.id, b.id);
        case 'id_desc':
          return compareText(b.id, a.id);
        case 'id_asc':
          return compareText(a.id, b.id);
        default:
          return 0;
      }
    });

    return result;
  }, [servers, state.searchQuery, state.activeTags, state.sortBy]);

  const allAvailableTags = useMemo(() => {
    const tags = new Set<string>();
    servers.forEach(s => s.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [servers]);

  const actions = {
    setSearch: (q: string) => updateState({ searchQuery: q }),
    
    toggleTag: (tag: string) => {
      const current = state.activeTags;
      const next = current.includes(tag) 
        ? current.filter(t => t !== tag) 
        : [...current, tag];
      updateState({ activeTags: next });
    },

    setFilterTag: (tag: string | null) => {
      updateState({ activeTags: tag ? [tag] : [] });
    },

    setCardSize: (size: CardSize) => updateState({ cardSize: size }),
    setViewMode: (mode: ViewMode) => updateState({ viewMode: mode }),
    setSortBy: (sort: SortOption) => updateState({ sortBy: sort }),
    setTags: (tags: string[]) => updateState({ activeTags: tags }),
    
    handleConnect: (server: Server) => {
      if (!isUnlocked) {
        toast.info(t('server.vault.locked_connect', "Please unlock the Vault to connect."));
        openGlobalUnlockModal();
        return; 
      }
      connect(server);
    },

    handleCopyIP: (ip: string) => {
      navigator.clipboard.writeText(ip);
      // 🟢 [修改] 移除了 Toast 提示，因为卡片和表格单元格已有本地视觉反馈 (Copied!)
      // toast.success(t('server.list.ip_copied', "IP Copied to clipboard"));
    },

    handlePin: (server: Server) => {
      const { addOrUpdateServer } = useServerStore.getState(); 
      addOrUpdateServer({ ...server, isPinned: !server.isPinned });
    },

    handleDelete: (idOrServer: string | Server) => {
      const server = typeof idOrServer === 'string' 
        ? servers.find(s => s.id === idOrServer)
        : idOrServer;

      if (!server) return;

      const { id, passwordId, keyId, authType } = server;
      
      let relatedKeyId: string | undefined;
      let relatedKeyType: 'password' | 'private_key' | undefined;
      let isKeyUsedByOthers = false;
      let relatedServerNames: string[] = [];

      if (authType === 'password' && passwordId) {
        relatedKeyId = passwordId;
        relatedKeyType = 'password';
        const others = servers.filter(s => s.id !== id && s.passwordId === passwordId);
        if (others.length > 0) {
          isKeyUsedByOthers = true;
          relatedServerNames = others.map(s => s.name);
        }
      } else if (authType === 'key' && keyId) {
        relatedKeyId = keyId;
        relatedKeyType = 'private_key';
        const others = servers.filter(s => s.id !== id && s.keyId === keyId);
        if (others.length > 0) {
          isKeyUsedByOthers = true;
          relatedServerNames = others.map(s => s.name);
        }
      }

      setDeleteModalState({
        isOpen: true,
        server,
        relatedKeyId,
        relatedKeyType,
        isKeyUsedByOthers,
        relatedServerNames
      });
    },

    confirmDelete: async (shouldDeleteKey: boolean) => {
      const { server, relatedKeyId } = deleteModalState;
      if (!server) return;

      try {
        await removeServer(server.id);

        if (shouldDeleteKey && relatedKeyId) {
           if (deleteKey) {
             await deleteKey(relatedKeyId);
           } else {
             console.warn("deleteKey method not found in useKeyStore");
           }
        }
        
        toast.success(t('server.delete.success', 'Server deleted successfully'));
      } catch (e) {
        console.error(e);
        toast.error(t('server.delete.error', 'Failed to delete server'));
      } finally {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
      }
    }
  };

  return {
    state,
    activeTag: state.activeTags[0] || null, 
    servers: processedServers,
    allTags: allAvailableTags,
    actions,
    deleteModalState,
    setDeleteModalState,
    isLoading,
    shouldAnimate 
  };
};
