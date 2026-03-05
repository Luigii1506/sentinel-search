import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Database,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Server,
  Wifi,
  HardDrive,
  Search,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { JobsResponse, SystemHealth } from '@/types/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function formatElapsed(seconds?: number): string {
  if (seconds == null || seconds < 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full: 'Full Pipeline',
  bronze_silver: 'Bronze + Silver',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  refresh: 'Refresh',
  reindex: 'Reindex',
  scrape: 'Scrape',
  file_import: 'File Import',
  incremental: 'Incremental',
};

function JobTypeBadge({ type }: { type: string }) {
  const label = JOB_TYPE_LABELS[type] || type;
  const color = type === 'full' ? 'text-purple-400 bg-purple-500/10' :
                type === 'bronze_silver' ? 'text-orange-400 bg-orange-500/10' :
                type === 'bronze' ? 'text-amber-400 bg-amber-500/10' :
                type === 'silver' ? 'text-gray-300 bg-gray-500/10' :
                type === 'gold' ? 'text-yellow-400 bg-yellow-500/10' :
                type === 'file_import' ? 'text-cyan-400 bg-cyan-500/10' :
                'text-blue-400 bg-blue-500/10';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>{label}</span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function ServiceStatusDot({ status }: { status: string }) {
  const isOk = status === 'ok' || status === 'connected' || status === 'healthy';
  return (
    <div className={`w-2.5 h-2.5 rounded-full ${isOk ? 'bg-green-400' : 'bg-red-400'}`} />
  );
}

export function MonitoringPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useQuery<JobsResponse>({
    queryKey: ['admin', 'jobs'],
    queryFn: () => adminService.getJobs(50),
    refetchInterval: 10000,
  });

  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['system', 'health'],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 30000,
  });

  const { data: detailed } = useQuery({
    queryKey: ['admin', 'health', 'detailed'],
    queryFn: () => adminService.getHealthDetailed(),
    refetchInterval: 30000,
  });

  if (jobsLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 bg-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 bg-white/5" />
            <Skeleton className="h-96 bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (jobsError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error al cargar monitoreo</h2>
          <p className="text-gray-400 mb-4">No se pudieron obtener los datos de los jobs</p>
          <Button onClick={() => refetchJobs()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const stats = jobs?.stats || {};
  const running = stats.running || 0;
  const success = (stats.success || 0) + (stats.completed || 0);
  const failed = stats.failed || 0;
  const pending = stats.pending || 0;
  const totalJobs = running + success + failed + pending;

  const counts = detailed?.counts;
  const services = health?.services;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Monitoreo del Sistema</h1>
                <p className="text-gray-400 mt-1">
                  Estado de servicios, pipelines y jobs de ingestion
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetchJobs()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </motion.div>

        {/* System Health */}
        {services && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-400" />
              Servicios
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* API */}
              <Card className="bg-[#1a1a1a] border-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <ServiceStatusDot status={services.api?.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">API</p>
                    <p className="text-xs text-gray-500">{services.api?.status === 'ok' ? 'Operativo' : 'Error'}</p>
                  </div>
                </CardContent>
              </Card>
              {/* Database */}
              <Card className="bg-[#1a1a1a] border-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <ServiceStatusDot status={services.database?.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-gray-500" />
                      PostgreSQL
                    </p>
                    <p className="text-xs text-gray-500">{services.database?.latency_ms}ms</p>
                  </div>
                </CardContent>
              </Card>
              {/* Redis */}
              <Card className="bg-[#1a1a1a] border-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <ServiceStatusDot status={services.redis?.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-gray-500" />
                      Redis
                    </p>
                    <p className="text-xs text-gray-500">{services.redis?.latency_ms}ms</p>
                  </div>
                </CardContent>
              </Card>
              {/* OpenSearch */}
              <Card className="bg-[#1a1a1a] border-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <ServiceStatusDot status={services.opensearch?.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-gray-500" />
                      OpenSearch
                    </p>
                    <p className="text-xs text-gray-500">{services.opensearch?.latency_ms}ms</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Entity Counts + Job Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-8"
        >
          {/* Entity counts */}
          {counts && (
            <>
              <motion.div variants={itemVariants}>
                <Card className="bg-[#1a1a1a] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-gray-400">Bronze</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatNumber(counts.bronze)}</div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card className="bg-[#1a1a1a] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="w-4 h-4 text-gray-300" />
                      <span className="text-xs text-gray-400">Silver</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatNumber(counts.silver)}</div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card className="bg-[#1a1a1a] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-gray-400">Gold</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatNumber(counts.gold)}</div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* Job stats */}
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1a1a1a] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Play className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Corriendo</span>
                </div>
                <div className="text-2xl font-bold text-white">{running}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1a1a1a] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-400">Exitosos</span>
                </div>
                <div className="text-2xl font-bold text-white">{success}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1a1a1a] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-gray-400">Fallidos</span>
                </div>
                <div className="text-2xl font-bold text-white">{failed}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-[#1a1a1a] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-400">Total Jobs</span>
                </div>
                <div className="text-2xl font-bold text-white">{totalJobs}</div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Running Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" />
            Jobs en Ejecucion
            {jobs?.running && jobs.running.length > 0 && (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                {jobs.running.length}
              </Badge>
            )}
          </h2>

          {jobs?.running && jobs.running.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.running.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-[#1a1a1a] border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-white">{job.source}</p>
                          <p className="text-xs text-gray-500">ID: {job.id.slice(0, 8)}...</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10">
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-xs text-blue-400">Corriendo</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Tipo:</span>
                          <JobTypeBadge type={job.job_type} />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Procesados:</span>
                          <span className="text-white">
                            {job.records_processed > 0
                              ? job.records_processed.toLocaleString()
                              : job.records_inserted > 0
                              ? job.records_inserted.toLocaleString()
                              : 'En progreso...'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Tiempo:</span>
                          <span className="text-white">{formatElapsed(job.elapsed_seconds)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Inicio:</span>
                          <span className="text-white">{formatDate(job.started_at)}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-[#1a1a1a] border-white/5">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No hay jobs en ejecucion</p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Recent Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" />
            Jobs Recientes
            {jobs?.recent && jobs.recent.length > 0 && (
              <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                {jobs.recent.length}
              </Badge>
            )}
          </h2>

          <Card className="bg-[#1a1a1a] border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                      Fuente
                    </th>
                    <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4">
                      Tipo
                    </th>
                    <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-4">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                      Registros
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                      Inicio
                    </th>
                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                      Duracion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {jobs?.recent?.map((job, index) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{job.source}</p>
                          <p className="text-xs text-gray-500">ID: {job.id.slice(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <JobTypeBadge type={job.job_type} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {job.status === 'success' || job.status === 'completed' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs text-green-400">Exito</span>
                          </div>
                        ) : job.status === 'failed' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10" title={job.error_message || ''}>
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs text-red-400">Fallido</span>
                          </div>
                        ) : job.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10">
                            <Clock className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-xs text-yellow-400">Pendiente</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-400">{job.status}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-300">
                          {job.records_inserted.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">{formatDate(job.started_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-300">
                          {formatElapsed(job.elapsed_seconds)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!jobs?.recent?.length && (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No hay jobs recientes</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default MonitoringPage;
