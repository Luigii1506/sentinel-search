import { Calendar, ChevronDown, ChevronRight, Database, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatDate, humanizeEntityName } from '@/lib/utils';
import { formatSourceName } from '@/components/entity/entityProfileUtils';

type RelationshipSection = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

type RelationshipSectionsListProps = {
  referenceLike: boolean;
  sectionConfig: RelationshipSection[];
  groupedByType: Record<string, any[]>;
  collapsedRelationshipSections: Record<string, boolean>;
  setCollapsedRelationshipSections: (value: Record<string, boolean> | ((value: Record<string, boolean>) => Record<string, boolean>)) => void;
  getRelationshipSubgroup: (rel: any, sectionKey: string, referenceLike: boolean) => string;
  getRelationshipSubgroupPriority: (sectionKey: string, subgroupLabel: string, referenceLike: boolean) => number;
  getReferenceRelationshipSummary: (rel: any) => string | null;
  translateSubtype: (subtype?: string | null) => string;
  entityTypeLabelExtended: Record<string, string>;
  countryNames: Record<string, string>;
  onNavigateEntity: (entityId: string) => void;
};

const priorityBadgeStyles: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  low: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export function RelationshipSectionsList({
  referenceLike,
  sectionConfig,
  groupedByType,
  collapsedRelationshipSections,
  setCollapsedRelationshipSections,
  getRelationshipSubgroup,
  getRelationshipSubgroupPriority,
  getReferenceRelationshipSummary,
  translateSubtype,
  entityTypeLabelExtended,
  countryNames,
  onNavigateEntity,
}: RelationshipSectionsListProps) {
  return (
    <>
      {sectionConfig.map((section) => {
        const rels = groupedByType[section.key];
        if (!rels || rels.length === 0) return null;
        const SectionIcon = section.icon;
        const subgroupMap = rels.reduce<Record<string, typeof rels>>((acc, rel) => {
          const subgroup = getRelationshipSubgroup(rel, section.key, referenceLike);
          acc[subgroup] = acc[subgroup] || [];
          acc[subgroup].push(rel);
          return acc;
        }, {});
        const subgroupEntries = Object.entries(subgroupMap);
        const showSubgroups = subgroupEntries.length > 1;
        const relationshipGroups: Array<{ label: string; items: typeof rels }> = showSubgroups
          ? subgroupEntries
              .map(([label, items]) => ({ label, items }))
              .sort((a, b) => {
                const priorityDiff =
                  getRelationshipSubgroupPriority(section.key, a.label, referenceLike) -
                  getRelationshipSubgroupPriority(section.key, b.label, referenceLike);
                if (priorityDiff !== 0) return priorityDiff;
                return a.label.localeCompare(b.label);
              })
          : [{ label: '', items: rels }];

        return (
          <div key={section.key} className="space-y-3">
            <button
              type="button"
              onClick={() =>
                setCollapsedRelationshipSections((prev) => ({
                  ...prev,
                  [section.key]: !prev[section.key],
                }))
              }
              className="w-full flex items-center justify-between gap-3 pb-2 border-b border-foreground/10 text-left"
            >
              <div className="flex items-center gap-2">
                {collapsedRelationshipSections[section.key] ? (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
                <SectionIcon className={cn('w-5 h-5', section.color)} />
                <h3 className={cn('text-lg font-semibold', section.color)}>{section.label}</h3>
              </div>
            </button>

            {!collapsedRelationshipSections[section.key] && (
              <div className="space-y-4">
                {relationshipGroups.map(({ label: subgroupLabel, items: subgroupRels }) => (
                  <div key={`${section.key}-${subgroupLabel || 'all'}`} className="space-y-3">
                    {showSubgroups && (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          {subgroupLabel}
                        </span>
                        <div className="h-px flex-1 bg-foreground/10" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subgroupRels.map((rel, i) => {
                        const riskColor =
                          rel.related_entity_risk_level === 'critical'
                            ? 'text-red-400'
                            : rel.related_entity_risk_level === 'high'
                              ? 'text-orange-400'
                              : rel.related_entity_risk_level === 'medium'
                                ? 'text-yellow-400'
                                : 'text-gray-400';
                        const riskBg =
                          rel.related_entity_risk_level === 'critical'
                            ? 'bg-red-500/10 border-red-500/20'
                            : rel.related_entity_risk_level === 'high'
                              ? 'bg-orange-500/10 border-orange-500/20'
                              : rel.related_entity_risk_level === 'medium'
                                ? 'bg-yellow-500/10 border-yellow-500/20'
                                : 'bg-gray-500/10 border-gray-500/20';
                        const entityTypeKey = (rel.related_entity_type || '').toLowerCase();
                        const entityTypeLabel = entityTypeLabelExtended[entityTypeKey] || null;
                        const relCountries = (rel.related_entity_countries || []).slice(0, 3);
                        const sourceName = rel.source ? formatSourceName(rel.source) : null;
                        const referenceSummary = referenceLike ? getReferenceRelationshipSummary(rel) : null;
                        const cleanDescription =
                          rel.description &&
                          !rel.description.includes('→') &&
                          !rel.description.includes('—') &&
                          !rel.description.toLowerCase().startsWith('wikidata ')
                            ? rel.description
                            : null;

                        return (
                          <motion.div
                            key={`${section.key}-${i}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="glass rounded-lg p-4 hover:bg-foreground/[0.04] transition-colors"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                {rel.related_entity_id ? (
                                  <button
                                    onClick={() => onNavigateEntity(rel.related_entity_id)}
                                    className="text-foreground font-medium hover:text-blue-400 transition-colors text-left cursor-pointer break-words block max-w-full"
                                  >
                                    {humanizeEntityName(rel.related_entity_name)}
                                  </button>
                                ) : (
                                  <p className="text-foreground font-medium break-words">
                                    {humanizeEntityName(rel.related_entity_name)}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {rel.aml_priority && (
                                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium uppercase', priorityBadgeStyles[rel.aml_priority])}>
                                    {rel.aml_priority}
                                  </span>
                                )}
                                {rel.is_resolved ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    Resuelta
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    Sin resolver
                                  </span>
                                )}
                                {(rel.context_category === 'profile_context' || rel.context_category === 'unknown') && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-300 border border-slate-500/20">
                                    Contextual
                                  </span>
                                )}
                                {rel.related_entity_is_pep && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                    PEP
                                  </span>
                                )}
                                {rel.related_entity_risk_score != null && rel.related_entity_risk_score >= 40 && (
                                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', riskBg, riskColor)}>
                                    {rel.related_entity_risk_level === 'critical'
                                      ? 'Crítico'
                                      : rel.related_entity_risk_level === 'high'
                                        ? 'Alto'
                                        : 'Medio'}{' '}
                                    {rel.related_entity_risk_score}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-sm mb-2">
                              {referenceSummary ? (
                                <span className={section.color}>{referenceSummary}</span>
                              ) : rel.subtype ? (
                                <span className={section.color}>{translateSubtype(rel.subtype)}</span>
                              ) : (
                                <span className="text-gray-500 text-xs">
                                  {referenceLike
                                    ? 'Vínculo contextual'
                                    : section.key === 'family'
                                      ? 'Familiar'
                                      : section.key === 'associates'
                                        ? 'Asociado'
                                        : section.key === 'corporate'
                                          ? 'Relación corporativa'
                                          : section.key === 'political'
                                            ? 'Relación política'
                                            : section.key === 'sanctions'
                                              ? 'Relación sancionatoria'
                                              : section.key === 'profile'
                                                ? 'Contexto de perfil'
                                                : 'Relacionado'}
                                </span>
                              )}
                              {entityTypeLabel && (
                                <>
                                  <span className="text-gray-600 text-xs">·</span>
                                  <span className="text-xs text-gray-500">{entityTypeLabel}</span>
                                </>
                              )}
                              {!referenceLike && rel.context_category && (
                                <>
                                  <span className="text-gray-600 text-xs">·</span>
                                  <span className="text-xs text-gray-500">
                                    {rel.context_category === 'aml_core'
                                      ? 'AML Core'
                                      : rel.context_category === 'affiliation'
                                        ? 'Afiliación'
                                        : rel.context_category === 'profile_context'
                                          ? 'Perfil'
                                          : 'Contexto'}
                                  </span>
                                </>
                              )}
                              {rel.percentage != null && (
                                <>
                                  <span className="text-gray-600 text-xs">·</span>
                                  <span className="text-xs text-cyan-400 font-medium">{rel.percentage}%</span>
                                </>
                              )}
                              {relCountries.length > 0 && (
                                <>
                                  <span className="text-gray-600 text-xs">·</span>
                                  <span className="text-xs text-gray-500">
                                    {relCountries.map((c: string) => countryNames[c] || c).join(', ')}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {(rel.start_date || rel.end_date) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-gray-400">
                                  <Calendar className="w-3 h-3" />
                                  {rel.start_date && rel.end_date
                                    ? `${formatDate(rel.start_date)} — ${formatDate(rel.end_date)}`
                                    : rel.start_date
                                      ? `Desde ${formatDate(rel.start_date)}`
                                      : `Hasta ${formatDate(rel.end_date!)}`}
                                </span>
                              )}

                              {sourceName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-gray-400">
                                  <Database className="w-3 h-3" />
                                  {referenceLike && sourceName?.toLowerCase() === 'wikidata' ? 'Wikidata' : sourceName}
                                </span>
                              )}

                              {rel.relationship_level && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                    rel.relationship_level === 'DIRECT'
                                      ? 'bg-red-500/10 text-red-400'
                                      : rel.relationship_level === 'AFFILIATION'
                                        ? 'bg-yellow-500/10 text-yellow-400'
                                        : 'bg-gray-500/10 text-gray-400'
                                  )}
                                >
                                  {rel.relationship_level === 'DIRECT'
                                    ? 'Directa'
                                    : rel.relationship_level === 'AFFILIATION'
                                      ? 'Afiliación'
                                      : 'Indirecta'}
                                </span>
                              )}

                              {!rel.is_resolved && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                                  Requiere resolución
                                </span>
                              )}

                              {rel.related_entity_sources && rel.related_entity_sources.length > 1 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-gray-400">
                                  <FileText className="w-3 h-3" />
                                  {rel.related_entity_sources.length} fuentes
                                </span>
                              )}
                            </div>

                            {cleanDescription && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{cleanDescription}</p>}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
