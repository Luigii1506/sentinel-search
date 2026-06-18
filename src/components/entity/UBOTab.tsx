import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import { EmptyState, PanelSkeleton } from '@/components/foundation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import { complianceService } from '@/services/compliance';

interface UBOTabProps {
  entityId: string;
}

export function UBOTab({ entityId }: UBOTabProps) {
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
        title="Sin análisis UBO"
        description="No se encontró análisis de beneficiario final para esta entidad."
      />
    );
  }

  const ubo = data as any;
  const owners = ubo.ubos || [];
  const controlled = ubo.controlled_entities || [];
  const keyRelationships = ubo.key_relationships || [];
  const isIndividual = ubo.entity_type === 'INDIVIDUAL';

  const riskColor = (level: string) =>
    level === 'critical' ? 'text-red-400' : level === 'high' ? 'text-orange-400' : level === 'medium' ? 'text-yellow-400' : 'text-green-400';
  const riskBorderColor = (level: string) =>
    level === 'critical' ? 'border-red-500' : level === 'high' ? 'border-orange-500' : level === 'medium' ? 'border-yellow-500' : 'border-green-500';

  const relationshipTypeLabel: Record<string, string> = {
    beneficial_ownership: 'Propiedad',
    corporate: 'Corporativo',
    family: 'Familiar',
    associate: 'Asociado',
    political: 'Político',
    membership: 'Membresía',
  };

  const hasContent = owners.length > 0 || controlled.length > 0 || keyRelationships.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        icon={Landmark}
        title="Sin datos de propiedad"
        description="No se encontraron relaciones de propiedad, control o vínculos de riesgo para esta entidad."
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp} className="glass rounded-xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-400" />
          {isIndividual ? 'Análisis de Control y Exposición' : 'Beneficiario Final (UBO)'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {owners.length > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500">UBOs Identificados</p>
                <p className="text-2xl font-bold text-foreground">{owners.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">UBOs &gt;25%</p>
                <p className="text-2xl font-bold text-foreground">{ubo.ubos_above_25pct || 0}</p>
              </div>
            </>
          )}
          {controlled.length > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500">Entidades Controladas</p>
                <p className="text-2xl font-bold text-foreground">{controlled.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Controladas Sancionadas</p>
                <p className={cn('text-2xl font-bold', ubo.controlled_sanctioned > 0 ? 'text-red-400' : 'text-foreground')}>
                  {ubo.controlled_sanctioned || 0}
                </p>
              </div>
            </>
          )}
          {keyRelationships.length > 0 && (
            <div>
              <p className="text-xs text-gray-500">Vínculos de Riesgo</p>
              <p className="text-2xl font-bold text-foreground">{keyRelationships.length}</p>
            </div>
          )}
          {ubo.risk_flag && (
            <div>
              <p className="text-xs text-gray-500">Alerta</p>
              <p className="text-2xl font-bold text-red-400">RIESGO UBO</p>
            </div>
          )}
        </div>
      </motion.div>

      {owners.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Beneficiarios Finales</h3>
          <div className="space-y-3">
            {owners.map((owner: any, index: number) => (
              <div key={index} className={cn('p-4 rounded-lg bg-foreground/5 border-l-4', riskBorderColor(owner.risk_level))}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium break-words">{owner.ubo_name || owner.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {owner.effective_ownership_pct != null && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {owner.effective_ownership_pct}% efectivo
                        </Badge>
                      )}
                      {owner.is_pep && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                          PEP
                        </Badge>
                      )}
                      {owner.is_sanctioned && (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                          Sancionado
                        </Badge>
                      )}
                      {owner.threshold_25pct && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                          &gt;25% FATF
                        </Badge>
                      )}
                    </div>
                  </div>
                  {owner.risk_score != null && (
                    <div className="sm:text-right">
                      <p className={cn('text-lg font-bold', riskColor(owner.risk_level))}>{owner.risk_score}</p>
                      <p className="text-xs text-gray-500">Risk</p>
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
          <h3 className="text-lg font-medium text-foreground mb-1">Entidades Controladas</h3>
          <p className="text-xs text-gray-500 mb-4">Empresas y entidades sobre las que tiene propiedad o dirección</p>
          <div className="space-y-3">
            {controlled.map((controlledEntity: any, index: number) => (
              <div key={index} className={cn('p-4 rounded-lg bg-foreground/5 border-l-4', riskBorderColor(controlledEntity.risk_level))}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium break-words">{controlledEntity.entity_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                        {controlledEntity.relationship_subtype || controlledEntity.relationship_type}
                      </Badge>
                      {controlledEntity.description && <span className="text-xs text-gray-500">{controlledEntity.description}</span>}
                      {controlledEntity.percentage != null && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {controlledEntity.percentage}%
                        </Badge>
                      )}
                      {controlledEntity.is_sanctioned && (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                          Sancionado
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className={cn('text-lg font-bold', riskColor(controlledEntity.risk_level))}>{controlledEntity.risk_score}</p>
                    <p className="text-xs text-gray-500">Risk</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {keyRelationships.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-1">Vínculos de Riesgo</h3>
          <p className="text-xs text-gray-500 mb-4">Relaciones familiares, políticas y asociaciones con entidades de riesgo medio-alto</p>
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
                      <span className="text-xs text-gray-500 break-words">
                        {relationshipTypeLabel[relationship.relationship_type] || relationship.relationship_type}
                        {relationship.relationship_subtype ? ` · ${relationship.relationship_subtype}` : ''}
                      </span>
                      {relationship.is_pep && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-purple-500/10 text-purple-400 border-purple-500/30">
                          PEP
                        </Badge>
                      )}
                      {relationship.is_sanctioned && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-red-500/10 text-red-400 border-red-500/30">
                          Sancionado
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
        <p className="text-xs text-gray-500">
          Análisis basado en FATF Recomendación 24/25. Se considera Beneficiario Final
          a toda persona natural con participación directa o indirecta ≥25% o con control efectivo.
          Para personas, se muestran entidades controladas y vínculos de riesgo por exposición.
        </p>
      </div>
    </div>
  );
}
