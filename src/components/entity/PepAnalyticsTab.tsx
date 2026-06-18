import { Building2, Calendar, Globe, Landmark, MapPin, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import type { CanonicalPepEntry } from '@/components/entity/entityProfileUtils';
import { countryNames, formatSourceName } from '@/components/entity/entityProfileUtils';

type PepAnalyticsTabProps = {
  canonicalPepEntries: CanonicalPepEntry[];
  pepStatus?: 'current_pep' | 'former_pep_in_monitoring' | 'ex_pep' | 'non_pep';
  pepMonitoringUntil?: string | null;
};

export function PepAnalyticsTab({ canonicalPepEntries, pepStatus = 'non_pep', pepMonitoringUntil }: PepAnalyticsTabProps) {
  const pepSourceSummary = (() => {
    const counts = new Map<string, number>();
    canonicalPepEntries.forEach((entry) => {
      const key = formatSourceName(entry.source || entry.source_dataset || '') || 'Fuente no especificada';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  })();
  const currentPepEntries = canonicalPepEntries.filter((entry) => entry.is_current);
  const historicalPepEntries = canonicalPepEntries.length - currentPepEntries.length;
  const pepJurisdictions = [...new Set(
    canonicalPepEntries
      .map((entry) => entry.country)
      .filter((value): value is string => Boolean(value))
      .map((value) => countryNames[value] || value)
  )];
  const statusLabel =
    pepStatus === 'current_pep'
      ? 'PEP en cargo'
      : pepStatus === 'former_pep_in_monitoring'
        ? 'Ex-PEP en monitoreo'
        : pepStatus === 'ex_pep'
          ? 'Ex-PEP'
          : 'Sin registro PEP';
  const statusClass =
    pepStatus === 'current_pep'
      ? 'bg-purple-500/20 text-purple-400'
      : pepStatus === 'former_pep_in_monitoring'
        ? 'bg-amber-500/20 text-amber-300'
        : 'bg-gray-500/20 text-gray-400';

  if (canonicalPepEntries.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Landmark className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-foreground mb-2">Sin exposición PEP registrada</h3>
        <p className="text-gray-400">No hay cargos PEP consolidados para esta entidad en la vista actual.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
          <Landmark className="w-5 h-5 text-purple-400" />
          Exposición política consolidada
        </h3>
        <Badge className={statusClass}>
          {statusLabel}
        </Badge>
      </div>

      {pepStatus === 'former_pep_in_monitoring' && pepMonitoringUntil ? (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <p className="text-sm text-amber-200">
            Monitoreo AML reforzado hasta {formatDate(pepMonitoringUntil)}.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Cargos PEP</p>
          <p className="text-2xl font-bold text-foreground mt-1">{canonicalPepEntries.length}</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Vigentes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{currentPepEntries.length}</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Históricos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{historicalPepEntries}</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Jurisdicciones</p>
          <p className="text-sm font-semibold text-foreground mt-2 break-words">{pepJurisdictions.join(', ') || 'No especificadas'}</p>
        </div>
      </div>

      {pepSourceSummary.length > 0 && (
        <div className="glass rounded-xl p-4 border border-foreground/5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Cobertura por fuente</p>
          <div className="flex flex-wrap gap-2">
            {pepSourceSummary.map((item) => (
              <Badge key={item.label} variant="outline" className="text-xs bg-foreground/5 text-gray-300 border-foreground/10">
                {item.label}: {item.value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        {canonicalPepEntries.map((pep, i) => (
          <div key={pep.id || i} className="relative pl-8 pb-4 last:pb-0">
            {i < canonicalPepEntries.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-700" />
            )}
            <div className={cn('absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center', pep.is_current ? 'bg-purple-500/20 ring-2 ring-purple-500' : 'bg-gray-700 ring-2 ring-gray-600')}>
              <Landmark className={cn('w-3 h-3', pep.is_current ? 'text-purple-400' : 'text-gray-400')} />
            </div>
            <div className={cn('glass rounded-lg p-5 border-l-4 transition-colors', pep.is_current ? 'border-purple-500 bg-purple-500/5' : 'border-gray-600 hover:border-gray-500')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-medium text-base leading-tight">{pep.role}</h4>
                  {(pep.institution || pep.department || pep.source) && (
                    <p className="text-gray-300 text-sm mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      {pep.department || pep.institution || formatSourceName(pep.source || '')}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    {pep.country && (
                      <span className="text-sm text-gray-400 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                        {countryNames[pep.country] || pep.country}
                      </span>
                    )}
                    {pep.state && (
                      <span className="text-sm text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        {pep.state}
                      </span>
                    )}
                    {pep.party && (
                      <span className="text-sm text-blue-400 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-blue-500" />
                        {pep.party}
                      </span>
                    )}
                  </div>
                  {(pep.start_date || pep.end_date) && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-sm text-gray-500">
                        {pep.start_date ? formatDate(pep.start_date) : '?'}
                        {' — '}
                        {pep.end_date ? formatDate(pep.end_date) : 'Presente'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <Badge className={cn('text-xs', pep.is_current ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400')}>
                    {pep.is_current ? 'En Cargo' : 'Histórico'}
                  </Badge>
                  {pep.category && pep.category !== 'PEP' && (
                    <span className="text-[10px] text-gray-600 uppercase tracking-wide">{pep.category.replace(/_/g, ' ')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
