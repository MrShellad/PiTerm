import { create } from 'zustand';

export interface TransferTask {
    id: string;
    type: 'upload' | 'download';
    name: string;
    localPath: string;
    remotePath: string;
    size: number;
    status: 'running' | 'completed' | 'error';
    progress: number;
    transferred: number;
    speed: number;
    startTime: number; 
    error?: string;
    // 如果您使用 AbortController 来控制取消，可以考虑不放在 Store 里，
    // 而是维护一个外部的 Map<id, AbortController>，或者在这里暂存（但不推荐存不可序列化对象）
}

interface TransferState {
    isOpen: boolean;
    tasks: TransferTask[];
    
    toggleOpen: () => void;
    addTask: (task: TransferTask) => void;
    updateStatus: (id: string, status: TransferTask['status'], error?: string) => void;
    updateProgress: (id: string, progress: number, transferred: number, speed: number, size?: number) => void;
    clearCompleted: () => void;
    
    // [新增] 删除单个任务，支持传入是否物理删除文件的标志
    removeTask: (id: string, shouldDeleteFile?: boolean) => Promise<void> | void;
    
    // [新增] 取消正在运行的任务
    cancelTask: (id: string) => void;
}

export const useTransferStore = create<TransferState>((set, get) => ({
    isOpen: false,
    tasks: [],

    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

    addTask: (task) => set((state) => ({ 
        tasks: [task, ...state.tasks], 
        isOpen: true 
    })),

    updateStatus: (id, status, error) => set((state) => ({
        tasks: state.tasks.map(t => 
            t.id === id ? {
                ...t,
                status,
                error,
                speed: 0,
                progress: status === 'completed' ? 100 : t.progress,
                transferred: status === 'completed' ? (t.size || t.transferred) : t.transferred
            } : t
        )
    })),

    updateProgress: (id, progress, transferred, speed, size) => set((state) => ({
        tasks: state.tasks.map(t => 
            t.id === id && t.status === 'running' ? {
                ...t,
                progress: Math.max(0, Math.min(100, progress)),
                transferred,
                speed,
                size: size && size > 0 ? size : t.size
            } : t
        )
    })),

    clearCompleted: () => set((state) => ({
        tasks: state.tasks.filter(t => t.status === 'running')
    })),

    // [实现] 取消任务逻辑
    cancelTask: (id) => {
        const task = get().tasks.find(t => t.id === id);
        
        // 只有正在运行的任务才需要取消
        if (task && task.status === 'running') {
            console.log(`正在请求取消任务: ${id}`);
            
            // TODO: 这里是关键！需要对接实际的网络请求取消逻辑
            // 1. 如果是 fetch/axios，调用 AbortController.abort()
            // 2. 如果是 Node.js Stream / SSH，调用 stream.destroy() 或 ssh.end()
            // 示例：window.transferManager.abort(id);

            // 更新 UI 状态为 Error (并标记为用户取消)
            set((state) => ({
                tasks: state.tasks.map(t => 
                    t.id === id ? { ...t, status: 'error', error: '用户取消', speed: 0 } : t
                )
            }));
        }
    },

    // [保留] 删除任务逻辑
    removeTask: async (id, shouldDeleteFile = false) => {
        // 1. 如果需要删除物理文件，先获取任务信息
        if (shouldDeleteFile) {
            const task = get().tasks.find(t => t.id === id);
            if (task) {
                // 安全检查：只允许删除本地文件
                // 如果是 Upload 任务，localPath 是源文件，通常不建议默认删除，但这里遵循用户 Checkbox 的选择
                // 如果是 Download 任务，localPath 是下载下来的文件
                try {
                    console.log(`正在请求删除物理文件: ${task.localPath}`);
                    
                    // TODO: 在这里调用后端 API 或 Electron/Tauri 文件系统接口
                    // await window.fs.unlink(task.localPath);
                    
                } catch (error) {
                    console.error('删除物理文件失败:', error);
                    // 即使物理删除失败，通常也应该继续移除 UI 上的记录，或者给用户一个 Toast 提示
                }
            }
        }

        // 2. 从 Store 列表中移除记录
        set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
        }));
    }
}));
