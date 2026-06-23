import { Building2, Calendar, Globe, Landmark, MapPin, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const pepSourceSummary = (() => {
    const counts = new Map<string, number>();
    canonicalPepEntries.forEach((entry) => {
      const key = formatSourceName(entry.source || entry.source_dataset || '') || t('entity.pep.sourceFallback');
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
      ? t('entity.pep.status.current')
      : pepStatus === 'former_pep_in_monitoring'
        ? t('entity.pep.status.monitoring')
        : pepStatus === 'ex_pep'
          ? t('entity.pep.status.exPep')
          : t('entity.pep.status.noRecord');
  const statusClass =
    pepStatus === 'current_pep'
      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
      : pepStatus === 'former_pep_in_monitoring'
        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
        : 'bg-gray-500/20 text-muted-foreground';

  if (canonicalPepEntries.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Landmark className="w-16 h-16 text-green-700 dark:text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-foreground mb-2">{t('entity.pep.empty.title')}</h3>
        <p className="text-muted-foreground">{t('entity.pep.empty.description')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
          <Landmark className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          {t('entity.pep.title')}
        </h3>
        <Badge className={statusClass}>
          {statusLabel}
        </Badge>
      </div>

      {pepStatus === 'former_pep_in_monitoring' && pepMonitoringUntil ? (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <p className="text-sm text-amber-200">
            {t('entity.pep.monitoringUntil', { date: formatDate(pepMonitoringUntil) })}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('entity.pep.stat.positions')}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{canonicalPepEntries.length}</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('entity.pep.stat.current')}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{currentPepEntries.length}</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('entity.pep.stat.historical')}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{historicalPepEntries}</p>
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-foreground/5 p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('entity.pep.stat.jurisdictions')}</p>
          <p className="text-sm font-semibold text-foreground mt-2 break-words">{pepJurisdictions.join(', ') || t('entity.pep.noJurisdictions')}</p>
        </div>
      </div>

      {pepSourceSummary.length > 0 && (
        <div className="glass rounded-xl p-4 border border-foreground/5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">{t('entity.pep.coverageBySource')}</p>
          <div className="flex flex-wrap gap-2">
            {pepSourceSummary.map((item) => (
              <Badge key={item.label} variant="outline" className="text-xs bg-foreground/5 text-muted-foreground border-foreground/10">
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
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-muted" />
            )}
            <div className={cn('absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center', pep.is_current ? 'bg-purple-500/20 ring-2 ring-purple-500' : 'bg-muted ring-2 ring-gray-600')}>
              <Landmark className={cn('w-3 h-3', pep.is_current ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground')} />
            </div>
            <div className={cn('glass rounded-lg p-5 border-l-4 transition-colors', pep.is_current ? 'border-purple-500 bg-purple-500/5' : 'border-border hover:border-gray-500')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-medium text-base leading-tight">{pep.role}</h4>
                  {(pep.institution || pep.department || pep.source) && (
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {pep.department || pep.institution || formatSourceName(pep.source || '')}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    {pep.country && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        {countryNames[pep.country] || pep.country}
                      </span>
                    )}
                    {pep.state && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {pep.state}
                      </span>
                    )}
                    {pep.party && (
                      <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
                        {pep.party}
                      </span>
                    )}
                  </div>
                  {(pep.start_date || pep.end_date) && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {pep.start_date ? formatDate(pep.start_date) : '?'}
                        {pep.end_date
                          ? ` — ${formatDate(pep.end_date)}`
                          : pep.is_current
                            ? ` — ${t('entity.pep.present')}`
                            : ''}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <Badge className={cn('text-xs', pep.is_current ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-gray-500/20 text-muted-foreground')}>
                    {pep.is_current ? t('entity.pep.inOffice') : t('entity.pep.historical')}
                  </Badge>
                  {pep.category && pep.category !== 'PEP' && (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{pep.category.replace(/_/g, ' ')}</span>
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
