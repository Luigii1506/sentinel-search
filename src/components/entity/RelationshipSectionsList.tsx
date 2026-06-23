import { Calendar, ChevronDown, ChevronRight, Database, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  getRelationshipSubgroupPriority: (sectionKey: string, subgroupKey: string, referenceLike: boolean) => number;
  getReferenceRelationshipSummary: (rel: any) => string | null;
  translateSubtype: (subtype?: string | null) => string;
  getEntityTypeLabelExtended: (type?: string | null) => string;
  countryNames: Record<string, string>;
  onNavigateEntity: (entityId: string) => void;
};

const priorityBadgeStyles: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20',
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
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
  getEntityTypeLabelExtended,
  countryNames,
  onNavigateEntity,
}: RelationshipSectionsListProps) {
  const { t } = useTranslation();
  return (
    <>
      {sectionConfig.map((section) => {
        const rels = groupedByType[section.key];
        if (!rels || rels.length === 0) return null;
        const SectionIcon = section.icon;
        const subgroupMap = rels.reduce<Record<string, typeof rels>>((acc, rel) => {
          const subgroupKey = getRelationshipSubgroup(rel, section.key, referenceLike);
          acc[subgroupKey] = acc[subgroupKey] || [];
          acc[subgroupKey].push(rel);
          return acc;
        }, {});
        const subgroupEntries = Object.entries(subgroupMap);
        const showSubgroups = subgroupEntries.length > 1;
        // `key` es una llave estable de subgrupo; el texto visible se traduce abajo.
        const relationshipGroups: Array<{ key: string; items: typeof rels }> = showSubgroups
          ? subgroupEntries
              .map(([key, items]) => ({ key, items }))
              .sort((a, b) => {
                const priorityDiff =
                  getRelationshipSubgroupPriority(section.key, a.key, referenceLike) -
                  getRelationshipSubgroupPriority(section.key, b.key, referenceLike);
                if (priorityDiff !== 0) return priorityDiff;
                return a.key.localeCompare(b.key);
              })
          : [{ key: '', items: rels }];

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
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
                <SectionIcon className={cn('w-5 h-5', section.color)} />
                <h3 className={cn('text-lg font-semibold', section.color)}>{section.label}</h3>
              </div>
            </button>

            {!collapsedRelationshipSections[section.key] && (
              <div className="space-y-4">
                {relationshipGroups.map(({ key: subgroupKey, items: subgroupRels }) => (
                  <div key={`${section.key}-${subgroupKey || 'all'}`} className="space-y-3">
                    {showSubgroups && (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {t(`entity.relationships.subgroup.${subgroupKey}`)}
                        </span>
                        <div className="h-px flex-1 bg-foreground/10" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subgroupRels.map((rel, i) => {
                        const riskColor =
                          rel.related_entity_risk_level === 'critical'
                            ? 'text-red-600 dark:text-red-400'
                            : rel.related_entity_risk_level === 'high'
                              ? 'text-orange-700 dark:text-orange-400'
                              : rel.related_entity_risk_level === 'medium'
                                ? 'text-yellow-700 dark:text-yellow-400'
                                : 'text-muted-foreground';
                        const riskBg =
                          rel.related_entity_risk_level === 'critical'
                            ? 'bg-red-500/10 border-red-500/20'
                            : rel.related_entity_risk_level === 'high'
                              ? 'bg-orange-500/10 border-orange-500/20'
                              : rel.related_entity_risk_level === 'medium'
                                ? 'bg-yellow-500/10 border-yellow-500/20'
                                : 'bg-gray-500/10 border-gray-500/20';
                        const entityTypeKey = (rel.related_entity_type || '').toLowerCase();
                        const entityTypeLabel = entityTypeKey ? getEntityTypeLabelExtended(entityTypeKey) : null;
                        const relCountries = (rel.related_entity_countries || []).slice(0, 3);
                        const sourceName = rel.source ? formatSourceName(rel.source) : null;
                        const referenceSummary = referenceLike ? getReferenceRelationshipSummary(rel) : null;
                        const cleanDescription =
                          rel.description &&
                          // En familia el description es solo un nombre (caption FTM) →
                          // ruido: el rol (Padre/Hijo) + el nombre ya lo dicen todo.
                          rel.type !== 'family' &&
                          !rel.description.includes('→') &&
                          !rel.description.includes('—') &&
                          !rel.description.toLowerCase().startsWith('wikidata ') &&
                          // Ocultar si solo duplica el nombre de la entidad relacionada.
                          rel.description.trim().toLowerCase() !==
                            (rel.related_entity_name || '').trim().toLowerCase()
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
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    {t('entity.relationships.card.resolved')}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                    {t('entity.relationships.card.unresolved')}
                                  </span>
                                )}
                                {(rel.context_category === 'profile_context' || rel.context_category === 'unknown') && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-muted-foreground border border-slate-500/20">
                                    {t('entity.relationships.card.contextual')}
                                  </span>
                                )}
                                {rel.related_entity_is_pep && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    PEP
                                  </span>
                                )}
                                {rel.related_entity_risk_score != null && rel.related_entity_risk_score >= 40 && (
                                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', riskBg, riskColor)}>
                                    {rel.related_entity_risk_level === 'critical'
                                      ? t('entity.relationships.card.risk.critical')
                                      : rel.related_entity_risk_level === 'high'
                                        ? t('entity.relationships.card.risk.high')
                                        : t('entity.relationships.card.risk.medium')}{' '}
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
                                <span className="text-muted-foreground text-xs">
                                  {referenceLike
                                    ? t('entity.relationships.card.fallback.contextualLink')
                                    : section.key === 'family'
                                      ? t('entity.relationships.card.fallback.family')
                                      : section.key === 'associates'
                                        ? t('entity.relationships.card.fallback.associate')
                                        : section.key === 'corporate'
                                          ? t('entity.relationships.card.fallback.corporate')
                                          : section.key === 'political'
                                            ? t('entity.relationships.card.fallback.political')
                                            : section.key === 'sanctions'
                                              ? t('entity.relationships.card.fallback.sanction')
                                              : section.key === 'profile'
                                                ? t('entity.relationships.card.fallback.profile')
                                                : t('entity.relationships.card.fallback.related')}
                                </span>
                              )}
                              {entityTypeLabel && (
                                <>
                                  <span className="text-muted-foreground text-xs">·</span>
                                  <span className="text-xs text-muted-foreground">{entityTypeLabel}</span>
                                </>
                              )}
                              {!referenceLike && rel.context_category && (
                                <>
                                  <span className="text-muted-foreground text-xs">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    {rel.context_category === 'aml_core'
                                      ? t('entity.relationships.card.context.amlCore')
                                      : rel.context_category === 'affiliation'
                                        ? t('entity.relationships.card.context.affiliation')
                                        : rel.context_category === 'profile_context'
                                          ? t('entity.relationships.card.context.profile')
                                          : t('entity.relationships.card.context.context')}
                                  </span>
                                </>
                              )}
                              {rel.percentage != null && (
                                <>
                                  <span className="text-muted-foreground text-xs">·</span>
                                  <span className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">{rel.percentage}%</span>
                                </>
                              )}
                              {relCountries.length > 0 && (
                                <>
                                  <span className="text-muted-foreground text-xs">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    {relCountries.map((c: string) => countryNames[c] || c).join(', ')}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {(rel.start_date || rel.end_date) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {rel.start_date && rel.end_date
                                    ? `${formatDate(rel.start_date)} — ${formatDate(rel.end_date)}`
                                    : rel.start_date
                                      ? t('entity.relationships.card.from', { date: formatDate(rel.start_date) })
                                      : t('entity.relationships.card.until', { date: formatDate(rel.end_date!) })}
                                </span>
                              )}

                              {sourceName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-muted-foreground">
                                  <Database className="w-3 h-3" />
                                  {referenceLike && sourceName?.toLowerCase() === 'wikidata' ? 'Wikidata' : sourceName}
                                </span>
                              )}

                              {rel.relationship_level && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                    rel.relationship_level === 'DIRECT'
                                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                      : rel.relationship_level === 'AFFILIATION'
                                        ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                                        : 'bg-gray-500/10 text-muted-foreground'
                                  )}
                                >
                                  {rel.relationship_level === 'DIRECT'
                                    ? t('entity.relationships.card.level.direct')
                                    : rel.relationship_level === 'AFFILIATION'
                                      ? t('entity.relationships.card.level.affiliation')
                                      : t('entity.relationships.card.level.indirect')}
                                </span>
                              )}

                              {!rel.is_resolved && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]">
                                  {t('entity.relationships.card.requiresResolution')}
                                </span>
                              )}

                              {rel.related_entity_sources && rel.related_entity_sources.length > 1 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-muted-foreground">
                                  <FileText className="w-3 h-3" />
                                  {t('entity.relationships.card.sources', { count: rel.related_entity_sources.length })}
                                </span>
                              )}
                            </div>

                            {cleanDescription && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{cleanDescription}</p>}
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
