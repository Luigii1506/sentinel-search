import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PanelSkeleton } from '@/components/foundation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import { complianceService } from '@/services/compliance';

interface NetworkRiskTabProps {
  entityId: string;
}

export function NetworkRiskTab({ entityId }: NetworkRiskTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['network-risk', entityId],
    queryFn: () => complianceService.getNetworkRisk(entityId),
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
        icon={Network}
        title={t('entity.networkRisk.empty.title')}
        description={t('entity.networkRisk.empty.description')}
      />
    );
  }

  const networkRisk = data as any;
  const riskColor =
    networkRisk.propagated_risk_level === 'critical'
      ? '#ef4444'
      : networkRisk.propagated_risk_level === 'high'
        ? '#f97316'
        : networkRisk.propagated_risk_level === 'medium'
          ? '#eab308'
          : '#22c55e';

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp} className="glass rounded-xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {t('entity.networkRisk.title')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('entity.networkRisk.directRisk')}</p>
            <p className="text-2xl font-bold text-foreground">{networkRisk.direct_risk_score ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('entity.networkRisk.propagatedRisk')}</p>
            <p className="text-2xl font-bold" style={{ color: riskColor }}>
              {networkRisk.propagated_risk_score ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('entity.networkRisk.level')}</p>
            <Badge
              variant="outline"
              className="mt-1"
              style={{ backgroundColor: `${riskColor}20`, color: riskColor, borderColor: `${riskColor}40` }}
            >
              {networkRisk.propagated_risk_level || '-'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('entity.networkRisk.riskyConnections')}</p>
            <p className="text-2xl font-bold text-foreground">{networkRisk.risky_connections ?? 0}</p>
          </div>
        </div>
      </motion.div>

      {networkRisk.risk_neighbors && networkRisk.risk_neighbors.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            {t('entity.networkRisk.riskNeighbors', { count: networkRisk.risk_neighbors.length })}
          </h3>
          <div className="space-y-2">
            {networkRisk.risk_neighbors.map((neighbor: any, index: number) => {
              const neighborColor =
                neighbor.risk_level === 'critical'
                  ? 'text-red-600 dark:text-red-400'
                  : neighbor.risk_level === 'high'
                    ? 'text-orange-700 dark:text-orange-400'
                    : neighbor.risk_level === 'medium'
                      ? 'text-yellow-700 dark:text-yellow-400'
                      : 'text-green-700 dark:text-green-400';
              const relationshipLabels: Record<string, string> = {
                beneficial_ownership: t('entity.networkRisk.type.beneficial_ownership'),
                corporate: t('entity.networkRisk.type.corporate'),
                family: t('entity.networkRisk.type.family'),
                political: t('entity.networkRisk.type.political'),
                associate: t('entity.networkRisk.type.associate'),
                membership: t('entity.networkRisk.type.membership'),
              };

              return (
                <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        neighbor.risk_level === 'critical'
                          ? 'bg-red-400'
                          : neighbor.risk_level === 'high'
                            ? 'bg-orange-400'
                            : neighbor.risk_level === 'medium'
                              ? 'bg-yellow-400'
                              : 'bg-green-400'
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-foreground font-medium text-sm truncate">{neighbor.entity_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {relationshipLabels[neighbor.relationship_type] || neighbor.relationship_type}
                          {neighbor.relationship_subtype ? ` · ${neighbor.relationship_subtype}` : ''}
                        </span>
                        <span className="text-xs text-muted-foreground">{t('entity.networkRisk.distance', { value: neighbor.distance })}</span>
                        {neighbor.is_pep && (
                          <Badge variant="outline" className="text-[10px] py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                            PEP
                          </Badge>
                        )}
                        {neighbor.is_sanctioned && (
                          <Badge variant="outline" className="text-[10px] py-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                            {t('entity.networkRisk.sanctioned')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0 sm:ml-3">
                    <p className={cn('text-sm font-bold', neighborColor)}>{neighbor.risk_score}</p>
                    <p className="text-[10px] text-muted-foreground">{t('entity.networkRisk.propagates', { value: neighbor.propagated_risk })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="glass rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          {t('entity.networkRisk.formula')}
        </p>
      </div>
    </div>
  );
}
