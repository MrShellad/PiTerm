import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { invoke } from '@tauri-apps/api/core';
import { SnippetService } from '@/features/snippet/application/snippetService';
import { Snippet } from '@/features/snippet/domain/types';
import { SuggestionItem } from '../components/AutocompletePopup';
import { TerminalService } from './services/terminal.service';

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const CURSOR_UPDATE_THROTTLE_MS = 120;

interface TerminalMetrics {
  left: number;
  top: number;
  cellWidth: number;
  cellHeight: number;
}

interface SearchableSnippet {
  code: string;
  title: string;
  searchText: string;
}

export const useTerminalAutocomplete = (
  term: Terminal | null,
  sessionId: string,
  options?: { enabled?: boolean }
) => {
  const enabled = options?.enabled ?? true;
  const [visible, setVisible] = useState(false);
  const [cursorInfo, setCursorInfo] = useState({ x: 0, y: 0, lineHeight: 0 });
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputBuffer = useRef('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const cursorUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const visibleRef = useRef(false);
  const suggestionsRef = useRef<SuggestionItem[]>([]);
  const selectedIndexRef = useRef(0);
  const snippetsCacheRef = useRef<SearchableSnippet[] | null>(null);
  const snippetsPromiseRef = useRef<Promise<SearchableSnippet[]> | null>(null);
  const searchRequestId = useRef(0);
  const terminalMetricsRef = useRef<TerminalMetrics | null>(null);
  const lastCursorUpdateAt = useRef(0);

  const setVisibleState = useCallback((next: boolean) => {
    if (visibleRef.current === next) return;
    visibleRef.current = next;
    setVisible(next);
  }, []);

  const setSuggestionsState = useCallback((next: SuggestionItem[]) => {
    suggestionsRef.current = next;
    setSuggestions(next);
  }, []);

  const setSelectedIndexState = useCallback((next: number | ((current: number) => number)) => {
    const resolved = typeof next === 'function'
      ? (next as (current: number) => number)(selectedIndexRef.current)
      : next;
    const normalized = Math.max(0, resolved);

    if (selectedIndexRef.current === normalized) return;
    selectedIndexRef.current = normalized;
    setSelectedIndex(normalized);
  }, []);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const clearCursorUpdateTimer = useCallback(() => {
    if (cursorUpdateTimer.current) {
      clearTimeout(cursorUpdateTimer.current);
      cursorUpdateTimer.current = null;
    }
  }, []);

  const getSnippetIndex = useCallback(async (): Promise<SearchableSnippet[]> => {
    if (snippetsCacheRef.current) return snippetsCacheRef.current;

    if (!snippetsPromiseRef.current) {
      snippetsPromiseRef.current = SnippetService.getAll()
        .then((snippets: Snippet[]) => {
          const indexed = snippets
            .filter((snippet) => snippet.language === 'bash' || snippet.language === 'text')
            .map((snippet) => ({
              code: snippet.code,
              title: snippet.title,
              searchText: snippet.code.toLowerCase()
            }));

          snippetsCacheRef.current = indexed;
          return indexed;
        })
        .catch((error) => {
          console.error('Failed to load snippets for autocomplete:', error);
          snippetsPromiseRef.current = null;
          return [];
        });
    }

    return snippetsPromiseRef.current;
  }, []);

  const getTerminalMetrics = useCallback(() => {
    if (!term || !term.element || term.cols <= 0 || term.rows <= 0) return null;
    if (terminalMetricsRef.current) return terminalMetricsRef.current;

    const termRect = term.element.getBoundingClientRect();
    const width = termRect.width || term.element.clientWidth;
    const height = termRect.height || term.element.clientHeight;
    const metrics: TerminalMetrics = {
      left: termRect.left,
      top: termRect.top,
      cellWidth: width / term.cols,
      cellHeight: height / term.rows
    };

    terminalMetricsRef.current = metrics;
    return metrics;
  }, [term]);

  const updateCursorPosition = useCallback(() => {
    const metrics = getTerminalMetrics();
    if (!term || !metrics) return;

    const cursorX = term.buffer.active.cursorX;
    const cursorY = term.buffer.active.cursorY;
    const inputLength = inputBuffer.current.length;
    const anchorCursorX = Math.max(0, cursorX - inputLength);
    const next = {
      x: metrics.left + (anchorCursorX * metrics.cellWidth),
      y: metrics.top + (cursorY * metrics.cellHeight),
      lineHeight: metrics.cellHeight
    };

    setCursorInfo((previous) => {
      const unchanged =
        Math.abs(previous.x - next.x) < 0.5 &&
        Math.abs(previous.y - next.y) < 0.5 &&
        Math.abs(previous.lineHeight - next.lineHeight) < 0.5;

      return unchanged ? previous : next;
    });
  }, [getTerminalMetrics, term]);

  const scheduleCursorPositionUpdate = useCallback((force = false) => {
    if (!force && !visibleRef.current) return;

    if (force) {
      clearCursorUpdateTimer();
      lastCursorUpdateAt.current = Date.now();
      updateCursorPosition();
      return;
    }

    const now = Date.now();
    const elapsed = now - lastCursorUpdateAt.current;
    if (elapsed >= CURSOR_UPDATE_THROTTLE_MS) {
      lastCursorUpdateAt.current = now;
      updateCursorPosition();
      return;
    }

    if (cursorUpdateTimer.current) return;
    cursorUpdateTimer.current = setTimeout(() => {
      cursorUpdateTimer.current = null;
      if (!visibleRef.current) return;

      lastCursorUpdateAt.current = Date.now();
      updateCursorPosition();
    }, CURSOR_UPDATE_THROTTLE_MS - elapsed);
  }, [clearCursorUpdateTimer, updateCursorPosition]);

  const search = useCallback(async (query: string) => {
    const requestId = ++searchRequestId.current;

    if (!enabled || !query || query.length < MIN_QUERY_LENGTH) {
      setVisibleState(false);
      return;
    }

    try {
      const historyPromise = invoke<any[]>('search_history_autocomplete', {
        query,
        limit: 10
      }).catch(() => []);

      const [historyRes, snippetIndex] = await Promise.all([historyPromise, getSnippetIndex()]);
      if (requestId !== searchRequestId.current || query !== inputBuffer.current) return;

      const safeHistory = Array.isArray(historyRes) ? historyRes : [];
      const historyItems: SuggestionItem[] = safeHistory
        .slice(0, 3)
        .map((h: any) => ({
          type: 'history' as const,
          value: String(h.displayCommand || h.display_command || h.normalized_command || '')
        }))
        .filter((item) => item.value.length > 0);

      const lowerQuery = query.toLowerCase();
      const snippetItems: SuggestionItem[] = [];
      for (const snippet of snippetIndex) {
        if (!snippet.searchText.includes(lowerQuery)) continue;

        snippetItems.push({
          type: 'snippet',
          value: snippet.code,
          label: snippet.title
        });

        if (snippetItems.length >= 3) break;
      }

      const merged = [...historyItems, ...snippetItems];

      if (merged.length > 0) {
        setSuggestionsState(merged);
        setSelectedIndexState(0);
        scheduleCursorPositionUpdate(true);
        setVisibleState(true);
      } else {
        setVisibleState(false);
      }
    } catch (e) {
      console.error(e);
      if (requestId === searchRequestId.current) {
        setVisibleState(false);
      }
    }
  }, [
    enabled,
    getSnippetIndex,
    scheduleCursorPositionUpdate,
    setSelectedIndexState,
    setSuggestionsState,
    setVisibleState
  ]);

  const applyCompletion = useCallback((item: SuggestionItem) => {
    if (!enabled || !term || !item) return;

    clearDebounceTimer();
    searchRequestId.current += 1;

    const currentInput = inputBuffer.current;
    const targetCommand = item.value;

    if (targetCommand.startsWith(currentInput)) {
      const suffix = targetCommand.slice(currentInput.length);
      if (suffix) {
        TerminalService.writeSsh(sessionId, suffix).catch(console.error);
        inputBuffer.current = targetCommand;
      }
    } else {
      let backspaces = '';
      for (let i = 0; i < currentInput.length; i++) backspaces += '\x7f';
      TerminalService.writeSsh(sessionId, backspaces + targetCommand).catch(console.error);
      inputBuffer.current = targetCommand;
    }
    setVisibleState(false);
  }, [clearDebounceTimer, enabled, sessionId, setVisibleState, term]);

  useEffect(() => {
    if (!enabled) {
      inputBuffer.current = '';
      searchRequestId.current += 1;
      clearDebounceTimer();
      clearCursorUpdateTimer();
      setSuggestionsState([]);
      setSelectedIndexState(0);
      setVisibleState(false);
      return;
    }

    if (!term) return;
    terminalMetricsRef.current = null;

    const scheduleSearch = () => {
      clearDebounceTimer();

      if (inputBuffer.current.length < MIN_QUERY_LENGTH) {
        setVisibleState(false);
        return;
      }

      debounceTimer.current = setTimeout(() => {
        search(inputBuffer.current);
      }, DEBOUNCE_MS);
    };

    const resetInput = () => {
      inputBuffer.current = '';
      searchRequestId.current += 1;
      clearDebounceTimer();
      setVisibleState(false);
    };

    const cursorDisposable = term.onCursorMove(() => {
      scheduleCursorPositionUpdate();
    });

    const dataDisposable = term.onData((data) => {
      if (data === '\r' || data === '\n') {
        resetInput();
      } else if (data === '\x7f') {
        inputBuffer.current = inputBuffer.current.slice(0, -1);
        scheduleSearch();
      } else if (data.charCodeAt(0) < 32) {
        resetInput();
      } else {
        inputBuffer.current += data;
        scheduleSearch();
      }
    });

    const resizeHandler = () => {
      terminalMetricsRef.current = null;
      if (visibleRef.current) scheduleCursorPositionUpdate(true);
    };
    window.addEventListener('resize', resizeHandler);

    const terminalResizeDisposable = term.onResize(() => {
      terminalMetricsRef.current = null;
      if (visibleRef.current) scheduleCursorPositionUpdate(true);
    });

    const keyHandler = (e: KeyboardEvent) => {
      if (!visibleRef.current || e.type !== 'keydown') return true;

      const items = suggestionsRef.current;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndexState(current => Math.max(0, current - 1));
        return false;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndexState(current => Math.min(items.length - 1, current + 1));
        return false;
      }

      if (e.key === 'Tab') {
        const item = items[selectedIndexRef.current];
        if (!item) return true;

        e.preventDefault();
        applyCompletion(item);
        return false;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setVisibleState(false);
        return false;
      }

      return true;
    };

    term.attachCustomKeyEventHandler(keyHandler);

    return () => {
      clearDebounceTimer();
      clearCursorUpdateTimer();
      dataDisposable.dispose();
      cursorDisposable.dispose();
      terminalResizeDisposable.dispose();
      window.removeEventListener('resize', resizeHandler);
      term.attachCustomKeyEventHandler(() => true);
    };
  }, [
    applyCompletion,
    clearCursorUpdateTimer,
    clearDebounceTimer,
    scheduleCursorPositionUpdate,
    search,
    setSelectedIndexState,
    setSuggestionsState,
    setVisibleState,
    term,
    enabled
  ]);

  return {
    visible,
    cursorInfo,
    suggestions,
    selectedIndex,
    applyCompletion
  };
};
