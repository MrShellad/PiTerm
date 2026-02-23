import { create } from 'zustand';
import { FileEntry, SortField, SortOrder } from '@/features/fs/types';

export interface ClipboardState {
  type: 'copy' | 'move';
  files: FileEntry[];
  sourcePath: string;
}

interface FileCache {
  [path: string]: {
    data: FileEntry[];
    timestamp: number;
  };
}

const CACHE_DURATION = 300000;

interface SessionFileState {
  currentPath: string;
  history: string[];
  historyIndex: number;
  files: FileEntry[];
  isLoading: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
  showHidden: boolean;
  reloadTrigger: number;
  clipboard: ClipboardState | null;
  cache: FileCache;
  // 🟢 [新增] 标记是否开启终端目录跟随
  isTracking: boolean;
}

const defaultSessionState: SessionFileState = {
  currentPath: '/',
  history: ['/'],
  historyIndex: 0,
  files: [],
  isLoading: false,
  sortField: 'name',
  sortOrder: 'asc',
  showHidden: false,
  reloadTrigger: 0,
  clipboard: null,
  cache: {},
  // 🟢 [新增] 默认不开启
  isTracking: true,
};

interface FileStore {
  sessions: Record<string, SessionFileState>;
  
  triggerReload: (sessionId: string) => void; 
  initSession: (sessionId: string) => void;
  setPath: (sessionId: string, path: string, isManual?: boolean) => void;
  setFiles: (sessionId: string, files: FileEntry[]) => void;
  setLoading: (sessionId: string, loading: boolean) => void;
  goBack: (sessionId: string) => void;
  goForward: (sessionId: string) => void;
  goUp: (sessionId: string) => void;
  toggleHidden: (sessionId: string) => void;
  setSort: (sessionId: string, field: SortField) => void;
  getSession: (sessionId: string) => SessionFileState;
  setClipboard: (sessionId: string, clipboard: ClipboardState | null) => void;
  clearCache: (sessionId: string, path: string) => void;
  
  // 🟢 [新增] 切换跟随状态
  toggleTracking: (sessionId: string) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  sessions: {},

  getSession: (sessionId) => {
    return get().sessions[sessionId] || defaultSessionState;
  },

  triggerReload: (sessionId) => {
    const session = get().sessions[sessionId];
    if (session) {
        get().clearCache(sessionId, session.currentPath);
    }

    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...(state.sessions[sessionId] || defaultSessionState),
          reloadTrigger: (state.sessions[sessionId]?.reloadTrigger || 0) + 1
        }
      }
    }));
  },

  initSession: (sessionId) => set((state) => {
    if (state.sessions[sessionId]) return {};
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: { ...defaultSessionState }
      }
    };
  }),

  // 🟢 [新增] 切换跟随状态实现
  toggleTracking: (sessionId) => set((state) => {
      const session = state.sessions[sessionId] || defaultSessionState;
      return {
          sessions: {
              ...state.sessions,
              [sessionId]: {
                  ...session,
                  isTracking: !session.isTracking
              }
          }
      };
  }),

  setFiles: (sessionId, files) => set((state) => {
    const session = state.sessions[sessionId] || defaultSessionState;
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          files,
          isLoading: false,
          cache: {
            ...session.cache,
            [session.currentPath]: { data: files, timestamp: Date.now() }
          }
        }
      }
    };
  }),

  clearCache: (sessionId, path) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return {};
      const newCache = { ...session.cache };
      delete newCache[path];
      return {
          sessions: {
              ...state.sessions,
              [sessionId]: { ...session, cache: newCache }
          }
      };
  }),

  setClipboard: (sessionId, clipboard) => set((state) => ({
    sessions: {
      ...state.sessions,
      [sessionId]: {
        ...(state.sessions[sessionId] || defaultSessionState),
        clipboard
      }
    }
  })),
  
setPath: (sessionId, path, isManual = false) => set((state) => {
      const session = state.sessions[sessionId] || defaultSessionState;
      if (session.currentPath === path) return {}; 

      const newHistory = [...session.history.slice(0, session.historyIndex + 1), path];
      const cached = session.cache[path];
      const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_DURATION);

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            currentPath: path,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            files: isCacheValid ? cached.data : [], // 🟢 顺手修复：缓存失效时清空旧文件，避免闪烁
            isLoading: !isCacheValid, 
            isTracking: isManual ? false : session.isTracking // 🟢 关键：手动触发时关闭磁铁
          }
        }
      };
  }),

  setLoading: (sessionId, loading) => set((state) => ({
    sessions: {
      ...state.sessions,
      [sessionId]: { ...(state.sessions[sessionId] || defaultSessionState), isLoading: loading }
    }
  })),

// --- 3. 后退时关闭 tracking ---
goBack: (sessionId) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session || session.historyIndex <= 0) return {};
      const newIndex = session.historyIndex - 1;
      const path = session.history[newIndex];
      const cached = session.cache[path];
      const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_DURATION);

      return { 
          sessions: { 
              ...state.sessions, 
              [sessionId]: { 
                  ...session, 
                  historyIndex: newIndex, 
                  currentPath: path,
                  files: isCacheValid ? cached.data : [], // 🟢 同上修复
                  isLoading: !isCacheValid,
                  isTracking: false // 🟢 关键修复：后退时自动取消跟随
              } 
          } 
      };
  }),

goForward: (sessionId) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session || session.historyIndex >= session.history.length - 1) return {};
      const newIndex = session.historyIndex + 1;
      const path = session.history[newIndex];
      const cached = session.cache[path];
      const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_DURATION);

      return { 
          sessions: { 
              ...state.sessions, 
              [sessionId]: { 
                  ...session, 
                  historyIndex: newIndex, 
                  currentPath: path,
                  files: isCacheValid ? cached.data : [], // 🟢 同上修复
                  isLoading: !isCacheValid,
                  isTracking: false // 🟢 关键修复：前进时自动取消跟随
              } 
          } 
      };
  }),

 goUp: (sessionId) => {
      const session = get().sessions[sessionId];
      if (!session) return;
      const parent = session.currentPath.split('/').slice(0, -1).join('/') || '/';
      // 🟢 传入 true 标记为手动操作
      if (parent !== session.currentPath) get().setPath(sessionId, parent, true); 
  },

  toggleHidden: (sessionId) => set((state) => ({
      sessions: { ...state.sessions, [sessionId]: { ...(state.sessions[sessionId] || defaultSessionState), showHidden: !state.sessions[sessionId]?.showHidden } }
  })),
  
  setSort: (sessionId, field) => set((state) => {
      const session = state.sessions[sessionId] || defaultSessionState;
      return { sessions: { ...state.sessions, [sessionId]: { ...session, sortField: field, sortOrder: session.sortField === field && session.sortOrder === 'asc' ? 'desc' : 'asc' } } };
  }),
}));