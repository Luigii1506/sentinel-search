import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { screeningService, type OptimizedSearchResult } from '@/services/screening';

export type SearchMode = 'auto' | 'traditional' | 'semantic';

export interface SearchPerformance {
  executionTimeMs: number;
  fromCache: boolean;
  strategy: string;
  sourcesUsed: string[];
  totalMatches: number;
}

export interface UseOptimizedSearchReturn {
  // State
  query: string;
  setQuery: (query: string) => void;
  results: OptimizedSearchResult[];
  performance: SearchPerformance | null;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  
  // Loading states
  isSearching: boolean;
  hasSearched: boolean;
  
  // Actions
  executeSearch: (overrideQuery?: string) => void;
  clearSearch: () => void;
  
  // Cache
  cacheStats: {
    size: number;
    maxSize: number;
    ttlMinutes: number;
  };
  clearCache: () => void;
  
  // History
  searchHistory: Array<{
    query: string;
    time: number;
    fromCache: boolean;
    results: number;
    timestamp: number;
  }>;
}



export function useOptimizedSearch(): UseOptimizedSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OptimizedSearchResult[]>([]);
  const [performance, setPerformance] = useState<SearchPerformance | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('auto');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Array<{
    query: string;
    time: number;
    fromCache: boolean;
    results: number;
    timestamp: number;
  }>>([]);
  const [cacheStats, setCacheStats] = useState(screeningService.getCacheStats());

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async ({ 
      searchQuery, 
      mode 
    }: { 
      searchQuery: string; 
      mode: SearchMode 
    }) => {

      return screeningService.optimizedSearch({
        query: searchQuery,
        max_results: 20,
        min_confidence: 0.6,
        use_cache: true,
        timeout_ms: mode === 'semantic' ? 3000 : 2000, // Más tiempo para semántico
      });
    },
    onSuccess: (data, variables) => {
      setResults(data.matches);
      setPerformance({
        executionTimeMs: data.execution_time_ms,
        fromCache: data.from_cache,
        strategy: data.strategy,
        sourcesUsed: data.sources_used,
        totalMatches: data.total_matches,
      });

      // Add to history
      setSearchHistory(prev => [...prev, {
        query: variables.searchQuery,
        time: data.execution_time_ms,
        fromCache: data.from_cache,
        results: data.total_matches,
        timestamp: Date.now(),
      }].slice(-20)); // Keep last 20

      // Update cache stats
      setCacheStats(screeningService.getCacheStats());
    },
  });

  const executeSearch = useCallback((overrideQuery?: string) => {
    const searchQuery = overrideQuery || query;
    const trimmed = searchQuery.trim();
    
    if (!trimmed || trimmed.length < 2) return;
    
    setHasSearched(true);
    searchMutation.mutate({ searchQuery: trimmed, mode: searchMode });
  }, [query, searchMode, searchMutation]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setPerformance(null);
    setHasSearched(false);
    searchMutation.reset();
  }, [searchMutation]);

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

  return {
    query,
    setQuery,
    results,
    performance,
    searchMode,
    setSearchMode,
    isSearching: searchMutation.isPending,
    hasSearched,
    executeSearch,
    clearSearch,
    cacheStats,
    clearCache,
    searchHistory,
  };
}

export default useOptimizedSearch;
