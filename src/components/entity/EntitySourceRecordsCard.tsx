import { Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import type { APIEntity } from '@/types/api';

type EntitySourceRecordsCardProps = {
  sourceRecords: NonNullable<APIEntity['source_records']>;
  countryNames: Record<string, string>;
  formatSourceName: (source: string) => string | null;
  getRiskBadgeClasses: (risk?: string) => string;
};

export function EntitySourceRecordsCard({
  sourceRecords,
  countryNames,
  formatSourceName,
  getRiskBadgeClasses,
}: EntitySourceRecordsCardProps) {
  const catLabels: Record<string, string> = {
    SANCTIONS: 'Sanciones',
    LAW_ENFORCEMENT: 'Ley',
    PEP: 'PEP',
    REGULATORY: 'Regulatorio',
    TAX: 'Fiscal',
    DEBARMENT: 'Inhabilitación',
  };

  const catColors: Record<string, string> = {
    SANCTIONS: 'bg-red-500/10 text-red-400 border-red-500/20',
    LAW_ENFORCEMENT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    PEP: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    REGULATORY: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    TAX: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    DEBARMENT: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  };

  if (!sourceRecords.length) return null;

  return (
    <div className="grid grid-cols-1 gap-6">
      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
          <Database className="w-4 h-4" />
          Registros por Fuente
          <span className="text-[10px] text-gray-600 ml-auto">{sourceRecords.length} fuentes</span>
        </h3>
        <div className="space-y-2">
          {sourceRecords.map((rec, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-foreground/[0.03]">
              {rec.category && (
                <Badge variant="outline" className={cn('text-[10px] shrink-0', catColors[rec.category] || 'bg-foreground/5 text-gray-400')}>
                  {catLabels[rec.category] || rec.category}
                </Badge>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground">{rec.source_display || formatSourceName(rec.source) || rec.source}</span>
                {rec.country && (
                  <span className="text-[10px] text-gray-500 ml-2">{countryNames[rec.country] || rec.country}</span>
                )}
              </div>
              {rec.risk_level && (
                <Badge variant="outline" className={cn('text-[10px] shrink-0', getRiskBadgeClasses(rec.risk_level))}>
                  {rec.risk_level}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
