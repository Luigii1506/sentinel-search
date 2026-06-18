import type { ComponentType } from 'react';

export type RelationshipContextFilter = 'aml_core' | 'affiliation' | 'profile_context' | undefined;
export type RelationshipPriorityFilter = 'critical' | 'high' | 'medium' | 'low' | undefined;
export type RelationshipLevelFilter = 'DIRECT' | 'AFFILIATION' | 'INDIRECT' | undefined;

export type RelationshipSectionConfig = {
  key: string;
  label: string;
  types: string[];
  color: string;
  icon: ComponentType<{ className?: string }>;
};

export type RelationshipLike = {
  related_entity_name: string;
  related_entity_is_pep?: boolean;
  related_entity_risk_score?: number;
  related_entity_type?: string;
  related_entity_sources?: string[];
  related_entity_countries?: string[];
  relationship_strength?: number;
  type: string;
  subtype?: string;
  description?: string;
  source?: string;
  relationship_level?: string;
  context_category?: string;
  is_resolved?: boolean;
};

export const relationshipContextFilterOptions: Array<{ key: RelationshipContextFilter; label: string }> = [
  { key: undefined, label: 'Todas las vistas' },
  { key: 'aml_core', label: 'AML Core' },
  { key: 'affiliation', label: 'Afiliaciones' },
  { key: 'profile_context', label: 'Perfil' },
];

export const relationshipPriorityFilterOptions: Array<{ key: RelationshipPriorityFilter; label: string }> = [
  { key: undefined, label: 'Todas las prioridades' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export function deriveRelationshipViewModel<T extends RelationshipLike>(args: {
  relationships: T[];
  relSearch: string;
  referenceLike: boolean;
  sectionConfig: RelationshipSectionConfig[];
  getReferenceRelationshipSection: (rel: T) => string;
  getReferenceRelationshipSortScore: (rel: T) => number;
}) {
  const {
    relationships,
    relSearch,
    referenceLike,
    sectionConfig,
    getReferenceRelationshipSection,
    getReferenceRelationshipSortScore,
  } = args;

  const normalizedRelationshipSearch = relSearch.trim().toLowerCase();
  const filteredRelationships = normalizedRelationshipSearch
    ? relationships.filter((rel) => {
        const searchableParts = [
          rel.related_entity_name,
          rel.type,
          rel.subtype,
          rel.description,
          rel.source,
          rel.relationship_level,
          rel.context_category,
          rel.related_entity_type,
          ...(rel.related_entity_sources || []),
          ...(rel.related_entity_countries || []),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return searchableParts.some((value) => value.includes(normalizedRelationshipSearch));
      })
    : relationships;

  const groupedByType: Record<string, T[]> = {};
  for (const section of sectionConfig) {
    groupedByType[section.key] = [];
  }

  const resolvedRelationshipCount = filteredRelationships.filter((rel) => rel.is_resolved).length;
  const unresolvedRelationshipCount = filteredRelationships.length - resolvedRelationshipCount;
  const contextualVisibleRelationshipCount = filteredRelationships.filter(
    (rel) => rel.context_category === 'profile_context' || rel.context_category === 'unknown'
  ).length;

  for (const rel of filteredRelationships) {
    const typeSection = referenceLike
      ? sectionConfig.find((section) => section.key === getReferenceRelationshipSection(rel)) || sectionConfig[sectionConfig.length - 1]
      : sectionConfig.find((section) => section.types.includes(rel.type)) || sectionConfig[sectionConfig.length - 1];
    groupedByType[typeSection.key].push(rel);
  }

  for (const key of Object.keys(groupedByType)) {
    groupedByType[key].sort((a, b) => {
      if (referenceLike) {
        return getReferenceRelationshipSortScore(b) - getReferenceRelationshipSortScore(a)
          || a.related_entity_name.localeCompare(b.related_entity_name);
      }
      return (b.relationship_strength || 0) - (a.relationship_strength || 0)
        || (b.related_entity_risk_score || 0) - (a.related_entity_risk_score || 0)
        || Number(Boolean(b.related_entity_is_pep)) - Number(Boolean(a.related_entity_is_pep))
        || a.related_entity_name.localeCompare(b.related_entity_name);
    });
  }

  return {
    normalizedRelationshipSearch,
    filteredRelationships,
    groupedByType,
    resolvedRelationshipCount,
    unresolvedRelationshipCount,
    contextualVisibleRelationshipCount,
  };
}
