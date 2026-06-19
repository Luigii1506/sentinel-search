import { useDeferredValue, useMemo } from 'react';
import { Building2, FileText, Landmark, Network, RefreshCw, Search, Share2, Shield, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { RelationshipSummaryHeader } from '@/components/entity/RelationshipSummaryHeader';
import { RelationshipFiltersPanel } from '@/components/entity/RelationshipFiltersPanel';
import { RelationshipSectionsList } from '@/components/entity/RelationshipSectionsList';
import {
  deriveRelationshipViewModel,
  relationshipContextFilterOptions,
  relationshipPriorityFilterOptions,
  type RelationshipContextFilter,
  type RelationshipLevelFilter,
  type RelationshipPriorityFilter,
  type RelationshipSectionConfig,
} from '@/components/entity/relationshipViewModel';
import {
  entityTypeLabelExtended,
  getReferenceRelationshipSection,
  getReferenceRelationshipSortScore,
  getReferenceRelationshipSummary,
  getRelationshipSubgroup,
  getRelationshipSubgroupPriority,
  translateSubtype,
} from '@/components/entity/relationshipHelpers';

type EntityRelationshipsTabProps = {
  relationshipsList: { total: number; relationships?: any[] } | null;
  totalDetectedRelationships: number;
  referenceLike: boolean;
  includeContextualRelationships: boolean;
  setIncludeContextualRelationships: (value: boolean) => void;
  amlVisibleRelationships: number;
  contextualRelationships: number;
  prioritizedRelationshipCounts: Record<string, number>;
  contextualRelationshipCounts: Record<string, number>;
  showRelationshipFilters: boolean;
  setShowRelationshipFilters: (value: boolean | ((value: boolean) => boolean)) => void;
  relLevelFilter: RelationshipLevelFilter;
  setRelLevelFilter: (value: RelationshipLevelFilter) => void;
  relContextFilter: RelationshipContextFilter;
  setRelContextFilter: (value: RelationshipContextFilter) => void;
  relPriorityFilter: RelationshipPriorityFilter;
  setRelPriorityFilter: (value: RelationshipPriorityFilter) => void;
  relSearch: string;
  setRelSearch: (value: string) => void;
  collapsedRelationshipSections: Record<string, boolean>;
  setCollapsedRelationshipSections: (value: Record<string, boolean> | ((value: Record<string, boolean>) => Record<string, boolean>)) => void;
  countryNames: Record<string, string>;
  onNavigateEntity: (entityId: string) => void;
  hasDetectedOrContextualRelationships: boolean;
};

export function EntityRelationshipsTab({
  relationshipsList,
  totalDetectedRelationships,
  referenceLike,
  includeContextualRelationships,
  setIncludeContextualRelationships,
  amlVisibleRelationships,
  contextualRelationships,
  prioritizedRelationshipCounts,
  contextualRelationshipCounts,
  showRelationshipFilters,
  setShowRelationshipFilters,
  relLevelFilter,
  setRelLevelFilter,
  relContextFilter,
  setRelContextFilter,
  relPriorityFilter,
  setRelPriorityFilter,
  relSearch,
  setRelSearch,
  collapsedRelationshipSections,
  setCollapsedRelationshipSections,
  countryNames,
  onNavigateEntity,
  hasDetectedOrContextualRelationships,
}: EntityRelationshipsTabProps) {
  const { t } = useTranslation();
  const deferredRelSearch = useDeferredValue(relSearch);

  const sectionConfig = useMemo<RelationshipSectionConfig[]>(() => (
    referenceLike
      ? [
          {
            key: 'people',
            label: t('entity.relationships.sections.people'),
            icon: Users,
            types: [],
            color: 'text-blue-600 dark:text-blue-400',
          },
          {
            key: 'organizations',
            label: t('entity.relationships.sections.organizations'),
            icon: Building2,
            types: [],
            color: 'text-cyan-700 dark:text-cyan-400',
          },
          {
            key: 'other',
            label: t('entity.relationships.sections.other'),
            icon: Share2,
            types: [],
            color: 'text-muted-foreground',
          },
        ]
      : [
          {
            key: 'family',
            label: t('entity.relationships.sections.family'),
            icon: Users,
            types: ['family'],
            color: 'text-purple-600 dark:text-purple-400',
          },
          {
            key: 'associates',
            label: t('entity.relationships.sections.associates'),
            icon: Network,
            types: ['associate'],
            color: 'text-blue-600 dark:text-blue-400',
          },
          {
            key: 'corporate',
            label: t('entity.relationships.sections.corporate'),
            icon: Building2,
            types: ['beneficial_ownership', 'corporate', 'directorship', 'membership', 'employment'],
            color: 'text-cyan-700 dark:text-cyan-400',
          },
          {
            key: 'political',
            label: t('entity.relationships.sections.political'),
            icon: Landmark,
            types: ['political', 'representation', 'occupancy'],
            color: 'text-amber-700 dark:text-amber-400',
          },
          {
            key: 'sanctions',
            label: t('entity.relationships.sections.sanctions'),
            icon: Shield,
            types: ['sanction'],
            color: 'text-red-600 dark:text-red-400',
          },
          {
            key: 'profile',
            label: t('entity.relationships.sections.profile'),
            icon: FileText,
            types: ['professional'],
            color: 'text-violet-600 dark:text-violet-400',
          },
          {
            key: 'other',
            label: t('entity.relationships.sections.otherRelations'),
            icon: Share2,
            types: [],
            color: 'text-muted-foreground',
          },
        ]
  ), [referenceLike, t]);

  const {
    normalizedRelationshipSearch,
    filteredRelationships,
    groupedByType,
    resolvedRelationshipCount,
    unresolvedRelationshipCount,
    contextualVisibleRelationshipCount,
  } = useMemo(
    () => deriveRelationshipViewModel({
      relationships: relationshipsList?.relationships || [],
      relSearch: deferredRelSearch,
      referenceLike,
      sectionConfig,
      getReferenceRelationshipSection,
      getReferenceRelationshipSortScore,
    }),
    [deferredRelSearch, referenceLike, relationshipsList?.relationships, sectionConfig]
  );

  if (!relationshipsList) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{t('entity.relationships.loading')}</p>
      </div>
    );
  }

  if (relationshipsList.total === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-medium text-foreground mb-2">{t('entity.relationships.empty.title')}</h3>
        <p className="text-muted-foreground">
          {hasDetectedOrContextualRelationships
            ? t('entity.relationships.empty.contextualHidden')
            : t('entity.relationships.empty.none')}
        </p>
        {hasDetectedOrContextualRelationships ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('entity.relationships.empty.detectedTotal', { count: totalDetectedRelationships })}
            </p>
            {!referenceLike && !includeContextualRelationships ? (
              <Button
                variant="outline"
                onClick={() => setIncludeContextualRelationships(true)}
                className="border-foreground/10 bg-foreground/5 text-foreground hover:bg-foreground/10"
              >
                {t('entity.relationships.empty.showContextual')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RelationshipSummaryHeader
        amlVisibleRelationships={amlVisibleRelationships}
        totalDetectedRelationships={totalDetectedRelationships}
        resolvedRelationshipCount={resolvedRelationshipCount}
        unresolvedRelationshipCount={unresolvedRelationshipCount}
        contextualRelationships={contextualRelationships}
        contextualVisibleRelationshipCount={contextualVisibleRelationshipCount}
        includeContextualRelationships={includeContextualRelationships}
        referenceLike={referenceLike}
        prioritizedRelationshipCounts={prioritizedRelationshipCounts}
        contextualRelationshipCounts={contextualRelationshipCounts}
      />

      <RelationshipFiltersPanel
        referenceLike={referenceLike}
        showRelationshipFilters={showRelationshipFilters}
        setShowRelationshipFilters={setShowRelationshipFilters}
        includeContextualRelationships={includeContextualRelationships}
        setIncludeContextualRelationships={setIncludeContextualRelationships}
        relLevelFilter={relLevelFilter}
        setRelLevelFilter={setRelLevelFilter}
        relContextFilter={relContextFilter}
        setRelContextFilter={setRelContextFilter}
        relPriorityFilter={relPriorityFilter}
        setRelPriorityFilter={setRelPriorityFilter}
        relSearch={relSearch}
        setRelSearch={setRelSearch}
        normalizedRelationshipSearch={normalizedRelationshipSearch}
        filteredRelationshipsCount={filteredRelationships.length}
        contextFilterOptions={relationshipContextFilterOptions}
        priorityFilterOptions={relationshipPriorityFilterOptions}
      />

      {filteredRelationships.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">{t('entity.relationships.noMatches.title')}</h3>
          <p className="text-muted-foreground">{t('entity.relationships.noMatches.description')}</p>
        </div>
      ) : null}

      <RelationshipSectionsList
        referenceLike={referenceLike}
        sectionConfig={sectionConfig}
        groupedByType={groupedByType}
        collapsedRelationshipSections={collapsedRelationshipSections}
        setCollapsedRelationshipSections={setCollapsedRelationshipSections}
        getRelationshipSubgroup={getRelationshipSubgroup}
        getRelationshipSubgroupPriority={getRelationshipSubgroupPriority}
        getReferenceRelationshipSummary={getReferenceRelationshipSummary}
        translateSubtype={translateSubtype}
        entityTypeLabelExtended={entityTypeLabelExtended}
        countryNames={countryNames}
        onNavigateEntity={onNavigateEntity}
      />
    </div>
  );
}
