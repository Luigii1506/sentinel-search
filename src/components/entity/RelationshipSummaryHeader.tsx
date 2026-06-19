import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

type RelationshipSummaryHeaderProps = {
  amlVisibleRelationships: number;
  totalDetectedRelationships: number;
  resolvedRelationshipCount: number;
  unresolvedRelationshipCount: number;
  contextualRelationships: number;
  contextualVisibleRelationshipCount: number;
  includeContextualRelationships: boolean;
  referenceLike: boolean;
  prioritizedRelationshipCounts: Record<string, number>;
  contextualRelationshipCounts: Record<string, number>;
};

export function RelationshipSummaryHeader({
  amlVisibleRelationships,
  totalDetectedRelationships,
  resolvedRelationshipCount,
  unresolvedRelationshipCount,
  contextualRelationships,
  contextualVisibleRelationshipCount,
  includeContextualRelationships,
  referenceLike,
  prioritizedRelationshipCounts,
  contextualRelationshipCounts,
}: RelationshipSummaryHeaderProps) {
  const { t } = useTranslation();
  const relationshipTypeLabels: Record<string, string> = {
    beneficial_ownership: t('entity.relationships.summaryType.beneficial_ownership'),
    associate: t('entity.relationships.summaryType.associate'),
    membership: t('entity.relationships.summaryType.membership'),
    family: t('entity.relationships.summaryType.family'),
    political: t('entity.relationships.summaryType.political'),
  };
  return (
    <div className="glass rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{t('entity.relationships.summary.title')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('entity.relationships.summary.subtitle', { visible: amlVisibleRelationships, total: totalDetectedRelationships })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            {t('entity.relationships.summary.resolved', { count: resolvedRelationshipCount })}
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            {t('entity.relationships.summary.unresolved', { count: unresolvedRelationshipCount })}
          </Badge>
          {!referenceLike && contextualRelationships > 0 ? (
            <Badge className="bg-slate-500/10 text-muted-foreground border border-slate-500/20">
              {t('entity.relationships.summary.contextual', { count: includeContextualRelationships ? contextualVisibleRelationshipCount : contextualRelationships })}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {Object.entries(prioritizedRelationshipCounts)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([type, count]) => (
            <span key={type} className="rounded-full bg-foreground/[0.04] px-2.5 py-1">
              {(relationshipTypeLabels[type] || type)} {count}
            </span>
          ))}
        {!referenceLike && Object.keys(contextualRelationshipCounts).length > 0 ? (
          <span className="rounded-full bg-foreground/[0.03] px-2.5 py-1 text-muted-foreground">
            {t('entity.relationships.summary.hiddenContext', { count: Object.values(contextualRelationshipCounts).reduce((sum, value) => sum + value, 0) })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
