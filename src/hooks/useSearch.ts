import { useState, useCallback, useRef } from 'react';
import type { SearchSuggestion, SearchFilters, SearchResult } from '@/types';
import { mockSearchSuggestions, mockEntities } from '@/data/mockData';

// Simple debounce implementation
function debounce<T extends (arg: string) => void>(func: T, wait: number): (arg: string) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (arg: string) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(arg), wait);
  };
}

interface UseSearchReturn {
  query: string;
  suggestions: SearchSuggestion[];
  results: SearchResult[];
  isLoading: boolean;
  hasSearched: boolean;
  filters: SearchFilters;
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
  executeSearch: (searchQuery: string) => void;
}

const defaultFilters: SearchFilters = {
  entityTypes: [],
  riskLevels: [],
  sources: [],
  countries: [],
};

export function useSearch(): UseSearchReturn {
  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  // Simulate API call for suggestions
  const fetchSuggestions = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const normalizedQuery = searchQuery.toLowerCase();
      
      const filtered = mockSearchSuggestions.filter(suggestion => {
        const nameMatch = suggestion.name.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = suggestion.description?.toLowerCase().includes(normalizedQuery);
        const nationalityMatch = suggestion.nationality?.toLowerCase().includes(normalizedQuery);
        return nameMatch || descriptionMatch || nationalityMatch;
      });

      // Sort by match score
      const sorted = filtered.sort((a, b) => b.matchScore - a.matchScore);
      
      setSuggestions(sorted.slice(0, 8));
      setIsLoading(false);
    }, 150);
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

    setIsLoading(true);
    setHasSearched(true);
    setQueryState(searchQuery);
    setSuggestions([]);

    // Simulate network delay
    setTimeout(() => {
      const normalizedQuery = searchQuery.toLowerCase();
      
      const searchResults: SearchResult[] = mockEntities
        .filter(entity => {
          // Apply filters
          if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(entity.type)) {
            return false;
          }
          if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(entity.riskLevel)) {
            return false;
          }
          if (filters.sources.length > 0 && !entity.dataSources.some(s => filters.sources.includes(s))) {
            return false;
          }

          // Search in name and aliases
          const nameMatch = entity.primaryName.toLowerCase().includes(normalizedQuery);
          const aliasMatch = entity.aliases.some(a => a.name.toLowerCase().includes(normalizedQuery));
          const idMatch = entity.identifications.some(i => i.number.toLowerCase().includes(normalizedQuery));
          
          return nameMatch || aliasMatch || idMatch;
        })
        .map(entity => {
          // Calculate match score
          let matchScore = 0;
          let matchType: SearchResult['matchType'] = 'partial';
          let matchedField = '';

          if (entity.primaryName.toLowerCase() === normalizedQuery) {
            matchScore = 100;
            matchType = 'exact';
            matchedField = 'primaryName';
          } else if (entity.primaryName.toLowerCase().includes(normalizedQuery)) {
            matchScore = 85;
            matchType = 'fuzzy';
            matchedField = 'primaryName';
          } else if (entity.aliases.some(a => a.name.toLowerCase() === normalizedQuery)) {
            matchScore = 90;
            matchType = 'alias';
            matchedField = 'alias';
          } else if (entity.aliases.some(a => a.name.toLowerCase().includes(normalizedQuery))) {
            matchScore = 75;
            matchType = 'alias';
            matchedField = 'alias';
          } else {
            matchScore = 60;
            matchType = 'partial';
            matchedField = 'identification';
          }

          // Create highlighted name
          const regex = new RegExp(`(${normalizedQuery})`, 'gi');
          const highlightedName = entity.primaryName.replace(
            regex,
            '<mark class="bg-blue-500/30 text-white px-1 rounded">$1</mark>'
          );

          return {
            entity,
            matchScore,
            matchType,
            matchedField,
            highlightedName,
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      setResults(searchResults);
      setIsLoading(false);
    }, 400);
  }, [filters]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setSuggestions([]);
    setResults([]);
    setHasSearched(false);
    setIsLoading(false);
  }, []);

  return {
    query,
    suggestions,
    results,
    isLoading,
    hasSearched,
    filters,
    setQuery,
    setFilters,
    clearSearch,
    executeSearch,
  };
}
