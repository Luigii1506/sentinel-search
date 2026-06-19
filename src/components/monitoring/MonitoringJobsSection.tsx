import { motion } from 'framer-motion';
import {
  Clock,
  Database,
  Play,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  EmptyState,
  StatusPill,
  statusKindFromString,
} from '@/components/foundation';
import type { JobsResponse } from '@/types/api';

function formatElapsed(seconds?: number): string {
  if (seconds == null || seconds < 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
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

const JOB_TYPE_LABELS: Record<string, string> = {
  full: 'Pipeline completo',
  bronze_silver: 'Bronze + Silver',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  refresh: 'Actualizacion',
  reindex: 'Reindex',
  scrape: 'Scrape',
  file_import: 'Importacion de archivo',
  incremental: 'Incremental',
};

function JobTypeBadge({ type }: { type: string }) {
  const label = JOB_TYPE_LABELS[type] || type;
  const color = type === 'full' ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10' :
                type === 'bronze_silver' ? 'text-orange-700 dark:text-orange-400 bg-orange-500/10' :
                type === 'bronze' ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10' :
                type === 'silver' ? 'text-muted-foreground bg-gray-500/10' :
                type === 'gold' ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-500/10' :
                type === 'file_import' ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10' :
                'text-blue-600 dark:text-blue-400 bg-blue-500/10';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>{label}</span>
  );
}

export function MonitoringJobsSection({ jobs }: { jobs?: JobsResponse }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Jobs en Ejecucion
          {jobs?.running && jobs.running.length > 0 && (
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
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
                <Card className="bg-card border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-foreground">{job.source}</p>
                        <p className="text-xs text-muted-foreground">ID: {job.id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-xs text-blue-600 dark:text-blue-400">Corriendo</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tipo:</span>
                        <JobTypeBadge type={job.job_type} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Procesados:</span>
                        <span className="text-foreground">
                          {job.records_processed > 0
                            ? job.records_processed.toLocaleString()
                            : job.records_inserted > 0
                            ? job.records_inserted.toLocaleString()
                            : 'En progreso...'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tiempo:</span>
                        <span className="text-foreground">{formatElapsed(job.elapsed_seconds)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Inicio:</span>
                        <span className="text-foreground">{formatDate(job.started_at)}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="w-full bg-foreground/10 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-foreground/5">
            <CardContent className="p-8">
              <EmptyState
                icon={Clock}
                title="Sin jobs en ejecución"
                description="No hay procesos activos ahora mismo. Los jobs recientes siguen apareciendo abajo."
                className="p-6 sm:p-6"
              />
            </CardContent>
          </Card>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          Jobs Recientes
          {jobs?.recent && jobs.recent.length > 0 && (
            <Badge className="bg-gray-500/10 text-muted-foreground border-gray-500/20">
              {jobs.recent.length}
            </Badge>
          )}
        </h2>

        <Card className="bg-card border-foreground/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-foreground/5 border-b border-foreground/5">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Fuente
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Tipo
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Registros
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Inicio
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Duracion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {jobs?.recent?.map((job, index) => (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-foreground/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{job.source}</p>
                        <p className="text-xs text-muted-foreground">ID: {job.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <JobTypeBadge type={job.job_type} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusPill
                        kind={statusKindFromString(job.status)}
                        label={
                          job.status === 'success' || job.status === 'completed' ? 'Éxito'
                          : job.status === 'failed' ? 'Fallido'
                          : job.status === 'pending' ? 'Pendiente'
                          : job.status
                        }
                        title={job.status === 'failed' ? job.error_message ?? undefined : undefined}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-muted-foreground">
                        {job.records_inserted.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{formatDate(job.started_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-muted-foreground">
                        {formatElapsed(job.elapsed_seconds)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {!jobs?.recent?.length && (
            <EmptyState
              icon={Database}
              title="Sin jobs recientes"
              description="Aún no hay ejecuciones recientes para mostrar."
              className="rounded-none border-0 bg-transparent p-12 shadow-none"
            />
          )}
        </Card>
      </motion.div>
    </>
  );
}

export default MonitoringJobsSection;
