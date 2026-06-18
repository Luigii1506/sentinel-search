import { useDeferredValue, useMemo } from 'react';
import { Building2, FileText, Landmark, Network, RefreshCw, Search, Share2, Shield, Users } from 'lucide-react';
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
  const deferredRelSearch = useDeferredValue(relSearch);

  const sectionConfig = useMemo<RelationshipSectionConfig[]>(() => (
    referenceLike
      ? [
          {
            key: 'people',
            label: 'Personas vinculadas',
            icon: Users,
            types: [],
            color: 'text-blue-400',
          },
          {
            key: 'organizations',
            label: 'Organizaciones vinculadas',
            icon: Building2,
            types: [],
            color: 'text-cyan-400',
          },
          {
            key: 'other',
            label: 'Otras conexiones',
            icon: Share2,
            types: [],
            color: 'text-gray-400',
          },
        ]
      : [
          {
            key: 'family',
            label: 'Familiares',
            icon: Users,
            types: ['family'],
            color: 'text-purple-400',
          },
          {
            key: 'associates',
            label: 'Asociados',
            icon: Network,
            types: ['associate'],
            color: 'text-blue-400',
          },
          {
            key: 'corporate',
            label: 'Propiedad y Corporativo',
            icon: Building2,
            types: ['beneficial_ownership', 'corporate', 'directorship', 'membership', 'employment'],
            color: 'text-cyan-400',
          },
          {
            key: 'political',
            label: 'Política y Representación',
            icon: Landmark,
            types: ['political', 'representation', 'occupancy'],
            color: 'text-amber-400',
          },
          {
            key: 'sanctions',
            label: 'Sanciones',
            icon: Shield,
            types: ['sanction'],
            color: 'text-red-400',
          },
          {
            key: 'profile',
            label: 'Perfil',
            icon: FileText,
            types: ['professional'],
            color: 'text-violet-400',
          },
          {
            key: 'other',
            label: 'Otras Relaciones',
            icon: Share2,
            types: [],
            color: 'text-gray-400',
          },
        ]
  ), [referenceLike]);

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
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Cargando relaciones...</p>
      </div>
    );
  }

  if (relationshipsList.total === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Relaciones</h3>
        <p className="text-gray-400">
          {hasDetectedOrContextualRelationships
            ? 'Las relaciones detectadas para esta entidad son contextuales y quedaron ocultas por la vista AML priorizada.'
            : 'No se encontraron relaciones para esta entidad.'}
        </p>
        {hasDetectedOrContextualRelationships ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-gray-500">
              Se detectaron {totalDetectedRelationships} vínculos en total, pero no hay relaciones priorizadas para esta vista.
            </p>
            {!referenceLike && !includeContextualRelationships ? (
              <Button
                variant="outline"
                onClick={() => setIncludeContextualRelationships(true)}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Mostrar relaciones contextuales
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
          <Search className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">Sin coincidencias</h3>
          <p className="text-gray-400">No hay relaciones que coincidan con ese filtro de búsqueda.</p>
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
