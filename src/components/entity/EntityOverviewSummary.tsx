import { AlertCircle, AlertTriangle, CheckCircle, Landmark, Newspaper, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import type { EntityProfile } from '@/services/entities';
import type { APIEntity } from '@/types/api';

const riskLevelLabels = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  none: 'Ninguno',
} as const;

type RelationshipSignal = {
  label: string;
  value: number;
};

type EntityOverviewSummaryProps = {
  entity: APIEntity;
  profile?: EntityProfile;
  canonicalPepCount: number;
  amlVisibleRelationships: number;
  relationshipSignals: RelationshipSignal[];
  summaryText: string;
};

export function EntityOverviewSummary({
  entity,
  profile,
  canonicalPepCount,
  amlVisibleRelationships,
  relationshipSignals,
  summaryText,
}: EntityOverviewSummaryProps) {
  const hasSanctions = entity.sanctions.length > 0;
  const activeSanctions = entity.sanctions.filter((item) => item.status === 'active');
  const pepStatus = profile?.overview.pep_status || entity.pep_status || 'non_pep';
  const isPep = pepStatus === 'current_pep' || pepStatus === 'former_pep_in_monitoring';
  const pepStateLabel =
    pepStatus === 'current_pep'
      ? 'En cargo'
      : pepStatus === 'former_pep_in_monitoring'
        ? 'En monitoreo'
        : pepStatus === 'ex_pep'
          ? 'Ex-PEP'
          : canonicalPepCount > 0
            ? 'Histórico'
            : 'No registrado';
  const hasAdverseMedia = (entity.adverse_media?.length || 0) > 0;
  const riskFactorLabels: Record<string, string> = {
    sanctions: 'Sanciones',
    pep: 'PEP',
    adverse_media: 'Medios Adversos',
    geographic: 'Geográfico',
    network: 'Red',
    transactional: 'Transaccional',
  };
  const criticalFactors = entity.risk_factors.filter((factor) => factor.level === 'critical' || factor.level === 'high');

  return (
    <>
      {!hasSanctions && !isPep && !hasAdverseMedia && criticalFactors.length === 0 ? (
        <motion.div {...fadeUp} className="glass rounded-xl p-5 border-l-4 border-green-500/60">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-700 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-foreground font-medium">Sin alertas activas</p>
              <p className="text-sm text-muted-foreground">
                Esta entidad no tiene sanciones, registros PEP ni medios adversos. Presente en {entity.data_sources.length} fuente{entity.data_sources.length !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          {...fadeUp}
          className={cn(
            'glass rounded-xl p-5 border-l-4',
            entity.risk_level === 'critical'
              ? 'border-red-500/60'
              : entity.risk_level === 'high'
                ? 'border-orange-500/60'
                : 'border-yellow-500/60'
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={cn(
                'w-6 h-6 shrink-0 mt-0.5',
                entity.risk_level === 'critical'
                  ? 'text-red-600 dark:text-red-400'
                  : entity.risk_level === 'high'
                    ? 'text-orange-700 dark:text-orange-400'
                    : 'text-yellow-700 dark:text-yellow-400'
              )}
            />
            <div className="flex-1">
              <p className="text-foreground font-medium mb-2">Resumen de Alertas</p>
              <div className="flex flex-wrap gap-3">
                {hasSanctions && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-600 dark:text-red-300 font-medium">
                      {activeSanctions.length} sanción{activeSanctions.length !== 1 ? 'es' : ''} activa{activeSanctions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {isPep && (
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border',
                    pepStatus === 'former_pep_in_monitoring'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-purple-500/10 border-purple-500/20'
                  )}>
                    <Landmark className={cn('w-4 h-4', pepStatus === 'former_pep_in_monitoring' ? 'text-amber-700 dark:text-amber-300' : 'text-purple-600 dark:text-purple-400')} />
                    <span className={cn('text-sm font-medium', pepStatus === 'former_pep_in_monitoring' ? 'text-amber-200' : 'text-purple-600 dark:text-purple-300')}>
                      {pepStatus === 'former_pep_in_monitoring' ? 'Ex-PEP en monitoreo' : 'Persona Políticamente Expuesta'}
                    </span>
                  </div>
                )}
                {hasAdverseMedia && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Newspaper className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Medios adversos</span>
                  </div>
                )}
                {criticalFactors.map((factor, index) => (
                  <div key={`${factor.category}-${index}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 border border-foreground/10">
                    <AlertCircle className={cn('w-4 h-4', factor.level === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-orange-700 dark:text-orange-400')} />
                    <span className="text-sm text-muted-foreground">
                      {riskFactorLabels[factor.category] || factor.category}: {factor.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 min-w-0">
        <motion.div {...fadeUp} transition={{ delay: 0.03 }} className="glass rounded-xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Lectura Ejecutiva</p>
              <h3 className="text-lg font-medium text-foreground break-words">{summaryText}</h3>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-xs shrink-0',
                entity.risk_level === 'critical'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                  : entity.risk_level === 'high'
                    ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30'
                    : entity.risk_level === 'medium'
                      ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                      : 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
              )}
            >
              Riesgo {riskLevelLabels[entity.risk_level]}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Sanciones activas</p>
              <p className="text-2xl font-bold text-foreground mt-1">{activeSanctions.length}</p>
            </div>
            <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Estado PEP</p>
              <p className="text-sm font-semibold text-foreground mt-2">
                {pepStateLabel}
              </p>
            </div>
            <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Medios adversos</p>
              <p className="text-2xl font-bold text-foreground mt-1">{entity.adverse_media?.length || 0}</p>
            </div>
            <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Relaciones</p>
              <p className="text-2xl font-bold text-foreground mt-1">{amlVisibleRelationships}</p>
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="glass rounded-xl p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Cobertura y Trazabilidad</p>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">Fuentes activas</span>
              <span className="text-sm font-semibold text-foreground text-right break-words">
                {profile?.overview.source_count || entity.data_sources.length}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">Datasets</span>
              <span className="text-sm font-semibold text-foreground text-right break-words">
                {profile?.cross_references?.datasets?.length || entity.source_records?.length || 0}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">Primera aparición</span>
              <span className="text-sm font-semibold text-foreground text-right break-words">
                {profile?.first_seen_at || entity.first_seen ? formatDate(profile?.first_seen_at || entity.first_seen) : '—'}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">Última actualización</span>
              <span className="text-sm font-semibold text-foreground text-right break-words">
                {profile?.last_seen_at || entity.last_updated ? formatDate(profile?.last_seen_at || entity.last_updated) : '—'}
              </span>
            </div>
          </div>

          {relationshipSignals.length > 0 && (
            <div className="mt-5 pt-4 border-t border-foreground/5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Señales relacionales</p>
              <div className="flex flex-wrap gap-2">
                {relationshipSignals.map((item) => (
                  <Badge key={item.label} variant="outline" className="text-xs bg-foreground/5 text-muted-foreground border-foreground/10">
                    {item.label}: {item.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
