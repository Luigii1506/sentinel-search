import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type RelationshipLevelFilter = 'DIRECT' | 'AFFILIATION' | 'INDIRECT' | undefined;
type RelationshipContextFilter = 'aml_core' | 'affiliation' | 'profile_context' | undefined;
type RelationshipPriorityFilter = 'critical' | 'high' | 'medium' | 'low' | undefined;

type FilterOption<T> = {
  key: T;
  label: string;
};

type RelationshipFiltersPanelProps = {
  referenceLike: boolean;
  showRelationshipFilters: boolean;
  setShowRelationshipFilters: (value: boolean | ((value: boolean) => boolean)) => void;
  includeContextualRelationships: boolean;
  setIncludeContextualRelationships: (value: boolean) => void;
  relLevelFilter: RelationshipLevelFilter;
  setRelLevelFilter: (value: RelationshipLevelFilter) => void;
  relContextFilter: RelationshipContextFilter;
  setRelContextFilter: (value: RelationshipContextFilter) => void;
  relPriorityFilter: RelationshipPriorityFilter;
  setRelPriorityFilter: (value: RelationshipPriorityFilter) => void;
  relSearch: string;
  setRelSearch: (value: string) => void;
  normalizedRelationshipSearch: string;
  filteredRelationshipsCount: number;
  contextFilterOptions: Array<FilterOption<RelationshipContextFilter>>;
  priorityFilterOptions: Array<FilterOption<RelationshipPriorityFilter>>;
};

export function RelationshipFiltersPanel({
  referenceLike,
  showRelationshipFilters,
  setShowRelationshipFilters,
  includeContextualRelationships,
  setIncludeContextualRelationships,
  relLevelFilter,
  setRelLevelFilter,
  relContextFilter,
  setRelContextFilter,
  relPriorityFilter,
  setRelPriorityFilter,
  relSearch,
  setRelSearch,
  normalizedRelationshipSearch,
  filteredRelationshipsCount,
  contextFilterOptions,
  priorityFilterOptions,
}: RelationshipFiltersPanelProps) {
  const { t } = useTranslation();
  const levelFilterOptions: Array<FilterOption<RelationshipLevelFilter>> = [
    { key: undefined, label: t('entity.relationships.filters.level.all') },
    { key: 'DIRECT', label: t('entity.relationships.filters.level.direct') },
    { key: 'AFFILIATION', label: t('entity.relationships.filters.level.affiliation') },
    { key: 'INDIRECT', label: t('entity.relationships.filters.level.indirect') },
  ];
  return (
    <>
      <div className="glass rounded-xl border border-foreground/10">
        <button
          type="button"
          onClick={() => setShowRelationshipFilters((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-foreground">{t('entity.relationships.filters.title')}</span>
          </div>
          {showRelationshipFilters ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showRelationshipFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-foreground/10">
            {!referenceLike && (
              <div className="flex items-start justify-between gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{t('entity.relationships.filters.includeContextual')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('entity.relationships.filters.includeContextualHint')}
                  </p>
                </div>
                <Switch
                  checked={includeContextualRelationships}
                  onCheckedChange={setIncludeContextualRelationships}
                  aria-label={t('entity.relationships.filters.includeContextualAria')}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4">
              {levelFilterOptions.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setRelLevelFilter(filter.key)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    relLevelFilter === filter.key
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      : 'bg-foreground/5 text-muted-foreground border border-foreground/10 hover:bg-foreground/10'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {contextFilterOptions.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setRelContextFilter(filter.key)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    relContextFilter === filter.key
                      ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/30'
                      : 'bg-foreground/5 text-muted-foreground border border-foreground/10 hover:bg-foreground/10'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {priorityFilterOptions.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setRelPriorityFilter(filter.key)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    relPriorityFilter === filter.key
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-foreground/5 text-muted-foreground border border-foreground/10 hover:bg-foreground/10'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {!referenceLike && includeContextualRelationships && (
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
            {t('entity.relationships.filters.viewingMixed')}
          </div>
        )}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={relSearch}
            onChange={(e) => setRelSearch(e.target.value)}
            placeholder={t('entity.relationships.filters.searchPlaceholder')}
            className="w-full bg-foreground/5 border border-foreground/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
          />
        </div>

        {normalizedRelationshipSearch && (
          <p className="text-xs text-muted-foreground">
            {t('entity.relationships.filters.matches', { count: filteredRelationshipsCount, query: relSearch.trim() })}
          </p>
        )}
      </div>
    </>
  );
}
