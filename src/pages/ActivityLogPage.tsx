import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Search,
  User,
  Globe,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { activityLogService } from '@/services/activityLog';
import { cn } from '@/lib/utils';

function statusBadge(code: number | null) {
  if (code === null) return { color: 'bg-gray-500/10 text-gray-300 border-gray-500/30', icon: Clock };
  if (code >= 500) return { color: 'bg-red-500/10 text-red-300 border-red-500/30', icon: XCircle };
  if (code === 402) return { color: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: AlertCircle };
  if (code === 401 || code === 403) return { color: 'bg-orange-500/10 text-orange-300 border-orange-500/30', icon: XCircle };
  if (code >= 400) return { color: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: AlertCircle };
  return { color: 'bg-green-500/10 text-green-300 border-green-500/30', icon: CheckCircle2 };
}

function methodBadge(method: string) {
  return {
    GET: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    POST: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    PATCH: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    PUT: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    DELETE: 'bg-red-500/10 text-red-300 border-red-500/30',
  }[method] ?? 'bg-gray-500/10 text-gray-300 border-gray-500/30';
}

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

  // Aggregate stats over the visible window
  const stats = logs ? aggregate(logs) : null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
              <ClipboardList className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Activity Log</h1>
              <p className="text-sm text-gray-400">
                Auditoría de acciones de usuarios y llamadas al API.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            Refrescar
          </Button>
        </motion.div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Eventos" value={stats.total.toLocaleString()} />
            <StatCard label="Usuarios únicos" value={stats.uniqueUsers.toString()} />
            <StatCard label="Errores 4xx/5xx" value={stats.errors.toString()} accent={stats.errors > 0 ? 'amber' : undefined} />
            <StatCard label="P95 latencia (ms)" value={stats.p95Latency.toString()} />
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <Input
                placeholder="Usuario (substring)"
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <Input
                placeholder="Endpoint (substring)"
                value={endpointFilter}
                onChange={(e) => setEndpointFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
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

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Sin eventos para estos filtros.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 font-medium">Cuando</th>
                      <th className="px-4 py-3 font-medium">Usuario</th>
                      <th className="px-4 py-3 font-medium">Auth</th>
                      <th className="px-4 py-3 font-medium">Método</th>
                      <th className="px-4 py-3 font-medium">Endpoint</th>
                      <th className="px-4 py-3 font-medium text-right">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Latencia</th>
                      <th className="px-4 py-3 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const sb = statusBadge(log.status_code);
                      const StatusIcon = sb.icon;
                      return (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.timestamp), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="text-white font-medium">
                              {log.username ?? <span className="text-gray-500">anónimo</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {log.auth_method ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn('text-[10px]', methodBadge(log.action))}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <code className="font-mono text-blue-300">{log.endpoint}</code>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant="outline" className={cn('text-[10px] gap-1', sb.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {log.status_code ?? '—'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-right text-gray-400 tabular-nums">
                            {log.duration_ms !== null ? `${log.duration_ms}ms` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                            {log.ip_address ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'amber' | 'red';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
        <div
          className={cn(
            'text-2xl font-semibold tabular-nums',
            accent === 'amber' && 'text-amber-300',
            accent === 'red' && 'text-red-300',
            !accent && 'text-white',
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function aggregate(logs: { username: string | null; status_code: number | null; duration_ms: number | null }[]) {
  const total = logs.length;
  const uniqueUsers = new Set(logs.map((l) => l.username).filter(Boolean)).size;
  const errors = logs.filter((l) => (l.status_code ?? 0) >= 400).length;
  const latencies = logs.map((l) => l.duration_ms ?? 0).filter((d) => d > 0).sort((a, b) => a - b);
  const p95Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] ?? 0 : 0;
  return { total, uniqueUsers, errors, p95Latency };
}

export default ActivityLogPage;
