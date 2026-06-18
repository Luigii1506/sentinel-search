import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Search,
  User,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
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
import {
  AppPage,
  PageHeader,
  EmptyState,
  DataTable,
  MetricCard,
  SkeletonTable,
  type DataTableColumn,
} from '@/components/foundation';
import { activityLogService, type AuditLogEntry } from '@/services/activityLog';
import { cn } from '@/lib/utils';

function statusBadgeClasses(code: number | null): string {
  if (code === null) return 'bg-secondary text-muted-foreground border-border/40';
  if (code >= 500)   return 'bg-red-500/10 text-red-200 border-red-500/30';
  if (code === 402)  return 'bg-amber-500/10 text-amber-200 border-amber-500/30';
  if (code === 401 || code === 403) return 'bg-orange-500/10 text-orange-200 border-orange-500/30';
  if (code >= 400)   return 'bg-amber-500/10 text-amber-200 border-amber-500/30';
  return 'bg-green-500/10 text-green-200 border-green-500/30';
}

function statusIcon(code: number | null) {
  if (code === null) return Clock;
  if (code >= 500)   return XCircle;
  if (code >= 400)   return AlertCircle;
  return CheckCircle2;
}

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-electric-500/10 text-electric-200 border-electric-500/30',
  POST:   'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
  PATCH:  'bg-amber-500/10 text-amber-200 border-amber-500/30',
  PUT:    'bg-amber-500/10 text-amber-200 border-amber-500/30',
  DELETE: 'bg-red-500/10 text-red-200 border-red-500/30',
};

const LIMIT_OPTIONS = [50, 100, 200, 500];

export function ActivityLogPage() {
  const [usernameFilter, setUsernameFilter] = useState('');
  const [endpointFilter, setEndpointFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [limit, setLimit] = useState(100);

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['activity-log', { usernameFilter, endpointFilter, methodFilter, limit }],
    queryFn: () =>
      activityLogService.list({
        username: usernameFilter.trim() || undefined,
        endpoint: endpointFilter.trim() || undefined,
        method: methodFilter !== 'all' ? (methodFilter as 'GET') : undefined,
        limit,
      }),
    refetchOnWindowFocus: false,
  });

  const stats = logs ? aggregate(logs) : null;

  // ──────────── Column definitions for DataTable ────────────
  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      id: 'when',
      header: 'Cuando',
      cell: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(row.timestamp), { addSuffix: true, locale: es })}
        </span>
      ),
    },
    {
      id: 'user',
      header: 'Usuario',
      primary: true,
      cell: (row) => (
        <span className="text-xs">
          <span className="text-foreground font-medium">
            {row.username ?? <span className="text-muted-foreground">anónimo</span>}
          </span>
        </span>
      ),
    },
    {
      id: 'auth',
      header: 'Auth',
      hideOnMobile: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{row.auth_method ?? '—'}</span>,
    },
    {
      id: 'method',
      header: 'Método',
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn('text-[10px]', METHOD_COLOR[row.action] ?? 'bg-secondary text-muted-foreground border-border')}
        >
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'endpoint',
      header: 'Endpoint',
      cell: (row) => (
        <code className="font-mono text-xs text-electric-300 break-all">{row.endpoint}</code>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'right',
      cell: (row) => {
        const StatusIcon = statusIcon(row.status_code);
        return (
          <Badge variant="outline" className={cn('text-[10px] gap-1', statusBadgeClasses(row.status_code))}>
            <StatusIcon className="w-3 h-3" />
            {row.status_code ?? '—'}
          </Badge>
        );
      },
    },
    {
      id: 'latency',
      header: 'Latencia',
      align: 'right',
      cell: (row) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.duration_ms !== null ? `${row.duration_ms}ms` : '—'}
        </span>
      ),
    },
    {
      id: 'ip',
      header: 'IP',
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-mono">{row.ip_address ?? '—'}</span>
      ),
    },
  ];

  return (
    <AppPage>
        <PageHeader
          title="Registro de actividad"
          description="Auditoría de acciones de usuarios y llamadas al API."
          icon={
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-brand-blue/30">
              <ClipboardList className="w-6 h-6 text-electric-400" aria-hidden="true" />
            </div>
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              aria-label="Refrescar lista"
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
              Refrescar
            </Button>
          }
        />

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Eventos" value={stats.total.toLocaleString()} delay={0} />
            <MetricCard label="Usuarios únicos" value={stats.uniqueUsers} delay={0.05} />
            <MetricCard
              label="Errores 4xx/5xx"
              value={stats.errors}
              accent={stats.errors > 0 ? 'amber' : undefined}
              delay={0.1}
            />
            <MetricCard label="P95 latencia" value={stats.p95Latency} unit="ms" delay={0.15} />
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Usuario (substring)"
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                className="pl-8"
                aria-label="Filtrar por usuario"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Endpoint (substring)"
                value={endpointFilter}
                onChange={(e) => setEndpointFilter(e.target.value)}
                className="pl-8"
                aria-label="Filtrar por endpoint"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger aria-label="Filtrar por método HTTP">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger aria-label="Cantidad de resultados">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((l) => (
                  <SelectItem key={l} value={String(l)}>
                    Últimos {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table — DataTable handles desktop/mobile responsiveness */}
        <Card>
          <CardContent className="p-0">
            <DataTable<AuditLogEntry>
              data={logs ?? []}
              columns={columns}
              getRowId={(r) => r.id}
              loading={isLoading}
              loadingPlaceholder={
                <SkeletonTable rows={6} columns={['w-24', 'w-32', 'w-16', 'w-44', 'w-16']} />
              }
              empty={
                <EmptyState
                  icon={Search}
                  title="Sin eventos"
                  description="No hay actividad que coincida con estos filtros."
                />
              }
            />
          </CardContent>
        </Card>
      </AppPage>
  );
}

function aggregate(
  logs: { username: string | null; status_code: number | null; duration_ms: number | null }[],
) {
  const total = logs.length;
  const uniqueUsers = new Set(logs.map((l) => l.username).filter(Boolean)).size;
  const errors = logs.filter((l) => (l.status_code ?? 0) >= 400).length;
  const latencies = logs.map((l) => l.duration_ms ?? 0).filter((d) => d > 0).sort((a, b) => a - b);
  const p95Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] ?? 0 : 0;
  return { total, uniqueUsers, errors, p95Latency };
}

export default ActivityLogPage;
