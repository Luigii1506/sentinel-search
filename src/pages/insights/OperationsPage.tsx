/**
 * OperationsPage — Vista source-centric (rediseño completo).
 *
 * Inspirado en GitHub Actions / Vercel deployments.
 * Una sola lista de fuentes; cada una con su estado en vivo:
 *   - Si corriendo: stage actual + elapsed real-time
 *   - Si recién terminó: resultado (success/failed/skip) + records
 *   - Si stale/never: razón clara
 *
 * Auto-refresh inteligente:
 *   - 3s si hay alguna fuente running (ves stage avanzar en vivo)
 *   - 30s si todo está idle
 *
 * Sin tablas separadas — una sola "fuente de verdad" por source.
 */
import { Suspense, lazy, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Filter,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService } from '@/services/admin';
import { SyncSourceButton } from '@/components/SyncSourceButton';
import { AppPage, PageHeader, ListPageSkeleton, StatusPill, EmptyState, HealthDot, MetricCard, PanelSkeleton } from '@/components/foundation';
import type {
  MonitoringOverviewResponse,
  OperationsSummaryResponse,
  SourceActivityResponse,
  SourceActivityEntry,
  SourceRunsResponse,
  PipelineProgressResponse,
  PipelineLayerProgress,
} from '@/types/api';

const SchedulerPreviewSection = lazy(() => import('@/components/operations/SchedulerPreviewSection'));

// ── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatAgo(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function formatUntil(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `en ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `en ${hours}h`;
  return `en ${Math.floor(hours / 24)}d`;
}

function formatAgoOrFuture(hours: number | null | undefined): string {
  if (hours == null) return '—';
  if (hours < 0) return `en ${Math.abs(hours).toFixed(1)}h`;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatNumber(n: number | null | undefined): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatLocalTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Source row component ───────────────────────────────────────────────

const STATE_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  running: { icon: Loader2, color: 'text-blue-600 dark:text-blue-400', bg: 'border-blue-500/20 bg-blue-500/5', label: 'corriendo' },
  recent_failed: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'border-red-500/20 bg-red-500/5', label: 'falló' },
  stale: { icon: AlertTriangle, color: 'text-amber-700 dark:text-amber-400', bg: 'border-amber-500/15 bg-amber-500/5', label: 'desactualizada' },
  healthy: { icon: CheckCircle2, color: 'text-green-700 dark:text-green-400', bg: 'border-green-500/15 bg-green-500/5', label: 'saludable' },
  never: { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'border-zinc-500/20 bg-zinc-500/5', label: 'sin sync' },
  idle: { icon: Clock, color: 'text-muted-foreground', bg: 'border-foreground/5 bg-transparent', label: 'idle' },
};

function tierBadge(tier: number) {
  const colors: Record<number, string> = {
    1: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30',
    2: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    3: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
    4: 'bg-gray-500/15 text-muted-foreground border-gray-500/30',
  };
  return colors[tier] || colors[4];
}

// ── Historial expandible ────────────────────────────────────────────────

function SourceRunsHistory({ sourceId }: { sourceId: string }) {
  const { data, isLoading } = useQuery<SourceRunsResponse>({
    queryKey: ['source-runs', sourceId],
    queryFn: () => adminService.getSourceRuns(sourceId, 10),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  if (isLoading) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 inline animate-spin mr-1" /> Cargando historial…
      </div>
    );
  }

  if (!data || data.runs.length === 0) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground">
        Sin runs registrados para esta fuente.
      </div>
    );
  }

  return (
    <div className="px-3 py-2 bg-black/30">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        Últimos {data.runs.length} runs
      </p>
      <div className="space-y-1">
        {data.runs.map((r) => {
          const statusIcon =
            r.status === 'success' ? '✓' :
            r.status === 'failed' ? '✕' :
            r.status === 'running' ? '⚙' : '⊘';
          const statusColor =
            r.status === 'success' ? 'text-green-700 dark:text-green-400' :
            r.status === 'failed' ? 'text-red-600 dark:text-red-400' :
            r.status === 'running' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground';

          const parts: string[] = [];
          if (r.records_processed) parts.push(`${formatNumber(r.records_processed)} procesados`);
          if (r.records_inserted) parts.push(`+${formatNumber(r.records_inserted)} nuevos`);
          if (r.records_updated) parts.push(`~${formatNumber(r.records_updated)} cambiaron`);
          const summary =
            r.is_skip ? 'sin cambios (skip)' :
            (parts.length > 0 ? parts.join(' · ') :
              r.status === 'running' ? 'corriendo…' :
              r.status === 'failed' ? 'falló' :
              'sin actividad');

          return (
            <div key={r.id} className="grid grid-cols-12 gap-2 text-[11px] py-1.5 px-2 rounded hover:bg-foreground/5">
              {/* Status */}
              <div className={`col-span-1 ${statusColor} text-center font-mono`}>{statusIcon}</div>

              {/* Inicio */}
              <div className="col-span-3">
                <p className="text-muted-foreground font-mono">{formatLocalTime(r.started_at)}</p>
                <p className="text-muted-foreground text-[10px]">inicio</p>
              </div>

              {/* Fin */}
              <div className="col-span-3">
                <p className="text-muted-foreground font-mono">
                  {r.completed_at ? formatLocalTime(r.completed_at) : '—'}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {r.completed_at ? 'fin' : (r.status === 'running' ? 'aún corriendo' : '—')}
                </p>
              </div>

              {/* Duración */}
              <div className="col-span-2 text-right">
                <p className="text-muted-foreground font-mono">{formatDuration(r.duration_seconds)}</p>
                <p className="text-muted-foreground text-[10px]">duración</p>
              </div>

              {/* Resumen */}
              <div className="col-span-3 min-w-0">
                <p className={`${statusColor} text-[11px]`}>{summary}</p>
                {r.error_message && (
                  <details className="text-red-600 dark:text-red-300/70 text-[10px] group mt-0.5">
                    <summary className="cursor-pointer list-none hover:text-red-300 line-clamp-1 group-open:line-clamp-none break-words">
                      {r.error_message}
                    </summary>
                    <pre className="mt-1 px-2 py-1 rounded bg-red-950/30 border border-red-900/30 text-red-200/90 text-[10px] whitespace-pre-wrap break-words font-mono max-h-32 overflow-y-auto">
                      {r.error_message}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── PipelineProgressBar (4 fases: bronze · silver · gold · opensearch) ──

const PIPELINE_LAYERS: Array<{ key: 'bronze' | 'silver' | 'gold' | 'opensearch'; short: string }> = [
  { key: 'bronze',     short: 'BR' },
  { key: 'silver',     short: 'SV' },
  { key: 'gold',       short: 'GD' },
  { key: 'opensearch', short: 'OS' },
];

function formatLayerCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function LayerDot({ layer, data }: { layer: typeof PIPELINE_LAYERS[number]; data: PipelineLayerProgress }) {
  // Color por status
  const baseColor =
    data.status === 'running'  ? 'bg-blue-500 border-blue-400 animate-pulse'
    : data.status === 'complete' ? 'bg-emerald-500/80 border-emerald-400'
    : 'bg-foreground/5 border-foreground/10';

  const labelColor =
    data.status === 'running'  ? 'text-blue-600 dark:text-blue-300'
    : data.status === 'complete' ? 'text-emerald-700 dark:text-emerald-300/80'
    : 'text-muted-foreground';

  // Info visible bajo el dot — counts/% (no solo tooltip)
  const visibleInfo: React.ReactNode = (() => {
    if (data.status === 'pending') return <span className="text-[9px] text-muted-foreground">—</span>;
    if (data.percent != null) {
      return (
        <span className={`text-[9px] font-mono ${labelColor}`}>
          {data.percent.toFixed(0)}%
        </span>
      );
    }
    if (data.processed != null) {
      return (
        <span className={`text-[9px] font-mono ${labelColor}`}>
          {formatLayerCount(data.processed)}
        </span>
      );
    }
    return <span className="text-[9px] text-muted-foreground">—</span>;
  })();

  // Tooltip con detalle completo
  const tooltip =
    `${layer.key.toUpperCase()} · ${data.status}` +
    (data.processed != null ? `\n${data.processed.toLocaleString()} procesados` : '') +
    (data.expected != null ? `\n${data.expected.toLocaleString()} esperados` : '') +
    (data.percent != null ? `\n${data.percent}%` : '');

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[40px]" title={tooltip}>
      <div className={`w-2.5 h-2.5 rounded-full border ${baseColor}`} />
      <span className={`text-[9px] font-mono ${labelColor}`}>{layer.short}</span>
      {visibleInfo}
    </div>
  );
}

function PipelineProgressBar({ sourceId, isRunning }: { sourceId: string; isRunning: boolean }) {
  // Poll cada 3s mientras está running. Backend cachea 30s así que no satura DB.
  const { data } = useQuery<PipelineProgressResponse>({
    queryKey: ['pipeline-progress', sourceId],
    queryFn: () => adminService.getPipelineProgress(sourceId),
    enabled: isRunning,
    refetchInterval: isRunning ? 3000 : false,
    staleTime: 2000,
  });

  if (!data) {
    return null;
  }

  // Capa actual con barra de %
  const activeLayer = PIPELINE_LAYERS.find((l) => data[l.key].status === 'running');
  const activeProgress = activeLayer ? data[activeLayer.key] : null;

  return (
    <div className="mt-1.5 space-y-1.5">
      {/* Pipeline dots */}
      <div className="flex items-center gap-2">
        {PIPELINE_LAYERS.map((layer, idx) => (
          <div key={layer.key} className="flex items-center gap-2">
            <LayerDot layer={layer} data={data[layer.key]} />
            {idx < PIPELINE_LAYERS.length - 1 && (
              <div
                className={`h-px w-4 ${
                  data[PIPELINE_LAYERS[idx + 1].key].status !== 'pending'
                    ? 'bg-emerald-500/40'
                    : 'bg-foreground/10'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Barra de % de la capa activa (silver o gold típicamente) */}
      {activeLayer && activeProgress && activeProgress.percent != null && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px] font-mono gap-2">
            <span className="text-blue-600 dark:text-blue-300 whitespace-nowrap">
              {activeLayer.key} {activeProgress.percent.toFixed(1)}%
              {data.chunk_number != null && (
                <span className="text-blue-600 dark:text-blue-400/60 ml-1.5">· chunk {data.chunk_number}</span>
              )}
            </span>
            <span className="text-muted-foreground">
              {activeProgress.processed?.toLocaleString() ?? '—'}
              {activeProgress.expected != null && ` / ${activeProgress.expected.toLocaleString()} records`}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-foreground/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
              style={{ width: `${activeProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Si está running pero no tenemos % (bronze sin denominator), mostrar solo records */}
      {activeLayer && activeProgress && activeProgress.percent == null && activeProgress.processed != null && (
        <div className="text-[10px] font-mono text-blue-600 dark:text-blue-300">
          {activeLayer.key} · {activeProgress.processed.toLocaleString()} records procesados
        </div>
      )}
    </div>
  );
}


function SourceRow({ source, onDispatched }: { source: SourceActivityEntry; onDispatched?: () => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const meta = STATE_META[source.state] || STATE_META.idle;
  const Icon = meta.icon;

  // ── Sub-info según estado ─────────────────────
  let subInfo: React.ReactNode = null;

  if (source.state === 'running' && source.current_stage) {
    const s = source.current_stage;
    subInfo = (
      <div className="space-y-0.5">
        <p className="text-xs text-blue-600 dark:text-blue-300 font-mono">
          {s.step}{s.cursor && <span className="text-muted-foreground ml-1">· {s.cursor}</span>}
        </p>
        <p className="text-[11px] text-muted-foreground">
          corriendo {formatDuration(s.elapsed_seconds)}
        </p>
      </div>
    );
  } else if (source.last_run) {
    const r = source.last_run;
    if (r.status === 'failed') {
      subInfo = (
        <div className="space-y-0.5">
          <p className="text-xs text-red-600 dark:text-red-300/90">
            falló {formatAgo(r.minutes_ago)} · duración {formatDuration(r.duration_seconds)}
          </p>
          {r.error_message && (
            <details className="text-[11px] text-red-600 dark:text-red-300/70 group">
              <summary className="cursor-pointer list-none flex items-start gap-1 hover:text-red-300">
                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 transition-transform group-open:rotate-90" />
                <span className="line-clamp-1 group-open:line-clamp-none break-words">
                  {r.error_message}
                </span>
              </summary>
              <pre className="mt-1 ml-4 px-2 py-1.5 rounded bg-red-950/30 border border-red-900/30 text-red-200/90 text-[10px] whitespace-pre-wrap break-words font-mono max-h-48 overflow-y-auto">
                {r.error_message}
              </pre>
            </details>
          )}
        </div>
      );
    } else if (r.is_skip || (r.records_processed === 0 && r.records_inserted === 0 && r.records_updated === 0)) {
      subInfo = (
        <p className="text-xs text-muted-foreground">
          {r.is_skip ? 'omitido' : 'sin cambios'} {formatAgo(r.minutes_ago)} · duración {formatDuration(r.duration_seconds)}
        </p>
      );
    } else {
      const parts: string[] = [];
      if (r.records_inserted) parts.push(`+${formatNumber(r.records_inserted)} nuevos`);
      if (r.records_updated) parts.push(`~${formatNumber(r.records_updated)} cambiaron`);
      if (r.records_processed && !parts.length) parts.push(`${formatNumber(r.records_processed)} procesados`);
      subInfo = (
        <p className="text-xs text-muted-foreground">
          {formatAgo(r.minutes_ago)} · {parts.join(' · ') || 'completado'} · {formatDuration(r.duration_seconds)}
        </p>
      );
    }
  } else if (source.state === 'never') {
    subInfo = (
      <p className="text-xs text-muted-foreground">
        Nunca sincronizada · {source.schedule_frequency || 'sin schedule'}
      </p>
    );
  }

  // Próximo sync (solo si no está corriendo)
  let nextInfo: React.ReactNode = null;
  if (source.state !== 'running' && source.next_due_minutes != null && source.next_due_minutes > 0) {
    nextInfo = (
      <span className="text-[11px] text-muted-foreground font-mono">
        próximo {formatUntil(source.next_due_minutes)}
      </span>
    );
  }

  // Scheduler dispatch state (Fase A) — qué decidió el dispatcher la última vez.
  // Permite distinguir success real de skip (smart-update no bajó nada).
  let dispatchInfo: React.ReactNode = null;
  if (source.hours_since_last_dispatch != null && source.last_sync_result) {
    const result = source.last_sync_result;
    const resultColor =
      result === 'failed'        ? 'text-red-600 dark:text-red-400'
      : result === 'skipped_lock'  ? 'text-yellow-700 dark:text-yellow-400'
      : result === 'skipped_smart' ? 'text-muted-foreground'
      : result === 'success'       ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-muted-foreground';
    const resultLabel =
      result === 'skipped_smart' ? 'sin cambios remotos'
      : result === 'skipped_lock'  ? 'omitido (lock)'
      : result === 'success'       ? 'OK'
      : result === 'failed'        ? 'falló'
      : result;
    const ago = formatAgoOrFuture(source.hours_since_last_dispatch);
    dispatchInfo = (
      <span className={`text-[11px] font-mono ${resultColor}`} title={`Última decisión del dispatcher hace ${ago} → ${result}`}>
        dispatch {ago} · {resultLabel}
      </span>
    );
  }

  // OS metadata: cuándo cambió realmente el contenido en OpenSanctions
  // (F2 smart-update). Solo aplica a sources con provider='opensanctions'.
  // Útil para entender por qué hubo o no skip en el último Beat tick.
  let osInfo: React.ReactNode = null;
  if (source.provider === 'opensanctions' && source.os_last_change) {
    const date = new Date(source.os_last_change);
    const daysAgo = (Date.now() - date.getTime()) / 86_400_000;
    const ageStr = daysAgo < 1
      ? 'hoy'
      : daysAgo < 30
        ? `hace ${Math.round(daysAgo)}d`
        : `hace ${Math.round(daysAgo / 30)}m`;
    osInfo = (
      <span
        className="text-[10px] font-mono text-purple-600 dark:text-purple-300/70"
        title={`OpenSanctions reporta último cambio real ${ageStr} (${source.os_last_change})`}
      >
        OS {ageStr}
      </span>
    );
  }

  return (
    <div className={`rounded border ${meta.bg} hover:border-foreground/15 transition-colors overflow-hidden`}>
      <div className="flex items-center gap-3 py-3 px-3">
        {/* Caret expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title={expanded ? 'Colapsar' : 'Expandir historial'}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Estado icono */}
        <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color} ${source.state === 'running' ? 'animate-spin' : ''}`} />

        {/* Tier badge */}
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${tierBadge(source.tier)} flex-shrink-0`}>
          T{source.tier}
        </span>

        {/* Source name + sub-info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-foreground">{source.source_id}</span>
            <span className="text-[10px] text-muted-foreground">{source.schedule_frequency || ''}</span>
            {nextInfo}
            {dispatchInfo}
            {osInfo}
          </div>
          {subInfo && <div className="mt-0.5">{subInfo}</div>}
          {/* Pipeline progress visual — solo durante running (Fase B+ del plan) */}
          {source.state === 'running' && (
            <PipelineProgressBar sourceId={source.source_id} isRunning={true} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {source.state !== 'running' && source.is_active && !source.is_historical && (
            <SyncSourceButton
              sourceId={source.source_id}
              invalidateKeys={[['operations'], ['source-runs', source.source_id], ['admin', 'sources']]}
              onDispatched={onDispatched}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/admin/sources?focus=${source.source_id}`)}
            title="Ver en /admin/sources"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Historial expandible */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-foreground/5"
          >
            <SourceRunsHistory sourceId={source.source_id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────

export function OperationsPage() {
  const [filter, setFilter] = useState<'active' | 'running' | 'failing' | 'critical' | 'all'>('active');
  const [tierFilter, setTierFilter] = useState<1 | 2 | 3 | 4 | null>(null);
  // Marca de la última vez que el usuario disparó un sync. Mientras esté
  // dentro de la ventana de 30s, refetch agresivo (2s) para que el operador
  // VEA el job arrancar inmediatamente, no después de 30s del ciclo normal.
  const [lastTriggerAt, setLastTriggerAt] = useState<number>(0);

  const { data: activity, isLoading, refetch, dataUpdatedAt } = useQuery<SourceActivityResponse>({
    queryKey: ['operations', 'sources-activity', filter, tierFilter],
    queryFn: () => adminService.getSourcesActivity({
      filter,
      tier: tierFilter ?? undefined,
      limit: 100,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => {
      const runningCount = (q.state.data?.counts?.running ?? 0);
      const recentTrigger = Date.now() - lastTriggerAt < 30_000;
      if (runningCount > 0) return 2500;       // hay sync → 2.5s
      if (recentTrigger) return 1500;          // trigger reciente → 1.5s
      return 30000;                             // idle → 30s
    },
    staleTime: 1000,
    refetchOnWindowFocus: true,
  });

  // Overview para infra footer (services, snapshots)
  const { data: overview } = useQuery<MonitoringOverviewResponse>({
    queryKey: ['operations', 'overview'],
    queryFn: () => adminService.getMonitoringOverview(),
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Infra summary: skip rate, queue depths, workers
  const { data: opsSummary } = useQuery<OperationsSummaryResponse>({
    queryKey: ['operations', 'summary'],
    queryFn: () => adminService.getOperationsSummary(),
    refetchInterval: 30000,
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const isActivityPending = isLoading && !activity;
  const sources = activity?.sources || [];
  const counts = activity?.counts || {};
  const services = overview?.system_health?.services as any;
  const snapshotsHealth = overview?.snapshots_health;

  // System status derivado de counts
  const runningCount = counts.running || 0;
  const recentFailedCount = counts.recent_failed || 0;
  const staleCount = counts.stale || 0;
  const neverCount = counts.never || 0;

  // ── Filtros (segmented control) ───────────────
  const filterOptions: { key: typeof filter; label: string; count?: number; color?: string }[] = useMemo(() => [
    { key: 'active', label: 'Activas', count: undefined },
    { key: 'running', label: 'Corriendo', count: runningCount, color: 'blue' },
    { key: 'failing', label: 'Fallando', count: recentFailedCount, color: 'red' },
    { key: 'critical', label: 'Críticas', count: undefined, color: 'amber' },
    { key: 'all', label: 'Todas' },
  ], [runningCount, recentFailedCount]);

  const dataAge = dataUpdatedAt ? Math.floor((Date.now() - dataUpdatedAt) / 1000) : 0;
  const recentTriggerWindow = Date.now() - lastTriggerAt < 30_000;
  const refreshRate = runningCount > 0 ? '2.5s' : recentTriggerWindow ? '1.5s' : '30s';
  const statusSummaryCards: Array<{
    label: string;
    value: string | number;
    icon: typeof CheckCircle2;
    accent?: 'success' | 'red' | 'amber';
  }> = isActivityPending
    ? [
        { label: 'saludables', value: '—', icon: CheckCircle2 },
        { label: 'corriendo', value: '—', icon: Loader2 },
        { label: 'fallaron', value: '—', icon: XCircle },
        { label: 'desactualizadas', value: '—', icon: AlertTriangle },
        { label: 'sin sync', value: '—', icon: Clock },
      ]
    : [
        { label: 'saludables', value: counts.healthy || 0, accent: 'success', icon: CheckCircle2 },
        { label: 'corriendo', value: runningCount, icon: Loader2 },
        { label: 'fallaron', value: recentFailedCount, accent: 'red', icon: XCircle },
        { label: 'desactualizadas', value: staleCount, accent: 'amber', icon: AlertTriangle },
        { label: 'sin sync', value: neverCount, icon: Clock },
      ];

  return (
    <AppPage spacing="compact">
      <PageHeader
        title="Operaciones"
        description={
          isActivityPending
            ? 'Cargando estado operativo de las fuentes…'
            : `${sources.length} fuentes · actualizado hace ${dataAge}s · auto-refresh ${refreshRate}`
        }
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
        actions={
          <>
            {runningCount > 0 && (
              <StatusPill kind="running" label={`${runningCount} corriendo`} size="sm" />
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </>
        }
      />

        {/* ── Infra Summary Card ─────────────────────────────── */}
        {opsSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 rounded-lg bg-foreground/[0.02] border border-foreground/5">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Skip rate 7d</span>
              <span className="text-lg font-mono text-emerald-700 dark:text-emerald-400">
                {(opsSummary.execution_stats_7d?.skip_rate_pct ?? 0).toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {opsSummary.execution_stats_7d?.skipped ?? 0} de {(opsSummary.execution_stats_7d?.total_runs ?? 0) - (opsSummary.execution_stats_7d?.running ?? 0)} terminados
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Success rate</span>
              <span className="text-lg font-mono text-blue-600 dark:text-blue-400">
                {(opsSummary.execution_stats_7d?.success_rate_pct ?? 0).toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {opsSummary.execution_stats_7d?.success ?? 0} success
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Failure rate</span>
              <span className={`text-lg font-mono ${(opsSummary.execution_stats_7d?.failure_rate_pct ?? 0) > 10 ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                {(opsSummary.execution_stats_7d?.failure_rate_pct ?? 0).toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {opsSummary.execution_stats_7d?.failed ?? 0} failed
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Workers</span>
              <span className="text-lg font-mono text-cyan-700 dark:text-cyan-400">
                {opsSummary.workers?.count ?? '?'}
              </span>
              <span className="text-[10px] text-muted-foreground truncate" title={(opsSummary.workers?.names ?? []).join(', ')}>
                {(opsSummary.workers?.names ?? []).map((n: string) => n.split('@')[0]).slice(0, 2).join(', ') || '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Queues</span>
              <span className="text-lg font-mono text-purple-600 dark:text-purple-400">
                {Object.values(opsSummary.queues || {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) as number}
              </span>
              <span className="text-[10px] text-muted-foreground" title={JSON.stringify(opsSummary.queues)}>
                default:{opsSummary.queues?.default ?? '?'} xl:{opsSummary.queues?.xl ?? '?'}
              </span>
            </div>
          </div>
        ) : (
          <PanelSkeleton lines={3} className="rounded-lg" />
        )}

        {/* ── Filtros: state + tier (combinables) ─────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {filterOptions.map((opt) => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-foreground/10 text-foreground border border-foreground/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-transparent'
                }`}
              >
                {opt.label}
                {opt.count != null && opt.count > 0 && (
                  <span className={`ml-1.5 text-[10px] font-mono ${
                    opt.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    opt.color === 'red' ? 'text-red-600 dark:text-red-400' :
                    opt.color === 'amber' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
                  }`}>
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Separador */}
          <div className="h-5 w-px bg-foreground/10 mx-1" />

          {/* Filtro por tier */}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Tier:</span>
          <button
            onClick={() => setTierFilter(null)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              tierFilter === null
                ? 'bg-foreground/10 text-foreground border border-foreground/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-transparent'
            }`}
          >
            Todos
          </button>
          {[1, 2, 3, 4].map((t) => {
            const active = tierFilter === t;
            const tColor =
              t === 1 ? 'red' : t === 2 ? 'amber' : t === 3 ? 'blue' : 'gray';
            return (
              <button
                key={t}
                onClick={() => setTierFilter(t as 1 | 2 | 3 | 4)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors border ${
                  active
                    ? (
                      tColor === 'red' ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/40' :
                      tColor === 'amber' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40' :
                      tColor === 'blue' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/40' :
                      'bg-gray-500/15 text-muted-foreground border-gray-500/40'
                    )
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 border-transparent'
                }`}
                title={
                  t === 1 ? 'Sanciones críticas / Fugitivos' :
                  t === 2 ? 'Enforcement / Debarments' :
                  t === 3 ? 'PEPs / Compliance' :
                  'Investigación / Otros'
                }
              >
                T{t}
              </button>
            );
          })}
        </div>

        {/* ── Lista de sources ──────────────────────────────────── */}
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1.5"
        >
          {isActivityPending ? (
            <ListPageSkeleton spacing="compact" showMetrics={false} rowCount={8} rowHeightClassName="h-16" />
          ) : sources.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Sin fuentes para este filtro"
              description={`No hay fuentes que coincidan con "${filter}".`}
              tone="success"
            />
          ) : (
            sources.map((s) => (
              <SourceRow
                key={s.source_id}
                source={s}
                onDispatched={() => setLastTriggerAt(Date.now())}
              />
            ))
          )}
        </motion.div>

        {/* ── Resumen por estado ───────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 pt-2">
          {statusSummaryCards.map((s) => (
            <MetricCard
              key={s.label}
              label={s.label}
              value={s.value}
              icon={s.icon}
              accent={s.accent}
              className="bg-foreground/5 border-foreground/10"
            />
          ))}
        </div>

        {/* ── Scheduler diagnostic (Fase A+B del plan scheduler) ─ */}
        <Suspense fallback={<PanelSkeleton lines={6} className="min-h-[220px]" />}>
          <SchedulerPreviewSection />
        </Suspense>

        {/* ── Infra footer ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-foreground/5">
          <span className="text-muted-foreground mr-2">Infraestructura:</span>
          {services && [
            { name: 'API', icon: Zap, ok: services.api?.status === 'ok' },
            { name: 'PG', icon: Database, ok: services.database?.status === 'ok', latency: services.database?.latency_ms },
            { name: 'Redis', icon: HardDrive, ok: services.redis?.status === 'ok' },
            { name: 'OS', icon: Server, ok: services.opensearch?.status === 'ok' },
          ].map((svc) => {
            const SvcIcon = svc.icon;
            return (
              <HealthDot
                key={svc.name}
                status={svc.ok ? 'ok' : 'error'}
                label={svc.name}
                icon={SvcIcon}
                detail={svc.latency != null ? `${svc.latency}ms` : undefined}
                className={`px-2 py-1 rounded border text-xs ${svc.ok ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/30 bg-red-500/10'}`}
              />
            );
          })}
          {snapshotsHealth?.snapshots && snapshotsHealth.snapshots.length > 0 && (
            <>
              <span className="text-muted-foreground ml-2">Snapshots:</span>
              {snapshotsHealth.snapshots.map((snap) => (
                <HealthDot
                  key={snap.scope}
                  status={snap.status === 'ok' ? 'ok' : snap.status === 'stale' ? 'warning' : 'error'}
                  label={snap.scope}
                  title={snap.computed_at || ''}
                  className={`px-2 py-1 rounded border text-xs ${
                    snap.status === 'ok' ? 'border-green-500/20 bg-green-500/5' :
                    snap.status === 'stale' ? 'border-amber-500/30 bg-amber-500/10' :
                    'border-red-500/30 bg-red-500/10'
                  }`}
                />
              ))}
            </>
          )}
        </div>
    </AppPage>
  );
}

export default OperationsPage;
