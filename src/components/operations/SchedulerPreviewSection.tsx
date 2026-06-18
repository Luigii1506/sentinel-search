import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/foundation';
import { adminService } from '@/services/admin';
import type { SchedulerPreviewResponse } from '@/types/api';

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  eligible:             { label: 'Elegible AHORA',            color: 'text-emerald-400' },
  wrong_hour:           { label: 'Fuera de ventana horaria',  color: 'text-gray-500' },
  wrong_weekday:        { label: 'Día de semana incorrecto',  color: 'text-gray-500' },
  wrong_dom:            { label: 'Día del mes incorrecto',    color: 'text-gray-500' },
  wrong_quarter_day:    { label: 'Día trimestral incorrecto', color: 'text-gray-500' },
  dispatched_recently:  { label: 'Despachado recientemente',  color: 'text-blue-400' },
  skipped_backoff:      { label: 'Bloqueado por fallos',      color: 'text-red-400' },
  manual:               { label: 'Sin schedule (manual)',     color: 'text-gray-500' },
};

function formatLocalTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function tierBadge(tier: number) {
  const colors: Record<number, string> = {
    1: 'bg-red-500/15 text-red-300 border-red-500/30',
    2: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    3: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    4: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };
  return colors[tier] || colors[4];
}

function formatHoursCompact(h: number | null | undefined): string {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  if (h < 168) return `${(h / 24).toFixed(0)}d`;
  return `${(h / 168).toFixed(0)}sem`;
}

function formatAgoOrFuture(h: number | null | undefined): string {
  if (h == null) return '—';
  if (h < 0) {
    const abs = Math.abs(h);
    return `en ${formatHoursCompact(abs)}`;
  }
  return formatHoursCompact(h);
}

function reasonMeta(reason: string) {
  return REASON_LABELS[reason] ?? { label: reason, color: 'text-gray-400' };
}

type SortKey = 'source_id' | 'tier' | 'frequency' | 'reason' | 'hours_since_last_dispatch' | 'last_sync_result' | 'min_gap_hours' | 'backoff' | 'next_eligible';
type SortDir = 'asc' | 'desc';

export function SchedulerPreviewSection() {
  const [expanded, setExpanded] = useState(false);
  const [onlyInWindow, setOnlyInWindow] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('source_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-gray-700 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const { data, isLoading, refetch, isFetching } = useQuery<SchedulerPreviewResponse>({
    queryKey: ['scheduler-preview', { onlyInWindow }],
    queryFn: () => adminService.getSchedulerPreview({ only_in_window: onlyInWindow }),
    enabled: expanded,
    staleTime: 30_000,
    refetchInterval: expanded ? 30_000 : false,
  });

  return (
    <div className="rounded border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-3 hover:bg-white/5 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
        <CalendarClock className="w-4 h-4 text-purple-400" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-white">Scheduler Preview</div>
          <div className="text-[11px] text-gray-500">
            Qué decidiría Beat AHORA si corriera el dispatcher · dry-run permanente
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-emerald-400">{data.eligible_now} elegibles</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{data.total_scheduled} en vista</span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOnlyInWindow(!onlyInWindow)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                onlyInWindow
                  ? 'bg-white/10 text-white border-white/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              title="Si está activo, solo muestra sources cuya hora coincide ahora"
            >
              {onlyInWindow ? '✓ ' : ''}Solo en ventana
            </button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {data?.evaluated_at && (
              <span className="text-[10px] text-gray-500 font-mono ml-auto">
                evaluado {formatLocalTime(data.evaluated_at)}
              </span>
            )}
          </div>

          {data?.skipped_by_reason && Object.keys(data.skipped_by_reason).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.skipped_by_reason).map(([reason, count]) => {
                const meta = reasonMeta(reason);
                return (
                  <span
                    key={reason}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 ${meta.color}`}
                    title={reason}
                  >
                    {meta.label}: {count}
                  </span>
                );
              })}
            </div>
          )}

          {isLoading && !data ? (
            <div className="space-y-1">
              <Skeleton className="h-8 bg-white/5" />
              <Skeleton className="h-8 bg-white/5" />
              <Skeleton className="h-8 bg-white/5" />
            </div>
          ) : data?.sources.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={onlyInWindow ? 'Sin fuentes en ventana activa' : 'Sin fuentes programadas'}
              description={
                onlyInWindow
                  ? 'Ninguna fuente está en su ventana horaria ahora mismo. Desactiva el filtro para ver todas.'
                  : 'No hay fuentes programadas para este conjunto de criterios.'
              }
              className="p-6 sm:p-6"
            />
          ) : (
            <div className="overflow-x-auto -mx-3 px-3">
              <table className="min-w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/5 select-none">
                    <th className="py-1.5 pr-4 cursor-pointer hover:text-white" onClick={() => toggleSort('source_id')}>Source{sortIcon('source_id')}</th>
                    <th className="py-1.5 pr-3 cursor-pointer hover:text-white" onClick={() => toggleSort('tier')}>Tier{sortIcon('tier')}</th>
                    <th className="py-1.5 pr-3 cursor-pointer hover:text-white" onClick={() => toggleSort('frequency')}>Freq · hora UTC{sortIcon('frequency')}</th>
                    <th className="py-1.5 pr-4 cursor-pointer hover:text-white" onClick={() => toggleSort('reason')}>Razón{sortIcon('reason')}</th>
                    <th className="py-1.5 pr-3 cursor-pointer hover:text-white" onClick={() => toggleSort('next_eligible')} title="Cuándo el scheduler podría correr esta source otra vez (considera ventana + gap + backoff)">Próximo{sortIcon('next_eligible')}</th>
                    <th className="py-1.5 pr-3 cursor-pointer hover:text-white" onClick={() => toggleSort('hours_since_last_dispatch')} title="Cuándo fue la última vez que el dispatcher eligió esta fuente">Último dispatch{sortIcon('hours_since_last_dispatch')}</th>
                    <th className="py-1.5 pr-3 cursor-pointer hover:text-white" onClick={() => toggleSort('last_sync_result')} title="Resultado del último sync: OK / sin cambios remotos / lock / falló">Resultado{sortIcon('last_sync_result')}</th>
                    <th className="py-1.5 pr-3 cursor-pointer hover:text-white" onClick={() => toggleSort('min_gap_hours')} title="Gap mínimo entre dispatches — el scheduler NO redespacha hasta que pase este tiempo">Gap mín{sortIcon('min_gap_hours')}</th>
                    <th className="py-1.5 pr-3 cursor-pointer hover:text-white" onClick={() => toggleSort('backoff')} title="Si tiene ≥3 fallos consecutivos, el scheduler la bloquea hasta esta hora (backoff exponencial 6h→12h→24h)">Backoff{sortIcon('backoff')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    if (!data?.sources) return null;
                    const sorted = [...data.sources].sort((a, b) => {
                      let av: string | number = 0;
                      let bv: string | number = 0;
                      switch (sortKey) {
                        case 'source_id':                  av = a.source_id;                  bv = b.source_id;                  break;
                        case 'tier':                       av = a.tier;                       bv = b.tier;                       break;
                        case 'frequency':                  av = `${a.frequency}_${a.schedule_hour_utc}`; bv = `${b.frequency}_${b.schedule_hour_utc}`; break;
                        case 'reason':                     av = a.reason;                     bv = b.reason;                     break;
                        case 'hours_since_last_dispatch':  av = a.hours_since_last_dispatch ?? Infinity; bv = b.hours_since_last_dispatch ?? Infinity; break;
                        case 'last_sync_result':           av = a.last_sync_result ?? '';     bv = b.last_sync_result ?? '';     break;
                        case 'min_gap_hours':              av = a.min_gap_hours;              bv = b.min_gap_hours;              break;
                        case 'backoff':                    av = a.backoff_until ? new Date(a.backoff_until).getTime() : 0; bv = b.backoff_until ? new Date(b.backoff_until).getTime() : 0; break;
                        case 'next_eligible':              av = a.hours_until_eligible ?? Infinity; bv = b.hours_until_eligible ?? Infinity; break;
                      }
                      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
                      return sortDir === 'asc' ? cmp : -cmp;
                    });

                    return sorted.map((s) => {
                      const meta = reasonMeta(s.reason);
                      const ago = formatAgoOrFuture(s.hours_since_last_dispatch);
                      return (
                        <tr key={s.source_id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-1.5 pr-4 font-mono text-white">{s.source_id}</td>
                          <td className="py-1.5 pr-3">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${tierBadge(s.tier)}`}>
                              T{s.tier}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-gray-400 font-mono">
                            {s.frequency} · {String(s.schedule_hour_utc).padStart(2, '0')}:{String(s.schedule_minute_utc ?? 0).padStart(2, '0')}
                          </td>
                          <td className={`py-1.5 pr-4 ${meta.color}`}>{meta.label}</td>
                          <td className="py-1.5 pr-3 font-mono" title={s.next_eligible_at ? new Date(s.next_eligible_at).toLocaleString() : ''}>
                            {s.eligible_now ? (
                              <span className="text-emerald-400">ahora</span>
                            ) : s.hours_until_eligible != null ? (
                              <span className="text-blue-300">en {formatHoursCompact(s.hours_until_eligible)}</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 text-gray-400 font-mono">{ago}</td>
                          <td className="py-1.5 pr-3 font-mono">
                            {s.last_sync_result === 'success' && <span className="text-emerald-400">OK</span>}
                            {s.last_sync_result === 'failed' && <span className="text-red-400">falló</span>}
                            {s.last_sync_result === 'skipped_smart' && <span className="text-gray-400">sin cambios</span>}
                            {s.last_sync_result === 'skipped_lock' && <span className="text-yellow-400">lock</span>}
                            {!s.last_sync_result && <span className="text-gray-600">—</span>}
                          </td>
                          <td className="py-1.5 pr-3 text-gray-500 font-mono" title="Tiempo mínimo entre dispatches — evita re-dispatch en la misma ventana">
                            {formatHoursCompact(s.min_gap_hours)}
                          </td>
                          <td className="py-1.5 pr-3 font-mono">
                            {s.backoff_until ? (
                              (() => {
                                const until = new Date(s.backoff_until);
                                const remainingH = (until.getTime() - Date.now()) / 3_600_000;
                                return (
                                  <span
                                    className="text-red-400"
                                    title={`${s.consecutive_failures} fallos consecutivos · backoff de ${s.backoff_hours}h · hasta ${until.toLocaleString()}`}
                                  >
                                    {remainingH > 0 ? `${formatHoursCompact(remainingH)}` : 'expirado'} ({s.consecutive_failures} fails)
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SchedulerPreviewSection;
