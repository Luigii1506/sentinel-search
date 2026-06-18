import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, humanizeEntityName } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';

type OverviewFamilyRelationship = {
  related_entity_id?: string;
  related_entity_name: string;
  subtype?: string;
  related_entity_is_pep?: boolean;
  related_entity_risk_level?: string;
};

type StructuredFamilyRelationship = {
  entity_id?: string;
  qid?: string;
  name: string;
  relationship_label: string;
  is_current?: boolean | null;
};

type RelationshipContextSummaryCardProps = {
  referenceLike: boolean;
  overviewFamilyRelationships: OverviewFamilyRelationship[];
  overviewStructuredFamily: StructuredFamilyRelationship[];
  totalDetectedRelationships: number;
  amlVisibleRelationships: number;
  contextualRelationships: number;
  relationshipCounts: Record<string, number>;
  onOpenRelationships: () => void;
  translateSubtype: (subtype?: string | null) => string;
  getRiskBadgeClasses: (risk?: string) => string;
};

const relationshipTypeLabels: Record<string, string> = {
  family: 'Familiar',
  associate: 'Asociado',
  corporate: 'Corporativo',
  beneficial_ownership: 'Beneficiario',
  membership: 'Miembro',
  political: 'Político',
  sanction: 'Sanción',
  unknown: 'Otro',
};

export function RelationshipContextSummaryCard({
  referenceLike,
  overviewFamilyRelationships,
  overviewStructuredFamily,
  totalDetectedRelationships,
  amlVisibleRelationships,
  contextualRelationships,
  relationshipCounts,
  onOpenRelationships,
  translateSubtype,
  getRiskBadgeClasses,
}: RelationshipContextSummaryCardProps) {
  const hasFamilySummary = !referenceLike && (overviewFamilyRelationships.length > 0 || overviewStructuredFamily.length > 0);

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.16 }} className="glass rounded-xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wide">
          <Users className="w-4 h-4" />
          Contexto Relacional
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenRelationships}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Ver relaciones
        </Button>
      </div>

      {hasFamilySummary ? (
        <div className="mb-4">
          <p className="text-xs text-purple-400 uppercase mb-2">Familiares relevantes detectados</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {overviewFamilyRelationships.length > 0
              ? overviewFamilyRelationships.slice(0, 6).map((rel, index) => (
                  <div key={`${rel.related_entity_id || rel.related_entity_name}-${index}`} className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
                    <p className="text-sm text-foreground font-medium break-words">{humanizeEntityName(rel.related_entity_name)}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {rel.subtype && (
                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                          {translateSubtype(rel.subtype)}
                        </Badge>
                      )}
                      {rel.related_entity_is_pep && (
                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                          PEP
                        </Badge>
                      )}
                      {rel.related_entity_risk_level && (
                        <Badge variant="outline" className={cn('text-[10px]', getRiskBadgeClasses(rel.related_entity_risk_level))}>
                          {rel.related_entity_risk_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              : overviewStructuredFamily.slice(0, 6).map((rel, index) => (
                  <div key={`${rel.entity_id || rel.qid || rel.name}-${index}`} className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
                    <p className="text-sm text-foreground font-medium break-words">{humanizeEntityName(rel.name)}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                        {rel.relationship_label}
                      </Badge>
                      {rel.is_current ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                          Vigente
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
          </div>
          {overviewFamilyRelationships.length > 6 && (
            <p className="text-xs text-gray-500 mt-2">
              +{overviewFamilyRelationships.length - 6} familiares más en la pestaña de relaciones
            </p>
          )}
          {overviewFamilyRelationships.length === 0 && overviewStructuredFamily.length > 6 ? (
            <p className="text-xs text-gray-500 mt-2">
              +{overviewStructuredFamily.length - 6} familiares más disponibles desde el contexto estructurado.
            </p>
          ) : null}
        </div>
      ) : referenceLike ? (
        <div className="mb-4 rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-sm text-foreground">Se identificaron {totalDetectedRelationships} relaciones para esta entidad contextual.</p>
          <p className="text-xs text-gray-500 mt-1">
            Para acelerar la apertura de referencias, el resumen general no carga el detalle completo de relaciones. Usa la pestaña de relaciones para ver personas y organizaciones vinculadas.
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-sm text-foreground">
            Se identificaron {amlVisibleRelationships} relaciones AML visibles de {totalDetectedRelationships} relaciones detectadas.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {contextualRelationships > 0
              ? `Hay ${contextualRelationships} vínculos adicionales de contexto/perfil fuera de la vista AML principal.`
              : 'En esta vista rápida no aparecieron familiares resueltos; el contexto principal está en vínculos corporativos, asociados o políticos.'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(relationshipCounts)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{relationshipTypeLabels[type] || type}</span>
              <Badge className="bg-foreground/10 text-gray-300 text-[10px]">{count}</Badge>
            </div>
          ))}
      </div>
    </motion.div>
  );
}
