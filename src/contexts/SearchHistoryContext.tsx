/**
 * SearchHistoryContext — historial de búsquedas con snapshots persistentes.
 *
 * Vive a nivel de App (debajo de AuthProvider) para que tanto la página de
 * búsqueda (que ESCRIBE entradas tras cada búsqueda) como el SearchSidebar
 * (que las LEE y permite restaurarlas) compartan el mismo estado reactivo.
 *
 * Decisión de producto: cada entrada guarda un SNAPSHOT EXACTO de los
 * resultados tal como aparecieron (cap a TOP_RESULTS para no inflar
 * localStorage). Al hacer clic en una tarjeta se restaura ese snapshot sin
 * golpear el backend — reproduce el estado histórico aunque los datos hayan
 * cambiado. Ver useScreening.restoreSnapshot.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ScreeningMatch } from '@/types/api';

export interface SearchHistoryEntry {
  id: string;
  query: string;
  sourceLevel: 1 | 2 | 3 | 4 | 5;
  engine: 'v1' | 'v2';
  searchMode: 'traditional' | 'semantic' | 'auto';
  /** epoch ms — cuándo se ejecutó la búsqueda. */
  timestamp: number;
  /** total real de matches (puede exceder los results guardados). */
  resultCount: number;
  /** Snapshot recortado (TOP_RESULTS) para restaurar la vista sin red. */
  results: ScreeningMatch[];
  executionTimeMs?: number;
}

const STORAGE_KEY = 'sentinel:search:history';
const MAX_ENTRIES = 24;
const TOP_RESULTS = 20;

/** Firma de deduplicación: misma query + mismos parámetros = misma búsqueda. */
function signatureOf(
  e: Pick<SearchHistoryEntry, 'query' | 'sourceLevel' | 'engine' | 'searchMode'>,
): string {
  return `${e.query.trim().toLowerCase()}::${e.sourceLevel}::${e.engine}::${e.searchMode}`;
}

function loadEntries(): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SearchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

interface SearchHistoryContextValue {
  entries: SearchHistoryEntry[];
  addSearch: (
    entry: Omit<SearchHistoryEntry, 'id' | 'timestamp' | 'results'> & {
      results: ScreeningMatch[];
    },
  ) => void;
  removeSearch: (id: string) => void;
  clearHistory: () => void;
  getEntry: (id: string) => SearchHistoryEntry | undefined;
}

const SearchHistoryContext = createContext<SearchHistoryContextValue | null>(null);

export function SearchHistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>(loadEntries);

  // Persist on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* quota / private mode — degradamos silenciosamente */
    }
  }, [entries]);

  const addSearch = useCallback<SearchHistoryContextValue['addSearch']>((entry) => {
    const trimmed = entry.query.trim();
    if (!trimmed) return;

    const sig = signatureOf(entry);
    const newEntry: SearchHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query: trimmed,
      sourceLevel: entry.sourceLevel,
      engine: entry.engine,
      searchMode: entry.searchMode,
      resultCount: entry.resultCount,
      results: entry.results.slice(0, TOP_RESULTS),
      executionTimeMs: entry.executionTimeMs,
      timestamp: Date.now(),
    };

    setEntries((prev) => {
      // Dedup: elimina cualquier entrada con la misma firma y pone la nueva al frente.
      const deduped = prev.filter((e) => signatureOf(e) !== sig);
      return [newEntry, ...deduped].slice(0, MAX_ENTRIES);
    });
  }, []);

  const removeSearch = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => setEntries([]), []);

  const getEntry = useCallback(
    (id: string) => entries.find((e) => e.id === id),
    [entries],
  );

  const value = useMemo<SearchHistoryContextValue>(
    () => ({ entries, addSearch, removeSearch, clearHistory, getEntry }),
    [entries, addSearch, removeSearch, clearHistory, getEntry],
  );

  return (
    <SearchHistoryContext.Provider value={value}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory(): SearchHistoryContextValue {
  const ctx = useContext(SearchHistoryContext);
  if (!ctx) {
    throw new Error('useSearchHistory must be used within SearchHistoryProvider');
  }
  return ctx;
}
