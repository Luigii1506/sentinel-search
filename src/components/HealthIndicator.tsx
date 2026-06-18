import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useHealthStatus, type ServiceStatus } from '@/hooks/useHealthStatus';
import { cn } from '@/lib/utils';

const STATUS_COLOR = {
  healthy: 'bg-green-500',
  degraded: 'bg-amber-500',
  unhealthy: 'bg-red-500',
  unknown: 'bg-gray-500',
} as const;

const STATUS_LABEL = {
  healthy: 'Operativo',
  degraded: 'Degradado',
  unhealthy: 'Caído',
  unknown: 'Sin datos',
} as const;

const SERVICE_LABELS: Record<string, string> = {
  api: 'API',
  database: 'PostgreSQL',
  redis: 'Redis',
  opensearch: 'OpenSearch',
  celery_queues: 'Colas Celery',
};

function ServiceRow({ name, svc }: { name: string; svc: ServiceStatus | undefined }) {
  if (!svc) return null;
  const dotColor =
    svc.status === 'ok'
      ? 'bg-green-500'
      : svc.status === 'unavailable' || svc.status === 'error'
        ? 'bg-red-500'
        : 'bg-gray-500';
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
        <span className="text-sm text-gray-200 truncate">{SERVICE_LABELS[name] ?? name}</span>
      </div>
      <div className="text-xs text-gray-500 shrink-0">
        {svc.status === 'ok' && typeof svc.latency_ms === 'number'
          ? `${svc.latency_ms}ms`
          : svc.status === 'unavailable'
            ? 'no responde'
            : svc.status === 'error'
              ? 'error'
              : svc.status}
      </div>
    </div>
  );
}

export function HealthIndicator() {
  const [open, setOpen] = useState(false);
  const { data: health } = useHealthStatus(30_000);

  const overall = health?.status ?? 'unknown';
  const Icon =
    overall === 'healthy'
      ? CheckCircle2
      : overall === 'degraded'
        ? AlertTriangle
        : overall === 'unhealthy'
          ? XCircle
          : Activity;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Estado del sistema: ${STATUS_LABEL[overall]}`}
          title={`Estado del sistema: ${STATUS_LABEL[overall]}`}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-foreground/5 transition-colors"
        >
          <Icon className="w-5 h-5 text-gray-400" />
          <span
            className={cn(
              'absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-background',
              STATUS_COLOR[overall],
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLOR[overall])} />
            <span className="text-sm font-medium text-foreground">
              {STATUS_LABEL[overall]}
            </span>
          </div>
          {health?.environment && (
            <span className="text-[10px] uppercase tracking-wide text-gray-500">
              {health.environment}
            </span>
          )}
        </div>

        <div className="border-t border-foreground/10 pt-2 space-y-0.5">
          {health
            ? Object.entries(health.services).map(([name, svc]) => (
                <ServiceRow key={name} name={name} svc={svc} />
              ))
            : (
              <p className="text-xs text-gray-500 py-2">
                No se pudo obtener el estado. Posiblemente la API no responde.
              </p>
            )}
        </div>

        {health?.warnings && health.warnings.length > 0 && (
          <div className="border-t border-foreground/10 mt-3 pt-2">
            <p className="text-[10px] uppercase text-gray-500 mb-1.5">Avisos</p>
            <ul className="space-y-1">
              {health.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-300/90 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
