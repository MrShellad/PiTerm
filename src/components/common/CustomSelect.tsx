import React, { useState, useRef, useEffect, useMemo, KeyboardEvent, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, Loader2, XCircle } from "lucide-react";
import clsx from "clsx";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value?: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string;
  searchable?: boolean;
  searchThreshold?: number;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "请选择...",
  disabled = false,
  isLoading = false,
  error,
  searchable,
  searchThreshold = 8,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // 坐标与约束状态
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [isFlipped, setIsFlipped] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable ?? options.length > searchThreshold;

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerQuery) ||
        String(opt.value).toLowerCase().includes(lowerQuery)
    );
  }, [options, searchQuery]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // ==========================================
  // 🟢 核心：位置计算、视口约束与翻转逻辑
  // ==========================================
  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const gap = 6; // 触发器与下拉框的间距
    const expectedMaxHeight = 280; // 期望的最大高度

    // 计算可用空间
    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    // 1. 自动翻转 (Auto-flip)：如果下方空间不足，且上方空间更大，则向上弹出
    const shouldFlip = spaceBelow < expectedMaxHeight && spaceAbove > spaceBelow;
    setIsFlipped(shouldFlip);

    // 2. 视口约束 (Viewport Constraint)：动态限制最大高度，防止超屏
    let calculatedMaxHeight = shouldFlip
      ? Math.min(spaceAbove - 12, expectedMaxHeight) // 向上弹时的可用高度
      : Math.min(spaceBelow - 12, expectedMaxHeight); // 向下弹时的可用高度

    // 最小保障高度
    if (calculatedMaxHeight < 100) calculatedMaxHeight = 100;

    // 3. 水平修正 (Horizontal Adjustment)：确保下拉框不超出左右屏幕边缘
    let left = rect.left;
    let width = rect.width;

    if (left + width > viewportWidth - 12) {
        left = viewportWidth - width - 12; // 触碰右边缘，向左修正
    }
    if (left < 12) {
        left = 12; // 触碰左边缘，向右修正
    }

    setDropdownStyle({
      position: "fixed", // 使用 fixed 配合 Portal 完全脱离文档流
      width: `${width}px`,
      left: `${left}px`,
      // 如果翻转，top 定位在触发器上方；否则定位在下方
      top: shouldFlip ? `${rect.top - gap}px` : `${rect.bottom + gap}px`,
      maxHeight: `${calculatedMaxHeight}px`,
    });
  }, [isOpen]);

  // ==========================================
  // 🟢 滚动跟随与事件监听
  // ==========================================
  useEffect(() => {
    if (!isOpen) return;

    // 初始计算位置
    updatePosition();

    // 监听滚动和缩放 (使用 capture 捕获阶段，能捕捉到任何祖先元素的滚动)
    const handleScrollOrResize = () => {
      requestAnimationFrame(updatePosition); // 使用 rAF 保证性能，避免掉帧
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // 点击外部关闭 (需要同时判断 Trigger 和 Portal Dropdown)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const isOutsideTrigger =
        triggerRef.current && !triggerRef.current.contains(e.target as Node);
      const isOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node);

      if (isOutsideTrigger && isOutsideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // 状态重置与焦点管理
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      if (showSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, showSearch, value, filteredOptions.length]);

  // ==========================================
  // 🟢 键盘交互
  // ==========================================
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || isLoading) return;

    switch (e.key) {
      case "Enter":
      case " ":
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        } else if (isOpen && filteredOptions[highlightedIndex]) {
          e.preventDefault();
          const selected = filteredOptions[highlightedIndex];
          if (!selected.disabled) handleSelect(selected.value);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else {
          setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
          scrollToHighlight(highlightedIndex + 1);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          scrollToHighlight(highlightedIndex - 1);
        }
        break;
    }
  };

  const scrollToHighlight = (index: number) => {
    if (!listRef.current) return;
    const list = listRef.current;
    const items = list.querySelectorAll("li");
    const targetItem = items[index];

    if (targetItem) {
      const scrollBottom = list.scrollTop + list.clientHeight;
      const targetBottom = targetItem.offsetTop + targetItem.offsetHeight;

      if (targetBottom > scrollBottom) {
        list.scrollTop = targetBottom - list.clientHeight;
      } else if (targetItem.offsetTop < list.scrollTop) {
        list.scrollTop = targetItem.offsetTop;
      }
    }
  };

  const handleSelect = (selectedValue: string | number) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  // 渲染 Portal 下拉框
  const renderDropdown = () => {
    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
      <div
        ref={dropdownRef}
        style={dropdownStyle}
        // 当翻转时，使用 -translate-y-full 向上生长，并设置 origin-bottom 动画
        className={clsx(
          "z-[9999] flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden transition-opacity duration-150 animate-in fade-in zoom-in-95",
          isFlipped ? "origin-bottom -translate-y-full" : "origin-top"
        )}
      >
        {showSearch && (
          <div className="p-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索选项..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}

        <ul
          ref={listRef}
          className="py-1 overflow-y-auto custom-scrollbar focus:outline-none flex-1"
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <Search className="w-6 h-6 opacity-20" />
              <span>没有找到相关选项</span>
            </li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={clsx(
                    "flex items-center justify-between px-3 py-2 mx-1 my-0.5 rounded-lg cursor-pointer transition-colors duration-150",
                    option.disabled
                      ? "opacity-50 cursor-not-allowed bg-transparent"
                      : isSelected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                      : isHighlighted
                      ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon && (
                      <span
                        className={clsx(
                          "shrink-0 flex items-center justify-center transition-colors",
                          isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {option.icon}
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 ml-2" />}
                </li>
              );
            })
          )}
        </ul>
      </div>,
      document.body // 挂载到 Body
    );
  };

  return (
    <div
      className={clsx("relative w-full text-sm", className)}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-all duration-200 select-none",
          disabled ? "bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-60" : "bg-white dark:bg-slate-900 cursor-pointer",
          error
            ? "border-red-400 focus:ring-2 focus:ring-red-400/20"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500 dark:ring-blue-500/20"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        )}
      >
        <div className="flex-1 flex items-center gap-2 truncate text-slate-700 dark:text-slate-200">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="shrink-0 flex items-center justify-center">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </div>
        <div className="shrink-0 ml-2 text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <ChevronDown className={clsx("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-red-500">
          <XCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 渲染 Portal 下拉框 */}
      {renderDropdown()}
    </div>
  );
};