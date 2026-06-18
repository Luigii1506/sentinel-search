import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthDotProps {
  status: string | null | undefined;
  label: string;
  icon?: LucideIcon;
  detail?: string;
  title?: string;
  variant?: 'compact' | 'card';
  className?: string;
}

const STATUS_STYLES = {
  ok: 'bg-green-400',
  connected: 'bg-green-400',
  healthy: 'bg-green-400',
  degraded: 'bg-amber-400',
  warning: 'bg-amber-400',
  pending: 'bg-gray-400',
  running: 'bg-blue-400',
  error: 'bg-red-400',
  failed: 'bg-red-400',
  disconnected: 'bg-red-400',
  unknown: 'bg-gray-500',
} as const;

function resolveDotColor(status: string | null | undefined): string {
  if (!status) return STATUS_STYLES.unknown;
  return STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.unknown;
}

export function HealthDot({
  status,
  label,
  icon: Icon,
  detail,
  title,
  variant = 'compact',
  className,
}: HealthDotProps) {
  return (
    <div
      title={title}
      className={cn(
        'flex items-center gap-2 min-w-0',
        variant === 'card' && 'rounded-lg',
        className,
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-gray-500" aria-hidden="true" />}
      <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', resolveDotColor(status))} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground leading-none">{label}</div>
        {detail && <div className="text-xs text-gray-500 mt-1 truncate">{detail}</div>}
      </div>
    </div>
  );
}
