import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
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
  initialQuery?: string;
  sourceLevel?: 1 | 2 | 3 | 4 | 5;
}

export function IntelligentSearch({
  onSearch,
  onSelectResult,
  className,
  size = 'default',
  placeholder,
  autoFocus = false,
  initialQuery = '',
  sourceLevel,
}: IntelligentSearchProps) {
  const { t } = useTranslation();
  const {
    query,
    suggestions,
    isLoading,
    setQuery,
    executeSearch,
    clearSearch,
  } = useScreening(sourceLevel);

  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Initialize query from URL param
  useEffect(() => {
    if (initialQuery && !query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);
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

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Search Input Container */}
      <motion.div
        className={cn(
          'relative glass rounded-2xl transition-all duration-300',
          isFocused && 'ring-2 ring-primary/45 shadow-[0_8px_50px_-12px] shadow-primary/40',
          size === 'large' ? 'p-2' : 'p-1.5'
        )}
        initial={false}
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-2 pl-3 sm:pl-4">
          {/* Leading search / loading icon */}
          <div className="flex items-center justify-center shrink-0 text-muted-foreground">
            {isLoading ? (
              <Loader2 className={cn('animate-spin text-blue-600 dark:text-blue-400', size === 'large' ? 'w-5 h-5' : 'w-4 h-4')} />
            ) : (
              <Search className={cn(size === 'large' ? 'w-5 h-5' : 'w-4 h-4')} />
            )}
          </div>

          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? t('search.placeholder')}
            autoFocus={autoFocus}
            className={cn(
              'min-w-0 flex-1 bg-transparent border-0 pl-3 pr-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0',
              size === 'large' ? 'text-base sm:text-lg h-11 sm:h-12' : 'text-base h-10'
            )}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                clearSearch();
                inputRef.current?.focus();
              }}
              aria-label={t('search.clear')}
              className="p-2 rounded-lg hover:bg-foreground/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {/* Search action — integrated inside the field */}
          <Button
            onClick={handleSearch}
            aria-label={t('search.button')}
            className={cn(
              'btn-primary shrink-0 gap-2 rounded-xl',
              size === 'large' ? 'h-11 sm:h-12 px-4 sm:px-5' : 'h-9 px-4'
            )}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">{t('search.button')}</span>
          </Button>
        </div>
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
              <div className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">
                {t('search.suggestions')}
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
                      ? 'bg-foreground/10'
                      : 'hover:bg-foreground/5'
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
                      <span className="font-medium text-foreground truncate">
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{getEntityTypeLabel(suggestion.entity_type)}</span>
                      {suggestion.nationalities && suggestion.nationalities.length > 0 && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span>{suggestion.nationalities[0]}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('search.match', { score: Math.round(suggestion.match_score || 0) })}
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                    {(suggestion.sources || []).slice(0, 3).map((source) => (
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
            <div className="px-4 py-2 bg-foreground/5 border-t border-foreground/10 text-xs text-muted-foreground flex items-center justify-between">
              <span>{t('search.pressEnter')}</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-muted-foreground">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-muted-foreground">↓</kbd>
                {t('search.navigate')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default IntelligentSearch;
