import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Filter, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useScreening } from '@/hooks/useScreening';
import type { ScreeningMatch } from '@/types/api';
import {
  getRiskColor,
  getRiskBgColor,
  getEntityTypeLabel,
  getSourceBadgeClass,
} from '@/lib/utils';

interface IntelligentSearchProps {
  onSearch?: (query: string) => void;
  onSelectResult?: (entityId: string) => void;
  className?: string;
  size?: 'default' | 'large';
  placeholder?: string;
  autoFocus?: boolean;
}

const entityTypeFilters = [
  { value: 'person', label: 'Personas' },
  { value: 'company', label: 'Empresas' },
  { value: 'vessel', label: 'Embarcaciones' },
  { value: 'aircraft', label: 'Aeronaves' },
  { value: 'organization', label: 'Organizaciones' },
];

const riskLevelFilters = [
  { value: 'critical', label: 'Crítico' },
  { value: 'high', label: 'Alto' },
  { value: 'medium', label: 'Medio' },
  { value: 'low', label: 'Bajo' },
];

export function IntelligentSearch({
  onSearch,
  onSelectResult,
  className,
  size = 'default',
  placeholder = 'Buscar personas, empresas, o identificadores...',
  autoFocus = false,
}: IntelligentSearchProps) {
  const {
    query,
    suggestions,
    isLoading,
    filters,
    setQuery,
    setFilters,
    executeSearch,
    clearSearch,
  } = useScreening();

  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else if (query.trim()) {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      executeSearch(query);
      onSearch?.(query);
      setIsFocused(false);
    }
  };

  const handleSelectSuggestion = (suggestion: ScreeningMatch) => {
    setQuery(suggestion.name);
    onSelectResult?.(suggestion.entity_id);
    setIsFocused(false);
  };

  const toggleEntityTypeFilter = (type: string) => {
    const newTypes = filters.entityTypes.includes(type)
      ? filters.entityTypes.filter((t) => t !== type)
      : [...filters.entityTypes, type];
    setFilters({ ...filters, entityTypes: newTypes });
  };

  const toggleRiskLevelFilter = (level: string) => {
    const newLevels = filters.riskLevels.includes(level)
      ? filters.riskLevels.filter((l) => l !== level)
      : [...filters.riskLevels, level];
    setFilters({ ...filters, riskLevels: newLevels });
  };

  const activeFilterCount = filters.entityTypes.length + filters.riskLevels.length;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Search Input Container */}
      <motion.div
        className={cn(
          'relative glass rounded-2xl transition-all duration-300',
          isFocused && 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10',
          size === 'large' ? 'p-2' : 'p-1.5'
        )}
        initial={false}
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-3">
          {/* Search Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* Input */}
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              'flex-1 bg-transparent border-0 text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0',
              size === 'large' ? 'text-lg h-12' : 'text-base h-10'
            )}
          />

          {/* Clear Button */}
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                clearSearch();
                inputRef.current?.focus();
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}

          {/* Filter Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'gap-2 rounded-xl hover:bg-white/10',
              showFilters && 'bg-white/10'
            )}
          >
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-blue-500 text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            className={cn(
              'btn-primary gap-2 rounded-xl',
              size === 'large' ? 'px-6 py-3' : 'px-4 py-2'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Buscar
          </Button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-2 border-t border-white/10 mt-3 space-y-4">
                {/* Entity Types */}
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                    Tipo de Entidad
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {entityTypeFilters.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => toggleEntityTypeFilter(value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border',
                          filters.entityTypes.includes(value)
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Levels */}
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                    Nivel de Riesgo
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {riskLevelFilters.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => toggleRiskLevelFilter(value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border',
                          filters.riskLevels.includes(value)
                            ? getRiskBgColor(value)
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {isFocused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden z-50 shadow-2xl"
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">
                Sugerencias
              </div>
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion.entity_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-all duration-200 flex items-start gap-3',
                    selectedIndex === index
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  )}
                >
                  {/* Risk Indicator */}
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getRiskColor(suggestion.risk_level) }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white truncate">
                        {suggestion.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs capitalize',
                          getRiskBgColor(suggestion.risk_level)
                        )}
                      >
                        {suggestion.risk_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{getEntityTypeLabel(suggestion.entity_type)}</span>
                      {suggestion.nationalities && suggestion.nationalities.length > 0 && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{suggestion.nationalities[0]}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(suggestion.match_score)}% coincidencia
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                    {suggestion.sources.slice(0, 3).map((source) => (
                      <span
                        key={source}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border',
                          getSourceBadgeClass(source)
                        )}
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-xs text-gray-500 flex items-center justify-between">
              <span>Presiona Enter para buscar</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400">↓</kbd>
                para navegar
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default IntelligentSearch;
