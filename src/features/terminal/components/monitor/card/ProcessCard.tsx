import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ListTree, ArrowDownUp, ChevronDown, ChevronUp, Cpu, Zap } from "lucide-react";
import { clsx } from "clsx";
import { formatBytes } from "@/utils/format";
import { MonitorCard } from "../MonitorCard";

export interface RemoteProcessInfo {
    pid: number;
    name: string;
    cpuUsage: number;
    memUsage: number;
}

type SortField = 'pid' | 'name' | 'cpuUsage' | 'memUsage';
type SortDirection = 'asc' | 'desc';

interface ProcessCardProps {
    sessionId: string;
    isExpanded?: boolean;
    onToggle?: (id: string) => void;
}

// 表头组件 (支持 Grid 布局对齐)
const TableHeader = ({ label, field, currentField, direction, onClick, icon, className, align = "left" }: any) => (
    <div 
        onClick={() => onClick(field)}
        className={clsx(
            "flex items-center gap-1 cursor-pointer group select-none py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors hover:text-slate-700 dark:hover:text-slate-200",
            align === "right" ? "justify-end" : "justify-start",
            className
        )}
    >
        {icon}
        <span>{label}</span>
        <span className="ml-0.5 flex items-center">
            {currentField !== field && <ArrowDownUp className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />}
            {currentField === field && direction === 'desc' && <ChevronDown className="w-3 h-3 text-blue-500" />}
            {currentField === field && direction === 'asc' && <ChevronUp className="w-3 h-3 text-blue-500" />}
        </span>
    </div>
);

export const ProcessCard = ({ 
    sessionId, 
    // 🟢 [修复报错] 给可选属性提供默认值
    isExpanded = false, 
    onToggle = () => {} 
}: ProcessCardProps) => {
    const { t } = useTranslation();
    const [processes, setProcesses] = useState<RemoteProcessInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<SortField>('cpuUsage');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => {
        if (!sessionId) return;
        const fetchData = async () => {
            try {
                const data = await invoke<RemoteProcessInfo[]>("get_ssh_process_list", { id: sessionId });
                setProcesses(data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch processes:", err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedProcesses = useMemo(() => {
        const sorted = [...processes];
        sorted.sort((a, b) => {
            let comparison = 0;
            if (a[sortField] > b[sortField]) comparison = 1;
            else if (a[sortField] < b[sortField]) comparison = -1;
            if (sortField === 'name') {
                comparison = a.name.localeCompare(b.name);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [processes, sortField, sortDirection]);

    const id = 'proc';
    const topProcess = processes.length > 0 ? processes.reduce((prev, current) => (prev.cpuUsage > current.cpuUsage) ? prev : current) : null;

    // 🟢 [修复错位] 使用 Grid 布局替代 Flex
    // Name(2fr), PID(1fr), CPU(1fr), Mem(1fr)
    const GRID_CLASS = "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-4";

    return (
        <MonitorCard
            id={id}
            title={t('monitor.process.title', 'Processes')}
            icon={<ListTree className="w-5 h-5" />}
            color="blue"
            detail={
                topProcess ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{topProcess.name}</span>
                        <span className="flex items-center gap-0.5">
                             CPU: <span className="font-medium tabular-nums text-blue-500">{topProcess.cpuUsage.toFixed(1)}%</span>
                        </span>
                    </div>
                ) : null
            }
            usage={0}
            usageDisplay={
                <span className="text-xl font-medium tracking-tight tabular-nums text-slate-700 dark:text-slate-200">
                    {processes.length}
                </span>
            }
            subTitle={t('monitor.process.total', 'Total Tasks')}
            isExpanded={isExpanded}
            onToggle={onToggle}
            className="col-span-full"
        >
            <div className="flex flex-col h-[400px] animate-in fade-in duration-300 relative">
                
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    
                    {/* Sticky Header (Grid) */}
                    <div className={clsx(
                        GRID_CLASS,
                        "sticky top-0 z-20 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/95 dark:bg-[#1a1b26]/95 backdrop-blur-md"
                    )}>
                        <TableHeader field="name" label={t('monitor.process.name', 'Name')} currentField={sortField} direction={sortDirection} onClick={handleSort} />
                        <TableHeader field="pid" label="PID" currentField={sortField} direction={sortDirection} onClick={handleSort} align="right" />
                        <TableHeader field="cpuUsage" label="CPU" icon={<Cpu className="w-3 h-3 mr-0.5 opacity-70" />} currentField={sortField} direction={sortDirection} onClick={handleSort} align="right" />
                        <TableHeader field="memUsage" label="Mem" icon={<Zap className="w-3 h-3 mr-0.5 opacity-70" />} currentField={sortField} direction={sortDirection} onClick={handleSort} align="right" />
                    </div>

                    {/* Content List */}
                    {loading && processes.length === 0 && (
                         <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium animate-pulse py-10">
                             {t('monitor.loading', 'Loading processes...')}
                         </div>
                    )}
                    
                    <div className="flex flex-col pb-2">
                        {sortedProcesses.map((proc) => (
                            // 🟢 [核心修复] 内容行使用相同的 Grid 类名，确保完美对齐
                            <div key={proc.pid} className={clsx(
                                GRID_CLASS,
                                "py-1.5 border-b border-slate-100 dark:border-white/5 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors group text-xs items-center"
                            )}>
                                {/* Name */}
                                <div className="font-medium text-slate-700 dark:text-slate-200 truncate pr-2" title={proc.name}>
                                    {proc.name}
                                </div>
                                {/* PID */}
                                <div className="text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums font-mono">
                                    {proc.pid}
                                </div>
                                {/* CPU */}
                                <div className={clsx(
                                    "text-right font-medium tabular-nums",
                                    proc.cpuUsage > 50 ? "text-red-500" : (proc.cpuUsage > 20 ? "text-amber-500" : "text-blue-500")
                                )}>
                                    {proc.cpuUsage.toFixed(1)}%
                                </div>
                                {/* Mem */}
                                <div className="text-right font-medium text-purple-500 tabular-nums">
                                    {formatBytes(proc.memUsage)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MonitorCard>
    );
};