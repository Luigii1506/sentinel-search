import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SyncSourceButton } from '@/components/SyncSourceButton';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type {
  JobsResponse,
  SourceInfo,
  SourceSummary,
  SourcesHealthOverviewResponse,
} from '@/types/api';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function freshnessLabel(lastSync?: string | null): { text: string; color: string } {
  if (!lastSync) return { text: 'Sin datos', color: 'text-gray-500' };
  const diffMs = Date.now() - new Date(lastSync).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return { text: '<1h', color: 'text-green-400' };
  if (hours < 24) return { text: `${hours}h`, color: 'text-green-400' };
  if (days <= 1) return { text: 'Hoy', color: 'text-green-400' };
  if (days <= 7) return { text: `${days}d`, color: 'text-green-400' };
  if (days <= 14) return { text: `${days}d`, color: 'text-yellow-400' };
  if (days <= 30) return { text: `${days}d`, color: 'text-orange-400' };
  return { text: `${days}d`, color: 'text-red-400' };
}

function HealthScoreBadge({ score, status }: { score?: number; status?: string }) {
  if (score == null) return null;
  const colorClass =
    status === 'healthy' ? 'bg-green-500/15 text-green-300 border-green-500/30' :
    status === 'warning' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
    status === 'critical' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
    'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border min-w-[40px] ${colorClass}`}>
      {score}
    </span>
  );
}


// Estado consolidado: usa health_status del backend como SINGLE SOURCE OF TRUTH.
// Combina freshness + failures + assertions con contexto real (no marca "error"
// por un fallo aislado si después se recuperó).
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    healthy: { label: 'Saludable', class: 'bg-green-500/10 text-green-400 border-green-500/20' },
    warning: { label: 'Atención', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    critical: { label: 'Crítico', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
    inactive: { label: 'Inactiva', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  };
  const c = config[status] || config.inactive;
  return <Badge variant="outline" className={`text-xs ${c.class}`}>{c.label}</Badge>;
}

type AuditSourceRow = SourceInfo & {
  audit_status: string;                  // === health_status del backend
  audit_last_sync?: string | null;
};

function deriveAuditStatus(source: SourceInfo): string {
  // Source of truth: health_status del backend.
  // Fallback a 'inactive' si el backend aún no lo devuelve.
  return source.health_status || (source.is_active === false ? 'inactive' : 'warning');
}

function deriveAuditLastSync(source: SourceInfo): string | null | undefined {
  return source.last_successful_sync
    || source.last_sync;
}

export function AuditPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'source_id' | 'last_sync' | 'bronze_count' | 'status'>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data: sourcesData, isLoading: sourcesLoading, refetch } = useQuery<SourceSummary>({
    queryKey: ['admin', 'sources', 'summary'],
    queryFn: () => adminService.getSourcesSummary(),
  });

  const { data: jobsData } = useQuery<JobsResponse>({
    queryKey: ['admin', 'jobs', 'audit'],
    queryFn: () => adminService.getJobs(20),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: disappearedData } = useQuery({
    queryKey: ['admin', 'sources', 'disappeared', 'audit'],
    queryFn: () => adminService.getDisappearedSources(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: lifecycleData } = useQuery({
    queryKey: ['admin', 'sources', 'lifecycle', 'events'],
    queryFn: () => adminService.getSourceLifecycleEvents(20),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: healthOverview } = useQuery<SourcesHealthOverviewResponse>({
    queryKey: ['admin', 'sources', 'health-overview'],
    queryFn: () => adminService.getSourcesHealthOverview(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const allSources = useMemo<AuditSourceRow[]>(() => {
    if (!sourcesData?.sources) return [];
    return sourcesData.sources.map((source) => {
      return {
        ...source,
        audit_status: deriveAuditStatus(source),
        audit_last_sync: deriveAuditLastSync(source),
      };
    });
  }, [sourcesData]);

  const sources = useMemo<AuditSourceRow[]>(() => {
    let filtered = allSources.filter((s) => {
      if (statusFilter !== 'all' && s.audit_status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.source_id.toLowerCase().includes(q) ||
          s.display_name.toLowerCase().includes(q) ||
          (s.country || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'source_id') cmp = a.source_id.localeCompare(b.source_id);
      else if (sortField === 'bronze_count') cmp = a.bronze_count - b.bronze_count;
      else if (sortField === 'last_sync') {
        const aTime = a.audit_last_sync ? new Date(a.audit_last_sync).getTime() : 0;
        const bTime = b.audit_last_sync ? new Date(b.audit_last_sync).getTime() : 0;
        cmp = aTime - bTime;
      } else if (sortField === 'status') {
        const order: Record<string, number> = { critical: 0, warning: 1, healthy: 2, inactive: 3 };
        cmp = (order[a.audit_status] ?? 4) - (order[b.audit_status] ?? 4);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [allSources, searchQuery, sortDir, sortField, statusFilter]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  if (sourcesLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-white/5" />
            ))}
          </div>
          <Skeleton className="h-96 bg-white/5" />
        </div>
      </div>
    );
  }

  const byStatus = allSources.reduce<Record<string, number>>((acc, source) => {
    acc[source.audit_status] = (acc[source.audit_status] || 0) + 1;
    return acc;
  }, {});
  const recentFailed = jobsData?.recent?.filter((j) => j.status === 'failed') || [];
  const disappearedMarked = disappearedData?.marked_disappeared || [];
  const lifecycleEvents = lifecycleData?.events || [];
  const monitoredSources = allSources.filter((source) => source.is_active !== false).length;
  // alertingSources removed (was unused, kept the filter inline elsewhere)
  void allSources.filter((source) => source.is_alerting).length;
  const inactiveSources = sourcesData?.sources?.filter((source) => source.is_active === false).length || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ClipboardList className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Auditoria de Datos</h1>
                <p className="text-gray-400 mt-1">
                  Frescura, estado y confiabilidad de las fuentes de datos
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </motion.div>

        {/* Zombie jobs banner (solo si hay) */}
        {healthOverview?.zombie_jobs && healthOverview.zombie_jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-red-300">
                  {healthOverview.zombie_jobs.length} jobs zombie detectados
                </h3>
                <p className="text-xs text-red-200/80 mt-1">
                  Marcados como "running" en DB pero sin worker ejecutándolos.
                  El cleanup automático los corrige en menos de 5 min.
                </p>
                <div className="mt-2 space-y-1">
                  {healthOverview.zombie_jobs.slice(0, 3).map((z) => (
                    <p key={z.job_id} className="text-xs text-red-200/90">
                      • <span className="font-mono">{z.source}</span> ({z.job_type || 'job'}) — hace {z.age_hours?.toFixed(1) || '?'}h
                    </p>
                  ))}
                  {healthOverview.zombie_jobs.length > 3 && (
                    <p className="text-xs text-red-200/70">
                      ...y {healthOverview.zombie_jobs.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cobertura 24h + Health buckets */}
        {healthOverview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"
          >
            {/* Cobertura 24h */}
            <Card className="bg-[#1a1a1a] border-white/5 lg:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Cobertura últimas 24h</span>
                  <span className={`text-xs font-medium ${
                    healthOverview.coverage_24h.coverage_pct >= 80 ? 'text-green-400' :
                    healthOverview.coverage_24h.coverage_pct >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {healthOverview.coverage_24h.coverage_pct}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">
                  {healthOverview.coverage_24h.synced_in_24h} <span className="text-base text-gray-500 font-normal">/ {healthOverview.coverage_24h.total_active_sources}</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      healthOverview.coverage_24h.coverage_pct >= 80 ? 'bg-green-400' :
                      healthOverview.coverage_24h.coverage_pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(healthOverview.coverage_24h.coverage_pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  fuentes activas sincronizadas en 24h
                </p>
              </CardContent>
            </Card>

            {/* Health buckets */}
            <Card className="bg-[#1a1a1a] border-white/5 lg:col-span-1">
              <CardContent className="p-4">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Estado de salud</span>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">{healthOverview.health_buckets.healthy}</div>
                    <p className="text-[10px] text-gray-500 uppercase">healthy</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-amber-400">{healthOverview.health_buckets.warning}</div>
                    <p className="text-[10px] text-gray-500 uppercase">warning</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-400">{healthOverview.health_buckets.critical}</div>
                    <p className="text-[10px] text-gray-500 uppercase">critical</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-zinc-500">{healthOverview.health_buckets.inactive}</div>
                    <p className="text-[10px] text-gray-500 uppercase">inactive</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Próximos syncs */}
            <Card className="bg-[#1a1a1a] border-white/5 lg:col-span-1">
              <CardContent className="p-4">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Próximos syncs</span>
                <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto">
                  {healthOverview.upcoming_syncs.slice(0, 4).map((u) => (
                    <div key={u.source_id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 truncate flex-1 mr-2" title={u.display_name}>
                        {u.source_id}
                      </span>
                      <span className="text-gray-500 flex-shrink-0">
                        {u.minutes_until < 60 ? `${u.minutes_until}m` : `${Math.floor(u.minutes_until / 60)}h`}
                      </span>
                    </div>
                  ))}
                  {healthOverview.upcoming_syncs.length === 0 && (
                    <p className="text-xs text-gray-500">Sin syncs próximos</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8"
        >
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Catalogo</span>
              </div>
              <div className="text-2xl font-bold text-white">{sourcesData?.total_registered || 0}</div>
              <p className="text-xs text-gray-500">{sourcesData?.total_with_data || 0} con datos</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-400">Monitoreadas</span>
              </div>
              <div className="text-2xl font-bold text-white">{monitoredSources}</div>
              <p className="text-xs text-gray-500">Con runtime health</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">Saludables</span>
              </div>
              <div className="text-2xl font-bold text-white">{byStatus.healthy || 0}</div>
              <p className="text-xs text-gray-500">Score ≥ 80</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-400">En atención</span>
              </div>
              <div className="text-2xl font-bold text-white">{byStatus.warning || 0}</div>
              <p className="text-xs text-gray-500">Stale o fallo reciente</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-gray-400">Críticas</span>
              </div>
              <div className="text-2xl font-bold text-white">{byStatus.critical || 0}</div>
              <p className="text-xs text-gray-500">Fallos consecutivos</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">Inactivas</span>
              </div>
              <div className="text-2xl font-bold text-white">{byStatus.inactive || inactiveSources}</div>
              <p className="text-xs text-gray-500">Fuera del scheduler</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Failed Jobs */}
        {recentFailed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Jobs Fallidos Recientes
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20">{recentFailed.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentFailed.slice(0, 6).map((job) => (
                <Card key={job.id} className="bg-[#1a1a1a] border-red-500/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{job.source}</span>
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                        Fallido
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(job.started_at)}</p>
                    {job.error_message && (
                      <p className="text-xs text-red-400/70 mt-1 truncate">{job.error_message}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-4 mb-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Buscar por fuente, nombre o pais..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-white/10 text-white"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-[#1a1a1a] border-white/10 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="warning">Atención</SelectItem>
              <SelectItem value="healthy">Saludable</SelectItem>
              <SelectItem value="inactive">Inactiva</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {(disappearedMarked.length > 0 || lifecycleEvents.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8"
          >
            <Card className="bg-[#1a1a1a] border-white/5">
              <CardContent className="p-4">
                <h2 className="text-base font-semibold text-white mb-3">Fuentes Desaparecidas</h2>
                <div className="space-y-2">
                  {disappearedMarked.length > 0 ? disappearedMarked.slice(0, 6).map((item: any) => (
                    <div key={item.source_id} className="rounded-lg bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-white font-medium">{item.source_id}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.updated_at)}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      {item.error_message && (
                        <p className="text-xs text-fuchsia-300/80 mt-2">{item.error_message}</p>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No hay fuentes marcadas como desaparecidas.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] border-white/5">
              <CardContent className="p-4">
                <h2 className="text-base font-semibold text-white mb-3">Eventos de Lifecycle</h2>
                <div className="space-y-2">
                  {lifecycleEvents.length > 0 ? lifecycleEvents.slice(0, 6).map((event: any) => (
                    <div key={event.id} className="rounded-lg bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-white font-medium">{event.source_id}</p>
                          <p className="text-xs text-gray-500">
                            {event.event_type} · {event.triggered_by} · {formatDate(event.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-white/5 text-gray-300 border-white/10">
                          {event.entity_source_id || 'source'}
                        </Badge>
                      </div>
                      {event.reason && (
                        <p className="text-xs text-gray-400 mt-2">{event.reason}</p>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No hay eventos recientes de lifecycle.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Sources Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gray-400" />
              Fuentes de Datos
              <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">{sources.length}</Badge>
            </h2>
          </div>

          <div className="space-y-3 md:hidden">
            {sources.map((source, index) => {
              const freshness = freshnessLabel(source.audit_last_sync);
              return (
                <motion.div
                  key={source.source_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                >
                  <Card className="bg-[#1a1a1a] border-white/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white break-words">{source.source_id}</p>
                          <p className="text-xs text-gray-500 break-words">{source.display_name}</p>
                        </div>
                        <StatusBadge status={source.audit_status} />
                      </div>
                      {source.stale_reason && (
                        <div className="flex items-center gap-2">
                          <HealthScoreBadge score={source.health_score} status={source.health_status} />
                          <p className="text-xs text-gray-400 break-words flex-1">{source.stale_reason}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Categoria</p>
                          <p className="text-gray-300">{source.category || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Records</p>
                          <p className="text-gray-300 font-mono">{source.bronze_count.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Ultimo Sync</p>
                          <p className="text-gray-300">{formatDate(source.audit_last_sync)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Frescura</p>
                          <p className={`font-medium ${freshness.color}`}>{freshness.text}</p>
                        </div>
                      </div>
                      {source.is_active !== false && source.is_historical !== true && (
                        <div className="pt-2 border-t border-white/5">
                          <SyncSourceButton
                            sourceId={source.source_id}
                            invalidateKeys={[['admin', 'sources'], ['admin', 'jobs'], ['operations']]}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Card className="hidden md:block bg-[#1a1a1a] border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th
                      className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('source_id')}
                    >
                      Fuente <SortIcon field="source_id" />
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4">
                      Categoria
                    </th>
                    <th
                      className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('status')}
                    >
                      Estado <SortIcon field="status" />
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4">
                      Salud
                    </th>
                    <th
                      className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('bronze_count')}
                    >
                      Records <SortIcon field="bronze_count" />
                    </th>
                    <th
                      className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('last_sync')}
                    >
                      Ultimo Sync <SortIcon field="last_sync" />
                    </th>
                    <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4">
                      Frescura
                    </th>
                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sources.map((source, index) => {
                    const freshness = freshnessLabel(source.audit_last_sync);
                    return (
                      <motion.tr
                        key={source.source_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.01, 0.5) }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">{source.source_id}</p>
                            <p className="text-xs text-gray-500">{source.display_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">{source.category}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={source.audit_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <HealthScoreBadge score={source.health_score} status={source.health_status} />
                            {source.stale_reason && (
                              <span className="text-xs text-gray-400 truncate max-w-[220px]" title={source.stale_reason}>
                                {source.stale_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-300 font-mono">
                            {source.bronze_count.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">
                            {formatDate(source.audit_last_sync)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-medium ${freshness.color}`}>
                            {freshness.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {source.is_active !== false && source.is_historical !== true && (
                            <SyncSourceButton
                              sourceId={source.source_id}
                              invalidateKeys={[['admin', 'sources'], ['admin', 'jobs'], ['operations']]}
                            />
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sources.length === 0 && (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No se encontraron fuentes con los filtros aplicados</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default AuditPage;
