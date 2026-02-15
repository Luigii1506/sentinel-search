import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { screeningService } from '@/services/screening';
import type { ScreeningRequest, ScreeningMatch } from '@/types/api';

export interface SearchFilters {
  entityTypes: string[];
  riskLevels: string[];
  sources: string[];
  countries: string[];
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
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
  executeSearch: (searchQuery: string) => void;
  searchMutation: ReturnType<typeof useMutation<any, Error, ScreeningRequest, unknown>>;
}

const defaultFilters: SearchFilters = {
  entityTypes: [],
  riskLevels: [],
  sources: [],
  countries: [],
};

export function useScreening(): UseScreeningReturn {
  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<ScreeningMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: (request: ScreeningRequest) => screeningService.search(request),
  });

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const data = await screeningService.getSuggestions(searchQuery, 8);
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // Debounced suggestion fetch
  const debouncedFetchSuggestions = useRef(
    debounce((q: string) => fetchSuggestions(q), 200)
  ).current;

  // Set query with suggestions
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    debouncedFetchSuggestions(newQuery);
  }, [debouncedFetchSuggestions]);

  // Execute full search
  const executeSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    setQueryState(searchQuery);
    setSuggestions([]);

    const request: ScreeningRequest = {
      name: searchQuery,
      min_confidence: 0.5,
      max_results: 50,
      filters: {
        sources: filters.sources.length > 0 ? filters.sources : undefined,
        countries: filters.countries.length > 0 ? filters.countries : undefined,
        risk_levels: filters.riskLevels.length > 0 ? filters.riskLevels : undefined,
      },
    };

    searchMutation.mutate(request);
  }, [filters, searchMutation]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setSuggestions([]);
    setHasSearched(false);
    searchMutation.reset();
  }, [searchMutation]);

  return {
    query,
    suggestions,
    results: searchMutation.data?.matches || [],
    isLoading: searchMutation.isPending,
    isSuggestionsLoading: false, // Could add loading state if needed
    hasSearched,
    filters,
    setQuery,
    setFilters,
    clearSearch,
    executeSearch,
    searchMutation,
  };
}

export default useScreening;
