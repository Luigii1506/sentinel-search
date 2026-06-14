import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  /** Label, usually a noun ("Búsquedas hoy", "Tiempo p95"). */
  label: string;
  /** Pre-formatted value — caller decides locale, units, precision. */
  value: string | number;
  /** Optional unit suffix rendered next to value ("ms", "%", "MB"). */
  unit?: string;
  /** Optional context icon next to the label. */
  icon?: LucideIcon;
  /** Optional delta vs previous period. Sign drives color + arrow.
   *  Pass percentChange as a number (e.g., 12.5 for +12.5%). */
  delta?: {
    value: number;
    label?: string;     // override the "vs prev period" caption
    /** When true, higher = better (default). Set false for metrics
     *  where lower is better (latency, errors) — flips the green/red. */
    higherIsBetter?: boolean;
  };
  /** "amber" or "red" tint when the value itself is a warning/error,
   *  independent of delta direction. */
  accent?: 'amber' | 'red' | 'success';
  /** Animation delay so a row of cards can stagger. */
  delay?: number;
  className?: string;
}

/**
 * Single KPI card. Designed to live in a 2/3/4-column grid.
 *
 * Why this exists: every dashboard reinvented a card with
 * "label / big number / delta" — same code 8 times. Now there's one.
 */
export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  accent,
  delay = 0,
  className,
}: MetricCardProps) {
  // Resolve color of the value itself when accent is set.
  const valueColor =
    accent === 'red'     ? 'text-red-300' :
    accent === 'amber'   ? 'text-amber-300' :
    accent === 'success' ? 'text-green-300' :
    'text-white';

  // Resolve delta presentation. higherIsBetter inverts the color when
  // the metric is "lower = better" (errors, latency).
  let deltaContent: ReactElement | null = null;
  if (delta) {
    const higherIsBetter = delta.higherIsBetter ?? true;
    const isPositive = delta.value > 0;
    const isNegative = delta.value < 0;
    const isGood = higherIsBetter ? isPositive : isNegative;
    const isBad  = higherIsBetter ? isNegative : isPositive;

    const deltaColor =
      delta.value === 0 ? 'text-navy-200' :
      isGood            ? 'text-green-300' :
      isBad             ? 'text-red-300' :
      'text-navy-100';

    const Arrow =
      delta.value === 0 ? Minus :
      isPositive        ? ArrowUpRight :
      ArrowDownRight;

    deltaContent = (
      <div className={cn('flex items-center gap-0.5 text-xs', deltaColor)}>
        <Arrow className="w-3 h-3" />
        <span className="tabular-nums">
          {Math.abs(delta.value).toFixed(1)}%
        </span>
        {delta.label && <span className="text-navy-200 ml-1">{delta.label}</span>}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
    >
      <Card className={cn('h-full', className)}>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-navy-200 flex items-center gap-1.5 min-w-0">
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate">{label}</span>
            </span>
            {deltaContent}
          </div>
          <div className="flex items-baseline gap-1">
            <div className={cn('text-2xl font-semibold tabular-nums', valueColor)}>
              {value}
            </div>
            {unit && <div className="text-sm text-navy-200">{unit}</div>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
