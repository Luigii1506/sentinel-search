import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PanelSkeleton } from '@/components/foundation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import { complianceService } from '@/services/compliance';

interface UBOTabProps {
  entityId: string;
}

export function UBOTab({ entityId }: UBOTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['ubo-analysis', entityId],
    queryFn: () => complianceService.getUBOAnalysis(entityId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PanelSkeleton className="rounded-xl" lines={3} />
        <PanelSkeleton className="rounded-xl" lines={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Landmark}
        title={t('entity.ubo.empty.title')}
        description={t('entity.ubo.empty.description')}
      />
    );
  }

  const ubo = data as any;
  const owners = ubo.ubos || [];
  const controlled = ubo.controlled_entities || [];
  const keyRelationships = ubo.key_relationships || [];
  const isIndividual = ubo.entity_type === 'INDIVIDUAL';

  const riskColor = (level: string) =>
    level === 'critical' ? 'text-red-600 dark:text-red-400' : level === 'high' ? 'text-orange-700 dark:text-orange-400' : level === 'medium' ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400';
  const riskBorderColor = (level: string) =>
    level === 'critical' ? 'border-red-500' : level === 'high' ? 'border-orange-500' : level === 'medium' ? 'border-yellow-500' : 'border-green-500';

  const relationshipTypeLabel: Record<string, string> = {
    beneficial_ownership: t('entity.ubo.type.beneficial_ownership'),
    corporate: t('entity.ubo.type.corporate'),
    family: t('entity.ubo.type.family'),
    associate: t('entity.ubo.type.associate'),
    political: t('entity.ubo.type.political'),
    membership: t('entity.ubo.type.membership'),
  };

  const hasContent = owners.length > 0 || controlled.length > 0 || keyRelationships.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        icon={Landmark}
        title={t('entity.ubo.emptyContent.title')}
        description={t('entity.ubo.emptyContent.description')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp} className="glass rounded-xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {isIndividual ? t('entity.ubo.controlTitle') : t('entity.ubo.uboTitle')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {owners.length > 0 && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">{t('entity.ubo.stat.identifiedUbos')}</p>
                <p className="text-2xl font-bold text-foreground">{owners.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('entity.ubo.stat.ubosAbove25')}</p>
                <p className="text-2xl font-bold text-foreground">{ubo.ubos_above_25pct || 0}</p>
              </div>
            </>
          )}
          {controlled.length > 0 && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">{t('entity.ubo.stat.controlledEntities')}</p>
                <p className="text-2xl font-bold text-foreground">{controlled.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('entity.ubo.stat.controlledSanctioned')}</p>
                <p className={cn('text-2xl font-bold', ubo.controlled_sanctioned > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                  {ubo.controlled_sanctioned || 0}
                </p>
              </div>
            </>
          )}
          {keyRelationships.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">{t('entity.ubo.stat.riskLinks')}</p>
              <p className="text-2xl font-bold text-foreground">{keyRelationships.length}</p>
            </div>
          )}
          {ubo.risk_flag && (
            <div>
              <p className="text-xs text-muted-foreground">{t('entity.ubo.stat.alert')}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{t('entity.ubo.stat.uboRisk')}</p>
            </div>
          )}
        </div>
      </motion.div>

      {owners.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">{t('entity.ubo.owners')}</h3>
          <div className="space-y-3">
            {owners.map((owner: any, index: number) => (
              <div key={index} className={cn('p-4 rounded-lg bg-foreground/5 border-l-4', riskBorderColor(owner.risk_level))}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium break-words">{owner.ubo_name || owner.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {owner.effective_ownership_pct != null && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                          {t('entity.ubo.effectiveOwnership', { pct: owner.effective_ownership_pct })}
                        </Badge>
                      )}
                      {owner.is_pep && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                          PEP
                        </Badge>
                      )}
                      {owner.is_sanctioned && (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                          {t('entity.ubo.sanctioned')}
                        </Badge>
                      )}
                      {owner.threshold_25pct && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                          {t('entity.ubo.fatfThreshold')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {owner.risk_score != null && (
                    <div className="sm:text-right">
                      <p className={cn('text-lg font-bold', riskColor(owner.risk_level))}>{owner.risk_score}</p>
                      <p className="text-xs text-muted-foreground">{t('entity.ubo.risk')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {controlled.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-1">{t('entity.ubo.controlled')}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t('entity.ubo.controlledHint')}</p>
          <div className="space-y-3">
            {controlled.map((controlledEntity: any, index: number) => (
              <div key={index} className={cn('p-4 rounded-lg bg-foreground/5 border-l-4', riskBorderColor(controlledEntity.risk_level))}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium break-words">{controlledEntity.entity_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30">
                        {controlledEntity.relationship_subtype || controlledEntity.relationship_type}
                      </Badge>
                      {controlledEntity.description && <span className="text-xs text-muted-foreground">{controlledEntity.description}</span>}
                      {controlledEntity.percentage != null && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                          {controlledEntity.percentage}%
                        </Badge>
                      )}
                      {controlledEntity.is_sanctioned && (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                          {t('entity.ubo.sanctioned')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className={cn('text-lg font-bold', riskColor(controlledEntity.risk_level))}>{controlledEntity.risk_score}</p>
                    <p className="text-xs text-muted-foreground">{t('entity.ubo.risk')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {keyRelationships.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-1">{t('entity.ubo.keyRelationships')}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t('entity.ubo.keyRelationshipsHint')}</p>
          <div className="space-y-2">
            {keyRelationships.map((relationship: any, index: number) => (
              <div key={index} className="p-3 rounded-lg bg-foreground/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      relationship.risk_level === 'critical'
                        ? 'bg-red-400'
                        : relationship.risk_level === 'high'
                          ? 'bg-orange-400'
                          : relationship.risk_level === 'medium'
                            ? 'bg-yellow-400'
                            : 'bg-green-400'
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium break-words">{relationship.entity_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground break-words">
                        {relationshipTypeLabel[relationship.relationship_type] || relationship.relationship_type}
                        {relationship.relationship_subtype ? ` · ${relationship.relationship_subtype}` : ''}
                      </span>
                      {relationship.is_pep && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                          PEP
                        </Badge>
                      )}
                      {relationship.is_sanctioned && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                          {t('entity.ubo.sanctioned')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className={cn('text-sm font-bold sm:text-right', riskColor(relationship.risk_level))}>{relationship.risk_score}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="glass rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          {t('entity.ubo.footnote')}
        </p>
      </div>
    </div>
  );
}
