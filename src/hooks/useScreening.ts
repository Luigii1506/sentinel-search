import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { screeningService } from '@/services/screening';
import type { ScreeningRequest, ScreeningMatch, ScreeningResponse } from '@/types/api';

export interface SearchFilters {
  entityTypes: string[];
  riskLevels: string[];
  sources: string[];
  countries: string[];
}

export interface SearchPerformance {
  executionTimeMs: number;
  fromCache: boolean;
  strategy: string;
  sourcesUsed: string[];
  totalMatches?: number;
}

// Live-search desactivado — debounce helper removido.
// La búsqueda real se ejecuta solo en executeSearch (Enter explícito).

export interface UseScreeningReturn {
  query: string;
  suggestions: ScreeningMatch[];
  results: ScreeningMatch[];
  isLoading: boolean;
  isSuggestionsLoading: boolean;
  hasSearched: boolean;
  filters: SearchFilters;
  searchMode: 'traditional' | 'semantic' | 'auto';
  performance: SearchPerformance | null;
  cacheStats: { size: number; maxSize: number; ttlMinutes: number };
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setSearchMode: (mode: 'traditional' | 'semantic' | 'auto') => void;
  clearSearch: () => void;
  executeSearch: (searchQuery: string) => void;
  executeSemanticSearch: (searchQuery: string) => void;
  clearCache: () => void;
}

const defaultFilters: SearchFilters = {
  entityTypes: [],
  riskLevels: [],
  sources: [],
  countries: [],
};

export function useScreening(
  sourceLevel?: 1 | 2 | 3 | 4 | 5,
  engine: 'v1' | 'v2' = 'v1',
): UseScreeningReturn {
  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<ScreeningMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [searchMode, setSearchMode] = useState<'traditional' | 'semantic' | 'auto'>('auto');
  const [performance, setPerformance] = useState<SearchPerformance | null>(null);
  const [cacheStats, setCacheStats] = useState(screeningService.getCacheStats());

  // Manual state for screening results — bypasses React Query useMutation, which gets
  // stuck in 'pending' status forever under StrictMode in dev even after onSuccess fires
  // (verified with iid=1 logs: onSuccess fired, but status='pending' on every subsequent render).
  const [searchData, setSearchData] = useState<ScreeningResponse | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const inFlightTokenRef = useRef(0);

  const runSearch = useCallback(async (request: ScreeningRequest) => {
    const token = ++inFlightTokenRef.current;
    setSearchPending(true);
    try {
      const data = await screeningService.search(
        { ...request, engine } as ScreeningRequest & { engine: 'v1' | 'v2' },
      );
      if (token !== inFlightTokenRef.current) return; // stale response, ignore
      setSearchData(data);
      setPerformance({
        executionTimeMs: data.execution_time_ms,
        fromCache: false,
        strategy: 'hybrid',
        sourcesUsed: [],
      });
      setCacheStats(screeningService.getCacheStats());
    } catch (err) {
      if (token !== inFlightTokenRef.current) return;
      console.error('[useScreening] search failed:', err);
    } finally {
      if (token === inFlightTokenRef.current) {
        setSearchPending(false);
      }
    }
  }, [engine]);

  // Optimized semantic search mutation
  const semanticSearchMutation = useMutation({
    mutationFn: ({ query, top_k = 10, min_similarity = 0.5 }: { query: string; top_k?: number; min_similarity?: number }) => 
      screeningService.semanticSearch({ query, top_k, min_similarity }),
    onSuccess: (data) => {
      setPerformance({
        executionTimeMs: data.execution_time_ms,
        fromCache: data.execution_time_ms < 50, // Likely cached if very fast
        strategy: 'semantic',
        sourcesUsed: data.fallback_used ? ['smart_search', data.fallback_used] : ['smart_search'],
      });
      setCacheStats(screeningService.getCacheStats());
    },
  });

  // Optimized suggestions mutation (respects source_level)
  const suggestionsMutation = useMutation({
    mutationFn: (q: string) => screeningService.optimizedSearch({
      query: q,
      max_results: 8,
      min_confidence: 0.5,
      source_level: sourceLevel,
    }).then(r => r.matches.map(m => ({
      entity_id: m.entity_id,
      name: m.name,
      match_score: m.score * 100,
      confidence: m.confidence,
      match_type: m.match_type,
      entity_type: m.entity_type?.toLowerCase(),
      risk_level: m.risk_level,
      sources: m.sources || [],
    } as ScreeningMatch))),
    onSuccess: (data) => {
      setSuggestions(data);
    },
  });

  // DEPRECATED: ya no hacemos search-as-you-type. La búsqueda real se ejecuta
  // SOLO al presionar Enter (executeSearch). Esto evitaba hits masivos al DB
  // (~16 connections "idle in transaction" de 14+ min cuando estaba activo).

  // Set query (solo actualiza state, NO dispara suggestions/search)
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  // Execute optimized search (auto mode)
  const executeSearch = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    setHasSearched(true);
    setQueryState(trimmedQuery);
    setSuggestions([]);
    setSearchMode('traditional');

    const request: ScreeningRequest = {
      name: trimmedQuery,
      min_confidence: 0.5,
      max_results: 50,
      source_level: sourceLevel,
      filters: {
        sources: filters.sources.length > 0 ? filters.sources : undefined,
        countries: filters.countries.length > 0 ? filters.countries : undefined,
        risk_levels: filters.riskLevels.length > 0 ? filters.riskLevels : undefined,
      },
    };

    void runSearch(request);
  }, [filters, runSearch, sourceLevel]);

  // Execute optimized semantic search
  const executeSemanticSearch = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    setHasSearched(true);
    setQueryState(trimmedQuery);
    setSuggestions([]);
    setSearchMode('semantic');

    semanticSearchMutation.mutate({
      query: trimmedQuery,
      top_k: 20,
      min_similarity: 0.4,
    });
  }, [semanticSearchMutation]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setSuggestions([]);
    setHasSearched(false);
    setPerformance(null);
    inFlightTokenRef.current++; // invalidate any in-flight search
    setSearchData(null);
    setSearchPending(false);
    semanticSearchMutation.reset();
  }, [semanticSearchMutation]);

  // Clear cache
  const clearCache = useCallback(() => {
    screeningService.clearCache();
    setCacheStats(screeningService.getCacheStats());
  }, []);

  // Update cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(screeningService.getCacheStats());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Return results based on current search mode
  const getResults = (): ScreeningMatch[] => {
    if (searchMode === 'semantic' && semanticSearchMutation.data) {
      // Transform semantic results to ScreeningMatch format
      return semanticSearchMutation.data.results.map(r => ({
        entity_id: r.entity_id,
        name: r.canonical_name,
        match_score: Math.round(r.similarity * 100),
        confidence: r.similarity,
        match_type: 'semantic' as const,
        entity_type: 'person',
        risk_level: r.risk_level,
        risk_score: r.risk_score,
        sources: r.sources,
        aliases: [],
        nationalities: [],
        matched_fields: ['semantic_embedding'],
        explanation: `Semantic similarity: ${Math.round(r.similarity * 100)}%`,
        is_current_pep: r.is_pep,
      }));
    }
    return searchData?.matches || [];
  };

  const isLoading = searchPending || semanticSearchMutation.isPending;

  return {
    query,
    suggestions,
    results: getResults(),
    isLoading,
    isSuggestionsLoading: suggestionsMutation.isPending,
    hasSearched,
    filters,
    searchMode,
    performance,
    cacheStats,
    setQuery,
    setFilters,
    setSearchMode,
    clearSearch,
    executeSearch,
    executeSemanticSearch,
    clearCache,
  };
}

export default useScreening;
