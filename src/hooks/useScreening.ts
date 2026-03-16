import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { screeningService } from '@/services/screening';
import type { ScreeningRequest, ScreeningMatch } from '@/types/api';

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

// Simple debounce implementation
function debounce<T extends (arg: string) => void>(func: T, wait: number): (arg: string) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (arg: string) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(arg), wait);
  };
}

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

export function useScreening(sourceLevel?: 1 | 2 | 3 | 4 | 5): UseScreeningReturn {
  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<ScreeningMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [searchMode, setSearchMode] = useState<'traditional' | 'semantic' | 'auto'>('auto');
  const [performance, setPerformance] = useState<SearchPerformance | null>(null);
  const [cacheStats, setCacheStats] = useState(screeningService.getCacheStats());

  // Optimized search mutation (Smart Search v3.0)
  const searchMutation = useMutation({
    mutationFn: (request: ScreeningRequest) => screeningService.search(request),
    onSuccess: (data) => {
      setPerformance({
        executionTimeMs: data.execution_time_ms,
        fromCache: false, // Will be set by service
        strategy: 'hybrid',
        sourcesUsed: [],
      });
      // Update cache stats after search
      setCacheStats(screeningService.getCacheStats());
    },
  });

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

  // Fetch suggestions from API (optimized)
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    suggestionsMutation.mutate(trimmedQuery);
  }, [suggestionsMutation]);

  // Debounced suggestion fetch
  const debouncedFetchSuggestions = useRef(
    debounce((q: string) => fetchSuggestions(q), 150) // Faster debounce (150ms vs 200ms)
  ).current;

  // Set query with suggestions
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    debouncedFetchSuggestions(newQuery);
  }, [debouncedFetchSuggestions]);

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

    searchMutation.mutate(request);
  }, [filters, searchMutation, sourceLevel]);

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
    searchMutation.reset();
    semanticSearchMutation.reset();
  }, [searchMutation, semanticSearchMutation]);

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
    return searchMutation.data?.matches || [];
  };

  return {
    query,
    suggestions,
    results: getResults(),
    isLoading: searchMutation.isPending || semanticSearchMutation.isPending,
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
