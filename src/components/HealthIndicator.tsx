import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const SERVICE_LABELS: Record<string, string> = {
  api: 'API',
  database: 'PostgreSQL',
  redis: 'Redis',
  opensearch: 'OpenSearch',
};

function ServiceRow({ name, svc }: { name: string; svc: ServiceStatus | undefined }) {
  const { t } = useTranslation();
  if (!svc) return null;
  const serviceLabel = SERVICE_LABELS[name]
    ?? (name === 'celery_queues' ? t('components.health.service.celeryQueues') : name);
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
        <span className="text-sm text-gray-200 truncate">{serviceLabel}</span>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        {svc.status === 'ok' && typeof svc.latency_ms === 'number'
          ? `${svc.latency_ms}ms`
          : svc.status === 'unavailable'
            ? t('components.health.noResponse')
            : svc.status === 'error'
              ? t('components.health.error')
              : svc.status}
      </div>
    </div>
  );
}

export function HealthIndicator() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: health } = useHealthStatus(30_000);

  const overall = health?.status ?? 'unknown';
  const overallLabel = t(`components.health.status.${overall}`);
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
          aria-label={t('components.health.label', { status: overallLabel })}
          title={t('components.health.label', { status: overallLabel })}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-foreground/5 transition-colors"
        >
          <Icon className="w-5 h-5 text-muted-foreground" />
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
              {overallLabel}
            </span>
          </div>
          {health?.environment && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
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
              <p className="text-xs text-muted-foreground py-2">
                {t('components.health.unavailableMessage')}
              </p>
            )}
        </div>

        {health?.warnings && health.warnings.length > 0 && (
          <div className="border-t border-foreground/10 mt-3 pt-2">
            <p className="text-[10px] uppercase text-muted-foreground mb-1.5">{t('components.health.warnings')}</p>
            <ul className="space-y-1">
              {health.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-300/90 flex items-start gap-1.5">
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
