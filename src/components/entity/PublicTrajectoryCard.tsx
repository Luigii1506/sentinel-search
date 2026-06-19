import { ArrowRight, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import type { CanonicalPepEntry, UnifiedCareerEntry } from '@/components/entity/entityProfileUtils';
import { countryNames, formatSourceName } from '@/components/entity/entityProfileUtils';

type PublicTrajectoryCardProps = {
  unifiedCareerEntries: UnifiedCareerEntry[];
  canonicalPepEntries: CanonicalPepEntry[];
  pepStatus?: 'current_pep' | 'former_pep_in_monitoring' | 'ex_pep' | 'non_pep';
  onOpenPepDetail: () => void;
};

export function PublicTrajectoryCard({
  unifiedCareerEntries,
  canonicalPepEntries,
  pepStatus = 'non_pep',
  onOpenPepDetail,
}: PublicTrajectoryCardProps) {
  if (unifiedCareerEntries.length === 0) return null;

  const pepBadgeLabel = pepStatus === 'current_pep'
    ? 'PEP en cargo'
    : pepStatus === 'former_pep_in_monitoring'
      ? 'Ex-PEP en monitoreo'
      : pepStatus === 'ex_pep'
        ? 'Ex-PEP'
        : 'Sin registro PEP';

  const pepBadgeClass = pepStatus === 'current_pep'
    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
    : pepStatus === 'former_pep_in_monitoring'
      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
      : 'bg-gray-500/20 text-muted-foreground';

  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
          <Landmark className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Trayectoria pública
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {canonicalPepEntries.length > 0 && (
            <Badge className={cn('w-fit text-xs', pepBadgeClass)}>
              {pepBadgeLabel}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs bg-foreground/5 text-muted-foreground border-foreground/10">
            {unifiedCareerEntries.length} cargo{unifiedCareerEntries.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
      <div className="space-y-3">
        {unifiedCareerEntries.slice(0, 6).map((entry, i) => (
          <div key={entry.id || i} className={cn('p-3 rounded-lg border-l-2', entry.is_pep ? 'bg-purple-500/5 border-purple-500/50' : 'bg-foreground/[0.02] border-sky-500/20')}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground font-medium break-words">{entry.title}</p>
                {(entry.context || entry.source) && (
                  <p className="text-xs text-muted-foreground break-words">{entry.context || formatSourceName(entry.source || '')}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {entry.country && (
                    <span className="text-[10px] text-muted-foreground">{countryNames[entry.country] || entry.country}</span>
                  )}
                  {entry.start_date && (
                    <span className="text-[10px] text-muted-foreground">{formatDate(entry.start_date)} — {entry.end_date ? formatDate(entry.end_date) : 'Presente'}</span>
                  )}
                  {entry.source && (
                    <span className="text-[10px] text-muted-foreground">{formatSourceName(entry.source) || entry.source}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {entry.is_pep && (
                  <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-300 border-purple-500/30 bg-purple-500/10">PEP</Badge>
                )}
                <Badge variant="outline" className={cn('text-[10px]', entry.is_current ? 'text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground')}>
                  {entry.is_current ? 'Vigente' : 'Histórico'}
                </Badge>
              </div>
            </div>
          </div>
        ))}
        {(unifiedCareerEntries.length > 6 || canonicalPepEntries.length > 0) && canonicalPepEntries.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <button onClick={onOpenPepDetail} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver detalle PEP <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
